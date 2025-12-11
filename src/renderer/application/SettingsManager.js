/**
 * Settings Manager
 * 
 * Handles all application settings including wallet switching, network management,
 * and application preferences. This is the centralized settings interface.
 */

class SettingsManager {
    constructor(container, services) {
        this.container = container;
        this.services = services;
        
        // Current context
        this.currentWallet = null;
        this.currentNetwork = 'mainnet';
        this.availableWallets = [];
        
        // Settings state
        this.isOpen = false;
        this.activeSection = 'wallet';
        
        // DOM references
        this.elements = {
            closeBtn: null,
            settingsBody: null,
            sections: {}
        };
        
        // Callbacks
        this.callbacks = {
            onWalletSwitch: null,
            onNetworkSwitch: null,
            onWalletDeleted: null,
            onSettingsUpdated: null,
            onClose: null
        };
        
        this.isInitialized = false;
    }

    async initialize(wallet, network, availableWallets) {
        try {
            console.log('🚀 Initializing Settings Manager...');
            
            this.currentWallet = wallet;
            this.currentNetwork = network;
            this.availableWallets = availableWallets;
            
            // Get DOM references
            this.getDOMReferences();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Render settings content
            await this.render();
            
            this.isInitialized = true;
            console.log('✅ Settings Manager initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Settings Manager:', error);
            throw error;
        }
    }

    getDOMReferences() {
        this.elements.closeBtn = this.container.querySelector('#settingsCloseBtn');
        this.elements.settingsBody = this.container.querySelector('#settingsBody');
        
        if (!this.elements.settingsBody) {
            throw new Error('Settings body element not found');
        }
    }

    setupEventListeners() {
        // Close button
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => {
                this.hideSettings();
            });
        }
        
        // Click outside to close
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                this.hideSettings();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.hideSettings();
            }
        });
    }

    async render() {
        if (!this.elements.settingsBody) return;
        
        this.elements.settingsBody.innerHTML = `
            ${this.renderActiveWalletSection()}
            ${this.renderNetworkSection()}
            ${this.renderWalletManagementSection()}
            ${await this.renderApplicationSection()}
        `;
        
        // Attach section event listeners
        this.attachSectionEventListeners();
    }

    renderActiveWalletSection() {
        const currentWalletHtml = this.currentWallet ? `
            <div class="current-wallet-display">
                <div class="wallet-icon">${this.currentWallet.name.charAt(0).toUpperCase()}</div>
                <div class="wallet-details">
                    <div class="wallet-name">${this.currentWallet.name}</div>
                    <div class="wallet-address">${this.services.utils.formatAddress(this.getNetworkAddress())}</div>
                </div>
            </div>
        ` : '<p>No wallet loaded</p>';

        const availableWalletsHtml = this.availableWallets
            .filter(wallet => wallet.walletId !== this.currentWallet?.walletId)
            .map(wallet => `
                <div class="wallet-switch-item" data-wallet-id="${wallet.walletId}">
                    <div class="wallet-icon">${wallet.name.charAt(0).toUpperCase()}</div>
                    <div class="wallet-details">
                        <div class="wallet-name">${wallet.name}</div>
                        <div class="wallet-address">${this.services.utils.formatAddress(wallet.mainnetAddress)}</div>
                    </div>
                    <button class="btn btn-secondary switch-wallet-btn" data-wallet-id="${wallet.walletId}">
                        Switch
                    </button>
                </div>
            `).join('');

        return `
            <section class="settings-section">
                <h3>📱 Active Wallet</h3>
                ${currentWalletHtml}
                
                ${this.availableWallets.length > 1 ? `
                    <div class="wallet-switch-section">
                        <h4>Switch to Different Wallet</h4>
                        <div class="wallet-switch-list">
                            ${availableWalletsHtml}
                        </div>
                    </div>
                ` : ''}
                
                <div class="wallet-actions">
                    <button class="btn btn-secondary" id="createWalletBtn">
                        Create New Wallet
                    </button>
                    <button class="btn btn-secondary" id="importWalletBtn">
                        Import Wallet
                    </button>
                </div>
            </section>
        `;
    }

    renderNetworkSection() {
        const networkInfo = {
            mainnet: { name: 'Mainnet', status: 'Connected', color: '#51cf66' },
            stagenet: { name: 'Stagenet', status: 'Connected', color: '#ffa726' }
        };

        return `
            <section class="settings-section">
                <h3>🌐 Network</h3>
                <div class="network-switch-container">
                    <div class="network-options">
                        <div class="network-option ${this.currentNetwork === 'mainnet' ? 'active' : ''}" 
                             data-network="mainnet">
                            <div class="network-indicator">
                                <span class="network-dot" style="background-color: ${networkInfo.mainnet.color}"></span>
                                <div class="network-info">
                                    <div class="network-name">${networkInfo.mainnet.name}</div>
                                    <div class="network-status">${networkInfo.mainnet.status}</div>
                                </div>
                            </div>
                            ${this.currentNetwork === 'mainnet' ? '<span class="network-check">✓</span>' : ''}
                        </div>
                        
                        <div class="network-option ${this.currentNetwork === 'stagenet' ? 'active' : ''}" 
                             data-network="stagenet">
                            <div class="network-indicator">
                                <span class="network-dot" style="background-color: ${networkInfo.stagenet.color}"></span>
                                <div class="network-info">
                                    <div class="network-name">${networkInfo.stagenet.name}</div>
                                    <div class="network-status">${networkInfo.stagenet.status}</div>
                                </div>
                            </div>
                            ${this.currentNetwork === 'stagenet' ? '<span class="network-check">✓</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="network-info-section">
                        <p><strong>Current Network:</strong> ${networkInfo[this.currentNetwork].name}</p>
                        <small>Switching networks will update all tabs and refresh balances.</small>
                    </div>
                </div>
            </section>
        `;
    }

    renderWalletManagementSection() {
        const walletsHtml = this.availableWallets.map(wallet => `
            <div class="wallet-management-item">
                <div class="wallet-icon">${wallet.name.charAt(0).toUpperCase()}</div>
                <div class="wallet-details">
                    <div class="wallet-name">${wallet.name}</div>
                    <div class="wallet-address">${this.services.utils.formatAddress(wallet.mainnetAddress)}</div>
                    <div class="wallet-meta">
                        ${wallet.lastUsed ? `Last used: ${new Date(wallet.lastUsed).toLocaleDateString()}` : 'Never used'}
                    </div>
                </div>
                <div class="wallet-actions">
                    <button class="btn btn-secondary export-wallet-btn" data-wallet-id="${wallet.walletId}">
                        Export
                    </button>
                    ${wallet.walletId !== this.currentWallet?.walletId ? `
                        <button class="btn btn-error delete-wallet-btn" data-wallet-id="${wallet.walletId}">
                            Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        return `
            <section class="settings-section">
                <h3>🗑️ Wallet Management</h3>
                <div class="wallet-management-list">
                    ${walletsHtml}
                </div>
                
                <div class="management-actions">
                    <button class="btn btn-secondary" id="backupAllBtn">
                        Backup All Wallets
                    </button>
                    <button class="btn btn-secondary" id="securitySettingsBtn">
                        Security Settings
                    </button>
                </div>
            </section>
        `;
    }

    async renderApplicationSection() {
        const currentSettings = this.services.state.getState('settings') || {};
        
        // Fetch app version dynamically
        let appVersion = 'v0.0.0';
        try {
            const version = await window.electronAPI.invoke('get-app-version');
            appVersion = version ? `v${version}` : 'v0.0.0';
        } catch (error) {
            console.error('Failed to get app version:', error);
        }
        
        return `
            <section class="settings-section">
                <h3>⚙️ Application</h3>
                <div class="app-settings">
                    <div class="setting-item">
                        <label for="themeSelect">Theme</label>
                        <select id="themeSelect" class="form-select">
                            <option value="dark" ${currentSettings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="light" ${currentSettings.theme === 'light' ? 'selected' : ''}>Light</option>
                        </select>
                    </div>
                    
                    <div class="setting-item">
                        <label for="currencySelect">Display Currency</label>
                        <select id="currencySelect" class="form-select">
                            <option value="USD" ${currentSettings.currency === 'USD' ? 'selected' : ''}>USD</option>
                            <option value="EUR" ${currentSettings.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                        </select>
                    </div>
                    
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="autoRefreshCheck" 
                                   ${currentSettings.autoRefresh ? 'checked' : ''}>
                            Auto-refresh balances
                        </label>
                    </div>
                    
                    <div class="setting-item">
                        <label for="refreshIntervalSelect">Refresh Interval</label>
                        <select id="refreshIntervalSelect" class="form-select">
                            <option value="15000" ${currentSettings.refreshInterval === 15000 ? 'selected' : ''}>15 seconds</option>
                            <option value="30000" ${currentSettings.refreshInterval === 30000 ? 'selected' : ''}>30 seconds</option>
                            <option value="60000" ${currentSettings.refreshInterval === 60000 ? 'selected' : ''}>1 minute</option>
                        </select>
                    </div>
                </div>
                
                <div class="app-info">
                    <p><strong>Application Version:</strong> ${appVersion} <strong>Updates & Releases:</strong> <a href="#" onclick="window.electronAPI.invoke('open-external', 'https://github.com/familiarcow/rune-tools-desktop/releases'); return false;">🔗 View Releases</a></p>
                    <button class="btn btn-secondary" id="exportLogsBtn">Export Logs</button>
                    <button class="btn btn-secondary" id="resetSettingsBtn">Reset Settings</button>
                    <p class="developer-credit">
                        Developed by <a href="#" onclick="window.electronAPI.invoke('open-external', 'https://x.com/familiarcow'); return false;">FamiliarCow</a> under MIT License
                    </p>
                </div>
            </section>
        `;
    }

    attachSectionEventListeners() {
        // Wallet switching
        this.container.querySelectorAll('.switch-wallet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const walletId = e.target.dataset.walletId;
                this.handleWalletSwitch(walletId);
            });
        });

        // Network switching
        const networkSelector = this.container.querySelector('#network-selector');
        if (networkSelector) {
            // Set the current network value
            networkSelector.value = this.currentNetwork;
            
            networkSelector.addEventListener('change', (e) => {
                const network = e.target.value;
                if (network !== this.currentNetwork) {
                    this.handleNetworkSwitch(network);
                }
            });
        }

        // Wallet management
        this.container.querySelectorAll('.delete-wallet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const walletId = e.target.dataset.walletId;
                this.handleWalletDelete(walletId);
            });
        });

        this.container.querySelectorAll('.export-wallet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const walletId = e.target.dataset.walletId;
                this.handleWalletExport(walletId);
            });
        });

        // Application settings
        const settingElements = {
            theme: this.container.querySelector('#themeSelect'),
            currency: this.container.querySelector('#currencySelect'),
            autoRefresh: this.container.querySelector('#autoRefreshCheck'),
            refreshInterval: this.container.querySelector('#refreshIntervalSelect')
        };

        Object.entries(settingElements).forEach(([key, element]) => {
            if (element) {
                element.addEventListener('change', () => {
                    this.handleSettingChange(key, element);
                });
            }
        });

        // Action buttons
        const actionButtons = {
            createWallet: this.container.querySelector('#createWalletBtn'),
            importWallet: this.container.querySelector('#importWalletBtn'),
            exportLogs: this.container.querySelector('#exportLogsBtn'),
            resetSettings: this.container.querySelector('#resetSettingsBtn')
        };

        Object.entries(actionButtons).forEach(([action, button]) => {
            if (button) {
                button.addEventListener('click', () => {
                    this.handleAction(action);
                });
            }
        });
    }

    async handleWalletSwitch(walletId) {
        try {
            const wallet = this.availableWallets.find(w => w.walletId === walletId);
            if (!wallet) {
                throw new Error('Wallet not found');
            }

            console.log('👤 Switching wallet:', wallet.name);

            // Show authentication modal if wallet has password
            if (wallet.hasPassword) {
                await this.showWalletAuthModal(wallet);
            } else {
                await this.completeWalletSwitch(wallet);
            }

        } catch (error) {
            console.error('❌ Failed to switch wallet:', error);
            this.services.ui.showToast('error', 'Failed to switch wallet', 3000);
        }
    }

    async showWalletAuthModal(wallet) {
        const authModal = document.getElementById('walletAuthModal');
        if (!authModal) return;

        // Update modal content
        const walletName = authModal.querySelector('#authWalletName');
        const walletAddress = authModal.querySelector('#authWalletAddress');
        const passwordInput = authModal.querySelector('#authPassword');

        if (walletName) walletName.textContent = wallet.name;
        if (walletAddress) walletAddress.textContent = this.services.utils.formatAddress(wallet.mainnetAddress);
        if (passwordInput) passwordInput.value = '';

        // Show modal
        authModal.style.display = 'flex';

        // Handle auth submission
        const handleAuth = async (e) => {
            e.preventDefault();
            
            try {
                const password = passwordInput ? passwordInput.value : '';
                await this.authenticateAndSwitchWallet(wallet, password);
                authModal.style.display = 'none';
            } catch (error) {
                this.services.ui.showToast('error', 'Authentication failed', 3000);
            }
        };

        // Handle auth cancellation
        const handleCancel = () => {
            authModal.style.display = 'none';
        };

        // Attach event listeners
        const unlockBtn = authModal.querySelector('#authUnlockBtn');
        const cancelBtn = authModal.querySelector('#authCancelBtn');
        const closeBtn = authModal.querySelector('.modal-close');

        if (unlockBtn) {
            unlockBtn.onclick = handleAuth;
        }

        if (cancelBtn) {
            cancelBtn.onclick = handleCancel;
        }

        if (closeBtn) {
            closeBtn.onclick = handleCancel;
        }
    }

    async authenticateAndSwitchWallet(wallet, password) {
        try {
            // Authenticate wallet through backend
            const unlockedWallet = await this.services.backend.unlockWallet(wallet.walletId, password);
            
            // Complete the switch
            await this.completeWalletSwitch(unlockedWallet);
            
        } catch (error) {
            console.error('❌ Wallet authentication failed:', error);
            throw error;
        }
    }

    async completeWalletSwitch(wallet) {
        try {
            // Trigger wallet switch callback
            if (this.callbacks.onWalletSwitch) {
                await this.callbacks.onWalletSwitch(wallet, this.currentNetwork);
            }

            // Update local state
            this.currentWallet = wallet;

            // Re-render settings to update display
            await this.render();

            this.services.ui.showToast('success', `Switched to ${wallet.name}`, 2000);

        } catch (error) {
            console.error('❌ Failed to complete wallet switch:', error);
            throw error;
        }
    }

    async handleNetworkSwitch(network) {
        try {
            console.log(`🌐 Switching network: ${this.currentNetwork} → ${network}`);

            // Trigger network switch callback
            if (this.callbacks.onNetworkSwitch) {
                await this.callbacks.onNetworkSwitch(network);
            }

            // Update local state
            this.currentNetwork = network;

            // Re-render settings to update display
            await this.render();

            const networkInfo = this.services.utils.getNetworkInfo(network);
            this.services.ui.showToast('success', `Switched to ${networkInfo.name}`, 2000);

        } catch (error) {
            console.error('❌ Failed to switch network:', error);
            this.services.ui.showToast('error', 'Failed to switch network', 3000);
        }
    }

    async handleWalletDelete(walletId) {
        try {
            const wallet = this.availableWallets.find(w => w.walletId === walletId);
            if (!wallet) return;

            const confirmed = await this.services.ui.confirm(
                `Are you sure you want to delete "${wallet.name}"? This action cannot be undone.`,
                'Delete Wallet'
            );

            if (confirmed) {
                // Trigger delete callback
                if (this.callbacks.onWalletDeleted) {
                    await this.callbacks.onWalletDeleted(walletId);
                }

                // Update local state
                this.availableWallets = this.availableWallets.filter(w => w.walletId !== walletId);

                // Re-render settings
                await this.render();

                this.services.ui.showToast('success', `Wallet "${wallet.name}" deleted`, 3000);
            }

        } catch (error) {
            console.error('❌ Failed to delete wallet:', error);
            this.services.ui.showToast('error', 'Failed to delete wallet', 3000);
        }
    }

    async handleWalletExport(walletId) {
        try {
            const wallet = this.availableWallets.find(w => w.walletId === walletId);
            if (!wallet) return;

            // This would trigger wallet export functionality
            this.services.ui.showToast('info', 'Wallet export coming soon...', 3000);

        } catch (error) {
            console.error('❌ Failed to export wallet:', error);
            this.services.ui.showToast('error', 'Failed to export wallet', 3000);
        }
    }

    handleSettingChange(key, element) {
        try {
            let value;
            
            if (element.type === 'checkbox') {
                value = element.checked;
            } else if (element.type === 'number') {
                value = parseInt(element.value);
            } else {
                value = element.value;
            }

            // Update settings
            this.services.state.updateSettings({ [key]: value });

            // Apply setting immediately
            this.applySettingChange(key, value);

            // Trigger callback
            if (this.callbacks.onSettingsUpdated) {
                this.callbacks.onSettingsUpdated({ [key]: value });
            }

        } catch (error) {
            console.error('❌ Failed to update setting:', error);
        }
    }

    applySettingChange(key, value) {
        switch (key) {
            case 'theme':
                this.services.ui.setTheme(value);
                break;
            case 'currency':
                // Currency change would affect display formatting
                break;
            case 'autoRefresh':
                // Start/stop auto-refresh
                break;
            case 'refreshInterval':
                // Update refresh interval
                break;
        }
    }

    async handleAction(action) {
        try {
            switch (action) {
                case 'createWallet':
                    this.services.ui.showToast('info', 'Create wallet flow coming soon...', 3000);
                    break;
                case 'importWallet':
                    this.services.ui.showToast('info', 'Import wallet flow coming soon...', 3000);
                    break;
                case 'exportLogs':
                    await this.services.backend.exportLogs();
                    this.services.ui.showToast('success', 'Logs exported successfully', 3000);
                    break;
                case 'resetSettings':
                    const confirmed = await this.services.ui.confirm(
                        'Are you sure you want to reset all settings to defaults?',
                        'Reset Settings'
                    );
                    if (confirmed) {
                        this.resetSettings();
                    }
                    break;
            }
        } catch (error) {
            console.error(`❌ Failed to handle action ${action}:`, error);
            this.services.ui.showToast('error', `Failed to ${action}`, 3000);
        }
    }

    resetSettings() {
        // Reset to default settings
        const defaultSettings = {
            theme: 'dark',
            currency: 'USD',
            autoRefresh: true,
            refreshInterval: 30000
        };

        this.services.state.updateSettings(defaultSettings);
        this.render(); // Re-render to update UI
        
        this.services.ui.showToast('success', 'Settings reset to defaults', 3000);
    }

    // Public methods
    async showSettings() {
        this.isOpen = true;
        this.container.style.display = 'block';
        this.container.classList.add('open');
        
        // Re-render with latest data
        await this.render();
    }

    async hideSettings() {
        this.isOpen = false;
        this.container.classList.remove('open');
        
        setTimeout(() => {
            this.container.style.display = 'none';
        }, 300); // Match CSS transition

        if (this.callbacks.onClose) {
            this.callbacks.onClose();
        }
    }

    async updateWalletStatus(wallet) {
        this.currentWallet = wallet;
        await this.render();
    }

    async updateNetworkStatus(network) {
        this.currentNetwork = network;
        await this.render();
    }

    getNetworkAddress() {
        if (!this.currentWallet) return '';
        
        return this.currentNetwork === 'mainnet' 
            ? this.currentWallet.mainnetAddress
            : this.currentWallet.stagenetAddress;
    }

    // Event handler registration
    onWalletSwitch(callback) {
        this.callbacks.onWalletSwitch = callback;
    }

    onNetworkSwitch(callback) {
        this.callbacks.onNetworkSwitch = callback;
    }

    onWalletDeleted(callback) {
        this.callbacks.onWalletDeleted = callback;
    }

    onSettingsUpdated(callback) {
        this.callbacks.onSettingsUpdated = callback;
    }

    onClose(callback) {
        this.callbacks.onClose = callback;
    }

    // Cleanup
    cleanup() {
        // Clear callbacks
        Object.keys(this.callbacks).forEach(key => {
            this.callbacks[key] = null;
        });

        console.log('🧹 Settings Manager cleanup completed');
    }

    // Status check
    isReady() {
        return this.isInitialized;
    }
}