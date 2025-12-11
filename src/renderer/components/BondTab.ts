/**
 * Bond Tab Component (TypeScript)
 * 
 * Manages THORChain node bonding operations:
 * 1) Add or remove bonds from nodes
 * 2) Track your bonds and rewards
 * 3) Monitor node performance and APY
 * 4) Handle MsgDeposit transactions for bonding
 * 
 * Implements the standard tab interface for context management.
 */

import { BondService, UserBondData, BondNodeInfo, NetworkData } from '../../services/bondService'
import { SendTransaction, SendTransactionData, AssetBalance as SendAssetBalance } from './SendTransaction'

export class BondTab {
    private container: HTMLElement
    private services: any
    private currentWallet: any = null
    private currentNetwork: 'mainnet' | 'stagenet' = 'mainnet'
    private isLoading: boolean = false
    private initialized: boolean = false
    private bondService: BondService
    private bondData: UserBondData | null = null
    private networkData: NetworkData | null = null
    private runePrice: number = 0
    private btcPrice: number = 0
    private nextChurnInfo: { nextChurnTime: number; countdown: string } = { nextChurnTime: 0, countdown: 'Unknown' }
    private sendTransaction: SendTransaction | null = null

    constructor(container: HTMLElement, services: any) {
        this.container = container
        this.services = services
        this.bondService = new BondService(this.currentNetwork)
    }

    async initialize(wallet: any, network: 'mainnet' | 'stagenet'): Promise<void> {
        try {
            console.log('🚀 Initializing Bond Tab...')
            
            this.currentWallet = wallet
            this.currentNetwork = network
            this.bondService.setNetwork(network)
            
            // Render loading state first
            this.renderLoadingState()
            
            // Load bond data
            await this.loadBondData()
            
            this.initialized = true
            console.log('✅ Bond Tab initialized')
            
        } catch (error) {
            console.error('❌ Failed to initialize Bond Tab:', error)
            this.renderError('Failed to initialize bond tab')
        }
    }

    private async loadBondData(): Promise<void> {
        if (!this.currentWallet) return
        
        try {
            this.isLoading = true
            
            const address = this.currentNetwork === 'mainnet' 
                ? this.currentWallet.mainnetAddress 
                : this.currentWallet.stagenetAddress
                
            if (!address) {
                await this.renderNoBonds()
                return
            }

            // Fetch bond data
            this.bondData = await this.bondService.fetchUserBonds(address)
            
            // Fetch additional data in parallel
            const [runePrice, btcPrice, nextChurnInfo, networkData] = await Promise.all([
                this.bondService.getRunePrice(),
                this.bondService.getBtcPrice(), 
                this.bondService.getNextChurnInfo(),
                this.bondService.getNetworkData()
            ])
            
            this.runePrice = runePrice
            this.btcPrice = btcPrice
            this.nextChurnInfo = nextChurnInfo
            this.networkData = networkData
            
            // Render the UI
            if (this.bondData) {
                this.renderBondTracker()
            } else {
                await this.renderNoBonds()
            }
            
        } catch (error) {
            console.error('Error loading bond data:', error)
            this.renderError('Failed to load bond data')
        } finally {
            this.isLoading = false
        }
    }
    
    private renderLoadingState(): void {
        if (!this.container) return
        
        this.container.innerHTML = `
            <div class="bond-tab-container">
           
                <div class="bond-tab-loading">
                    <div class="bond-tab-loading-spinner"></div>
                    <p>Fetching bond information from ${this.currentNetwork}...</p>
                </div>
            </div>
        `
        
        this.addComponentStyles()
    }
    
    private async renderNoBonds(): Promise<void> {
        if (!this.container) return
        
        const address = this.currentNetwork === 'mainnet' 
            ? this.currentWallet?.mainnetAddress 
            : this.currentWallet?.stagenetAddress
            
        // Fetch network data for APY display if not already loaded
        if (!this.networkData) {
            try {
                this.networkData = await this.bondService.getNetworkData()
            } catch (error) {
                console.error('Failed to fetch network data for not whitelisted screen:', error)
            }
        }
            
        this.container.innerHTML = `
            <div class="bond-tab-container">
                <div class="bond-tab-header">
                    <h2>🏦 Node Bonding</h2>
                    <p class="bond-tab-subtitle">Manage your THORChain node bonds and track rewards</p>
                </div>
                
                <div class="bond-tab-content">
                    <div class="bond-tab-not-whitelisted">
                        <div class="bond-tab-not-whitelisted-container">
                            <!-- Hero Section -->
                            <div class="bond-tab-hero-section">
                                <div class="bond-tab-hero-icon">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <path d="M9 12l2 2 4-4"/>
                                        <path d="M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.745 3.745 0 0 1 3.296-1.043A3.745 3.745 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12z"/>
                                    </svg>
                                </div>
                                <h3 class="bond-tab-hero-title">Ready to Bond?</h3>
                                <p class="bond-tab-hero-subtitle">
                                    This address is not currently whitelisted for bonding. Get started by connecting with node operators.
                                </p>
                            </div>
                            
                            <!-- Opportunity Cards -->
                            <div class="bond-tab-opportunity-grid">
                                <div class="bond-tab-opportunity-card bond-tab-apy-card">
                                    <h4>Current Network APY</h4>
                                    <div class="bond-tab-apy-highlight">${this.networkData ? (this.networkData.bondingAPY * 100).toFixed(2) : '0.00'}%</div>
                                    <p>Annual yield for bond providers</p>
                                </div>
                            </div>
                            
                            <!-- Address Section -->
                            <div class="bond-tab-address-section">
                                <h4>Your Address</h4>
                                <div class="bond-tab-address-display" data-address="${address}" data-action="copy-address">
                                    <div class="bond-tab-address-content">
                                        <span class="bond-tab-address-text">${address || 'Not available'}</span>
                                        <div class="bond-tab-copy-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Steps Section -->
                            <div class="bond-tab-steps-section">
                                <h4>How to Start Bonding</h4>
                                <div class="bond-tab-steps-list">
                                    <div class="bond-tab-step">
                                        <div class="bond-tab-step-number">1</div>
                                        <div class="bond-tab-step-content">
                                            <h5>Find a Node Operator</h5>
                                            <p>Connect with THORChain node operators who accept bond providers</p>
                                        </div>
                                    </div>
                                    <div class="bond-tab-step">
                                        <div class="bond-tab-step-number">2</div>
                                        <div class="bond-tab-step-content">
                                            <h5>Get Whitelisted</h5>
                                            <p>Provide your address to be added to their bond provider list</p>
                                        </div>
                                    </div>
                                    <div class="bond-tab-step">
                                        <div class="bond-tab-step-number">3</div>
                                        <div class="bond-tab-step-content">
                                            <h5>Start Bonding</h5>
                                            <p>Add RUNE bonds to support network security and earn rewards</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Actions -->
                            <div class="bond-tab-actions-grid">
                                <button class="bond-tab-primary-btn bond-tab-refresh-btn" data-action="refresh">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                    Check Status
                                </button>
                                
                                <button class="bond-tab-secondary-btn" data-action="open-runebond">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15,3 21,3 21,9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                    Connect with a Node Operator
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
        
        this.attachEventListeners()
        this.addComponentStyles()
    }
    
    private renderBondTracker(): void {
        if (!this.container || !this.bondData) return
        
        const bondData = this.bondData
        const totalBondRune = bondData.totalBond / 1e8
        const totalAwardRune = bondData.totalAward / 1e8
        const bondValueUSD = totalBondRune * this.runePrice
        const awardValueUSD = totalAwardRune * this.runePrice
        const bondValueBTC = totalBondRune * this.btcPrice
        const awardValueBTC = totalAwardRune * this.btcPrice
        
        this.container.innerHTML = `
            <div class="bond-tab-container">
                <div class="bond-tab-header">
                    <h2>🏦 Bond Tracker</h2>
                </div>
                
                <div class="bond-tab-content">
                    <div class="bond-tab-summary-grid">
                        <div class="bond-tab-card bond-tab-bond">
                            <h3>Total Bond</h3>
                            <div class="bond-tab-main-value">
                                <div class="bond-tab-value-content">
                                    ${this.formatNumber(totalBondRune.toFixed(1))}
                                    <img src="images/assets/RUNE.svg" alt="RUNE" class="bond-tab-rune-icon" />
                                </div>
                            </div>
                            <div class="bond-tab-sub-values">
                                <span class="bond-tab-usd-value">$${this.formatNumber(bondValueUSD.toFixed(0))}</span>
                                <span class="bond-tab-btc-value">
                                    ${bondValueBTC.toFixed(2)}
                                    <img src="images/assets/BTC.svg" alt="BTC" class="bond-tab-btc-icon" />
                                </span>
                            </div>
                        </div>
                        
                        <div class="bond-tab-card bond-tab-next-award">
                            <h3>Next Award</h3>
                            <div class="bond-tab-main-value">
                                <div class="bond-tab-value-content">
                                    ${totalAwardRune < 0.000001 ? totalAwardRune.toFixed(8) : totalAwardRune < 0.1 ? totalAwardRune.toFixed(6) : totalAwardRune.toFixed(1)}
                                    <img src="images/assets/RUNE.svg" alt="RUNE" class="bond-tab-rune-icon" />
                                </div>
                            </div>
                            <div class="bond-tab-sub-values">
                                <span class="bond-tab-usd-value">$${this.formatNumber(awardValueUSD.toFixed(0))}</span>
                                <span class="bond-tab-btc-value">
                                    ${awardValueBTC.toFixed(6)}
                                    <img src="images/assets/BTC.svg" alt="BTC" class="bond-tab-btc-icon" />
                                </span>
                            </div>
                        </div>
                        
                        <div class="bond-tab-card bond-tab-apy">
                            <h3>APY</h3>
                            <div class="bond-tab-main-value">
                                <div class="bond-tab-value-content">
                                    ${(bondData.aggregateAPY * 100).toFixed(2)}%
                                </div>
                            </div>
                            <div class="bond-tab-sub-values">
                                <span class="bond-tab-usd-value">$${this.formatNumber(((bondData.aggregateAPY * totalBondRune) * this.runePrice).toFixed(0))}/yr</span>
                                <span class="bond-tab-rune-value">
                                    ${this.formatNumber((bondData.aggregateAPY * totalBondRune).toFixed(0))}
                                    <img src="images/assets/RUNE.svg" alt="RUNE" class="bond-tab-rune-icon" />
                                    /yr
                                </span>
                            </div>
                        </div>
                        
                        <div class="bond-tab-card bond-tab-churn">
                            <h3>Next Churn</h3>
                            <div class="bond-tab-main-value">
                                <div class="bond-tab-value-content">
                                    ${this.nextChurnInfo.countdown}
                                </div>
                            </div>
                            <div class="bond-tab-sub-values">
                                <span class="bond-tab-churn-info">Time until next node rotation</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bond-tab-network-section">
                        <h3>Network Information</h3>
                        ${this.renderNetworkInfo()}
                    </div>
                    
                    <div class="bond-tab-nodes-section">
                        <h3>Your Bonded Nodes</h3>
                        ${this.renderNodesTable(bondData.nodes)}
                    </div>
                    
                    <div class="bond-tab-refresh-section">
                        <button class="bond-tab-action-btn bond-tab-refresh-btn" data-action="refresh">
                            🔄 Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        `
        
        this.attachEventListeners()
        this.addComponentStyles()
    }
    
    private renderNetworkInfo(): string {
        if (!this.networkData) {
            return '<div class="bond-tab-network-loading">Loading network information...</div>'
        }

        const bondRevenueShare = (1 - this.networkData.poolShareFactor) * 100
        const activeBondRune = Math.round(this.networkData.totalActiveBond / 1e8)
        const standbyBondRune = Math.round(this.networkData.totalStandbyBond / 1e8)
        
        console.log('🔍 Network Debug:', {
            totalActiveBond: this.networkData.totalActiveBond,
            totalStandbyBond: this.networkData.totalStandbyBond,
            activeBondRune,
            standbyBondRune,
            poolShareFactor: this.networkData.poolShareFactor
        })

        return `
            <div class="bond-tab-network-info-container">
                <div class="bond-tab-network-grid">
                    <div class="bond-tab-network-item">
                        <span class="bond-tab-network-label">Bond Revenue Share</span>
                        <span class="bond-tab-network-value">${bondRevenueShare.toFixed(2)}%</span>
                    </div>
                    <div class="bond-tab-network-item">
                        <span class="bond-tab-network-label">Active Nodes</span>
                        <span class="bond-tab-network-value">${this.formatNumber(this.networkData.activeNodeCount)}</span>
                    </div>
                    <div class="bond-tab-network-item">
                        <span class="bond-tab-network-label">Active Bond</span>
                        <div class="bond-tab-network-value bond-tab-network-rune">
                            ${this.formatNumber(activeBondRune)}
                            <img src="images/assets/RUNE.svg" alt="RUNE" class="bond-tab-network-rune-icon" />
                        </div>
                    </div>
                    <div class="bond-tab-network-item">
                        <span class="bond-tab-network-label">Standby Bond</span>
                        <div class="bond-tab-network-value bond-tab-network-rune">
                            ${this.formatNumber(standbyBondRune)}
                            <img src="images/assets/RUNE.svg" alt="RUNE" class="bond-tab-network-rune-icon" />
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    private renderNodesTable(nodes: BondNodeInfo[]): string {
        return `
            <div class="bond-tab-nodes-table-container">
                <table class="bond-tab-nodes-table">
                    <thead>
                        <tr>
                            <th>Node</th>
                            <th>Status</th>
                            <th>My Bond</th>
                            <th>Total Bond</th>
                            <th>Fee</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderNodesTableRows(nodes)}
                    </tbody>
                </table>
            </div>
        `
    }
    
    private renderNodesTableRows(nodes: BondNodeInfo[]): string {
        return nodes.map(node => `
            <tr class="bond-tab-node-row">
                <td class="bond-tab-node-info">
                    <div class="bond-tab-node-address">
                        <span class="bond-tab-node-suffix">${node.addressSuffix}</span>
                        <button class="bond-tab-node-link" data-node="${node.address}" title="View Node Info">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15,3 21,3 21,9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </button>
                    </div>
                </td>
                <td class="bond-tab-node-status">
                    <div class="bond-tab-status-indicator ${node.status === 'Active' ? 'bond-tab-active' : 'bond-tab-inactive'}"></div>
                    <span class="bond-tab-status-text">${node.status}</span>
                </td>
                <td class="bond-tab-bond-amount">
                    <div class="bond-tab-bond-value">
                        <span class="bond-tab-bond-rune">${this.formatNumber(node.bondFullAmount)}</span>
                        <img src="images/assets/RUNE.svg" alt="RUNE" class="bond-tab-table-rune-icon" />
                    </div>
                    <div class="bond-tab-bond-usd">$${this.formatNumber((node.bond / 1e8 * this.runePrice).toFixed(0))}</div>
                </td>
                <td class="bond-tab-total-bond">
                    <div class="bond-tab-bond-value">
                        <span class="bond-tab-bond-rune">${this.formatNumber((node.totalBond / 1e8).toFixed(0))}</span>
                        <img src="images/assets/RUNE.svg" alt="RUNE" class="bond-tab-table-rune-icon" />
                    </div>
                    <div class="bond-tab-ownership">${(node.bondOwnershipPercentage * 100).toFixed(1)}% owned</div>
                </td>
                <td class="bond-tab-node-fee">
                    ${(node.nodeOperatorFee * 100).toFixed(1)}%
                </td>
                <td class="bond-tab-node-actions">
                    <button class="bond-tab-table-btn bond-tab-add-btn" data-action="add-bond" data-node="${node.address}" title="Add to Bond">
                        ➕
                    </button>
                    <button class="bond-tab-table-btn bond-tab-remove-btn" data-action="remove-bond" data-node="${node.address}" title="Remove from Bond" ${node.status !== 'Standby' ? 'disabled' : ''}>
                        ➖
                    </button>
                </td>
            </tr>
        `).join('')
    }
    
    private formatNumber(x: string | number): string {
        return new Intl.NumberFormat().format(Number(x))
    }

    private attachEventListeners(): void {
        // Table action buttons (add/remove)
        const tableActionBtns = this.container.querySelectorAll('.bond-tab-table-btn[data-action]')
        tableActionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = (e.currentTarget as HTMLElement).getAttribute('data-action')
                const nodeAddress = (e.currentTarget as HTMLElement).getAttribute('data-node')
                if (action === 'add-bond' && nodeAddress) {
                    this.handleAddBond(nodeAddress)
                } else if (action === 'remove-bond' && nodeAddress) {
                    this.handleRemoveBond(nodeAddress)
                }
            })
        })
        
        // Refresh button
        const refreshBtn = this.container.querySelector('[data-action="refresh"]')
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh())
        }
        
        // Node links
        const nodeLinks = this.container.querySelectorAll('[data-node]')
        nodeLinks.forEach(link => {
            // Skip action buttons
            if (!link.classList.contains('bond-tab-node-link')) return
            
            link.addEventListener('click', (e) => {
                const nodeAddress = (e.currentTarget as HTMLElement).getAttribute('data-node')
                if (nodeAddress) {
                    this.openNodeInfo(nodeAddress)
                }
            })
        })
        
        // Address copy functionality
        const copyAddressEl = this.container.querySelector('[data-action="copy-address"]')
        if (copyAddressEl) {
            copyAddressEl.addEventListener('click', () => {
                const address = copyAddressEl.getAttribute('data-address')
                if (address) {
                    navigator.clipboard.writeText(address).then(() => {
                        // Use the universal toast service
                        if (this.services.ui) {
                            this.services.ui.showSuccess('Address copied to clipboard!')
                        }
                    }).catch(() => {
                        if (this.services.ui) {
                            this.services.ui.showError('Failed to copy address')
                        }
                    })
                }
            })
        }
        
        // RuneBond external link
        const runebondBtn = this.container.querySelector('[data-action="open-runebond"]')
        if (runebondBtn) {
            runebondBtn.addEventListener('click', () => {
                this.openExternalUrl('https://runebond.com/')
            })
        }
    }
    
    private async handleAddBond(nodeAddress: string): Promise<void> {
        if (!this.currentWallet || !this.bondData) return
        
        const node = this.bondData.nodes.find(n => n.address === nodeAddress)
        if (!node) return
        
        this.showBondAmountModal('add', node)
    }
    
    private async handleRemoveBond(nodeAddress: string): Promise<void> {
        if (!this.currentWallet || !this.bondData) return
        
        const node = this.bondData.nodes.find(n => n.address === nodeAddress)
        if (!node) return
        
        // Check if node allows bond removal (Standby status)
        if (node.status !== 'Standby') {
            alert('Bond removal is only allowed when nodes are in Standby status. This node is currently ' + node.status + '.')
            return
        }
        
        this.showBondAmountModal('remove', node)
    }
    
    private openNodeInfo(nodeAddress: string): void {
        const url = `https://thorchain.net/node/${nodeAddress}`
        window.open(url, '_blank')
    }
    
    private openExternalUrl(url: string): void {
        // Open in system's default browser
        // In Electron, window.open with external URLs should open in the default browser
        window.open(url, '_blank')
    }
    
    private async showBondAmountModal(action: 'add' | 'remove', node: BondNodeInfo): Promise<void> {
        // Get user's current RUNE balance using the same approach as TCY tab
        let runeBalance = '0'
        try {
            // Get current address based on network
            const currentAddress = this.currentNetwork === 'mainnet' 
                ? this.currentWallet.mainnetAddress 
                : this.currentWallet.stagenetAddress
                
            const baseUrl = this.currentNetwork === 'mainnet' 
                ? 'https://thornode.ninerealms.com' 
                : 'https://stagenet-thornode.ninerealms.com'
                
            const balancesResponse = await fetch(`${baseUrl}/cosmos/bank/v1beta1/balances/${currentAddress}`)
            if (balancesResponse.ok) {
                const balancesData = await balancesResponse.json()
                console.log('💰 RUNE wallet balances response:', balancesData)
                
                const runeBalanceData = balancesData.balances?.find((b: any) => b.denom === 'rune')
                runeBalance = runeBalanceData ? (Number(runeBalanceData.amount) / 1e8).toString() : '0'
                console.log('🔍 Final RUNE balance:', runeBalance)
            } else {
                console.log('💰 Error fetching RUNE wallet balance, status:', balancesResponse.status)
            }
        } catch (error) {
            console.error('❌ Failed to fetch RUNE balance:', error)
        }
        
        const modalHtml = `
            <div class="bond-tab-modal-overlay" id="bondAmountModal">
                <div class="bond-tab-modal">
                    <div class="bond-tab-modal-header">
                        <h3>${action === 'add' ? 'Add to Bond' : 'Remove from Bond'}</h3>
                        <button class="bond-tab-modal-close" data-action="close-modal">×</button>
                    </div>
                    
                    <div class="bond-tab-modal-body">
                        <div class="bond-tab-modal-node-info">
                            <div class="bond-tab-modal-node-header">
                                <div class="bond-tab-modal-node-icon">
                                    <div class="bond-tab-status-indicator ${node.status === 'Active' ? 'bond-tab-active' : 'bond-tab-inactive'}"></div>
                                </div>
                                <div class="bond-tab-modal-node-details">
                                    <h4>Node ${node.addressSuffix}</h4>
                                    <span class="bond-tab-modal-node-status">${node.status}</span>
                                </div>
                            </div>
                            
                            <div class="bond-tab-modal-info-grid">
                                <div class="bond-tab-modal-info-item">
                                    <span class="bond-tab-modal-info-label">Your Balance</span>
                                    <span class="bond-tab-modal-info-value">
                                        ${this.formatNumber((parseFloat(runeBalance) || 0).toFixed(2))} 
                                        <img src="images/assets/RUNE.svg" alt="RUNE" class="bond-tab-modal-rune-icon" />
                                    </span>
                                </div>
                                <div class="bond-tab-modal-info-item">
                                    <span class="bond-tab-modal-info-label">Your Bond</span>
                                    <span class="bond-tab-modal-info-value">
                                        ${this.formatNumber(node.bondFullAmount)} 
                                        <img src="images/assets/RUNE.svg" alt="RUNE" class="bond-tab-modal-rune-icon" />
                                    </span>
                                </div>
                                <div class="bond-tab-modal-info-item">
                                    <span class="bond-tab-modal-info-label">Node Fee</span>
                                    <span class="bond-tab-modal-info-value">${(node.nodeOperatorFee * 100).toFixed(1)}%</span>
                                </div>
                                <div class="bond-tab-modal-info-item">
                                    <span class="bond-tab-modal-info-label">Total Bond</span>
                                    <span class="bond-tab-modal-info-value">
                                        ${this.formatNumber((node.totalBond / 1e8).toFixed(0))} 
                                        <img src="images/assets/RUNE.svg" alt="RUNE" class="bond-tab-modal-rune-icon" />
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bond-tab-modal-input-group">
                            <label for="bondAmount">Amount (RUNE):</label>
                            <div class="bond-tab-modal-input-wrapper">
                                <input 
                                    type="number" 
                                    id="bondAmount" 
                                    placeholder="Enter amount"
                                    min="0.00000001"
                                    ${action === 'remove' ? `max="${node.bondFullAmount}"` : `max="${runeBalance}"`}
                                    step="0.00000001"
                                    class="bond-tab-modal-input"
                                />
                                <img src="images/assets/RUNE.svg" alt="RUNE" class="bond-tab-modal-input-icon" />
                            </div>
                            ${action === 'remove' 
                                ? `<small class="bond-tab-modal-hint">Max: ${this.formatNumber(node.bondFullAmount)} RUNE (your current bond)</small>` 
                                : `<small class="bond-tab-modal-hint">Max: ${this.formatNumber((parseFloat(runeBalance) || 0).toFixed(2))} RUNE (your balance)</small>`
                            }
                        </div>
                        
                        <div class="bond-tab-modal-actions">
                            <button class="bond-tab-modal-btn bond-tab-modal-cancel" data-action="close-modal">
                                Cancel
                            </button>
                            <button class="bond-tab-modal-btn bond-tab-modal-confirm" data-action="confirm-bond" data-bond-action="${action}" data-node-address="${node.address}">
                                ${action === 'add' ? 'Add Bond' : 'Remove Bond'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml)
        
        // Add event listeners for modal buttons
        const modal = document.getElementById('bondAmountModal')
        if (modal) {
            // Close modal buttons
            const closeBtns = modal.querySelectorAll('[data-action="close-modal"]')
            closeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.remove()
                })
            })
            
            // Confirm bond button
            const confirmBtn = modal.querySelector('[data-action="confirm-bond"]')
            if (confirmBtn) {
                confirmBtn.addEventListener('click', (e) => {
                    const target = e.currentTarget as HTMLElement
                    const bondAction = target.getAttribute('data-bond-action')
                    const nodeAddress = target.getAttribute('data-node-address')
                    if (bondAction && nodeAddress) {
                        this.processBondAmount(bondAction as 'add' | 'remove', nodeAddress)
                    }
                })
            }
        }
        
        // Focus on input
        const input = document.getElementById('bondAmount') as HTMLInputElement
        if (input) {
            input.focus()
            
            // Handle Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.processBondAmount(action, node.address)
                }
            })
            
            // Handle ESC key to close modal
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('bondAmountModal')
                    if (modal) modal.remove()
                }
            }, { once: true })
        }
    }
    
    private processBondAmount(action: 'add' | 'remove', nodeAddress: string): void {
        const input = document.getElementById('bondAmount') as HTMLInputElement
        const amountStr = input?.value?.trim()
        
        if (!amountStr || !this.bondData) {
            alert('Please enter a valid amount')
            return
        }
        
        const amount = parseFloat(amountStr)
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid positive amount')
            return
        }
        
        const node = this.bondData.nodes.find(n => n.address === nodeAddress)
        if (!node) {
            alert('Node not found')
            return
        }
        
        // Validation for remove
        if (action === 'remove') {
            if (amount > node.bondFullAmount) {
                alert(`Cannot remove more than your current bond (${this.formatNumber(node.bondFullAmount)} RUNE)`)
                return
            }
            
            if (node.status !== 'Standby') {
                alert('Bond removal is only allowed when nodes are in Standby status')
                return
            }
        }
        
        // Close modal
        const modal = document.getElementById('bondAmountModal')
        if (modal) {
            modal.remove()
        }
        
        // Process transaction
        this.executeBondTransaction(action, nodeAddress, amount)
    }
    
    private async executeBondTransaction(action: 'add' | 'remove', nodeAddress: string, amount: number): Promise<void> {
        try {
            // Find the global overlay container (same as SwapTab)
            const dialogContainer = document.getElementById('global-overlay-container')
            if (!dialogContainer) {
                console.error('Global overlay container not found')
                alert('Transaction dialog container not found')
                return
            }
            
            // Initialize SendTransaction component if not exists
            if (!this.sendTransaction) {
                this.sendTransaction = new SendTransaction(dialogContainer, this.services)
            }
            
            // Get current address based on network
            const currentAddress = this.currentNetwork === 'mainnet' 
                ? this.currentWallet.mainnetAddress 
                : this.currentWallet.stagenetAddress
                
            // Prepare wallet data for send dialog
            const sendWalletData: SendTransactionData = {
                walletId: this.currentWallet.walletId,
                name: this.currentWallet.name,
                currentAddress: currentAddress,
                network: this.currentNetwork,
                availableBalances: [{
                    asset: 'THOR.RUNE',
                    balance: '0', // Will be updated by SendTransaction
                    usdValue: '0'
                }]
            }
            
            let prePopulatedData: any
            
            if (action === 'add') {
                // For adding bonds: MsgDeposit with the amount and BOND memo
                const memo = `BOND:${nodeAddress}`
                
                prePopulatedData = {
                    transactionType: 'deposit',
                    asset: 'THOR.RUNE',
                    amount: amount.toString(),
                    memo: memo,
                    skipToConfirmation: true // Skip to password confirmation step
                }
            } else {
                // For removing bonds: MsgDeposit with amount=0 and UNBOND memo with base units
                const amountBaseUnits = Math.round(amount * 1e8)
                const memo = `UNBOND:${nodeAddress}:${amountBaseUnits}`
                
                prePopulatedData = {
                    transactionType: 'deposit',
                    asset: 'THOR.RUNE',
                    amount: '0', // Amount is 0 for unbond
                    memo: memo,
                    skipToConfirmation: true // Skip to password confirmation step
                }
            }
            
            // Show the send dialog with pre-populated data
            await this.sendTransaction.initialize(sendWalletData, () => {
                console.log('📝 Bond transaction dialog closed')
                // Refresh data after transaction
                setTimeout(() => {
                    this.refresh()
                }, 6000) // 6 seconds as specified in requirements
            }, prePopulatedData)
            
        } catch (error) {
            console.error('❌ Failed to open bond transaction dialog:', error)
            alert('Failed to open transaction dialog: ' + (error as Error).message)
        }
    }

    private addComponentStyles(): void {
        // Styles are now externalized to BondTab.css file
        // This method is retained for backwards compatibility
        // but no longer injects inline styles
    }

    private renderError(message: string): void {
        if (!this.container) return
        
        this.container.innerHTML = `
            <div class="bond-tab-container">
                <div class="bond-tab-error">
                    <div class="bond-tab-error-icon">❌</div>
                    <h3>Error Loading Bond Tab</h3>
                    <p>${message}</p>
                    <button class="bond-tab-error-retry-btn" data-action="refresh">
                        Retry
                    </button>
                </div>
            </div>
        `
    }

    // Standard Tab Interface Implementation

    async updateContext(wallet: any, network: 'mainnet' | 'stagenet'): Promise<void> {
        try {
            console.log('🔄 Updating Bond Tab context...')
            
            const networkChanged = this.currentNetwork !== network
            
            this.currentWallet = wallet
            this.currentNetwork = network
            this.bondService.setNetwork(network)
            
            // Reload data if network changed or if this is the first time
            if (this.initialized && (networkChanged || !this.bondData)) {
                await this.loadBondData()
            }
            
            console.log('✅ Bond Tab context updated')
            
        } catch (error) {
            console.error('❌ Failed to update Bond Tab context:', error)
        }
    }

    async updateWallet(newWallet: any, currentNetwork: 'mainnet' | 'stagenet'): Promise<void> {
        await this.updateContext(newWallet, currentNetwork)
    }

    async updateNetwork(newNetwork: 'mainnet' | 'stagenet', currentWallet: any): Promise<void> {
        await this.updateContext(currentWallet, newNetwork)
    }

    async refresh(): Promise<void> {
        if (this.initialized) {
            console.log('🔄 Refreshing Bond Tab data...')
            
            // Add refreshing animation
            const contentEl = this.container.querySelector('.bond-tab-content')
            if (contentEl) {
                contentEl.classList.add('bond-tab-refreshing')
            }
            
            await this.loadBondData()
            
            // Remove refreshing animation after data loads
            if (contentEl) {
                setTimeout(() => {
                    contentEl.classList.remove('bond-tab-refreshing')
                }, 300)
            }
        }
    }

    async onActivated(): Promise<void> {
        console.log('🏦 Bond Tab activated')
        
        // Refresh data when tab becomes active if it's been a while
        if (this.initialized && this.bondData) {
            // Add a small delay to refresh data to account for potential transactions
            setTimeout(() => {
                this.refresh()
            }, 1000)
        }
    }

    getNetworkRequirements(): string[] {
        return ['mainnet', 'stagenet'] // Works on both networks
    }

    validateRequirements(wallet: any, network: string): boolean {
        // Bond tab requires a wallet to be connected
        return wallet && wallet.address
    }

    isInitialized(): boolean {
        return this.initialized
    }

    getState(): any {
        return {
            wallet: this.currentWallet,
            network: this.currentNetwork,
            isLoading: this.isLoading
        }
    }

    setState(newState: any): void {
        Object.assign(this, newState)
    }

    cleanup(): void {
        // Remove component styles when cleaning up
        const styles = document.getElementById('bond-tab-styles')
        if (styles) {
            styles.remove()
        }
        
        if (this.container) {
            this.container.innerHTML = ''
        }
        
        console.log('🧹 Bond Tab cleanup completed')
    }
}