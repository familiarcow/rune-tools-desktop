/**
 * Rune Tools Application - Main Application Controller
 * 
 * Central coordinator for the entire application lifecycle
 * Manages phase transitions and service coordination
 */

interface Services {
    backend: any
    state: any
    ui: any
    utils: any
}

export class RuneToolsApplication {
    private services: Services
    private currentPhase: 'onboarding' | 'application' = 'onboarding'
    private walletSelectionPhase?: HTMLElement
    private mainAppPhase?: HTMLElement
    private loadingOverlay?: HTMLElement

    constructor(services: Services) {
        this.services = services
        console.log('🎯 RuneToolsApplication created')
    }

    async initialize(): Promise<void> {
        try {
            console.log('🚀 Initializing Rune Tools Application...')

            // Get DOM references
            this.walletSelectionPhase = document.getElementById('walletSelectionPhase') || undefined
            this.mainAppPhase = document.getElementById('mainAppPhase') || undefined
            this.loadingOverlay = document.getElementById('loadingOverlay') || undefined

            if (!this.walletSelectionPhase || !this.mainAppPhase) {
                throw new Error('Required DOM elements not found')
            }

            // Initialize all services
            await this.initializeServices()

            // Detect application phase
            await this.detectApplicationPhase()

            // Set up event handlers
            this.setupEventHandlers()

            console.log('✅ Rune Tools Application initialized successfully')

        } catch (error) {
            console.error('❌ Failed to initialize Rune Tools Application:', error)
            throw error
        }
    }

    private async initializeServices(): Promise<void> {
        console.log('Initializing services...')
        
        await this.services.backend.initialize()
        await this.services.state.initialize()
        await this.services.ui.initialize()
        await this.services.utils.initialize()
        
        console.log('✅ All services initialized')
    }

    private async detectApplicationPhase(): Promise<void> {
        console.log('Detecting application phase...')
        
        try {
            // Check for existing session or wallets
            const session = await this.services.backend.getActiveSession()
            const wallets = await this.services.backend.getAvailableWallets()
            
            if (session && session.wallet) {
                // Has active session - go to main app
                console.log('Active session found - switching to main application')
                await this.switchToMainApp(session.wallet)
            } else if (wallets && wallets.length > 0) {
                // Has wallets but no session - show wallet selection
                console.log('Wallets found - showing wallet selection')
                await this.showWalletSelection()
            } else {
                // No wallets - show first-time setup
                console.log('No wallets found - showing first-time setup')
                await this.showFirstTimeSetup()
            }
        } catch (error) {
            console.warn('Could not detect application phase, defaulting to wallet selection:', error)
            await this.showWalletSelection()
        }
    }

    private async showWalletSelection(): Promise<void> {
        this.currentPhase = 'onboarding'
        this.services.state.setPhase('onboarding')

        if (this.walletSelectionPhase && this.mainAppPhase) {
            this.walletSelectionPhase.style.display = 'flex'
            this.mainAppPhase.style.display = 'none'
        }

        // Add content to wallet selection if empty
        this.ensureWalletSelectionContent()

        console.log('✅ Wallet selection phase active')
    }

    private async showFirstTimeSetup(): Promise<void> {
        console.log('Showing first-time setup')
        
        // Same as wallet selection but with specific first-time content
        await this.showWalletSelection()
        
        // Could add specific first-time messaging here
        const container = this.walletSelectionPhase?.querySelector('.wallet-selection-container')
        if (container) {
            const firstTimeMsg = container.querySelector('.first-time-message')
            if (!firstTimeMsg) {
                const msg = document.createElement('div')
                msg.className = 'first-time-message'
                msg.innerHTML = '<p style="color: #ffa726; margin-bottom: 20px;">👋 Welcome! Create your first wallet to get started.</p>'
                container.insertBefore(msg, container.firstChild)
            }
        }
    }

    private async switchToMainApp(wallet: any): Promise<void> {
        console.log('Switching to main application with wallet:', wallet)
        
        this.currentPhase = 'application'
        this.services.state.setPhase('application')
        this.services.state.setWallet(wallet)

        if (this.walletSelectionPhase && this.mainAppPhase) {
            this.walletSelectionPhase.style.display = 'none'
            this.mainAppPhase.style.display = 'flex'
        }

        // Initialize main app components here (placeholder)
        await this.initializeMainAppComponents(wallet)

        console.log('✅ Main application phase active')
    }

    private async initializeMainAppComponents(wallet: any): Promise<void> {
        console.log('Initializing main app components...')
        
        // Update header with wallet info
        this.updateHeaderDisplay(wallet)
        
        // Set up tab navigation
        this.setupTabNavigation()
        
        console.log('✅ Main app components initialized')
    }

    private updateHeaderDisplay(wallet: any): void {
        const walletName = document.getElementById('currentWalletName')
        const walletAddress = document.getElementById('currentWalletAddress')
        
        if (walletName) {
            walletName.textContent = wallet.name || 'Wallet'
        }
        
        if (walletAddress) {
            const address = wallet.mainnetAddress || wallet.address || 'N/A'
            walletAddress.textContent = this.services.utils.formatAddress(address)
        }
    }

    private setupTabNavigation(): void {
        const tabButtons = document.querySelectorAll('.tab-btn')
        const tabContents = document.querySelectorAll('.tab-content')
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab')
                if (tabName) {
                    this.switchTab(tabName)
                }
            })
        })
    }

    private switchTab(tabName: string): void {
        console.log('Switching to tab:', tabName)
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'))
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active')
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'))
        document.getElementById(`${tabName}TabContent`)?.classList.add('active')
        
        this.services.state.setActiveTab(tabName)
    }

    private setupEventHandlers(): void {
        // Settings button
        const settingsBtn = document.getElementById('settingsBtn')
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                console.log('Settings clicked')
                this.services.ui.showToast('info', 'Settings panel coming soon!')
            })
        }

        // Create wallet button
        const createWalletBtn = document.getElementById('createWalletBtn')
        if (createWalletBtn) {
            createWalletBtn.addEventListener('click', () => {
                console.log('Create wallet clicked')
                this.services.ui.showToast('info', 'Wallet creation coming soon!')
            })
        }

        // Import wallet button  
        const importExistingBtn = document.getElementById('importExistingBtn')
        if (importExistingBtn) {
            importExistingBtn.addEventListener('click', () => {
                console.log('Import wallet clicked')
                this.services.ui.showToast('info', 'Wallet import coming soon!')
            })
        }
    }

    private ensureWalletSelectionContent(): void {
        const container = this.walletSelectionPhase?.querySelector('.wallet-selection-container')
        if (container && !container.innerHTML.trim()) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: white;">
                    <div style="font-size: 4rem; margin-bottom: 20px;">⚡</div>
                    <h1>Welcome to Rune Tools</h1>
                    <p style="margin: 20px 0;">Select or create a wallet to get started</p>
                    <div style="margin-top: 30px;">
                        <button id="createWalletBtn" class="btn btn-success" style="margin: 10px;">Create New Wallet</button>
                        <button id="importExistingBtn" class="btn btn-primary" style="margin: 10px;">Import Existing Wallet</button>
                    </div>
                </div>
            `
        }
    }

    // Public API
    getCurrentPhase(): 'onboarding' | 'application' {
        return this.currentPhase
    }

    getServices(): Services {
        return this.services
    }

    async logout(): Promise<void> {
        console.log('Logging out...')
        
        await this.services.backend.clearSession()
        this.services.state.setWallet(null)
        
        await this.showWalletSelection()
        
        this.services.ui.showToast('success', 'Logged out successfully')
    }
}