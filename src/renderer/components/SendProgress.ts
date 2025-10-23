/**
 * SendProgress Component - Transaction Progress Tracking
 * 
 * Handles the display of transaction progress, showing signing, broadcasting,
 * and confirmation states with real-time status updates.
 */

import { BackendService } from '../services/BackendService'

export interface TransactionResponse {
  code: number
  transactionHash: string
  rawLog: string
  events: any[]
}

interface ProgressStep {
  id: string
  title: string
  status: 'pending' | 'active' | 'completed' | 'error'
  description?: string
}

export class SendProgress {
  private container: HTMLElement
  private backend: BackendService
  private steps: ProgressStep[] = []
  private currentHash: string = ''
  private isTracking: boolean = false

  constructor(container: HTMLElement, backend: BackendService) {
    this.container = container
    this.backend = backend
    
    console.log('🔧 SendProgress component created')
  }

  initialize(): void {
    console.log('📊 Initializing transaction progress tracking')
    
    // Initialize progress steps
    this.initializeSteps()
    
    // Render progress UI
    this.render()
    
    // Start with signing step active
    this.setStepActive('signing')
  }

  private initializeSteps(): void {
    this.steps = [
      {
        id: 'signing',
        title: 'Signing Transaction',
        status: 'pending',
        description: 'Securely signing transaction with your private key...'
      },
      {
        id: 'broadcasting',
        title: 'Broadcasting to Network',
        status: 'pending',
        description: 'Submitting transaction to THORChain network...'
      },
      {
        id: 'confirming',
        title: 'Confirming Transaction',
        status: 'pending',
        description: 'Waiting for network confirmation...'
      }
    ]
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="send-progress-content">
        <!-- Progress Header -->
        <div class="progress-header">
          <div class="progress-icon">
            <div class="spinner" id="progressSpinner"></div>
            <div class="success-icon hidden" id="successIcon">✅</div>
            <div class="error-icon hidden" id="errorIcon">❌</div>
          </div>
          <h4 class="progress-title" id="progressTitle">Processing Transaction</h4>
          <p class="progress-subtitle" id="progressSubtitle">Please wait while we process your transaction...</p>
        </div>

        <!-- Progress Steps -->
        <div class="progress-steps">
          ${this.steps.map(step => this.renderStep(step)).join('')}
        </div>

        <!-- Transaction Hash -->
        <div class="transaction-hash-section hidden" id="hashSection">
          <div class="hash-label">Transaction Hash:</div>
          <div class="hash-value" id="transactionHash">
            <span class="hash-text" id="hashText"></span>
            <button class="copy-btn" id="copyHashBtn" title="Copy hash">📋</button>
          </div>
          <div class="hash-links" id="hashLinks">
            <!-- Explorer links will be added dynamically -->
          </div>
        </div>

        <!-- Progress Messages -->
        <div class="progress-messages" id="progressMessages">
          <!-- Dynamic messages will be added here -->
        </div>

        <!-- Final Status -->
        <div class="final-status hidden" id="finalStatus">
          <!-- Success/Error message will be shown here -->
        </div>
      </div>
    `

    this.setupEventListeners()
  }

  private renderStep(step: ProgressStep): string {
    const statusClass = step.status
    const statusIcon = this.getStepStatusIcon(step.status)
    
    return `
      <div class="progress-step ${statusClass}" id="step-${step.id}">
        <div class="step-icon">${statusIcon}</div>
        <div class="step-content">
          <div class="step-title">${step.title}</div>
          <div class="step-description">${step.description || ''}</div>
        </div>
      </div>
    `
  }

  private getStepStatusIcon(status: string): string {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'active':
        return '🔄'
      case 'completed':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '⏳'
    }
  }

  private setupEventListeners(): void {
    // Copy hash button
    const copyBtn = document.getElementById('copyHashBtn')
    copyBtn?.addEventListener('click', () => this.copyHashToClipboard())
  }

  // Progress control methods
  private setStepActive(stepId: string): void {
    const step = this.steps.find(s => s.id === stepId)
    if (!step) return

    // Set step as active
    step.status = 'active'
    this.updateStepDisplay(stepId)
    
    console.log(`📊 Step ${stepId} is now active`)
  }

  private setStepCompleted(stepId: string): void {
    const step = this.steps.find(s => s.id === stepId)
    if (!step) return

    // Set step as completed
    step.status = 'completed'
    this.updateStepDisplay(stepId)
    
    console.log(`✅ Step ${stepId} completed`)
  }

  private setStepError(stepId: string, errorMessage?: string): void {
    const step = this.steps.find(s => s.id === stepId)
    if (!step) return

    // Set step as error
    step.status = 'error'
    if (errorMessage) {
      step.description = errorMessage
    }
    this.updateStepDisplay(stepId)
    
    console.log(`❌ Step ${stepId} failed:`, errorMessage)
  }

  private updateStepDisplay(stepId: string): void {
    const step = this.steps.find(s => s.id === stepId)
    if (!step) return

    const stepEl = document.getElementById(`step-${stepId}`)
    if (!stepEl) return

    // Update step class
    stepEl.className = `progress-step ${step.status}`

    // Update step icon
    const iconEl = stepEl.querySelector('.step-icon')
    if (iconEl) {
      iconEl.textContent = this.getStepStatusIcon(step.status)
    }

    // Update step description
    const descEl = stepEl.querySelector('.step-description')
    if (descEl && step.description) {
      descEl.textContent = step.description
    }
  }

  private addProgressMessage(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const messagesContainer = document.getElementById('progressMessages')
    if (!messagesContainer) return

    const messageEl = document.createElement('div')
    messageEl.className = `progress-message ${type}`
    messageEl.innerHTML = `
      <span class="message-time">${new Date().toLocaleTimeString()}</span>
      <span class="message-text">${message}</span>
    `
    
    messagesContainer.appendChild(messageEl)
    
    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  private showTransactionHash(hash: string): void {
    this.currentHash = hash
    
    const hashSection = document.getElementById('hashSection')
    const hashText = document.getElementById('hashText')
    const hashLinks = document.getElementById('hashLinks')
    
    if (hashSection && hashText) {
      hashText.textContent = hash
      hashSection.classList.remove('hidden')
    }

    // Add explorer links
    if (hashLinks) {
      hashLinks.innerHTML = this.generateExplorerLinks(hash)
    }

    this.addProgressMessage(`Transaction hash: ${hash}`, 'info')
  }

  private generateExplorerLinks(hash: string): string {
    // Note: These would be the actual explorer URLs for THORChain
    const explorerUrls = [
      {
        name: 'THORChain Explorer',
        url: `https://thorchain.net/tx/${hash}`
      },
      {
        name: 'ViewBlock',
        url: `https://viewblock.io/thorchain/tx/${hash}`
      }
    ]

    return explorerUrls.map(explorer => 
      `<a href="${explorer.url}" target="_blank" class="explorer-link">${explorer.name} ↗</a>`
    ).join('')
  }

  private copyHashToClipboard(): void {
    if (!this.currentHash) return

    navigator.clipboard.writeText(this.currentHash).then(() => {
      const copyBtn = document.getElementById('copyHashBtn')
      if (copyBtn) {
        const originalText = copyBtn.textContent
        copyBtn.textContent = '✓'
        setTimeout(() => {
          copyBtn.textContent = originalText
        }, 1000)
      }
      
      this.addProgressMessage('Transaction hash copied to clipboard', 'success')
    }).catch(() => {
      this.addProgressMessage('Failed to copy hash to clipboard', 'error')
    })
  }

  // Public methods for external control
  async showSuccess(result: TransactionResponse): Promise<void> {
    console.log('🎉 Transaction successful, updating progress')
    
    // Complete all steps
    this.setStepCompleted('signing')
    this.setStepCompleted('broadcasting')
    this.setStepCompleted('confirming')

    // Show transaction hash
    this.showTransactionHash(result.transactionHash)

    // Update header to success state
    this.showFinalSuccess(result)

    // Start transaction tracking
    this.startTransactionTracking(result.transactionHash)
  }

  showError(error: Error): void {
    console.log('💥 Transaction failed, updating progress')
    
    // Determine which step failed
    const errorMessage = error.message.toLowerCase()
    
    if (errorMessage.includes('password') || errorMessage.includes('decrypt')) {
      this.setStepError('signing', 'Failed to decrypt wallet or invalid password')
    } else if (errorMessage.includes('broadcast') || errorMessage.includes('network')) {
      this.setStepCompleted('signing')
      this.setStepError('broadcasting', 'Failed to broadcast transaction to network')
    } else {
      this.setStepError('signing', error.message)
    }

    // Update header to error state
    this.showFinalError(error)
  }

  private showFinalSuccess(result: TransactionResponse): void {
    const spinner = document.getElementById('progressSpinner')
    const successIcon = document.getElementById('successIcon')
    const title = document.getElementById('progressTitle')
    const subtitle = document.getElementById('progressSubtitle')

    if (spinner) spinner.classList.add('hidden')
    if (successIcon) successIcon.classList.remove('hidden')
    
    if (title) title.textContent = 'Transaction Successful!'
    if (subtitle) subtitle.textContent = 'Your transaction has been broadcast to the network.'

    this.addProgressMessage('Transaction completed successfully!', 'success')
  }

  private showFinalError(error: Error): void {
    const spinner = document.getElementById('progressSpinner')
    const errorIcon = document.getElementById('errorIcon')
    const title = document.getElementById('progressTitle')
    const subtitle = document.getElementById('progressSubtitle')

    if (spinner) spinner.classList.add('hidden')
    if (errorIcon) errorIcon.classList.remove('hidden')
    
    if (title) title.textContent = 'Transaction Failed'
    if (subtitle) subtitle.textContent = error.message

    this.addProgressMessage(`Transaction failed: ${error.message}`, 'error')
  }

  private async startTransactionTracking(hash: string): Promise<void> {
    if (this.isTracking) return

    this.isTracking = true
    console.log('👀 Starting transaction tracking for:', hash)

    try {
      // Start polling for transaction status
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.backend.getTransactionStatus(hash)
          
          if (!status) {
            // No status yet, continue polling
            return
          }
          
          if (status.code === 0) {
            // Transaction confirmed
            clearInterval(pollInterval)
            this.isTracking = false
            
            this.addProgressMessage('Transaction confirmed on network!', 'success')
            console.log('✅ Transaction confirmed:', hash)
            
          } else if (status.code !== 0) {
            // Transaction failed
            clearInterval(pollInterval)
            this.isTracking = false
            
            const errorMsg = status.rawLog || status.message || 'Unknown error'
            this.addProgressMessage(`Transaction failed: ${errorMsg}`, 'error')
            console.log('❌ Transaction failed on network:', errorMsg)
          }
          
        } catch (error) {
          console.warn('⚠️ Error polling transaction status:', error)
          // Continue polling unless it's been too long
        }
      }, 5000) // Poll every 5 seconds

      // Stop polling after 5 minutes
      setTimeout(() => {
        if (this.isTracking) {
          clearInterval(pollInterval)
          this.isTracking = false
          this.addProgressMessage('Stopped tracking transaction (timeout)', 'info')
        }
      }, 300000)

    } catch (error) {
      console.error('❌ Failed to start transaction tracking:', error)
      this.isTracking = false
    }
  }

  // Clean up
  destroy(): void {
    this.isTracking = false
    this.currentHash = ''
    
    console.log('🧹 SendProgress component destroyed')
  }
}