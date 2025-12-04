/**
 * ReceiveTransaction Component - Wallet Address QR Code Display
 * 
 * Simple overlay dialog that displays the wallet's THORChain address
 * with QR code for easy sharing and receiving transactions.
 */

import * as QRCode from 'qrcode'

export interface ReceiveTransactionData {
  walletId: string
  name: string
  address: string
  network: 'mainnet' | 'stagenet'
}

export class ReceiveTransaction {
  private container: HTMLElement
  private walletData: ReceiveTransactionData | null = null
  private onCloseCallback?: () => void

  constructor(container: HTMLElement) {
    this.container = container
    console.log('🔧 ReceiveTransaction component created')
  }

  /**
   * Initialize the Receive dialog with wallet data
   */
  async initialize(walletData: ReceiveTransactionData, onClose?: () => void): Promise<void> {
    try {
      console.log('📨 Initializing Receive dialog for wallet:', walletData.name)
      
      this.walletData = walletData
      this.onCloseCallback = onClose
      
      // Render the dialog structure
      this.render()
      
      // Generate and display QR code
      await this.generateQRCode()
      
      // Show the dialog
      this.show()
      
      console.log('✅ Receive dialog initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Receive dialog:', error)
      throw error
    }
  }

  private render(): void {
    if (!this.walletData) return

    this.container.innerHTML = `
      <div class="receive-popup-overlay" id="receivePopupOverlay">
        <div class="receive-popup">
          <!-- Header -->
          <div class="receive-popup-header">
            <div class="receive-title">
              <h2>📨 Receive ${this.walletData.network === 'stagenet' ? 'Stagenet' : ''} Assets</h2>
              <p>Share this address to receive THORChain assets</p>
            </div>
            <button class="close-btn" id="receiveCloseBtn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <!-- Content -->
          <div class="receive-popup-content">
            <!-- Wallet Info -->
            <div class="wallet-info-section">
              <div class="wallet-name">
                <strong>${this.walletData.name}</strong>
              </div>
              <div class="network-badge ${this.walletData.network}">
                ${this.walletData.network.toUpperCase()}
              </div>
            </div>

            <!-- QR Code Section -->
            <div class="qr-code-section">
              <div class="qr-code-container" id="qrCodeContainer">
                <div class="qr-loading">
                  🔄 Generating QR Code...
                </div>
              </div>
            </div>

            <!-- Address Section -->
            <div class="address-section">
              <div class="address-label">
                <strong>THORChain Address:</strong>
              </div>
              <div class="address-display">
                <div class="address-text" id="addressText">
                  ${this.walletData.address}
                </div>
                <button class="btn btn-secondary copy-address-btn" id="copyAddressBtn" title="Copy Address">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                  </svg>
                  Copy
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    `

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('receiveCloseBtn')
    closeBtn?.addEventListener('click', () => this.close())

    // Copy address button
    const copyBtn = document.getElementById('copyAddressBtn')
    copyBtn?.addEventListener('click', () => this.copyAddress())

    // Escape key to close
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close()
    }
  }

  private async generateQRCode(): Promise<void> {
    try {
      if (!this.walletData) return

      // Generate QR code with thorchain: prefix
      const qrCodeData = `thorchain:${this.walletData.address}`
      console.log('🔄 Generating QR code with data:', qrCodeData)
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeData, {
        errorCorrectionLevel: 'M',
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      })

      // Display QR code
      const qrContainer = document.getElementById('qrCodeContainer')
      if (qrContainer) {
        qrContainer.innerHTML = `
          <img src="${qrCodeDataURL}" alt="QR Code for thorchain:${this.walletData.address}" class="qr-code-image" />
        `
      }

      console.log('✅ QR code generated successfully')
    } catch (error) {
      console.error('❌ Failed to generate QR code:', error)
      
      // Show error state
      const qrContainer = document.getElementById('qrCodeContainer')
      if (qrContainer) {
        qrContainer.innerHTML = `
          <div class="qr-error">
            ❌ Failed to generate QR code
          </div>
        `
      }
    }
  }

  private async copyAddress(): Promise<void> {
    if (!this.walletData) return

    try {
      await navigator.clipboard.writeText(this.walletData.address)
      
      // Show success feedback
      this.showCopySuccess()
      
      console.log('✅ Address copied to clipboard')
    } catch (error) {
      console.error('❌ Failed to copy address:', error)
      this.showCopyError()
    }
  }

  private showCopySuccess(): void {
    const copyBtn = document.getElementById('copyAddressBtn')
    if (copyBtn) {
      const originalText = copyBtn.innerHTML
      copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 12 2 2 4-4"></path>
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
        Copied!
      `
      copyBtn.classList.add('success')
      
      setTimeout(() => {
        copyBtn.innerHTML = originalText
        copyBtn.classList.remove('success')
      }, 2000)
    }
  }

  private showCopyError(): void {
    const copyBtn = document.getElementById('copyAddressBtn')
    if (copyBtn) {
      const originalText = copyBtn.innerHTML
      copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        Failed
      `
      copyBtn.classList.add('error')
      
      setTimeout(() => {
        copyBtn.innerHTML = originalText
        copyBtn.classList.remove('error')
      }, 2000)
    }
  }

  private show(): void {
    const overlay = document.getElementById('receivePopupOverlay')
    if (overlay) {
      overlay.style.display = 'flex'
    }
  }

  private close(): void {
    console.log('🔒 Closing Receive dialog')
    
    // Remove from DOM
    this.container.innerHTML = ''
    
    // Call close callback
    if (this.onCloseCallback) {
      this.onCloseCallback()
    }
    
    // Remove event listener
    document.removeEventListener('keydown', this.handleKeyDown)
  }
}