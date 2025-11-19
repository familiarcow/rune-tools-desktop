/**
 * StakeDialog Component - TCY Staking Pre-confirmation
 * 
 * Handles the stake dialog for TCY staking before
 * opening the main Send modal with pre-populated data.
 */

import { BackendService } from '../services/BackendService'
import { AssetService } from '../../services/assetService'

export interface StakeDialogData {
    unstakedTcyBalance: string
    walletAddress: string
    network: 'mainnet' | 'stagenet'
}

export interface StakeFormData {
    amount: string
}

export interface StakeCallback {
    (data: StakeFormData): void
}

export class StakeDialog {
    private container: HTMLElement
    private backend: BackendService
    private stakeData: StakeDialogData | null = null
    private callback: StakeCallback | null = null
    private validationErrors: Map<string, string> = new Map()

    constructor(container: HTMLElement, backend: BackendService) {
        this.container = container
        this.backend = backend
        
        console.log('🔧 StakeDialog component created')
    }

    show(stakeData: StakeDialogData, callback: StakeCallback): void {
        console.log('🔄 Showing stake dialog for:', stakeData)
        
        this.stakeData = stakeData
        this.callback = callback
        
        this.render()
        this.setupEventListeners()
        this.setupImageErrorHandling()
        
        // Show the dialog
        this.container.style.display = 'flex'
    }

    hide(): void {
        console.log('👋 Hiding stake dialog')
        this.container.style.display = 'none'
        this.stakeData = null
        this.callback = null
        this.validationErrors.clear()
    }

    private render(): void {
        if (!this.stakeData) return

        this.container.innerHTML = `
            <div class="tcy-dialog-overlay">
                <div class="tcy-dialog-content tcy-stake-dialog">
                    <div class="tcy-dialog-header">
                        <h3>🏦 Stake TCY</h3>
                        <button class="tcy-dialog-close-btn" id="stakeCloseBtn">×</button>
                    </div>

                    <div class="tcy-dialog-body">
                        <div class="tcy-asset-info">
                            <div class="tcy-asset-display">
                                <div class="tcy-asset-logo-section">
                                    ${AssetService.GetLogoWithChain('THOR.TCY', 48)}
                                </div>
                                <div class="tcy-asset-details">
                                    <div class="tcy-asset-name">THOR.TCY</div>
                                    <div class="tcy-asset-balance">Available: ${this.stakeData.unstakedTcyBalance}</div>
                                </div>
                            </div>
                        </div>

                        <div class="tcy-stake-form">
                            <!-- Amount -->
                            <div class="tcy-form-group">
                                <label for="stakeAmount" class="tcy-form-label">
                                    Amount to Stake *
                                </label>
                                <div class="tcy-amount-input-group">
                                    <input type="text" class="tcy-form-control" id="stakeAmount" 
                                           placeholder="0.00">
                                    <button class="tcy-btn tcy-btn-text" id="maxStakeAmountBtn">Max</button>
                                </div>
                                <div class="tcy-field-error hidden" id="stakeAmountError"></div>
                            </div>

                            <!-- Transaction Preview -->
                            <div class="tcy-transaction-preview">
                                <h4 class="tcy-preview-title">Transaction Preview</h4>
                                <div class="tcy-preview-details">
                                    <div class="tcy-preview-row">
                                        <span class="tcy-preview-label">Asset:</span>
                                        <span class="tcy-preview-value">THOR.TCY</span>
                                    </div>
                                    <div class="tcy-preview-row">
                                        <span class="tcy-preview-label">Amount:</span>
                                        <span class="tcy-preview-value" id="previewAmount">0.00</span>
                                    </div>
                                    <div class="tcy-preview-row">
                                        <span class="tcy-preview-label">Memo:</span>
                                        <span class="tcy-preview-value">TCY+</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tcy-dialog-footer">
                        <button class="tcy-btn tcy-btn-secondary" id="cancelStakeBtn">Cancel</button>
                        <button class="tcy-btn tcy-btn-primary" id="confirmStakeBtn" disabled>
                            Continue to Transaction
                        </button>
                    </div>
                </div>
            </div>
        `
    }

    private setupEventListeners(): void {
        // Close button
        const closeBtn = document.getElementById('stakeCloseBtn')
        closeBtn?.addEventListener('click', () => this.hide())

        // Cancel button
        const cancelBtn = document.getElementById('cancelStakeBtn')
        cancelBtn?.addEventListener('click', () => this.hide())

        // Confirm button
        const confirmBtn = document.getElementById('confirmStakeBtn')
        confirmBtn?.addEventListener('click', () => this.handleConfirm())

        // Max amount button
        const maxBtn = document.getElementById('maxStakeAmountBtn')
        maxBtn?.addEventListener('click', () => this.setMaxAmount())

        // Amount input
        const amountInput = document.getElementById('stakeAmount') as HTMLInputElement
        amountInput?.addEventListener('input', () => {
            this.validateForm()
            this.updatePreview()
        })
        amountInput?.addEventListener('blur', () => this.validateAmount())

        // Close dialog when clicking overlay
        const overlay = document.querySelector('.tcy-dialog-overlay')
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hide()
            }
        })
    }

    private setMaxAmount(): void {
        if (!this.stakeData) return
        
        const amountInput = document.getElementById('stakeAmount') as HTMLInputElement
        if (amountInput) {
            amountInput.value = this.stakeData.unstakedTcyBalance
            this.validateForm()
            this.updatePreview()
        }
    }

    private validateAmount(): boolean {
        const amountInput = document.getElementById('stakeAmount') as HTMLInputElement
        if (!amountInput || !this.stakeData) return false

        const amount = amountInput.value.trim()
        
        if (!amount) {
            this.showFieldError('stakeAmount', 'Amount is required')
            return false
        }

        const numericAmount = parseFloat(amount)
        if (isNaN(numericAmount) || numericAmount <= 0) {
            this.showFieldError('stakeAmount', 'Amount must be a positive number')
            return false
        }

        const maxBalance = parseFloat(this.stakeData.unstakedTcyBalance)
        if (numericAmount > maxBalance) {
            this.showFieldError('stakeAmount', 'Amount exceeds available balance')
            return false
        }

        this.hideFieldError('stakeAmount')
        return true
    }

    private validateForm(): boolean {
        const amountValid = this.validateAmount()

        // Update confirm button state
        const confirmBtn = document.getElementById('confirmStakeBtn') as HTMLButtonElement
        if (confirmBtn) {
            confirmBtn.disabled = !amountValid
        }

        return amountValid
    }

    private updatePreview(): void {
        const amountInput = document.getElementById('stakeAmount') as HTMLInputElement
        const previewAmount = document.getElementById('previewAmount')
        
        if (amountInput && previewAmount) {
            const amount = amountInput.value.trim() || '0.00'
            previewAmount.textContent = amount
        }
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
        if (!this.validateForm() || !this.stakeData || !this.callback) {
            return
        }

        const amountInput = document.getElementById('stakeAmount') as HTMLInputElement

        const formData: StakeFormData = {
            amount: amountInput.value.trim()
        }

        console.log('✅ Stake form confirmed:', formData)
        
        // Call the callback with the form data
        this.callback(formData)
        
        // Hide the dialog
        this.hide()
    }

    private setupImageErrorHandling(): void {
        // Add error handlers to all asset and chain logos in stake dialog
        const assetLogos = this.container.querySelectorAll('.asset-logo, .chain-logo');
        assetLogos.forEach(img => {
            (img as HTMLImageElement).addEventListener('error', () => {
                AssetService.handleImageError(img as HTMLImageElement);
            });
        });
    }
}