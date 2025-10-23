/**
 * SendTransaction Component - Secure Transaction Dialog
 * 
 * Main component for handling MsgSend and MsgDeposit transactions with
 * secure password-per-transaction authentication and just-in-time key decryption.
 */

import { BackendService } from '../services/BackendService'
import { SendForm } from './SendForm'
import { SendConfirmation } from './SendConfirmation'
import { SendProgress } from './SendProgress'

export interface SendTransactionData {
  walletId: string
  name: string
  currentAddress: string // network-specific address
  network: 'mainnet' | 'stagenet'
  availableBalances: AssetBalance[]
}

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

export interface TransactionParams {
  asset: string
  amount: string
  toAddress?: string
  memo?: string
  useMsgDeposit: boolean
}

export interface TransactionResponse {
  code: number
  transactionHash: string
  rawLog: string
  events: any[]
}

export class SendTransaction {
  private container: HTMLElement
  private backend: BackendService
  private transactionData: SendTransactionData | null = null
  
  // SECURITY: Never store mnemonic or sensitive data in component state
  private sendForm: SendForm | null = null
  private confirmation: SendConfirmation | null = null
  private progress: SendProgress | null = null
  
  private currentPhase: 'form' | 'confirmation' | 'progress' = 'form'
  private onCloseCallback?: () => void

  constructor(container: HTMLElement, backend: BackendService) {
    this.container = container
    this.backend = backend
    
    console.log('🔧 SendTransaction component created')
  }

  /**
   * Initialize the Send dialog with wallet data (non-sensitive only)
   */
  async initialize(walletData: SendTransactionData, onClose?: () => void): Promise<void> {
    try {
      console.log('💳 Initializing Send dialog for wallet:', walletData.name)
      
      this.transactionData = walletData
      this.onCloseCallback = onClose
      
      // Reset to form phase
      this.currentPhase = 'form'
      
      // Render the dialog structure
      this.render()
      
      // Initialize form component
      await this.initializeForm()
      
      // Show the dialog
      this.show()
      
    } catch (error) {
      console.error('❌ Failed to initialize Send dialog:', error)
      throw error
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="send-transaction-dialog" id="sendDialog">
        <div class="dialog-overlay" id="dialogOverlay"></div>
        <div class="dialog-content">
          <div class="dialog-header">
            <h3>Send Transaction</h3>
            <button class="close-btn" id="closeBtn">×</button>
          </div>
          
          <div class="dialog-body" id="dialogBody">
            <!-- Phase 1: Form Input -->
            <div class="send-form" id="sendFormStep">
              <!-- Form will be rendered by SendForm component -->
            </div>
            
            <!-- Phase 2: Confirmation -->
            <div class="send-confirmation hidden" id="confirmationStep">
              <!-- Confirmation will be rendered by SendConfirmation component -->
            </div>
            
            <!-- Phase 3: Progress -->
            <div class="send-progress hidden" id="progressStep">
              <!-- Progress will be rendered by SendProgress component -->
            </div>
          </div>
          
          <div class="dialog-footer">
            <button class="btn-secondary" id="cancelBtn">Cancel</button>
            <button class="btn-primary" id="nextBtn">Review Transaction</button>
            <button class="btn-primary hidden" id="confirmBtn">Sign & Send</button>
            <button class="btn-secondary hidden" id="backBtn">Back</button>
          </div>
        </div>
      </div>
    `

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Close button and overlay
    const closeBtn = document.getElementById('closeBtn')
    const overlay = document.getElementById('dialogOverlay')
    const cancelBtn = document.getElementById('cancelBtn')
    
    closeBtn?.addEventListener('click', () => this.close())
    overlay?.addEventListener('click', () => this.close())
    cancelBtn?.addEventListener('click', () => this.close())

    // Navigation buttons
    const nextBtn = document.getElementById('nextBtn')
    const confirmBtn = document.getElementById('confirmBtn')
    const backBtn = document.getElementById('backBtn')

    nextBtn?.addEventListener('click', () => this.onNextClicked())
    confirmBtn?.addEventListener('click', () => this.onConfirmClicked())
    backBtn?.addEventListener('click', () => this.onBackClicked())

    // Escape key to close
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close()
    }
  }

  private async initializeForm(): Promise<void> {
    if (!this.transactionData) return

    const formContainer = document.getElementById('sendFormStep')
    if (!formContainer) return

    this.sendForm = new SendForm(formContainer, this.backend)
    await this.sendForm.initialize(this.transactionData.availableBalances)
  }

  private async onNextClicked(): Promise<void> {
    try {
      if (!this.sendForm || !this.transactionData) return

      // Get and validate form data
      const formData = this.sendForm.getFormData()
      if (!this.validateFormData(formData)) {
        return // Validation errors shown by form
      }

      // Convert to transaction parameters
      const transactionParams: TransactionParams = {
        asset: formData.asset,
        amount: formData.amount,
        toAddress: formData.toAddress,
        memo: formData.memo,
        useMsgDeposit: formData.transactionType === 'deposit'
      }

      console.log('📝 Form completed, moving to confirmation phase')

      // Move to confirmation phase
      await this.showConfirmation(transactionParams)

    } catch (error) {
      console.error('❌ Error processing form:', error)
      this.showError('Failed to process transaction: ' + (error as Error).message)
    }
  }

  private validateFormData(formData: TransactionFormData): boolean {
    // Basic validation - detailed validation in SendForm
    if (!formData.asset || !formData.amount) {
      this.showError('Asset and amount are required')
      return false
    }

    if (formData.transactionType === 'send' && !formData.toAddress) {
      this.showError('To address is required for send transactions')
      return false
    }

    const amountNum = parseFloat(formData.amount)
    if (amountNum <= 0) {
      this.showError('Amount must be greater than 0')
      return false
    }

    return true
  }

  private async showConfirmation(transactionParams: TransactionParams): Promise<void> {
    if (!this.transactionData) return

    // Hide form, show confirmation
    this.hideStep('sendFormStep')
    this.showStep('confirmationStep')
    this.currentPhase = 'confirmation'

    // Update navigation buttons
    this.updateButtonsForConfirmation()

    // Initialize confirmation component
    const confirmationContainer = document.getElementById('confirmationStep')
    if (!confirmationContainer) return

    this.confirmation = new SendConfirmation(confirmationContainer, this.backend)
    await this.confirmation.initialize(this.transactionData, transactionParams)
  }

  private async onConfirmClicked(): Promise<void> {
    try {
      if (!this.confirmation) return

      console.log('🔐 Starting secure transaction confirmation')

      // Get password from confirmation component
      const password = this.confirmation.getPassword()
      if (!password) {
        this.showError('Password is required')
        return
      }

      // Move to progress phase immediately
      await this.showProgress()

      // Execute secure transaction
      const result = await this.confirmation.executeSecureTransaction(password)
      
      // Show success
      this.progress?.showSuccess(result)
      console.log('✅ Transaction completed successfully:', result.transactionHash)

    } catch (error) {
      console.error('❌ Transaction failed:', error)
      
      if (this.progress) {
        this.progress.showError(error as Error)
      } else {
        this.showError('Transaction failed: ' + (error as Error).message)
      }
    }
  }

  private async showProgress(): Promise<void> {
    // Hide confirmation, show progress
    this.hideStep('confirmationStep')
    this.showStep('progressStep')
    this.currentPhase = 'progress'

    // Update navigation buttons
    this.updateButtonsForProgress()

    // Initialize progress component
    const progressContainer = document.getElementById('progressStep')
    if (!progressContainer) return

    this.progress = new SendProgress(progressContainer, this.backend)
    this.progress.initialize()
  }

  private onBackClicked(): void {
    if (this.currentPhase === 'confirmation') {
      this.showStep('sendFormStep')
      this.hideStep('confirmationStep')
      this.currentPhase = 'form'
      this.updateButtonsForForm()
    }
  }

  // UI Helper methods
  private showStep(stepId: string): void {
    const step = document.getElementById(stepId)
    if (step) {
      step.classList.remove('hidden')
    }
  }

  private hideStep(stepId: string): void {
    const step = document.getElementById(stepId)
    if (step) {
      step.classList.add('hidden')
    }
  }

  private updateButtonsForForm(): void {
    this.hideButton('confirmBtn')
    this.hideButton('backBtn')
    this.showButton('nextBtn')
    this.showButton('cancelBtn')
  }

  private updateButtonsForConfirmation(): void {
    this.hideButton('nextBtn')
    this.showButton('confirmBtn')
    this.showButton('backBtn')
    this.showButton('cancelBtn')
  }

  private updateButtonsForProgress(): void {
    this.hideButton('nextBtn')
    this.hideButton('confirmBtn')
    this.hideButton('backBtn')
    this.showButton('cancelBtn')
    
    // Update cancel button text
    const cancelBtn = document.getElementById('cancelBtn')
    if (cancelBtn) {
      cancelBtn.textContent = 'Close'
    }
  }

  private showButton(buttonId: string): void {
    const button = document.getElementById(buttonId)
    if (button) {
      button.classList.remove('hidden')
    }
  }

  private hideButton(buttonId: string): void {
    const button = document.getElementById(buttonId)
    if (button) {
      button.classList.add('hidden')
    }
  }

  private show(): void {
    const dialog = document.getElementById('sendDialog')
    if (dialog) {
      dialog.classList.remove('hidden')
      dialog.style.display = 'flex'
    }
  }

  private close(): void {
    console.log('🔒 Closing Send dialog')
    
    // Clear any sensitive data from components
    this.confirmation?.clearSensitiveData()
    
    const dialog = document.getElementById('sendDialog')
    if (dialog) {
      dialog.classList.add('hidden')
      dialog.style.display = 'none'
    }

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))

    // Call close callback
    if (this.onCloseCallback) {
      this.onCloseCallback()
    }

    // Clear component references
    this.sendForm = null
    this.confirmation = null
    this.progress = null
    this.transactionData = null
  }

  private showError(message: string): void {
    // Simple error display - could be enhanced with a proper toast system
    alert('Error: ' + message)
  }

  // Public methods for external control
  isOpen(): boolean {
    const dialog = document.getElementById('sendDialog')
    return dialog ? !dialog.classList.contains('hidden') : false
  }
}