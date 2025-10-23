/**
 * SendForm Component - Transaction Input Form
 * 
 * Handles transaction form input and validation for both MsgSend and MsgDeposit
 * transactions. Provides dynamic UI based on transaction type selection.
 */

import { BackendService } from '../services/BackendService'
import { formatAmount, isValidAmount, isDustAmount } from '../../utils/assetUtils'

export interface AssetBalance {
  asset: string
  balance: string
  usdValue?: string
}

export interface TransactionFormData {
  transactionType: 'send' | 'deposit'
  asset: string
  amount: string
  toAddress?: string  // Required for MsgSend
  memo?: string       // Optional for MsgSend, used in MsgDeposit
}

interface ValidationResult {
  valid: boolean
  error?: string
}

export class SendForm {
  private container: HTMLElement
  private backend: BackendService
  private availableBalances: AssetBalance[] = []
  private selectedAsset: string = ''
  private validationErrors: Map<string, string> = new Map()

  constructor(container: HTMLElement, backend: BackendService) {
    this.container = container
    this.backend = backend
    
    console.log('🔧 SendForm component created')
  }

  async initialize(balances: AssetBalance[]): Promise<void> {
    try {
      console.log('📝 Initializing send form with', balances.length, 'assets')
      
      this.availableBalances = balances
      
      // Select first asset by default
      if (balances.length > 0) {
        this.selectedAsset = balances[0].asset
      }

      this.render()
      this.setupEventListeners()
      
    } catch (error) {
      console.error('❌ Failed to initialize SendForm:', error)
      throw error
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="send-form-content">
        <!-- Transaction Type Selection -->
        <div class="form-section">
          <label class="form-label">Transaction Type</label>
          <div class="transaction-type-selector">
            <label class="radio-option">
              <input type="radio" name="txType" value="send" checked id="txTypeSend">
              <span class="radio-label">
                <strong>MsgSend</strong>
                <small>Standard transfer to another address</small>
              </span>
            </label>
            <label class="radio-option">
              <input type="radio" name="txType" value="deposit" id="txTypeDeposit">
              <span class="radio-label">
                <strong>MsgDeposit</strong>
                <small>Deposit to THORChain for swaps/LP</small>
              </span>
            </label>
          </div>
        </div>

        <!-- Asset Selection -->
        <div class="form-section">
          <label class="form-label" for="assetSelector">Asset</label>
          <select class="form-control" id="assetSelector">
            <!-- Populated dynamically -->
          </select>
          <div class="form-error hidden" id="assetError"></div>
        </div>

        <!-- Amount Input -->
        <div class="form-section">
          <label class="form-label" for="amountInput">Amount</label>
          <div class="amount-input-group">
            <input type="text" class="form-control" id="amountInput" placeholder="0.00">
            <button type="button" class="btn-max" id="maxBtn">MAX</button>
          </div>
          <div class="balance-info" id="balanceInfo">
            Available: 0.00
          </div>
          <div class="form-error hidden" id="amountError"></div>
        </div>

        <!-- To Address (MsgSend only) -->
        <div class="form-section" id="addressSection">
          <label class="form-label" for="toAddressInput">To Address</label>
          <input type="text" class="form-control" id="toAddressInput" placeholder="thor1...">
          <div class="form-helper">
            <small>Enter a valid THORChain address (thor1... or sthor1...)</small>
          </div>
          <div class="form-error hidden" id="addressError"></div>
        </div>

        <!-- Memo Input -->
        <div class="form-section">
          <label class="form-label" for="memoInput">Memo</label>
          <input type="text" class="form-control" id="memoInput" placeholder="Optional memo">
          <div class="form-helper" id="memoHelper">
            <small id="memoHelperText">Optional memo for this transaction</small>
          </div>
          <div class="form-error hidden" id="memoError"></div>
        </div>

        <!-- Transaction Summary -->
        <div class="form-section">
          <div class="transaction-summary" id="transactionSummary">
            <div class="summary-row">
              <span>Type:</span>
              <span id="summaryType">MsgSend</span>
            </div>
            <div class="summary-row">
              <span>Asset:</span>
              <span id="summaryAsset">-</span>
            </div>
            <div class="summary-row">
              <span>Amount:</span>
              <span id="summaryAmount">-</span>
            </div>
            <div class="summary-row" id="summaryAddressRow">
              <span>To:</span>
              <span id="summaryAddress">-</span>
            </div>
          </div>
        </div>
      </div>
    `

    this.populateAssetSelector()
    this.updateBalanceInfo()
    this.updateTransactionSummary()
  }

  private setupEventListeners(): void {
    // Transaction type change
    const txTypeSend = document.getElementById('txTypeSend') as HTMLInputElement
    const txTypeDeposit = document.getElementById('txTypeDeposit') as HTMLInputElement
    
    txTypeSend?.addEventListener('change', () => this.onTransactionTypeChange('send'))
    txTypeDeposit?.addEventListener('change', () => this.onTransactionTypeChange('deposit'))

    // Asset selection change
    const assetSelector = document.getElementById('assetSelector') as HTMLSelectElement
    assetSelector?.addEventListener('change', () => this.onAssetChange())

    // Amount input
    const amountInput = document.getElementById('amountInput') as HTMLInputElement
    amountInput?.addEventListener('input', () => this.onAmountChange())
    amountInput?.addEventListener('blur', () => this.validateAmount())

    // Max button
    const maxBtn = document.getElementById('maxBtn')
    maxBtn?.addEventListener('click', () => this.setMaxAmount())

    // To address input
    const toAddressInput = document.getElementById('toAddressInput') as HTMLInputElement
    toAddressInput?.addEventListener('blur', () => this.validateAddress())
    toAddressInput?.addEventListener('input', () => this.clearError('address'))

    // Memo input
    const memoInput = document.getElementById('memoInput') as HTMLInputElement
    memoInput?.addEventListener('input', () => this.onMemoChange())
  }

  private populateAssetSelector(): void {
    const selector = document.getElementById('assetSelector') as HTMLSelectElement
    if (!selector) return

    // Clear existing options
    selector.innerHTML = ''

    // Add assets from balances
    this.availableBalances.forEach(balance => {
      const option = document.createElement('option')
      option.value = balance.asset
      option.textContent = `${balance.asset} (${this.formatBalance(balance.balance)})`
      
      if (balance.asset === this.selectedAsset) {
        option.selected = true
      }
      
      selector.appendChild(option)
    })
  }

  private onTransactionTypeChange(type: 'send' | 'deposit'): void {
    console.log('🔄 Transaction type changed to:', type)
    
    const addressSection = document.getElementById('addressSection')
    const memoHelperText = document.getElementById('memoHelperText')
    const memoInput = document.getElementById('memoInput') as HTMLInputElement
    
    if (type === 'send') {
      // MsgSend: Address required, memo optional
      if (addressSection) {
        addressSection.style.display = 'block'
      }
      if (memoHelperText) {
        memoHelperText.textContent = 'Optional memo for this transaction'
      }
      if (memoInput) {
        memoInput.placeholder = 'Optional memo'
      }
    } else {
      // MsgDeposit: No address (goes to module), memo for operations
      if (addressSection) {
        addressSection.style.display = 'none'
      }
      if (memoHelperText) {
        memoHelperText.textContent = 'Memo for swap/LP operations (e.g., SWAP:BTC.BTC:thor1...)'
      }
      if (memoInput) {
        memoInput.placeholder = 'Swap/LP memo'
      }
    }

    this.updateTransactionSummary()
  }

  private onAssetChange(): void {
    const selector = document.getElementById('assetSelector') as HTMLSelectElement
    if (!selector) return

    this.selectedAsset = selector.value
    console.log('💰 Asset changed to:', this.selectedAsset)

    this.updateBalanceInfo()
    this.validateAmount()
    this.updateTransactionSummary()
    this.clearError('asset')
  }

  private onAmountChange(): void {
    this.clearError('amount')
    this.updateTransactionSummary()
  }

  private onMemoChange(): void {
    this.updateTransactionSummary()
  }

  private updateBalanceInfo(): void {
    const balanceInfo = document.getElementById('balanceInfo')
    if (!balanceInfo) return

    const balance = this.getAssetBalance(this.selectedAsset)
    if (balance) {
      const formattedBalance = this.formatBalance(balance.balance)
      balanceInfo.textContent = `Available: ${formattedBalance} ${this.selectedAsset}`
      
      // Add USD value if available
      if (balance.usdValue) {
        balanceInfo.innerHTML += ` <span class="usd-value">(~$${balance.usdValue})</span>`
      }
    } else {
      balanceInfo.textContent = 'Available: 0.00'
    }
  }

  private updateTransactionSummary(): void {
    const summaryType = document.getElementById('summaryType')
    const summaryAsset = document.getElementById('summaryAsset')
    const summaryAmount = document.getElementById('summaryAmount')
    const summaryAddress = document.getElementById('summaryAddress')
    const summaryAddressRow = document.getElementById('summaryAddressRow')

    // Get current form values
    const txType = this.getSelectedTransactionType()
    const amount = (document.getElementById('amountInput') as HTMLInputElement)?.value || '0'
    const toAddress = (document.getElementById('toAddressInput') as HTMLInputElement)?.value || ''

    // Update summary
    if (summaryType) {
      summaryType.textContent = txType === 'send' ? 'MsgSend' : 'MsgDeposit'
    }
    
    if (summaryAsset) {
      summaryAsset.textContent = this.selectedAsset || '-'
    }
    
    if (summaryAmount) {
      summaryAmount.textContent = amount ? `${amount} ${this.selectedAsset}` : '-'
    }

    // Show/hide address row based on transaction type
    if (summaryAddressRow && summaryAddress) {
      if (txType === 'send') {
        summaryAddressRow.style.display = 'flex'
        summaryAddress.textContent = toAddress ? this.truncateAddress(toAddress) : '-'
      } else {
        summaryAddressRow.style.display = 'none'
      }
    }
  }

  private setMaxAmount(): void {
    const balance = this.getAssetBalance(this.selectedAsset)
    if (!balance) return

    const amountInput = document.getElementById('amountInput') as HTMLInputElement
    if (!amountInput) return

    // Set max amount (could subtract estimated fee in future)
    amountInput.value = balance.balance
    this.onAmountChange()
    
    console.log('💯 Set max amount:', balance.balance)
  }

  // Validation methods
  private validateAmount(): ValidationResult {
    const amountInput = document.getElementById('amountInput') as HTMLInputElement
    if (!amountInput) return { valid: false, error: 'Amount input not found' }

    const amount = amountInput.value.trim()
    
    if (!amount) {
      return this.showFieldError('amount', 'Amount is required')
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return this.showFieldError('amount', 'Amount must be a positive number')
    }

    const balance = this.getAssetBalance(this.selectedAsset)
    if (!balance) {
      return this.showFieldError('amount', 'Selected asset not found')
    }

    const balanceNum = parseFloat(balance.balance)
    if (amountNum > balanceNum) {
      return this.showFieldError('amount', `Insufficient balance. Available: ${balance.balance}`)
    }

    this.clearError('amount')
    return { valid: true }
  }

  private validateAddress(): ValidationResult {
    const txType = this.getSelectedTransactionType()
    
    // Address not required for deposits
    if (txType === 'deposit') {
      this.clearError('address')
      return { valid: true }
    }

    const addressInput = document.getElementById('toAddressInput') as HTMLInputElement
    if (!addressInput) return { valid: false, error: 'Address input not found' }

    const address = addressInput.value.trim()
    
    if (!address) {
      return this.showFieldError('address', 'To address is required for send transactions')
    }

    // Basic THORChain address validation
    if (!address.startsWith('thor1') && !address.startsWith('sthor1')) {
      return this.showFieldError('address', 'Invalid address format. Must start with thor1 or sthor1')
    }

    if (address.length < 40) {
      return this.showFieldError('address', 'Address is too short')
    }

    this.clearError('address')
    return { valid: true }
  }

  private validateForm(): boolean {
    let isValid = true

    // Validate transaction type
    const txType = this.getSelectedTransactionType()
    if (!txType) {
      isValid = false
    }

    // Validate asset
    if (!this.selectedAsset) {
      this.showFieldError('asset', 'Asset selection is required')
      isValid = false
    }

    // Validate amount
    const amountResult = this.validateAmount()
    if (!amountResult.valid) {
      isValid = false
    }

    // Validate address
    const addressResult = this.validateAddress()
    if (!addressResult.valid) {
      isValid = false
    }

    return isValid
  }

  // Helper methods
  private getSelectedTransactionType(): 'send' | 'deposit' {
    const txTypeSend = document.getElementById('txTypeSend') as HTMLInputElement
    return txTypeSend?.checked ? 'send' : 'deposit'
  }

  private getAssetBalance(asset: string): AssetBalance | undefined {
    return this.availableBalances.find(balance => balance.asset === asset)
  }

  private formatBalance(balance: string): string {
    const num = parseFloat(balance)
    if (num === 0) return '0'
    
    // Use up to 8 decimal places for precision, remove trailing zeros
    return num.toFixed(8).replace(/\.?0+$/, '')
  }

  private truncateAddress(address: string): string {
    if (address.length <= 16) return address
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  private showFieldError(field: string, message: string): ValidationResult {
    this.validationErrors.set(field, message)
    
    const errorEl = document.getElementById(`${field}Error`)
    if (errorEl) {
      errorEl.textContent = message
      errorEl.classList.remove('hidden')
    }

    return { valid: false, error: message }
  }

  private clearError(field: string): void {
    this.validationErrors.delete(field)
    
    const errorEl = document.getElementById(`${field}Error`)
    if (errorEl) {
      errorEl.textContent = ''
      errorEl.classList.add('hidden')
    }
  }

  private clearAllErrors(): void {
    this.validationErrors.clear()
    
    const errorElements = this.container.querySelectorAll('.form-error')
    errorElements.forEach(el => {
      el.textContent = ''
      el.classList.add('hidden')
    })
  }

  // Public methods
  getFormData(): TransactionFormData {
    const txType = this.getSelectedTransactionType()
    const amount = (document.getElementById('amountInput') as HTMLInputElement)?.value?.trim() || ''
    const toAddress = (document.getElementById('toAddressInput') as HTMLInputElement)?.value?.trim() || ''
    const memo = (document.getElementById('memoInput') as HTMLInputElement)?.value?.trim() || ''

    return {
      transactionType: txType,
      asset: this.selectedAsset,
      amount: amount,
      toAddress: txType === 'send' ? toAddress : undefined,
      memo: memo || undefined
    }
  }

  isValid(): boolean {
    this.clearAllErrors()
    return this.validateForm()
  }

  getValidationErrors(): string[] {
    return Array.from(this.validationErrors.values())
  }
}