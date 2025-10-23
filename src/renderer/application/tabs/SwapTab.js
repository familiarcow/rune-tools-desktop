/**
 * Swap Tab Component
 * 
 * Provides asset swapping functionality with real-time quotes and transaction execution.
 */

class SwapTab {
    constructor(container, services) {
        this.container = container;
        this.services = services;
        
        // Current context
        this.currentWallet = null;
        this.currentNetwork = 'mainnet';
        
        // Component state
        this.availableAssets = [];
        this.currentQuote = null;
        this.isLoading = false;
        
        this.isInitialized = false;
    }

    async initialize(wallet, network) {
        try {
            console.log('🚀 Initializing Swap Tab...');
            
            this.currentWallet = wallet;
            this.currentNetwork = network;
            
            // Render initial UI
            this.render();
            
            this.isInitialized = true;
            console.log('✅ Swap Tab initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Swap Tab:', error);
            this.renderError('Failed to initialize swap');
        }
    }

    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="swap-interface">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Asset Swap</h2>
                        <div class="swap-network">
                            <span class="network-dot ${this.currentNetwork}"></span>
                            ${this.services.utils.getNetworkInfo(this.currentNetwork).name}
                        </div>
                    </div>
                    
                    <div class="swap-form">
                        <div class="swap-section from-section">
                            <label>From</label>
                            <div class="asset-input">
                                <select class="asset-select" id="fromAsset">
                                    <option value="">Select asset...</option>
                                </select>
                                <input type="number" class="amount-input" id="fromAmount" placeholder="0.00" step="any" min="0">
                            </div>
                            <div class="asset-balance" id="fromBalance">Balance: --</div>
                        </div>
                        
                        <div class="swap-arrow">
                            <button class="btn btn-secondary swap-reverse-btn" id="reverseBtn">
                                ⇅
                            </button>
                        </div>
                        
                        <div class="swap-section to-section">
                            <label>To</label>
                            <div class="asset-input">
                                <select class="asset-select" id="toAsset">
                                    <option value="">Select asset...</option>
                                </select>
                                <div class="estimated-amount" id="estimatedAmount">0.00</div>
                            </div>
                        </div>
                        
                        <div class="quote-section" id="quoteSection" style="display: none;">
                            <div class="quote-details" id="quoteDetails">
                                <!-- Quote information will be displayed here -->
                            </div>
                        </div>
                        
                        <div class="swap-actions">
                            <button class="btn btn-primary btn-large" id="getQuoteBtn" disabled>
                                Get Quote
                            </button>
                            <button class="btn btn-success btn-large" id="executeSwapBtn" disabled style="display: none;">
                                Execute Swap
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="swap-info">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Swap Information</h3>
                        </div>
                        <div class="info-content">
                            <p>• Swaps are powered by THORChain's cross-chain liquidity protocol</p>
                            <p>• Quotes are valid for a limited time and may change based on market conditions</p>
                            <p>• Network fees will be automatically included in the transaction</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
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
        // Asset selection
        const fromAsset = this.container.querySelector('#fromAsset');
        const toAsset = this.container.querySelector('#toAsset');
        const fromAmount = this.container.querySelector('#fromAmount');
        
        if (fromAsset) {
            fromAsset.addEventListener('change', () => this.handleAssetChange());
        }
        
        if (toAsset) {
            toAsset.addEventListener('change', () => this.handleAssetChange());
        }
        
        if (fromAmount) {
            fromAmount.addEventListener('input', () => this.handleAmountChange());
        }
        
        // Buttons
        const reverseBtn = this.container.querySelector('#reverseBtn');
        const getQuoteBtn = this.container.querySelector('#getQuoteBtn');
        const executeSwapBtn = this.container.querySelector('#executeSwapBtn');
        
        if (reverseBtn) {
            reverseBtn.addEventListener('click', () => this.reverseAssets());
        }
        
        if (getQuoteBtn) {
            getQuoteBtn.addEventListener('click', () => this.getQuote());
        }
        
        if (executeSwapBtn) {
            executeSwapBtn.addEventListener('click', () => this.executeSwap());
        }
    }

    handleAssetChange() {
        // Update available balances and validate selection
        this.updateBalanceDisplay();
        this.validateSwapInputs();
    }

    handleAmountChange() {
        // Validate amount and update quote button state
        this.validateSwapInputs();
    }

    reverseAssets() {
        const fromAsset = this.container.querySelector('#fromAsset');
        const toAsset = this.container.querySelector('#toAsset');
        
        if (fromAsset && toAsset) {
            const tempValue = fromAsset.value;
            fromAsset.value = toAsset.value;
            toAsset.value = tempValue;
            
            this.handleAssetChange();
        }
    }

    async getQuote() {
        try {
            this.setLoading(true);
            
            // This would get a real quote from THORChain
            this.services.ui.showToast('info', 'Quote functionality coming soon...', 3000);
            
        } catch (error) {
            console.error('Failed to get quote:', error);
            this.services.ui.showToast('error', 'Failed to get quote', 3000);
        } finally {
            this.setLoading(false);
        }
    }

    async executeSwap() {
        try {
            this.setLoading(true);
            
            // This would execute the swap transaction
            this.services.ui.showToast('info', 'Swap execution coming soon...', 3000);
            
        } catch (error) {
            console.error('Failed to execute swap:', error);
            this.services.ui.showToast('error', 'Failed to execute swap', 3000);
        } finally {
            this.setLoading(false);
        }
    }

    updateBalanceDisplay() {
        // Update balance displays based on selected assets
        const fromBalance = this.container.querySelector('#fromBalance');
        if (fromBalance) {
            fromBalance.textContent = 'Balance: Loading...';
        }
    }

    validateSwapInputs() {
        const fromAsset = this.container.querySelector('#fromAsset')?.value;
        const toAsset = this.container.querySelector('#toAsset')?.value;
        const fromAmount = this.container.querySelector('#fromAmount')?.value;
        const getQuoteBtn = this.container.querySelector('#getQuoteBtn');
        
        const isValid = fromAsset && toAsset && fromAmount && parseFloat(fromAmount) > 0;
        
        if (getQuoteBtn) {
            getQuoteBtn.disabled = !isValid;
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        
        const buttons = this.container.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = loading;
        });
    }

    // Standard Tab Interface Implementation

    async updateContext(wallet, network) {
        try {
            console.log('🔄 Updating Swap Tab context...');
            
            this.currentWallet = wallet;
            this.currentNetwork = network;
            
            // Re-render to show new network
            this.render();
            
            console.log('✅ Swap Tab context updated');
            
        } catch (error) {
            console.error('❌ Failed to update Swap Tab context:', error);
        }
    }

    async updateWallet(newWallet, currentNetwork) {
        await this.updateContext(newWallet, currentNetwork);
    }

    async updateNetwork(newNetwork, currentWallet) {
        await this.updateContext(currentWallet, newNetwork);
    }

    async refresh() {
        // Refresh available assets and balances
        console.log('🔄 Refreshing Swap Tab...');
    }

    async onActivated() {
        // Tab became active
        console.log('📑 Swap Tab activated');
    }

    getNetworkRequirements() {
        return ['mainnet', 'stagenet']; // Works on both networks
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
            quote: this.currentQuote,
            isLoading: this.isLoading
        };
    }

    setState(newState) {
        Object.assign(this, newState);
    }

    cleanup() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('🧹 Swap Tab cleanup completed');
    }
}