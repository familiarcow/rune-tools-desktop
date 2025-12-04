/**
 * Wallet Tab Component
 * 
 * Implements the main wallet interface as specified in Architecture.md:
 * - Portfolio summary with USD values
 * - Three-tier asset display (THOR Native, Secured, Trade)
 * - Real-time balance updates
 * - Quick actions (Send, Receive, Copy Address)
 */

import { BackendService } from '../services/BackendService'
import { SendTransaction, SendTransactionData, AssetBalance as SendAssetBalance } from './SendTransaction'
import { ReceiveTransaction, ReceiveTransactionData } from './ReceiveTransaction'
import { WithdrawDialog, WithdrawDialogData, WithdrawFormData } from './WithdrawDialog'
import { AssetService } from '../../services/assetService'
import { IdenticonService } from '../../services/IdenticonService'
import { BondService, UserBondData } from '../../services/bondService'
import { LpService } from '../services/LpService'

export interface WalletTabData {
    walletId: string
    name: string
    address: string
    network: 'mainnet' | 'stagenet'
    balances: AssetBalance[]
    portfolioSummary: PortfolioSummary
}

export interface AssetBalance {
    asset: string
    chain: string
    tier: 'thor-native' | 'secured' | 'trade'
    balance: string
    usdValue: number
    price?: number
}

export interface PortfolioSummary {
    walletUsdValue: number  // Renamed from totalUsdValue
    bondUsdValue: number    // New: Total bond value in USD
    tcyUsdValue: number     // New: Total TCY staking value in USD
    lpUsdValue: number      // New: Total LP value in USD  
    totalUsdValue: number   // New: Combined wallet + bond + tcy + lp value
    thorNativeValue: number
    securedValue: number
    tradeValue: number
    change24h?: number
}

export class WalletTab {
    private container: HTMLElement
    private backend: BackendService
    private bondService: BondService
    private lpService: LpService
    private walletData: WalletTabData | null = null
    private refreshInterval: NodeJS.Timeout | null = null
    private sendTransaction: SendTransaction | null = null
    private receiveTransaction: ReceiveTransaction | null = null
    private withdrawDialog: WithdrawDialog | null = null
    private collapsedSections: Set<string> = new Set() // Sections start expanded, collapse only if empty

    constructor(container: HTMLElement, backend: BackendService) {
        this.container = container
        this.backend = backend
        this.bondService = new BondService('mainnet') // Will be updated based on network
        this.lpService = LpService.getInstance()
        
        // Initialize withdraw dialog
        const withdrawContainer = document.getElementById('withdraw-dialog-container')
        if (withdrawContainer) {
            this.withdrawDialog = new WithdrawDialog(withdrawContainer, this.backend)
        }
    }

    async initialize(wallet: any, network: 'mainnet' | 'stagenet'): Promise<void> {
        try {
            console.log('🏦 Initializing WalletTab...', { wallet: wallet.name, network })
            
            // Set network for bond service
            this.bondService.setNetwork(network)
            
            // Initialize asset logo styles
            AssetService.initializeStyles()
            
            // Initialize wallet data structure
            this.walletData = {
                walletId: wallet.walletId,
                name: wallet.name,
                address: network === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress,
                network,
                balances: [],
                portfolioSummary: {
                    walletUsdValue: 0,
                    bondUsdValue: 0,
                    tcyUsdValue: 0,
                    lpUsdValue: 0,
                    totalUsdValue: 0,
                    thorNativeValue: 0,
                    securedValue: 0,
                    tradeValue: 0
                }
            }

            // Render initial UI
            this.render()
            
            // Load wallet data
            await this.loadWalletData()
            
            console.log('✅ WalletTab initialized')
        } catch (error) {
            console.error('❌ Failed to initialize WalletTab:', error)
            throw error
        }
    }

    private render(): void {
        if (!this.walletData) return

        this.container.innerHTML = `
            <div class="wallet-tab">
                <!-- Compact Portfolio Header -->
                <div class="wallet-portfolio-compact">
                    <div class="wallet-portfolio-info">
                        <div class="wallet-portfolio-info-row">
                            <div class="wallet-portfolio-identicon">
                                <div id="portfolio-wallet-identicon" class="identicon-placeholder">
                                    ${this.walletData.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div class="wallet-portfolio-details">
                                <span class="wallet-portfolio-name">${this.walletData.name}</span>
                                <div class="wallet-portfolio-address-row">
                                    <span class="wallet-portfolio-address">${this.walletData.address}</span>
                                    <button class="btn-icon wallet-portfolio-copy-btn" id="copy-address-btn" title="Copy Address">📋</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="wallet-portfolio-total">
                        <div class="wallet-portfolio-value-label">Portfolio</div>
                        <div class="wallet-portfolio-value-amount" id="total-usd-value">$0.00</div>
                    </div>
                    <div class="wallet-portfolio-breakdown">
                        <div class="portfolio-column">
                            <div class="portfolio-item">
                                <span class="portfolio-item-label">Wallet:</span>
                                <span class="portfolio-item-value" id="wallet-usd-value">$0.00</span>
                            </div>
                            <div class="portfolio-item">
                                <span class="portfolio-item-label">Bond:</span>
                                <span class="portfolio-item-value" id="bond-usd-value">$0.00</span>
                            </div>
                        </div>
                        <div class="portfolio-column">
                            <div class="portfolio-item">
                                <span class="portfolio-item-label">TCY:</span>
                                <span class="portfolio-item-value" id="tcy-usd-value">$0.00</span>
                            </div>
                            <div class="portfolio-item">
                                <span class="portfolio-item-label">LP:</span>
                                <span class="portfolio-item-value" id="lp-usd-value">$0.00</span>
                            </div>
                        </div>
                    </div>
                    <div class="wallet-portfolio-actions">
                        <button class="btn btn-primary" id="receive-btn">📥 Receive</button>
                        <button class="btn btn-secondary" id="send-btn">📤 Send</button>
                    </div>
                </div>

                <!-- Asset Tiers -->
                <div class="asset-tiers">
                    <!-- THOR Native Assets -->
                    <div class="asset-tier">
                        <div class="tier-header">
                            <h4>⚡ THOR Native Assets</h4>
                            <span class="tier-value" id="thor-native-value">$0.00</span>
                        </div>
                        <div class="asset-list" id="thor-native-assets">
                            <div class="loading-state">
                                <span>🔄 Loading THOR native assets...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Secured Assets -->
                    <div class="asset-tier" id="secured-assets-tier">
                        <div class="tier-header" data-tier="secured">
                            <div class="tier-header-left">
                                <button class="collapse-btn" id="secured-collapse-btn" title="Toggle secured assets">▼</button>
                                <h4>🔒 Secured Assets</h4>
                            </div>
                            <span class="tier-value" id="secured-value">$0.00</span>
                        </div>
                        <div class="asset-list" id="secured-assets">
                            <div class="loading-state">
                                <span>🔄 Loading secured assets...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Trade Assets -->
                    <div class="asset-tier" id="trade-assets-tier">
                        <div class="tier-header" data-tier="trade">
                            <div class="tier-header-left">
                                <button class="collapse-btn" id="trade-collapse-btn" title="Toggle trade assets">▼</button>
                                <h4>💱 Trade Assets</h4>
                            </div>
                            <span class="tier-value" id="trade-value">$0.00</span>
                        </div>
                        <div class="asset-list" id="trade-assets">
                            <div class="loading-state">
                                <span>🔄 Loading trade assets...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Refresh Controls -->
                <div class="refresh-controls">
                    <button class="btn btn-secondary" id="refresh-balances-btn">
                        🔄 Refresh Balances
                    </button>
                    <span class="last-updated" id="last-updated">
                        Last updated: Never
                    </span>
                </div>
            </div>
        `

        this.setupEventListeners()
        this.generatePortfolioIdenticon()
    }

    private generatePortfolioIdenticon(): void {
        if (!this.walletData) return

        // Use setTimeout to ensure DOM elements are fully rendered
        setTimeout(() => {
            try {
                // Use the wallet address as the identicon seed for consistency with header
                const identiconValue = this.walletData!.address;
                IdenticonService.renderToElement('portfolio-wallet-identicon', identiconValue, 40);
            } catch (error) {
                console.warn('Failed to generate portfolio identicon:', error);
                // Fallback: keep the text placeholder
            }
        }, 10);
    }

    private setupEventListeners(): void {
        // Copy address button
        const copyBtn = this.container.querySelector('#copy-address-btn')
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyAddress())
        }

        // Quick action buttons
        const receiveBtn = this.container.querySelector('#receive-btn')
        if (receiveBtn) {
            receiveBtn.addEventListener('click', () => this.showReceiveDialog())
        }

        const sendBtn = this.container.querySelector('#send-btn')
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.showSendDialog())
        }

        // Refresh button
        const refreshBtn = this.container.querySelector('#refresh-balances-btn')
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData())
        }

        // Collapse buttons
        const securedCollapseBtn = this.container.querySelector('#secured-collapse-btn')
        if (securedCollapseBtn) {
            securedCollapseBtn.addEventListener('click', () => this.toggleSection('secured'))
        }

        const tradeCollapseBtn = this.container.querySelector('#trade-collapse-btn')
        if (tradeCollapseBtn) {
            tradeCollapseBtn.addEventListener('click', () => this.toggleSection('trade'))
        }

        // Withdraw button event delegation (for dynamically added buttons)
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement
            
            if (target.classList.contains('wallet-asset-withdraw-btn')) {
                const asset = target.getAttribute('data-asset')
                const balance = target.getAttribute('data-balance')
                const tier = target.getAttribute('data-tier') as 'trade' | 'secured'
                
                if (asset && balance && tier) {
                    this.showWithdrawDialog(asset, balance, tier)
                }
            }
            
            // Also check for clicks on child elements (icon/text spans)
            const parentBtn = target.closest('.wallet-asset-withdraw-btn')
            if (parentBtn && !target.classList.contains('wallet-asset-withdraw-btn')) {
                const asset = parentBtn.getAttribute('data-asset')
                const balance = parentBtn.getAttribute('data-balance')
                const tier = parentBtn.getAttribute('data-tier') as 'trade' | 'secured'
                
                if (asset && balance && tier) {
                    this.showWithdrawDialog(asset, balance, tier)
                }
            }
        })
    }

    private async loadWalletData(): Promise<void> {
        try {
            if (!this.walletData) return

            console.log('🔄 Loading wallet data for', this.walletData.address)

            // Load balances from multiple sources including bonds
            const [balances, normalizedBalances, tradeAccount, bondData] = await Promise.allSettled([
                this.backend.getBalances(this.walletData.address),
                this.backend.getNormalizedBalances(this.walletData.address),
                this.backend.getTradeAccount(this.walletData.address),
                this.bondService.fetchUserBonds(this.walletData.address)
            ])

            // Process and categorize assets
            await this.processBalanceData(balances, normalizedBalances, tradeAccount)
            
            // Process bond data
            await this.processBondData(bondData)
            
            // Process TCY data
            await this.processTcyData()
            
            // Process LP data
            await this.processLpData()
            
            // Update UI
            this.updatePortfolioSummary()
            this.updateAssetTiers()
            this.updateLastUpdated()

            console.log('✅ Wallet data loaded:', this.walletData.portfolioSummary)
        } catch (error) {
            console.error('❌ Failed to load wallet data:', error)
            this.showError('Failed to load wallet data: ' + (error as Error).message)
        }
    }

    private async processBalanceData(
        balances: PromiseSettledResult<any>,
        normalizedBalances: PromiseSettledResult<any>,
        tradeAccount: PromiseSettledResult<any>
    ): Promise<void> {
        if (!this.walletData) return

        const processedBalances: AssetBalance[] = []
        let totalUsd = 0

        // Use normalized balances as primary source (they're already enriched with proper formatting)
        if (normalizedBalances.status === 'fulfilled' && normalizedBalances.value) {
            console.log('🔍 Processing normalized balances (primary):', normalizedBalances.value)
            
            // Extract the actual balance array from the normalized response
            const normalizedArray = normalizedBalances.value.balances || 
                                   (Array.isArray(normalizedBalances.value) ? normalizedBalances.value : [normalizedBalances.value])
            
            if (Array.isArray(normalizedArray)) {
                console.log('📊 Detailed normalized balances inspection:', normalizedArray)
                
                for (const balance of normalizedArray) {
                    const assetName = this.extractAssetName(balance)
                    const assetType = this.getAssetType(assetName)
                    
                    console.log('🔍 Balance classification:', {
                        balance: balance,
                        extractedAssetName: assetName,
                        assetType: assetType
                    })
                    
                    // Skip deprecated synthetic assets
                    if (assetType === 'synthetic') {
                        console.log('🚫 Skipping deprecated synthetic asset:', assetName)
                        continue
                    }
                    
                    const assetBalance = await this.createAssetBalance(balance, assetType)
                    processedBalances.push(assetBalance)
                    totalUsd += assetBalance.usdValue
                }
            } else {
                console.warn('⚠️ Normalized balances is not an array:', typeof normalizedArray, normalizedArray)
            }
        } else if (normalizedBalances.status === 'rejected') {
            console.warn('⚠️ Normalized balances failed to load:', normalizedBalances.reason)
        }

        // Process trade account balances
        if (tradeAccount.status === 'fulfilled' && tradeAccount.value) {
            for (const balance of tradeAccount.value.balances || []) {
                const assetBalance = await this.createAssetBalance(balance, 'trade')
                processedBalances.push(assetBalance)
                totalUsd += assetBalance.usdValue
            }
        }

        this.walletData.balances = processedBalances
        this.walletData.portfolioSummary.walletUsdValue = totalUsd
        this.calculateTierValues()
    }

    private async processBondData(bondResult: PromiseSettledResult<UserBondData | null>): Promise<void> {
        if (!this.walletData) return

        let bondUsdValue = 0

        if (bondResult.status === 'fulfilled' && bondResult.value) {
            const bondData = bondResult.value
            console.log('💎 Processing bond data:', bondData)

            // Convert total bond from base units to RUNE
            const totalBondRune = bondData.totalBond / 1e8

            // Get RUNE price to calculate USD value
            const runePrice = await this.getRunePrice()
            bondUsdValue = totalBondRune * runePrice

            console.log('💰 Bond value calculation:', {
                totalBondBaseUnits: bondData.totalBond,
                totalBondRune,
                runePrice,
                bondUsdValue
            })
        } else if (bondResult.status === 'rejected') {
            console.warn('⚠️ Bond data failed to load:', bondResult.reason)
        } else {
            console.log('ℹ️ No bond data available (user not bonded)')
        }

        this.walletData.portfolioSummary.bondUsdValue = bondUsdValue
        // Note: totalUsdValue will be calculated in updatePortfolioSummary() to include all components
    }

    private async processTcyData(): Promise<void> {
        if (!this.walletData) return
        
        console.log('🏦 Loading TCY staking data for', this.walletData.address)
        
        try {
            // Get TCY staking balance and prices
            const [stakedBalance, tcyPrice] = await Promise.allSettled([
                this.fetchTcyStakedBalance(),
                this.fetchTcyPrice()
            ])
            
            let tcyUsdValue = 0
            
            if (stakedBalance.status === 'fulfilled' && tcyPrice.status === 'fulfilled') {
                const stakedAmount = parseFloat(stakedBalance.value)
                const price = tcyPrice.value
                
                tcyUsdValue = stakedAmount * price
                console.log('🏦 TCY Staking:', { stakedAmount, price, usdValue: tcyUsdValue })
            } else {
                console.log('ℹ️ No TCY staking data available or price unavailable')
            }
            
            this.walletData.portfolioSummary.tcyUsdValue = tcyUsdValue
            
        } catch (error) {
            console.error('❌ Error loading TCY data:', error)
            this.walletData.portfolioSummary.tcyUsdValue = 0
        }
    }

    private async processLpData(): Promise<void> {
        if (!this.walletData) return
        
        console.log('🏊‍♂️ Loading LP data for', this.walletData.address)
        
        try {
            // Get RUNE price for LP USD calculations
            const runePrice = await this.getRunePrice()
            
            // Calculate LP USD value using LpService
            const lpResult = await this.lpService.calculateLpUsdValue(
                this.walletData.address,
                this.walletData.network,
                runePrice
            )
            
            this.walletData.portfolioSummary.lpUsdValue = lpResult.totalUsdValue
            
            console.log('🏊‍♂️ LP data processed:', {
                positions: lpResult.positions.length,
                totalUsdValue: lpResult.totalUsdValue
            })
            
        } catch (error) {
            console.error('❌ Error loading LP data:', error)
            this.walletData.portfolioSummary.lpUsdValue = 0
        }
    }
    
    private async fetchTcyStakedBalance(): Promise<string> {
        if (!this.walletData) return '0'
        
        const baseUrl = this.walletData.network === 'mainnet' 
            ? 'https://thornode.ninerealms.com'
            : 'https://stagenet-thornode.ninerealms.com'
            
        try {
            const response = await fetch(`${baseUrl}/thorchain/tcy_staker/${this.walletData.address}`)
            if (response.ok) {
                const data = await response.json()
                if (data && data.amount) {
                    return (Number(data.amount) / 1e8).toString()
                }
            }
        } catch (error) {
            console.log('🏦 Error fetching TCY staked balance:', error)
        }
        
        return '0'
    }
    
    private async fetchTcyPrice(): Promise<number> {
        try {
            const baseUrl = this.walletData?.network === 'mainnet' 
                ? 'https://thornode.ninerealms.com'
                : 'https://stagenet-thornode.ninerealms.com'
                
            // Fetch TCY price from pools endpoint
            const poolsResponse = await fetch(`${baseUrl}/thorchain/pools`)
            if (poolsResponse.ok) {
                const pools = await poolsResponse.json()
                const tcyPool = pools.find((pool: any) => pool.asset === 'THOR.TCY')
                
                if (tcyPool && tcyPool.asset_tor_price) {
                    const tcyPriceUsd = Number(tcyPool.asset_tor_price) / 1e8
                    console.log('💰 TCY price from pools:', tcyPriceUsd)
                    return tcyPriceUsd
                }
            }
            
            return 0
        } catch (error) {
            console.log('💰 Error fetching TCY price:', error)
            return 0
        }
    }

    private async getRunePrice(): Promise<number> {
        try {
            // Get RUNE price from /network endpoint via backend
            const network = await this.backend.getThorchainNetwork()
            if (network && network.rune_price_in_tor) {
                // Convert from tor units to USD (rune_price_in_tor/1e8)
                const price = parseFloat(network.rune_price_in_tor) / 100000000 // 1e8
                console.log('💎 RUNE price from network:', price)
                return price
            } else {
                console.warn('⚠️ RUNE price not found in network data, using fallback')
                return 5.50 // Fallback price
            }
        } catch (error) {
            console.error('❌ Failed to get RUNE price:', error)
            return 5.50 // Fallback price
        }
    }

    private async createAssetBalance(rawBalance: any, tier: AssetBalance['tier']): Promise<AssetBalance> {
        console.log('🔧 Creating asset balance for tier:', tier, 'data:', rawBalance)
        
        let asset: string
        let balance: string
        let normalizedAmount: number = 0
        
        if (typeof rawBalance.asset === 'object' && rawBalance.asset !== null) {
            // Normalized balance format with rich asset object
            asset = this.extractAssetName(rawBalance)
            balance = rawBalance.amountFormatted || rawBalance.amount || '0'
            normalizedAmount = rawBalance.amountNormalized || 0
        } else {
            // Simple balance format
            asset = rawBalance.asset || 'UNKNOWN'
            balance = rawBalance.amount || '0'
            normalizedAmount = parseFloat(balance) / 100000000 // Convert from e8 format
        }
        
        // Use the passed tier (determined by getAssetType)
        const finalTier = tier
        
        // Normalize asset for pool lookup
        const poolAssetId = this.normalizeAssetForPoolLookup(asset)
        
        // Get USD price from pools
        const { price, usdValue } = await this.getAssetPricing(poolAssetId, normalizedAmount)
        
        console.log('💰 Asset pricing:', { asset, poolAssetId, normalizedAmount, price, usdValue })
        
        return {
            asset,
            chain: this.getAssetChain(asset),
            tier: finalTier,
            balance,
            usdValue,
            price
        }
    }
    
    private determineAssetTier(asset: string): AssetBalance['tier'] {
        const assetUpper = asset.toUpperCase()
        
        // Native assets: rune, tcy (no separator)
        if (assetUpper === 'RUNE' || assetUpper === 'TCY' || assetUpper.startsWith('THOR.')) {
            return 'thor-native'
        }
        
        // Trade assets: contain ~ separator (BTC~BTC, ETH~USDC-0x123)
        if (assetUpper.includes('~')) {
            return 'trade'
        }
        
        // Secured assets: contain - separator but not ~ (BTC-BTC, ETH-USDC-0x123)
        if (assetUpper.includes('-') && !assetUpper.includes('~')) {
            return 'secured'
        }
        
        // Default fallback
        return 'secured'
    }
    
    private normalizeAssetForPoolLookup(asset: string): string {
        const assetUpper = asset.toUpperCase()
        
        // Native assets: rune -> THOR.RUNE, tcy -> THOR.TCY
        if (assetUpper === 'RUNE') {
            return 'THOR.RUNE'
        }
        if (assetUpper === 'TCY') {
            return 'THOR.TCY'
        }
        
        // Already normalized format (THOR.RUNE)
        if (assetUpper.startsWith('THOR.')) {
            return assetUpper
        }
        
        // Secured assets: BTC-BTC -> BTC.BTC, ETH-USDC-0x123 -> ETH.USDC-0x123
        if (assetUpper.includes('-')) {
            return assetUpper.replace('-', '.')
        }
        
        // Trade assets: BTC~BTC -> BTC.BTC, ETH~USDC-0x123 -> ETH.USDC-0x123
        if (assetUpper.includes('~')) {
            return assetUpper.replace('~', '.')
        }
        
        return assetUpper
    }
    
    private getAssetChain(asset: string): string {
        const assetUpper = asset.toUpperCase()
        
        if (assetUpper === 'RUNE' || assetUpper === 'TCY' || assetUpper.startsWith('THOR.')) {
            return 'THOR'
        }
        
        // Extract chain from asset format
        const parts = assetUpper.split(/[-~.]/);
        return parts[0] || 'THOR'
    }
    
    private async getAssetPricing(poolAssetId: string, normalizedAmount: number): Promise<{ price: number, usdValue: number }> {
        try {
            // Special handling for RUNE - get price from /network endpoint
            if (poolAssetId === 'THOR.RUNE' || poolAssetId.includes('RUNE')) {
                return await this.getRunePricing(normalizedAmount)
            }
            
            // Get pools data for other assets
            const pools = await this.backend.getPools()
            const pool = pools.find((p: any) => p.asset.toLowerCase() === poolAssetId.toLowerCase())
            
            if (pool && pool.asset_price_usd) {
                // Use asset_price_usd for USD price
                const price = parseFloat(pool.asset_price_usd) || 0
                const usdValue = normalizedAmount * price
                return { price, usdValue }
            } else {
                console.warn('⚠️ Pool not found for asset:', poolAssetId, 'using fallback pricing')
                // Fallback pricing based on asset type
                let fallbackPrice = 1.0
                if (poolAssetId.includes('BTC')) fallbackPrice = 45000
                else if (poolAssetId.includes('ETH')) fallbackPrice = 3000
                
                return { price: fallbackPrice, usdValue: normalizedAmount * fallbackPrice }
            }
        } catch (error) {
            console.error('❌ Failed to get asset pricing:', error)
            // Fallback to mock pricing
            return { price: 1.0, usdValue: normalizedAmount * 1.0 }
        }
    }
    
    private async getRunePricing(normalizedAmount: number): Promise<{ price: number, usdValue: number }> {
        try {
            // Get RUNE price from /network endpoint
            const network = await this.backend.getThorchainNetwork()
            if (network && network.rune_price_in_tor) {
                // Convert from tor units to USD (rune_price_in_tor/1e8)
                const price = parseFloat(network.rune_price_in_tor) / 100000000 // 1e8
                const usdValue = normalizedAmount * price
                console.log('💎 RUNE price from network:', { price, normalizedAmount, usdValue })
                return { price, usdValue }
            } else {
                console.warn('⚠️ RUNE price not found in network data, using fallback')
                return { price: 5.50, usdValue: normalizedAmount * 5.50 }
            }
        } catch (error) {
            console.error('❌ Failed to get RUNE price from network:', error)
            return { price: 5.50, usdValue: normalizedAmount * 5.50 }
        }
    }
    
    /**
     * Extract asset name from balance object (handles both simple strings and complex objects)
     */
    private extractAssetName(balance: any): string {
        const asset = balance.asset
        
        if (typeof asset === 'string') {
            return asset
        }
        
        if (typeof asset === 'object' && asset !== null) {
            // Try different fields to get the asset identifier
            return asset.asset || asset.identifier || asset.symbol || 'UNKNOWN'
        }
        
        return 'UNKNOWN'
    }
    
    /**
     * Classify asset type based on separator patterns
     * PRIORITY: Synthetic check first (/) overrides everything else
     * Logic: Any asset containing '/' is synthetic regardless of other separators
     * `/` = synthetic (deprecated) - exclude
     * `~` = trade asset
     * `-` = secured
     * `.` = native
     * No separators = native
     */
    private getAssetType(assetName: string): 'thor-native' | 'secured' | 'trade' | 'synthetic' {
        if (!assetName || assetName === 'UNKNOWN') {
            return 'secured' // default fallback
        }
        
        const asset = assetName.toUpperCase()
        
        // PRIORITY 1: Check for synthetic assets FIRST - overrides everything
        if (asset.includes('/')) {
            return 'synthetic' // Deprecated - will be filtered out
        }
        
        // Special case: Single word native assets (no separators)
        if (asset === 'RUNE' || asset === 'TCY') {
            return 'thor-native'
        }
        
        // PRIORITY 2: Find first non-synthetic separator for classification
        const separators = ['~', '-', '.']
        let firstSeparator = null
        let firstSeparatorIndex = asset.length
        
        for (const separator of separators) {
            const index = asset.indexOf(separator)
            if (index !== -1 && index < firstSeparatorIndex) {
                firstSeparator = separator
                firstSeparatorIndex = index
            }
        }
        
        // Classify based on the first non-synthetic separator found
        if (firstSeparator === '~') {
            return 'trade'
        }
        
        if (firstSeparator === '-') {
            return 'secured'
        }
        
        if (firstSeparator === '.') {
            return 'thor-native'
        }
        
        // No separators found - single word asset
        return 'thor-native'
    }
    
    private extractAssetIdentifier(balance: any): string {
        const asset = balance.asset
        
        if (typeof asset === 'object' && asset !== null) {
            // Try to get the full asset identifier from different fields
            // Priority: full identifier > chain/symbol combination > fallback to symbol
            if (asset.identifier && asset.chain) {
                return `${asset.chain}/${asset.identifier}`
            }
            if (asset.asset) {
                return asset.asset
            }
            if (asset.chain && asset.symbol) {
                return `${asset.chain}-${asset.symbol}`
            }
            return asset.symbol || asset.identifier || 'UNKNOWN'
        }
        
        return asset || 'UNKNOWN'
    }

    private calculateTierValues(): void {
        if (!this.walletData) return

        let thorNative = 0
        let secured = 0
        let trade = 0

        for (const balance of this.walletData.balances) {
            switch (balance.tier) {
                case 'thor-native':
                    thorNative += balance.usdValue
                    break
                case 'secured':
                    secured += balance.usdValue
                    break
                case 'trade':
                    trade += balance.usdValue
                    break
            }
        }

        this.walletData.portfolioSummary.thorNativeValue = thorNative
        this.walletData.portfolioSummary.securedValue = secured
        this.walletData.portfolioSummary.tradeValue = trade
    }

    private updatePortfolioSummary(): void {
        if (!this.walletData) return

        // Update wallet value
        const walletValueEl = this.container.querySelector('#wallet-usd-value')
        if (walletValueEl) {
            walletValueEl.textContent = this.formatUsd(this.walletData.portfolioSummary.walletUsdValue)
        }

        // Update bond value
        const bondValueEl = this.container.querySelector('#bond-usd-value')
        if (bondValueEl) {
            bondValueEl.textContent = this.formatUsd(this.walletData.portfolioSummary.bondUsdValue)
        }

        // Update TCY value
        const tcyValueEl = this.container.querySelector('#tcy-usd-value')
        if (tcyValueEl) {
            tcyValueEl.textContent = this.formatUsd(this.walletData.portfolioSummary.tcyUsdValue)
        }

        // Update LP value
        const lpValueEl = this.container.querySelector('#lp-usd-value')
        if (lpValueEl) {
            lpValueEl.textContent = this.formatUsd(this.walletData.portfolioSummary.lpUsdValue)
        }

        // Update total portfolio value (sum of all components)
        const totalValue = this.walletData.portfolioSummary.walletUsdValue + 
                          this.walletData.portfolioSummary.bondUsdValue +
                          this.walletData.portfolioSummary.tcyUsdValue +
                          this.walletData.portfolioSummary.lpUsdValue
        this.walletData.portfolioSummary.totalUsdValue = totalValue
        
        const totalValueEl = this.container.querySelector('#total-usd-value')
        if (totalValueEl) {
            totalValueEl.textContent = this.formatUsd(totalValue)
        }

        const changeEl = this.container.querySelector('#value-change-24h')
        if (changeEl && this.walletData.portfolioSummary.change24h) {
            const change = this.walletData.portfolioSummary.change24h
            changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
            changeEl.className = `value-change ${change >= 0 ? 'positive' : 'negative'}`
        }
    }

    private updateAssetTiers(): void {
        if (!this.walletData) return

        // Update tier values
        const thorValueEl = this.container.querySelector('#thor-native-value')
        if (thorValueEl) {
            thorValueEl.textContent = this.formatUsd(this.walletData.portfolioSummary.thorNativeValue)
        }

        const securedValueEl = this.container.querySelector('#secured-value')
        if (securedValueEl) {
            securedValueEl.textContent = this.formatUsd(this.walletData.portfolioSummary.securedValue)
        }

        const tradeValueEl = this.container.querySelector('#trade-value')
        if (tradeValueEl) {
            tradeValueEl.textContent = this.formatUsd(this.walletData.portfolioSummary.tradeValue)
        }

        // Update asset lists
        this.updateAssetList('thor-native', 'thor-native-assets')
        this.updateAssetList('secured', 'secured-assets')
        this.updateAssetList('trade', 'trade-assets')
        
        // Apply initial collapsed states
        this.applyCollapsedStates()
    }

    private updateAssetList(tier: AssetBalance['tier'], containerId: string): void {
        if (!this.walletData) return

        const container = this.container.querySelector(`#${containerId}`)
        if (!container) return

        const assets = this.walletData.balances.filter(balance => balance.tier === tier)

        if (assets.length === 0) {
            container.innerHTML = `
                <div class="no-assets">
                    <span>No ${tier.replace('-', ' ')} assets found</span>
                </div>
            `
            return
        }

        container.innerHTML = assets.map(asset => {
            // Use AssetService to parse asset name properly
            const parsed = AssetService.parseAsset(asset.asset)
            const assetName = parsed.assetName
            
            return `
            <div class="wallet-asset-item">
                <div class="wallet-asset-logo-section">
                    ${AssetService.GetLogoWithChain(asset.asset, 40)}
                </div>
                <div class="wallet-asset-info">
                    <div class="wallet-asset-name-row">
                        <div class="wallet-asset-name">${assetName}</div>
                        <div class="wallet-asset-price-value">${this.formatPrice(asset.price)}</div>
                    </div>
                    <div class="wallet-asset-chain">${asset.chain}</div>
                </div>
                <div class="wallet-asset-amounts">
                    <div class="wallet-asset-balance">${this.formatBalance(asset.balance)} ${assetName}</div>
                    <div class="wallet-asset-usd-value">${this.formatUsd(asset.usdValue)}</div>
                </div>
                ${tier === 'trade' || tier === 'secured' ? `
                <div class="wallet-asset-actions">
                    <button class="wallet-asset-withdraw-btn" data-asset="${asset.asset}" data-balance="${asset.balance}" data-tier="${tier}">
                        <span class="wallet-asset-withdraw-icon">📤</span><span class="wallet-asset-withdraw-text">Withdraw</span>
                    </button>
                </div>
                ` : ''}
            </div>
        `}).join('')

        // Setup image error handling for wallet assets
        this.setupImageErrorHandling()
    }

    private setupImageErrorHandling(): void {
        // Add error handlers to all asset and chain logos in wallet tab
        const assetLogos = this.container.querySelectorAll('.asset-logo, .chain-logo');
        assetLogos.forEach(img => {
            (img as HTMLImageElement).addEventListener('error', () => {
                AssetService.handleImageError(img as HTMLImageElement);
            });
        });
    }

    private updateLastUpdated(): void {
        const lastUpdatedEl = this.container.querySelector('#last-updated')
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`
        }
    }

    // Event handlers
    private async copyAddress(): Promise<void> {
        if (!this.walletData) return

        try {
            await navigator.clipboard.writeText(this.walletData.address)
            // Show success notification
            this.showSuccess('Address copied to clipboard!')
        } catch (error) {
            console.error('Failed to copy address:', error)
            this.showError('Failed to copy address')
        }
    }

    private async showReceiveDialog(): Promise<void> {
        try {
            console.log('📨 Opening Receive dialog')
            
            if (!this.walletData) {
                this.showError('Wallet data not available')
                return
            }

            // Use global overlay container for popup
            const dialogContainer = document.getElementById('global-overlay-container')
            if (!dialogContainer) {
                console.error('Global overlay container not found')
                return
            }

            // Initialize ReceiveTransaction component if not exists
            if (!this.receiveTransaction) {
                this.receiveTransaction = new ReceiveTransaction(dialogContainer)
            }

            // Prepare wallet data for receive dialog
            const receiveWalletData: ReceiveTransactionData = {
                walletId: this.walletData.walletId,
                name: this.walletData.name,
                address: this.walletData.address,
                network: this.walletData.network
            }

            // Initialize and show the receive dialog
            await this.receiveTransaction.initialize(receiveWalletData, () => {
                console.log('📨 Receive dialog closed')
            })

        } catch (error) {
            console.error('❌ Failed to show receive dialog:', error)
            this.showError('Failed to open receive dialog: ' + (error as Error).message)
        }
    }

    private async showSendDialog(): Promise<void> {
        try {
            console.log('📤 Opening Send transaction dialog')
            
            if (!this.walletData) {
                this.showError('Wallet data not available')
                return
            }

            // Use global overlay container for popup
            const dialogContainer = document.getElementById('global-overlay-container')
            if (!dialogContainer) {
                console.error('Global overlay container not found')
                return
            }

            // Initialize SendTransaction component if not exists
            if (!this.sendTransaction) {
                this.sendTransaction = new SendTransaction(dialogContainer, this.backend)
            }

            // Convert WalletTab balance format to SendTransaction format
            const sendBalances: SendAssetBalance[] = this.walletData.balances.map(balance => ({
                asset: balance.asset,
                balance: balance.balance,
                usdValue: balance.usdValue.toString()
            }))

            // Prepare wallet data for send dialog
            const sendWalletData: SendTransactionData = {
                walletId: this.walletData.walletId,
                name: this.walletData.name,
                currentAddress: this.walletData.address,
                network: this.walletData.network,
                availableBalances: sendBalances
            }

            // Initialize and show the send dialog
            await this.sendTransaction.initialize(sendWalletData, () => {
                console.log('📝 Send dialog closed, refreshing wallet data')
                // Refresh wallet data when send dialog closes (in case of successful transaction)
                this.refreshData()
            })

        } catch (error) {
            console.error('❌ Failed to show send dialog:', error)
            this.showError('Failed to open send dialog: ' + (error as Error).message)
        }
    }

    // Public methods
    async refreshData(): Promise<void> {
        await this.loadWalletData()
    }

    async updateNetwork(network: 'mainnet' | 'stagenet'): Promise<void> {
        if (!this.walletData) return

        console.log('🔄 WalletTab updating network to:', network)

        const oldNetwork = this.walletData.network
        this.walletData.network = network
        
        // Update bond service network
        this.bondService.setNetwork(network)
        
        // We need to update the address based on the new network
        // Since we don't have the full wallet object here, we'll need to get it from the ApplicationController
        // For now, we'll just refresh the data which should use the current network
        console.log(`WalletTab network changed from ${oldNetwork} to ${network}`)
        
        // Clear current balances to show loading state
        this.walletData.balances = []
        this.walletData.portfolioSummary = {
            walletUsdValue: 0,
            bondUsdValue: 0,
            tcyUsdValue: 0,
            lpUsdValue: 0,
            totalUsdValue: 0,
            thorNativeValue: 0,
            securedValue: 0,
            tradeValue: 0
        }
        
        // Update UI to show loading state
        this.updateAssetTiers()
        this.updatePortfolioSummary()
        
        // Refresh data with new network
        await this.refreshData()
        
        console.log('✅ WalletTab network updated to:', network)
    }

    // Add method to update wallet address when network changes
    updateWalletAddress(wallet: any, network: 'mainnet' | 'stagenet'): void {
        if (!this.walletData) return

        const newAddress = network === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress
        this.walletData.address = newAddress
        this.walletData.network = network

        // Update address display in the UI
        const addressEl = this.container.querySelector('.wallet-portfolio-address')
        if (addressEl && newAddress) {
            addressEl.textContent = newAddress
        }

        console.log(`WalletTab address updated for ${network}:`, newAddress)
    }

    // Utility methods
    private formatAddress(address: string): string {
        if (!address) return 'Unknown Address'
        return `${address.slice(0, 10)}...${address.slice(-6)}`
    }

    private formatUsd(value: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value)
    }

    private formatBalance(balance: string): string {
        const num = parseFloat(balance)
        if (isNaN(num)) return '0.00'
        return num.toFixed(6).replace(/\.?0+$/, '')
    }

    private showSuccess(message: string): void {
        // Create temporary success notification
        console.log('✅', message)
    }

    private showError(message: string): void {
        // Create temporary error notification
        console.error('❌', message)
    }

    private showInfo(message: string): void {
        // Create temporary info notification
        console.log('ℹ️', message)
    }

    private toggleSection(tier: 'secured' | 'trade'): void {
        const isCollapsed = this.collapsedSections.has(tier)
        
        if (isCollapsed) {
            this.collapsedSections.delete(tier)
        } else {
            this.collapsedSections.add(tier)
        }
        
        this.updateSectionVisibility(tier)
    }

    private updateSectionVisibility(tier: 'secured' | 'trade'): void {
        const isCollapsed = this.collapsedSections.has(tier)
        const assetList = this.container.querySelector(`#${tier}-assets`) as HTMLElement
        const collapseBtn = this.container.querySelector(`#${tier}-collapse-btn`) as HTMLElement
        
        if (assetList) {
            assetList.style.display = isCollapsed ? 'none' : 'block'
        }
        
        if (collapseBtn) {
            collapseBtn.textContent = isCollapsed ? '▶' : '▼'
        }
    }

    private applyCollapsedStates(): void {
        // Check if sections should be collapsed by default (when no assets)
        const securedAssets = this.walletData?.balances.filter(b => b.tier === 'secured') || []
        const tradeAssets = this.walletData?.balances.filter(b => b.tier === 'trade') || []
        
        // Only collapse sections if they have no assets AND they're not already expanded by user
        if (securedAssets.length === 0) {
            this.collapsedSections.add('secured')
        } else {
            // If section has assets, make sure it's expanded
            this.collapsedSections.delete('secured')
        }
        
        if (tradeAssets.length === 0) {
            this.collapsedSections.add('trade')
        } else {
            // If section has assets, make sure it's expanded
            this.collapsedSections.delete('trade')
        }
        
        // Apply visual states
        this.updateSectionVisibility('secured')
        this.updateSectionVisibility('trade')
    }

    private formatPrice(price?: number): string {
        if (!price || price === 0) return '$0.00'
        return price.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }


    private showWithdrawDialog(asset: string, balance: string, tier: 'trade' | 'secured'): void {
        if (!this.withdrawDialog || !this.walletData) {
            console.error('❌ Withdraw dialog or wallet data not available')
            return
        }

        const withdrawData: WithdrawDialogData = {
            asset,
            balance,
            tier,
            walletAddress: this.walletData.address,
            network: this.walletData.network
        }

        this.withdrawDialog.show(withdrawData, (formData: WithdrawFormData) => {
            this.handleWithdrawConfirmed(formData)
        })
    }

    private handleWithdrawConfirmed(withdrawData: WithdrawFormData): void {
        console.log('✅ Withdraw confirmed, opening Send modal with data:', withdrawData)

        // Generate the appropriate memo based on tier
        const memo = withdrawData.tier === 'trade' 
            ? `TRADE-:${withdrawData.toAddress}`
            : `SECURE-:${withdrawData.toAddress}`

        // Open the Send modal with pre-populated data
        this.openSendModalWithData({
            transactionType: 'deposit',
            asset: withdrawData.asset,
            amount: withdrawData.amount,
            toAddress: undefined, // MsgDeposit doesn't use toAddress
            memo: memo
        })
    }

    private openSendModalWithData(prePopulatedData: any): void {
        try {
            if (!this.walletData) {
                console.error('❌ No wallet data available')
                return
            }

            const dialogContainer = document.getElementById('global-overlay-container')
            if (!dialogContainer) {
                console.error('❌ Global overlay container not found')
                return
            }

            // Initialize SendTransaction component if not exists
            if (!this.sendTransaction) {
                this.sendTransaction = new SendTransaction(dialogContainer, this.backend)
            }

            // Convert WalletTab balance format to SendTransaction format
            const sendBalances: SendAssetBalance[] = this.walletData.balances.map(balance => ({
                asset: balance.asset,
                balance: balance.balance,
                usdValue: balance.usdValue.toString()
            }))

            // Prepare wallet data for send dialog
            const sendWalletData: SendTransactionData = {
                walletId: this.walletData.walletId,
                name: this.walletData.name,
                currentAddress: this.walletData.address,
                network: this.walletData.network,
                availableBalances: sendBalances
            }

            // Show the send dialog and pre-populate with withdrawal data
            this.sendTransaction.initialize(sendWalletData, {
                onSuccess: (result) => {
                    console.log('📤 Withdrawal transaction completed:', result)
                    // Refresh wallet data after successful transaction
                    this.refreshData()
                },
                onClose: () => {
                    console.log('🔄 Withdraw dialog closed')
                }
            }, prePopulatedData)

        } catch (error) {
            console.error('❌ Failed to open send modal:', error)
            this.showError('Failed to open withdrawal transaction')
        }
    }
}