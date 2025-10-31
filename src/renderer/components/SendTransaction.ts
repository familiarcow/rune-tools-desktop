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

export interface SendTransactionCallback {
  onClose?: () => void
  onSuccess?: (result: TransactionResponse) => void
}

export class SendTransaction {
  private container: HTMLElement
  private backend: BackendService
  private transactionData: SendTransactionData | null = null
  
  // SECURITY: Never store mnemonic or sensitive data in component state
  private sendForm: SendForm | null = null
  private confirmation: SendConfirmation | null = null
  private progress: SendProgress | null = null
  
  private currentPage: 1 | 2 | 3 | 4 = 1  // 1=Information, 2=Review, 3=Sending, 4=Details
  private transactionResult: TransactionResponse | null = null
  private callbacks: SendTransactionCallback = {}
  private capturedTransactionParams: TransactionParams | null = null // Capture before navigation
  private prePopulatedData: any = null // Pre-populated form data for withdrawals

  constructor(container: HTMLElement, backend: BackendService) {
    this.container = container
    this.backend = backend
    
    console.log('🔧 SendTransaction component created')
  }

  /**
   * Initialize the Send dialog with wallet data (non-sensitive only)
   */
  async initialize(walletData: SendTransactionData, callbacks?: SendTransactionCallback | (() => void), prePopulatedData?: any): Promise<void> {
    try {
      console.log('💳 Initializing Send dialog for wallet:', walletData.name)
      
      this.transactionData = walletData
      this.prePopulatedData = prePopulatedData || null
      
      // Handle legacy callback format
      if (typeof callbacks === 'function') {
        this.callbacks = { onClose: callbacks }
      } else {
        this.callbacks = callbacks || {}
      }
      
      // Set starting page - go to review page if we have pre-populated data
      if (this.prePopulatedData) {
        console.log('📋 Pre-populated data detected, starting on review page')
        this.currentPage = 2
        // Capture the pre-populated data as transaction params for review
        this.capturedTransactionParams = {
          asset: this.prePopulatedData.asset,
          amount: this.prePopulatedData.amount,
          toAddress: this.prePopulatedData.toAddress,
          memo: this.prePopulatedData.memo,
          useMsgDeposit: this.prePopulatedData.transactionType === 'deposit'
        }
      } else {
        this.currentPage = 1
      }
      
      // Render the dialog structure
      this.render()
      
      // Wait a tick for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Initialize the current page
      await this.initializeCurrentPage()
      
      // Show the dialog
      this.show()
      
    } catch (error) {
      console.error('❌ Failed to initialize Send dialog:', error)
      throw error
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="send-modal-overlay" id="sendPopupOverlay">
        <div class="send-modal-container">
          <!-- Header with progress indicators -->
          <div class="send-modal-header">
            <div class="send-modal-progress-steps">
              <div class="send-modal-step ${this.currentPage >= 1 ? 'active' : ''}" data-step="1">
                <div class="send-modal-step-number">1</div>
                <div class="send-modal-step-label">Information</div>
              </div>
              <div class="send-modal-step ${this.currentPage >= 2 ? 'active' : ''}" data-step="2">
                <div class="send-modal-step-number">2</div>
                <div class="send-modal-step-label">Authorize</div>
              </div>
              <div class="send-modal-step ${this.currentPage >= 3 ? 'active' : ''}" data-step="3">
                <div class="send-modal-step-number">3</div>
                <div class="send-modal-step-label">Sending</div>
              </div>
              <div class="send-modal-step ${this.currentPage >= 4 ? 'active' : ''}" data-step="4">
                <div class="send-modal-step-number">4</div>
                <div class="send-modal-step-label">Complete</div>
              </div>
            </div>
            <button class="send-modal-close-btn" id="closeBtn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <!-- Page Content -->
          <div class="send-modal-content">
            <!-- Page 1: Information -->
            <div class="send-modal-page ${this.currentPage === 1 ? 'active' : ''}" id="sendPageInformation">
              <div class="send-modal-page-title">
                <h2>
                  <span class="send-modal-page-icon">📤</span>
                  Send Transaction
                </h2>
                <p class="send-modal-page-subtitle">Enter transaction details</p>
              </div>
              <div id="sendFormContainer"></div>
            </div>
            
            <!-- Page 2: Authorize -->
            <div class="send-modal-page ${this.currentPage === 2 ? 'active' : ''}" id="sendPageReview">
              <div id="sendConfirmationContainer"></div>
            </div>
            
            <!-- Page 3: Sending -->
            <div class="send-modal-page ${this.currentPage === 3 ? 'active' : ''}" id="sendPageSending">
              <div id="sendProgressContainer"></div>
            </div>
            
            <!-- Page 4: Details -->
            <div class="send-modal-page ${this.currentPage === 4 ? 'active' : ''}" id="sendPageDetails">
              <div id="sendDetailsContainer"></div>
            </div>
          </div>
          
          <!-- Footer Actions -->
          <div class="send-modal-actions">
            ${this.currentPage === 4 ? `
              <!-- Page 4: Complete - Done button on right -->
              <div class="send-modal-spacer"></div>
              <div class="send-modal-actions-right">
                <button class="send-modal-btn send-modal-btn-primary" id="doneBtn">
                  <span class="send-modal-btn-icon">✓</span>
                  Done
                </button>
              </div>
            ` : `
              <!-- Other pages - normal layout -->
              <div class="send-modal-actions-left">
                <button class="send-modal-btn send-modal-btn-secondary" id="backBtn" ${this.currentPage <= 1 ? 'style="display: none;"' : ''}>
                  <span class="send-modal-btn-icon">←</span>
                  Back
                </button>
                <button class="send-modal-btn send-modal-btn-secondary" id="cancelBtn">
                  <span class="send-modal-btn-icon">×</span>
                  Cancel
                </button>
              </div>
              <div class="send-modal-actions-right">
                <button class="send-modal-btn send-modal-btn-primary" id="nextBtn" ${this.currentPage >= 2 ? 'style="display: none;"' : ''}>
                  Continue
                  <span class="send-modal-btn-icon">→</span>
                </button>
                <button class="send-modal-btn send-modal-btn-primary" id="confirmBtn" ${this.currentPage !== 2 ? 'style="display: none;"' : ''} disabled>
                  <span class="send-modal-btn-icon">📤</span>
                  Send Transaction
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    `

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('closeBtn')
    const cancelBtn = document.getElementById('cancelBtn')
    
    closeBtn?.addEventListener('click', () => this.close())
    cancelBtn?.addEventListener('click', () => this.close())

    // Navigation buttons
    const nextBtn = document.getElementById('nextBtn')
    const confirmBtn = document.getElementById('confirmBtn')
    const backBtn = document.getElementById('backBtn')
    const doneBtn = document.getElementById('doneBtn')

    nextBtn?.addEventListener('click', () => this.onNextClicked())
    confirmBtn?.addEventListener('click', () => this.onConfirmClicked())
    backBtn?.addEventListener('click', () => this.onBackClicked())
    doneBtn?.addEventListener('click', () => this.close())

    // Escape key to close (only if not in sending phase)
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.currentPage !== 3) {
      // Don't allow closing during sending phase
      this.close()
    }
  }

  private navigateToPage(page: 1 | 2 | 3 | 4): void {
    console.log(`📱 Navigating to page ${page}`)
    this.currentPage = page
    this.render() // Re-render with updated page state
    
    // Ensure modal is shown with active class after re-render
    this.show()
    
    // Initialize components for the new page
    this.initializeCurrentPage()
  }

  private async initializeCurrentPage(): Promise<void> {
    switch (this.currentPage) {
      case 1:
        await this.initializeInformationPage()
        break
      case 2:
        await this.initializeReviewPage()
        break
      case 3:
        await this.initializeSendingPage()
        break
      case 4:
        await this.initializeDetailsPage()
        break
    }
  }

  private onBackClicked(): void {
    if (this.currentPage > 1 && this.currentPage !== 3) {
      // Don't allow going back during sending
      this.navigateToPage((this.currentPage - 1) as 1 | 2 | 3 | 4)
    }
  }

  // Page-specific initialization methods
  private async initializeInformationPage(): Promise<void> {
    console.log('🔧 Initializing Information page...')
    if (!this.transactionData) {
      console.error('❌ No transaction data available')
      return
    }

    const formContainer = document.getElementById('sendFormContainer')
    console.log('🔧 Form container found:', !!formContainer)
    if (!formContainer) {
      console.error('❌ sendFormContainer not found in DOM')
      return
    }

    console.log('🔧 Creating SendForm component...')
    this.sendForm = new SendForm(formContainer, this.backend)
    await this.sendForm.initialize(this.transactionData.availableBalances, this.prePopulatedData)
    console.log('✅ SendForm initialized successfully')
  }

  private async initializeReviewPage(): Promise<void> {
    if (!this.transactionData || !this.capturedTransactionParams) {
      console.error('❌ Missing transaction data or captured params for review page')
      return
    }

    const confirmationContainer = document.getElementById('sendConfirmationContainer')
    if (!confirmationContainer) return

    // Use captured transaction params (form DOM was destroyed during navigation)
    console.log('🔐 DEBUG: Using captured transaction params:', this.capturedTransactionParams)

    this.confirmation = new SendConfirmation(confirmationContainer, this.backend)
    await this.confirmation.initialize(this.transactionData, this.capturedTransactionParams)
  }

  private async initializeSendingPage(): Promise<void> {
    const progressContainer = document.getElementById('sendProgressContainer')
    if (!progressContainer) return

    this.progress = new SendProgress(progressContainer, this.backend)
    await this.progress.initialize()
    
    // Transaction execution now happens in onConfirmClicked()
    // This page just shows progress
    console.log('📊 Sending page initialized - ready to show progress')
  }

  private truncateHash(hash: string): string {
    if (hash.length <= 12) return hash
    // Show first 6 characters + "..." + last 4 characters
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`
  }

  private async initializeDetailsPage(): Promise<void> {
    const detailsContainer = document.getElementById('sendDetailsContainer')
    if (!detailsContainer || !this.transactionResult) return

    // Create transaction details view
    detailsContainer.innerHTML = `
      <div class="send-modal-success">
        <div class="send-modal-success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="m9 12 2 2 4-4"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        </div>
        
        <h3>Transaction Successful!</h3>
        
        <div class="send-modal-transaction-info">
          <div class="send-modal-info-row">
            <span class="send-modal-info-label">Transaction Hash:</span>
            <div class="send-modal-hash-container">
              <code class="send-modal-transaction-hash">${this.truncateHash(this.transactionResult.transactionHash)}</code>
              <button class="send-modal-copy-btn" onclick="navigator.clipboard.writeText('${this.transactionResult.transactionHash}')" title="Copy full hash">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                </svg>
              </button>
              <button class="send-modal-explorer-btn" onclick="window.open('https://thorchain.net/tx/${this.transactionResult.transactionHash}', '_blank')" title="View on Explorer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15,3 21,3 21,9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="send-modal-info-row">
            <span class="send-modal-info-label">Status:</span>
            <span class="send-modal-status-success">Confirmed</span>
          </div>
          
          <div class="send-modal-info-row">
            <span class="send-modal-info-label">Network:</span>
            <span class="send-modal-info-value">${this.transactionData?.network || 'mainnet'}</span>
          </div>
        </div>
        
      </div>
    `
  }

  private async onNextClicked(): Promise<void> {
    try {
      if (this.currentPage === 1) {
        // Validate form before proceeding
        if (!this.sendForm || !this.transactionData) return

        const formData = this.sendForm.getFormData()
        if (!this.validateFormData(formData)) {
          return // Validation errors shown by form
        }

        // CRITICAL: Capture transaction params BEFORE navigation destroys form DOM
        this.capturedTransactionParams = {
          asset: formData.asset,
          amount: formData.amount,
          toAddress: formData.toAddress,
          memo: formData.memo,
          useMsgDeposit: formData.transactionType === 'deposit'
        }

        console.log('📝 Form completed, transaction params captured:', this.capturedTransactionParams)
        console.log('📝 Moving to review page')
        this.navigateToPage(2)
      }
    } catch (error) {
      console.error('❌ Error in next navigation:', error)
    }
  }

  private async onConfirmClicked(): Promise<void> {
    try {
      if (this.currentPage === 2) {
        // Validate password is provided before proceeding
        if (!this.confirmation) {
          console.error('❌ No confirmation component available')
          return
        }
        
        if (!this.confirmation.isPasswordProvided()) {
          console.warn('⚠️ Password required for transaction')
          // Focus password field - the form will show validation error
          const passwordInput = document.getElementById('transactionPassword') as HTMLInputElement
          passwordInput?.focus()
          return
        }
        
        console.log('🔐 Executing transaction on Review page...')
        
        // Execute transaction immediately on current page
        const password = this.confirmation.getPassword()
        
        // Navigate to Sending page first to show progress
        this.navigateToPage(3)
        
        try {
          // Execute the transaction
          const result = await this.confirmation.executeSecureTransaction(password)
          this.transactionResult = result
          
          // Call success callback if provided
          if (this.callbacks.onSuccess) {
            this.callbacks.onSuccess(result)
          }
          
          // Move to details page when complete
          this.navigateToPage(4)
        } catch (error) {
          console.error('❌ Transaction execution failed:', error)
          
          // Handle password verification failures
          if ((error as Error).message.includes('Password verification failed')) {
            console.log('🔙 Password failed, returning to review page for retry')
            // Go back to review page to allow password retry
            this.navigateToPage(2)
          } else {
            // Show error toast and close dialog for transaction errors
            const errorMessage = this.extractUserFriendlyError((error as Error).message)
            this.showErrorToast(errorMessage)
            console.error('❌ Transaction failed, closing dialog:', errorMessage)
            
            // Close the Send dialog after showing error
            setTimeout(() => this.close(), 3000) // Close after 3 seconds
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in confirmation:', error)
    }
  }

  private validateFormData(formData: TransactionFormData): boolean {
    // Basic validation - detailed validation in SendForm
    if (!formData.asset || !formData.amount) {
      return false
    }

    if (formData.transactionType === 'send' && !formData.toAddress) {
      return false
    }

    const amountNum = parseFloat(formData.amount)
    if (amountNum <= 0) {
      return false
    }

    return true
  }

  private show(): void {
    const overlay = document.getElementById('sendPopupOverlay')
    if (overlay) {
      // If already displayed, just ensure active class is present
      if (overlay.style.display === 'flex') {
        overlay.classList.add('active')
      } else {
        overlay.style.display = 'flex'
        // Add active class for CSS animation after display is set
        setTimeout(() => overlay.classList.add('active'), 10)
      }
    }
  }

  private extractUserFriendlyError(errorMessage: string): string {
    // Extract user-friendly error messages from backend errors
    if (errorMessage.includes('insufficient funds')) {
      const match = errorMessage.match(/spendable balance ([^)]+) is smaller than ([^)]+): insufficient funds/)
      if (match) {
        return `Insufficient balance. Available: ${match[1]}, Required: ${match[2]}`
      }
      return 'Insufficient funds for this transaction'
    }
    
    if (errorMessage.includes('failed to execute message')) {
      const match = errorMessage.match(/failed to execute message[^:]*: (.+)/)
      if (match) {
        return match[1]
      }
    }
    
    if (errorMessage.includes('Transaction failed')) {
      return errorMessage.replace('Error: Error invoking remote method \'broadcast-transaction\': Error: Transaction failed: ', '')
    }
    
    // Default fallback
    return errorMessage.length > 100 ? 'Transaction failed due to an error' : errorMessage
  }

  private showErrorToast(message: string): void {
    // Create toast notification
    const toast = document.createElement('div')
    toast.className = 'error-toast'
    toast.innerHTML = `
      <div class="toast-icon">❌</div>
      <div class="toast-message">${message}</div>
    `
    
    // Add to body
    document.body.appendChild(toast)
    
    // Show with animation
    setTimeout(() => toast.classList.add('show'), 100)
    
    // Remove after 5 seconds
    setTimeout(() => {
      toast.classList.remove('show')
      setTimeout(() => document.body.removeChild(toast), 300)
    }, 5000)
  }

  private close(): void {
    console.log('🔒 Closing Send dialog')
    
    // Clear captured transaction params
    this.capturedTransactionParams = null
    
    // Clear sensitive data
    if (this.confirmation) {
      // SendConfirmation will handle its own cleanup
    }
    
    // Remove from DOM
    this.container.innerHTML = ''
    
    // Call close callback
    if (this.callbacks.onClose) {
      this.callbacks.onClose()
    }
    
    // Remove event listener
    document.removeEventListener('keydown', this.handleKeyDown)
  }
}