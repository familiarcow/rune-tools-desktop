/**
 * SendForm Component - Transaction Input Form
 * 
 * Handles transaction form input and validation for both MsgSend and MsgDeposit
 * transactions. Provides dynamic UI based on transaction type selection.
 */

import { BackendService } from '../services/BackendService'
import { formatAmount, isValidAmount, isDustAmount } from '../../utils/assetUtils'
import { AssetSelector, AssetSelectorOption } from './AssetSelector'

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
  private assetSelector: AssetSelector | null = null

  constructor(container: HTMLElement, backend: BackendService) {
    this.container = container
    this.backend = backend
    
    console.log('🔧 SendForm component created')
  }

  async initialize(balances: AssetBalance[], prePopulatedData?: any): Promise<void> {
    try {
      console.log('📝 Initializing send form with', balances.length, 'assets')
      
      // Sort assets by USD value of wallet positions
      this.availableBalances = await this.sortAssetsByUsdValue(balances)
      
      // Select first asset by default (highest balance)
      if (this.availableBalances.length > 0) {
        this.selectedAsset = this.availableBalances[0].asset
      }

      // Override with pre-populated data if provided
      if (prePopulatedData) {
        console.log('📝 Using pre-populated data:', prePopulatedData)
        if (prePopulatedData.asset) {
          this.selectedAsset = prePopulatedData.asset
        }
      }

      this.render()
      this.setupEventListeners()

      // Apply pre-populated data after render
      if (prePopulatedData) {
        this.applyPrePopulatedData(prePopulatedData)
      }
      
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
                <small>Deposit to THORChain</small>
              </span>
            </label>
          </div>
        </div>

        <!-- Asset & Amount (Same Line) -->
        <div class="form-section">
          <div class="asset-amount-row">
            <div class="asset-column">
              <label class="form-label">
                Asset
                <span class="required-asterisk hidden" id="assetAsterisk">*</span>
              </label>
              <div id="asset-selector-component"></div>
            </div>
            
            <div class="amount-column">
              <label class="form-label" for="amountInput">
                Amount
                <span class="required-asterisk hidden" id="amountAsterisk">*</span>
              </label>
              <div class="amount-input-group">
                <input type="text" class="form-control" id="amountInput" placeholder="0.00">
                <button type="button" class="btn-max" id="maxBtn">MAX</button>
              </div>
              <div class="balance-info" id="balanceInfo">
                Available: 0.00
              </div>
            </div>
          </div>
        </div>

        <!-- To Address (MsgSend only) -->
        <div class="form-section" id="addressSection">
          <label class="form-label" for="toAddressInput">
            To Address
            <span class="required-asterisk hidden" id="addressAsterisk">*</span>
          </label>
          <input type="text" class="form-control" id="toAddressInput" placeholder="thor1...">
        </div>

        <!-- Memo Input -->
        <div class="form-section">
          <label class="form-label" for="memoInput">Memo</label>
          <input type="text" class="form-control" id="memoInput" placeholder="Optional">
        </div>

      </div>
    `

    this.initializeAssetSelector()
    this.updateBalanceInfo()
  }

  private setupEventListeners(): void {
    // Transaction type change
    const txTypeSend = document.getElementById('txTypeSend') as HTMLInputElement
    const txTypeDeposit = document.getElementById('txTypeDeposit') as HTMLInputElement
    
    txTypeSend?.addEventListener('change', () => this.onTransactionTypeChange('send'))
    txTypeDeposit?.addEventListener('change', () => this.onTransactionTypeChange('deposit'))

    // AssetSelector is now handled via callback in initializeAssetSelector

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

  private initializeAssetSelector(): void {
    const container = document.getElementById('asset-selector-component');
    if (!container) {
      console.error('❌ Asset selector container not found!')
      return
    }

    console.log('📝 Initializing asset selector with', this.availableBalances.length, 'balances')

    // Prepare asset options with user balances
    const assetOptions: AssetSelectorOption[] = this.availableBalances.map(balance => ({
      asset: balance.asset,
      balance: balance.balance,
      usdValue: balance.usdValue ? parseFloat(balance.usdValue) : 0
    }));

    // Initialize AssetSelector
    this.assetSelector = new AssetSelector(container as HTMLElement, {
      id: 'send-asset-selector',
      placeholder: 'Select asset to send',
      displayMode: 'user-balances',
      searchable: true,
      onSelectionChange: (asset) => {
        this.selectedAsset = asset || '';
        this.onAssetChange();
      }
    });

    this.assetSelector.initialize(assetOptions);
    
    // Set initial selection if we have one
    if (this.selectedAsset) {
      this.assetSelector.setSelectedAsset(this.selectedAsset);
    }

    console.log('✅ Asset selector initialized with', assetOptions.length, 'options')
  }

  private onTransactionTypeChange(type: 'send' | 'deposit'): void {
    console.log('🔄 Transaction type changed to:', type)
    
    const addressSection = document.getElementById('addressSection')
    const memoInput = document.getElementById('memoInput') as HTMLInputElement
    
    if (type === 'send') {
      // MsgSend: Address required, memo optional
      if (addressSection) {
        addressSection.style.display = 'block'
      }
      if (memoInput) {
        memoInput.placeholder = 'Optional'
      }
    } else {
      // MsgDeposit: No address (goes to module), memo for operations
      if (addressSection) {
        addressSection.style.display = 'none'
      }
      if (memoInput) {
        memoInput.placeholder = 'Swap/LP memo'
      }
    }
  }

  private onAssetChange(): void {
    console.log('💰 Asset changed to:', this.selectedAsset)

    this.updateBalanceInfo()
    this.validateAmount()
    this.clearError('asset')
  }

  private onAmountChange(): void {
    this.clearError('amount')
  }

  private onMemoChange(): void {
    // Clear any memo-related errors if needed in future
  }

  private updateBalanceInfo(): void {
    const balanceInfo = document.getElementById('balanceInfo')
    if (!balanceInfo) return

    const balance = this.getAssetBalance(this.selectedAsset)
    if (balance) {
      const formattedBalance = this.formatBalance(balance.balance)
      balanceInfo.textContent = `Available: ${formattedBalance} ${this.selectedAsset}`
      
      // Add USD value if available (format to 2 decimal places)
      if (balance.usdValue) {
        const usdFormatted = parseFloat(balance.usdValue).toFixed(2)
        balanceInfo.innerHTML += ` <span class="usd-value">(~$${usdFormatted})</span>`
      }
    } else {
      balanceInfo.textContent = 'Available: 0.00'
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
  private async sortAssetsByUsdValue(balances: AssetBalance[]): Promise<AssetBalance[]> {
    try {
      console.log('💰 Sorting assets by USD value of wallet positions...')
      
      // Sort by USD value descending (user's actual position value)
      const sortedBalances = [...balances].sort((a, b) => {
        const aUsdValue = parseFloat(a.usdValue || '0')
        const bUsdValue = parseFloat(b.usdValue || '0')
        return bUsdValue - aUsdValue
      })
      
      console.log('✅ Assets sorted by USD position value:', sortedBalances.map(b => ({
        asset: b.asset,
        usdValue: b.usdValue || '0'
      })))
      
      return sortedBalances
      
    } catch (error) {
      console.warn('⚠️ Failed to sort assets by USD value, using original order:', error)
      return balances
    }
  }


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
    
    // Show red asterisk instead of error text
    const asteriskEl = document.getElementById(`${field}Asterisk`)
    if (asteriskEl) {
      asteriskEl.classList.remove('hidden')
    }

    return { valid: false, error: message }
  }

  private clearError(field: string): void {
    this.validationErrors.delete(field)
    
    // Hide red asterisk
    const asteriskEl = document.getElementById(`${field}Asterisk`)
    if (asteriskEl) {
      asteriskEl.classList.add('hidden')
    }
  }

  private clearAllErrors(): void {
    this.validationErrors.clear()
    
    // Hide all asterisks
    const asteriskElements = this.container.querySelectorAll('.required-asterisk')
    asteriskElements.forEach(el => {
      el.classList.add('hidden')
    })
  }

  // Public methods
  getFormData(): TransactionFormData {
    const txType = this.getSelectedTransactionType()
    const amountInput = document.getElementById('amountInput') as HTMLInputElement
    const amount = amountInput?.value?.trim() || ''
    const toAddress = (document.getElementById('toAddressInput') as HTMLInputElement)?.value?.trim() || ''
    const memo = (document.getElementById('memoInput') as HTMLInputElement)?.value?.trim() || ''

    console.log('📝 DEBUG: SendForm getFormData:', {
      amountInputExists: !!amountInput,
      amountInputValue: amountInput?.value,
      amountAfterTrim: amount,
      amountAsNumber: parseFloat(amount),
      selectedAsset: this.selectedAsset,
      txType: txType
    })

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

  private applyPrePopulatedData(data: any): void {
    console.log('📝 Applying pre-populated data to form:', data)

    try {
      // Set transaction type
      if (data.transactionType === 'deposit') {
        const depositRadio = document.getElementById('txTypeDeposit') as HTMLInputElement
        if (depositRadio) {
          depositRadio.checked = true
          this.onTransactionTypeChange('deposit')
        }
      } else if (data.transactionType === 'send') {
        const sendRadio = document.getElementById('txTypeSend') as HTMLInputElement
        if (sendRadio) {
          sendRadio.checked = true
          this.onTransactionTypeChange('send')
        }
      }

      // Set asset selection
      if (data.asset) {
        this.selectedAsset = data.asset
        if (this.assetSelector) {
          this.assetSelector.setSelectedAsset(data.asset)
        }
        this.onAssetChange()
      }

      // Set amount
      if (data.amount) {
        const amountInput = document.getElementById('amountInput') as HTMLInputElement
        if (amountInput) {
          amountInput.value = data.amount
        }
      }

      // Set memo (for MsgDeposit withdrawals)
      if (data.memo) {
        const memoInput = document.getElementById('memoInput') as HTMLInputElement
        if (memoInput) {
          memoInput.value = data.memo
        }
      }

      // Set to address (if needed for MsgSend)
      if (data.toAddress) {
        const toAddressInput = document.getElementById('toAddressInput') as HTMLInputElement
        if (toAddressInput) {
          toAddressInput.value = data.toAddress
        }
      }

      console.log('✅ Pre-populated data applied successfully')

    } catch (error) {
      console.error('❌ Failed to apply pre-populated data:', error)
    }
  }

  /**
   * Cleanup method to destroy AssetSelector instance
   */
  destroy(): void {
    if (this.assetSelector) {
      this.assetSelector.destroy();
      this.assetSelector = null;
    }
    console.log('🧹 SendForm: AssetSelector instance destroyed');
  }
}