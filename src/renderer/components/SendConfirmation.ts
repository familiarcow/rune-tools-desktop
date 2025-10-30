/**
 * SendConfirmation Component - Secure Transaction Authorization
 * 
 * Handles transaction confirmation with password prompt and executes secure
 * transaction flow with just-in-time mnemonic decryption and immediate clearing.
 */

import { BackendService } from '../services/BackendService'
import { CryptoUtils } from '../utils/CryptoUtils'
import { PasswordInput } from './PasswordInput'
import { AssetService } from '../../services/assetService'

export interface SendTransactionData {
  walletId: string
  name: string
  currentAddress: string
  network: 'mainnet' | 'stagenet'
  availableBalances: AssetBalance[]
}

export interface AssetBalance {
  asset: string
  balance: string
  usdValue?: string
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

export interface TransactionFee {
  amount: { denom: string; amount: string }[]
  gas: string
}

export interface WalletInfo {
  address: string
  mainnetAddress?: string
  stagenetAddress?: string
  publicKey: string
  mnemonic: string
}

export class SendConfirmation {
  private container: HTMLElement
  private backend: BackendService
  private walletData: SendTransactionData | null = null
  private transactionParams: TransactionParams | null = null
  private estimatedFee: TransactionFee | null = null
  private passwordInput: PasswordInput | null = null

  constructor(container: HTMLElement, backend: BackendService) {
    this.container = container
    this.backend = backend
    
    console.log('🔧 SendConfirmation component created')
  }

  async initialize(walletData: SendTransactionData, params: TransactionParams): Promise<void> {
    try {
      console.log('🔐 Initializing transaction confirmation')
      
      // Initialize asset logo styles
      AssetService.initializeStyles()
      
      this.walletData = walletData
      this.transactionParams = params
      
      // Estimate transaction fee (doesn't require private key)
      await this.estimateFee()
      
      // Render confirmation UI
      this.render()
      
      // Setup image error handling
      this.setupImageErrorHandling()
      
      // Initialize password input component
      this.initializePasswordInput()
      
      // Setup event listeners
      this.setupEventListeners()
      
    } catch (error) {
      console.error('❌ Failed to initialize SendConfirmation:', error)
      throw error
    }
  }

  private setupImageErrorHandling(): void {
    // Add error handlers to all asset and chain logos in send confirmation
    const assetLogos = this.container.querySelectorAll('.asset-logo, .chain-logo');
    assetLogos.forEach(img => {
      (img as HTMLImageElement).addEventListener('error', () => {
        AssetService.handleImageError(img as HTMLImageElement);
      });
    });
  }

  private async estimateFee(): Promise<void> {
    try {
      console.log('💰 Fetching network transaction fee...')
      
      // Get actual network fee from /network endpoint
      const networkInfo = await this.backend.getThorchainNetwork()
      const networkFeeRune = networkInfo?.native_tx_fee_rune || "2000000" // 0.02 RUNE fallback (2M base units)
      
      this.estimatedFee = {
        amount: [{ denom: "rune", amount: networkFeeRune }],
        gas: "50000000"
      }
      
      console.log('✅ Network fee fetched:', networkFeeRune, 'base units RUNE')
      
    } catch (error) {
      console.warn('⚠️ Failed to fetch network fee, using default:', error)
      // Use default fee on error
      this.estimatedFee = {
        amount: [{ denom: "rune", amount: "2000000" }], // 0.02 RUNE fallback (2M base units)
        gas: "50000000"
      }
    }
  }

  private render(): void {
    if (!this.walletData || !this.transactionParams || !this.estimatedFee) return

    const params = this.transactionParams
    const fee = this.estimatedFee

    this.container.innerHTML = `
      <div class="authorize-transaction-content">
        <!-- Page Header -->
        <div class="page-header">
          <h2 class="page-title">Authorize Transaction</h2>
        </div>

        <!-- Password Input Section -->
        <div class="password-section">
          <div id="passwordInputContainer"></div>
        </div>

        <!-- Transaction Details -->
        <div class="transaction-details-section">
          <div class="section-title-collapsible" id="transactionDetailsToggle">
            <h4 class="section-title">Transaction Details</h4>
            <button type="button" class="collapse-toggle" aria-expanded="false" aria-controls="transactionDetailsCard">
              <span class="collapse-icon">▼</span>
            </button>
          </div>
          <div class="transaction-details-card collapsed" id="transactionDetailsCard">
            <div class="detail-row">
              <span class="detail-label">Type:</span>
              <span class="detail-value transaction-type">
                ${params.useMsgDeposit ? 'MsgDeposit' : 'MsgSend'}
              </span>
            </div>
            
            ${params.toAddress ? `
              <div class="detail-row">
                <span class="detail-label">To Address:</span>
                <span class="detail-value address">${this.truncateAddress(params.toAddress)}</span>
              </div>
            ` : ''}
            
            ${params.memo ? `
              <div class="detail-row">
                <span class="detail-label">Memo:</span>
                <span class="detail-value memo">${params.memo}</span>
              </div>
            ` : ''}
            
            <div class="detail-row amount-row">
              <span class="detail-label">Amount:</span>
              <div class="detail-value amount-highlight">
                <span class="amount-text">${params.amount}</span>
                ${AssetService.GetLogoWithChain(params.asset)}
              </div>
            </div>
            
            <div class="detail-row fee-row">
              <span class="detail-label">Network Fee:</span>
              <span class="detail-value fee">
                ${this.formatFee(fee)} RUNE
              </span>
            </div>
            
            <div class="detail-row total-row">
              <span class="detail-label">Total Cost:</span>
              <span class="detail-value total-cost">
                ${this.calculateTotalCost(params, fee)}
              </span>
            </div>
          </div>
        </div>
      </div>
    `
  }

  private initializePasswordInput(): void {
    const passwordContainer = document.getElementById('passwordInputContainer')
    if (!passwordContainer) return

    const walletName = this.walletData?.name || 'Wallet'
    this.passwordInput = new PasswordInput(passwordContainer, {
      id: 'transactionPassword',
      label: `${walletName} Password`,
      placeholder: 'Enter wallet password',
      required: true,
      autocomplete: 'current-password'
    })

    // Listen for password input changes
    this.passwordInput.addEventListener('input', () => {
      this.clearPasswordError()
      this.updateSendButtonState()
    })

    // Listen for Enter key in password field
    passwordContainer.addEventListener('passwordEnter', () => {
      const confirmBtn = document.getElementById('confirmBtn') as HTMLButtonElement
      if (confirmBtn && !confirmBtn.disabled) {
        confirmBtn.click()
      }
    })
  }

  private setupEventListeners(): void {
    // Setup collapsible transaction details
    const detailsToggle = document.getElementById('transactionDetailsToggle')
    const detailsCard = document.getElementById('transactionDetailsCard')
    const collapseToggle = detailsToggle?.querySelector('.collapse-toggle') as HTMLButtonElement
    const collapseIcon = detailsToggle?.querySelector('.collapse-icon') as HTMLSpanElement

    if (detailsToggle && detailsCard && collapseToggle && collapseIcon) {
      const toggleDetails = () => {
        const isExpanded = collapseToggle.getAttribute('aria-expanded') === 'true'
        
        if (isExpanded) {
          // Collapse
          detailsCard.classList.add('collapsed')
          collapseToggle.setAttribute('aria-expanded', 'false')
          collapseIcon.textContent = '▼'
        } else {
          // Expand
          detailsCard.classList.remove('collapsed')
          collapseToggle.setAttribute('aria-expanded', 'true')
          collapseIcon.textContent = '▲'
        }
      }

      detailsToggle.addEventListener('click', toggleDetails)
      collapseToggle.addEventListener('click', (e) => {
        e.stopPropagation()
        toggleDetails()
      })
    }
  }

  private updateSendButtonState(): void {
    const confirmBtn = document.getElementById('confirmBtn') as HTMLButtonElement
    
    if (confirmBtn && this.passwordInput) {
      const hasPassword = this.passwordInput.getValue().trim().length > 0
      confirmBtn.disabled = !hasPassword
      
      if (hasPassword) {
        confirmBtn.classList.remove('btn-disabled')
      } else {
        confirmBtn.classList.add('btn-disabled')
      }
    }
  }

  /**
   * CRITICAL SECURITY METHOD - Executes transaction with just-in-time decryption
   */
  async executeSecureTransaction(password: string): Promise<TransactionResponse> {
    let decryptedMnemonic: string | null = null
    
    try {
      if (!this.walletData || !this.transactionParams) {
        throw new Error('Transaction data not initialized')
      }

      console.log('🔐 Starting secure transaction execution')

      // Step 1: Clear any previous password errors
      this.clearPasswordError()

      // Step 2: Verify password and get encrypted data from main process
      console.log('🔓 Getting encrypted data for mnemonic decryption...')
      console.log('🔐 DEBUG: Calling decryptWalletMnemonic with:', {
        walletId: this.walletData.walletId,
        passwordLength: password.length,
        passwordProvided: password ? 'YES' : 'NO'
      })
      const encryptedData = await this.backend.decryptWalletMnemonic(this.walletData.walletId, password)
      
      // Step 3: Decrypt mnemonic in renderer using CryptoUtils
      console.log('🔓 Decrypting mnemonic using CryptoUtils...', {
        encryptedDataLength: encryptedData.encryptedSeedPhrase.length,
        saltLength: encryptedData.salt.length,
        ivLength: encryptedData.iv.length,
        passwordLength: password.length
      })
      decryptedMnemonic = await CryptoUtils.decryptSensitiveData(
        encryptedData.encryptedSeedPhrase,
        password,
        encryptedData.salt,
        encryptedData.iv
      )
      
      console.log('✅ Mnemonic decrypted successfully, creating temporary wallet')

      // Step 4: Create temporary signing wallet (exists only for transaction)
      const signingWallet: WalletInfo = {
        address: this.walletData.currentAddress,
        mainnetAddress: this.walletData.network === 'mainnet' ? this.walletData.currentAddress : undefined,
        stagenetAddress: this.walletData.network === 'stagenet' ? this.walletData.currentAddress : undefined,
        publicKey: '', // Not needed for CosmJS signing
        mnemonic: decryptedMnemonic
      }

      console.log('📡 Broadcasting transaction to network...')
      console.log('🔐 DEBUG: Transaction params being sent:', {
        asset: this.transactionParams.asset,
        amount: this.transactionParams.amount,
        amountType: typeof this.transactionParams.amount,
        toAddress: this.transactionParams.toAddress,
        memo: this.transactionParams.memo,
        useMsgDeposit: this.transactionParams.useMsgDeposit
      })

      // Step 5: Broadcast transaction using the temporary wallet
      const result = await this.backend.broadcastTransaction(signingWallet, this.transactionParams)

      console.log('✅ Transaction broadcast successful:', result.transactionHash)

      // Step 6: SUCCESS - Clear sensitive data immediately
      this.clearMemoryData(signingWallet.mnemonic)
      decryptedMnemonic = null // Additional safety

      return result

    } catch (error) {
      console.error('❌ Transaction execution failed:', error)
      
      // Step 7: Always clear sensitive data on error
      if (decryptedMnemonic) {
        this.clearMemoryData(decryptedMnemonic)
        decryptedMnemonic = null
      }

      // Handle specific error types
      if ((error as Error).message.includes('Invalid password')) {
        this.showPasswordError('Incorrect password. Please verify your wallet password and try again.')
        
        // Focus password field for retry
        const passwordInput = document.getElementById('transactionPassword') as HTMLInputElement
        if (passwordInput) {
          passwordInput.focus()
          passwordInput.select() // Select all text for easy re-entry
        }
        
        // Don't re-throw, let user retry
        throw new Error('Password verification failed')
      } else {
        // Re-throw for parent component to handle
        throw error
      }
    }
  }

  /**
   * Overwrite sensitive data in memory (best effort)
   */
  private clearMemoryData(data: string): void {
    if (!data) return
    
    try {
      // JavaScript strings are immutable, but we can try to overwrite the reference
      // This is best-effort security - not guaranteed in JavaScript
      console.log('🧹 Clearing sensitive data from memory')
      
      // Create a new string of null chars with same length
      const nullString = '\0'.repeat(data.length)
      
      // This doesn't actually overwrite the original string in memory,
      // but it's the best we can do in JavaScript
      data = nullString
      
    } catch (error) {
      console.warn('⚠️ Could not clear sensitive data:', error)
    }
  }

  // Helper methods for formatting
  private truncateAddress(address: string): string {
    if (address.length <= 20) return address
    return `${address.slice(0, 10)}...${address.slice(-10)}`
  }

  private formatFee(fee: TransactionFee): string {
    if (!fee.amount || fee.amount.length === 0) return '0'
    
    const runeAmount = fee.amount.find(coin => coin.denom === 'rune')
    if (!runeAmount) return fee.amount[0].amount
    
    // Convert from base units to RUNE (1 RUNE = 100,000,000 base units = 1e8)
    const rune = parseFloat(runeAmount.amount) / 100000000
    return rune.toFixed(2)
  }

  private formatGas(gas: string): string {
    const gasNum = parseInt(gas)
    if (gasNum >= 1000000) {
      return (gasNum / 1000000).toFixed(1) + 'M'
    } else if (gasNum >= 1000) {
      return (gasNum / 1000).toFixed(1) + 'K'
    }
    return gasNum.toString()
  }

  private calculateTotalCost(params: TransactionParams, fee: TransactionFee): string {
    try {
      const amount = parseFloat(params.amount)
      const feeAmount = fee.amount.find(coin => coin.denom === 'rune')
      const feeInRune = feeAmount ? parseFloat(feeAmount.amount) / 100000000 : 0 // Fix: use 1e8 like formatFee
      
      // If sending RUNE, add fee to amount
      if (params.asset === 'THOR.RUNE' || params.asset === 'RUNE') {
        const total = amount + feeInRune
        return `${total.toFixed(6)} RUNE`
      } else {
        // Different asset, show separately
        return `${params.amount} ${params.asset} + ${feeInRune.toFixed(2)} RUNE fee`
      }
    } catch (error) {
      return `${params.amount} ${params.asset} + fee`
    }
  }

  private showPasswordError(message: string): void {
    if (this.passwordInput) {
      this.passwordInput.showError(message)
    }
  }

  private clearPasswordError(): void {
    if (this.passwordInput) {
      this.passwordInput.clearError()
    }
  }

  // Public methods
  getPassword(): string {
    const password = this.passwordInput ? this.passwordInput.getValue() : ''
    
    console.log('🔐 DEBUG: Getting password from input:', {
      inputExists: !!this.passwordInput,
      passwordLength: password.length,
      passwordValue: password ? '[REDACTED]' : 'EMPTY'
    })
    
    return password // Remove trim() in case it's causing issues
  }

  public clearSensitiveData(): void {
    // Clear password input
    if (this.passwordInput) {
      this.passwordInput.clear()
    }

    // Clear any cached data
    this.walletData = null
    this.transactionParams = null
    
    console.log('🧹 SendConfirmation sensitive data cleared')
  }

  isPasswordProvided(): boolean {
    const password = this.getPassword()
    const hasPassword = password.length > 0
    
    if (!hasPassword) {
      this.showPasswordError('Password is required to authorize this transaction')
    }
    
    return hasPassword
  }
}