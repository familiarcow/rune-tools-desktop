/**
 * Wallet Selection Controller
 * 
 * Handles wallet selection at application startup (before main app loads).
 * Manages wallet detection, selection, authentication, and first-time setup.
 */

class WalletSelectionController {
    constructor(container, services) {
        this.container = container;
        this.services = services;
        this.availableWallets = [];
        this.callbacks = {
            onWalletUnlocked: null,
            onError: null
        };
        
        // Current state
        this.currentStep = 'detecting'; // 'detecting' | 'selection' | 'authentication' | 'first-time'
        this.selectedWallet = null;
        
        this.isInitialized = false;
    }

    async initialize(availableWallets = []) {
        try {
            this.availableWallets = availableWallets;
            
            // Determine initial flow
            await this.detectWalletsAndSession();
            
            this.isInitialized = true;
            console.log('✅ Wallet Selection Controller initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize wallet selection:', error);
            this.handleError(error);
        }
    }

    async detectWalletsAndSession() {
        try {
            console.log('🔍 Detecting wallets and session...');
            
            // Check for active session first
            const activeSession = await this.services.backend.getActiveSession();
            if (activeSession && activeSession.wallet) {
                console.log('📱 Active session found, auto-resuming...');
                this.handleWalletUnlocked(activeSession.wallet, activeSession.network);
                return;
            }
            
            // No active session, check for available wallets
            if (this.availableWallets.length === 0) {
                this.showFirstTimeSetup();
            } else if (this.availableWallets.length === 1) {
                // Single wallet available
                this.showWalletAuthentication(this.availableWallets[0]);
            } else {
                // Multiple wallets available
                this.showWalletSelection(this.availableWallets);
            }
            
        } catch (error) {
            console.error('❌ Failed to detect wallets and session:', error);
            this.showFirstTimeSetup(); // Fallback to first-time setup
        }
    }

    showWalletSelection(wallets) {
        this.currentStep = 'selection';
        this.render();
        
        console.log('👥 Showing wallet selection for', wallets.length, 'wallets');
    }

    showWalletAuthentication(wallet) {
        this.currentStep = 'authentication';
        this.selectedWallet = wallet;
        this.render();
        
        console.log('🔐 Showing authentication for wallet:', wallet.name);
    }

    showFirstTimeSetup() {
        this.currentStep = 'first-time';
        this.render();
        
        console.log('👋 Showing first-time setup');
    }

    render() {
        if (!this.container) return;
        
        let content = '';
        
        switch (this.currentStep) {
            case 'detecting':
                content = this.renderDetecting();
                break;
            case 'selection':
                content = this.renderWalletSelection();
                break;
            case 'authentication':
                content = this.renderAuthentication();
                break;
            case 'first-time':
                content = this.renderFirstTimeSetup();
                break;
            default:
                content = this.renderError('Unknown step');
        }
        
        this.container.innerHTML = content;
        this.attachEventListeners();
    }

    renderDetecting() {
        return `
            <div class="wallet-selection-screen">
                <div class="brand-header">
                    <div class="brand-logo">⚡</div>
                    <h1>Rune Tools</h1>
                    <p>THORChain Desktop Wallet</p>
                </div>
                
                <div class="loading-section">
                    <div class="loading-spinner"></div>
                    <p>Detecting wallets...</p>
                </div>
            </div>
        `;
    }

    renderWalletSelection() {
        const walletsHtml = this.availableWallets.map(wallet => `
            <div class="wallet-item" data-wallet-id="${wallet.walletId}">
                <div class="wallet-icon">${wallet.name.charAt(0).toUpperCase()}</div>
                <div class="wallet-details">
                    <div class="wallet-name">${wallet.name}</div>
                    <div class="wallet-address">${this.services.utils.formatAddress(wallet.mainnetAddress)}</div>
                    ${wallet.lastUsed ? `<div class="wallet-last-used">Last used: ${new Date(wallet.lastUsed).toLocaleDateString()}</div>` : ''}
                </div>
                <div class="wallet-actions">
                    <button class="btn btn-primary select-wallet-btn" data-wallet-id="${wallet.walletId}">
                        Select
                    </button>
                </div>
            </div>
        `).join('');

        return `
            <div class="wallet-selection-screen">
                <div class="brand-header">
                    <div class="brand-logo">⚡</div>
                    <h1>Welcome Back</h1>
                    <p>Choose a wallet to continue</p>
                </div>
                
                <div class="wallet-list">
                    ${walletsHtml}
                </div>
                
                <div class="wallet-actions">
                    <button class="btn btn-secondary" id="createNewWalletBtn">
                        Create New Wallet
                    </button>
                    <button class="btn btn-secondary" id="importWalletBtn">
                        Import Wallet
                    </button>
                </div>
            </div>
        `;
    }

    renderAuthentication() {
        if (!this.selectedWallet) {
            return this.renderError('No wallet selected');
        }

        return `
            <div class="wallet-selection-screen">
                <div class="brand-header">
                    <div class="brand-logo">⚡</div>
                    <h1>Unlock Wallet</h1>
                    <p>Enter your password to continue</p>
                </div>
                
                <div class="wallet-auth-card">
                    <div class="wallet-display">
                        <div class="wallet-icon">${this.selectedWallet.name.charAt(0).toUpperCase()}</div>
                        <div class="wallet-info">
                            <div class="wallet-name">${this.selectedWallet.name}</div>
                            <div class="wallet-address">${this.services.utils.formatAddress(this.selectedWallet.mainnetAddress)}</div>
                        </div>
                    </div>
                    
                    <form id="authForm" class="auth-form">
                        <div class="form-group">
                            <label for="walletPassword" class="form-label">Password</label>
                            <input type="password" id="walletPassword" class="form-input" 
                                   placeholder="Enter wallet password" required autocomplete="current-password">
                        </div>
                        
                        <div class="auth-actions">
                            <button type="button" class="btn btn-secondary" id="backToSelectionBtn">
                                Back
                            </button>
                            <button type="submit" class="btn btn-primary" id="unlockWalletBtn">
                                Unlock Wallet
                            </button>
                        </div>
                    </form>
                    
                    <div id="authError" class="error-message" style="display: none;"></div>
                </div>
            </div>
        `;
    }

    renderFirstTimeSetup() {
        return `
            <div class="wallet-selection-screen">
                <div class="brand-header">
                    <div class="brand-logo">⚡</div>
                    <h1>Welcome to Rune Tools</h1>
                    <p>Let's get you started with THORChain</p>
                </div>
                
                <div class="first-time-options">
                    <div class="setup-option" data-option="create">
                        <div class="option-icon">🆕</div>
                        <h3>Create New Wallet</h3>
                        <p>Generate a new wallet with a secure seed phrase</p>
                        <button class="btn btn-primary" id="createWalletBtn">
                            Create Wallet
                        </button>
                    </div>
                    
                    <div class="setup-option" data-option="import">
                        <div class="option-icon">📥</div>
                        <h3>Import Existing Wallet</h3>
                        <p>Import a wallet using your seed phrase</p>
                        <button class="btn btn-primary" id="importExistingBtn">
                            Import Wallet
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderError(message) {
        return `
            <div class="wallet-selection-screen">
                <div class="brand-header">
                    <div class="brand-logo">⚡</div>
                    <h1>Error</h1>
                </div>
                
                <div class="error-section">
                    <div class="error-message">
                        <p>${message}</p>
                    </div>
                    <button class="btn btn-primary" onclick="location.reload()">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Wallet selection handlers
        this.container.querySelectorAll('.select-wallet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const walletId = e.target.dataset.walletId;
                const wallet = this.availableWallets.find(w => w.walletId === walletId);
                if (wallet) {
                    this.selectWallet(wallet);
                }
            });
        });

        // Authentication form
        const authForm = this.container.querySelector('#authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuthentication();
            });
        }

        // Navigation buttons
        const backBtn = this.container.querySelector('#backToSelectionBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.showWalletSelection(this.availableWallets);
            });
        }

        // First-time setup buttons
        const createBtn = this.container.querySelector('#createWalletBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.startWalletCreation();
            });
        }

        const importBtn = this.container.querySelector('#importExistingBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.startWalletImport();
            });
        }

        // Create new wallet from selection screen
        const createNewBtn = this.container.querySelector('#createNewWalletBtn');
        if (createNewBtn) {
            createNewBtn.addEventListener('click', () => {
                this.startWalletCreation();
            });
        }

        const importExistingBtn = this.container.querySelector('#importWalletBtn');
        if (importExistingBtn) {
            importExistingBtn.addEventListener('click', () => {
                this.startWalletImport();
            });
        }
    }

    selectWallet(wallet) {
        this.selectedWallet = wallet;
        
        // If wallet has no password, unlock immediately
        if (!wallet.hasPassword) {
            this.authenticateWallet(wallet, null);
        } else {
            this.showWalletAuthentication(wallet);
        }
    }

    async handleAuthentication() {
        if (!this.selectedWallet) return;

        const passwordInput = this.container.querySelector('#walletPassword');
        const password = passwordInput ? passwordInput.value : '';
        const errorDiv = this.container.querySelector('#authError');

        try {
            // Hide any previous errors
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }

            // Show loading state
            const unlockBtn = this.container.querySelector('#unlockWalletBtn');
            if (unlockBtn) {
                this.services.ui.showElementLoading(unlockBtn, 'Unlocking...');
            }

            await this.authenticateWallet(this.selectedWallet, password);

        } catch (error) {
            console.error('Authentication failed:', error);
            
            // Show error message
            if (errorDiv) {
                errorDiv.textContent = error.message || 'Authentication failed';
                errorDiv.style.display = 'block';
            }

            // Hide loading state
            const unlockBtn = this.container.querySelector('#unlockWalletBtn');
            if (unlockBtn) {
                this.services.ui.hideElementLoading(unlockBtn);
            }
        }
    }

    async authenticateWallet(wallet, password) {
        try {
            // Unlock wallet through backend service
            const unlockedWallet = await this.services.backend.unlockWallet(wallet.walletId, password);
            
            console.log('🔓 Wallet unlocked successfully:', wallet.name);
            
            // Trigger success callback
            this.handleWalletUnlocked(unlockedWallet, 'mainnet');
            
        } catch (error) {
            console.error('❌ Failed to authenticate wallet:', error);
            throw error;
        }
    }

    startWalletCreation() {
        console.log('🆕 Starting wallet creation flow...');
        // This would initialize a wallet creation component
        // For now, show a placeholder
        this.services.ui.showToast('info', 'Wallet creation flow coming soon...', 3000);
    }

    startWalletImport() {
        console.log('📥 Starting wallet import flow...');
        // This would initialize a wallet import component
        // For now, show a placeholder
        this.services.ui.showToast('info', 'Wallet import flow coming soon...', 3000);
    }

    handleWalletUnlocked(wallet, network = 'mainnet') {
        if (this.callbacks.onWalletUnlocked) {
            this.callbacks.onWalletUnlocked(wallet, network);
        }
    }

    handleError(error, context = 'Wallet Selection Error') {
        console.error(`❌ ${context}:`, error);
        
        if (this.callbacks.onError) {
            this.callbacks.onError(error);
        }
    }

    // Event handler registration
    onWalletUnlocked(callback) {
        this.callbacks.onWalletUnlocked = callback;
    }

    onError(callback) {
        this.callbacks.onError = callback;
    }

    cleanup() {
        this.callbacks.onWalletUnlocked = null;
        this.callbacks.onError = null;
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('🧹 Wallet Selection Controller cleanup completed');
    }
}