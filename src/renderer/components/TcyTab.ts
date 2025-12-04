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
    nextDistributionTime: string
    nextDistributionAmount: number
    blocksRemaining: number
    distributions: Array<{
        amount: string
        date: string
        usdValue: number
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
                            
                            <div class="tcy-reward-card">
                                <div class="tcy-reward-label">Estimated Reward</div>
                                <div class="tcy-reward-value" id="estimatedReward">0.00 RUNE</div>
                            </div>
                        </div>

                        <!-- Distribution History -->
                        <div class="tcy-history-section">
                            <div class="tcy-history-header">
                                <h5>Recent Distributions</h5>
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
            if (stakedResponse.ok) {
                const stakedData = await stakedResponse.json()
                console.log('🏦 Staked TCY response:', stakedData)
                if (stakedData && stakedData.amount) {
                    stakedTcyBalance = (Number(stakedData.amount) / 1e8).toString()
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

    private async loadRewardsData(): Promise<TcyRewardsData> {
        if (!this.tcyData?.address || !this.balanceData || parseFloat(this.balanceData.stakedTcyBalance) <= 0) {
            return {
                apr: 0,
                totalRuneDistributed: 0,
                nextDistributionTime: 'No staked balance',
                nextDistributionAmount: 0,
                blocksRemaining: 0,
                distributions: []
            }
        }

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
        let distributions: Array<{ amount: string; date: string; usdValue: number }> = []

        try {
            const distributionsResponse = await fetch(`${baseUrl}/v2/tcy/distribution/${this.tcyData.address}`)
            if (distributionsResponse.ok) {
                const distributionsData = await distributionsResponse.json()
                
                distributions = distributionsData.distributions?.map((d: any) => ({
                    amount: d.amount,
                    date: d.date,
                    usdValue: (Number(d.amount) / 1e8) * (Number(d.price) / 1e8)
                })) || []

                apr = Number(distributionsData.apr || 0) * 100
                totalRuneDistributed = Number(distributionsData.total || 0) / 1e8
            } else {
                console.log('📊 No distribution history found (new staker)')
            }
        } catch (error) {
            console.log('📊 Error loading distribution history:', error)
        }

        return {
            apr,
            totalRuneDistributed,
            nextDistributionTime,
            nextDistributionAmount,
            blocksRemaining,
            distributions: distributions.slice(0, 10) // Recent 10
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
            this.updateElement('estimatedReward', `${this.formatNumber(this.rewardsData.nextDistributionAmount)} RUNE`)
            
            // Show rewards section if user has staked balance
            if (this.balanceData && parseFloat(this.balanceData.stakedTcyBalance) > 0) {
                this.showElement('tcyRewardsSection')
                this.updateDistributionHistory()
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
                    <div class="tcy-history-col">${this.formatNumber(Number(dist.amount) / 1e8)} RUNE</div>
                    <div class="tcy-history-col">${this.formatCurrency(dist.usdValue)}</div>
                </div>
            `).join('')}
        `
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
        // Implementation for showing/hiding full history
        const toggleBtn = document.getElementById('toggleHistoryBtn')
        if (toggleBtn) {
            const isShowingAll = toggleBtn.textContent === 'Show Recent'
            toggleBtn.textContent = isShowingAll ? 'Show All' : 'Show Recent'
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