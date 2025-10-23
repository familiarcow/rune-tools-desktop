/**
 * Wallet Tab Component
 * 
 * Displays wallet dashboard with balance, address, and basic operations.
 * Implements the standard tab interface for context management.
 */

class WalletTab {
    constructor(container, services) {
        this.container = container;
        this.services = services;
        
        // Current context
        this.currentWallet = null;
        this.currentNetwork = 'mainnet';
        
        // Component state
        this.balances = null;
        this.isLoading = false;
        this.lastUpdate = null;
        
        // Auto-refresh
        this.refreshInterval = null;
        
        this.isInitialized = false;
    }

    async initialize(wallet, network) {
        try {
            console.log('🚀 Initializing Wallet Tab...');
            
            this.currentWallet = wallet;
            this.currentNetwork = network;
            
            // Render initial UI
            this.render();
            
            // Load initial data
            await this.loadBalances();
            
            // Setup auto-refresh if enabled
            this.setupAutoRefresh();
            
            this.isInitialized = true;
            console.log('✅ Wallet Tab initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Wallet Tab:', error);
            this.renderError('Failed to initialize wallet');
        }
    }

    render() {
        if (!this.container) return;
        
        const address = this.getCurrentAddress();
        const networkInfo = this.services.utils.getNetworkInfo(this.currentNetwork);
        
        this.container.innerHTML = `
            <div class="wallet-dashboard">
                <!-- Wallet Header -->
                <div class="wallet-header">
                    <div class="wallet-title">
                        <h2>${this.currentWallet?.name || 'Unknown Wallet'}</h2>
                        <div class="wallet-network">
                            <span class="network-dot ${this.currentNetwork}"></span>
                            ${networkInfo.name}
                        </div>
                    </div>
                    <div class="wallet-actions">
                        <button class="btn btn-secondary" id="copyAddressBtn">
                            Copy Address
                        </button>
                        <button class="btn btn-secondary" id="refreshBtn">
                            Refresh
                        </button>
                    </div>
                </div>
                
                <!-- Wallet Address -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Wallet Address</h3>
                    </div>
                    <div class="address-display">
                        <code class="wallet-address">${address}</code>
                        <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${address}')">
                            Copy
                        </button>
                    </div>
                </div>
                
                <!-- Balance Summary -->
                <div class="balance-summary">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Portfolio Balance</h3>
                            <div class="balance-actions">
                                <span class="last-update" id="lastUpdateText">
                                    ${this.lastUpdate ? `Updated ${new Date(this.lastUpdate).toLocaleTimeString()}` : 'Not updated'}
                                </span>
                            </div>
                        </div>
                        <div id="balanceContent">
                            ${this.renderBalanceContent()}
                        </div>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div class="quick-actions">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Quick Actions</h3>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-primary action-btn" id="sendBtn">
                                <span class="btn-icon">📤</span>
                                Send
                            </button>
                            <button class="btn btn-primary action-btn" id="receiveBtn">
                                <span class="btn-icon">📥</span>
                                Receive
                            </button>
                            <button class="btn btn-primary action-btn" id="swapBtn">
                                <span class="btn-icon">🔄</span>
                                Swap
                            </button>
                            <button class="btn btn-secondary action-btn" id="historyBtn">
                                <span class="btn-icon">📜</span>
                                History
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
    }

    renderBalanceContent() {
        if (this.isLoading) {
            return `
                <div class="loading-section">
                    <div class="loading-spinner"></div>
                    <p>Loading balances...</p>
                </div>
            `;
        }
        
        if (!this.balances) {
            return `
                <div class="empty-state">
                    <p>No balance data available</p>
                    <button class="btn btn-primary" onclick="this.loadBalances()">
                        Load Balances
                    </button>
                </div>
            `;
        }
        
        // Group balances by type
        const { native, secured, trade } = this.groupBalances(this.balances);
        let totalUSD = 0;
        
        let balanceHtml = '';
        
        // Native THOR assets
        if (native.length > 0) {
            balanceHtml += `
                <div class="balance-section">
                    <h4>THOR Native</h4>
                    <div class="balance-list">
                        ${native.map(balance => {
                            const usdValue = this.calculateUSDValue(balance);
                            totalUSD += usdValue;
                            return this.renderBalanceItem(balance, usdValue);
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        // Secured assets
        if (secured.length > 0) {
            balanceHtml += `
                <div class="balance-section">
                    <h4>Secured Assets</h4>
                    <div class="balance-list">
                        ${secured.map(balance => {
                            const usdValue = this.calculateUSDValue(balance);
                            totalUSD += usdValue;
                            return this.renderBalanceItem(balance, usdValue);
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        // Trade account
        if (trade.length > 0) {
            balanceHtml += `
                <div class="balance-section">
                    <h4>Trade Account</h4>
                    <div class="balance-list">
                        ${trade.map(balance => {
                            const usdValue = this.calculateUSDValue(balance);
                            totalUSD += usdValue;
                            return this.renderBalanceItem(balance, usdValue);
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="portfolio-total">
                <div class="total-value">
                    <span class="total-label">Total Portfolio Value</span>
                    <span class="total-amount">${this.services.utils.formatUSD(totalUSD)}</span>
                </div>
            </div>
            ${balanceHtml}
        `;
    }

    renderBalanceItem(balance, usdValue) {
        const amount = parseFloat(balance.amount) / Math.pow(10, balance.decimals || 8);
        
        return `
            <div class="balance-item">
                <div class="asset-info">
                    <div class="asset-symbol">${balance.asset}</div>
                    <div class="asset-amount">${this.services.utils.formatBalance(amount, 6)}</div>
                </div>
                <div class="asset-value">
                    <div class="usd-value">${this.services.utils.formatUSD(usdValue)}</div>
                </div>
            </div>
        `;
    }

    renderError(message) {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h3>Error</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    Retry
                </button>
            </div>
        `;
    }

    attachEventListeners() {
        // Copy address button
        const copyBtn = this.container.querySelector('#copyAddressBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyAddress());
        }
        
        // Refresh button
        const refreshBtn = this.container.querySelector('#refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadBalances());
        }
        
        // Quick action buttons
        const actionButtons = {
            sendBtn: () => this.handleSend(),
            receiveBtn: () => this.handleReceive(),
            swapBtn: () => this.handleSwap(),
            historyBtn: () => this.handleHistory()
        };
        
        Object.entries(actionButtons).forEach(([id, handler]) => {
            const btn = this.container.querySelector(`#${id}`);
            if (btn) {
                btn.addEventListener('click', handler);
            }
        });
    }

    async loadBalances() {
        try {
            this.setLoading(true);
            
            const address = this.getCurrentAddress();
            if (!address) {
                throw new Error('No wallet address available');
            }
            
            // Load normalized balances (includes all balance types)
            this.balances = await this.services.backend.getNormalizedBalances(address, this.currentNetwork);
            
            this.lastUpdate = Date.now();
            
            // Update the UI
            this.updateBalanceDisplay();
            
            console.log('✅ Balances loaded successfully');
            
        } catch (error) {
            console.error('❌ Failed to load balances:', error);
            this.services.ui.showToast('error', 'Failed to load balances', 3000);
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        
        const refreshBtn = this.container.querySelector('#refreshBtn');
        if (refreshBtn) {
            if (loading) {
                this.services.ui.showElementLoading(refreshBtn, 'Loading...');
            } else {
                this.services.ui.hideElementLoading(refreshBtn);
            }
        }
    }

    updateBalanceDisplay() {
        const balanceContent = this.container.querySelector('#balanceContent');
        const lastUpdateText = this.container.querySelector('#lastUpdateText');
        
        if (balanceContent) {
            balanceContent.innerHTML = this.renderBalanceContent();
        }
        
        if (lastUpdateText) {
            lastUpdateText.textContent = `Updated ${new Date(this.lastUpdate).toLocaleTimeString()}`;
        }
    }

    groupBalances(balances) {
        if (!Array.isArray(balances)) {
            return { native: [], secured: [], trade: [] };
        }
        
        return {
            native: balances.filter(b => b.type === 'native'),
            secured: balances.filter(b => b.type === 'secured'),
            trade: balances.filter(b => b.type === 'trade')
        };
    }

    calculateUSDValue(balance) {
        // This would calculate USD value based on current prices
        // For now, return a placeholder
        return 0;
    }

    getCurrentAddress() {
        if (!this.currentWallet) return '';
        
        return this.currentNetwork === 'mainnet' 
            ? this.currentWallet.mainnetAddress
            : this.currentWallet.stagenetAddress;
    }

    async copyAddress() {
        try {
            const address = this.getCurrentAddress();
            const success = await this.services.utils.copyToClipboard(address);
            
            if (success) {
                this.services.ui.showToast('success', 'Address copied to clipboard', 2000);
            } else {
                this.services.ui.showToast('error', 'Failed to copy address', 2000);
            }
        } catch (error) {
            console.error('Failed to copy address:', error);
        }
    }

    setupAutoRefresh() {
        const autoRefresh = this.services.state.getSetting('autoRefresh', true);
        const refreshInterval = this.services.state.getSetting('refreshInterval', 30000);
        
        if (autoRefresh && refreshInterval > 0) {
            this.refreshInterval = setInterval(() => {
                if (!this.isLoading && this.isInitialized) {
                    this.loadBalances();
                }
            }, refreshInterval);
        }
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Quick action handlers
    handleSend() {
        this.services.ui.showToast('info', 'Send functionality coming soon...', 2000);
    }

    handleReceive() {
        // Show receive modal with QR code
        const address = this.getCurrentAddress();
        this.services.ui.showModal({
            title: 'Receive Funds',
            content: `
                <div class="receive-modal">
                    <div class="qr-placeholder">QR Code for ${address}</div>
                    <div class="address-display">
                        <label>Address:</label>
                        <input type="text" value="${address}" readonly class="form-input">
                        <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${address}')">Copy</button>
                    </div>
                </div>
            `,
            buttons: [
                {
                    text: 'Close',
                    primary: true,
                    handler: () => true
                }
            ]
        });
    }

    handleSwap() {
        // Switch to swap tab
        window.runeToolsApp?.controllers?.application?.switchTab('swap');
    }

    handleHistory() {
        this.services.ui.showToast('info', 'Transaction history coming soon...', 2000);
    }

    // Standard Tab Interface Implementation

    async updateContext(wallet, network) {
        try {
            console.log('🔄 Updating Wallet Tab context...');
            
            const walletChanged = this.currentWallet?.walletId !== wallet?.walletId;
            const networkChanged = this.currentNetwork !== network;
            
            this.currentWallet = wallet;
            this.currentNetwork = network;
            
            if (walletChanged || networkChanged) {
                // Clear cached data
                this.balances = null;
                this.lastUpdate = null;
                
                // Re-render UI
                this.render();
                
                // Reload balances
                await this.loadBalances();
            }
            
            console.log('✅ Wallet Tab context updated');
            
        } catch (error) {
            console.error('❌ Failed to update Wallet Tab context:', error);
        }
    }

    async updateWallet(newWallet, currentNetwork) {
        await this.updateContext(newWallet, currentNetwork);
    }

    async updateNetwork(newNetwork, currentWallet) {
        await this.updateContext(currentWallet, newNetwork);
    }

    async refresh() {
        await this.loadBalances();
    }

    async onActivated() {
        // Tab became active - refresh if data is stale
        const staleThreshold = 60000; // 1 minute
        
        if (!this.lastUpdate || (Date.now() - this.lastUpdate) > staleThreshold) {
            await this.loadBalances();
        }
    }

    getNetworkRequirements() {
        return ['mainnet', 'stagenet']; // This tab works on both networks
    }

    validateRequirements(wallet, network) {
        return wallet && network && this.getNetworkRequirements().includes(network);
    }

    isInitialized() {
        return this.isInitialized;
    }

    getState() {
        return {
            wallet: this.currentWallet,
            network: this.currentNetwork,
            balances: this.balances,
            lastUpdate: this.lastUpdate,
            isLoading: this.isLoading
        };
    }

    setState(newState) {
        Object.assign(this, newState);
    }

    cleanup() {
        this.stopAutoRefresh();
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('🧹 Wallet Tab cleanup completed');
    }
}