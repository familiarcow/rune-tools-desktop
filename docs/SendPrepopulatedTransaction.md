# SendPrepopulatedTransaction Guide

This guide explains how to initiate pre-populated transactions in Rune Tools Desktop using the existing SendTransaction component. This pattern is used throughout the app for various transaction types including swaps, bonds, withdrawals, and TCY staking.

## Overview

The SendTransaction component accepts pre-populated data to skip the asset/amount selection step and jump directly to the confirmation screen. This is the standard pattern for transaction flows that have already determined the exact transaction parameters.

## Core Components

### SendTransaction Component
- **File**: `src/renderer/components/SendTransaction.ts`
- **Purpose**: Universal transaction component that handles MsgSend and MsgDeposit transactions
- **Container**: Uses `#global-overlay-container` for modal display

### Pre-populated Data Structure
```typescript
interface PrePopulatedTransactionData {
    transactionType: 'deposit' | 'send'
    asset: string               // e.g., 'THOR.RUNE', 'THOR.TCY', 'BTC.BTC'
    amount: string             // User-friendly amount (not base units)
    memo?: string              // Transaction memo (required for MsgDeposit)
    toAddress?: string         // Recipient address (for MsgSend only)
    skipToConfirmation: true   // Skip asset/amount selection, go to confirmation
}
```

## Implementation Pattern

### 1. Initialize SendTransaction Component
```typescript
// In your component constructor or initialization
const dialogContainer = document.getElementById('global-overlay-container')
if (!dialogContainer) {
    console.error('❌ Global overlay container not found')
    return
}

if (!this.sendTransaction) {
    this.sendTransaction = new SendTransaction(dialogContainer, this.backend)
}
```

### 2. Prepare Wallet Data
```typescript
const sendWalletData: SendTransactionData = {
    walletId: this.walletData.walletId,
    name: this.walletData.name,
    currentAddress: this.walletData.address,
    network: this.walletData.network,
    availableBalances: this.formatBalancesForSend() // Convert to SendAssetBalance[]
}
```

### 3. Create Pre-populated Data
```typescript
const prePopulatedData = {
    transactionType: 'deposit', // or 'send'
    asset: 'THOR.RUNE',
    amount: '100.5',            // User-friendly amount
    memo: 'SWAP:BTC.BTC',       // Transaction-specific memo
    skipToConfirmation: true
}
```

### 4. Initialize with Callbacks
```typescript
this.sendTransaction.initialize(sendWalletData, {
    onSuccess: (result) => {
        console.log('📤 Transaction completed:', result)
        this.refreshData() // Refresh your component's data
    },
    onClose: () => {
        console.log('🔄 Transaction dialog closed')
    }
}, prePopulatedData)
```

## Existing Implementation Examples

### 1. SwapTab (Direct MsgDeposit)
**File**: `src/renderer/components/SwapTab.ts:673-685`
```typescript
// Pre-populated transaction data for MsgDeposit
const prePopulatedData = {
    transactionType: 'deposit',
    asset: this.selectedFromAsset,
    amount: this.currentQuote.inputAmount,
    memo: this.currentQuote.quote.memo,
    skipToConfirmation: true // Skip to password confirmation step
};

// Show the send dialog with pre-populated data
await this.sendTransaction.initialize(sendWalletData, () => {
    console.log('📝 Swap transaction dialog closed');
}, prePopulatedData);
```

### 2. BondTab (Add/Remove Bond)
**File**: `src/renderer/components/BondTab.ts:718-750`

**Add Bond:**
```typescript
const prePopulatedData = {
    transactionType: 'deposit',
    asset: 'THOR.RUNE',
    amount: amount.toString(),
    memo: `BOND:${nodeAddress}`,
    skipToConfirmation: true
}
```

**Remove Bond:**
```typescript
// For removing bonds: MsgDeposit with amount=0 and UNBOND memo with base units
const amountBaseUnits = Math.round(amount * 1e8)
const memo = `UNBOND:${nodeAddress}:${amountBaseUnits}`

const prePopulatedData = {
    transactionType: 'deposit',
    asset: 'THOR.RUNE',
    amount: '0', // Amount is 0 for unbond
    memo: memo,
    skipToConfirmation: true
}
```

### 3. WalletTab (Withdraw Assets)
**File**: `src/renderer/components/WalletTab.ts:1124-1140`
```typescript
private handleWithdrawConfirmed(withdrawData: WithdrawFormData): void {
    // Generate the appropriate memo based on tier
    const memo = withdrawData.tier === 'trade' 
        ? `TRADE-:${withdrawData.toAddress}`
        : `SECURE-:${withdrawData.toAddress}`

    // Open the Send modal with pre-populated data
    this.openSendModalWithData({
        transactionType: 'deposit',
        asset: withdrawData.asset,
        amount: withdrawData.amount,
        toAddress: undefined, // MsgDeposit doesn't use toAddress
        memo: memo
        // Note: WalletTab does NOT use skipToConfirmation: true
    })
}
```

### 4. TcyTab (TCY Staking) - Dialog Pattern with Separate Containers
**File**: `src/renderer/components/TcyTab.ts:675-701`
```typescript
// Container initialization - SEPARATE containers to avoid z-index conflicts
constructor(container: HTMLElement, backend: BackendService) {
    // Initialize dialogs with separate containers like WalletTab does
    const stakeContainer = document.getElementById('stake-dialog-container')
    if (stakeContainer) {
        this.stakeDialog = new StakeDialog(stakeContainer, this.backend)
    }
    
    const unstakeContainer = document.getElementById('unstake-dialog-container')
    if (unstakeContainer) {
        this.unstakeDialog = new UnstakeDialog(unstakeContainer, this.backend)
    }
}

private handleStakeConfirmed(stakeData: StakeFormData): void {
    const prePopulatedData = {
        transactionType: 'deposit',
        asset: 'THOR.TCY',
        amount: stakeData.amount,
        memo: 'TCY+',
        toAddress: undefined
        // Note: Follows WalletTab pattern - no skipToConfirmation
    }
    
    this.openSendModalWithData(prePopulatedData)
}
```

**Required HTML containers:**
```html
<!-- TCY Dialog Containers - Added to index.html -->
<div id="stake-dialog-container" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center;">
</div>

<div id="unstake-dialog-container" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center;">
</div>
```

## Common Transaction Types & Memos

### MsgDeposit Transactions (transactionType: 'deposit')
| Use Case | Asset | Amount | Memo Format | Example |
|----------|-------|--------|-------------|---------|
| **Swap** | From Asset | Swap Amount | `SWAP:{TO_ASSET}:{DEST_ADDRESS}:{LIMIT}` | `SWAP:BTC.BTC::1000000000` |
| **Add Liquidity** | Pool Asset | LP Amount | `ADD:{ASSET}` | `ADD:BTC.BTC` |
| **Withdraw Liquidity** | RUNE | 0 | `WITHDRAW:{ASSET}:{BASIS_POINTS}` | `WITHDRAW:BTC.BTC:5000` |
| **Bond Node** | RUNE | Bond Amount | `BOND:{NODE_ADDRESS}` | `BOND:thor1abc...xyz` |
| **Unbond Node** | RUNE | 0 | `UNBOND:{NODE_ADDRESS}:{AMOUNT_BASE_UNITS}` | `UNBOND:thor1abc...xyz:100000000` |
| **TCY Stake** | TCY | Stake Amount | `TCY+` | `TCY+` |
| **TCY Unstake** | RUNE | 0 | `TCY-:{BASIS_POINTS}` | `TCY-:10000` |
| **Trade Withdraw** | Trade Asset | Withdraw Amount | `TRADE-:{DEST_ADDRESS}` | `TRADE-:bc1qxy...abc` |
| **Secure Withdraw** | Secured Asset | Withdraw Amount | `SECURE-:{DEST_ADDRESS}` | `SECURE-:bc1qxy...abc` |

### MsgSend Transactions (transactionType: 'send')
| Use Case | Asset | Amount | To Address | Memo |
|----------|-------|--------|------------|------|
| **Send Asset** | Any Asset | Send Amount | Recipient Address | Optional message |

## Dialog Integration Patterns

### Pattern 1: WithdrawDialog Style (Recommended)
**Used in**: WalletTab withdraw functionality  
**Files**: `src/renderer/components/WithdrawDialog.ts:44-290`

⚠️ **CRITICAL: Container Separation Required**
The WithdrawDialog pattern uses **separate dialog containers** to avoid z-index conflicts with SendTransaction. This is essential for proper modal layering.

```typescript
// 1. Create separate dialog component with dedicated container
class MyTransactionDialog {
    show(data: MyDialogData, callback: MyCallback): void
    hide(): void
    // ... validation and UI logic
}

// 2. Initialize in parent component with SEPARATE container (NOT global-overlay-container)
const dialogContainer = document.getElementById('my-dialog-container') // ⚠️ SEPARATE CONTAINER
this.myDialog = new MyTransactionDialog(dialogContainer, this.backend)

// 3. Show dialog with callback
this.myDialog.show(dialogData, (formData: MyFormData) => {
    this.handleConfirmed(formData)
})

// 4. Handle confirmation by calling SendTransaction
private handleConfirmed(formData: MyFormData): void {
    const prePopulatedData = {
        // ... create pre-populated data from form
    }
    this.openSendModalWithData(prePopulatedData)
}
```

**HTML Setup Required:**
```html
<!-- Add to index.html - SEPARATE from global-overlay-container -->
<div id="my-dialog-container" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center;">
</div>
```

### Pattern 2: Direct Call Style
**Used in**: SwapTab, direct transaction calls  
**Files**: `src/renderer/components/SwapTab.ts:640-691`

```typescript
// Skip dialog, directly call SendTransaction with calculated data
private executeTransaction(): void {
    const prePopulatedData = {
        transactionType: 'deposit',
        asset: this.calculatedAsset,
        amount: this.calculatedAmount,
        memo: this.calculatedMemo,
        skipToConfirmation: true
    }
    
    this.openSendModalWithData(prePopulatedData)
}
```

### Pattern 3: Custom Modal Style  
**Used in**: BondTab with custom HTML modals  
**Files**: `src/renderer/components/BondTab.ts:518-681`

```typescript
// Create custom HTML modal for input collection
private showCustomModal(): void {
    const modalHtml = `
        <!-- Custom modal HTML -->
    `
    document.body.insertAdjacentHTML('beforeend', modalHtml)
    
    // Handle form submission
    this.processFormData()
}

private processFormData(): void {
    // Validate and collect form data
    // Close modal
    // Call SendTransaction
    this.executeTransaction(collectedData)
}
```

## Error Handling

### Common Error Scenarios
```typescript
private openSendModalWithData(prePopulatedData: any): void {
    try {
        const dialogContainer = document.getElementById('global-overlay-container')
        if (!dialogContainer) {
            console.error('❌ Global overlay container not found')
            this.showError('Transaction dialog container not found')
            return
        }

        if (!this.sendTransaction) {
            this.sendTransaction = new SendTransaction(dialogContainer, this.backend)
        }

        // ... rest of implementation

    } catch (error) {
        console.error('❌ Failed to open transaction dialog:', error)
        this.showError('Failed to open transaction dialog: ' + (error as Error).message)
    }
}
```

## CSS Classes & Styling

### Modal Containers
- Use `#global-overlay-container` for all transaction modals
- Follow `.your-component-*` scoped CSS selectors (per RULES.md)

### Asset Icons
- Use `AssetService.GetLogoWithChain(asset, size)` for asset logos
- Implement error handling with `AssetService.handleImageError()`

## ⚠️ Z-Index Conflict Prevention

### The Problem
When dialogs use the same `#global-overlay-container` as SendTransaction, z-index conflicts occur:
- Your dialog has `z-index: 10000` 
- SendTransaction has `z-index: 1000`
- Result: SendTransaction modal is hidden behind your dialog overlay

### The Solution
**Use separate containers for your dialogs** (following WalletTab pattern):

1. **Add separate HTML containers** to `index.html`:
```html
<div id="your-dialog-container" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center;">
</div>
```

2. **Initialize dialogs with separate containers**:
```typescript
// ❌ WRONG - Will cause z-index conflict
const dialogContainer = document.getElementById('global-overlay-container')
this.myDialog = new MyDialog(dialogContainer, this.backend)

// ✅ CORRECT - Uses separate container
const dialogContainer = document.getElementById('your-dialog-container')
this.myDialog = new MyDialog(dialogContainer, this.backend)
```

3. **Flow works correctly**:
   - Your dialog shows in separate container (z-index: 10000)
   - User confirms, dialog auto-hides
   - SendTransaction shows in `global-overlay-container` (z-index: 1000)
   - No conflict because your dialog is hidden

### Existing Container Examples
- `#withdraw-dialog-container` - Used by WalletTab
- `#stake-dialog-container` - Used by TcyTab
- `#unstake-dialog-container` - Used by TcyTab

## Best Practices

1. **Use separate dialog containers** to avoid z-index conflicts with SendTransaction
2. **Follow WalletTab pattern** for dialog flows (no `skipToConfirmation` for dialog-based flows)
3. **Use `skipToConfirmation: true`** only for direct calls (SwapTab, BondTab style)
4. **Validate data before calling SendTransaction** - don't rely on SendTransaction for business logic validation
5. **Use user-friendly amounts** - SendTransaction handles conversion to base units
6. **Include proper error handling** for missing containers or initialization failures
7. **Refresh component data** after successful transactions via onSuccess callback
8. **Follow existing CSS patterns** with component-scoped selectors
9. **Log transaction events** for debugging and user feedback

## Testing Your Implementation

1. **Verify Modal Display**: Check that `#global-overlay-container` exists and modal appears
2. **Test Pre-population**: Ensure asset, amount, and memo are correctly populated
3. **Validate Skip Behavior**: Confirm it goes directly to confirmation screen
4. **Test Success Flow**: Verify onSuccess callback and data refresh
5. **Test Error Cases**: Handle missing containers, invalid data, etc.
6. **Cross-network Testing**: Test on both mainnet and stagenet if applicable

## Future Extensions

When adding new transaction types:
1. **Add memo format** to the Common Transaction Types table above
2. **Create interface definitions** for your specific dialog data
3. **Follow one of the three dialog patterns** based on your UI needs  
4. **Update this guide** with your new transaction type example
5. **Consider extracting common logic** into shared utilities if patterns emerge

This guide should be referenced whenever implementing new transaction flows to ensure consistency with the existing architecture.