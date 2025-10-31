/**
 * Rune Tools Application Controller
 * 
 * Main application entry point that orchestrates the entire application lifecycle.
 * Handles phase management, wallet context, network switching, and component coordination.
 * 
 * Architecture: Two-phase system
 * - Phase 1: Wallet Selection (onboarding)
 * - Phase 2: Main Application (tabbed interface)
 */

class RuneToolsApplication {
    constructor() {
        // Core application state
        this.currentPhase = 'onboarding'; // 'onboarding' | 'application'
        this.services = {};
        this.controllers = {};
        
        // Multi-wallet context
        this.availableWallets = [];
        this.activeWallet = null;
        this.currentNetwork = 'mainnet';
        
        // Application state
        this.isInitialized = false;
        this.isLoading = false;
        
        // DOM references
        this.elements = {
            walletSelectionPhase: null,
            mainAppPhase: null,
            loadingOverlay: null,
            toastContainer: null
        };
        
        // Bind methods
        this.handleError = this.handleError.bind(this);
        this.handleWalletUnlocked = this.handleWalletUnlocked.bind(this);
        this.handleNetworkSwitch = this.handleNetworkSwitch.bind(this);
        this.handleWalletSwitch = this.handleWalletSwitch.bind(this);
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Rune Tools Application...');
            this.showLoading('Initializing application...');
            
            console.log('Step 1: Getting DOM references...');
            // Get DOM references
            this.getDOMReferences();
            console.log('✅ DOM references obtained');
            
            console.log('Step 2: Initializing services...');
            // Initialize services
            await this.initializeServices();
            console.log('✅ Services initialized');
            
            console.log('Step 3: Detecting application phase...');
            // Detect application phase
            await this.detectApplicationPhase();
            console.log('✅ Application phase detected:', this.currentPhase);
            
            console.log('Step 4: Initializing current phase...');
            // Initialize appropriate phase
            await this.initializeCurrentPhase();
            console.log('✅ Current phase initialized');
            
            console.log('Step 5: Setting up error handling...');
            // Setup global error handling
            this.setupErrorHandling();
            console.log('✅ Error handling setup');
            
            this.isInitialized = true;
            this.hideLoading();
            
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            console.error('Error stack:', error.stack);
            this.handleError(error, 'Failed to initialize application');
            this.hideLoading();
        }
    }

    /**
     * Get DOM element references
     */
    getDOMReferences() {
        this.elements = {
            walletSelectionPhase: document.getElementById('walletSelectionPhase'),
            mainAppPhase: document.getElementById('mainAppPhase'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            toastContainer: document.getElementById('toastContainer')
        };
        
        // Validate required elements
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                throw new Error(`Required DOM element not found: ${key}`);
            }
        }
    }

    /**
     * Initialize core services
     */
    async initializeServices() {
        try {
            console.log('Checking required service classes...');
            // Check if required service classes are available
            const requiredServices = ['Utils', 'BackendService', 'StateManager', 'UIService'];
            for (const serviceName of requiredServices) {
                console.log(`Checking ${serviceName}:`, typeof window[serviceName]);
                if (typeof window[serviceName] === 'undefined') {
                    throw new Error(`${serviceName} class not available`);
                }
            }
            console.log('✅ All service classes are available');
            
            console.log('Creating service instances...');
            // Initialize services in dependency order
            this.services.utils = new Utils();
            console.log('✅ Utils created');
            
            this.services.backend = new BackendService();
            console.log('✅ BackendService created');
            
            this.services.state = new StateManager();
            console.log('✅ StateManager created');
            
            this.services.ui = new UIService();
            console.log('✅ UIService created');
            
            console.log('Initializing backend service...');
            // Initialize each service
            await this.services.backend.initialize();
            console.log('✅ Backend service initialized');
            
            console.log('Initializing state manager...');
            await this.services.state.initialize();
            console.log('✅ State manager initialized');
            
            console.log('Initializing UI service...');
            await this.services.ui.initialize();
            console.log('✅ UI service initialized');
            
            console.log('✅ All services initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize services:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    /**
     * Detect which phase the application should start in
     */
    async detectApplicationPhase() {
        try {
            // Check for existing wallets and active session
            this.availableWallets = await this.loadAvailableWallets();
            const activeSession = await this.checkActiveSession();
            
            if (activeSession && activeSession.wallet) {
                // Resume active session
                this.activeWallet = activeSession.wallet;
                this.currentNetwork = activeSession.network || 'mainnet';
                this.currentPhase = 'application';
                console.log('📱 Resuming active session');
            } else {
                // Start with wallet selection
                this.currentPhase = 'onboarding';
                console.log('👋 Starting with wallet selection');
            }
            
        } catch (error) {
            console.error('❌ Failed to detect application phase:', error);
            this.currentPhase = 'onboarding'; // Fallback to onboarding
        }
    }

    /**
     * Initialize the current phase
     */
    async initializeCurrentPhase() {
        if (this.currentPhase === 'onboarding') {
            await this.initializeOnboardingPhase();
        } else {
            await this.initializeApplicationPhase();
        }
    }

    /**
     * Initialize wallet selection/onboarding phase
     */
    async initializeOnboardingPhase() {
        try {
            console.log('🚀 Initializing onboarding phase...');
            
            // Show wallet selection phase
            this.showWalletSelectionPhase();
            
            // Check if WalletSelectionController class is available
            if (typeof WalletSelectionController === 'undefined') {
                throw new Error('WalletSelectionController class not available');
            }
            
            // Initialize wallet selection controller
            this.controllers.walletSelection = new WalletSelectionController(
                this.elements.walletSelectionPhase,
                this.services
            );
            
            // Setup event listeners
            this.controllers.walletSelection.onWalletUnlocked(this.handleWalletUnlocked);
            this.controllers.walletSelection.onError(this.handleError);
            
            // Initialize controller
            await this.controllers.walletSelection.initialize(this.availableWallets);
            
            console.log('✅ Onboarding phase initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize onboarding phase:', error);
            throw error;
        }
    }

    /**
     * Initialize main application phase
     */
    async initializeApplicationPhase() {
        try {
            console.log('🚀 Initializing application phase...');
            
            // Show main application phase
            this.showMainApplicationPhase();
            
            // Check if required classes are available
            const requiredClasses = ['ApplicationController', 'HeaderDisplay', 'SettingsManager'];
            for (const className of requiredClasses) {
                if (typeof window[className] === 'undefined') {
                    throw new Error(`${className} class not available`);
                }
            }
            
            // Initialize application controller
            this.controllers.application = new ApplicationController(
                this.elements.mainAppPhase,
                this.services
            );
            
            // Initialize header display
            this.controllers.headerDisplay = new HeaderDisplay(
                document.getElementById('appHeader'),
                this.services
            );
            
            // Initialize settings manager
            this.controllers.settingsManager = new SettingsManager(
                document.getElementById('settingsPanel'),
                this.services
            );
            
            // Setup event listeners
            this.controllers.settingsManager.onWalletSwitch(this.handleWalletSwitch);
            this.controllers.settingsManager.onNetworkSwitch(this.handleNetworkSwitch);
            this.controllers.application.onLogout(() => this.switchToOnboarding());
            
            // Initialize controllers with current context
            await this.controllers.application.initialize(this.activeWallet, this.currentNetwork);
            await this.controllers.headerDisplay.initialize(this.activeWallet, this.currentNetwork);
            await this.controllers.settingsManager.initialize(
                this.activeWallet, 
                this.currentNetwork, 
                this.availableWallets
            );
            
            console.log('✅ Application phase initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize application phase:', error);
            throw error;
        }
    }

    /**
     * Handle successful wallet unlock
     */
    async handleWalletUnlocked(wallet, network = 'mainnet') {
        try {
            console.log('🔓 Wallet unlocked:', wallet.name);
            
            // Update application state
            this.activeWallet = wallet;
            this.currentNetwork = network;
            
            // Save session
            await this.saveActiveSession({
                wallet: wallet,
                network: network,
                timestamp: Date.now()
            });
            
            // Switch to main application
            await this.switchToMainApplication();
            
        } catch (error) {
            console.error('❌ Failed to handle wallet unlock:', error);
            this.handleError(error, 'Failed to unlock wallet');
        }
    }

    /**
     * Handle network switching from settings
     */
    async handleNetworkSwitch(newNetwork) {
        try {
            console.log(`🌐 Switching network: ${this.currentNetwork} → ${newNetwork}`);
            
            const oldNetwork = this.currentNetwork;
            this.currentNetwork = newNetwork;
            
            // Update wallet address for new network
            if (this.activeWallet) {
                this.activeWallet.address = this.getNetworkAddress(this.activeWallet, newNetwork);
            }
            
            // Update all components with new context
            await this.updateAllComponents(this.activeWallet, newNetwork);
            
            // Save updated session
            await this.saveActiveSession({
                wallet: this.activeWallet,
                network: newNetwork,
                timestamp: Date.now()
            });
            
            this.showToast('success', `Switched to ${newNetwork}`);
            
        } catch (error) {
            console.error('❌ Failed to switch network:', error);
            this.handleError(error, 'Failed to switch network');
        }
    }

    /**
     * Handle wallet switching from settings
     */
    async handleWalletSwitch(newWallet, network = null) {
        try {
            console.log(`👤 Switching wallet: ${this.activeWallet?.name} → ${newWallet.name}`);
            
            const oldWallet = this.activeWallet;
            this.activeWallet = newWallet;
            
            // Use provided network or keep current
            if (network) {
                this.currentNetwork = network;
            }
            
            // Update wallet address for current network
            this.activeWallet.address = this.getNetworkAddress(newWallet, this.currentNetwork);
            
            // Update all components with new context
            await this.updateAllComponents(this.activeWallet, this.currentNetwork);
            
            // Save updated session
            await this.saveActiveSession({
                wallet: this.activeWallet,
                network: this.currentNetwork,
                timestamp: Date.now()
            });
            
            this.showToast('success', `Switched to ${newWallet.name}`);
            
        } catch (error) {
            console.error('❌ Failed to switch wallet:', error);
            this.handleError(error, 'Failed to switch wallet');
        }
    }

    /**
     * Update all components with new wallet/network context
     */
    async updateAllComponents(wallet, network) {
        try {
            // Update header display
            if (this.controllers.headerDisplay) {
                await this.controllers.headerDisplay.updateWallet(wallet, network);
                await this.controllers.headerDisplay.updateNetwork(network);
            }
            
            // Update settings manager
            if (this.controllers.settingsManager) {
                await this.controllers.settingsManager.updateWalletStatus(wallet);
                await this.controllers.settingsManager.updateNetworkStatus(network);
            }
            
            // Update application controller (propagates to all tabs)
            if (this.controllers.application) {
                await this.controllers.application.switchNetwork(network);
            }
            
        } catch (error) {
            console.error('❌ Failed to update components:', error);
            throw error;
        }
    }

    /**
     * Switch from onboarding to main application
     */
    async switchToMainApplication() {
        try {
            this.showLoading('Loading application...');
            
            // Cleanup onboarding phase
            if (this.controllers.walletSelection) {
                this.controllers.walletSelection.cleanup();
                delete this.controllers.walletSelection;
            }
            
            // Initialize application phase
            this.currentPhase = 'application';
            await this.initializeApplicationPhase();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Failed to switch to main application:', error);
            this.handleError(error, 'Failed to load application');
        }
    }

    /**
     * Switch from main application to onboarding
     */
    async switchToOnboarding() {
        try {
            console.log('👋 Logging out - returning to wallet selection');
            
            // Clear active session
            await this.clearActiveSession();
            
            // Cleanup application phase
            if (this.controllers.application) {
                this.controllers.application.cleanup();
                delete this.controllers.application;
            }
            if (this.controllers.headerDisplay) {
                this.controllers.headerDisplay.cleanup();
                delete this.controllers.headerDisplay;
            }
            if (this.controllers.settingsManager) {
                this.controllers.settingsManager.cleanup();
                delete this.controllers.settingsManager;
            }
            
            // Reset state
            this.activeWallet = null;
            this.currentNetwork = 'mainnet';
            
            // Initialize onboarding phase
            this.currentPhase = 'onboarding';
            await this.initializeOnboardingPhase();
            
        } catch (error) {
            console.error('❌ Failed to switch to onboarding:', error);
            this.handleError(error, 'Failed to logout');
        }
    }

    /**
     * Show wallet selection phase
     */
    showWalletSelectionPhase() {
        this.elements.walletSelectionPhase.style.display = 'flex';
        this.elements.mainAppPhase.style.display = 'none';
    }

    /**
     * Show main application phase
     */
    showMainApplicationPhase() {
        this.elements.walletSelectionPhase.style.display = 'none';
        this.elements.mainAppPhase.style.display = 'flex';
    }

    /**
     * Multi-wallet management methods
     */

    async loadAvailableWallets() {
        try {
            return await this.services.backend.getAvailableWallets() || [];
        } catch (error) {
            console.error('❌ Failed to load available wallets:', error);
            return [];
        }
    }

    async addWallet(wallet) {
        try {
            await this.services.backend.saveWallet(wallet);
            this.availableWallets = await this.loadAvailableWallets();
            return true;
        } catch (error) {
            console.error('❌ Failed to add wallet:', error);
            throw error;
        }
    }

    async removeWallet(walletId) {
        try {
            await this.services.backend.removeWallet(walletId);
            this.availableWallets = await this.loadAvailableWallets();
            
            // If removed wallet was active, logout
            if (this.activeWallet && this.activeWallet.walletId === walletId) {
                await this.switchToOnboarding();
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to remove wallet:', error);
            throw error;
        }
    }

    /**
     * Network-specific address derivation
     */
    getNetworkAddress(wallet, network) {
        return network === 'mainnet' 
            ? wallet.mainnetAddress 
            : wallet.stagenetAddress;
    }

    /**
     * Session management
     */

    async saveActiveSession(sessionData) {
        try {
            await this.services.backend.saveSession(sessionData);
        } catch (error) {
            console.error('❌ Failed to save session:', error);
        }
    }

    async checkActiveSession() {
        try {
            return await this.services.backend.getActiveSession();
        } catch (error) {
            console.error('❌ Failed to check active session:', error);
            return null;
        }
    }

    async clearActiveSession() {
        try {
            await this.services.backend.clearSession();
        } catch (error) {
            console.error('❌ Failed to clear session:', error);
        }
    }

    /**
     * UI helper methods
     */

    showLoading(message = 'Loading...') {
        this.isLoading = true;
        const loadingText = this.elements.loadingOverlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
        this.elements.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.isLoading = false;
        this.elements.loadingOverlay.style.display = 'none';
    }

    showToast(type, message, duration = 3000) {
        if (!this.services.ui) return;
        this.services.ui.showToast(type, message, duration);
    }

    /**
     * Error handling
     */
    setupErrorHandling() {
        window.addEventListener('error', this.handleError);
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason);
        });
    }

    handleError(error, context = 'Application Error') {
        console.error(`❌ ${context}:`, error);
        
        // Show user-friendly error message
        const message = error.message || 'An unexpected error occurred';
        this.showToast('error', message, 5000);
        
        // Hide loading if active
        if (this.isLoading) {
            this.hideLoading();
        }
    }

    /**
     * Application lifecycle
     */
    cleanup() {
        // Cleanup all controllers
        Object.values(this.controllers).forEach(controller => {
            if (controller && typeof controller.cleanup === 'function') {
                controller.cleanup();
            }
        });
        
        // Remove event listeners
        window.removeEventListener('error', this.handleError);
        window.removeEventListener('unhandledrejection', this.handleError);
        
        console.log('🧹 Application cleanup completed');
    }

    /**
     * Public API
     */
    getCurrentWallet() {
        return this.activeWallet;
    }

    getCurrentNetwork() {
        return this.currentNetwork;
    }

    getAvailableWallets() {
        return this.availableWallets;
    }

    isApplicationReady() {
        return this.isInitialized && !this.isLoading;
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Create global application instance
        window.runeToolsApp = new RuneToolsApplication();
        
        // Initialize application
        await window.runeToolsApp.initialize();
        
    } catch (error) {
        console.error('❌ Failed to start application:', error);
        
        // Show basic error message if toast system isn't available
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                position: fixed; 
                top: 20px; 
                right: 20px; 
                background: #ff6b6b; 
                color: white; 
                padding: 16px; 
                border-radius: 8px; 
                z-index: 9999;
                font-family: system-ui;
            ">
                <strong>Application Error</strong><br>
                Failed to initialize. Please refresh the page.
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
});