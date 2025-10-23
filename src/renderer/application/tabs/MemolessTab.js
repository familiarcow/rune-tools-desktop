/**
 * Memoless Tab Component
 * 
 * Handles memoless transaction workflow (Stagenet only).
 * Provides memo registration and reference ID generation functionality.
 */

class MemolessTab {
    constructor(container, services) {
        this.container = container;
        this.services = services;
        
        // Current context
        this.currentWallet = null;
        this.currentNetwork = 'mainnet';
        
        // Component state
        this.isLoading = false;
        
        this.isInitialized = false;
    }

    async initialize(wallet, network) {
        try {
            console.log('🚀 Initializing Memoless Tab...');
            
            this.currentWallet = wallet;
            this.currentNetwork = network;
            
            // Check network requirements
            if (!this.validateRequirements(wallet, network)) {
                this.renderNetworkError();
                return;
            }
            
            // Render initial UI
            this.render();
            
            this.isInitialized = true;
            console.log('✅ Memoless Tab initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Memoless Tab:', error);
            this.renderError('Failed to initialize memoless');
        }
    }

    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="memoless-interface">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Memoless Transactions</h2>
                        <div class="network-badge stagenet-badge">
                            <span class="network-dot stagenet"></span>
                            Stagenet Only
                        </div>
                    </div>
                    
                    <div class="memoless-intro">
                        <p>Memoless transactions allow you to send deposits without including a memo by encoding the reference ID directly in the transaction amount.</p>
                        <div class="feature-highlights">
                            <div class="feature-item">
                                <span class="feature-icon">🔒</span>
                                <div class="feature-text">
                                    <strong>Privacy Enhanced</strong>
                                    <small>No memo data visible on-chain</small>
                                </div>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">⚡</span>
                                <div class="feature-text">
                                    <strong>Simplified Flow</strong>
                                    <small>No complex memo formatting required</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="memoless-steps">
                    <div class="step-card">
                        <div class="step-header">
                            <div class="step-number">1</div>
                            <h3>Register Memo</h3>
                        </div>
                        <div class="step-content">
                            <p>First, register your memo on-chain to get a reference ID.</p>
                            <div class="form-group">
                                <label for="memoInput">Memo</label>
                                <input type="text" id="memoInput" class="form-input" 
                                       placeholder="e.g., SWAP:BTC.BTC:address">
                            </div>
                            <button class="btn btn-primary" id="registerMemoBtn" disabled>
                                Register Memo (0.02 RUNE)
                            </button>
                        </div>
                    </div>
                    
                    <div class="step-card" id="depositStep" style="display: none;">
                        <div class="step-header">
                            <div class="step-number">2</div>
                            <h3>Make Deposit</h3>
                        </div>
                        <div class="step-content">
                            <p>Send the exact amount to the inbound address. The reference ID is encoded in the amount.</p>
                            <div class="deposit-info">
                                <div class="info-item">
                                    <label>Reference ID:</label>
                                    <code id="referenceId">--</code>
                                </div>
                                <div class="info-item">
                                    <label>Encoded Amount:</label>
                                    <code id="encodedAmount">--</code>
                                </div>
                                <div class="info-item">
                                    <label>Inbound Address:</label>
                                    <code id="inboundAddress">--</code>
                                </div>
                            </div>
                            <button class="btn btn-secondary" id="copyDetailsBtn">
                                Copy Deposit Details
                            </button>
                        </div>
                    </div>
                    
                    <div class="step-card" id="trackStep" style="display: none;">
                        <div class="step-header">
                            <div class="step-number">3</div>
                            <h3>Track Transaction</h3>
                        </div>
                        <div class="step-content">
                            <p>Monitor your transaction progress after sending the deposit.</p>
                            <div class="form-group">
                                <label for="txHashInput">Transaction Hash</label>
                                <input type="text" id="txHashInput" class="form-input" 
                                       placeholder="Enter your transaction hash">
                            </div>
                            <button class="btn btn-primary" id="trackTxBtn">
                                Track Transaction
                            </button>
                            <div id="trackingResult" style="display: none;">
                                <!-- Tracking results will be displayed here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
    }

    renderNetworkError() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="network-error-state">
                <div class="error-icon">⚠️</div>
                <h3>Network Not Supported</h3>
                <p>Memoless transactions are only available on Stagenet.</p>
                <p>Please switch to Stagenet to use this feature.</p>
                <button class="btn btn-primary" onclick="window.runeToolsApp?.controllers?.settingsManager?.showSettings()">
                    Open Settings
                </button>
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
        // Memo input validation
        const memoInput = this.container.querySelector('#memoInput');
        const registerBtn = this.container.querySelector('#registerMemoBtn');
        
        if (memoInput) {
            memoInput.addEventListener('input', () => {
                const isValid = this.validateMemo(memoInput.value);
                if (registerBtn) {
                    registerBtn.disabled = !isValid;
                }
            });
        }
        
        // Register memo button
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.registerMemo());
        }
        
        // Copy details button
        const copyBtn = this.container.querySelector('#copyDetailsBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyDepositDetails());
        }
        
        // Track transaction button
        const trackBtn = this.container.querySelector('#trackTxBtn');
        if (trackBtn) {
            trackBtn.addEventListener('click', () => this.trackTransaction());
        }
    }

    validateMemo(memo) {
        if (!memo || memo.trim().length === 0) return false;
        
        // Basic memo validation - should be more comprehensive
        const validPatterns = [
            /^SWAP:/,
            /^ADD:/,
            /^WITHDRAW:/,
            /^NOOP$/
        ];
        
        return validPatterns.some(pattern => pattern.test(memo.trim()));
    }

    async registerMemo() {
        try {
            this.setLoading(true);
            
            const memoInput = this.container.querySelector('#memoInput');
            const memo = memoInput?.value.trim();
            
            if (!memo) {
                throw new Error('Please enter a valid memo');
            }
            
            // This would register the memo and get a reference ID
            this.services.ui.showToast('info', 'Memo registration coming soon...', 3000);
            
            // For demo purposes, show the deposit step
            this.showDepositStep();
            
        } catch (error) {
            console.error('Failed to register memo:', error);
            this.services.ui.showToast('error', 'Failed to register memo', 3000);
        } finally {
            this.setLoading(false);
        }
    }

    showDepositStep() {
        const depositStep = this.container.querySelector('#depositStep');
        const trackStep = this.container.querySelector('#trackStep');
        
        if (depositStep) {
            depositStep.style.display = 'block';
        }
        if (trackStep) {
            trackStep.style.display = 'block';
        }
        
        // Update deposit information (demo values)
        this.updateDepositInfo('REF123456', '1.00012345', 'thor1abcd...efgh');
    }

    updateDepositInfo(referenceId, encodedAmount, inboundAddress) {
        const elements = {
            referenceId: this.container.querySelector('#referenceId'),
            encodedAmount: this.container.querySelector('#encodedAmount'),
            inboundAddress: this.container.querySelector('#inboundAddress')
        };
        
        if (elements.referenceId) elements.referenceId.textContent = referenceId;
        if (elements.encodedAmount) elements.encodedAmount.textContent = encodedAmount;
        if (elements.inboundAddress) elements.inboundAddress.textContent = inboundAddress;
    }

    async copyDepositDetails() {
        try {
            const referenceId = this.container.querySelector('#referenceId')?.textContent;
            const encodedAmount = this.container.querySelector('#encodedAmount')?.textContent;
            const inboundAddress = this.container.querySelector('#inboundAddress')?.textContent;
            
            const details = `Reference ID: ${referenceId}\nAmount: ${encodedAmount}\nAddress: ${inboundAddress}`;
            
            const success = await this.services.utils.copyToClipboard(details);
            if (success) {
                this.services.ui.showToast('success', 'Deposit details copied to clipboard', 2000);
            } else {
                this.services.ui.showToast('error', 'Failed to copy details', 2000);
            }
            
        } catch (error) {
            console.error('Failed to copy deposit details:', error);
        }
    }

    async trackTransaction() {
        try {
            const txHashInput = this.container.querySelector('#txHashInput');
            const txHash = txHashInput?.value.trim();
            
            if (!txHash) {
                this.services.ui.showToast('warning', 'Please enter a transaction hash', 2000);
                return;
            }
            
            this.setLoading(true);
            
            // This would track the transaction
            this.services.ui.showToast('info', 'Transaction tracking coming soon...', 3000);
            
        } catch (error) {
            console.error('Failed to track transaction:', error);
            this.services.ui.showToast('error', 'Failed to track transaction', 3000);
        } finally {
            this.setLoading(false);
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
            console.log('🔄 Updating Memoless Tab context...');
            
            this.currentWallet = wallet;
            this.currentNetwork = network;
            
            // Check network requirements
            if (!this.validateRequirements(wallet, network)) {
                this.renderNetworkError();
                return;
            }
            
            // Re-render if network is valid
            this.render();
            
            console.log('✅ Memoless Tab context updated');
            
        } catch (error) {
            console.error('❌ Failed to update Memoless Tab context:', error);
        }
    }

    async updateWallet(newWallet, currentNetwork) {
        await this.updateContext(newWallet, currentNetwork);
    }

    async updateNetwork(newNetwork, currentWallet) {
        await this.updateContext(currentWallet, newNetwork);
    }

    async refresh() {
        // Refresh any cached data
        console.log('🔄 Refreshing Memoless Tab...');
    }

    async onActivated() {
        // Tab became active
        console.log('📑 Memoless Tab activated');
        
        // Remind user of network requirement
        if (this.currentNetwork !== 'stagenet') {
            this.services.ui.showToast('warning', 'Memoless is only available on Stagenet', 3000);
        }
    }

    getNetworkRequirements() {
        return ['stagenet']; // ONLY works on stagenet
    }

    validateRequirements(wallet, network) {
        return wallet && network === 'stagenet';
    }

    handleNetworkSwitch(oldNetwork, newNetwork) {
        if (newNetwork !== 'stagenet') {
            this.renderNetworkError();
        } else {
            this.render();
        }
    }

    isInitialized() {
        return this.isInitialized;
    }

    getState() {
        return {
            wallet: this.currentWallet,
            network: this.currentNetwork,
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
        
        console.log('🧹 Memoless Tab cleanup completed');
    }
}