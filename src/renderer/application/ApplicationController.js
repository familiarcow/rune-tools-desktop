/**
 * Application Controller
 * 
 * Coordinates the main tabbed application interface.
 * Manages tab switching, context updates, and integration with other controllers.
 */

class ApplicationController {
    constructor(container, services) {
        this.container = container;
        this.services = services;
        
        // Current context
        this.activeWallet = null;
        this.currentNetwork = 'mainnet';
        this.activeTab = 'wallet';
        
        // Tab instances
        this.tabs = new Map();
        
        // Callbacks
        this.callbacks = {
            onLogout: null
        };
        
        // DOM references
        this.tabButtons = null;
        this.tabContents = null;
        
        this.isInitialized = false;
    }

    async initialize(wallet, network) {
        try {
            console.log('🚀 Initializing Application Controller...');
            
            this.activeWallet = wallet;
            this.currentNetwork = network;
            
            // Get DOM references
            this.getDOMReferences();
            
            // Initialize tab system
            await this.initializeTabs();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Set initial active tab
            await this.switchTab(this.activeTab);
            
            this.isInitialized = true;
            console.log('✅ Application Controller initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Application Controller:', error);
            throw error;
        }
    }

    getDOMReferences() {
        this.tabButtons = this.container.querySelectorAll('.tab-btn');
        this.tabContents = this.container.querySelectorAll('.tab-content');
        
        if (!this.tabButtons.length || !this.tabContents.length) {
            throw new Error('Required tab elements not found');
        }
    }

    async initializeTabs() {
        try {
            console.log('📑 Initializing tabs...');
            
            // Initialize each tab component
            await this.initializeTab('wallet', 'WalletTab', 'walletTabContent');
            await this.initializeTab('swap', 'SwapTab', 'swapTabContent');
            await this.initializeTab('memoless', 'MemolessTab', 'memolessTabContent');
            await this.initializeTab('network', 'NetworkTab', 'networkTabContent');
            await this.initializeTab('dev', 'DevTab', 'devTabContent');
            
            console.log('✅ All tabs initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize tabs:', error);
            throw error;
        }
    }

    async initializeTab(tabName, tabClass, containerId) {
        try {
            const tabContainer = document.getElementById(containerId);
            if (!tabContainer) {
                console.warn(`Tab container not found: ${containerId}`);
                return;
            }
            
            // Check if tab class exists
            if (typeof window[tabClass] !== 'function') {
                console.warn(`Tab class not found: ${tabClass}`);
                return;
            }
            
            // Create tab instance
            const tabInstance = new window[tabClass](tabContainer, this.services);
            
            // Initialize with current context
            await tabInstance.initialize(this.activeWallet, this.currentNetwork);
            
            // Store tab instance
            this.tabs.set(tabName, tabInstance);
            
            console.log(`✅ Tab initialized: ${tabName}`);
            
        } catch (error) {
            console.error(`❌ Failed to initialize tab ${tabName}:`, error);
            // Don't throw - continue with other tabs
        }
    }

    setupEventListeners() {
        // Tab button click handlers
        this.tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });
    }

    async switchTab(tabName) {
        try {
            console.log(`📑 Switching to tab: ${tabName}`);
            
            // Validate tab
            if (!this.isValidTab(tabName)) {
                console.error(`Invalid tab: ${tabName}`);
                return;
            }
            
            // Check tab requirements
            if (!this.checkTabRequirements(tabName)) {
                console.log(`Tab requirements not met for: ${tabName}`);
                return;
            }
            
            // Update UI - buttons
            this.tabButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.tab === tabName) {
                    btn.classList.add('active');
                }
            });
            
            // Update UI - content
            this.tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === this.getTabContentId(tabName)) {
                    content.classList.add('active');
                }
            });
            
            // Activate tab instance
            const tabInstance = this.tabs.get(tabName);
            if (tabInstance && typeof tabInstance.onActivated === 'function') {
                await tabInstance.onActivated();
            }
            
            // Update active tab
            this.activeTab = tabName;
            
            // Update state
            this.services.state.setActiveTab(tabName);
            
            console.log(`✅ Switched to tab: ${tabName}`);
            
        } catch (error) {
            console.error(`❌ Failed to switch to tab ${tabName}:`, error);
        }
    }

    isValidTab(tabName) {
        const validTabs = ['wallet', 'swap', 'memoless', 'network', 'dev'];
        return validTabs.includes(tabName);
    }

    checkTabRequirements(tabName) {
        // Memoless tab only works on stagenet
        if (tabName === 'memoless' && this.currentNetwork !== 'stagenet') {
            this.services.ui.showToast('warning', 'Memoless is only available on Stagenet', 3000);
            return false;
        }
        
        return true;
    }

    getTabContentId(tabName) {
        const contentIdMap = {
            'wallet': 'walletTabContent',
            'swap': 'swapTabContent',
            'memoless': 'memolessTabContent',
            'network': 'networkTabContent',
            'dev': 'devTabContent'
        };
        
        return contentIdMap[tabName];
    }

    async updateContext(wallet, network) {
        try {
            console.log('🔄 Updating application context...');
            
            const oldWallet = this.activeWallet;
            const oldNetwork = this.currentNetwork;
            
            this.activeWallet = wallet;
            this.currentNetwork = network;
            
            // Update all tabs with new context
            await this.updateAllTabs(wallet, network);
            
            // Update network-dependent UI states
            this.updateNetworkDependentUI();
            
            console.log('✅ Application context updated');
            
        } catch (error) {
            console.error('❌ Failed to update application context:', error);
            throw error;
        }
    }

    async updateAllTabs(wallet, network) {
        const updatePromises = [];
        
        for (const [tabName, tabInstance] of this.tabs) {
            if (tabInstance && typeof tabInstance.updateContext === 'function') {
                updatePromises.push(
                    tabInstance.updateContext(wallet, network).catch(error => {
                        console.error(`Failed to update context for tab ${tabName}:`, error);
                    })
                );
            }
        }
        
        await Promise.all(updatePromises);
    }

    updateNetworkDependentUI() {
        // Update memoless tab availability based on network
        const memolessButton = Array.from(this.tabButtons).find(btn => btn.dataset.tab === 'memoless');
        if (memolessButton) {
            if (this.currentNetwork === 'stagenet') {
                memolessButton.classList.remove('disabled');
                memolessButton.disabled = false;
            } else {
                memolessButton.classList.add('disabled');
                memolessButton.disabled = true;
                
                // Switch away from memoless if currently active
                if (this.activeTab === 'memoless') {
                    this.switchTab('wallet');
                }
            }
        }
    }

    // Navigation methods
    getActiveTab() {
        return this.activeTab;
    }

    getAvailableTabs() {
        return Array.from(this.tabs.keys());
    }

    isTabAvailable(tabName) {
        if (tabName === 'memoless') {
            return this.currentNetwork === 'stagenet';
        }
        
        return this.tabs.has(tabName);
    }

    // Tab instance access
    getTabInstance(tabName) {
        return this.tabs.get(tabName);
    }

    // Refresh current tab
    async refreshActiveTab() {
        try {
            const tabInstance = this.tabs.get(this.activeTab);
            if (tabInstance && typeof tabInstance.refresh === 'function') {
                await tabInstance.refresh();
            }
        } catch (error) {
            console.error('Failed to refresh active tab:', error);
        }
    }

    // Logout functionality
    async logout() {
        try {
            console.log('👋 Logging out from application...');
            
            // Clear any pending operations
            this.tabs.forEach((tabInstance, tabName) => {
                if (typeof tabInstance.cleanup === 'function') {
                    tabInstance.cleanup();
                }
            });
            
            // Trigger logout callback
            if (this.callbacks.onLogout) {
                this.callbacks.onLogout();
            }
            
        } catch (error) {
            console.error('❌ Failed to logout:', error);
        }
    }

    // Event handler registration
    onLogout(callback) {
        this.callbacks.onLogout = callback;
    }

    // Cleanup
    cleanup() {
        console.log('🧹 Cleaning up Application Controller...');
        
        // Cleanup all tabs
        this.tabs.forEach((tabInstance, tabName) => {
            if (typeof tabInstance.cleanup === 'function') {
                tabInstance.cleanup();
            }
        });
        
        this.tabs.clear();
        
        // Clear callbacks
        this.callbacks.onLogout = null;
        
        console.log('🧹 Application Controller cleanup completed');
    }

    // Status check
    isReady() {
        return this.isInitialized && this.activeWallet && this.currentNetwork;
    }
}