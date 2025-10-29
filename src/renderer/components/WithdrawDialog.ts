/**
 * WithdrawDialog Component - Asset Withdrawal Pre-confirmation
 * 
 * Handles the withdrawal dialog for Trade and Secured assets before
 * opening the main Send modal with pre-populated data.
 */

import { BackendService } from '../services/BackendService'

export interface WithdrawDialogData {
  asset: string
  balance: string
  tier: 'trade' | 'secured'
  walletAddress: string
  network: 'mainnet' | 'stagenet'
}

export interface WithdrawFormData {
  asset: string
  amount: string
  toAddress: string
  tier: 'trade' | 'secured'
}

export interface WithdrawCallback {
  (data: WithdrawFormData): void
}

export class WithdrawDialog {
  private container: HTMLElement
  private backend: BackendService
  private withdrawData: WithdrawDialogData | null = null
  private callback: WithdrawCallback | null = null
  private validationErrors: Map<string, string> = new Map()

  constructor(container: HTMLElement, backend: BackendService) {
    this.container = container
    this.backend = backend
    
    console.log('🔧 WithdrawDialog component created')
  }

  show(withdrawData: WithdrawDialogData, callback: WithdrawCallback): void {
    console.log('🔄 Showing withdraw dialog for:', withdrawData)
    
    this.withdrawData = withdrawData
    this.callback = callback
    
    this.render()
    this.setupEventListeners()
    
    // Show the dialog
    this.container.style.display = 'flex'
  }

  hide(): void {
    console.log('👋 Hiding withdraw dialog')
    this.container.style.display = 'none'
    this.withdrawData = null
    this.callback = null
    this.validationErrors.clear()
  }

  private render(): void {
    if (!this.withdrawData) return

    const tierDisplayName = this.withdrawData.tier === 'trade' ? 'Trade' : 'Secured'
    const tierIcon = this.withdrawData.tier === 'trade' ? '💱' : '🔒'

    this.container.innerHTML = `
      <div class="dialog-overlay">
        <div class="dialog-content withdraw-dialog">
          <div class="dialog-header">
            <h3>${tierIcon} Withdraw ${tierDisplayName} Asset</h3>
            <button class="dialog-close-btn" id="withdrawCloseBtn">×</button>
          </div>

          <div class="dialog-body">
            <div class="withdraw-asset-info">
              <div class="asset-display">
                <div class="asset-name">${this.withdrawData.asset}</div>
                <div class="asset-balance">Available: ${this.withdrawData.balance}</div>
              </div>
            </div>

            <div class="withdraw-form">
              <!-- Withdrawal Address -->
              <div class="form-group">
                <label for="withdrawAddress" class="form-label">
                  Withdrawal Address *
                </label>
                <input type="text" class="form-control" id="withdrawAddress" 
                       placeholder="Enter L1 address to withdraw to">
                <div class="field-error hidden" id="withdrawAddressError"></div>
              </div>

              <!-- Amount -->
              <div class="form-group">
                <label for="withdrawAmount" class="form-label">
                  Amount *
                </label>
                <div class="amount-input-group">
                  <input type="text" class="form-control" id="withdrawAmount" 
                         placeholder="0.00">
                  <button class="btn btn-text" id="maxAmountBtn">Max</button>
                </div>
                <div class="field-error hidden" id="withdrawAmountError"></div>
              </div>

            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn btn-secondary" id="cancelWithdrawBtn">Cancel</button>
            <button class="btn btn-primary" id="confirmWithdrawBtn" disabled>
              Continue to Send
            </button>
          </div>
        </div>
      </div>
    `
  }

  private setupEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('withdrawCloseBtn')
    closeBtn?.addEventListener('click', () => this.hide())

    // Cancel button
    const cancelBtn = document.getElementById('cancelWithdrawBtn')
    cancelBtn?.addEventListener('click', () => this.hide())

    // Confirm button
    const confirmBtn = document.getElementById('confirmWithdrawBtn')
    confirmBtn?.addEventListener('click', () => this.handleConfirm())

    // Max amount button
    const maxBtn = document.getElementById('maxAmountBtn')
    maxBtn?.addEventListener('click', () => this.setMaxAmount())

    // Form inputs
    const addressInput = document.getElementById('withdrawAddress') as HTMLInputElement
    const amountInput = document.getElementById('withdrawAmount') as HTMLInputElement

    addressInput?.addEventListener('input', () => {
      this.validateForm()
    })

    addressInput?.addEventListener('blur', () => this.validateAddress())
    
    amountInput?.addEventListener('input', () => this.validateForm())
    amountInput?.addEventListener('blur', () => this.validateAmount())

    // Close dialog when clicking overlay
    const overlay = document.querySelector('.dialog-overlay')
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide()
      }
    })
  }

  private setMaxAmount(): void {
    if (!this.withdrawData) return
    
    const amountInput = document.getElementById('withdrawAmount') as HTMLInputElement
    if (amountInput) {
      amountInput.value = this.withdrawData.balance
      this.validateForm()
    }
  }


  private validateAddress(): boolean {
    const addressInput = document.getElementById('withdrawAddress') as HTMLInputElement
    if (!addressInput) return false

    const address = addressInput.value.trim()
    
    if (!address) {
      this.showFieldError('withdrawAddress', 'Withdrawal address is required')
      return false
    }

    // Basic address validation (length check)
    if (address.length < 20) {
      this.showFieldError('withdrawAddress', 'Address appears to be too short')
      return false
    }

    this.hideFieldError('withdrawAddress')
    return true
  }

  private validateAmount(): boolean {
    const amountInput = document.getElementById('withdrawAmount') as HTMLInputElement
    if (!amountInput || !this.withdrawData) return false

    const amount = amountInput.value.trim()
    
    if (!amount) {
      this.showFieldError('withdrawAmount', 'Amount is required')
      return false
    }

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      this.showFieldError('withdrawAmount', 'Amount must be a positive number')
      return false
    }

    const maxBalance = parseFloat(this.withdrawData.balance)
    if (numericAmount > maxBalance) {
      this.showFieldError('withdrawAmount', 'Amount exceeds available balance')
      return false
    }

    this.hideFieldError('withdrawAmount')
    return true
  }

  private validateForm(): boolean {
    const addressValid = this.validateAddress()
    const amountValid = this.validateAmount()
    const isValid = addressValid && amountValid

    // Update confirm button state
    const confirmBtn = document.getElementById('confirmWithdrawBtn') as HTMLButtonElement
    if (confirmBtn) {
      confirmBtn.disabled = !isValid
    }

    return isValid
  }

  private showFieldError(fieldId: string, message: string): void {
    const errorEl = document.getElementById(`${fieldId}Error`)
    const inputEl = document.getElementById(fieldId)
    
    if (errorEl && inputEl) {
      errorEl.textContent = message
      errorEl.classList.remove('hidden')
      inputEl.classList.add('error')
    }
    
    this.validationErrors.set(fieldId, message)
  }

  private hideFieldError(fieldId: string): void {
    const errorEl = document.getElementById(`${fieldId}Error`)
    const inputEl = document.getElementById(fieldId)
    
    if (errorEl && inputEl) {
      errorEl.classList.add('hidden')
      inputEl.classList.remove('error')
    }
    
    this.validationErrors.delete(fieldId)
  }

  private handleConfirm(): void {
    if (!this.validateForm() || !this.withdrawData || !this.callback) {
      return
    }

    const addressInput = document.getElementById('withdrawAddress') as HTMLInputElement
    const amountInput = document.getElementById('withdrawAmount') as HTMLInputElement

    const formData: WithdrawFormData = {
      asset: this.withdrawData.asset,
      amount: amountInput.value.trim(),
      toAddress: addressInput.value.trim(),
      tier: this.withdrawData.tier
    }

    console.log('✅ Withdraw form confirmed:', formData)
    
    // Call the callback with the form data
    this.callback(formData)
    
    // Hide the dialog
    this.hide()
  }
}