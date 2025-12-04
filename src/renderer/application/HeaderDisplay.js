/**
 * Header Display Controller
 * 
 * Manages the application header display showing current wallet and network status.
 * This is a read-only display - actual switching happens through SettingsManager.
 */

class HeaderDisplay {
    constructor(container, services) {
        this.container = container;
        this.services = services;
        
        // Current context
        this.currentWallet = null;
        this.currentNetwork = 'mainnet';
        
        // DOM references
        this.elements = {
            walletName: null,
            walletAddress: null,
            networkDot: null,
            networkText: null,
            settingsBtn: null
        };
        
        // Callbacks
        this.callbacks = {
            onSettingsClick: null
        };
        
        this.isInitialized = false;
    }

    async initialize(wallet, network) {
        try {
            console.log('🚀 Initializing Header Display...');
            
            this.currentWallet = wallet;
            this.currentNetwork = network;
            
            // Get DOM references
            this.getDOMReferences();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Render initial state
            await this.render();
            
            this.isInitialized = true;
            console.log('✅ Header Display initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Header Display:', error);
            throw error;
        }
    }

    getDOMReferences() {
        this.elements = {
            walletName: this.container.querySelector('#currentWalletName'),
            walletAddress: this.container.querySelector('#currentWalletAddress'),
            networkDot: this.container.querySelector('#networkDot'),
            networkText: this.container.querySelector('#currentNetworkText'),
            settingsBtn: this.container.querySelector('#settingsBtn')
        };
        
        // Validate required elements
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                console.warn(`Header element not found: ${key}`);
            }
        }
    }

    setupEventListeners() {
        // Settings button click handler
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => {
                this.handleSettingsClick();
            });
        }
    }

    async render() {
        try {
            await this.updateWalletDisplay(this.currentWallet);
            await this.updateNetworkDisplay(this.currentNetwork);
        } catch (error) {
            console.error('❌ Failed to render header:', error);
        }
    }

    async updateWalletDisplay(wallet) {
        try {
            this.currentWallet = wallet;
            
            if (!wallet) {
                this.showWalletLoading();
                return;
            }
            
            // Update wallet name
            if (this.elements.walletName) {
                this.elements.walletName.textContent = wallet.name || 'Unnamed Wallet';
                this.elements.walletName.title = wallet.name || 'Unnamed Wallet';
            }
            
            // Update wallet address (network-specific)
            if (this.elements.walletAddress) {
                const address = this.getNetworkAddress(wallet, this.currentNetwork);
                const formattedAddress = this.services.utils.formatAddress(address);
                
                this.elements.walletAddress.textContent = formattedAddress;
                this.elements.walletAddress.title = address;
            }
            
            console.log('✅ Wallet display updated:', wallet.name);
            
        } catch (error) {
            console.error('❌ Failed to update wallet display:', error);
        }
    }

    async updateNetworkDisplay(network) {
        try {
            this.currentNetwork = network;
            
            const networkInfo = this.services.utils.getNetworkInfo(network);
            
            // Update network indicator dot
            if (this.elements.networkDot) {
                this.elements.networkDot.className = `network-dot ${network}`;
            }
            
            // Update network text
            if (this.elements.networkText) {
                this.elements.networkText.textContent = networkInfo.name;
                this.elements.networkText.title = `Current network: ${networkInfo.name}`;
            }
            
            // Update wallet address for new network
            if (this.currentWallet) {
                const address = this.getNetworkAddress(this.currentWallet, network);
                const formattedAddress = this.services.utils.formatAddress(address);
                
                if (this.elements.walletAddress) {
                    this.elements.walletAddress.textContent = formattedAddress;
                    this.elements.walletAddress.title = address;
                }
            }
            
            console.log('✅ Network display updated:', network);
            
        } catch (error) {
            console.error('❌ Failed to update network display:', error);
        }
    }

    showWalletLoading() {
        if (this.elements.walletName) {
            this.elements.walletName.textContent = 'Loading...';
        }
        
        if (this.elements.walletAddress) {
            this.elements.walletAddress.textContent = 'Loading...';
        }
    }

    getNetworkAddress(wallet, network) {
        if (!wallet) return '';
        
        return network === 'mainnet' 
            ? wallet.mainnetAddress || wallet.address
            : wallet.stagenetAddress || wallet.address;
    }

    handleSettingsClick() {
        console.log('⚙️ Settings button clicked');
        
        if (this.callbacks.onSettingsClick) {
            this.callbacks.onSettingsClick();
        }
    }

    // Animation helpers
    animateWalletChange() {
        const walletElements = [this.elements.walletName, this.elements.walletAddress];
        
        walletElements.forEach(element => {
            if (element) {
                element.style.opacity = '0.5';
                element.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    element.style.opacity = '1';
                    element.style.transform = 'scale(1)';
                }, 150);
            }
        });
    }

    animateNetworkChange() {
        if (this.elements.networkDot) {
            this.elements.networkDot.style.transform = 'scale(1.2)';
            
            setTimeout(() => {
                this.elements.networkDot.style.transform = 'scale(1)';
            }, 200);
        }
    }

    // Status indicators
    showConnectionStatus(connected = true) {
        const statusClass = connected ? 'connected' : 'disconnected';
        
        if (this.elements.networkDot) {
            this.elements.networkDot.classList.remove('connected', 'disconnected');
            this.elements.networkDot.classList.add(statusClass);
        }
    }

    showSyncStatus(syncing = false) {
        if (this.elements.networkText && syncing) {
            const originalText = this.elements.networkText.textContent;
            this.elements.networkText.textContent = 'Syncing...';
            
            setTimeout(() => {
                if (this.elements.networkText) {
                    this.elements.networkText.textContent = originalText;
                }
            }, 2000);
        }
    }

    // Balance display (optional enhancement)
    async showQuickBalance() {
        try {
            if (!this.currentWallet) return;
            
            const balances = await this.services.backend.getBalances(
                this.getNetworkAddress(this.currentWallet, this.currentNetwork),
                this.currentNetwork
            );
            
            // This could show a quick balance tooltip or indicator
            // For now, just log it
            console.log('Quick balance loaded:', balances);
            
        } catch (error) {
            console.error('Failed to load quick balance:', error);
        }
    }

    // Tooltip management
    showTooltip(element, message, duration = 2000) {
        if (!element) return;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'header-tooltip';
        tooltip.textContent = message;
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.position = 'absolute';
        tooltip.style.top = `${rect.bottom + 5}px`;
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.zIndex = '1001';
        
        document.body.appendChild(tooltip);
        
        // Auto-remove tooltip
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, duration);
    }

    // Context menu (for future enhancement)
    showWalletContextMenu(event) {
        event.preventDefault();
        
        // This could show a context menu with quick actions
        console.log('Wallet context menu requested');
    }

    // Copy address to clipboard
    async copyAddressToClipboard() {
        try {
            if (!this.currentWallet) return;
            
            const address = this.getNetworkAddress(this.currentWallet, this.currentNetwork);
            const success = await this.services.utils.copyToClipboard(address);
            
            if (success) {
                this.services.ui.showToast('success', 'Address copied to clipboard', 2000);
            } else {
                this.services.ui.showToast('error', 'Failed to copy address', 2000);
            }
            
        } catch (error) {
            console.error('Failed to copy address:', error);
            this.services.ui.showToast('error', 'Failed to copy address', 2000);
        }
    }

    // Event handler registration
    onSettingsClick(callback) {
        this.callbacks.onSettingsClick = callback;
    }

    // Update methods with animation
    async updateWalletWithAnimation(wallet) {
        this.animateWalletChange();
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for animation
        await this.updateWalletDisplay(wallet);
    }

    async updateNetworkWithAnimation(network) {
        this.animateNetworkChange();
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for animation
        await this.updateNetworkDisplay(network);
    }

    // Utility methods
    getCurrentContext() {
        return {
            wallet: this.currentWallet,
            network: this.currentNetwork
        };
    }

    isWalletLoaded() {
        return !!this.currentWallet;
    }

    getFormattedAddress() {
        if (!this.currentWallet) return '';
        
        const address = this.getNetworkAddress(this.currentWallet, this.currentNetwork);
        return this.services.utils.formatAddress(address);
    }

    // Cleanup
    cleanup() {
        // Clear callbacks
        this.callbacks.onSettingsClick = null;
        
        console.log('🧹 Header Display cleanup completed');
    }

    // Status check
    isReady() {
        return this.isInitialized && this.currentWallet && this.currentNetwork;
    }
}