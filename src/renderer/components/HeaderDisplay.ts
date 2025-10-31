/**
 * Header Display Component
 * 
 * Manages the header display in the main application:
 * - Current wallet name and address
 * - Network status (mainnet/stagenet)
 * - Connection status
 * - Quick wallet info
 */

import { BackendService } from '../services/BackendService'
import { IdenticonService } from '../../services/IdenticonService'

export interface HeaderData {
    walletName: string
    walletAddress: string
    network: 'mainnet' | 'stagenet'
    networkStatus: 'connected' | 'connecting' | 'disconnected'
    nodeInfo?: any
}

export class HeaderDisplay {
    private container: HTMLElement
    private backend: BackendService
    private headerData: HeaderData | null = null
    private refreshInterval: NodeJS.Timeout | null = null

    constructor(container: HTMLElement, backend: BackendService) {
        this.container = container
        this.backend = backend
    }

    async initialize(wallet: any, network: 'mainnet' | 'stagenet'): Promise<void> {
        try {
            console.log('📱 Initializing HeaderDisplay...', { wallet: wallet.name, network })
            
            // Initialize header data
            this.headerData = {
                walletName: wallet.name,
                walletAddress: network === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress,
                network,
                networkStatus: 'connecting'
            }

            // Render initial UI
            this.render()
            
            // Load network info
            await this.loadNetworkInfo()
            
            // Start periodic status updates
            this.startStatusUpdates()
            
            console.log('✅ HeaderDisplay initialized')
        } catch (error) {
            console.error('❌ Failed to initialize HeaderDisplay:', error)
            throw error
        }
    }

    private render(): void {
        if (!this.headerData) return

        this.container.innerHTML = `
            <div class="header-display">
                <!-- Network Status -->
                <div class="network-status">
                    <div class="network-info">
                        <span class="network-badge ${this.headerData.network}" id="header-network">
                            ${this.headerData.network.toUpperCase()}
                        </span>
                        <div class="connection-status" id="connection-status">
                            <span class="status-indicator ${this.headerData.networkStatus}"></span>
                            <span class="status-text">${this.getStatusText()}</span>
                        </div>
                    </div>
                </div>

                <!-- Wallet Info -->
                <div class="wallet-info">
                    <div class="wallet-details">
                        <div class="wallet-name" id="header-wallet-name">
                            ${this.headerData.walletName}
                        </div>
                        <div class="wallet-address" id="header-wallet-address">
                            ${this.formatAddress(this.headerData.walletAddress)}
                        </div>
                    </div>
                    <button class="header-wallet-identicon-btn" id="header-wallet-menu" title="Wallet Options">
                        <div id="header-wallet-identicon" class="header-identicon-placeholder loading">
                            ${this.headerData.walletName.charAt(0).toUpperCase()}
                        </div>
                    </button>
                </div>
            </div>
        `

        this.setupEventListeners()
        this.generateHeaderIdenticon()
    }

    private generateHeaderIdenticon(): void {
        if (!this.headerData) return

        // Generate identicon immediately to prevent visual jumps
        requestAnimationFrame(() => {
            try {
                const element = document.getElementById('header-wallet-identicon');
                if (!element) return;

                // Add smooth loading transition
                element.style.opacity = '0.7';
                
                // Use the wallet address as the identicon seed for consistency
                const identiconValue = this.headerData!.walletAddress;
                IdenticonService.renderToElement('header-wallet-identicon', identiconValue, 32);
                
                // Remove loading state and fade in
                element.classList.remove('loading');
                element.style.opacity = '1';
                
            } catch (error) {
                console.warn('Failed to generate header identicon:', error);
                // Fallback: remove loading state but keep text placeholder
                const element = document.getElementById('header-wallet-identicon');
                if (element) {
                    element.classList.remove('loading');
                    element.style.opacity = '1';
                }
            }
        });
    }

    private setupEventListeners(): void {
        // Wallet menu button
        const walletMenuBtn = this.container.querySelector('#header-wallet-menu')
        if (walletMenuBtn) {
            walletMenuBtn.addEventListener('click', () => this.showWalletMenu())
        }

        // Click on wallet address to copy
        const walletAddressEl = this.container.querySelector('#header-wallet-address')
        if (walletAddressEl) {
            walletAddressEl.addEventListener('click', () => this.copyWalletAddress())
            walletAddressEl.setAttribute('style', 'cursor: pointer;')
            walletAddressEl.setAttribute('title', 'Click to copy address')
        }
    }

    private async loadNetworkInfo(): Promise<void> {
        try {
            if (!this.headerData) return

            console.log('🔄 Loading network info...')
            
            // Get network configuration (should always work with mock data)
            const networkInfo = await this.backend.getNetwork()
            console.log('Network info:', networkInfo)
            
            // Try to get node info for connection status (may fail in development)
            let nodeInfo = null
            try {
                nodeInfo = await this.backend.getNodeInfo()
                this.headerData.nodeInfo = nodeInfo
                console.log('Node info:', nodeInfo)
            } catch (nodeError) {
                console.log('⚠️ Node info not available (using mock connection):', (nodeError as Error).message)
                // In development/mock mode, simulate connection status
                this.headerData.nodeInfo = { 
                    mock: true, 
                    network: this.headerData.network,
                    status: 'mock_active' 
                }
                nodeInfo = this.headerData.nodeInfo
            }
            
            // Update connection status
            this.headerData.networkStatus = nodeInfo ? 'connected' : 'disconnected'
            
            // Update UI
            this.updateConnectionStatus()
            
            console.log('✅ Network info loaded:', { 
                network: networkInfo?.currentNetwork,
                connected: !!nodeInfo,
                mock: nodeInfo?.mock || false
            })
        } catch (error) {
            console.error('❌ Failed to load network info:', error)
            if (this.headerData) {
                this.headerData.networkStatus = 'disconnected'
                this.updateConnectionStatus()
            }
        }
    }

    private updateConnectionStatus(): void {
        if (!this.headerData) return

        const statusIndicator = this.container.querySelector('.status-indicator')
        const statusText = this.container.querySelector('.status-text')

        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${this.headerData.networkStatus}`
        }

        if (statusText) {
            statusText.textContent = this.getStatusText()
        }
    }

    private getStatusText(): string {
        if (!this.headerData) return 'Unknown'

        switch (this.headerData.networkStatus) {
            case 'connected':
                return 'Connected'
            case 'connecting':
                return 'Connecting...'
            case 'disconnected':
                return 'Disconnected'
            default:
                return 'Unknown'
        }
    }

    private startStatusUpdates(): void {
        // Check connection status every 60 seconds
        this.refreshInterval = setInterval(() => {
            this.refreshStatus()
        }, 60000)
    }

    // Event handlers
    private showWalletMenu(): void {
        // Create a simple dropdown menu
        const existingMenu = document.querySelector('.header-wallet-menu')
        if (existingMenu) {
            existingMenu.remove()
            return
        }

        const menu = document.createElement('div')
        menu.className = 'header-wallet-menu'
        menu.innerHTML = `
            <div class="menu-item" data-action="copy-address">
                📋 Copy Address
            </div>
            <div class="menu-item" data-action="switch-network">
                🔄 Switch Network
            </div>
            <div class="menu-item" data-action="logout">
                🚪 Logout
            </div>
        `

        // Position menu
        const walletMenuBtn = this.container.querySelector('#header-wallet-menu') as HTMLElement
        if (walletMenuBtn) {
            const rect = walletMenuBtn.getBoundingClientRect()
            menu.style.position = 'fixed'
            menu.style.top = `${rect.bottom + 5}px`
            menu.style.right = `${window.innerWidth - rect.right}px`
            menu.style.zIndex = '1000'
        }

        // Add event listeners
        menu.addEventListener('click', (e) => {
            const target = e.target as HTMLElement
            const action = target.getAttribute('data-action')
            
            switch (action) {
                case 'copy-address':
                    this.copyWalletAddress()
                    break
                case 'switch-network':
                    this.showNetworkSwitcher()
                    break
                case 'logout':
                    this.logout()
                    break
            }
            
            menu.remove()
        })

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove()
            }
        }, { once: true })

        document.body.appendChild(menu)
    }

    private async copyWalletAddress(): Promise<void> {
        if (!this.headerData) return

        try {
            await navigator.clipboard.writeText(this.headerData.walletAddress)
            console.log('✅ Address copied to clipboard')
            // Show temporary success indicator
            this.showTemporaryMessage('Address copied!')
        } catch (error) {
            console.error('❌ Failed to copy address:', error)
        }
    }

    private showNetworkSwitcher(): void {
        // TODO: Implement network switching dialog
        console.log('🔄 Network switching not implemented yet')
        this.showTemporaryMessage('Network switching coming soon...')
    }

    private logout(): void {
        // TODO: Implement logout functionality
        console.log('🚪 Logout functionality not implemented yet')
        this.showTemporaryMessage('Logout coming soon...')
    }

    private showTemporaryMessage(message: string): void {
        const messageEl = document.createElement('div')
        messageEl.className = 'temp-message'
        messageEl.textContent = message
        messageEl.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            z-index: 2000;
            font-size: 14px;
        `

        document.body.appendChild(messageEl)

        setTimeout(() => {
            messageEl.remove()
        }, 2000)
    }

    // Public methods
    async refreshStatus(): Promise<void> {
        await this.loadNetworkInfo()
    }

    async updateNetwork(network: 'mainnet' | 'stagenet'): Promise<void> {
        if (!this.headerData) return

        console.log('🔄 HeaderDisplay updating network to:', network)

        this.headerData.network = network
        this.headerData.networkStatus = 'connecting'

        // Update network badge
        const networkBadge = this.container.querySelector('#header-network')
        if (networkBadge) {
            networkBadge.textContent = network.toUpperCase()
            networkBadge.className = `network-badge ${network}`
        }

        // Update connection status to show connecting
        this.updateConnectionStatus()

        // Refresh network info for new network
        await this.loadNetworkInfo()

        console.log('✅ HeaderDisplay network updated to:', network)
    }

    async updateWallet(wallet: any, network: 'mainnet' | 'stagenet'): Promise<void> {
        if (!this.headerData) return

        this.headerData.walletName = wallet.name
        this.headerData.walletAddress = network === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress

        // Update wallet name
        const walletNameEl = this.container.querySelector('#header-wallet-name')
        if (walletNameEl) {
            walletNameEl.textContent = wallet.name
        }

        // Update wallet address
        const walletAddressEl = this.container.querySelector('#header-wallet-address')
        if (walletAddressEl) {
            walletAddressEl.textContent = this.formatAddress(this.headerData.walletAddress)
        }
    }

    // Utility methods
    private formatAddress(address: string): string {
        if (!address) return 'Unknown Address'
        return `${address.slice(0, 8)}...${address.slice(-6)}`
    }

    // Cleanup
    destroy(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval)
            this.refreshInterval = null
        }

        const existingMenu = document.querySelector('.header-wallet-menu')
        if (existingMenu) {
            existingMenu.remove()
        }
    }
}