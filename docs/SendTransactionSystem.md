# Send Transaction System Documentation

## Overview

The Send Transaction system provides a modern popup-based interface for secure THORChain MsgSend and MsgDeposit operations. Features a 4-page navigation flow with password-per-transaction authentication, just-in-time key decryption, comprehensive error handling, and full architectural alignment with the Rune Tools desktop application design principles.

**Updated**: November 2024 - Current implementation reflects completed popup UI system with enhanced UX features.

## Architecture

### 🔐 Security Model

**Core Principles:**
- **Never store mnemonics in memory** except during active transaction execution
- **Password-per-transaction authentication** - users must enter password for each transaction
- **Just-in-time decryption** - mnemonic is decrypted immediately before signing, then cleared
- **Encrypted storage** - wallets use AES-256-GCM encryption with PBKDF2 key derivation

**Security Flow:**
1. **Wallet Creation**: Mnemonic encrypted with user password, stored with salt/hash
2. **Transaction Init**: Only non-sensitive wallet data passed to UI components
3. **Password Prompt**: User enters password for specific transaction
4. **Verification**: Password verified against stored hash in main process
5. **Decryption**: Mnemonic decrypted in renderer using Web Crypto API
6. **Signing**: Temporary wallet created, transaction signed
7. **Cleanup**: Mnemonic immediately cleared from memory

### 📱 UI Structure (4-Page Popup)

```
┌─────────────────────────────────────┐
│ [1] Information → [2] Review        │
│     ↓               ↓               │
│ [4] Details   ← [3] Sending         │
└─────────────────────────────────────┘
```

**Page 1 - Information:**
- Transaction type selection (MsgSend vs MsgDeposit)
- Asset selection from available balances
- Amount input with MAX button
- Recipient address (MsgSend only)
- Memo field

**Page 2 - Review:**
- Transaction summary with cost breakdown
- Network fee calculation (fixed: 1e8 conversion)
- Password-first UI design (prominent at top)
- Real-time button state (disabled until password entered)
- Eye icon for password visibility
- Removed: Security warnings (cleaner UI)

**Page 3 - Sending:**
- Animated dot loader (reusable Loader component)
- "Submitting..." message
- Simplified progress display
- Non-cancellable during execution

**Page 4 - Details:**
- Transaction hash with copy button
- Success confirmation icon
- ViewBlock explorer link
- No "Back" button (clean completion)
- Auto-refresh wallet balances on close

## 💰 Amount Handling

### Unit Types

```typescript
// NORMALIZED UNITS (user-facing)
const userInput = "0.0001"  // What user sees/enters

// BASE UNITS (blockchain)
const blockchainAmount = "10000"  // 0.0001 * 1e8
```

**Critical Rules:**
- **User Input**: Always NORMALIZED UNITS
- **Balance Display**: Always NORMALIZED UNITS
- **Transaction Params**: Converted to BASE UNITS before blockchain submission
- **API Responses**: Check source - may be either format

**Conversion Functions:**
```typescript
import { convertToBaseUnits, convertFromBaseUnits } from '../utils/assetUtils'

// User input → Blockchain
const baseUnits = convertToBaseUnits("0.0001", "THOR.RUNE") // "10000"

// Blockchain → Display
const normalized = convertFromBaseUnits("10000", "THOR.RUNE") // "0.0001"
```

## 🔄 Transaction Types

### MsgSend (Direct Transfer)
- **Purpose**: Send assets directly to another address
- **Required**: `toAddress` field
- **Optional**: `memo` field
- **Use Cases**: P2P transfers, wallet-to-wallet sends

```typescript
const msgSendParams: TransactionParams = {
  asset: "THOR.RUNE",
  amount: "0.0001",           // NORMALIZED UNITS
  toAddress: "thor1...",      // Required
  memo: "Payment for goods",  // Optional
  useMsgDeposit: false
}
```

### MsgDeposit (THORChain Operations)
- **Purpose**: Interact with THORChain protocol (swaps, LP, etc.)
- **Target**: THORChain module address (automatic)
- **Required**: `memo` field for operation instructions
- **Use Cases**: Swaps, liquidity provision, loan operations

```typescript
const msgDepositParams: TransactionParams = {
  asset: "THOR.RUNE",
  amount: "100",                            // NORMALIZED UNITS
  memo: "SWAP:BTC.BTC:bc1q...:1000000",    // Required - operation instructions
  useMsgDeposit: true
}
```

## 🏗️ Implementation Guide

### 1. Basic Implementation

```typescript
import { SendTransaction } from '../components/SendTransaction'

// Initialize send dialog
const sendContainer = document.getElementById('sendDialogContainer')
const sendDialog = new SendTransaction(sendContainer, backendService)

// Wallet data (non-sensitive only)
const walletData: SendTransactionData = {
  walletId: wallet.walletId,
  name: wallet.name,
  currentAddress: wallet.mainnetAddress,
  network: 'mainnet',
  availableBalances: normalizedBalances
}

// Show dialog
await sendDialog.initialize(walletData, () => {
  console.log('Send dialog closed')
})
```

### 2. Balance Integration

**Balance Format:**
```typescript
interface AssetBalance {
  asset: string      // "THOR.RUNE", "BTC.BTC", etc.
  balance: string    // NORMALIZED UNITS - "1.5", "0.0001"
  usdValue?: string  // Optional USD equivalent
}
```

**Source Integration:**
```typescript
// Get normalized balances from BalanceNormalizationService
const balances = await balanceService.getCombinedNormalizedBalances(address)

// Format for Send dialog
const sendBalances: AssetBalance[] = balances.map(balance => ({
  asset: balance.asset,
  balance: balance.amount,  // Already in NORMALIZED UNITS
  usdValue: balance.usdValue
}))
```

### 3. Network Fee Handling

```typescript
// Network fees fetched from /network endpoint
const networkInfo = await backend.getThorchainNetwork()
const networkFeeRune = networkInfo?.native_tx_fee_rune || "2000000" // BASE UNITS

// Convert to normalized for display
const feeDisplay = convertFromBaseUnits(networkFeeRune, "THOR.RUNE") // "0.02"
```

### 4. Error Handling

```typescript
try {
  await sendDialog.initialize(walletData)
} catch (error) {
  if (error.message.includes('Invalid password')) {
    // Handle password error
  } else if (error.message.includes('Insufficient balance')) {
    // Handle balance error
  } else {
    // Handle other errors
  }
}
```

## 🔧 Component Architecture

### File Structure
```
components/
├── SendTransaction.ts      # Main coordinator (4-page popup)
├── SendForm.ts            # Page 1 - Information input
├── SendConfirmation.ts    # Page 2 - Review & password
├── SendProgress.ts        # Page 3 - Sending status
└── (Details built into SendTransaction)
```

### Data Flow
```
SendTransaction (Main)
    ├── SendForm (validates input)
    ├── SendConfirmation (handles security)
    └── SendProgress (tracks execution)
```

## 🛡️ Security Best Practices

### Do's ✅
- **Always validate passwords** in main process before decryption
- **Clear sensitive data** immediately after use
- **Use NORMALIZED UNITS** for all user interactions
- **Validate transaction parameters** before signing
- **Show clear confirmation** with all transaction details

### Don'ts ❌
- **Never store mnemonics** in component state
- **Never skip password verification**
- **Never assume unit types** - always check and convert
- **Never allow cancellation** during signing phase
- **Never expose sensitive data** in error messages

## 🔄 Integration Points

### Backend Services
- **BackendService**: IPC communication layer
- **TransactionService**: Blockchain transaction handling
- **BalanceNormalizationService**: Balance data provider
- **SecureWalletStorage**: Encrypted wallet persistence

### Utility Functions
- **assetUtils.ts**: Universal amount conversion functions
- **CryptoUtils.ts**: Encryption/decryption utilities

## 📋 Testing Considerations

### Unit Tests
- Amount conversion accuracy (NORMALIZED ↔ BASE UNITS)
- Password validation flows
- Transaction parameter construction
- Error handling scenarios

### Integration Tests
- End-to-end transaction flows
- Network switching behavior
- Balance update consistency
- Error recovery processes

### Security Tests
- Mnemonic memory clearing
- Password verification bypass attempts
- Sensitive data exposure checks
- Transaction replay protection

## 🚀 Usage Examples

### Simple RUNE Send
```typescript
const sendData = {
  walletId: "abc123",
  name: "My Wallet",
  currentAddress: "thor1...",
  network: "mainnet",
  availableBalances: [
    { asset: "THOR.RUNE", balance: "100.5" }
  ]
}

await sendDialog.initialize(sendData)
// User completes 4-page flow
// Result: MsgSend with 0.0001 RUNE to thor1...
```

### THORChain Swap
```typescript
const sendData = {
  // ... wallet data
  availableBalances: [
    { asset: "THOR.RUNE", balance: "1000" }
  ]
}

await sendDialog.initialize(sendData)
// User selects MsgDeposit type
// Enters memo: "SWAP:BTC.BTC:bc1q...:50000000"
// Result: MsgDeposit to THORChain module for swap
```

## 🏗️ Architectural Alignment

### Alignment with Rune Tools Architecture Goals

The Send Transaction system fully aligns with the architectural principles outlined in Architecture.md:

**✅ Component-Based Design**
- **Modular Components**: SendTransaction, SendForm, SendConfirmation, SendProgress, Loader
- **Single Responsibility**: Each component handles one specific concern
- **Reusable Elements**: Loader component used across application
- **Clean Interfaces**: Well-defined TypeScript interfaces for all data structures
- **Separation of Concerns**: UI logic, validation, and business logic properly separated

**✅ Security Implementation**
- **Defense in Depth**: Multiple security layers (validation, encryption, access control)
- **Just-in-Time Access**: Mnemonic decrypted only when needed for transaction execution
- **Immediate Cleanup**: Sensitive data cleared immediately after use
- **PBKDF2 Key Derivation**: 100,000 iterations with SHA-256 (matches CryptoUtils)
- **AES-256-GCM Encryption**: Industry-standard encryption for seed phrases
- **Password-Per-Transaction**: Fresh authentication required for each operation

**✅ Modern UI Patterns**
- **Progressive Disclosure**: Information revealed step-by-step through 4-page flow
- **Modal Overlay Design**: True popup overlay using global-overlay-container
- **Visual Progress Indicators**: Step numbers and progress tracking
- **Responsive Design**: Percentage-based dimensions (85% height)
- **Error Recovery**: Clear error messages with toast notifications and recovery paths
- **Accessibility**: Keyboard navigation (ESC to close), proper focus management

**✅ Performance & Memory Management**
- **Efficient Rendering**: Re-render only when page state changes
- **DOM Timing Management**: Captures form data before navigation destroys DOM
- **Memory Cleanup**: Proper event listener removal and component destruction
- **Asset Optimization**: USD-sorted assets for better user experience
- **Background Operations**: Heavy operations handled via IPC to main process

**✅ Development Workflow Integration**
- **TypeScript Safety**: Full type definitions throughout component tree
- **Vite Build System**: Proper bundling and hot-reload support
- **Service Layer Integration**: Uses BackendService for IPC communication
- **Error Boundary Pattern**: Comprehensive error handling with user feedback
- **Consistent Patterns**: Matches application-wide coding conventions

### Technical Implementation Highlights

**Global Overlay Strategy**
```typescript
// Implements proper modal rendering outside component tree
const dialogContainer = document.getElementById('global-overlay-container')
const sendDialog = new SendTransaction(dialogContainer, this.backend)
```

**DOM Security Pattern**
```typescript
// Captures transaction params before navigation destroys DOM
private async onNextClicked(): Promise<void> {
  // CRITICAL: Capture BEFORE navigation
  this.capturedTransactionParams = {
    asset: formData.asset,
    amount: formData.amount,
    // ... other params
  }
  this.navigateToPage(2) // Safe to navigate after capture
}
```

**Security-First Transaction Execution**
```typescript
// Execute on Review page with immediate password validation
private async onConfirmClicked(): Promise<void> {
  const password = this.confirmation.getPassword()
  this.navigateToPage(3) // Show progress
  
  try {
    const result = await this.confirmation.executeSecureTransaction(password)
    this.navigateToPage(4) // Show success
  } catch (error) {
    // User-friendly error handling with toast notifications
    this.showErrorToast(this.extractUserFriendlyError(error.message))
  }
}
```

**Reusable Component Architecture**
```typescript
// Loader component exemplifies reusable design
export class Loader {
  constructor(container: HTMLElement, text: string = 'Loading...') {
    this.container = container
    this.text = text
  }
  
  render(): void {
    // Clean, simple API for consistent loading states
  }
}
```

### Future Scalability

**Pattern Extensibility**
- Modal popup pattern can be extended for other operations (Receive, Swap, etc.)
- Component-based architecture allows easy addition of new transaction types
- Error handling patterns provide template for other complex operations
- Security patterns establish standard for sensitive operations across app

**Performance Optimization Opportunities**
- Virtual scrolling for large asset lists
- Cached exchange rate data
- Optimistic UI updates
- Background transaction validation

## 🔗 Related Documentation
- [Architecture.md](./Architecture.md) - Overall application architecture principles
- [WalletBalances.md](./WalletBalances.md) - Balance processing and display system
- [Asset Utilities](./AssetUtils.md) - Amount conversion functions
- [Security Architecture](./Security.md) - Wallet encryption details  
- [Transaction Service](./TransactionService.md) - Blockchain integration