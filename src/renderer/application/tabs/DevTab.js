/**
 * Dev Tab Component
 * 
 * Development utilities and debugging features.
 * Provides tools for testing, debugging, and development workflows.
 */

class DevTab {
    constructor(container, services) {
        this.container = container;
        this.services = services;
        
        // Current context
        this.currentWallet = null;
        this.currentNetwork = 'mainnet';
        
        // Component state
        this.isLoading = false;
        this.logs = [];
        
        this.isInitialized = false;
    }

    async initialize(wallet, network) {
        try {
            console.log('🚀 Initializing Dev Tab...');
            
            this.currentWallet = wallet;
            this.currentNetwork = network;
            
            // Render initial UI
            this.render();
            
            this.isInitialized = true;
            console.log('✅ Dev Tab initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Dev Tab:', error);
            this.renderError('Failed to initialize dev tools');
        }
    }

    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="dev-interface">
                <!-- Dev Tools Header -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Development Tools</h2>
                        <div class="dev-badge">
                            <span class="dev-icon">🛠️</span>
                            Debug Mode
                        </div>
                    </div>
                    <div class="dev-warning">
                        <p><strong>⚠️ Warning:</strong> These tools are for development and testing purposes only. Use with caution.</p>
                    </div>
                </div>

                <!-- Dev Tool Sections -->
                <div class="dev-sections">
                    <div class="section-tabs">
                        <button class="section-tab active" data-section="wallet">Wallet Tools</button>
                        <button class="section-tab" data-section="testing">Testing</button>
                        <button class="section-tab" data-section="network">Network</button>
                        <button class="section-tab" data-section="logs">Logs</button>
                        <button class="section-tab" data-section="cache">Cache</button>
                    </div>
                    
                    <div class="section-content">
                        <div id="walletSection" class="section-panel active">
                            ${this.renderWalletSection()}
                        </div>
                        <div id="testingSection" class="section-panel">
                            ${this.renderTestingSection()}
                        </div>
                        <div id="networkSection" class="section-panel">
                            ${this.renderNetworkSection()}
                        </div>
                        <div id="logsSection" class="section-panel">
                            ${this.renderLogsSection()}
                        </div>
                        <div id="cacheSection" class="section-panel">
                            ${this.renderCacheSection()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
    }

    renderWalletSection() {
        const currentAddress = this.getCurrentAddress();
        
        return `
            <div class="wallet-tools">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Wallet Information</h3>
                    </div>
                    <div class="wallet-debug-info">
                        <div class="info-group">
                            <label>Current Wallet:</label>
                            <code>${this.currentWallet?.name || 'None'}</code>
                        </div>
                        <div class="info-group">
                            <label>Wallet ID:</label>
                            <code>${this.currentWallet?.walletId || 'None'}</code>
                        </div>
                        <div class="info-group">
                            <label>Current Address:</label>
                            <code>${currentAddress}</code>
                            <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${currentAddress}')">
                                Copy
                            </button>
                        </div>
                        <div class="info-group">
                            <label>Network:</label>
                            <code>${this.currentNetwork}</code>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Wallet Generation</h3>
                    </div>
                    <div class="wallet-generation">
                        <button class="btn btn-secondary" id="generateSeedBtn">
                            Generate Test Seed
                        </button>
                        <button class="btn btn-secondary" id="generateAddressBtn">
                            Generate Test Address
                        </button>
                        <div id="generatedOutput" class="generated-output" style="display: none;">
                            <!-- Generated content will appear here -->
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Balance Testing</h3>
                    </div>
                    <div class="balance-testing">
                        <div class="form-group">
                            <label for="testAddress">Test Address:</label>
                            <input type="text" id="testAddress" class="form-input" 
                                   placeholder="thor1..." value="${currentAddress}">
                        </div>
                        <div class="test-actions">
                            <button class="btn btn-primary" id="testBalancesBtn">
                                Test Raw Balances
                            </button>
                            <button class="btn btn-primary" id="testNormalizedBtn">
                                Test Normalized Balances
                            </button>
                            <button class="btn btn-primary" id="testTradeAccountBtn">
                                Test Trade Account
                            </button>
                        </div>
                        <div id="balanceResults" class="test-results" style="display: none;">
                            <!-- Balance results will appear here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTestingSection() {
        return `
            <div class="testing-tools">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Transaction Testing</h3>
                    </div>
                    <div class="transaction-testing">
                        <div class="form-group">
                            <label for="testTxHash">Transaction Hash:</label>
                            <input type="text" id="testTxHash" class="form-input" 
                                   placeholder="Enter transaction hash to test">
                        </div>
                        <div class="test-actions">
                            <button class="btn btn-primary" id="trackTestTxBtn">
                                Track Transaction
                            </button>
                            <button class="btn btn-secondary" id="sampleTxBtn">
                                Use Sample TX
                            </button>
                        </div>
                        <div id="txResults" class="test-results" style="display: none;">
                            <!-- Transaction results will appear here -->
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">API Testing</h3>
                    </div>
                    <div class="api-testing">
                        <div class="api-endpoints">
                            <button class="btn btn-secondary" id="testNetworkBtn">
                                Test Network Info
                            </button>
                            <button class="btn btn-secondary" id="testPoolsBtn">
                                Test Pools Data
                            </button>
                            <button class="btn btn-secondary" id="testNodeInfoBtn">
                                Test Node Info
                            </button>
                            <button class="btn btn-secondary" id="testQuoteBtn">
                                Test Swap Quote
                            </button>
                        </div>
                        <div id="apiResults" class="test-results" style="display: none;">
                            <!-- API results will appear here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderNetworkSection() {
        return `
            <div class="network-tools">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Network Switching</h3>
                    </div>
                    <div class="network-switching">
                        <div class="network-options">
                            <button class="btn ${this.currentNetwork === 'mainnet' ? 'btn-primary' : 'btn-secondary'}" 
                                    id="switchMainnetBtn">
                                Switch to Mainnet
                            </button>
                            <button class="btn ${this.currentNetwork === 'stagenet' ? 'btn-primary' : 'btn-secondary'}" 
                                    id="switchStagenetBtn">
                                Switch to Stagenet
                            </button>
                        </div>
                        <div class="network-status">
                            <p>Current Network: <strong>${this.currentNetwork}</strong></p>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Network Diagnostics</h3>
                    </div>
                    <div class="network-diagnostics">
                        <button class="btn btn-secondary" id="pingNetworkBtn">
                            Ping Network
                        </button>
                        <button class="btn btn-secondary" id="testConnectionBtn">
                            Test Connection
                        </button>
                        <button class="btn btn-secondary" id="networkLatencyBtn">
                            Check Latency
                        </button>
                        <div id="diagnosticsResults" class="test-results" style="display: none;">
                            <!-- Diagnostics results will appear here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderLogsSection() {
        return `
            <div class="logs-tools">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Application Logs</h3>
                        <div class="logs-actions">
                            <button class="btn btn-secondary" id="refreshLogsBtn">
                                Refresh
                            </button>
                            <button class="btn btn-secondary" id="clearLogsBtn">
                                Clear
                            </button>
                            <button class="btn btn-secondary" id="exportLogsBtn">
                                Export
                            </button>
                        </div>
                    </div>
                    <div class="logs-container">
                        <div class="logs-filter">
                            <select class="form-select" id="logLevelFilter">
                                <option value="all">All Levels</option>
                                <option value="error">Errors</option>
                                <option value="warn">Warnings</option>
                                <option value="info">Info</option>
                                <option value="debug">Debug</option>
                            </select>
                        </div>
                        <div id="logsDisplay" class="logs-display">
                            <div class="log-entry">
                                <span class="log-time">[${new Date().toLocaleTimeString()}]</span>
                                <span class="log-level info">INFO</span>
                                <span class="log-message">Dev Tab initialized</span>
                            </div>
                            <!-- More log entries would appear here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCacheSection() {
        return `
            <div class="cache-tools">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Cache Management</h3>
                    </div>
                    <div class="cache-management">
                        <div class="cache-info">
                            <p>Manage application cache and stored data.</p>
                        </div>
                        <div class="cache-actions">
                            <button class="btn btn-secondary" id="viewCacheBtn">
                                View Cache
                            </button>
                            <button class="btn btn-warning" id="clearCacheBtn">
                                Clear Cache
                            </button>
                            <button class="btn btn-secondary" id="cacheStatsBtn">
                                Cache Statistics
                            </button>
                        </div>
                        <div id="cacheResults" class="test-results" style="display: none;">
                            <!-- Cache results will appear here -->
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">State Management</h3>
                    </div>
                    <div class="state-management">
                        <div class="state-actions">
                            <button class="btn btn-secondary" id="viewStateBtn">
                                View Application State
                            </button>
                            <button class="btn btn-secondary" id="stateSnapshotBtn">
                                Take State Snapshot
                            </button>
                            <button class="btn btn-warning" id="resetStateBtn">
                                Reset State
                            </button>
                        </div>
                        <div id="stateResults" class="test-results" style="display: none;">
                            <!-- State results will appear here -->
                        </div>
                    </div>
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
        // Section tabs
        this.container.querySelectorAll('.section-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const sectionName = e.target.dataset.section;
                this.switchSection(sectionName);
            });
        });

        // Wallet tools
        this.attachWalletEventListeners();
        
        // Testing tools
        this.attachTestingEventListeners();
        
        // Network tools
        this.attachNetworkEventListeners();
        
        // Logs tools
        this.attachLogsEventListeners();
        
        // Cache tools
        this.attachCacheEventListeners();
    }

    attachWalletEventListeners() {
        const generateSeedBtn = this.container.querySelector('#generateSeedBtn');
        const generateAddressBtn = this.container.querySelector('#generateAddressBtn');
        const testBalancesBtn = this.container.querySelector('#testBalancesBtn');
        const testNormalizedBtn = this.container.querySelector('#testNormalizedBtn');
        const testTradeAccountBtn = this.container.querySelector('#testTradeAccountBtn');

        if (generateSeedBtn) {
            generateSeedBtn.addEventListener('click', () => this.generateTestSeed());
        }
        
        if (generateAddressBtn) {
            generateAddressBtn.addEventListener('click', () => this.generateTestAddress());
        }
        
        if (testBalancesBtn) {
            testBalancesBtn.addEventListener('click', () => this.testBalances('raw'));
        }
        
        if (testNormalizedBtn) {
            testNormalizedBtn.addEventListener('click', () => this.testBalances('normalized'));
        }
        
        if (testTradeAccountBtn) {
            testTradeAccountBtn.addEventListener('click', () => this.testBalances('trade'));
        }
    }

    attachTestingEventListeners() {
        const trackTxBtn = this.container.querySelector('#trackTestTxBtn');
        const sampleTxBtn = this.container.querySelector('#sampleTxBtn');
        const apiTestButtons = [
            { id: '#testNetworkBtn', action: 'network' },
            { id: '#testPoolsBtn', action: 'pools' },
            { id: '#testNodeInfoBtn', action: 'nodeInfo' },
            { id: '#testQuoteBtn', action: 'quote' }
        ];

        if (trackTxBtn) {
            trackTxBtn.addEventListener('click', () => this.testTransactionTracking());
        }
        
        if (sampleTxBtn) {
            sampleTxBtn.addEventListener('click', () => this.useSampleTransaction());
        }

        apiTestButtons.forEach(({ id, action }) => {
            const btn = this.container.querySelector(id);
            if (btn) {
                btn.addEventListener('click', () => this.testAPI(action));
            }
        });
    }

    attachNetworkEventListeners() {
        const mainnetBtn = this.container.querySelector('#switchMainnetBtn');
        const stagenetBtn = this.container.querySelector('#switchStagenetBtn');
        const pingBtn = this.container.querySelector('#pingNetworkBtn');
        const connectionBtn = this.container.querySelector('#testConnectionBtn');
        const latencyBtn = this.container.querySelector('#networkLatencyBtn');

        if (mainnetBtn) {
            mainnetBtn.addEventListener('click', () => this.switchNetwork('mainnet'));
        }
        
        if (stagenetBtn) {
            stagenetBtn.addEventListener('click', () => this.switchNetwork('stagenet'));
        }
        
        if (pingBtn) {
            pingBtn.addEventListener('click', () => this.pingNetwork());
        }
        
        if (connectionBtn) {
            connectionBtn.addEventListener('click', () => this.testConnection());
        }
        
        if (latencyBtn) {
            latencyBtn.addEventListener('click', () => this.checkLatency());
        }
    }

    attachLogsEventListeners() {
        const refreshLogsBtn = this.container.querySelector('#refreshLogsBtn');
        const clearLogsBtn = this.container.querySelector('#clearLogsBtn');
        const exportLogsBtn = this.container.querySelector('#exportLogsBtn');

        if (refreshLogsBtn) {
            refreshLogsBtn.addEventListener('click', () => this.refreshLogs());
        }
        
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => this.clearLogs());
        }
        
        if (exportLogsBtn) {
            exportLogsBtn.addEventListener('click', () => this.exportLogs());
        }
    }

    attachCacheEventListeners() {
        const viewCacheBtn = this.container.querySelector('#viewCacheBtn');
        const clearCacheBtn = this.container.querySelector('#clearCacheBtn');
        const cacheStatsBtn = this.container.querySelector('#cacheStatsBtn');
        const viewStateBtn = this.container.querySelector('#viewStateBtn');
        const stateSnapshotBtn = this.container.querySelector('#stateSnapshotBtn');
        const resetStateBtn = this.container.querySelector('#resetStateBtn');

        if (viewCacheBtn) {
            viewCacheBtn.addEventListener('click', () => this.viewCache());
        }
        
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => this.clearCache());
        }
        
        if (cacheStatsBtn) {
            cacheStatsBtn.addEventListener('click', () => this.showCacheStats());
        }
        
        if (viewStateBtn) {
            viewStateBtn.addEventListener('click', () => this.viewApplicationState());
        }
        
        if (stateSnapshotBtn) {
            stateSnapshotBtn.addEventListener('click', () => this.takeStateSnapshot());
        }
        
        if (resetStateBtn) {
            resetStateBtn.addEventListener('click', () => this.resetApplicationState());
        }
    }

    switchSection(sectionName) {
        // Update tab appearance
        this.container.querySelectorAll('.section-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.section === sectionName) {
                tab.classList.add('active');
            }
        });

        // Update panel visibility
        this.container.querySelectorAll('.section-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        const targetPanel = this.container.querySelector(`#${sectionName}Section`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    }

    // Dev tool implementations

    async generateTestSeed() {
        try {
            const seed = await this.services.backend.generateSeedPhrase();
            this.showResult('generatedOutput', `Generated Seed: ${seed}`);
        } catch (error) {
            console.error('Failed to generate seed:', error);
            this.services.ui.showToast('error', 'Failed to generate seed', 3000);
        }
    }

    generateTestAddress() {
        // Generate a mock address for testing
        const prefix = this.currentNetwork === 'mainnet' ? 'thor' : 'sthor';
        const mockAddress = `${prefix}1${Math.random().toString(36).substring(2, 42)}`;
        this.showResult('generatedOutput', `Generated Address: ${mockAddress}`);
    }

    async testBalances(type) {
        try {
            const address = this.container.querySelector('#testAddress')?.value || this.getCurrentAddress();
            
            let result;
            switch (type) {
                case 'raw':
                    result = await this.services.backend.getBalances(address, this.currentNetwork);
                    break;
                case 'normalized':
                    result = await this.services.backend.getNormalizedBalances(address, this.currentNetwork);
                    break;
                case 'trade':
                    result = await this.services.backend.getTradeAccount(address, this.currentNetwork);
                    break;
            }
            
            this.showResult('balanceResults', JSON.stringify(result, null, 2));
            
        } catch (error) {
            console.error(`Failed to test ${type} balances:`, error);
            this.services.ui.showToast('error', `Failed to test ${type} balances`, 3000);
        }
    }

    async testAPI(apiType) {
        try {
            let result;
            
            switch (apiType) {
                case 'network':
                    result = await this.services.backend.getNetworkInfo(this.currentNetwork);
                    break;
                case 'pools':
                    result = await this.services.backend.getPools(this.currentNetwork);
                    break;
                case 'nodeInfo':
                    result = await this.services.backend.getNodeInfo(this.currentNetwork);
                    break;
                case 'quote':
                    // Mock quote test
                    result = { message: 'Quote testing coming soon...' };
                    break;
            }
            
            this.showResult('apiResults', JSON.stringify(result, null, 2));
            
        } catch (error) {
            console.error(`Failed to test ${apiType} API:`, error);
            this.services.ui.showToast('error', `Failed to test ${apiType} API`, 3000);
        }
    }

    switchNetwork(network) {
        if (window.runeToolsApp?.controllers?.settingsManager) {
            window.runeToolsApp.controllers.settingsManager.handleNetworkSwitch(network);
        }
    }

    async pingNetwork() {
        try {
            const startTime = Date.now();
            const result = await this.services.backend.ping();
            const endTime = Date.now();
            
            this.showResult('diagnosticsResults', `Ping: ${result ? 'Success' : 'Failed'} (${endTime - startTime}ms)`);
            
        } catch (error) {
            this.showResult('diagnosticsResults', `Ping failed: ${error.message}`);
        }
    }

    testConnection() {
        this.showResult('diagnosticsResults', 'Connection test: Coming soon...');
    }

    checkLatency() {
        this.showResult('diagnosticsResults', 'Latency check: Coming soon...');
    }

    viewCache() {
        const cacheData = this.services.state.getState();
        this.showResult('cacheResults', JSON.stringify(cacheData, null, 2));
    }

    async clearCache() {
        try {
            await this.services.backend.clearCache();
            this.services.ui.showToast('success', 'Cache cleared successfully', 2000);
        } catch (error) {
            console.error('Failed to clear cache:', error);
            this.services.ui.showToast('error', 'Failed to clear cache', 3000);
        }
    }

    viewApplicationState() {
        const state = this.services.state.getStateSnapshot();
        this.showResult('stateResults', JSON.stringify(state, null, 2));
    }

    showResult(containerId, content) {
        const container = this.container.querySelector(`#${containerId}`);
        if (container) {
            container.innerHTML = `<pre>${content}</pre>`;
            container.style.display = 'block';
        }
    }

    getCurrentAddress() {
        if (!this.currentWallet) return '';
        
        return this.currentNetwork === 'mainnet' 
            ? this.currentWallet.mainnetAddress
            : this.currentWallet.stagenetAddress;
    }

    // Standard Tab Interface Implementation

    async updateContext(wallet, network) {
        try {
            console.log('🔄 Updating Dev Tab context...');
            
            this.currentWallet = wallet;
            this.currentNetwork = network;
            
            // Re-render to show updated context
            this.render();
            
            console.log('✅ Dev Tab context updated');
            
        } catch (error) {
            console.error('❌ Failed to update Dev Tab context:', error);
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
        console.log('🔄 Refreshing Dev Tab...');
    }

    async onActivated() {
        // Tab became active
        console.log('📑 Dev Tab activated');
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
            logs: this.logs,
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
        
        console.log('🧹 Dev Tab cleanup completed');
    }
}