/**
 * TCY Tab Component
 * 
 * Implements the TCY dashboard as specified in docs/TCY.md:
 * - Section 1: TCY Market Info (Always shown)
 * - Section 2: Balances & Actions (Always shown) 
 * - Section 3: Rewards & Analytics (Only if staked balance > 0)
 * - Stake/Unstake functionality with dialog integration
 */

import { BackendService } from '../services/BackendService'
import { StakeDialog, StakeDialogData, StakeFormData } from './StakeDialog'
import { UnstakeDialog, UnstakeDialogData, UnstakeFormData } from './UnstakeDialog'
import { SendTransaction, SendTransactionData, AssetBalance as SendAssetBalance } from './SendTransaction'
import { AssetService } from '../../services/assetService'
import '../styles/TcyTab.css'

export interface TcyTabData {
    walletId: string
    name: string
    address: string
    network: 'mainnet' | 'stagenet'
}

interface TcyMarketData {
    tcyPriceUsd: number
    runePriceUsd: number
    tcyMarketCap: number
    runeMarketCap: number
    tcyVsRunePercentage: number
    totalSupply: number
    stakedSupply: number
    unstakedSupply: number
    pooledSupply: number
    pendingRuneRewards: number
}

interface TcyBalanceData {
    stakedTcyBalance: string
    unstakedTcyBalance: string
    unstakedRuneBalance: string
    stakedTcyUsdValue: number
    unstakedTcyUsdValue: number
    unstakedRuneUsdValue: number
}

interface TcyRewardsData {
    apr: number
    totalRuneDistributed: number
    avgDailyRune: number
    annualizedRune: number
    annualizedUsd: number
    distributionDays: number
    nextDistributionTime: string
    nextDistributionAmount: number
    blocksRemaining: number
    distributions: Array<{
        amount: string
        date: string
        usdValue: number
        historicalRunePrice: number
    }>
}

interface TcyMimirData {
    TCYCLAIMINGHALT: number
    TCYCLAIMINGSWAPHALT: number
    TCYSTAKEDISTRIBUTIONHALT: number
    TCYSTAKINGHALT: number
    TCYUNSTAKINGHALT: number
    HALTTCYTRADING: number
}

export class TcyTab {
    private container: HTMLElement
    private backend: BackendService
    private tcyData: TcyTabData | null = null
    private refreshInterval: NodeJS.Timeout | null = null
    private sendTransaction: SendTransaction | null = null
    private stakeDialog: StakeDialog | null = null
    private unstakeDialog: UnstakeDialog | null = null
    
    // Data state
    private marketData: TcyMarketData | null = null
    private balanceData: TcyBalanceData | null = null
    private rewardsData: TcyRewardsData | null = null
    private mimirData: TcyMimirData | null = null
    private isLoading: boolean = false
    private historicalRunePrices: Array<{startTime: string, endTime: string, runePriceUSD: string}> = []
    private allDistributions: Array<{amount: string; date: string; usdValue: number; historicalRunePrice: number}> = []
    private showAllDistributions: boolean = false

    constructor(container: HTMLElement, backend: BackendService) {
        this.container = container
        this.backend = backend
        
        // Initialize dialogs with separate containers like WalletTab does
        const stakeContainer = document.getElementById('stake-dialog-container')
        if (stakeContainer) {
            this.stakeDialog = new StakeDialog(stakeContainer, this.backend)
        }
        
        const unstakeContainer = document.getElementById('unstake-dialog-container')
        if (unstakeContainer) {
            this.unstakeDialog = new UnstakeDialog(unstakeContainer, this.backend)
        }
        
        console.log('🔧 TcyTab initialized')
    }

    async initialize(wallet: any, network: 'mainnet' | 'stagenet'): Promise<void> {
        try {
            console.log('🏦 Initializing TCY Tab...', { wallet: wallet.name, network })
            
            // Initialize asset logo styles
            AssetService.initializeStyles()
            
            this.tcyData = {
                walletId: wallet.walletId,
                name: wallet.name,
                address: network === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress,
                network
            }

            this.render()
            await this.loadTcyData()
            
            console.log('✅ TCY Tab initialized')
        } catch (error) {
            console.error('❌ Failed to initialize TCY Tab:', error)
            this.renderError('Failed to initialize TCY tab')
        }
    }

    private render(): void {
        if (!this.tcyData) return

        this.container.innerHTML = `
            <div class="tcy-tab">
                <!-- TCY Header -->
                <div class="tcy-header">
                    <h3>🏦 TCY Dashboard</h3>
                    <p class="tcy-description">Stake your TCY tokens and earn RUNE rewards</p>
                </div>

                <!-- Loading State -->
                <div class="tcy-loading" id="tcyLoading">
                    <div class="tcy-loading-spinner"></div>
                    <p>Loading TCY data...</p>
                </div>

                <!-- Error State -->
                <div class="tcy-error hidden" id="tcyError">
                    <div class="tcy-error-content">
                        <h4>⚠️ Error Loading Data</h4>
                        <p id="tcyErrorMessage">Failed to load TCY data</p>
                        <button class="tcy-btn tcy-btn-primary" id="tcyRetryBtn">
                            🔄 Retry
                        </button>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="tcy-content hidden" id="tcyContent">
                    <!-- Mimir Alerts -->
                    <div class="tcy-alerts hidden" id="tcyAlerts"></div>

                    <!-- Section 1: Balances & Actions -->
                    <div class="tcy-section tcy-balances-section">
                        <div class="tcy-section-header-with-actions">
                            <h4 class="tcy-section-title">💰 Your Balances</h4>
                            <div class="tcy-header-actions">
                                <button class="tcy-header-btn tcy-stake-btn-header" id="stakeBtn" disabled>
                                    🏦 Stake
                                </button>
                                <button class="tcy-header-btn tcy-unstake-btn-header" id="unstakeBtn" disabled>
                                    📤 Unstake
                                </button>
                            </div>
                        </div>
                        
                        <!-- Balances Row -->
                        <div class="tcy-balances-grid">
                            <div class="tcy-balance-card">
                                <div class="tcy-balance-info">
                                    <div class="tcy-balance-label">Staked TCY</div>
                                    <div class="tcy-balance-amount-row">
                                        <div class="tcy-balance-amount-with-logo">
                                            <span id="userStakedTcy">0.00</span>
                                            ${AssetService.GetLogoWithChain('THOR.TCY', 20)}
                                        </div>
                                        <div class="tcy-balance-usd" id="userStakedTcyUsd">$0.00</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="tcy-balance-card">
                                <div class="tcy-balance-info">
                                    <div class="tcy-balance-label">Unstaked TCY</div>
                                    <div class="tcy-balance-amount-row">
                                        <div class="tcy-balance-amount-with-logo">
                                            <span id="userUnstakedTcy">0.00</span>
                                            ${AssetService.GetLogoWithChain('THOR.TCY', 20)}
                                        </div>
                                        <div class="tcy-balance-usd" id="userUnstakedTcyUsd">$0.00</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Yield Details Section (moved from rewards section) -->
                        <div class="tcy-yield-details-section hidden" id="tcyYieldDetailsSection">
                            <h5>Yield Statistics</h5>
                            <div class="tcy-yield-details-grid">
                                <div class="tcy-yield-stat">
                                    <div class="tcy-yield-stat-label">Total RUNE Earned</div>
                                    <div class="tcy-yield-stat-value" id="totalRuneEarnedDetailed">0.00 RUNE</div>
                                </div>
                                
                                <div class="tcy-yield-stat">
                                    <div class="tcy-yield-stat-label">Average Daily RUNE</div>
                                    <div class="tcy-yield-stat-value" id="avgDailyRune">0.00 RUNE</div>
                                </div>
                                
                                <div class="tcy-yield-stat">
                                    <div class="tcy-yield-stat-label">Annualized RUNE</div>
                                    <div class="tcy-yield-stat-value" id="annualizedRune">0.00 RUNE</div>
                                </div>
                                
                                <div class="tcy-yield-stat">
                                    <div class="tcy-yield-stat-label">Distribution Days</div>
                                    <div class="tcy-yield-stat-value" id="distributionDays">0 days</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Market Info -->
                    <div class="tcy-section tcy-market-section">
                        <h4 class="tcy-section-title">📊 Market Overview</h4>
                        <div class="tcy-market-grid">
                            <div class="tcy-market-card">
                                <div class="tcy-market-label">TCY Price</div>
                                <div class="tcy-market-value" id="tcyPrice">$0.00</div>
                            </div>
                            <div class="tcy-market-card">
                                <div class="tcy-market-label">Market Cap</div>
                                <div class="tcy-market-value" id="tcyMarketCap">$0</div>
                            </div>
                            <div class="tcy-market-card">
                                <div class="tcy-market-label">vs RUNE</div>
                                <div class="tcy-market-value" id="tcyVsRune">0.00%</div>
                            </div>
                        </div>
                        <div class="tcy-supply-breakdown">
                            <h5 class="tcy-breakdown-title">Supply Distribution</h5>
                            <div class="tcy-supply-grid tcy-supply-grid-four">
                                <div class="tcy-supply-item">
                                    <span class="tcy-supply-label">Staked</span>
                                    <span class="tcy-supply-value" id="stakedSupply">0 ${AssetService.GetLogoWithChain('THOR.TCY', 16)}</span>
                                </div>
                                <div class="tcy-supply-item">
                                    <span class="tcy-supply-label">Unstaked</span>
                                    <span class="tcy-supply-value" id="unstakedSupply">0 ${AssetService.GetLogoWithChain('THOR.TCY', 16)}</span>
                                </div>
                                <div class="tcy-supply-item">
                                    <span class="tcy-supply-label">Pooled</span>
                                    <span class="tcy-supply-value" id="pooledSupply">0 ${AssetService.GetLogoWithChain('THOR.TCY', 16)}</span>
                                </div>
                                <div class="tcy-supply-item">
                                    <span class="tcy-supply-label">Pending Rewards</span>
                                    <span class="tcy-supply-value" id="pendingRewards">0 ${AssetService.GetLogoWithChain('THOR.RUNE', 16)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 3: Rewards & Analytics (Only if staked balance > 0) -->
                    <div class="tcy-section tcy-rewards-section hidden" id="tcyRewardsSection">
                        <h4 class="tcy-section-title">🎁 Rewards & Analytics</h4>
                        
                        <div class="tcy-rewards-grid">
                            <div class="tcy-reward-card">
                                <div class="tcy-reward-label">Current APR</div>
                                <div class="tcy-reward-value" id="currentApr">0.00%</div>
                            </div>
                            
                            <div class="tcy-reward-card">
                                <div class="tcy-reward-label">Total RUNE Earned</div>
                                <div class="tcy-reward-value" id="totalRuneEarned">0.00</div>
                            </div>
                            
                            <div class="tcy-reward-card">
                                <div class="tcy-reward-label">Next Distribution</div>
                                <div class="tcy-reward-value" id="nextDistribution">Calculating...</div>
                                <div class="tcy-reward-sub" id="nextDistributionSub">0 blocks remaining</div>
                            </div>
                        </div>

                        <!-- Cumulative Payout Graph -->
                        <div class="tcy-payout-graph-section" id="tcyPayoutGraphSection">
                            <h5>Cumulative TCY Rewards</h5>
                            <div class="tcy-payout-graph-container">
                                <!-- Loading placeholder -->
                                <div class="tcy-graph-loading" id="tcyGraphLoading">
                                    <div class="tcy-graph-loading-content">
                                        <div class="tcy-graph-skeleton"></div>
                                        <p>Loading rewards chart...</p>
                                    </div>
                                </div>
                                
                                <!-- Actual graph container -->
                                <div class="tcy-payout-graph hidden" id="tcyPayoutGraph">
                                    <!-- SVG graph will be rendered here -->
                                </div>
                            </div>
                        </div>

                        <!-- Distribution History -->
                        <div class="tcy-history-section">
                            <div class="tcy-history-header">
                                <h5 id="distributionHistoryTitle">Recent Distributions</h5>
                                <div class="tcy-history-controls">
                                    <button class="tcy-btn tcy-btn-text" id="toggleHistoryBtn">
                                        Show All
                                    </button>
                                </div>
                            </div>
                            <div class="tcy-history-table" id="distributionHistory">
                                <!-- Distribution history will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
        
        this.setupEventListeners()
    }

    private setupEventListeners(): void {
        // Retry button
        const retryBtn = document.getElementById('tcyRetryBtn')
        retryBtn?.addEventListener('click', () => this.loadTcyData())

        // Stake button
        const stakeBtn = document.getElementById('stakeBtn')
        stakeBtn?.addEventListener('click', () => this.showStakeDialog())

        // Unstake button
        const unstakeBtn = document.getElementById('unstakeBtn')
        unstakeBtn?.addEventListener('click', () => this.showUnstakeDialog())

        // History toggle
        const toggleHistoryBtn = document.getElementById('toggleHistoryBtn')
        toggleHistoryBtn?.addEventListener('click', () => this.toggleDistributionHistory())
    }

    private async loadTcyData(): Promise<void> {
        if (!this.tcyData || this.isLoading) return
        
        this.isLoading = true
        this.showLoading()
        
        try {
            // Load all data in parallel
            const [marketData, balanceData, rewardsData, mimirData] = await Promise.allSettled([
                this.loadMarketData(),
                this.loadBalanceData(),
                this.loadRewardsData(),
                this.loadMimirData()
            ])

            // Process results
            if (marketData.status === 'fulfilled') this.marketData = marketData.value
            if (balanceData.status === 'fulfilled') this.balanceData = balanceData.value
            if (rewardsData.status === 'fulfilled') this.rewardsData = rewardsData.value
            if (mimirData.status === 'fulfilled') this.mimirData = mimirData.value

            this.updateUI()
            this.showContent()
            
        } catch (error) {
            console.error('❌ Failed to load TCY data:', error)
            this.showError('Failed to load TCY data. Please try again.')
        } finally {
            this.isLoading = false
        }
    }

    private async loadMarketData(): Promise<TcyMarketData> {
        const baseUrl = this.tcyData!.network === 'mainnet' 
            ? 'https://thornode.ninerealms.com'
            : 'https://stagenet-thornode.ninerealms.com'

        // Fetch pools data for TCY price and pool info
        const poolsResponse = await fetch(`${baseUrl}/thorchain/pools`)
        const pools = await poolsResponse.json()
        const tcyPool = pools.find((pool: any) => pool.asset === 'THOR.TCY')
        
        const tcyPriceUsd = tcyPool ? Number(tcyPool.asset_tor_price) / 1e8 : 0
        const pooledSupply = tcyPool ? Math.round(Number(tcyPool.balance_asset) / 1e8) : 0
        
        // Get RUNE market data for comparison
        const networkResponse = await fetch(`${baseUrl}/thorchain/network`)
        const networkData = await networkResponse.json()
        const runePriceUsd = Number(networkData.rune_price_in_tor) / 1e8
        
        // Get RUNE supply
        const runeSupplyResponse = await fetch(`${baseUrl}/cosmos/bank/v1beta1/supply/by_denom?denom=rune`)
        const runeSupplyData = await runeSupplyResponse.json()
        const runeSupply = Number(runeSupplyData.amount.amount) / 1e8
        
        // Get TCY supply breakdown
        const tcySupplyResponse = await fetch(`${baseUrl}/cosmos/bank/v1beta1/supply/by_denom?denom=tcy`)
        const tcySupplyData = await tcySupplyResponse.json()
        const circulatingSupply = Number(tcySupplyData.amount.amount) / 1e8
        
        // Get total staked TCY and pending RUNE rewards from module balance
        let stakedSupply = 0
        let pendingRuneRewards = 0
        try {
            const moduleBalanceResponse = await fetch(`${baseUrl}/thorchain/balance/module/tcy_stake`)
            const moduleBalanceData = await moduleBalanceResponse.json()
            console.log('🏦 TCY module balance response:', moduleBalanceData)
            if (moduleBalanceData && moduleBalanceData.coins) {
                const tcyModuleBalance = moduleBalanceData.coins.find((coin: any) => coin.denom === 'tcy')
                const runeModuleBalance = moduleBalanceData.coins.find((coin: any) => coin.denom === 'rune')
                
                if (tcyModuleBalance) {
                    stakedSupply = Number(tcyModuleBalance.amount) / 1e8
                }
                if (runeModuleBalance) {
                    pendingRuneRewards = Number(runeModuleBalance.amount) / 1e8
                }
            }
        } catch (error) {
            console.log('Error fetching TCY module balance:', error)
        }
        
        // Calculate market caps
        const totalSupply = 210000000 // 210m TCY total supply
        const tcyMarketCap = tcyPriceUsd * totalSupply
        const runeMarketCap = runePriceUsd * runeSupply
        const tcyVsRunePercentage = runeMarketCap > 0 ? (tcyMarketCap / runeMarketCap) * 100 : 0
        
        // Calculate unstaked supply (circulating - pooled - staked)
        const unstakedSupply = Math.max(0, circulatingSupply - pooledSupply - stakedSupply)
        
        return {
            tcyPriceUsd,
            runePriceUsd,
            tcyMarketCap,
            runeMarketCap,
            tcyVsRunePercentage,
            totalSupply,
            stakedSupply: Math.round(stakedSupply),
            unstakedSupply: Math.round(unstakedSupply),
            pooledSupply,
            pendingRuneRewards
        }
    }

    private async loadBalanceData(): Promise<TcyBalanceData> {
        if (!this.tcyData?.address) {
            return {
                stakedTcyBalance: '0',
                unstakedTcyBalance: '0', 
                unstakedRuneBalance: '0', // Keep for interface compatibility
                stakedTcyUsdValue: 0,
                unstakedTcyUsdValue: 0,
                unstakedRuneUsdValue: 0 // Keep for interface compatibility
            }
        }

        const baseUrl = this.tcyData.network === 'mainnet'
            ? 'https://thornode.ninerealms.com'
            : 'https://stagenet-thornode.ninerealms.com'

        // Get staked balance
        let stakedTcyBalance = '0'
        try {
            const stakedResponse = await fetch(`${baseUrl}/thorchain/tcy_staker/${this.tcyData.address}`)
            console.log('🔍 Staked balance response status:', stakedResponse.status)
            if (stakedResponse.ok) {
                const stakedData = await stakedResponse.json()
                console.log('🔍 Staked TCY response:', stakedData)
                if (stakedData && stakedData.amount) {
                    stakedTcyBalance = (Number(stakedData.amount) / 1e8).toString()
                    console.log('🔍 Calculated staked balance:', stakedTcyBalance)
                }
            } else {
                console.log('🏦 No staked balance found, status:', stakedResponse.status)
            }
        } catch (error) {
            console.log('🏦 Error fetching staked balance:', error)
        }

        // Get unstaked TCY balance
        let unstakedTcyBalance = '0'
        try {
            const balancesResponse = await fetch(`${baseUrl}/cosmos/bank/v1beta1/balances/${this.tcyData.address}`)
            if (balancesResponse.ok) {
                const balancesData = await balancesResponse.json()
                console.log('💰 Wallet balances response:', balancesData)
                
                const tcyBalance = balancesData.balances?.find((b: any) => b.denom === 'tcy')
                unstakedTcyBalance = tcyBalance ? (Number(tcyBalance.amount) / 1e8).toString() : '0'
            } else {
                console.log('💰 Error fetching wallet balances, status:', balancesResponse.status)
            }
        } catch (error) {
            console.log('💰 Error fetching wallet balances:', error)
        }

        // Calculate USD values (will be updated when market data is available)
        return {
            stakedTcyBalance,
            unstakedTcyBalance,
            unstakedRuneBalance: '0', // Keep for interface compatibility
            stakedTcyUsdValue: 0,
            unstakedTcyUsdValue: 0,
            unstakedRuneUsdValue: 0 // Keep for interface compatibility
        }
    }

    private async fetchHistoricalRunePrices(distributionCount: number): Promise<void> {
        // No longer fetching historical prices separately since distribution data includes prices
        // Keep this method for interface compatibility but make it a no-op
        console.log('📊 Using RUNE prices from distribution data instead of fetching historical prices')
    }

    private getHistoricalRunePrice(timestamp: number): number {
        // No longer using historical price lookup - distribution data includes prices
        // Return current RUNE price as fallback (though this shouldn't be called anymore)
        console.log('⚠️ getHistoricalRunePrice called but using current RUNE price as fallback')
        return this.marketData?.runePriceUsd || 0
    }

    private async loadRewardsData(): Promise<TcyRewardsData> {
        if (!this.tcyData?.address) {
            return {
                apr: 0,
                totalRuneDistributed: 0,
                avgDailyRune: 0,
                annualizedRune: 0,
                annualizedUsd: 0,
                distributionDays: 0,
                nextDistributionTime: 'No address',
                nextDistributionAmount: 0,
                blocksRemaining: 0,
                distributions: []
            }
        }

        const hasStakedBalance = this.balanceData && parseFloat(this.balanceData.stakedTcyBalance) > 0

        // Calculate next distribution using block height (independent of distribution history)
        let nextDistributionTime = 'Calculating...'
        let nextDistributionAmount = 0
        let blocksRemaining = 0

        try {
            const rpcUrl = this.tcyData.network === 'mainnet' 
                ? 'https://rpc.ninerealms.com/status'
                : 'https://stagenet-rpc.ninerealms.com/status'

            const statusResponse = await fetch(rpcUrl)
            const statusData = await statusResponse.json()
            const currentBlock = Number(statusData.result.sync_info.latest_block_height)
            
            // Calculate next distribution block (every 14400 blocks = ~24 hours)
            const nextBlock = 14400 * Math.ceil(currentBlock / 14400)
            blocksRemaining = nextBlock - currentBlock
            
            // Calculate time remaining (6 seconds per block)
            const secondsRemaining = blocksRemaining * 6
            const hours = Math.floor(secondsRemaining / 3600)
            const minutes = Math.floor((secondsRemaining % 3600) / 60)
            
            nextDistributionTime = `${hours}h ${minutes}m`
            console.log('⏰ Next TCY distribution:', { currentBlock, nextBlock, blocksRemaining, nextDistributionTime })
            
        } catch (error) {
            console.log('⏰ Error calculating next distribution:', error)
            nextDistributionTime = 'Error calculating'
        }

        // Try to load distribution history (optional)
        const baseUrl = this.tcyData.network === 'mainnet'
            ? 'https://midgard.ninerealms.com'
            : 'https://stagenet-midgard.ninerealms.com'

        let apr = 0
        let totalRuneDistributed = 0
        let avgDailyRune = 0
        let annualizedRune = 0
        let annualizedUsd = 0
        let distributionDays = 0
        let distributions: Array<{ amount: string; date: string; usdValue: number; historicalRunePrice: number }> = []

        try {
            console.log('🔍 Loading TCY distributions for address:', this.tcyData.address)
            const distributionsResponse = await fetch(`${baseUrl}/v2/tcy/distribution/${this.tcyData.address}`)
            console.log('🔍 Distributions response status:', distributionsResponse.status)
            
            if (distributionsResponse.ok) {
                const distributionsData = await distributionsResponse.json()
                console.log('🔍 Raw distributions data:', distributionsData)
                
                const rawDistributions = distributionsData.distributions || []
                console.log('🔍 Raw distributions count:', rawDistributions.length)
                
                // No need to fetch historical prices since distribution data includes them

                distributions = rawDistributions.map((d: any) => {
                    // Use the price from the distribution data directly (RUNEUSD price in 1e8 format)
                    const historicalRunePrice = Number(d.price) / 1e8
                    const runeAmount = Number(d.amount) / 1e8
                    const usdValue = runeAmount * historicalRunePrice
                    
                    console.log('📊 Processing distribution:', {
                        date: new Date(Number(d.date) * 1000).toLocaleDateString(),
                        rawAmount: d.amount,
                        runeAmount,
                        rawPrice: d.price,
                        historicalRunePrice,
                        usdValue
                    })
                    
                    return {
                        amount: d.amount,
                        date: d.date,
                        usdValue,
                        historicalRunePrice
                    }
                })

                // Sort distributions by date in descending order (most recent first)
                distributions.sort((a, b) => Number(b.date) - Number(a.date))
                
                // Store all distributions for toggle functionality
                this.allDistributions = distributions

                totalRuneDistributed = Number(distributionsData.total || 0) / 1e8
                
                // Calculate additional yield statistics like the legacy app
                if (distributions.length > 0) {
                    distributionDays = distributions.length
                    avgDailyRune = totalRuneDistributed / distributionDays
                    annualizedRune = avgDailyRune * 365
                    
                    // Get current RUNE price for annualized USD calculation
                    const currentRunePrice = this.marketData?.runePriceUsd || 0
                    annualizedUsd = annualizedRune * currentRunePrice
                    
                    // Calculate APY using actual staked TCY value (like legacy app)
                    const stakedBalance = parseFloat(this.balanceData?.stakedTcyBalance || '0')
                    const tcyPriceUsd = this.marketData?.tcyPriceUsd || 0
                    const stakedValueUsd = stakedBalance * tcyPriceUsd
                    
                    if (stakedValueUsd > 0) {
                        apr = (annualizedUsd / stakedValueUsd) * 100
                        console.log('📊 Enhanced APY calculation:', {
                            stakedBalance,
                            tcyPriceUsd,
                            stakedValueUsd,
                            annualizedUsd,
                            calculatedAPR: apr
                        })
                    } else {
                        // Fallback to Midgard APR if we can't calculate
                        apr = Number(distributionsData.apr || 0) * 100
                    }
                    
                    console.log('📊 Enhanced yield calculations:', {
                        totalRuneDistributed,
                        distributionDays,
                        avgDailyRune,
                        annualizedRune,
                        annualizedUsd,
                        finalAPR: apr
                    })
                } else {
                    // No distributions, use Midgard APR
                    apr = Number(distributionsData.apr || 0) * 100
                }
            } else {
                console.log('📊 No distribution history found (new staker)')
            }
        } catch (error) {
            console.log('📊 Error loading distribution history:', error)
        }

        return {
            apr,
            totalRuneDistributed,
            avgDailyRune,
            annualizedRune,
            annualizedUsd,
            distributionDays,
            nextDistributionTime,
            nextDistributionAmount,
            blocksRemaining,
            distributions: this.showAllDistributions ? distributions : distributions.slice(0, 10) // Recent 10 or all
        }
    }

    private async loadMimirData(): Promise<TcyMimirData> {
        const baseUrl = this.tcyData!.network === 'mainnet'
            ? 'https://thornode.ninerealms.com'
            : 'https://stagenet-thornode.ninerealms.com'

        try {
            const mimirResponse = await fetch(`${baseUrl}/thorchain/mimir`)
            const mimirData = await mimirResponse.json()
            
            return {
                TCYCLAIMINGHALT: mimirData.TCYCLAIMINGHALT || 0,
                TCYCLAIMINGSWAPHALT: mimirData.TCYCLAIMINGSWAPHALT || 0,
                TCYSTAKEDISTRIBUTIONHALT: mimirData.TCYSTAKEDISTRIBUTIONHALT || 0,
                TCYSTAKINGHALT: mimirData.TCYSTAKINGHALT || 0,
                TCYUNSTAKINGHALT: mimirData.TCYUNSTAKINGHALT || 0,
                HALTTCYTRADING: mimirData.HALTTCYTRADING || 0
            }
        } catch (error) {
            console.log('Error loading mimir data:', error)
            return {
                TCYCLAIMINGHALT: 0,
                TCYCLAIMINGSWAPHALT: 0,
                TCYSTAKEDISTRIBUTIONHALT: 0,
                TCYSTAKINGHALT: 0,
                TCYUNSTAKINGHALT: 0,
                HALTTCYTRADING: 0
            }
        }
    }

    private updateUI(): void {
        // Update market data
        if (this.marketData) {
            this.updateElement('tcyPrice', `$${this.marketData.tcyPriceUsd.toFixed(6)}`)
            this.updateElement('tcyMarketCap', this.formatCurrency(this.marketData.tcyMarketCap))
            this.updateElement('tcyVsRune', `${this.marketData.tcyVsRunePercentage.toFixed(2)}%`)
            this.updateElementHTML('stakedSupply', `${this.formatNumber(this.marketData.stakedSupply)} ${AssetService.GetLogoWithChain('THOR.TCY', 16)}`)
            this.updateElementHTML('unstakedSupply', `${this.formatNumber(this.marketData.unstakedSupply)} ${AssetService.GetLogoWithChain('THOR.TCY', 16)}`)
            this.updateElementHTML('pooledSupply', `${this.formatNumber(this.marketData.pooledSupply)} ${AssetService.GetLogoWithChain('THOR.TCY', 16)}`)
            this.updateElementHTML('pendingRewards', `${Math.round(this.marketData.pendingRuneRewards)} ${AssetService.GetLogoWithChain('THOR.RUNE', 16)}`)
        }

        // Update balance data
        if (this.balanceData && this.marketData) {
            console.log('💰 Updating balance UI with:', this.balanceData)
            
            const stakedBalance = parseFloat(this.balanceData.stakedTcyBalance) || 0
            const unstakedTcyBalance = parseFloat(this.balanceData.unstakedTcyBalance) || 0
            
            const stakedUsd = stakedBalance * this.marketData.tcyPriceUsd
            const unstakedTcyUsd = unstakedTcyBalance * this.marketData.tcyPriceUsd
            
            this.updateElement('userStakedTcy', this.formatNumber(stakedBalance))
            this.updateElement('userStakedTcyUsd', this.formatCurrency(stakedUsd))
            this.updateElement('userUnstakedTcy', this.formatNumber(unstakedTcyBalance))
            this.updateElement('userUnstakedTcyUsd', this.formatCurrency(unstakedTcyUsd))
            
            // Enable/disable buttons based on balances
            this.updateActionButtons()
        }

        // Update rewards data
        if (this.rewardsData) {
            this.updateElement('currentApr', `${this.rewardsData.apr.toFixed(2)}%`)
            this.updateElement('totalRuneEarned', this.formatNumber(this.rewardsData.totalRuneDistributed))
            this.updateElement('nextDistribution', this.rewardsData.nextDistributionTime)
            this.updateElement('nextDistributionSub', `${this.rewardsData.blocksRemaining} blocks remaining`)
            
            // Update yield details section
            this.updateElement('totalRuneEarnedDetailed', `${this.formatNumber(this.rewardsData.totalRuneDistributed)} RUNE`)
            this.updateElement('avgDailyRune', `${this.formatNumber(this.rewardsData.avgDailyRune)} RUNE`)
            this.updateElement('annualizedRune', `${this.formatNumber(this.rewardsData.annualizedRune)} RUNE`)
            this.updateElement('distributionDays', `${this.rewardsData.distributionDays} days`)
            
            // Show rewards section if user has staked balance OR has distribution history
            const hasStakedBalance = this.balanceData && parseFloat(this.balanceData.stakedTcyBalance) > 0
            const hasDistributions = this.rewardsData.distributions && this.rewardsData.distributions.length > 0
            
            // Show yield statistics in balances section if there are distributions
            if (hasDistributions) {
                this.showElement('tcyYieldDetailsSection')
            }
            
            if (hasStakedBalance || hasDistributions) {
                this.showElement('tcyRewardsSection')
                // Show graph section immediately, then load chart async
                this.updatePayoutGraph()
                this.updateDistributionHistory()
                this.updateDistributionHistoryTitle()
            }
        }

        // Update mimir alerts
        if (this.mimirData) {
            this.updateMimirAlerts()
        }
    }

    private updateActionButtons(): void {
        const stakeBtn = document.getElementById('stakeBtn') as HTMLButtonElement
        const unstakeBtn = document.getElementById('unstakeBtn') as HTMLButtonElement
        
        if (stakeBtn && unstakeBtn && this.balanceData && this.mimirData) {
            // Enable stake button if user has unstaked TCY and staking is not halted
            const hasUnstakedTcy = parseFloat(this.balanceData.unstakedTcyBalance) > 0
            const stakingNotHalted = this.mimirData.TCYSTAKINGHALT !== 1
            stakeBtn.disabled = !hasUnstakedTcy || !stakingNotHalted
            
            // Enable unstake button if user has staked TCY and unstaking is not halted  
            const hasStakedTcy = parseFloat(this.balanceData.stakedTcyBalance) > 0
            const unstakingNotHalted = this.mimirData.TCYUNSTAKINGHALT !== 1
            unstakeBtn.disabled = !hasStakedTcy || !unstakingNotHalted
        }
    }

    private updateMimirAlerts(): void {
        if (!this.mimirData) return
        
        const alertsContainer = document.getElementById('tcyAlerts')
        if (!alertsContainer) return
        
        const alerts = []
        
        if (this.mimirData.TCYSTAKINGHALT === 1) {
            alerts.push('🚫 TCY Staking is temporarily paused')
        }
        if (this.mimirData.TCYUNSTAKINGHALT === 1) {
            alerts.push('🚫 TCY Unstaking is temporarily paused')
        }
        if (this.mimirData.TCYSTAKEDISTRIBUTIONHALT === 1) {
            alerts.push('🚫 TCY distribution payouts are temporarily paused')
        }
        if (this.mimirData.HALTTCYTRADING === 1) {
            alerts.push('🚫 TCY trading is temporarily paused')
        }
        
        if (alerts.length > 0) {
            alertsContainer.innerHTML = alerts.map(alert => `
                <div class="tcy-alert">
                    ${alert}
                </div>
            `).join('')
            alertsContainer.classList.remove('hidden')
        } else {
            alertsContainer.classList.add('hidden')
        }
    }

    private updateDistributionHistory(): void {
        const historyContainer = document.getElementById('distributionHistory')
        if (!historyContainer || !this.rewardsData) return
        
        if (this.rewardsData.distributions.length === 0) {
            historyContainer.innerHTML = '<p class="tcy-no-data">No distribution history available</p>'
            return
        }
        
        historyContainer.innerHTML = `
            <div class="tcy-history-header">
                <div class="tcy-history-col">Date</div>
                <div class="tcy-history-col">Amount</div>
                <div class="tcy-history-col">USD Value</div>
            </div>
            ${this.rewardsData.distributions.map(dist => `
                <div class="tcy-history-row">
                    <div class="tcy-history-col">${this.formatDate(Number(dist.date))}</div>
                    <div class="tcy-history-col">
                        <div class="tcy-history-amount-with-logo">
                            ${this.formatNumber(Number(dist.amount) / 1e8)}
                            ${AssetService.GetLogoWithChain('THOR.RUNE', 16)}
                        </div>
                    </div>
                    <div class="tcy-history-col">${this.formatCurrency(dist.usdValue)}</div>
                </div>
            `).join('')}
        `
    }

    private generateCumulativeData(): Array<{date: number, cumulativeRune: number}> {
        if (!this.allDistributions || this.allDistributions.length === 0) {
            return []
        }

        // Sort distributions by date in ascending order for cumulative calculation
        const sortedDistributions = [...this.allDistributions].sort((a, b) => Number(a.date) - Number(b.date))
        
        let cumulativeRune = 0
        return sortedDistributions.map(dist => {
            cumulativeRune += Number(dist.amount) / 1e8
            return {
                date: Number(dist.date),
                cumulativeRune
            }
        })
    }

    private updatePayoutGraph(): void {
        // Show loading immediately
        this.showGraphLoading()
        
        // Defer chart rendering to not block UI
        setTimeout(() => {
            this.renderPayoutGraph()
        }, 100)
    }
    
    private showGraphLoading(): void {
        const loadingContainer = document.getElementById('tcyGraphLoading')
        const graphContainer = document.getElementById('tcyPayoutGraph')
        
        if (loadingContainer) loadingContainer.classList.remove('hidden')
        if (graphContainer) graphContainer.classList.add('hidden')
    }
    
    private hideGraphLoading(): void {
        const loadingContainer = document.getElementById('tcyGraphLoading')
        const graphContainer = document.getElementById('tcyPayoutGraph')
        
        if (loadingContainer) loadingContainer.classList.add('hidden')
        if (graphContainer) graphContainer.classList.remove('hidden')
    }

    private renderPayoutGraph(): void {
        const graphContainer = document.getElementById('tcyPayoutGraph')
        if (!graphContainer) {
            this.hideGraphLoading()
            return
        }
        
        if (!this.allDistributions || this.allDistributions.length === 0) {
            graphContainer.innerHTML = '<p class="tcy-no-data">No distribution data available for graph</p>'
            this.hideGraphLoading()
            return
        }

        const cumulativeData = this.generateCumulativeData()
        if (cumulativeData.length === 0) {
            graphContainer.innerHTML = '<p class="tcy-no-data">Insufficient data for graph</p>'
            return
        }

        // Graph dimensions
        const width = 800
        const height = 300
        const padding = { top: 20, right: 60, bottom: 60, left: 120 }
        const graphWidth = width - padding.left - padding.right
        const graphHeight = height - padding.top - padding.bottom

        // Data ranges
        const minDate = Math.min(...cumulativeData.map(d => d.date))
        const maxDate = Math.max(...cumulativeData.map(d => d.date))
        const maxRune = Math.max(...cumulativeData.map(d => d.cumulativeRune))
        const minRune = 0 // Always start from 0

        // Scale functions
        const scaleX = (date: number) => padding.left + ((date - minDate) / (maxDate - minDate)) * graphWidth
        const scaleY = (rune: number) => padding.top + ((maxRune - rune) / (maxRune - minRune)) * graphHeight

        // Generate path data
        const pathData = cumulativeData.map((d, i) => {
            const x = scaleX(d.date)
            const y = scaleY(d.cumulativeRune)
            return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
        }).join(' ')

        // Generate gradient path (area under curve)
        const areaPathData = `M ${scaleX(minDate)} ${scaleY(0)} L ${pathData.substring(2)} L ${scaleX(maxDate)} ${scaleY(0)} Z`

        // Create Y-axis labels
        const yTicks = 5
        const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
            const value = (maxRune * i) / yTicks
            return {
                value,
                y: scaleY(value),
                label: this.formatNumber(value)
            }
        }).reverse()

        // Create X-axis labels (dates)
        const xTicks = Math.min(6, cumulativeData.length)
        const xLabels = Array.from({ length: xTicks }, (_, i) => {
            const index = Math.floor((cumulativeData.length - 1) * i / (xTicks - 1))
            const dataPoint = cumulativeData[index]
            return {
                x: scaleX(dataPoint.date),
                label: new Date(dataPoint.date * 1000).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                })
            }
        })

        graphContainer.innerHTML = `
            <svg class="tcy-payout-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" onclick="tcyGraphBackgroundClick(event)">
                <!-- Background -->
                <rect class="tcy-graph-background" width="${width}" height="${height}" />
                
                <!-- Grid lines -->
                <g class="tcy-graph-grid">
                    ${yLabels.slice(1, -1).map(tick => `
                        <line x1="${padding.left}" y1="${tick.y}" x2="${padding.left + graphWidth}" y2="${tick.y}" class="tcy-grid-line" />
                    `).join('')}
                </g>
                
                <!-- Area gradient -->
                <defs>
                    <linearGradient id="tcyPayoutGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" class="tcy-gradient-start" />
                        <stop offset="100%" class="tcy-gradient-end" />
                    </linearGradient>
                </defs>
                
                <!-- Area under curve -->
                <path class="tcy-graph-area" d="${areaPathData}" fill="url(#tcyPayoutGradient)" />
                
                <!-- Main line -->
                <path class="tcy-graph-line" d="${pathData}" fill="none" />
                
                <!-- Data points -->
                <g class="tcy-graph-points">
                    ${cumulativeData.map((d, i) => {
                        const originalDist = this.allDistributions.find(dist => Number(dist.date) === d.date)
                        const dayAmount = originalDist ? Number(originalDist.amount) / 1e8 : 0
                        return `
                        <circle class="tcy-graph-point" 
                                cx="${scaleX(d.date)}" 
                                cy="${scaleY(d.cumulativeRune)}" 
                                r="4"
                                data-date="${d.date}"
                                data-cumulative="${d.cumulativeRune}"
                                data-day-amount="${dayAmount}"
                                onclick="tcyGraphPointClick(this)"
                                onmouseenter="tcyGraphPointHover(this, true)"
                                onmouseleave="tcyGraphPointHover(this, false)">
                        </circle>
                    `}).join('')}
                </g>
                
                <!-- Y-axis -->
                <line class="tcy-graph-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + graphHeight}" />
                
                <!-- X-axis -->
                <line class="tcy-graph-axis" x1="${padding.left}" y1="${padding.top + graphHeight}" x2="${padding.left + graphWidth}" y2="${padding.top + graphHeight}" />
                
                <!-- Y-axis labels -->
                <g class="tcy-graph-labels">
                    ${yLabels.map(tick => `
                        <text class="tcy-graph-label-y" x="${padding.left - 25}" y="${tick.y + 4}" text-anchor="end">${tick.label}</text>
                    `).join('')}
                </g>
                
                <!-- Y-axis title (separate container) -->
                <g class="tcy-graph-axis-title">
                    <text class="tcy-graph-label-axis" x="15" y="${height / 2}" text-anchor="middle" transform="rotate(-90 15 ${height / 2})">RUNE Earned</text>
                </g>
                
                <!-- X-axis labels -->
                <g class="tcy-graph-labels">
                    ${xLabels.map(tick => `
                        <text class="tcy-graph-label-x" x="${tick.x}" y="${padding.top + graphHeight + 20}" text-anchor="middle">${tick.label}</text>
                    `).join('')}
                    <text class="tcy-graph-label-axis" x="${width / 2}" y="${height - 10}" text-anchor="middle">Distribution Date</text>
                </g>
                
                <!-- Tooltip container -->
                <g class="tcy-graph-tooltip" id="tcyGraphTooltip" style="display: none;">
                    <rect class="tcy-tooltip-bg" rx="8" ry="8" />
                    <text class="tcy-tooltip-date" y="15"></text>
                    <text class="tcy-tooltip-day-amount" y="35"></text>
                    <text class="tcy-tooltip-cumulative" y="55"></text>
                </g>
            </svg>
        `
        
        // Add global functions for graph interaction
        ;(window as any).tcyGraphPointHover = this.handleGraphPointHover.bind(this)
        ;(window as any).tcyGraphPointClick = this.handleGraphPointClick.bind(this)
        ;(window as any).tcyGraphBackgroundClick = this.handleGraphBackgroundClick.bind(this)
        
        // Hide loading and show chart
        this.hideGraphLoading()
    }

    private updateDistributionHistoryTitle(): void {
        const titleElement = document.getElementById('distributionHistoryTitle')
        if (!titleElement || this.allDistributions.length === 0) return
        
        const displayCount = this.rewardsData?.distributions.length || 0
        const totalCount = this.allDistributions.length
        
        if (this.showAllDistributions) {
            titleElement.textContent = `Distribution History (${totalCount} events)`
        } else {
            titleElement.textContent = `Recent Distributions (${displayCount} of ${totalCount} events)`
        }
    }

    private hoverTimeout: NodeJS.Timeout | null = null
    private pinnedPoint: Element | null = null

    private handleGraphPointHover(element: Element, isEntering: boolean): void {
        if (this.pinnedPoint === element) return // Don't show hover for pinned point
        
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout)
            this.hoverTimeout = null
        }
        
        if (isEntering) {
            this.hoverTimeout = setTimeout(() => {
                this.showGraphTooltip(element)
            }, 200) // 0.2 second delay
        } else {
            this.hideGraphTooltip()
        }
    }

    private handleGraphPointClick(element: Element): void {
        if (this.pinnedPoint === element) {
            // Unpin if clicking the same point
            this.pinnedPoint = null
            this.hideGraphTooltip()
        } else {
            // Pin to new point
            this.pinnedPoint = element
            this.showGraphTooltip(element)
        }
    }

    private handleGraphBackgroundClick(event: Event): void {
        const target = event.target as Element
        if (!target.classList.contains('tcy-graph-point')) {
            this.pinnedPoint = null
            this.hideGraphTooltip()
        }
    }

    private showGraphTooltip(element: Element): void {
        const tooltip = document.getElementById('tcyGraphTooltip')
        if (!tooltip) return
        
        const date = Number(element.getAttribute('data-date'))
        const cumulative = Number(element.getAttribute('data-cumulative'))
        const dayAmount = Number(element.getAttribute('data-day-amount'))
        
        const dateText = tooltip.querySelector('.tcy-tooltip-date') as SVGTextElement
        const dayAmountText = tooltip.querySelector('.tcy-tooltip-day-amount') as SVGTextElement
        const cumulativeText = tooltip.querySelector('.tcy-tooltip-cumulative') as SVGTextElement
        const bg = tooltip.querySelector('.tcy-tooltip-bg') as SVGRectElement
        
        if (dateText && dayAmountText && cumulativeText && bg) {
            dateText.textContent = new Date(date * 1000).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric', 
                year: 'numeric'
            })
            dayAmountText.textContent = `Daily: ${this.formatNumber(dayAmount)} RUNE`
            cumulativeText.textContent = `Total: ${this.formatNumber(cumulative)} RUNE`
            
            // Position tooltip near the point
            const cx = Number(element.getAttribute('cx'))
            const cy = Number(element.getAttribute('cy'))
            
            const tooltipWidth = 140
            const tooltipHeight = 70
            
            // Position tooltip to the right if there's space, otherwise to the left
            const svgWidth = 800
            let tooltipX = cx + 15
            if (tooltipX + tooltipWidth > svgWidth - 20) {
                tooltipX = cx - tooltipWidth - 15
            }
            
            let tooltipY = cy - tooltipHeight / 2
            if (tooltipY < 20) tooltipY = 20
            if (tooltipY + tooltipHeight > 280) tooltipY = 280 - tooltipHeight
            
            bg.setAttribute('x', tooltipX.toString())
            bg.setAttribute('y', tooltipY.toString())
            bg.setAttribute('width', tooltipWidth.toString())
            bg.setAttribute('height', tooltipHeight.toString())
            
            dateText.setAttribute('x', (tooltipX + 10).toString())
            dateText.setAttribute('y', (tooltipY + 15).toString())
            dayAmountText.setAttribute('x', (tooltipX + 10).toString())
            dayAmountText.setAttribute('y', (tooltipY + 35).toString())
            cumulativeText.setAttribute('x', (tooltipX + 10).toString())
            cumulativeText.setAttribute('y', (tooltipY + 55).toString())
            
            tooltip.style.display = 'block'
        }
    }

    private hideGraphTooltip(): void {
        if (this.pinnedPoint) return // Don't hide if pinned
        
        const tooltip = document.getElementById('tcyGraphTooltip')
        if (tooltip) {
            tooltip.style.display = 'none'
        }
    }

    private showStakeDialog(): void {
        if (!this.stakeDialog || !this.tcyData || !this.balanceData) return
        
        const stakeData: StakeDialogData = {
            unstakedTcyBalance: this.balanceData.unstakedTcyBalance,
            walletAddress: this.tcyData.address,
            network: this.tcyData.network
        }
        
        this.stakeDialog.show(stakeData, (formData: StakeFormData) => {
            this.handleStakeConfirmed(formData)
        })
    }

    private showUnstakeDialog(): void {
        if (!this.unstakeDialog || !this.tcyData || !this.balanceData) return
        
        const unstakeData: UnstakeDialogData = {
            stakedTcyBalance: this.balanceData.stakedTcyBalance,
            walletAddress: this.tcyData.address,
            network: this.tcyData.network
        }
        
        this.unstakeDialog.show(unstakeData, (formData: UnstakeFormData) => {
            this.handleUnstakeConfirmed(formData)
        })
    }

    private handleStakeConfirmed(stakeData: StakeFormData): void {
        console.log('✅ Stake confirmed:', stakeData)
        
        const prePopulatedData = {
            transactionType: 'deposit',
            asset: 'THOR.TCY',
            amount: stakeData.amount,
            memo: 'TCY+',
            toAddress: undefined
        }
        
        this.openSendModalWithData(prePopulatedData)
    }

    private handleUnstakeConfirmed(unstakeData: UnstakeFormData): void {
        console.log('✅ Unstake confirmed:', unstakeData)
        
        const prePopulatedData = {
            transactionType: 'deposit',
            asset: 'THOR.RUNE',
            amount: '0',
            memo: `TCY-:${unstakeData.basisPoints}`,
            toAddress: undefined
        }
        
        this.openSendModalWithData(prePopulatedData)
    }

    private openSendModalWithData(prePopulatedData: any): void {
        const dialogContainer = document.getElementById('global-overlay-container')
        if (!dialogContainer || !this.tcyData) {
            console.error('❌ Global overlay container or TCY data not found')
            return
        }
        
        if (!this.sendTransaction) {
            this.sendTransaction = new SendTransaction(dialogContainer, this.backend)
        }
        
        const sendWalletData: SendTransactionData = {
            walletId: this.tcyData.walletId,
            name: this.tcyData.name,
            currentAddress: this.tcyData.address,
            network: this.tcyData.network,
            availableBalances: this.formatBalancesForSend()
        }
        
        this.sendTransaction.initialize(sendWalletData, {
            onSuccess: (result) => {
                console.log('📤 TCY transaction completed:', result)
                this.refreshData()
            },
            onClose: () => {
                console.log('🔄 TCY dialog closed')
            }
        }, prePopulatedData)
    }

    private formatBalancesForSend(): SendAssetBalance[] {
        if (!this.balanceData) return []
        
        return [
            {
                asset: 'THOR.TCY',
                balance: this.balanceData.unstakedTcyBalance,
                usdValue: this.balanceData.unstakedTcyUsdValue.toString()
            },
            {
                asset: 'THOR.RUNE', 
                balance: this.balanceData.unstakedRuneBalance,
                usdValue: this.balanceData.unstakedRuneUsdValue.toString()
            }
        ]
    }

    private toggleDistributionHistory(): void {
        // Toggle between showing all distributions and recent 10
        this.showAllDistributions = !this.showAllDistributions
        
        const toggleBtn = document.getElementById('toggleHistoryBtn')
        if (toggleBtn) {
            toggleBtn.textContent = this.showAllDistributions ? 'Show Recent' : 'Show All'
        }
        
        // Update the distribution history display
        if (this.rewardsData && this.allDistributions.length > 0) {
            // Create temporary rewards data with the correct distributions to display
            const displayDistributions = this.showAllDistributions 
                ? this.allDistributions 
                : this.allDistributions.slice(0, 10)
            
            this.rewardsData.distributions = displayDistributions
            this.updateDistributionHistory()
            
            // Update the header title
            this.updateDistributionHistoryTitle()
        }
    }

    private refreshData(): void {
        console.log('🔄 Refreshing TCY data...')
        this.loadTcyData()
    }

    // UI State Management
    private showLoading(): void {
        this.showElement('tcyLoading')
        this.hideElement('tcyContent')
        this.hideElement('tcyError')
    }

    private showContent(): void {
        this.hideElement('tcyLoading')
        this.showElement('tcyContent')
        this.hideElement('tcyError')
    }

    private showError(message: string): void {
        this.hideElement('tcyLoading')
        this.hideElement('tcyContent')
        this.showElement('tcyError')
        this.updateElement('tcyErrorMessage', message)
    }

    private renderError(message: string): void {
        this.container.innerHTML = `
            <div class="tcy-tab">
                <div class="tcy-error">
                    <h4>⚠️ Error</h4>
                    <p>${message}</p>
                    <button class="tcy-btn tcy-btn-primary" onclick="window.location.reload()">
                        🔄 Reload
                    </button>
                </div>
            </div>
        `
    }

    // Utility Methods
    private updateElement(id: string, content: string): void {
        const element = document.getElementById(id)
        if (element) element.textContent = content
    }

    private updateElementHTML(id: string, content: string): void {
        const element = document.getElementById(id)
        if (element) element.innerHTML = content
    }

    private showElement(id: string): void {
        const element = document.getElementById(id)
        if (element) element.classList.remove('hidden')
    }

    private hideElement(id: string): void {
        const element = document.getElementById(id)
        if (element) element.classList.add('hidden')
    }

    private formatCurrency(value: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value)
    }

    private formatNumber(value: number): string {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 8
        }).format(value)
    }

    private formatDate(timestamp: number): string {
        return new Date(timestamp * 1000).toLocaleDateString()
    }

    // Cleanup
    destroy(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval)
            this.refreshInterval = null
        }
    }
}