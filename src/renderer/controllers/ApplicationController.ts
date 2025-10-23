/**
 * Application Controller
 * 
 * Manages the main application phase after wallet selection:
 * - Tab navigation and state management
 * - Wallet data coordination
 * - Real-time balance updates
 * - Header display management
 */

import { BackendService } from '../services/BackendService'
import { StateManager } from '../services/StateManager'
import { UIService } from '../services/UIService'
import { WalletTab } from '../components/WalletTab'
import { HeaderDisplay } from '../components/HeaderDisplay'

export interface ActiveWallet {
    walletId: string
    name: string
    mainnetAddress?: string
    stagenetAddress?: string
    isLocked: boolean
    lastUsed?: Date
}

export interface NetworkConfig {
    currentNetwork: 'mainnet' | 'stagenet'
    config: any
    endpoints: any
}

export class ApplicationController {
    private backend: BackendService
    private state: StateManager
    private ui: UIService
    private activeWallet: ActiveWallet | null = null
    private currentNetwork: 'mainnet' | 'stagenet' = 'mainnet'
    private currentTab: string = 'wallet'
    private walletTab: WalletTab | null = null
    private headerDisplay: HeaderDisplay | null = null
    private isInitialized: boolean = false

    constructor(backend: BackendService, state: StateManager, ui: UIService) {
        this.backend = backend
        this.state = state
        this.ui = ui
        console.log('🔧 ApplicationController initialized')
    }

    async initialize(wallet: ActiveWallet, network: 'mainnet' | 'stagenet'): Promise<void> {
        try {
            console.log('ApplicationController initializing...', { wallet: wallet.name, network })
            
            this.activeWallet = wallet
            this.currentNetwork = network
            
            // Initialize header display
            await this.initializeHeader()
            
            // Initialize wallet tab as the default tab
            await this.initializeWalletTab()
            
            // Setup tab navigation
            this.setupTabNavigation()
            
            // Start real-time data updates
            this.startDataUpdates()
            
            this.isInitialized = true
            console.log('✅ ApplicationController initialized')
        } catch (error) {
            console.error('❌ Failed to initialize ApplicationController:', error)
            throw error
        }
    }

    private async initializeHeader(): Promise<void> {
        const headerContainer = document.getElementById('main-app-header-content')
        if (!headerContainer) {
            throw new Error('Header container not found')
        }

        this.headerDisplay = new HeaderDisplay(headerContainer, this.backend)
        await this.headerDisplay.initialize(this.activeWallet!, this.currentNetwork)
    }

    private async initializeWalletTab(): Promise<void> {
        const walletTabContainer = document.getElementById('wallet-tab-content')
        if (!walletTabContainer) {
            throw new Error('Wallet tab container not found')
        }

        this.walletTab = new WalletTab(walletTabContainer, this.backend)
        await this.walletTab.initialize(this.activeWallet!, this.currentNetwork)
        
        // Show wallet tab by default
        this.showTab('wallet')
    }

    private setupTabNavigation(): void {
        // Tab buttons
        const tabButtons = document.querySelectorAll('[data-tab]')
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = (e.target as HTMLElement).getAttribute('data-tab')
                if (tab) {
                    this.showTab(tab)
                }
            })
        })

        // Settings tab specific handlers
        this.setupSettingsHandlers()
    }

    private setupSettingsHandlers(): void {
        // Network selector in settings
        const networkSelector = document.getElementById('network-selector') as HTMLSelectElement
        if (networkSelector) {
            networkSelector.addEventListener('change', async (e) => {
                const newNetwork = (e.target as HTMLSelectElement).value as 'mainnet' | 'stagenet'
                await this.switchNetwork(newNetwork)
            })
        }

        // Refresh all data button
        const refreshAllBtn = document.getElementById('refresh-all-btn')
        if (refreshAllBtn) {
            refreshAllBtn.addEventListener('click', () => {
                this.refreshAllData()
            })
        }
    }

    private showTab(tabName: string): void {
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content')
        tabContents.forEach(content => {
            content.classList.add('hidden')
        })

        // Remove active class from all tab buttons
        const tabButtons = document.querySelectorAll('[data-tab]')
        tabButtons.forEach(button => {
            button.classList.remove('active')
        })

        // Show selected tab content
        const selectedContent = document.getElementById(`${tabName}-tab-content`)
        if (selectedContent) {
            selectedContent.classList.remove('hidden')
        }

        // Add active class to selected tab button
        const selectedButton = document.querySelector(`[data-tab="${tabName}"]`)
        if (selectedButton) {
            selectedButton.classList.add('active')
        }

        // Handle settings tab specific initialization
        if (tabName === 'settings') {
            this.initializeSettingsTab()
        }

        this.currentTab = tabName
        console.log(`📑 Switched to ${tabName} tab`)
    }

    private initializeSettingsTab(): void {
        // Update network selector to current value
        const networkSelector = document.getElementById('network-selector') as HTMLSelectElement
        if (networkSelector) {
            networkSelector.value = this.currentNetwork
        }

        // Update current address display
        this.updateSettingsInfo()

        // Update network description
        this.updateNetworkDescription()
    }

    private updateSettingsInfo(): void {
        if (!this.activeWallet) return

        // Update current address based on network
        const currentAddress = this.currentNetwork === 'mainnet' 
            ? this.activeWallet.mainnetAddress 
            : this.activeWallet.stagenetAddress

        const addressEl = document.getElementById('settings-current-address')
        if (addressEl && currentAddress) {
            addressEl.textContent = `${currentAddress.slice(0, 10)}...${currentAddress.slice(-8)}`
            addressEl.setAttribute('title', currentAddress)
        }

        // Update network status
        const statusEl = document.getElementById('settings-network-status')
        if (statusEl) {
            statusEl.textContent = `${this.currentNetwork.toUpperCase()} - Checking connection...`
            
            // Check network status
            this.checkNetworkStatus().then(isConnected => {
                if (statusEl) {
                    statusEl.textContent = `${this.currentNetwork.toUpperCase()} - ${isConnected ? 'Connected' : 'Disconnected'}`
                    statusEl.style.color = isConnected ? 'var(--success)' : 'var(--error)'
                }
            }).catch(() => {
                if (statusEl) {
                    statusEl.textContent = `${this.currentNetwork.toUpperCase()} - Connection Error`
                    statusEl.style.color = 'var(--error)'
                }
            })
        }
    }

    private updateNetworkDescription(): void {
        const descEl = document.getElementById('network-description-text')
        if (!descEl) return

        if (this.currentNetwork === 'mainnet') {
            descEl.textContent = 'Production THORChain network with real assets and transactions'
        } else {
            descEl.textContent = 'Test network for development and testing purposes'
        }
    }

    private async checkNetworkStatus(): Promise<boolean> {
        try {
            const nodeInfo = await this.backend.getNodeInfo()
            return !!nodeInfo
        } catch (error) {
            console.error('Network status check failed:', error)
            return false
        }
    }

    private startDataUpdates(): void {
        // Update wallet data every 30 seconds
        if (this.walletTab) {
            setInterval(() => {
                this.walletTab?.refreshData()
            }, 30000)
        }

        // Update header every 60 seconds
        if (this.headerDisplay) {
            setInterval(() => {
                this.headerDisplay?.refreshStatus()
            }, 60000)
        }
    }

    // Public methods for external control
    async switchNetwork(network: 'mainnet' | 'stagenet'): Promise<void> {
        try {
            console.log(`🔄 Switching to ${network}...`)
            
            // Show loading state
            const statusEl = document.getElementById('settings-network-status')
            if (statusEl) {
                statusEl.textContent = `Switching to ${network.toUpperCase()}...`
                statusEl.style.color = 'var(--warning)'
            }
            
            // Update backend network configuration
            await this.backend.setNetwork(network)
            
            // Update local state
            const previousNetwork = this.currentNetwork
            this.currentNetwork = network
            
            // Update state manager
            this.state.setData('currentNetwork', network)
            
            // Update all components with new network
            const updatePromises: Promise<any>[] = []
            
            if (this.headerDisplay) {
                updatePromises.push(this.headerDisplay.updateNetwork(network))
            }
            
            if (this.walletTab && this.activeWallet) {
                // Update wallet tab address first, then network
                this.walletTab.updateWalletAddress(this.activeWallet, network)
                updatePromises.push(this.walletTab.updateNetwork(network))
            }
            
            // Wait for all component updates
            await Promise.all(updatePromises)
            
            // Update settings tab if it's currently active
            if (this.currentTab === 'settings') {
                this.updateSettingsInfo()
                this.updateNetworkDescription()
            }
            
            // Save session with new network
            if (this.activeWallet) {
                await this.backend.saveSession({
                    walletId: this.activeWallet.walletId,
                    network: network,
                    timestamp: new Date().toISOString()
                })
            }
            
            console.log(`✅ Successfully switched from ${previousNetwork} to ${network}`)
            this.ui.showSuccess(`Switched to ${network.toUpperCase()}`)
            
        } catch (error) {
            console.error('❌ Failed to switch network:', error)
            
            // Revert network selector if it failed
            const networkSelector = document.getElementById('network-selector') as HTMLSelectElement
            if (networkSelector) {
                networkSelector.value = this.currentNetwork
            }
            
            // Update status to show error
            const statusEl = document.getElementById('settings-network-status')
            if (statusEl) {
                statusEl.textContent = `${this.currentNetwork.toUpperCase()} - Switch Failed`
                statusEl.style.color = 'var(--error)'
            }
            
            this.ui.showError('Failed to switch network: ' + (error as Error).message)
        }
    }

    async refreshAllData(): Promise<void> {
        try {
            console.log('🔄 Refreshing all data...')
            
            if (this.headerDisplay) {
                await this.headerDisplay.refreshStatus()
            }
            
            if (this.walletTab) {
                await this.walletTab.refreshData()
            }
            
            console.log('✅ All data refreshed')
        } catch (error) {
            console.error('❌ Failed to refresh data:', error)
            this.ui.showError('Failed to refresh data: ' + (error as Error).message)
        }
    }

    // Getters
    getActiveWallet(): ActiveWallet | null {
        return this.activeWallet
    }

    getCurrentNetwork(): 'mainnet' | 'stagenet' {
        return this.currentNetwork
    }

    getCurrentTab(): string {
        return this.currentTab
    }

    isReady(): boolean {
        return this.isInitialized && this.activeWallet !== null
    }
}