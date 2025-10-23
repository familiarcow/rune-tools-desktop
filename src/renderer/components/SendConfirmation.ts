/**
 * SendConfirmation Component - Secure Transaction Authorization
 * 
 * Handles transaction confirmation with password prompt and executes secure
 * transaction flow with just-in-time mnemonic decryption and immediate clearing.
 */

import { BackendService } from '../services/BackendService'
import { CryptoUtils } from '../utils/CryptoUtils'

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

  constructor(container: HTMLElement, backend: BackendService) {
    this.container = container
    this.backend = backend
    
    console.log('🔧 SendConfirmation component created')
  }

  async initialize(walletData: SendTransactionData, params: TransactionParams): Promise<void> {
    try {
      console.log('🔐 Initializing transaction confirmation')
      
      this.walletData = walletData
      this.transactionParams = params
      
      // Estimate transaction fee (doesn't require private key)
      await this.estimateFee()
      
      // Render confirmation UI
      this.render()
      
      // Setup event listeners
      this.setupEventListeners()
      
    } catch (error) {
      console.error('❌ Failed to initialize SendConfirmation:', error)
      throw error
    }
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
      <div class="send-confirmation-content">
        <!-- Password Input (moved to top) -->
        <div class="confirmation-section">
          <h4 class="section-title">Authorize Transaction</h4>
          <div class="password-input-group">
            <label class="form-label" for="transactionPassword">
              Wallet Password
              <span class="required">*</span>
            </label>
            <div class="password-field">
              <input 
                type="password" 
                class="form-control" 
                id="transactionPassword" 
                placeholder="Enter wallet password"
                autocomplete="current-password"
              >
              <button type="button" class="password-toggle" id="passwordToggle">
                <span id="toggleIcon">👁️</span>
              </button>
            </div>
            <div class="form-error hidden" id="passwordError"></div>
          </div>
        </div>

        <!-- Transaction Review -->
        <div class="confirmation-section">
          <h4 class="section-title">Review Transaction</h4>
          <div class="transaction-details">
            <div class="detail-row">
              <span class="detail-label">Type:</span>
              <span class="detail-value">
                ${params.useMsgDeposit ? 'MsgDeposit' : 'MsgSend'}
                <span class="detail-description">
                  ${params.useMsgDeposit ? '(Deposit to THORChain)' : '(Direct Transfer)'}
                </span>
              </span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Asset:</span>
              <span class="detail-value">${params.asset}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value highlight">${params.amount} ${params.asset}</span>
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
            
            <div class="detail-row fee-row">
              <span class="detail-label">Network Fee:</span>
              <span class="detail-value fee">
                ${this.formatFee(fee)} RUNE
              </span>
            </div>
            
            <div class="detail-row total-row">
              <span class="detail-label">Total Cost:</span>
              <span class="detail-value total">
                ${this.calculateTotalCost(params, fee)}
              </span>
            </div>
          </div>
        </div>
      </div>
    `
  }

  private setupEventListeners(): void {
    // Password field focus handling
    const passwordInput = document.getElementById('transactionPassword') as HTMLInputElement
    passwordInput?.addEventListener('input', () => {
      this.clearPasswordError()
      this.updateSendButtonState()
    })
    passwordInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        // Could auto-confirm on Enter if desired
      }
    })

    // Password visibility toggle
    const passwordToggle = document.getElementById('passwordToggle')
    passwordToggle?.addEventListener('click', () => this.togglePasswordVisibility())
  }

  private updateSendButtonState(): void {
    const confirmBtn = document.getElementById('confirmBtn') as HTMLButtonElement
    const passwordInput = document.getElementById('transactionPassword') as HTMLInputElement
    
    if (confirmBtn && passwordInput) {
      const hasPassword = passwordInput.value.trim().length > 0
      confirmBtn.disabled = !hasPassword
      
      if (hasPassword) {
        confirmBtn.classList.remove('btn-disabled')
      } else {
        confirmBtn.classList.add('btn-disabled')
      }
    }
  }

  private togglePasswordVisibility(): void {
    const passwordInput = document.getElementById('transactionPassword') as HTMLInputElement
    const toggleIcon = document.getElementById('toggleIcon')
    
    if (!passwordInput || !toggleIcon) return

    if (passwordInput.type === 'password') {
      passwordInput.type = 'text'
      toggleIcon.textContent = '🙈'
    } else {
      passwordInput.type = 'password'
      toggleIcon.textContent = '👁️'
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
    const errorEl = document.getElementById('passwordError')
    if (errorEl) {
      errorEl.textContent = message
      errorEl.classList.remove('hidden')
    }
  }

  private clearPasswordError(): void {
    const errorEl = document.getElementById('passwordError')
    if (errorEl) {
      errorEl.textContent = ''
      errorEl.classList.add('hidden')
    }
  }

  // Public methods
  getPassword(): string {
    const passwordInput = document.getElementById('transactionPassword') as HTMLInputElement
    const password = passwordInput?.value || ''
    
    console.log('🔐 DEBUG: Getting password from input:', {
      inputExists: !!passwordInput,
      passwordLength: password.length,
      passwordValue: password ? '[REDACTED]' : 'EMPTY'
    })
    
    return password // Remove trim() in case it's causing issues
  }

  public clearSensitiveData(): void {
    // Clear password input
    const passwordInput = document.getElementById('transactionPassword') as HTMLInputElement
    if (passwordInput) {
      passwordInput.value = ''
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