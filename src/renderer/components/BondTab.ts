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
                <div class="bond-tab-header">
                    <h2>🏦 Node Bonding</h2>
                    <p class="bond-tab-subtitle">Loading your bond data...</p>
                </div>
                
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
                            <div class="bond-tab-status-section">
                                <div class="bond-tab-status-icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="15" y1="9" x2="9" y2="15"></line>
                                        <line x1="9" y1="9" x2="15" y2="15"></line>
                                    </svg>
                                </div>
                                <h3>Address Not Whitelisted</h3>
                                <p class="bond-tab-status-description">
                                    This address is not currently whitelisted as a bond provider on any THORChain nodes.
                                </p>
                            </div>
                            
                            <div class="bond-tab-info-section">
                                <div class="bond-tab-network-stats">
                                    <div class="bond-tab-apy-display">
                                        <span class="bond-tab-info-label">Current Network APY</span>
                                        <span class="bond-tab-apy-value">${this.networkData ? (this.networkData.bondingAPY * 100).toFixed(2) : '0.00'}%</span>
                                    </div>
                                </div>
                                
                                <div class="bond-tab-address-container">
                                    <span class="bond-tab-info-label">Address</span>
                                    <div class="bond-tab-address-copy" data-address="${address}" data-action="copy-address">
                                        <span class="bond-tab-info-value bond-tab-full-address">${address || 'Not available'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="bond-tab-help-section">
                                <h4>To start bonding:</h4>
                                <ul class="bond-tab-help-list">
                                    <li>Contact a node operator to whitelist your address</li>
                                    <li>Once whitelisted, you can add bonds to support the network</li>
                                    <li>Earn rewards based on your bond contribution</li>
                                </ul>
                            </div>
                            
                            <div class="bond-tab-actions-section">
                                <button class="bond-tab-action-btn bond-tab-refresh-btn" data-action="refresh">
                                    🔄 Check Again
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
    
    private async showBondAmountModal(action: 'add' | 'remove', node: BondNodeInfo): Promise<void> {
        // Get user's current RUNE balance
        let runeBalance = '0'
        try {
            const balances = await this.services.getWalletBalances()
            const runeBalanceData = balances.find((b: any) => b.asset === 'THOR.RUNE')
            runeBalance = runeBalanceData ? runeBalanceData.balance : '0'
        } catch (error) {
            console.error('Failed to fetch RUNE balance:', error)
        }
        
        const modalHtml = `
            <div class="bond-tab-modal-overlay" id="bondAmountModal">
                <div class="bond-tab-modal">
                    <div class="bond-tab-modal-header">
                        <h3>${action === 'add' ? 'Add to Bond' : 'Remove from Bond'}</h3>
                        <button class="bond-tab-modal-close" onclick="document.getElementById('bondAmountModal').remove()">×</button>
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
                                        ${this.formatNumber(parseFloat(runeBalance).toFixed(2))} 
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
                                : `<small class="bond-tab-modal-hint">Max: ${this.formatNumber(parseFloat(runeBalance).toFixed(2))} RUNE (your balance)</small>`
                            }
                        </div>
                        
                        <div class="bond-tab-modal-actions">
                            <button class="bond-tab-modal-btn bond-tab-modal-cancel" onclick="document.getElementById('bondAmountModal').remove()">
                                Cancel
                            </button>
                            <button class="bond-tab-modal-btn bond-tab-modal-confirm" onclick="bondTab.processBondAmount('${action}', '${node.address}')">
                                ${action === 'add' ? 'Add Bond' : 'Remove Bond'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml)
        
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
        
        // Store reference for global access
        ;(window as any).bondTab = this
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
        // Check if styles already exist to avoid duplicates
        if (document.getElementById('bond-tab-styles')) return
        
        const style = document.createElement('style')
        style.id = 'bond-tab-styles'
        style.textContent = `
            .bond-tab-container {
                height: 100%;
                width: 100%;
                padding: var(--spacing-lg);
                display: flex;
                flex-direction: column;
                position: relative;
                overflow-y: auto;
            }
            
            .bond-tab-header {
                text-align: center;
                margin-bottom: var(--spacing-xl);
            }
            
            .bond-tab-header h2 {
                margin: 0 0 var(--spacing-sm) 0;
                color: var(--text-primary);
                font-size: 2rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .bond-tab-subtitle {
                color: var(--text-secondary);
                font-size: 1.1rem;
                margin: 0;
            }
            
            .bond-tab-loading {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                color: var(--text-secondary);
            }
            
            .bond-tab-loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(255, 255, 255, 0.1);
                border-top: 4px solid var(--primary);
                border-radius: 50%;
                animation: bond-tab-spin 1s linear infinite;
                margin-bottom: var(--spacing-md);
            }
            
            @keyframes bond-tab-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .bond-tab-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: var(--spacing-lg);
                transition: opacity 0.3s ease-out;
            }
            
            .bond-tab-content.bond-tab-refreshing {
                opacity: 0.7;
            }
            
            /* Not Whitelisted Screen Styles */
            .bond-tab-not-whitelisted {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 400px;
                padding: var(--spacing-xl);
            }
            
            .bond-tab-not-whitelisted-container {
                background: linear-gradient(145deg, #1a1a1a 0%, #2c2c2c 100%);
                border-radius: var(--border-radius);
                padding: var(--spacing-xl);
                padding-top: calc(var(--spacing-xl) + var(--spacing-md));
                max-width: 520px;
                width: 100%;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.15);
                text-align: center;
            }
            
            .bond-tab-status-section {
                margin-bottom: var(--spacing-xl);
                padding-bottom: var(--spacing-lg);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .bond-tab-status-icon {
                width: 80px;
                height: 80px;
                margin: 0 auto var(--spacing-lg);
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(220, 53, 69, 0.2) 0%, rgba(255, 107, 107, 0.2) 100%);
                border: 2px solid rgba(220, 53, 69, 0.3);
                color: #ff6b6b;
            }
            
            .bond-tab-not-whitelisted-container h3 {
                color: var(--text-primary);
                margin: 0 0 var(--spacing-md) 0;
                font-size: 1.5rem;
                font-weight: 700;
            }
            
            .bond-tab-status-description {
                color: var(--text-secondary);
                margin: 0;
                line-height: 1.6;
                font-size: 15px;
                max-width: 400px;
                margin: 0 auto;
            }
            
            .bond-tab-info-section {
                margin-bottom: var(--spacing-xl);
            }
            
            .bond-tab-network-stats {
                text-align: center;
                margin-bottom: var(--spacing-lg);
            }
            
            .bond-tab-apy-display {
                background: linear-gradient(145deg, #2c2c2c 0%, #3a3a3a 100%);
                border-radius: var(--border-radius-sm);
                padding: var(--spacing-lg);
                border: 1px solid rgba(40, 167, 69, 0.3);
                transition: all 0.3s ease;
                display: inline-block;
                min-width: 180px;
            }
            
            .bond-tab-apy-display:hover {
                background: linear-gradient(145deg, #333333 0%, #404040 100%);
                border-color: rgba(40, 167, 69, 0.5);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
            }
            
            .bond-tab-apy-value {
                display: block;
                font-size: 24px;
                font-weight: 800;
                color: #28a745;
                margin-top: var(--spacing-sm);
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                letter-spacing: -0.5px;
            }
            
            .bond-tab-address-container {
                margin-top: var(--spacing-lg);
                text-align: center;
            }
            
            .bond-tab-address-copy {
                background: linear-gradient(145deg, #2c2c2c 0%, #3a3a3a 100%);
                border-radius: var(--border-radius-sm);
                padding: var(--spacing-md);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
                cursor: pointer;
                position: relative;
                margin-top: var(--spacing-sm);
            }
            
            .bond-tab-address-copy:hover {
                background: linear-gradient(145deg, #333333 0%, #404040 100%);
                border-color: rgba(99, 102, 241, 0.3);
                transform: translateY(-1px);
            }
            
            .bond-tab-full-address {
                font-family: monospace;
                font-size: 13px;
                word-break: break-all;
                display: block;
            }
            
            
            .bond-tab-info-label {
                display: block;
                color: var(--text-secondary);
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            
            .bond-tab-info-value {
                color: var(--text-primary);
                font-size: 14px;
                font-weight: 700;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            .bond-tab-address-value {
                font-family: monospace;
                font-size: 13px;
                cursor: help;
            }
            
            .bond-tab-help-section {
                text-align: left;
                margin-bottom: var(--spacing-xl);
                background: linear-gradient(145deg, #2c2c2c 0%, #3a3a3a 100%);
                border-radius: var(--border-radius-sm);
                padding: var(--spacing-lg);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .bond-tab-help-section h4 {
                color: var(--text-primary);
                margin: 0 0 var(--spacing-md) 0;
                font-size: 1.1rem;
                font-weight: 600;
            }
            
            .bond-tab-help-list {
                margin: 0;
                padding-left: var(--spacing-lg);
                color: var(--text-secondary);
                line-height: 1.6;
            }
            
            .bond-tab-help-list li {
                margin-bottom: var(--spacing-sm);
                font-size: 14px;
            }
            
            .bond-tab-help-list li:last-child {
                margin-bottom: 0;
            }
            
            .bond-tab-actions-section {
                margin-top: var(--spacing-xl);
            }
            
            .bond-tab-summary-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: var(--spacing-md);
                margin-bottom: var(--spacing-lg);
            }
            
            .bond-tab-card {
                background: linear-gradient(145deg, #2c2c2c 0%, #3a3a3a 100%);
                border-radius: 12px;
                padding: var(--spacing-md);
                display: flex;
                flex-direction: column;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                height: 120px;
                position: relative;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.15);
            }
            
            .bond-tab-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 20px rgba(99, 102, 241, 0.3);
                border-color: rgba(99, 102, 241, 0.6);
                background: linear-gradient(145deg, #333333 0%, #404040 100%);
            }
            
            .bond-tab-card h3 {
                font-size: 12px;
                margin: 0 0 6px 0;
                color: #a0a0a0;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .bond-tab-main-value {
                font-size: 24px;
                font-weight: 800;
                color: var(--text-primary);
                position: absolute;
                top: 50%;
                left: 16px;
                right: 16px;
                transform: translateY(-50%);
                text-align: center;
                display: flex;
                justify-content: center;
                align-items: center;
                letter-spacing: -0.3px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .bond-tab-value-content {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                animation: bond-tab-fade-in 0.5s ease-out;
            }
            
            @keyframes bond-tab-fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .bond-tab-rune-icon {
                width: 24px;
                height: 24px;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
            }
            
            .bond-tab-btc-icon {
                width: 16px;
                height: 16px;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
            }
            
            .bond-tab-sub-values {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: #c0c0c0;
                position: absolute;
                bottom: 16px;
                left: 16px;
                right: 16px;
                font-weight: 500;
            }
            
            .bond-tab-usd-value {
                text-align: left;
            }
            
            .bond-tab-btc-value,
            .bond-tab-rune-value {
                text-align: right;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 4px;
            }
            
            .bond-tab-churn {
                background: linear-gradient(145deg, #4a4a4a 0%, #5a5a5a 100%);
                border: 2px solid rgba(255, 165, 0, 0.3);
            }
            
            .bond-tab-churn:hover {
                border-color: rgba(255, 165, 0, 0.6);
                background: linear-gradient(145deg, #555555 0%, #606060 100%);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 20px rgba(255, 165, 0, 0.3);
            }
            
            .bond-tab-churn-info {
                text-align: center;
                color: #c0c0c0;
                font-size: 11px;
                font-style: italic;
                width: 100%;
            }
            
            .bond-tab-network-section {
                margin-top: var(--spacing-lg);
            }
            
            .bond-tab-network-section h3 {
                color: var(--text-primary);
                margin: 0 0 var(--spacing-md) 0;
                font-size: 1.3rem;
                font-weight: 600;
            }
            
            .bond-tab-network-info-container {
                background: linear-gradient(145deg, #2c2c2c 0%, #3a3a3a 100%);
                border-radius: 12px;
                padding: var(--spacing-lg);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.15);
                margin-bottom: var(--spacing-lg);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .bond-tab-network-info-container:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 20px rgba(99, 102, 241, 0.3);
                border-color: rgba(99, 102, 241, 0.6);
                background: linear-gradient(145deg, #333333 0%, #404040 100%);
            }
            
            .bond-tab-network-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: var(--spacing-lg);
            }
            
            .bond-tab-network-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                transition: all 0.3s ease;
            }
            
            .bond-tab-network-label {
                color: var(--text-secondary);
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: var(--spacing-sm);
            }
            
            .bond-tab-network-value {
                color: var(--text-primary);
                font-size: 18px;
                font-weight: 700;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            .bond-tab-network-rune {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: var(--spacing-xs);
            }
            
            .bond-tab-network-rune-icon {
                width: 18px;
                height: 18px;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
            }
            
            .bond-tab-network-loading {
                text-align: center;
                color: var(--text-secondary);
                font-style: italic;
                padding: var(--spacing-lg);
            }
            
            .bond-tab-nodes-section {
                margin-top: var(--spacing-lg);
            }
            
            .bond-tab-nodes-section h3 {
                color: var(--text-primary);
                margin: 0 0 var(--spacing-md) 0;
                font-size: 1.3rem;
                font-weight: 600;
            }
            
            .bond-tab-nodes-table-container {
                background: var(--bg-card);
                border-radius: var(--border-radius);
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                border: 1px solid var(--border-color);
            }
            
            .bond-tab-nodes-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 14px;
            }
            
            .bond-tab-nodes-table th {
                background: var(--bg-secondary);
                color: var(--text-primary);
                padding: var(--spacing-md);
                text-align: left;
                font-weight: 600;
                border-bottom: 1px solid var(--border-color);
                text-transform: uppercase;
                font-size: 12px;
                letter-spacing: 0.5px;
            }
            
            .bond-tab-nodes-table td {
                padding: var(--spacing-md);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                vertical-align: middle;
            }
            
            .bond-tab-node-row:hover {
                background: rgba(99, 102, 241, 0.05);
            }
            
            .bond-tab-node-address {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
            }
            
            .bond-tab-node-suffix {
                font-weight: 600;
                color: var(--text-primary);
                font-family: monospace;
            }
            
            .bond-tab-node-link {
                background: none;
                border: none;
                color: var(--primary);
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                opacity: 0.7;
            }
            
            .bond-tab-node-link:hover {
                background-color: rgba(99, 102, 241, 0.2);
                opacity: 1;
                transform: scale(1.1);
            }
            
            .bond-tab-node-status {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
            }
            
            .bond-tab-status-indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            
            .bond-tab-status-indicator.bond-tab-active {
                background-color: #28a745;
                box-shadow: 0 0 6px rgba(40, 167, 69, 0.4);
            }
            
            .bond-tab-status-indicator.bond-tab-inactive {
                background-color: #dc3545;
                box-shadow: 0 0 6px rgba(220, 53, 69, 0.4);
            }
            
            .bond-tab-status-text {
                color: var(--text-primary);
                font-weight: 500;
            }
            
            .bond-tab-bond-value {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-bottom: 2px;
            }
            
            .bond-tab-bond-rune {
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .bond-tab-table-rune-icon {
                width: 16px;
                height: 16px;
            }
            
            .bond-tab-bond-usd,
            .bond-tab-ownership {
                font-size: 12px;
                color: var(--text-secondary);
            }
            
            .bond-tab-node-fee {
                color: var(--text-primary);
                font-weight: 500;
            }
            
            .bond-tab-node-actions {
                display: flex;
                gap: var(--spacing-xs);
            }
            
            .bond-tab-table-btn {
                width: 32px;
                height: 32px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }
            
            .bond-tab-table-btn.bond-tab-add-btn {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
            }
            
            .bond-tab-table-btn.bond-tab-add-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
            }
            
            .bond-tab-table-btn.bond-tab-remove-btn {
                background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
                color: white;
            }
            
            .bond-tab-table-btn.bond-tab-remove-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
            }
            
            .bond-tab-table-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background: #6c757d;
            }
            
            .bond-tab-refresh-section {
                display: flex;
                justify-content: center;
                margin-top: var(--spacing-lg);
            }
            
            .bond-tab-action-btn {
                padding: var(--spacing-md) var(--spacing-lg);
                border-radius: var(--border-radius);
                border: none;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: var(--spacing-xs);
                min-width: 140px;
                justify-content: center;
                font-size: 14px;
            }
            
            .bond-tab-refresh-btn {
                background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
                color: white;
                box-shadow: 0 4px 14px 0 rgba(108, 117, 125, 0.4);
            }
            
            .bond-tab-refresh-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px 0 rgba(108, 117, 125, 0.5);
            }
            
            .bond-tab-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: var(--text-secondary);
                text-align: center;
            }
            
            .bond-tab-error-icon {
                font-size: 3rem;
                margin-bottom: var(--spacing-md);
            }
            
            @media (max-width: 768px) {
                .bond-tab-summary-grid {
                    grid-template-columns: 1fr;
                    gap: var(--spacing-sm);
                }
                
                .bond-tab-card {
                    height: auto;
                    min-height: 110px;
                }
                
                .bond-tab-main-value {
                    position: static;
                    transform: none;
                    margin: var(--spacing-sm) 0;
                    font-size: 22px;
                }
                
                .bond-tab-sub-values {
                    position: static;
                    margin-top: var(--spacing-sm);
                }
                
                .bond-tab-network-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: var(--spacing-md);
                }
                
                .bond-tab-network-value {
                    font-size: 16px;
                }
                
                .bond-tab-network-rune-icon {
                    width: 16px;
                    height: 16px;
                }
                
                .bond-tab-nodes-table-container {
                    overflow-x: auto;
                }
                
                .bond-tab-nodes-table {
                    min-width: 600px;
                }
                
                .bond-tab-churn .bond-tab-main-value {
                    font-size: 20px;
                }
            }
            
            /* Bond Amount Modal Styles */
            .bond-tab-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(4px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: bond-tab-modal-fade-in 0.3s ease-out;
            }
            
            .bond-tab-modal {
                background: linear-gradient(145deg, #1a1a1a 0%, #2c2c2c 100%);
                border-radius: var(--border-radius);
                width: 90%;
                max-width: 520px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.15);
                animation: bond-tab-modal-slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: hidden;
            }
            
            .bond-tab-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--spacing-xl) var(--spacing-xl) var(--spacing-lg) var(--spacing-xl);
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 69, 19, 0.1) 100%);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .bond-tab-modal-header h3 {
                margin: 0;
                color: var(--text-primary);
                font-size: 1.4rem;
                font-weight: 700;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .bond-tab-modal-close {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: var(--text-secondary);
                font-size: 20px;
                cursor: pointer;
                padding: 8px 10px;
                border-radius: var(--border-radius-sm);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
            }
            
            .bond-tab-modal-close:hover {
                background: rgba(255, 255, 255, 0.2);
                color: var(--text-primary);
                transform: scale(1.1);
            }
            
            .bond-tab-modal-body {
                padding: var(--spacing-xl);
            }
            
            .bond-tab-modal-node-info {
                background: linear-gradient(145deg, #2c2c2c 0%, #3a3a3a 100%);
                border-radius: var(--border-radius);
                padding: var(--spacing-lg);
                margin-bottom: var(--spacing-xl);
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
            }
            
            .bond-tab-modal-node-header {
                display: flex;
                align-items: center;
                gap: var(--spacing-md);
                margin-bottom: var(--spacing-lg);
                padding-bottom: var(--spacing-md);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .bond-tab-modal-node-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 48px;
                height: 48px;
                border-radius: var(--border-radius);
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 69, 19, 0.2) 100%);
                border: 1px solid rgba(99, 102, 241, 0.3);
            }
            
            .bond-tab-modal-node-details h4 {
                margin: 0 0 4px 0;
                color: var(--text-primary);
                font-size: 1.1rem;
                font-weight: 600;
            }
            
            .bond-tab-modal-node-status {
                color: var(--text-secondary);
                font-size: 14px;
                font-weight: 500;
            }
            
            .bond-tab-modal-info-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: var(--spacing-md);
            }
            
            .bond-tab-modal-info-item {
                background: linear-gradient(145deg, #333333 0%, #404040 100%);
                border-radius: var(--border-radius-sm);
                padding: var(--spacing-md);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
            }
            
            .bond-tab-modal-info-item:hover {
                background: linear-gradient(145deg, #383838 0%, #454545 100%);
                border-color: rgba(99, 102, 241, 0.3);
                transform: translateY(-1px);
            }
            
            .bond-tab-modal-info-label {
                display: block;
                color: var(--text-secondary);
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            
            .bond-tab-modal-info-value {
                display: flex;
                align-items: center;
                gap: 4px;
                color: var(--text-primary);
                font-size: 14px;
                font-weight: 700;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            .bond-tab-modal-rune-icon {
                width: 16px;
                height: 16px;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
            }
            
            .bond-tab-modal-input-group {
                margin-bottom: var(--spacing-xl);
            }
            
            .bond-tab-modal-input-group label {
                display: block;
                color: var(--text-primary);
                font-weight: 600;
                margin-bottom: var(--spacing-md);
                font-size: 15px;
            }
            
            .bond-tab-modal-input-wrapper {
                position: relative;
            }
            
            .bond-tab-modal-input {
                width: 100%;
                padding: var(--spacing-md) var(--spacing-lg);
                padding-right: 50px;
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: var(--border-radius);
                background: linear-gradient(145deg, #2c2c2c 0%, #3a3a3a 100%);
                color: var(--text-primary);
                font-size: 16px;
                font-weight: 500;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-sizing: border-box;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .bond-tab-modal-input:focus {
                outline: none;
                border-color: rgba(99, 102, 241, 0.6);
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 3px rgba(99, 102, 241, 0.2), 0 0 20px rgba(99, 102, 241, 0.3);
                background: linear-gradient(145deg, #333333 0%, #404040 100%);
                transform: translateY(-1px);
            }
            
            .bond-tab-modal-input-icon {
                position: absolute;
                right: var(--spacing-md);
                top: 50%;
                transform: translateY(-50%);
                width: 20px;
                height: 20px;
                pointer-events: none;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
            }
            
            .bond-tab-modal-hint {
                display: block;
                color: var(--text-secondary);
                font-size: 13px;
                margin-top: var(--spacing-sm);
                font-style: italic;
                opacity: 0.8;
            }
            
            .bond-tab-modal-actions {
                display: flex;
                gap: var(--spacing-md);
                justify-content: flex-end;
            }
            
            .bond-tab-modal-btn {
                padding: var(--spacing-md) var(--spacing-xl);
                border-radius: var(--border-radius);
                border: none;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                min-width: 120px;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 44px;
            }
            
            .bond-tab-modal-cancel {
                background: var(--bg-secondary);
                color: var(--text-secondary);
                border: 1px solid var(--border-color);
            }
            
            .bond-tab-modal-cancel:hover {
                background: var(--bg-card);
                color: var(--text-primary);
                transform: translateY(-1px);
            }
            
            .bond-tab-modal-confirm {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 4px 14px 0 rgba(102, 126, 234, 0.4);
            }
            
            .bond-tab-modal-confirm:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px 0 rgba(102, 126, 234, 0.5);
            }
            
            @keyframes bond-tab-modal-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes bond-tab-modal-slide-up {
                from { 
                    opacity: 0; 
                    transform: translateY(30px) scale(0.9);
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0) scale(1);
                }
            }
            
            @media (max-width: 600px) {
                .bond-tab-modal {
                    width: 95%;
                    margin: var(--spacing-md);
                }
                
                .bond-tab-modal-info-grid {
                    grid-template-columns: 1fr;
                }
                
                .bond-tab-modal-actions {
                    flex-direction: column;
                }
                
                .bond-tab-modal-btn {
                    min-width: auto;
                }
            }
        `
        document.head.appendChild(style)
    }

    private renderError(message: string): void {
        if (!this.container) return
        
        this.container.innerHTML = `
            <div class="bond-tab-container">
                <div class="bond-tab-error">
                    <div class="bond-tab-error-icon">❌</div>
                    <h3>Error Loading Bond Tab</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="this.render()">
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