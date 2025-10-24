/**
 * MemolessTab Component - THORChain Memoless Transaction Flow
 * 
 * Implements the complete 9-step memoless registration and deposit process:
 * 1. Enter memo to register
 * 2. Select valid asset from pools  
 * 3. Send MsgDeposit to register
 * 4. Retrieve reference ID
 * 5-9. Generate deposit instructions with QR code
 */

import { BackendService } from '../services/BackendService'
import { SendTransaction, SendTransactionData } from './SendTransaction'

export interface MemolessTabData {
  walletId: string
  name: string
  address: string
  network: 'mainnet' | 'stagenet'
}

export interface MemolessState {
  currentStep: number
  memoToRegister: string
  selectedAsset: string | null
  assetPrice: number
  assetDecimals: number
  registrationTxId: string | null
  referenceId: string | null
  registrationData: any | null
  inboundAddress: string | null
  dustThreshold: number
  validAmount: string | null
  qrCodeData: string | null
  validationData: any | null
  isComplete: boolean
}

export interface PoolAsset {
  asset: string
  balance_rune: string
  status: string
  decimals?: number
  asset_tor_price: string
}

export class MemolessTab {
  private container: HTMLElement
  private backend: BackendService
  private walletData: MemolessTabData | null = null
  private sendTransaction: SendTransaction | null = null
  
  private state: MemolessState = {
    currentStep: 1,
    memoToRegister: '',
    selectedAsset: null,
    assetPrice: 0,
    assetDecimals: 8,
    registrationTxId: null,
    referenceId: null,
    registrationData: null,
    inboundAddress: null,
    dustThreshold: 0,
    validAmount: null,
    qrCodeData: null,
    validationData: null,
    isComplete: false
  }

  private displayUnit: 'asset' | 'usd' = 'asset' // Track current display unit

  constructor(container: HTMLElement, backend: BackendService) {
    this.container = container
    this.backend = backend
    console.log('🔧 MemolessTab component created')
  }

  async initialize(walletData: MemolessTabData): Promise<void> {
    try {
      console.log('🔗 Initializing MemolessTab for wallet:', walletData.name)
      
      this.walletData = walletData
      
      // Reset state for new session
      this.resetState()
      
      // Render initial UI
      this.render()
      
      console.log('✅ MemolessTab initialized')
    } catch (error) {
      console.error('❌ Failed to initialize MemolessTab:', error)
      throw error
    }
  }

  private resetState(): void {
    // Stop validation refresh timer
    this.stopValidationRefresh()
    
    this.state = {
      currentStep: 1,
      memoToRegister: '',
      selectedAsset: null,
      assetPrice: 0,
      assetDecimals: 8,
      registrationTxId: null,
      referenceId: null,
      registrationData: null,
      inboundAddress: null,
      dustThreshold: 0,
      validAmount: null,
      qrCodeData: null,
      validationData: null,
      isComplete: false
    }
  }

  private render(): void {
    if (!this.walletData) return

    this.container.innerHTML = `
      <div class="memoless-tab">
        <!-- Header -->
        <div class="memoless-header">
          <div class="header-content">
            <h2>🔗 Memoless Transactions</h2>
            <p>Register a memo once, then send deposits using encoded amounts</p>
          </div>
          
          <!-- Progress Steps -->
          <div class="progress-steps">
            <div class="step ${this.state.currentStep >= 1 ? 'active' : ''} ${this.state.currentStep === 1 ? 'current' : ''}">
              <div class="step-number">1</div>
              <div class="step-label">Setup</div>
            </div>
            <div class="step ${this.state.currentStep >= 2 ? 'active' : ''} ${this.state.currentStep === 2 ? 'current' : ''}">
              <div class="step-number">2</div>
              <div class="step-label">Register</div>
            </div>
            <div class="step ${this.state.currentStep >= 3 ? 'active' : ''} ${this.state.currentStep === 3 ? 'current' : ''}">
              <div class="step-number">3</div>
              <div class="step-label">Reference</div>
            </div>
            <div class="step ${this.state.currentStep >= 4 ? 'active' : ''} ${this.state.currentStep === 4 ? 'current' : ''}">
              <div class="step-number">4</div>
              <div class="step-label">Deposit</div>
            </div>
          </div>
        </div>

        <!-- Step Content -->
        <div class="memoless-content">
          <div class="step-container" id="stepContainer">
            ${this.renderCurrentStep()}
          </div>
        </div>

        <!-- Navigation -->
        <div class="memoless-actions">
          ${this.state.currentStep === 4 ? `
            <!-- Step 4: Only Reset button -->
            <div class="step4-actions">
              <button class="btn btn-secondary" id="resetBtn">
                🔄 Reset
              </button>
            </div>
          ` : `
            <!-- Other Steps: Back, Reset, Next -->
            <button class="btn btn-secondary" id="backBtn" ${this.state.currentStep <= 1 ? 'style="display: none;"' : ''}>
              ← Back
            </button>
            <div class="action-buttons">
              <button class="btn btn-secondary" id="resetBtn">
                🔄 Reset
              </button>
              <button class="btn btn-primary" id="nextBtn" ${this.canProceed() ? '' : 'disabled'}>
                ${this.getNextButtonText()} →
              </button>
            </div>
          `}
        </div>
      </div>
    `

    this.setupEventListeners()
  }

  private renderCurrentStep(): string {
    switch (this.state.currentStep) {
      case 1:
        return this.renderSetupStep()
      case 2:
        return this.renderRegistrationStep()
      case 3:
        return this.renderReferenceStep()
      case 4:
        return this.renderDepositStep()
      default:
        return '<div class="error-state">Invalid step</div>'
    }
  }

  private renderSetupStep(): string {
    return `
      <div class="step-content setup-step">
        <div class="step-title">
          <h3>Step 1: Setup Memoless Transaction</h3>
          <p>Enter your memo and select the asset for registration</p>
        </div>

        <div class="setup-form">
          <!-- Asset Selection (moved to first) -->
          <div class="form-section">
            <label class="form-label" for="assetSelector">Deposit Asset</label>
            <select class="form-control" id="assetSelector">
              <option value="">Loading available assets...</option>
            </select>
            <div class="form-helper">
              <small>Choose which asset you would like to deposit. Only gas assets are available, no tokens.</small>
            </div>
            <div class="form-error hidden" id="assetError"></div>
          </div>

          <!-- Selected Asset Details -->
          <div class="selected-asset-info" id="selectedAssetInfo" style="display: none;">
            <h4>Selected Asset Details:</h4>
            <div class="asset-details">
              <div class="detail-row">
                <span>Asset:</span>
                <span id="selectedAssetName">-</span>
              </div>
              <div class="detail-row">
                <span>Price (USD):</span>
                <span id="selectedAssetPrice">-</span>
              </div>
            </div>
          </div>

          <!-- Memo Section (moved to second) -->
          <div class="form-section">
            <label class="form-label" for="memoInput">Transaction Memo</label>
            <textarea 
              class="form-control memo-input" 
              id="memoInput" 
              placeholder="Enter your memo (e.g., =:BTC.BTC:bc1q...)"
              rows="3"
              value="${this.state.memoToRegister}"
            ></textarea>
            <div class="form-error hidden" id="memoError"></div>
          </div>
        </div>
      </div>
    `
  }

  private renderRegistrationStep(): string {
    return `
      <div class="step-content registration-step">
        <div class="step-title">
          <h3>Step 2: Register Memo</h3>
          <p>Send a MsgDeposit transaction to register your memo</p>
        </div>

        <div class="registration-summary">
          <div class="summary-card">
            <h4>Registration Details:</h4>
            <div class="detail-row">
              <span>Memo:</span>
              <span class="mono">${this.state.memoToRegister}</span>
            </div>
            <div class="detail-row">
              <span>Asset:</span>
              <span>${this.state.selectedAsset}</span>
            </div>
            <div class="detail-row">
              <span>Registration Memo:</span>
              <span class="mono">REFERENCE:${this.state.selectedAsset}:${this.state.memoToRegister}</span>
            </div>
          </div>

          <div class="registration-actions">
            <button class="btn btn-primary" id="registerMemoBtn">
              📝 Send Registration Transaction
            </button>
          </div>
        </div>
      </div>
    `
  }

  private renderReferenceStep(): string {
    return `
      <div class="step-content reference-step">
        <div class="step-title">
          <h3>Step 3: Retrieve Reference ID</h3>
          <p>Getting your unique reference ID from the registration transaction</p>
        </div>

        <div class="reference-retrieval">
          ${this.state.registrationTxId ? `
            <div class="tx-info">
              <div class="detail-row">
                <span>Registration TX:</span>
                <span class="mono">${this.state.registrationTxId}</span>
              </div>
            </div>
          ` : ''}

          <div class="retrieval-status" id="retrievalStatus">
            <div class="loading-state">
              🔄 Retrieving reference ID...
            </div>
          </div>
        </div>
      </div>
    `
  }

  private renderDepositStep(): string {
    if (!this.state.referenceId) return '<div class="loading-state">Loading deposit instructions...</div>'

    return `
      <div class="step-content deposit-step">
        <div class="step-title">
          <h3>Step 4: Make Your Deposit</h3>
        </div>

        <!-- Amount Input Section -->
        <div class="amount-input-section">
          <label for="userAmountInput">Amount:</label>
          <div class="amount-input-group">
            <span class="amount-prefix" id="amountPrefix">$</span>
            <input type="text" id="userAmountInput" placeholder="0.1" class="amount-input">
            <select id="unitToggle" class="unit-toggle">
              <option value="asset">${this.state.selectedAsset?.split('.')[1] || 'ASSET'}</option>
              <option value="usd">USD</option>
            </select>
          </div>
        </div>

        <!-- Final Amount Emphasized Section -->
        <div class="final-amount-section">
          <div class="final-amount-header">Final Amount to Send</div>
          <div class="final-amount-display">
            <span class="final-amount-primary" id="finalAmountDisplay">0.00100002 BNB</span>
            <span class="final-amount-secondary" id="finalAmountUSD">$0.90 USD</span>
          </div>
        </div>

        <!-- Transaction Details Container (Hidden until valid amount) -->
        <div class="transaction-details-container" id="transactionDetailsContainer" style="display: none;">
          <!-- Section Divider -->
          <div class="section-divider"></div>

          <!-- Transaction Details Section -->
          <div class="transaction-details-main">
            <div class="section-header">Transaction Details</div>
            
            <!-- QR Code and Details Layout -->
            <div class="qr-transaction-layout">
              <!-- QR Code -->
              <div class="qr-container-compact">
                <div class="qr-box" id="qrContainer">
                  ${this.state.inboundAddress ? '' : '<div class="qr-loading">Loading QR...</div>'}
                </div>
                <!-- Asset info (moved below QR) -->
                <div class="asset-below-qr">
                  <div class="network-display">
                    <span id="networkAndAsset">${this.state.selectedAsset ? `${this.state.selectedAsset.split('.')[1]} on ${this.state.selectedAsset.split('.')[0]}` : 'Loading...'}</span>
                  </div>
                </div>
              </div>
              
              <!-- Transaction Details -->
              <div class="transaction-details-compact">
                <!-- Top row: Reference ID, Expiry, Uses -->
                <div class="detail-row-triple">
                  <div class="detail-third">
                    <label>Reference ID:</label>
                    <div class="reference-display">
                      <span id="referenceNumber">${this.state.referenceId || 'Loading...'}</span>
                    </div>
                  </div>
                  <div class="detail-third">
                    <label>Expires:</label>
                    <div id="expiryCompact" class="expiry-compact">Loading...</div>
                  </div>
                  <div class="detail-third">
                    <label>Uses:</label>
                    <div id="usageCompact" class="usage-compact">Loading...</div>
                  </div>
                </div>
                
                <!-- Address -->
                <div class="detail-row">
                  <label>Deposit Address:</label>
                  <div class="input-copy-group">
                    <input type="text" id="fullAddress" value="Loading..." readonly class="detail-input">
                    <button id="realCopyAddressBtn" class="copy-button">📋</button>
                  </div>
                </div>
                
                <!-- Amount -->
                <div class="detail-row">
                  <label>Deposit Amount:</label>
                  <div class="input-copy-group">
                    <input type="text" id="exactAmount" value="-" readonly class="detail-input">
                    <button id="realCopyAmountBtn" class="copy-button">📋</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Critical Instructions Below -->
          <div class="critical-instructions-below">
            <div class="section-header warning">⚠️ Critical Instructions</div>
            <ul class="instructions-list-bullets">
              <li><strong>Send Exact Amount:</strong> Use precisely the calculated amount - no changes</li>
              <li><strong>Copy Address:</strong> Use copy button to prevent address errors</li>
              <li><strong>Sufficient Gas:</strong> Ensure confirmation within 10 minutes</li>
              <li><strong>Final Check:</strong> Verify all details - transactions are irreversible</li>
            </ul>
          </div>
        </div>

        <!-- Hidden Reference Display for Internal Use -->
        <div class="reference-display" style="display: none;">
          <span class="reference-label">Reference ID:</span>
          <code class="reference-id-compact">${this.state.referenceId}</code>
        </div>
      </div>
    `
  }

  private setupEventListeners(): void {
    // Navigation buttons
    const backBtn = document.getElementById('backBtn')
    const nextBtn = document.getElementById('nextBtn')
    const resetBtn = document.getElementById('resetBtn')

    backBtn?.addEventListener('click', () => this.goToPreviousStep())
    nextBtn?.addEventListener('click', () => this.goToNextStep())
    resetBtn?.addEventListener('click', () => this.resetFlow())

    // Step-specific listeners
    this.setupStepSpecificListeners()
  }

  private setupStepSpecificListeners(): void {
    switch (this.state.currentStep) {
      case 1:
        this.setupSetupStepListeners()
        break
      case 2:
        this.setupRegistrationStepListeners()
        break
      case 4:
        this.setupDepositStepListeners()
        break
    }
  }

  private setupSetupStepListeners(): void {
    // Setup memo input listener
    const memoInput = document.getElementById('memoInput') as HTMLTextAreaElement
    memoInput?.addEventListener('input', () => {
      this.state.memoToRegister = memoInput.value.trim()
      this.updateNavigationState()
    })

    // Load assets when step loads
    this.loadAvailableAssets()

    // Setup asset selection listener
    const assetSelector = document.getElementById('assetSelector') as HTMLSelectElement
    assetSelector?.addEventListener('change', () => {
      const selectedAsset = assetSelector.value
      if (selectedAsset) {
        this.selectAsset(selectedAsset)
      }
    })
  }

  private setupRegistrationStepListeners(): void {
    const registerBtn = document.getElementById('registerMemoBtn')
    registerBtn?.addEventListener('click', () => this.registerMemo())
  }

  private setupDepositStepListeners(): void {
    const userAmountInput = document.getElementById('userAmountInput') as HTMLInputElement
    const unitToggle = document.getElementById('unitToggle') as HTMLSelectElement
    const realCopyAddressBtn = document.getElementById('realCopyAddressBtn')
    const realCopyAmountBtn = document.getElementById('realCopyAmountBtn')

    // Initialize display with asset as default
    this.displayUnit = 'asset'
    this.updateCompactDisplay('', '', '', false)

    // Amount input listener
    userAmountInput?.addEventListener('input', async () => await this.calculateValidAmountCompact())
    
    // Unit toggle (dropdown) listener
    unitToggle?.addEventListener('change', () => {
      this.displayUnit = unitToggle.value as 'asset' | 'usd'
      this.updateCompactDisplay('', '', '', false) // Update prefix immediately
      this.calculateValidAmountCompact()
    })
    
    // Compact copy buttons with icon feedback
    realCopyAddressBtn?.addEventListener('click', () => this.copyCompactFeedback(this.state.inboundAddress || '', realCopyAddressBtn, 'Address copied!'))
    realCopyAmountBtn?.addEventListener('click', () => this.copyCompactFeedback(this.state.validAmount || '', realCopyAmountBtn, 'Amount copied!'))
  }

  private canProceed(): boolean {
    switch (this.state.currentStep) {
      case 1:
        return this.state.memoToRegister.length > 0 && this.state.selectedAsset !== null
      case 2:
        return this.state.registrationTxId !== null
      case 3:
        return this.state.referenceId !== null
      case 4:
        return true // Always can proceed from final step
      default:
        return false
    }
  }

  private getNextButtonText(): string {
    switch (this.state.currentStep) {
      case 1:
        return 'Review Registration'
      case 2:
        return 'Get Reference ID'
      case 3:
        return 'Setup Deposit'
      case 4:
        return 'Complete'
      default:
        return 'Next'
    }
  }

  private updateNavigationState(): void {
    const nextBtn = document.getElementById('nextBtn') as HTMLButtonElement
    if (nextBtn) {
      nextBtn.disabled = !this.canProceed()
    }
  }

  // Navigation methods
  private goToPreviousStep(): void {
    if (this.state.currentStep > 1) {
      this.state.currentStep--
      this.render()
    }
  }

  private async goToNextStep(): Promise<void> {
    if (!this.canProceed()) return

    if (this.state.currentStep < 4) {
      this.state.currentStep++
      this.render()

      // Auto-execute step-specific actions
      if (this.state.currentStep === 3 && this.state.registrationTxId) {
        await this.retrieveReferenceId()
      } else if (this.state.currentStep === 4) {
        await this.setupDepositInstructions()
      }
    }
  }

  private resetFlow(): void {
    this.resetState()
    this.render()
  }

  // Implementation stubs for step logic
  private async loadAvailableAssets(): Promise<void> {
    const assetSelector = document.getElementById('assetSelector') as HTMLSelectElement
    if (!assetSelector) return

    try {
      console.log('🔄 Loading available assets from pools...')
      
      // Show loading state
      assetSelector.innerHTML = '<option value="">Loading available assets...</option>'
      assetSelector.disabled = true

      // Fetch pools and valid assets
      const [pools, validAssets] = await Promise.all([
        this.backend.getPools(),
        this.backend.memolessGetValidAssets().catch(() => null) // Fallback if memoless endpoint fails
      ])

      console.log('📊 Pools data received:', pools?.length || 0, 'pools')
      console.log('✅ Valid assets data received:', validAssets?.length || 0, 'assets')

      if (!pools || pools.length === 0) {
        throw new Error('No pools data available')
      }

      // Filter pools for memoless-compatible assets
      const memolessAssets = this.filterMemolessAssets(pools, validAssets)
      
      console.log('🔍 Filtered memoless-compatible assets:', memolessAssets.length)

      if (memolessAssets.length === 0) {
        assetSelector.innerHTML = '<option value="">No compatible assets found</option>'
        assetSelector.disabled = true
        return
      }

      // Populate selector with available assets (no prices in dropdown)
      assetSelector.innerHTML = '<option value="">Select an asset...</option>'
      
      memolessAssets.forEach((asset: PoolAsset) => {
        const option = document.createElement('option')
        option.value = asset.asset
        option.textContent = asset.asset
        assetSelector.appendChild(option)
      })

      assetSelector.disabled = false
      console.log('✅ Asset selector populated with', memolessAssets.length, 'assets')

    } catch (error) {
      console.error('❌ Failed to load available assets:', error)
      assetSelector.innerHTML = '<option value="">Failed to load assets</option>'
      assetSelector.disabled = true
      
      const assetError = document.getElementById('assetError')
      if (assetError) {
        assetError.textContent = 'Failed to load assets: ' + (error as Error).message
        assetError.classList.remove('hidden')
      }
    }
  }

  private filterMemolessAssets(pools: any[], validAssets?: any[]): PoolAsset[] {
    if (!pools) return []

    return pools
      .filter(pool => {
        // Must have 'Available' status
        if (pool.status !== 'Available') return false
        
        // Skip RUNE pool (always exists but not needed for memoless)
        if (pool.asset === 'THOR.RUNE') return false

        // Only gas assets - these are chain native assets (no tokens)
        const assetParts = pool.asset.split('.')
        
        // Gas assets have exactly 2 parts: CHAIN.ASSET where ASSET is the native asset name
        if (assetParts.length !== 2) return false
        
        const [chain, asset] = assetParts
        
        // For gas assets, the asset name should match the chain or be a simple name
        // Examples of gas assets: BTC.BTC, ETH.ETH, LTC.LTC, BCH.BCH, BNB.BNB, AVAX.AVAX
        // Examples of tokens: ETH.USDC-0x..., BNB.USDT-0x..., AVAX.USDC-0x...
        
        // If the asset part contains a hyphen, it's likely a token with an address
        if (asset.includes('-')) return false
        
        // Additional filter: ensure it's a recognized gas asset
        const gasAssets = ['BTC', 'ETH', 'LTC', 'BCH', 'BNB', 'AVAX', 'ATOM', 'DOGE', 'BSC', 'GAIA']
        if (!gasAssets.includes(chain)) return false

        // If we have valid assets from memoless endpoint, use that filter too
        if (validAssets && Array.isArray(validAssets)) {
          return validAssets.some((validAsset: any) => 
            validAsset.asset === pool.asset || validAsset === pool.asset
          )
        }

        // Default: accept gas assets
        return true
      })
      .map(pool => ({
        asset: pool.asset,
        balance_rune: pool.balance_rune || '0',
        status: pool.status,
        decimals: this.getAssetDecimals(pool.asset),
        asset_tor_price: pool.asset_price_usd || pool.asset_tor_price || '0'
      }))
      .sort((a, b) => {
        // Sort by RUNE liquidity (balance_rune) descending
        return parseFloat(b.balance_rune) - parseFloat(a.balance_rune)
      })
  }

  private getAssetDecimals(asset: string): number {
    const [chain] = asset.split('.')
    const decimalMap: { [key: string]: number } = {
      'BTC': 8,
      'ETH': 18,
      'LTC': 8,
      'BCH': 8,
      'BNB': 8,
      'AVAX': 18,
      'ATOM': 6,
      'DOGE': 8,
      'BSC': 18,
      'GAIA': 6
    }
    return decimalMap[chain] || 8
  }

  private formatPrice(price: number): string {
    if (price === 0) return '$0.00'
    if (price < 0.01) return `$${price.toFixed(6)}`
    if (price < 1) return `$${price.toFixed(4)}`
    return `$${price.toFixed(2)}`
  }

  private async selectAsset(asset: string): Promise<void> {
    try {
      console.log('🎯 Selecting asset:', asset)
      
      this.state.selectedAsset = asset

      // Get pools to find asset details  
      const pools = await this.backend.getPools()
      const selectedPool = pools?.find((pool: any) => pool.asset === asset)
      
      if (!selectedPool) {
        throw new Error(`Pool not found for asset: ${asset}`)
      }

      // Update state with asset details from pools API (per docs lines 81-82)
      this.state.assetPrice = parseFloat(selectedPool.asset_price_usd || selectedPool.asset_tor_price || '0')
      this.state.assetDecimals = selectedPool.decimals || 8 // Use pool decimals, fallback to 8 as per spec

      console.log('📋 Asset details loaded:', {
        asset: this.state.selectedAsset,
        price: this.state.assetPrice,
        decimals: this.state.assetDecimals
      })

      // Update UI
      this.updateAssetDetails(selectedPool)
      this.updateNavigationState()

    } catch (error) {
      console.error('❌ Failed to select asset:', error)
      
      // Reset selection on error
      this.state.selectedAsset = null
      this.state.assetPrice = 0
      this.state.assetDecimals = 8
      
      // Hide asset info and show error
      const selectedAssetInfo = document.getElementById('selectedAssetInfo')
      if (selectedAssetInfo) selectedAssetInfo.style.display = 'none'
      
      const assetError = document.getElementById('assetError')
      if (assetError) {
        assetError.textContent = 'Failed to load asset details: ' + (error as Error).message
        assetError.classList.remove('hidden')
      }

      this.updateNavigationState()
    }
  }

  private updateAssetDetails(poolData: any): void {
    const selectedAssetInfo = document.getElementById('selectedAssetInfo')
    const selectedAssetName = document.getElementById('selectedAssetName')
    const selectedAssetPrice = document.getElementById('selectedAssetPrice')

    if (!selectedAssetInfo || !selectedAssetName || !selectedAssetPrice) {
      return
    }

    // Show asset details section
    selectedAssetInfo.style.display = 'block'

    // Update details (no decimals field anymore)
    selectedAssetName.textContent = poolData.asset
    selectedAssetPrice.textContent = this.formatPrice(this.state.assetPrice)

    // Clear any previous errors
    const assetError = document.getElementById('assetError')
    if (assetError) {
      assetError.classList.add('hidden')
    }

    console.log('✅ Asset details UI updated')
  }

  private async registerMemo(): Promise<void> {
    try {
      console.log('🔄 Opening registration transaction dialog...')
      
      if (!this.walletData || !this.state.selectedAsset || !this.state.memoToRegister) {
        throw new Error('Missing required data for registration')
      }

      // Construct the registration memo in the format: REFERENCE:{assetToRegister}:{memoToRegister}
      // Create registration memo without timestamp
      const registrationMemo = `REFERENCE:${this.state.selectedAsset}:${this.state.memoToRegister}`
      
      console.log('📝 Registration memo constructed:', registrationMemo)

      // Create the transaction parameters for MsgDeposit
      const transactionParams = {
        asset: 'THOR.RUNE',
        amount: '0',
        memo: registrationMemo,
        useMsgDeposit: true
      }

      // Create minimal wallet data for the Send dialog
      const sendTransactionData = {
        walletId: this.walletData.walletId,
        name: this.walletData.name,
        currentAddress: this.walletData.address,
        network: this.walletData.network,
        availableBalances: [
          {
            asset: 'THOR.RUNE',
            balance: '1000000', // Assume sufficient RUNE balance for registration
            usdValue: '0'
          }
        ]
      }

      // Find or create the global overlay container
      let overlayContainer = document.getElementById('global-overlay-container')
      if (!overlayContainer) {
        overlayContainer = document.createElement('div')
        overlayContainer.id = 'global-overlay-container'
        overlayContainer.style.position = 'fixed'
        overlayContainer.style.top = '0'
        overlayContainer.style.left = '0'
        overlayContainer.style.width = '100%'
        overlayContainer.style.height = '100%'
        overlayContainer.style.zIndex = '10000'
        overlayContainer.style.display = 'none'
        document.body.appendChild(overlayContainer)
      }

      // Create and initialize SendTransaction component
      this.sendTransaction = new SendTransaction(overlayContainer, this.backend)
      
      // Initialize with callbacks to handle transaction completion
      await this.sendTransaction.initialize(sendTransactionData, {
        onSuccess: (result) => this.onRegistrationSuccess(result),
        onClose: () => this.onRegistrationDialogClose()
      })

      // Skip directly to confirmation page with pre-populated data
      await this.skipToConfirmationPage(transactionParams)

      console.log('✅ Registration transaction dialog opened at confirmation page')

    } catch (error) {
      console.error('❌ Failed to open registration transaction:', error)
      
      // Show error in UI
      const container = document.getElementById('stepContainer')
      if (container) {
        const errorDiv = document.createElement('div')
        errorDiv.className = 'error-state'
        errorDiv.innerHTML = `
          <div class="error-message">
            <h4>❌ Registration Error</h4>
            <p>Failed to open registration dialog: ${(error as Error).message}</p>
            <button class="btn btn-secondary" onclick="this.parentNode.parentNode.remove()">Dismiss</button>
          </div>
        `
        container.appendChild(errorDiv)
      }
    }
  }

  private async skipToConfirmationPage(transactionParams: any): Promise<void> {
    try {
      // Wait for the send dialog to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 200))

      // Access the sendTransaction's internal methods to skip to confirmation
      if (!this.sendTransaction) {
        throw new Error('SendTransaction component not initialized')
      }

      console.log('🔐 Setting captured transaction params for memoless registration:', transactionParams)

      // Set the captured transaction parameters that the confirmation page expects
      ;(this.sendTransaction as any).capturedTransactionParams = {
        asset: transactionParams.asset,
        amount: transactionParams.amount,
        toAddress: undefined, // Not needed for MsgDeposit
        memo: transactionParams.memo,
        useMsgDeposit: transactionParams.useMsgDeposit
      }

      // Navigate directly to page 2 (confirmation/review page)
      ;(this.sendTransaction as any).navigateToPage(2)

      console.log('✅ Skipped directly to confirmation page with memoless registration data')

    } catch (error) {
      console.error('❌ Failed to skip to confirmation page:', error)
      throw error
    }
  }

  private onRegistrationSuccess(result: any): void {
    console.log('🎉 Registration transaction successful!', result)
    
    // Capture the real transaction hash
    this.state.registrationTxId = result.transactionHash
    
    console.log('📝 Registration TX ID captured:', this.state.registrationTxId)
    
    // Update the state and proceed to next step
    if (this.canProceed()) {
      this.goToNextStep()
    }
  }

  private onRegistrationDialogClose(): void {
    console.log('🔄 Registration dialog closed')
    
    // Clean up the send transaction component
    this.sendTransaction = null
    
    // If we have a transaction ID, the registration was successful
    // Otherwise, the user cancelled the transaction
    if (!this.state.registrationTxId) {
      console.log('⚠️ Registration was cancelled or failed')
      // Could show a message to the user here
    }
  }

  private async retrieveReferenceId(): Promise<void> {
    const retrievalStatus = document.getElementById('retrievalStatus')
    
    try {
      console.log('🔍 Retrieving reference ID from registration transaction using memoless service...')
      
      if (!this.state.registrationTxId) {
        throw new Error('No registration transaction ID available')
      }

      // Update status
      if (retrievalStatus) {
        retrievalStatus.innerHTML = `
          <div class="loading-state">
            <div class="spinner"></div>
            🔍 Retrieving memo reference from THORChain...
          </div>
        `
      }

      // Use direct IPC call instead of service object to avoid serialization issues
      const registrationData = await this.backend.memolessGetReference(this.state.registrationTxId)
      
      console.log('📄 Registration data received:', registrationData)

      if (!registrationData || !registrationData.reference) {
        throw new Error('Reference ID not found in registration data')
      }

      // Store complete registration data
      this.state.referenceId = registrationData.reference
      this.state.registrationData = registrationData
      
      console.log('✅ Reference ID retrieved:', registrationData.reference)

      // Load inbound address now that we have all required info
      await this.loadInboundAddresses()

      // Update status with success and registration details
      if (retrievalStatus) {
        retrievalStatus.innerHTML = `
          <div class="success-state">
            <h4>✅ Memo Registration Retrieved!</h4>
            <div class="registration-details">
              <div class="detail-row">
                <span class="detail-label">Reference ID:</span>
                <span class="detail-value mono">${registrationData.reference}</span>
                <button class="copy-btn" onclick="navigator.clipboard.writeText('${registrationData.reference}')">
                  📋
                </button>
              </div>
              <div class="detail-row">
                <span class="detail-label">Registered Asset:</span>
                <span class="detail-value">${registrationData.asset}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Block Height:</span>
                <span class="detail-value">${registrationData.height}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Registered Memo:</span>
                <span class="detail-value mono">${registrationData.memo}</span>
              </div>
            </div>
          </div>
        `
      }

      // Auto-advance to next step after a brief display
      setTimeout(() => {
        if (this.canProceed()) {
          this.goToNextStep()
        }
      }, 3000)

    } catch (error) {
      console.error('❌ Failed to retrieve reference ID:', error)
      
      if (retrievalStatus) {
        retrievalStatus.innerHTML = `
          <div class="error-state">
            <h4>❌ Failed to Retrieve Reference ID</h4>
            <p>Error: ${(error as Error).message}</p>
            <div class="error-actions">
              <button class="btn btn-secondary" onclick="this.retrieveReferenceId()">🔄 Retry</button>
              <button class="btn btn-primary" onclick="this.proceedWithManualId()">✏️ Enter Manually</button>
            </div>
          </div>
        `
      }
    }
  }

  private extractReferenceId(txDetails: any): string | null {
    try {
      // THORChain memoless reference IDs are typically found in transaction logs/events
      // The exact format depends on the THORChain implementation
      
      console.log('🔍 Searching for reference ID in transaction events...')
      
      // Check for events in the transaction
      if (txDetails.events && Array.isArray(txDetails.events)) {
        for (const event of txDetails.events) {
          // Look for deposit or reference events
          if (event.type === 'deposit' || event.type === 'thorchain_deposit') {
            const attributes = event.attributes || []
            
            // Look for reference ID in attributes
            for (const attr of attributes) {
              if (attr.key === 'reference_id' || attr.key === 'ref_id') {
                console.log('🎯 Found reference ID in event attributes:', attr.value)
                return attr.value
              }
            }
          }
        }
      }

      // Check raw logs for reference ID patterns
      if (txDetails.rawLog || txDetails.raw_log) {
        const rawLog = txDetails.rawLog || txDetails.raw_log
        console.log('📋 Searching raw logs for reference ID pattern...')
        
        // Look for reference ID patterns in logs
        const refIdMatch = rawLog.match(/reference[_-]?id[:\s]*([a-zA-Z0-9]+)/i)
        if (refIdMatch && refIdMatch[1]) {
          console.log('🎯 Found reference ID in raw logs:', refIdMatch[1])
          return refIdMatch[1]
        }

        // Look for memo patterns that might contain reference
        const memoMatch = rawLog.match(/memo[:\s]*([^,\s]+)/i)
        if (memoMatch && memoMatch[1] && memoMatch[1].includes('REFERENCE')) {
          console.log('🎯 Found reference pattern in memo:', memoMatch[1])
          // Extract just the reference part
          const parts = memoMatch[1].split(':')
          if (parts.length >= 3) {
            return parts[parts.length - 1] // Last part after REFERENCE:ASSET:
          }
        }
      }

      // Check transaction hash as fallback - use last 8 characters
      if (txDetails.txhash || txDetails.transactionHash) {
        const txHash = txDetails.txhash || txDetails.transactionHash
        const shortRef = txHash.slice(-8).toUpperCase()
        console.log('⚡ Using transaction hash suffix as reference:', shortRef)
        return shortRef
      }

      return null

    } catch (error) {
      console.error('❌ Error extracting reference ID:', error)
      return null
    }
  }

  private proceedWithManualId(): void {
    const retrievalStatus = document.getElementById('retrievalStatus')
    
    if (retrievalStatus) {
      retrievalStatus.innerHTML = `
        <div class="manual-reference-input">
          <h4>✏️ Enter Reference ID Manually</h4>
          <p>If you have the reference ID from the transaction, enter it below:</p>
          <div class="form-section">
            <input type="text" id="manualRefInput" class="form-control" placeholder="Enter reference ID..." />
            <div class="manual-actions">
              <button class="btn btn-secondary" onclick="this.cancelManualEntry()">Cancel</button>
              <button class="btn btn-primary" onclick="this.submitManualReference()">Continue</button>
            </div>
          </div>
        </div>
      `
      
      // Focus the input
      const input = document.getElementById('manualRefInput') as HTMLInputElement
      if (input) {
        input.focus()
        
        // Submit on Enter key
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.submitManualReference()
          }
        })
      }
    }
  }

  private submitManualReference(): void {
    const input = document.getElementById('manualRefInput') as HTMLInputElement
    const refId = input?.value?.trim()
    
    if (!refId) {
      alert('Please enter a reference ID')
      return
    }

    console.log('📝 Manual reference ID entered:', refId)
    this.state.referenceId = refId

    // Update UI with success
    const retrievalStatus = document.getElementById('retrievalStatus')
    if (retrievalStatus) {
      retrievalStatus.innerHTML = `
        <div class="success-state">
          <h4>✅ Reference ID Set!</h4>
          <div class="reference-display">
            <span class="reference-label">Reference ID:</span>
            <span class="reference-value mono">${refId}</span>
          </div>
        </div>
      `
    }

    // Proceed to next step
    if (this.canProceed()) {
      setTimeout(() => this.goToNextStep(), 1000)
    }
  }

  private cancelManualEntry(): void {
    // Go back to automatic retrieval
    this.retrieveReferenceId()
  }

  private async setupDepositInstructions(): Promise<void> {
    try {
      console.log('🔄 Setting up deposit instructions...')
      
      if (!this.state.selectedAsset || !this.state.referenceId) {
        throw new Error('Missing required data for deposit setup')
      }

      // Load asset-specific parameters (inbound addresses already loaded in step 3)
      await this.loadAssetParameters()
      
      console.log('✅ Deposit instructions ready')

    } catch (error) {
      console.error('❌ Failed to setup deposit instructions:', error)
      
      // Show error in the deposit step
      const depositDetails = document.getElementById('depositDetails')
      if (depositDetails) {
        depositDetails.innerHTML = `
          <div class="error-state">
            <h4>❌ Setup Error</h4>
            <p>Failed to load deposit instructions: ${(error as Error).message}</p>
            <button class="btn btn-secondary" onclick="this.setupDepositInstructions()">🔄 Retry</button>
          </div>
        `
        depositDetails.style.display = 'block'
      }
    }
  }

  private async loadInboundAddresses(): Promise<void> {
    try {
      console.log('🌐 Loading inbound addresses for', this.state.selectedAsset)
      
      // Use direct IPC call to get inbound addresses
      const inboundAddresses = await this.backend.memolessGetInboundAddresses()
      
      if (!inboundAddresses || inboundAddresses.length === 0) {
        throw new Error('No inbound addresses available')
      }

      // Get inbound address for the selected asset
      const inboundInfo = inboundAddresses.find((addr: any) => addr.chain === this.state.selectedAsset!.split('.')[0])
      
      if (!inboundInfo) {
        throw new Error(`No inbound address found for asset ${this.state.selectedAsset}`)
      }
      
      this.state.inboundAddress = inboundInfo.address
      this.state.dustThreshold = inboundInfo.dustThreshold

      console.log('✅ Inbound address loaded using memoless service:', {
        asset: this.state.selectedAsset,
        address: this.state.inboundAddress,
        dustThreshold: this.state.dustThreshold
      })

      // Update the UI with the loaded address
      this.updateAddressDisplay()

    } catch (error) {
      console.error('❌ Failed to load inbound addresses:', error)
      throw error
    }
  }

  private async loadAssetParameters(): Promise<void> {
    try {
      console.log('📊 Loading asset parameters...')
      
      // Asset price and decimals should already be loaded from step 2
      if (this.state.assetPrice === 0) {
        // Fallback: reload asset details
        const pools = await this.backend.getPools()
        const selectedPool = pools?.find((pool: any) => pool.asset === this.state.selectedAsset)
        
        if (selectedPool) {
          this.state.assetPrice = parseFloat(selectedPool.asset_price_usd || selectedPool.asset_tor_price || '0')
        }
      }

      console.log('✅ Asset parameters ready:', {
        asset: this.state.selectedAsset,
        price: this.state.assetPrice,
        decimals: this.state.assetDecimals,
        dustThreshold: this.state.dustThreshold
      })

    } catch (error) {
      console.error('❌ Failed to load asset parameters:', error)
      throw error
    }
  }

  /**
   * Helper method to consistently update the amount display box with new UI structure
   */
  private updateAmountDisplay(
    amountText: string, 
    isValid: boolean, 
    isError: boolean = false, 
    usdEquivalent?: string, 
    warnings?: string[]
  ): void {
    const calculatedAmount = document.getElementById('calculatedAmount')
    const copyAmountBtn = document.getElementById('copyAmountBtn')
    
    if (!calculatedAmount) return

    const amountTextElement = calculatedAmount.querySelector('.amount-text')
    
    if (amountTextElement && copyAmountBtn) {
      // Update existing structure
      amountTextElement.textContent = amountText
      
      if (isValid && !isError) {
        // Show copy button and enable functionality
        copyAmountBtn.style.display = 'inline-block'
        copyAmountBtn.onclick = () => {
          navigator.clipboard.writeText(this.state.validAmount || amountText)
          console.log('📋 Amount copied to clipboard:', this.state.validAmount || amountText)
        }
        
        // Update container styling for valid amounts
        calculatedAmount.classList.remove('error-state')
        calculatedAmount.classList.add('valid-amount')
      } else {
        // Hide copy button for invalid/error states
        copyAmountBtn.style.display = 'none'
        
        // Update container styling for errors
        if (isError) {
          calculatedAmount.classList.add('error-state')
          calculatedAmount.classList.remove('valid-amount')
        } else {
          calculatedAmount.classList.remove('error-state', 'valid-amount')
        }
      }
    }

    // Add USD equivalent if provided
    let existingUsdDiv = calculatedAmount.querySelector('.usd-equivalent')
    if (usdEquivalent && usdEquivalent !== '0.00') {
      if (!existingUsdDiv) {
        existingUsdDiv = document.createElement('div')
        existingUsdDiv.className = 'usd-equivalent'
        calculatedAmount.appendChild(existingUsdDiv)
      }
      existingUsdDiv.textContent = `≈ $${usdEquivalent} USD`
    } else if (existingUsdDiv) {
      existingUsdDiv.remove()
    }

    // Add warnings if provided
    let existingWarningsDiv = calculatedAmount.querySelector('.warnings')
    if (warnings && warnings.length > 0) {
      if (!existingWarningsDiv) {
        existingWarningsDiv = document.createElement('div')
        existingWarningsDiv.className = 'warnings'
        calculatedAmount.appendChild(existingWarningsDiv)
      }
      existingWarningsDiv.innerHTML = warnings.join('<br>')
    } else if (existingWarningsDiv) {
      existingWarningsDiv.remove()
    }
  }


  // Remove the old incorrect encoding method - now using service layer

  private async generateDepositQRCode(amount: string): Promise<void> {
    try {
      const qrContainer = document.getElementById('qrContainer')
      const qrCodeSection = document.getElementById('qrCodeSection')
      const qrDetails = document.getElementById('qrDetails')
      
      if (!qrContainer || !this.state.inboundAddress) return

      console.log('📱 Generating QR code for deposit...')

      // Show the QR code section
      if (qrCodeSection) {
        qrCodeSection.style.display = 'block'
      }

      // Import QR code library (should already be available from the project)
      const QRCode = (window as any).QRCode || (await import('qrcode')).default

      // Create QR code data based on the asset type
      const assetChain = this.state.selectedAsset!.split('.')[0]
      let qrCodeData = ''

      switch (assetChain) {
        case 'BTC':
          qrCodeData = `bitcoin:${this.state.inboundAddress}?amount=${amount}`
          break
        case 'ETH':
          qrCodeData = `ethereum:${this.state.inboundAddress}?value=${amount}`
          break
        case 'BSC':
          qrCodeData = `ethereum:${this.state.inboundAddress}@56?value=${amount}`
          break
        case 'BASE':
          qrCodeData = `ethereum:${this.state.inboundAddress}@8453?value=${amount}`
          break
        case 'LTC':
          qrCodeData = `litecoin:${this.state.inboundAddress}?amount=${amount}`
          break
        case 'BCH':
          qrCodeData = `bitcoincash:${this.state.inboundAddress}?amount=${amount}`
          break
        case 'DOGE':
          qrCodeData = `dogecoin:${this.state.inboundAddress}?amount=${amount}`
          break
        case 'AVAX':
          qrCodeData = `avalanche:${this.state.inboundAddress}?amount=${amount}`
          break
        case 'XRP':
          qrCodeData = `xrp:${this.state.inboundAddress}?amount=${amount}`
          break
        case 'GAIA':
          qrCodeData = `cosmos:${this.state.inboundAddress}?amount=${amount}`
          break
        case 'TRON':
          qrCodeData = `tron:${this.state.inboundAddress}?amount=${amount}`
          break
        default:
          // Generic format - log error as specified in docs
          console.error(`⚠️ Chain ${assetChain} not defined in QR code chain list`)
          qrCodeData = amount // Only encode amount if chain not recognized
          break
      }

      // Store QR code data
      this.state.qrCodeData = qrCodeData

      // Clear container
      qrContainer.innerHTML = ''

      // Generate QR code with better styling
      if (QRCode.toCanvas) {
        // Browser environment with canvas support
        const canvas = document.createElement('canvas')
        canvas.className = 'qr-canvas'
        
        await QRCode.toCanvas(canvas, qrCodeData, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
        
        qrContainer.appendChild(canvas)
      } else if (QRCode.toString) {
        // Fallback to SVG string
        const qrSvg = await QRCode.toString(qrCodeData, {
          type: 'svg',
          width: 200,
          margin: 1
        })
        
        qrContainer.innerHTML = qrSvg
      } else {
        throw new Error('QR code library not available')
      }

      // Update QR details section with deposit information
      if (qrDetails) {
        // Get network display name (just the chain name)
        const networkDisplay = this.getNetworkDisplayName(assetChain)
        
        qrDetails.innerHTML = `
          <div class="qr-info-grid">
            <div class="qr-info-item">
              <span class="info-label">Address:</span>
              <div class="info-value-with-copy">
                <code class="address-code">${this.truncateAddress(this.state.inboundAddress)}</code>
                <button class="copy-btn-small" onclick="navigator.clipboard.writeText('${this.state.inboundAddress}')" title="Copy address">
                  📋
                </button>
              </div>
            </div>
            
            <div class="qr-info-item">
              <span class="info-label">Amount:</span>
              <div class="info-value-with-copy">
                <code class="amount-code">${amount} ${this.state.selectedAsset}</code>
                <button class="copy-btn-small" onclick="navigator.clipboard.writeText('${amount}')" title="Copy amount">
                  📋
                </button>
              </div>
            </div>
            
            <div class="qr-info-item">
              <span class="info-label">Network:</span>
              <span class="network-badge">${networkDisplay}</span>
            </div>
          </div>
          
          <div class="qr-instructions">
            <p>Scan this QR code with your wallet app or manually copy the details above</p>
          </div>
        `
      }

      console.log('✅ QR code generated successfully')

    } catch (error) {
      console.error('❌ Failed to generate QR code:', error)
      
      const qrContainer = document.getElementById('qrContainer')
      if (qrContainer) {
        qrContainer.innerHTML = `
          <div class="qr-error">
            <div class="error-icon">❌</div>
            <p>Failed to generate QR code</p>
            <small>Use the manual details below</small>
          </div>
        `
      }
    }
  }

  private getNetworkDisplayName(chain: string): string {
    const networkMap: { [key: string]: string } = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum', 
      'BSC': 'BNB Smart Chain',
      'BASE': 'Base',
      'LTC': 'Litecoin',
      'BCH': 'Bitcoin Cash',
      'DOGE': 'Dogecoin',
      'AVAX': 'Avalanche',
      'XRP': 'XRP Ledger',
      'GAIA': 'Cosmos Hub',
      'BNB': 'BNB Beacon Chain',
      'ATOM': 'Cosmos Hub'
    }
    
    return networkMap[chain] || chain
  }

  private truncateAddress(address: string): string {
    if (address.length <= 20) return address
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  private showTrackingDialog(): void {
    console.log('🔍 Opening transaction tracking dialog...')
    
    // Create or find overlay container
    let overlayContainer = document.getElementById('global-overlay-container')
    if (!overlayContainer) {
      overlayContainer = document.createElement('div')
      overlayContainer.id = 'global-overlay-container'
      overlayContainer.style.position = 'fixed'
      overlayContainer.style.top = '0'
      overlayContainer.style.left = '0'
      overlayContainer.style.width = '100%'
      overlayContainer.style.height = '100%'
      overlayContainer.style.zIndex = '10000'
      overlayContainer.style.display = 'none'
      document.body.appendChild(overlayContainer)
    }

    // Create tracking dialog
    overlayContainer.innerHTML = `
      <div class="tracking-dialog-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
      ">
        <div class="tracking-dialog" style="
          background: var(--background, #1a1a1a);
          border: 1px solid var(--border, #333);
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        ">
          <div class="dialog-header" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--border, #333);
            padding-bottom: 15px;
          ">
            <h3 style="margin: 0; color: var(--text, #fff);">🔍 Track Your Deposit</h3>
            <button id="closeTrackingBtn" style="
              background: none;
              border: none;
              color: var(--text-secondary, #999);
              font-size: 24px;
              cursor: pointer;
            ">×</button>
          </div>
          
          <div class="dialog-content">
            <div style="margin-bottom: 20px;">
              <p style="color: var(--text-secondary, #999); margin-bottom: 15px;">
                Enter your deposit transaction hash to track its status:
              </p>
              
              <div class="form-section">
                <input 
                  type="text" 
                  id="trackingTxInput" 
                  placeholder="Enter transaction hash..." 
                  style="
                    width: 100%;
                    padding: 12px;
                    border: 1px solid var(--border, #333);
                    border-radius: 6px;
                    background: var(--input-bg, #2a2a2a);
                    color: var(--text, #fff);
                    font-family: monospace;
                    margin-bottom: 15px;
                  "
                />
                
                <div class="tracking-actions" style="display: flex; gap: 10px;">
                  <button id="trackTransactionBtn" class="btn btn-primary" style="flex: 1;">
                    🔍 Track Transaction
                  </button>
                  <button id="viewExplorerBtn" class="btn btn-secondary" style="flex: 1;" disabled>
                    🌐 View in Explorer
                  </button>
                </div>
              </div>
            </div>
            
            <div id="trackingResults" style="display: none;">
              <!-- Results will be populated here -->
            </div>
            
            <div class="tracking-info" style="
              background: var(--info-bg, #1a2b42);
              border: 1px solid var(--info-border, #2563eb);
              border-radius: 6px;
              padding: 15px;
              margin-top: 20px;
            ">
              <h4 style="margin: 0 0 10px 0; color: var(--info, #3b82f6);">💡 Tracking Tips</h4>
              <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary, #999);">
                <li>Transactions may take 5-10 minutes to appear</li>
                <li>Check your wallet for the transaction hash</li>
                <li>Deposits are processed automatically once confirmed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `

    // Show overlay
    overlayContainer.style.display = 'flex'

    // Setup event listeners
    this.setupTrackingDialogListeners()
  }

  private setupTrackingDialogListeners(): void {
    const closeBtn = document.getElementById('closeTrackingBtn')
    const trackBtn = document.getElementById('trackTransactionBtn')
    const viewExplorerBtn = document.getElementById('viewExplorerBtn')
    const txInput = document.getElementById('trackingTxInput') as HTMLInputElement

    closeBtn?.addEventListener('click', () => this.closeTrackingDialog())
    trackBtn?.addEventListener('click', () => this.trackUserTransaction())
    viewExplorerBtn?.addEventListener('click', () => this.openExplorer())

    // Track on Enter key
    txInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.trackUserTransaction()
      }
    })

    // Enable explorer button when hash is entered
    txInput?.addEventListener('input', () => {
      const hash = txInput.value.trim()
      if (viewExplorerBtn) {
        (viewExplorerBtn as HTMLButtonElement).disabled = !hash
      }
    })

    // Close on overlay click
    const overlay = document.querySelector('.tracking-dialog-overlay')
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeTrackingDialog()
      }
    })
  }

  private async trackUserTransaction(): Promise<void> {
    const txInput = document.getElementById('trackingTxInput') as HTMLInputElement
    const resultsDiv = document.getElementById('trackingResults')
    
    const txHash = txInput?.value?.trim()
    
    if (!txHash) {
      alert('Please enter a transaction hash')
      return
    }

    try {
      if (resultsDiv) {
        resultsDiv.innerHTML = '<div class="loading-state">🔄 Tracking transaction...</div>'
        resultsDiv.style.display = 'block'
      }

      const txDetails = await this.backend.trackTransaction(txHash)
      
      if (resultsDiv) {
        if (txDetails) {
          resultsDiv.innerHTML = `
            <div class="tracking-success">
              <h4>✅ Transaction Found</h4>
              <div class="tx-details">
                <div class="detail-row">
                  <span>Status:</span>
                  <span class="status-${txDetails.code === 0 ? 'success' : 'error'}">
                    ${txDetails.code === 0 ? '✅ Confirmed' : '❌ Failed'}
                  </span>
                </div>
                <div class="detail-row">
                  <span>Hash:</span>
                  <span class="mono">${txHash}</span>
                </div>
                ${txDetails.height ? `
                  <div class="detail-row">
                    <span>Block Height:</span>
                    <span>${txDetails.height}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `
        } else {
          resultsDiv.innerHTML = `
            <div class="tracking-error">
              <h4>❌ Transaction Not Found</h4>
              <p>The transaction may still be pending or the hash is incorrect.</p>
            </div>
          `
        }
      }

    } catch (error) {
      console.error('❌ Failed to track transaction:', error)
      
      if (resultsDiv) {
        resultsDiv.innerHTML = `
          <div class="tracking-error">
            <h4>❌ Tracking Error</h4>
            <p>Failed to track transaction: ${(error as Error).message}</p>
          </div>
        `
      }
    }
  }

  private openExplorer(): void {
    const txInput = document.getElementById('trackingTxInput') as HTMLInputElement
    const txHash = txInput?.value?.trim()
    
    if (!txHash) return

    const network = this.walletData?.network || 'mainnet'
    const explorerUrl = network === 'mainnet' 
      ? `https://viewblock.io/thorchain/tx/${txHash}`
      : `https://viewblock.io/thorchain-testnet/tx/${txHash}`

    window.open(explorerUrl, '_blank')
  }

  private closeTrackingDialog(): void {
    const overlayContainer = document.getElementById('global-overlay-container')
    if (overlayContainer) {
      overlayContainer.style.display = 'none'
      overlayContainer.innerHTML = ''
    }
  }

  // New UI functionality methods
  private toggleUnit(): void {
    const assetOption = document.getElementById('assetOption')
    const usdOption = document.getElementById('usdOption')
    const assetDisplay = document.getElementById('assetDisplay')

    if (this.displayUnit === 'asset') {
      this.displayUnit = 'usd'
      assetOption?.classList.remove('active')
      usdOption?.classList.add('active')
      if (assetDisplay) assetDisplay.textContent = 'USD'
    } else {
      this.displayUnit = 'asset'
      usdOption?.classList.remove('active')
      assetOption?.classList.add('active')
      if (assetDisplay) assetDisplay.textContent = this.state.selectedAsset?.split('.')[1] || 'ASSET'
    }

    // Recalculate amount based on new unit
    this.calculateValidAmountCompact()
  }

  private copyToClipboard(text: string, successMessage: string): void {
    if (!text) return

    navigator.clipboard.writeText(text).then(() => {
      console.log(`📋 ${successMessage}`, text)
      // Could show a toast notification here if desired
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err)
    })
  }

  private updateAddressDisplay(): void {
    const fullAddress = document.getElementById('fullAddress') as HTMLInputElement
    const realCopyAddressBtn = document.getElementById('realCopyAddressBtn')

    if (fullAddress) {
      if (this.state.inboundAddress) {
        fullAddress.value = this.state.inboundAddress // Show FULL address in input
      } else {
        fullAddress.value = 'Loading address...'
      }
    }

    if (realCopyAddressBtn) {
      if (this.state.inboundAddress) {
        (realCopyAddressBtn as HTMLButtonElement).disabled = false
        realCopyAddressBtn.style.opacity = '1'
      } else {
        (realCopyAddressBtn as HTMLButtonElement).disabled = true
        realCopyAddressBtn.style.opacity = '0.5'
      }
    }
  }

  private copyWithFeedback(text: string, button: HTMLElement, successMessage: string): void {
    if (!text) return

    navigator.clipboard.writeText(text).then(() => {
      console.log(`📋 ${successMessage}`, text)
      
      // Update button with feedback
      const copyIcon = button.querySelector('.copy-icon')
      const copyText = button.querySelector('.copy-text')
      
      if (copyIcon && copyText) {
        copyIcon.textContent = '✅'
        copyText.textContent = 'Copied!'
        button.style.background = 'var(--success)'
        button.style.color = 'white'
        
        setTimeout(() => {
          copyIcon.textContent = '📋'
          copyText.textContent = 'Copy'
          button.style.background = ''
          button.style.color = ''
        }, 2000)
      }
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err)
      
      const copyText = button.querySelector('.copy-text')
      if (copyText) {
        copyText.textContent = 'Failed'
        button.style.background = 'var(--error)'
        button.style.color = 'white'
        
        setTimeout(() => {
          copyText.textContent = 'Copy'
          button.style.background = ''
          button.style.color = ''
        }, 2000)
      }
    })
  }




  // New compact methods for professional layout

  private copyCompactFeedback(text: string, button: HTMLElement, successMessage: string): void {
    if (!text) return

    navigator.clipboard.writeText(text).then(() => {
      console.log(`📋 ${successMessage}`, text)
      
      // Update just the icon for compact feedback
      const copyIcon = button.querySelector('.copy-icon')
      
      if (copyIcon) {
        const originalIcon = copyIcon.textContent
        copyIcon.textContent = '✅'
        button.style.background = 'var(--success, #22c55e)'
        button.style.color = 'white'
        
        setTimeout(() => {
          copyIcon.textContent = originalIcon
          button.style.background = ''
          button.style.color = ''
        }, 1500)
      }
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err)
      
      const copyIcon = button.querySelector('.copy-icon')
      if (copyIcon) {
        const originalIcon = copyIcon.textContent
        copyIcon.textContent = '❌'
        button.style.background = 'var(--error, #ef4444)'
        button.style.color = 'white'
        
        setTimeout(() => {
          copyIcon.textContent = originalIcon
          button.style.background = ''
          button.style.color = ''
        }, 1500)
      }
    })
  }

  private async calculateValidAmountCompact(): Promise<void> {
    try {
      const userAmountInput = document.getElementById('userAmountInput') as HTMLInputElement

      if (!userAmountInput) return

      const userInput = userAmountInput.value.trim()

      if (!userInput || parseFloat(userInput) <= 0) {
        this.updateCompactDisplay('', '', '', false)
        return
      }

      // USD minimum validation ($0.01 minimum)
      if (this.displayUnit === 'usd' && parseFloat(userInput) < 0.01) {
        this.updateCompactDisplay('', '', 'Minimum USD amount is $0.01', false)
        return
      }

      if (!this.state.referenceId || !this.state.selectedAsset || !this.state.registrationData) {
        this.updateCompactDisplay('', '', 'Missing reference data', false)
        return
      }

      // Convert USD to asset amount if needed
      let assetAmountInput = userInput
      if (this.displayUnit === 'usd' && this.state.assetPrice > 0) {
        assetAmountInput = (parseFloat(userInput) / this.state.assetPrice).toString()
      }

      console.log('💰 Starting compact amount calculation:', {
        userInput,
        displayUnit: this.displayUnit,
        assetAmountInput,
        referenceId: this.state.referenceId,
        selectedAsset: this.state.selectedAsset
      })

      // Format amount with reference using direct IPC
      const formatResult = await this.backend.memolessFormatAmountWithReference(
        assetAmountInput,
        this.state.referenceId,
        this.state.assetDecimals
      )

      if (!formatResult.isValid) {
        this.stopValidationRefresh()
        this.updateCompactDisplay('', '', `${formatResult.errors.join(', ')}`, false)
        return
      }

      const finalAmount = formatResult.finalAmount

      // Calculate USD equivalent if price is available
      let usdEquivalent = '0.00'
      if (this.state.assetPrice > 0) {
        const usdResult = await this.backend.memolessCalculateUSD(finalAmount, this.state.assetPrice)
        usdEquivalent = usdResult || '0.00'
      }
      
      // Step 7 validation: Validate memo registration with amount
      console.log('🔍 Validating memo registration with amount...')
      const validationResult = await this.backend.memolessValidateAmountForDeposit(
        this.state.selectedAsset,
        finalAmount,
        this.state.assetDecimals,
        this.state.registrationData.memo,
        this.state.referenceId
      )

      if (!validationResult.isValid) {
        console.error('❌ Memo validation failed:', validationResult.errors)
        this.stopValidationRefresh()
        this.updateCompactDisplay('', '', `Validation failed: ${validationResult.errors.join(', ')}`, false)
        return
      }

      console.log('✅ Memo validation successful:', validationResult.memoCheck)

      // Store the valid amount and validation data
      this.state.validAmount = finalAmount
      this.state.validationData = validationResult.memoCheck

      // Update all UI elements
      this.updateCompactDisplay(finalAmount, usdEquivalent, '', true)

      // Generate QR code
      await this.generateDepositQRCode(finalAmount)

      // Start validation refresh timer
      this.startValidationRefresh()

      console.log('✅ Compact amount validation successful:', {
        userInput: `${userInput} ${this.displayUnit}`,
        finalAmount: finalAmount,
        equivalentUSD: usdEquivalent
      })

    } catch (error) {
      console.error('❌ Failed to calculate valid amount:', error)
      this.updateCompactDisplay('', '', `Error: ${(error as Error).message}`, false)
    }
  }

  private updateCompactDisplay(finalAmount: string, usdEquivalent: string, errorMessage: string, isValid: boolean): void {
    // Update amount prefix based on display unit
    const amountPrefix = document.getElementById('amountPrefix')
    const unitToggle = document.getElementById('unitToggle') as HTMLSelectElement
    
    if (amountPrefix && unitToggle) {
      const currentUnit = unitToggle.value
      amountPrefix.textContent = currentUnit === 'usd' ? '$' : (this.state.selectedAsset?.split('.')[1] || '')
    }

    // Update network and asset display
    const networkAndAsset = document.getElementById('networkAndAsset')
    if (networkAndAsset && this.state.selectedAsset) {
      const parts = this.state.selectedAsset.split('.')
      networkAndAsset.textContent = `${parts[1]} on ${parts[0]}`
    }

    // Update reference number display
    const referenceNumber = document.getElementById('referenceNumber')
    if (referenceNumber && this.state.referenceId) {
      referenceNumber.textContent = this.state.referenceId
    }

    // Update Final Amount emphasized section
    const finalAmountDisplay = document.getElementById('finalAmountDisplay')
    const finalAmountUSD = document.getElementById('finalAmountUSD')

    if (finalAmountDisplay) {
      if (isValid && finalAmount) {
        // Valid amount - show final amount with asset
        const formattedAmount = parseFloat(finalAmount).toFixed(8).replace(/\.?0+$/, '')
        const assetSymbol = this.state.selectedAsset?.split('.')[1] || 'ASSET'
        finalAmountDisplay.textContent = `${formattedAmount} ${assetSymbol}`
        finalAmountDisplay.style.color = 'var(--accent-primary, #007bff)' // Blue for valid
      } else if (errorMessage) {
        // Error - show error message
        finalAmountDisplay.textContent = errorMessage
        finalAmountDisplay.style.color = 'var(--error, #ef4444)' // Red for errors
      } else {
        // Empty state
        finalAmountDisplay.textContent = '-'
        finalAmountDisplay.style.color = 'var(--text-secondary, #999)'
      }
    }

    // USD equivalent - only show if valid
    if (finalAmountUSD) {
      if (isValid && finalAmount && usdEquivalent && parseFloat(usdEquivalent) > 0) {
        finalAmountUSD.textContent = `$${usdEquivalent} USD`
        finalAmountUSD.style.display = 'block'
      } else {
        finalAmountUSD.textContent = ''
        finalAmountUSD.style.display = 'none'
      }
    }

    // Show/hide transaction details container based on valid amount
    const transactionDetailsContainer = document.getElementById('transactionDetailsContainer')
    if (transactionDetailsContainer) {
      if (isValid && finalAmount) {
        transactionDetailsContainer.style.display = 'block'
        // Generate QR code when details become visible using the working logic
        setTimeout(() => this.generateDepositQRCode(finalAmount), 50)
      } else {
        transactionDetailsContainer.style.display = 'none'
      }
    }

    // Update transaction details section
    const exactAmount = document.getElementById('exactAmount') as HTMLInputElement
    const realCopyAmountBtn = document.getElementById('realCopyAmountBtn')

    if (exactAmount) {
      if (isValid && finalAmount) {
        const formattedAmount = parseFloat(finalAmount).toFixed(8).replace(/\.?0+$/, '')
        exactAmount.value = formattedAmount
      } else {
        exactAmount.value = '-'
      }
    }

    // Enable/disable copy buttons
    if (realCopyAmountBtn) {
      if (isValid && finalAmount) {
        (realCopyAmountBtn as HTMLButtonElement).disabled = false
        realCopyAmountBtn.style.opacity = '1'
      } else {
        (realCopyAmountBtn as HTMLButtonElement).disabled = true
        realCopyAmountBtn.style.opacity = '0.5'
      }
    }

    // Update usage statistics and expiry time
    this.updateUsageAndExpiryInfo(isValid && !!finalAmount)

    // Update address display
    this.updateAddressDisplay()
  }

  private async updateUsageAndExpiryInfo(isValid: boolean): Promise<void> {
    const usageStats = document.getElementById('usageStats')
    const usageCompact = document.getElementById('usageCompact')
    const expiryCompact = document.getElementById('expiryCompact')

    if (!isValid || !this.state.validationData) {
      // Clear displays when not valid
      if (usageStats) usageStats.textContent = 'Loading...'
      if (usageCompact) usageCompact.textContent = 'Loading...'
      if (expiryCompact) expiryCompact.textContent = 'Loading...'
      return
    }

    try {
      // Re-validate to get fresh usage count and expiry data
      await this.refreshValidationData()
      
      const validation = this.state.validationData
      
      // Update usage statistics
      const usageText = `${validation.usage_count}/${validation.max_use}`
      if (usageStats) {
        usageStats.innerHTML = `<span class="usage-text">Used ${validation.usage_count} of ${validation.max_use} times</span>`
      }
      if (usageCompact) {
        usageCompact.innerHTML = `<span class="usage-compact-text">${usageText}</span>`
      }

      // Calculate and update expiry time
      if (validation.expires_at) {
        const expiryResult = await this.backend.memolessGetExpiryEstimate(validation.expires_at)
        
        if (expiryResult && expiryResult.timeRemaining) {
          let timeDisplay = expiryResult.timeRemaining
          let colorClass = 'time-good'
          
          // Color coding based on time remaining
          if (timeDisplay === 'Expired') {
            colorClass = 'time-expired'
          } else if (timeDisplay.endsWith('m') || timeDisplay === '<1m') {
            colorClass = 'time-urgent'
          } else if (timeDisplay.endsWith('h') && parseInt(timeDisplay) < 2) {
            colorClass = 'time-warning'
          }
          
          if (expiryCompact) {
            expiryCompact.innerHTML = `<span class="${colorClass}">~${timeDisplay}</span>`
          }
        } else {
          if (expiryCompact) expiryCompact.innerHTML = '<span class="time-unknown">Unknown</span>'
        }
      }
    } catch (error) {
      console.error('Error updating usage and expiry info:', error)
      if (usageStats) usageStats.textContent = 'Error loading stats'
      if (usageCompact) usageCompact.textContent = 'Error'
      if (expiryCompact) expiryCompact.textContent = 'Error'
    }
  }

  private async refreshValidationData(): Promise<void> {
    if (!this.state.selectedAsset || !this.state.validAmount || !this.state.registrationData) {
      return
    }

    try {
      console.log('🔄 Refreshing validation data...')
      const validationResult = await this.backend.memolessValidateAmountForDeposit(
        this.state.selectedAsset,
        this.state.validAmount,
        this.state.assetDecimals,
        this.state.registrationData.memo,
        this.state.referenceId || ''
      )

      if (validationResult.isValid) {
        this.state.validationData = validationResult.memoCheck
        console.log('✅ Validation data refreshed:', validationResult.memoCheck)
      }
    } catch (error) {
      console.error('❌ Error refreshing validation data:', error)
    }
  }

  private validationRefreshInterval: NodeJS.Timeout | null = null

  private startValidationRefresh(): void {
    // Clear existing interval
    if (this.validationRefreshInterval) {
      clearInterval(this.validationRefreshInterval)
    }

    // Start new interval every 15 seconds
    this.validationRefreshInterval = setInterval(async () => {
      if (this.state.validAmount && this.state.validationData) {
        console.log('⏰ Periodic validation refresh...')
        await this.updateUsageAndExpiryInfo(true)
      }
    }, 15000) // 15 seconds

    console.log('⏰ Started validation refresh timer (15s interval)')
  }

  private stopValidationRefresh(): void {
    if (this.validationRefreshInterval) {
      clearInterval(this.validationRefreshInterval)
      this.validationRefreshInterval = null
      console.log('⏹️ Stopped validation refresh timer')
    }
  }
}