/**
 * UnstakeDialog Component - TCY Unstaking Pre-confirmation
 * 
 * Handles the unstake dialog for TCY unstaking with percentage slider before
 * opening the main Send modal with pre-populated data.
 */

import { BackendService } from '../services/BackendService'
import { AssetService } from '../../services/assetService'

export interface UnstakeDialogData {
    stakedTcyBalance: string
    walletAddress: string
    network: 'mainnet' | 'stagenet'
}

export interface UnstakeFormData {
    percentage: number          // 0-100 percentage
    tcyAmount: string          // Calculated TCY amount being unstaked
    basisPoints: number        // Percentage in basis points (0-10000)
}

export interface UnstakeCallback {
    (data: UnstakeFormData): void
}

export class UnstakeDialog {
    private container: HTMLElement
    private backend: BackendService
    private unstakeData: UnstakeDialogData | null = null
    private callback: UnstakeCallback | null = null
    private validationErrors: Map<string, string> = new Map()

    constructor(container: HTMLElement, backend: BackendService) {
        this.container = container
        this.backend = backend
        
        console.log('🔧 UnstakeDialog component created')
    }

    show(unstakeData: UnstakeDialogData, callback: UnstakeCallback): void {
        console.log('🔄 Showing unstake dialog for:', unstakeData)
        
        this.unstakeData = unstakeData
        this.callback = callback
        
        this.render()
        this.setupEventListeners()
        this.setupImageErrorHandling()
        
        // Ensure slider is set to 100% and calculate amounts
        const percentageSlider = document.getElementById('unstakePercentage') as HTMLInputElement
        if (percentageSlider) {
            percentageSlider.value = '100'
        }
        
        // Run initial validation to enable button for default 100% value
        this.calculateUnstakeAmount()
        this.validateForm()
        
        // Show the dialog
        this.container.style.display = 'flex'
    }

    hide(): void {
        console.log('👋 Hiding unstake dialog')
        this.container.style.display = 'none'
        this.unstakeData = null
        this.callback = null
        this.validationErrors.clear()
    }

    private render(): void {
        if (!this.unstakeData) return

        this.container.innerHTML = `
            <div class="tcy-dialog-overlay">
                <div class="tcy-dialog-content tcy-unstake-dialog">
                    <div class="tcy-dialog-header">
                        <h3>📤 Unstake TCY</h3>
                        <button class="tcy-dialog-close-btn" id="unstakeCloseBtn">×</button>
                    </div>

                    <div class="tcy-dialog-body">
                        <div class="tcy-asset-info">
                            <div class="tcy-asset-display">
                                <div class="tcy-asset-logo-section">
                                    ${AssetService.GetLogoWithChain('THOR.TCY', 48)}
                                </div>
                                <div class="tcy-asset-details">
                                    <div class="tcy-asset-name">THOR.TCY</div>
                                    <div class="tcy-asset-balance">Staked: ${this.unstakeData.stakedTcyBalance}</div>
                                </div>
                            </div>
                        </div>

                        <div class="tcy-unstake-form">
                            <!-- Percentage Slider -->
                            <div class="tcy-form-group">
                                <label for="unstakePercentage" class="tcy-form-label">
                                    Percentage to Unstake
                                </label>
                                <div class="tcy-slider-group">
                                    <input type="range" class="tcy-slider" id="unstakePercentage" 
                                           min="0.01" max="100" step="0.01" value="100">
                                    <div class="tcy-slider-labels">
                                        <span class="tcy-slider-label">0%</span>
                                        <span class="tcy-slider-value" id="percentageDisplay">100%</span>
                                        <span class="tcy-slider-label">100%</span>
                                    </div>
                                </div>
                                <div class="tcy-field-error hidden" id="unstakePercentageError"></div>
                            </div>

                            <!-- Amount Display -->
                            <div class="tcy-form-group">
                                <label class="tcy-form-label">Amount to Unstake</label>
                                <div class="tcy-amount-display">
                                    <span class="tcy-amount-value" id="unstakeAmountDisplay">0.00</span>
                                    <span class="tcy-amount-asset">TCY</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tcy-dialog-footer">
                        <button class="tcy-btn tcy-btn-secondary" id="cancelUnstakeBtn">Cancel</button>
                        <button class="tcy-btn tcy-btn-primary" id="confirmUnstakeBtn">
                            Continue to Transaction
                        </button>
                    </div>
                </div>
            </div>
        `
    }

    private setupEventListeners(): void {
        // Close button
        const closeBtn = document.getElementById('unstakeCloseBtn')
        closeBtn?.addEventListener('click', () => this.hide())

        // Cancel button
        const cancelBtn = document.getElementById('cancelUnstakeBtn')
        cancelBtn?.addEventListener('click', () => this.hide())

        // Confirm button
        const confirmBtn = document.getElementById('confirmUnstakeBtn')
        confirmBtn?.addEventListener('click', () => this.handleConfirm())

        // Percentage slider
        const percentageSlider = document.getElementById('unstakePercentage') as HTMLInputElement
        percentageSlider?.addEventListener('input', () => {
            this.calculateUnstakeAmount()
            this.validateForm()
        })
        percentageSlider?.addEventListener('change', () => this.validatePercentage())

        // Close dialog when clicking overlay
        const overlay = document.querySelector('.tcy-dialog-overlay')
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hide()
            }
        })
    }

    private calculateUnstakeAmount(): void {
        if (!this.unstakeData) return

        const percentageSlider = document.getElementById('unstakePercentage') as HTMLInputElement
        const percentageDisplay = document.getElementById('percentageDisplay')
        const unstakeAmountDisplay = document.getElementById('unstakeAmountDisplay')

        if (!percentageSlider || !percentageDisplay || !unstakeAmountDisplay) return

        const percentage = parseFloat(percentageSlider.value)
        const stakedBalance = parseFloat(this.unstakeData.stakedTcyBalance)
        
        // Calculate TCY amount to unstake
        const unstakeAmount = (stakedBalance * percentage) / 100
        
        // Convert percentage to basis points (0.01% = 1 basis point)
        const basisPoints = Math.round(percentage * 100)
        
        // Update display
        percentageDisplay.textContent = `${percentage.toFixed(2)}%`
        unstakeAmountDisplay.textContent = unstakeAmount.toFixed(8)
        
        console.log(`📊 Unstake calculation: ${percentage}% = ${unstakeAmount.toFixed(8)} TCY (${basisPoints} basis points)`)
    }

    private validatePercentage(): boolean {
        const percentageSlider = document.getElementById('unstakePercentage') as HTMLInputElement
        if (!percentageSlider || !this.unstakeData) return false

        const percentage = parseFloat(percentageSlider.value)
        
        if (isNaN(percentage) || percentage < 0.01) {
            this.showFieldError('unstakePercentage', 'Percentage must be at least 0.01%')
            return false
        }

        if (percentage > 100) {
            this.showFieldError('unstakePercentage', 'Percentage cannot exceed 100%')
            return false
        }

        const stakedBalance = parseFloat(this.unstakeData.stakedTcyBalance)
        if (stakedBalance <= 0) {
            this.showFieldError('unstakePercentage', 'No staked TCY balance available')
            return false
        }

        this.hideFieldError('unstakePercentage')
        return true
    }

    private validateForm(): boolean {
        const percentageValid = this.validatePercentage()

        // Update confirm button state
        const confirmBtn = document.getElementById('confirmUnstakeBtn') as HTMLButtonElement
        if (confirmBtn) {
            confirmBtn.disabled = !percentageValid
        }

        return percentageValid
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
        if (!this.validateForm() || !this.unstakeData || !this.callback) {
            return
        }

        const percentageSlider = document.getElementById('unstakePercentage') as HTMLInputElement
        const percentage = parseFloat(percentageSlider.value)
        const stakedBalance = parseFloat(this.unstakeData.stakedTcyBalance)
        
        // Calculate values
        const unstakeAmount = (stakedBalance * percentage) / 100
        const basisPoints = Math.round(percentage * 100)

        const formData: UnstakeFormData = {
            percentage: percentage,
            tcyAmount: unstakeAmount.toFixed(8),
            basisPoints: basisPoints
        }

        console.log('✅ Unstake form confirmed:', formData)
        
        // Call the callback with the form data
        this.callback(formData)
        
        // Hide the dialog
        this.hide()
    }

    private setupImageErrorHandling(): void {
        // Add error handlers to all asset and chain logos in unstake dialog
        const assetLogos = this.container.querySelectorAll('.asset-logo, .chain-logo');
        assetLogos.forEach(img => {
            (img as HTMLImageElement).addEventListener('error', () => {
                AssetService.handleImageError(img as HTMLImageElement);
            });
        });
    }
}