# Send Component Architecture & Design

This document outlines the design and security architecture for the Send transaction component, supporting both MsgSend and MsgDeposit operations with secure private key handling.

---

## 🔒 **Security Analysis: Current vs Required**

### **Current Security State:**
- ✅ **Private keys are encrypted** using AES-256-GCM in wallet storage
- ✅ **Password verification implemented** for wallet unlock  
- ❌ **Mnemonic exposed in memory** during transaction signing (`WalletInfo.mnemonic`)
- ❌ **No transaction-level authentication** required
- ❌ **Mnemonic persists in app memory** after wallet unlock

### **Required Security Improvements:**
1. **Transaction-Level Authentication**: Require password for each transaction
2. **Just-In-Time Key Decryption**: Decrypt mnemonic only when signing, clear immediately
3. **Secure Transaction Flow**: Never store plaintext mnemonic in component state
4. **Session-Based Security**: Optional transaction session with timeout

---

## 🏗️ **Component Architecture**

### **Send Component Structure**
```
src/renderer/components/
├── SendTransaction.ts          # Main send component
├── SendForm.ts                # Transaction form UI  
├── SendConfirmation.ts        # Transaction confirmation dialog
└── SendProgress.ts            # Transaction status tracking
```

### **Integration Points**
```typescript
// Component Hierarchy
WalletTab
  └── SendTransaction          // Modal/Dialog
      ├── SendForm            // Form inputs
      ├── SendConfirmation    // Review + password confirm
      └── SendProgress        // Broadcast + tracking
```

---

## 🔐 **Secure Transaction Flow**

### **Phase 1: Transaction Setup**
```typescript
// User clicks "Send" button in WalletTab
WalletTab.showSendDialog() → SendTransaction.initialize()

// NO private key access at this phase
// Only wallet metadata: walletId, addresses, balances
```

### **Phase 2: Form Input & Validation**
```typescript
SendForm {
  // Available data (non-sensitive)
  - activeWallet: { walletId, name, addresses }
  - balances: AssetBalance[]
  - network: 'mainnet' | 'stagenet'
  
  // User inputs
  - transactionType: 'send' | 'deposit' 
  - asset: string
  - amount: string
  - toAddress?: string (MsgSend only)
  - memo?: string
}

// Validation occurs WITHOUT accessing private keys
```

### **Phase 3: Secure Confirmation & Signing**
```typescript
SendConfirmation {
  // Display transaction details for review
  // Request password for transaction authorization
  
  onConfirm(password: string) {
    // CRITICAL: Decrypt mnemonic just-in-time
    const mnemonic = await decryptMnemonic(walletId, password)
    
    try {
      // Create temporary WalletInfo for signing ONLY
      const signingWallet = { ...walletMeta, mnemonic }
      
      // Sign and broadcast transaction
      const result = await transactionService.broadcastTransaction(signingWallet, params)
      
      // SUCCESS: Clear mnemonic immediately
      clearSensitiveData(signingWallet.mnemonic)
      
    } catch (error) {
      // ERROR: Still clear mnemonic 
      clearSensitiveData(signingWallet.mnemonic)
      throw error
    }
  }
}
```

---

## 📋 **Component Interface Design**

### **SendTransaction.ts - Main Component**
```typescript
export interface SendTransactionData {
  walletId: string
  name: string
  currentAddress: string // network-specific
  network: 'mainnet' | 'stagenet'
  availableBalances: AssetBalance[]
}

export class SendTransaction {
  private container: HTMLElement
  private backend: BackendService
  private transactionData: SendTransactionData
  
  // SECURITY: Never store mnemonic or sensitive data
  private sendForm: SendForm | null = null
  private confirmation: SendConfirmation | null = null
  
  constructor(container: HTMLElement, backend: BackendService) {
    this.container = container
    this.backend = backend
  }
  
  // Initialize with non-sensitive wallet data only
  async initialize(walletData: SendTransactionData): Promise<void> {
    this.transactionData = walletData
    this.render()
  }
  
  // Event handlers for form progression
  private onFormComplete(transactionParams: TransactionParams): void
  private onTransactionConfirmed(password: string, params: TransactionParams): Promise<void>
  private onTransactionComplete(result: TransactionResponse): void
}
```

### **SendForm.ts - Transaction Input**
```typescript
export interface TransactionFormData {
  transactionType: 'send' | 'deposit'
  asset: string
  amount: string
  toAddress?: string  // Required for MsgSend
  memo?: string      // Optional for MsgSend, used in MsgDeposit
}

export class SendForm {
  // Form validation and asset selection
  private validateTransactionType(): void
  private populateAssetSelector(): void  
  private validateAmount(): boolean
  private validateAddress(): boolean
  
  // Dynamic UI updates based on transaction type
  private onTransactionTypeChange(): void {
    if (type === 'send') {
      this.showAddressField()
      this.hideMemoRequiredNote()
    } else {
      this.hideAddressField() 
      this.showMemoRequiredNote()
    }
  }
  
  // Return validated form data
  getFormData(): TransactionFormData
}
```

### **SendConfirmation.ts - Secure Authorization**
```typescript
export interface TransactionConfirmation {
  transactionParams: TransactionParams
  estimatedFee: TransactionFee
  transactionSummary: string
}

export class SendConfirmation {
  private backend: BackendService
  private walletId: string
  
  async initialize(confirmation: TransactionConfirmation): Promise<void> {
    this.displayTransactionSummary(confirmation)
    this.displayFeeEstimate(confirmation.estimatedFee)
    this.showPasswordPrompt()
  }
  
  // CRITICAL SECURITY METHOD
  private async executeSecureTransaction(password: string, params: TransactionParams): Promise<TransactionResponse> {
    let decryptedMnemonic: string | null = null
    
    try {
      // Step 1: Verify password & decrypt mnemonic just-in-time
      decryptedMnemonic = await this.backend.decryptWalletMnemonic(this.walletId, password)
      
      // Step 2: Create temporary signing wallet
      const signingWallet: WalletInfo = {
        address: this.transactionData.currentAddress,
        mainnetAddress: this.transactionData.mainnetAddress,
        stagenetAddress: this.transactionData.stagenetAddress,
        publicKey: '', // Not needed for signing
        mnemonic: decryptedMnemonic
      }
      
      // Step 3: Broadcast transaction
      const result = await this.backend.broadcastTransaction(signingWallet, params)
      
      // Step 4: Success - clear sensitive data
      this.clearSensitiveData(decryptedMnemonic)
      
      return result
      
    } catch (error) {
      // Step 5: Always clear sensitive data on error
      if (decryptedMnemonic) {
        this.clearSensitiveData(decryptedMnemonic)
      }
      throw error
    }
  }
  
  private clearSensitiveData(data: string): void {
    // Overwrite memory (best effort)
    for (let i = 0; i < data.length; i++) {
      data[i] = '\0'
    }
  }
}
```

---

## 🔧 **Backend Integration Requirements**

### **New IPC Handler: `decrypt-wallet-mnemonic`**
```typescript
// Add to main.ts
ipcMain.handle('decrypt-wallet-mnemonic', async (event, walletId: string, password: string) => {
  try {
    const walletData = await walletStorageService.loadWallet(walletId)
    if (!walletData) throw new Error('Wallet not found')
    
    // Verify password first
    const isPasswordValid = await verifyPassword(password, walletData.salt, walletData.passwordHash)
    if (!isPasswordValid) throw new Error('Invalid password')
    
    // Decrypt mnemonic using CryptoUtils
    const decryptedMnemonic = await CryptoUtils.decryptSensitiveData(
      walletData.encryptedSeedPhrase,
      password,
      walletData.salt, 
      walletData.iv
    )
    
    return decryptedMnemonic
    
  } catch (error) {
    console.error('Error decrypting wallet mnemonic:', error)
    throw error
  }
})
```

### **Backend Service Method**
```typescript
// Add to BackendService.ts
async decryptWalletMnemonic(walletId: string, password: string): Promise<string> {
  return await this.ipc.invoke('decrypt-wallet-mnemonic', walletId, password)
}
```

---

## 🎨 **UI/UX Design**

### **Send Dialog Layout**
```html
<div class="send-transaction-dialog">
  <div class="dialog-header">
    <h3>Send Transaction</h3>
    <button class="close-btn">×</button>
  </div>
  
  <div class="dialog-body">
    <!-- Phase 1: Form Input -->
    <div class="send-form" id="sendFormStep">
      <div class="transaction-type-selector">
        <input type="radio" name="txType" value="send" checked> MsgSend
        <input type="radio" name="txType" value="deposit"> MsgDeposit  
      </div>
      
      <div class="form-group">
        <label>Asset</label>
        <select id="assetSelector">
          <!-- Populated from wallet balances -->
        </select>
      </div>
      
      <div class="form-group">
        <label>Amount</label>
        <input type="text" id="amountInput">
        <small class="balance-info">Available: X.XX RUNE</small>
      </div>
      
      <div class="form-group" id="addressGroup">
        <label>To Address</label>
        <input type="text" id="toAddressInput" placeholder="thor1...">
      </div>
      
      <div class="form-group">
        <label>Memo (Optional)</label>
        <input type="text" id="memoInput">
      </div>
    </div>
    
    <!-- Phase 2: Confirmation -->
    <div class="send-confirmation hidden" id="confirmationStep">
      <div class="transaction-summary">
        <h4>Transaction Summary</h4>
        <div class="summary-row">
          <span>Type:</span>
          <span id="confirmType">MsgSend</span>
        </div>
        <div class="summary-row">
          <span>Asset:</span>
          <span id="confirmAsset">THOR.RUNE</span>
        </div>
        <div class="summary-row">
          <span>Amount:</span>
          <span id="confirmAmount">1.0 RUNE</span>
        </div>
        <div class="summary-row">
          <span>To:</span>
          <span id="confirmAddress">thor1...</span>
        </div>
        <div class="summary-row">
          <span>Fee:</span>
          <span id="confirmFee">2.0 RUNE</span>
        </div>
      </div>
      
      <div class="password-prompt">
        <label>Enter wallet password to sign:</label>
        <input type="password" id="transactionPassword" placeholder="Wallet password">
      </div>
    </div>
    
    <!-- Phase 3: Progress -->
    <div class="send-progress hidden" id="progressStep">
      <div class="progress-indicator">
        <div class="step active">Signing Transaction</div>
        <div class="step">Broadcasting</div>
        <div class="step">Confirming</div>
      </div>
      <div class="transaction-hash" id="txHashDisplay"></div>
    </div>
  </div>
  
  <div class="dialog-footer">
    <button class="btn-secondary" id="cancelBtn">Cancel</button>
    <button class="btn-primary" id="nextBtn">Review Transaction</button>
    <button class="btn-primary hidden" id="confirmBtn">Sign & Send</button>
  </div>
</div>
```

### **Transaction Type Toggle Behavior**
```typescript
private onTransactionTypeChange(type: 'send' | 'deposit'): void {
  const addressGroup = document.getElementById('addressGroup')
  const memoInput = document.getElementById('memoInput')
  
  if (type === 'send') {
    // MsgSend: Address required, memo optional
    addressGroup.style.display = 'block'
    addressGroup.querySelector('label').textContent = 'To Address'
    memoInput.placeholder = 'Optional memo'
    
  } else {
    // MsgDeposit: No address (goes to module), memo for operations
    addressGroup.style.display = 'none'
    memoInput.placeholder = 'Swap memo (e.g., SWAP:BTC.BTC:thor1...)'
  }
}
```

---

## 📊 **Transaction Types & Validation**

### **MsgSend (Standard Transfer)**
```typescript
interface MsgSendParams {
  asset: string           // e.g., "THOR.RUNE"
  amount: string         // e.g., "1000000" (1 RUNE in base units)
  toAddress: string      // e.g., "thor1abc...def"
  memo?: string          // Optional memo
  useMsgDeposit: false
}

// Validation Rules:
// - toAddress is required and must be valid thor/sthor address
// - amount must be > 0 and <= available balance
// - asset must exist in wallet balances
```

### **MsgDeposit (THORChain Operations)**
```typescript
interface MsgDepositParams {
  asset: string          // e.g., "THOR.RUNE" 
  amount: string        // e.g., "1000000"
  memo?: string         // Usually required for swaps/LP
  useMsgDeposit: true
  // toAddress not needed - goes to THORChain module
}

// Validation Rules:
// - memo often required for meaningful operations
// - goes to THORChain module address automatically
// - commonly used for swaps, LP operations, etc.
```

### **Asset Selection & Balance Validation**
```typescript
private populateAssetSelector(balances: AssetBalance[]): void {
  const selector = document.getElementById('assetSelector') as HTMLSelectElement
  
  balances.forEach(balance => {
    const option = document.createElement('option')
    option.value = balance.asset
    option.textContent = `${balance.asset} (${this.formatBalance(balance.balance)})`
    selector.appendChild(option)
  })
}

private validateAmount(asset: string, amount: string): ValidationResult {
  const balance = this.getAssetBalance(asset)
  const amountNum = parseFloat(amount)
  
  if (amountNum <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' }
  }
  
  if (amountNum > parseFloat(balance.balance)) {
    return { valid: false, error: 'Insufficient balance' }
  }
  
  return { valid: true }
}
```

---

## ⚡ **Performance & UX Considerations**

### **Gas Estimation**
```typescript
// Before confirmation, estimate transaction fee
private async estimateTransactionFee(params: TransactionParams): Promise<TransactionFee> {
  // Use existing TransactionService.estimateGas()
  // This can be done without private key access
  const estimation = await this.backend.estimateGas(params)
  return estimation
}
```

### **Balance Updates**
```typescript
// After successful transaction, refresh wallet balances
private async onTransactionSuccess(result: TransactionResponse): void {
  // Show success message with transaction hash
  this.showSuccess(`Transaction sent! Hash: ${result.transactionHash}`)
  
  // Trigger wallet balance refresh
  this.emit('transaction-complete', {
    hash: result.transactionHash,
    type: params.useMsgDeposit ? 'deposit' : 'send'
  })
  
  // Close send dialog
  this.close()
}
```

### **Error Handling**
```typescript
private handleTransactionError(error: Error): void {
  if (error.message.includes('Invalid password')) {
    this.showPasswordError('Incorrect password')
  } else if (error.message.includes('Insufficient')) {
    this.showAmountError('Insufficient balance')  
  } else {
    this.showGeneralError(`Transaction failed: ${error.message}`)
  }
}
```

---

## 🛡️ **Security Best Practices Summary**

### **✅ Implemented Security Measures**
1. **Just-In-Time Decryption**: Mnemonic decrypted only during signing
2. **Immediate Memory Clearing**: Sensitive data cleared after use
3. **Password-Per-Transaction**: Each transaction requires password verification
4. **Encrypted Storage**: Private keys never stored in plaintext
5. **Minimal Exposure**: Private key only exists in memory during signing

### **🔒 Security Boundaries**
- **Frontend Components**: Never access private keys directly
- **Backend Services**: Handle encryption/decryption with password verification  
- **Transaction Service**: Receives temporary mnemonic, clears after use
- **IPC Layer**: Secure password verification before decryption

### **⚠️ Security Considerations**
- **Memory Limitations**: JavaScript string clearing is best-effort only
- **Session Management**: Consider transaction session timeout
- **Audit Logging**: Log transaction attempts (without sensitive data)
- **Rate Limiting**: Consider limiting transaction frequency

---

## 🚀 **Implementation Roadmap**

### **Phase 1: Core Security Infrastructure**
1. ✅ Fix wallet unlock password verification
2. 🔄 Add `decrypt-wallet-mnemonic` IPC handler
3. 🔄 Implement secure transaction flow
4. 🔄 Add memory clearing utilities

### **Phase 2: Send Component Implementation**  
1. 🔄 Create SendTransaction component structure
2. 🔄 Implement SendForm with validation
3. 🔄 Build SendConfirmation with password prompt
4. 🔄 Add SendProgress for transaction tracking

### **Phase 3: Integration & Testing**
1. 🔄 Integrate with WalletTab component
2. 🔄 Add comprehensive error handling
3. 🔄 Implement transaction tracking
4. 🔄 Security audit and testing

### **Phase 4: UX Polish**
1. 🔄 Add transaction history
2. 🔄 Implement fee optimization
3. 🔄 Add advanced memo templates
4. 🔄 Performance optimizations

This architecture provides a secure, user-friendly Send component that properly handles both MsgSend and MsgDeposit transactions while maintaining strict security boundaries around private key access.