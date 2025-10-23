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
    totalUsdValue: number
    thorNativeValue: number
    securedValue: number
    tradeValue: number
    change24h?: number
}

export class WalletTab {
    private container: HTMLElement
    private backend: BackendService
    private walletData: WalletTabData | null = null
    private refreshInterval: NodeJS.Timeout | null = null

    constructor(container: HTMLElement, backend: BackendService) {
        this.container = container
        this.backend = backend
    }

    async initialize(wallet: any, network: 'mainnet' | 'stagenet'): Promise<void> {
        try {
            console.log('🏦 Initializing WalletTab...', { wallet: wallet.name, network })
            
            // Initialize wallet data structure
            this.walletData = {
                walletId: wallet.walletId,
                name: wallet.name,
                address: network === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress,
                network,
                balances: [],
                portfolioSummary: {
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
                <!-- Portfolio Summary -->
                <div class="portfolio-summary">
                    <div class="portfolio-header">
                        <div class="wallet-info">
                            <h3>💰 ${this.walletData.name}</h3>
                            <div class="wallet-address">
                                <span class="address-text">${this.formatAddress(this.walletData.address)}</span>
                                <button class="btn-icon" id="copy-address-btn" title="Copy Address">
                                    📋
                                </button>
                            </div>
                        </div>
                        <div class="quick-actions">
                            <button class="btn btn-primary" id="receive-btn">
                                📥 Receive
                            </button>
                            <button class="btn btn-secondary" id="send-btn">
                                📤 Send
                            </button>
                        </div>
                    </div>
                    
                    <div class="portfolio-value">
                        <div class="total-value">
                            <span class="value-label">Total Portfolio Value</span>
                            <span class="value-amount" id="total-usd-value">$0.00</span>
                            <span class="value-change" id="value-change-24h">+0.00%</span>
                        </div>
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
                        <div class="tier-description">
                            <p>Assets native to THORChain network (RUNE, Synthetic assets)</p>
                        </div>
                        <div class="asset-list" id="thor-native-assets">
                            <div class="loading-state">
                                <span>🔄 Loading THOR native assets...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Secured Assets -->
                    <div class="asset-tier">
                        <div class="tier-header">
                            <h4>🔒 Secured Assets</h4>
                            <span class="tier-value" id="secured-value">$0.00</span>
                        </div>
                        <div class="tier-description">
                            <p>Cross-chain assets secured by THORChain (BTC, ETH, etc.)</p>
                        </div>
                        <div class="asset-list" id="secured-assets">
                            <div class="loading-state">
                                <span>🔄 Loading secured assets...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Trade Assets -->
                    <div class="asset-tier">
                        <div class="tier-header">
                            <h4>💱 Trade Assets</h4>
                            <span class="tier-value" id="trade-value">$0.00</span>
                        </div>
                        <div class="tier-description">
                            <p>Assets available for trading through THORChain</p>
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
    }

    private async loadWalletData(): Promise<void> {
        try {
            if (!this.walletData) return

            console.log('🔄 Loading wallet data for', this.walletData.address)

            // Load balances from multiple sources
            const [balances, normalizedBalances, tradeAccount] = await Promise.allSettled([
                this.backend.getBalances(this.walletData.address),
                this.backend.getNormalizedBalances(this.walletData.address),
                this.backend.getTradeAccount(this.walletData.address)
            ])

            // Process and categorize assets
            await this.processBalanceData(balances, normalizedBalances, tradeAccount)
            
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

        // Process regular balances
        if (balances.status === 'fulfilled' && balances.value) {
            for (const balance of balances.value) {
                const assetBalance = await this.createAssetBalance(balance, 'secured')
                processedBalances.push(assetBalance)
                totalUsd += assetBalance.usdValue
            }
        }

        // Process normalized balances (THOR native)
        if (normalizedBalances.status === 'fulfilled' && normalizedBalances.value) {
            for (const balance of normalizedBalances.value) {
                const assetBalance = await this.createAssetBalance(balance, 'thor-native')
                processedBalances.push(assetBalance)
                totalUsd += assetBalance.usdValue
            }
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
        this.walletData.portfolioSummary.totalUsdValue = totalUsd
        this.calculateTierValues()
    }

    private async createAssetBalance(rawBalance: any, tier: AssetBalance['tier']): Promise<AssetBalance> {
        // Mock USD conversion for now - in production this would use oracle prices
        const mockUsdValue = parseFloat(rawBalance.amount || '0') * 1.5

        return {
            asset: rawBalance.asset || 'UNKNOWN',
            chain: rawBalance.chain || 'THOR',
            tier,
            balance: rawBalance.amount || '0',
            usdValue: mockUsdValue,
            price: 1.5 // Mock price
        }
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

        const totalValueEl = this.container.querySelector('#total-usd-value')
        if (totalValueEl) {
            totalValueEl.textContent = this.formatUsd(this.walletData.portfolioSummary.totalUsdValue)
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

        container.innerHTML = assets.map(asset => `
            <div class="asset-item">
                <div class="asset-info">
                    <div class="asset-symbol">${asset.asset}</div>
                    <div class="asset-chain">${asset.chain}</div>
                </div>
                <div class="asset-amounts">
                    <div class="asset-balance">${this.formatBalance(asset.balance)} ${asset.asset}</div>
                    <div class="asset-usd-value">${this.formatUsd(asset.usdValue)}</div>
                </div>
            </div>
        `).join('')
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

    private showReceiveDialog(): void {
        // TODO: Implement receive dialog with QR code
        this.showInfo('Receive dialog coming soon...')
    }

    private showSendDialog(): void {
        // TODO: Implement send transaction dialog
        this.showInfo('Send dialog coming soon...')
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
        
        // We need to update the address based on the new network
        // Since we don't have the full wallet object here, we'll need to get it from the ApplicationController
        // For now, we'll just refresh the data which should use the current network
        console.log(`WalletTab network changed from ${oldNetwork} to ${network}`)
        
        // Clear current balances to show loading state
        this.walletData.balances = []
        this.walletData.portfolioSummary = {
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
        const addressEl = this.container.querySelector('.address-text')
        if (addressEl && newAddress) {
            addressEl.textContent = this.formatAddress(newAddress)
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
}