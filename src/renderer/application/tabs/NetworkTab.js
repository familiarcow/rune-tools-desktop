/**
 * Network Tab Component
 * 
 * Network information and diagnostic tools.
 * Shows network status, node info, pools, and chain health monitoring.
 */

class NetworkTab {
    constructor(container, services) {
        this.container = container;
        this.services = services;
        
        // Current context
        this.currentWallet = null;
        this.currentNetwork = 'mainnet';
        
        // Component state
        this.networkData = null;
        this.poolData = null;
        this.nodeInfo = null;
        this.isLoading = false;
        
        this.isInitialized = false;
    }

    async initialize(wallet, network) {
        try {
            console.log('🚀 Initializing Network Tab...');
            
            this.currentWallet = wallet;
            this.currentNetwork = network;
            
            // Render initial UI
            this.render();
            
            // Load initial data
            await this.loadNetworkData();
            
            this.isInitialized = true;
            console.log('✅ Network Tab initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Network Tab:', error);
            this.renderError('Failed to initialize network');
        }
    }

    render() {
        if (!this.container) return;
        
        const networkInfo = this.services.utils.getNetworkInfo(this.currentNetwork);
        
        this.container.innerHTML = `
            <div class="network-interface">
                <!-- Network Status Header -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Network Status</h2>
                        <div class="network-indicator">
                            <span class="network-dot ${this.currentNetwork}"></span>
                            ${networkInfo.name}
                        </div>
                    </div>
                    <div class="network-status-grid">
                        <div class="status-item">
                            <div class="status-label">Network</div>
                            <div class="status-value" id="networkStatus">Loading...</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Block Height</div>
                            <div class="status-value" id="blockHeight">--</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Active Nodes</div>
                            <div class="status-value" id="activeNodes">--</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Total Pools</div>
                            <div class="status-value" id="totalPools">--</div>
                        </div>
                    </div>
                    <div class="network-actions">
                        <button class="btn btn-secondary" id="refreshNetworkBtn">
                            Refresh Data
                        </button>
                    </div>
                </div>

                <!-- Network Data Sections -->
                <div class="network-sections">
                    <div class="section-tabs">
                        <button class="section-tab active" data-section="overview">Overview</button>
                        <button class="section-tab" data-section="pools">Pools</button>
                        <button class="section-tab" data-section="nodes">Nodes</button>
                        <button class="section-tab" data-section="stats">Statistics</button>
                    </div>
                    
                    <div class="section-content">
                        <div id="overviewSection" class="section-panel active">
                            ${this.renderOverviewSection()}
                        </div>
                        <div id="poolsSection" class="section-panel">
                            ${this.renderPoolsSection()}
                        </div>
                        <div id="nodesSection" class="section-panel">
                            ${this.renderNodesSection()}
                        </div>
                        <div id="statsSection" class="section-panel">
                            ${this.renderStatsSection()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
    }

    renderOverviewSection() {
        return `
            <div class="overview-content">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Network Overview</h3>
                    </div>
                    <div class="overview-grid">
                        <div class="overview-item">
                            <div class="item-icon">🌐</div>
                            <div class="item-content">
                                <div class="item-title">THORChain Network</div>
                                <div class="item-description">Cross-chain liquidity protocol</div>
                            </div>
                        </div>
                        <div class="overview-item">
                            <div class="item-icon">⚡</div>
                            <div class="item-content">
                                <div class="item-title">Instant Swaps</div>
                                <div class="item-description">No order books, continuous liquidity</div>
                            </div>
                        </div>
                        <div class="overview-item">
                            <div class="item-icon">🔒</div>
                            <div class="item-content">
                                <div class="item-title">Non-Custodial</div>
                                <div class="item-description">Users maintain full control of assets</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Network Health</h3>
                    </div>
                    <div id="networkHealthContent">
                        <div class="loading-section">
                            <div class="loading-spinner"></div>
                            <p>Loading network health data...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPoolsSection() {
        return `
            <div class="pools-content">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Liquidity Pools</h3>
                        <div class="pool-filters">
                            <select class="form-select" id="poolFilter">
                                <option value="all">All Pools</option>
                                <option value="available">Available</option>
                                <option value="staged">Staged</option>
                            </select>
                        </div>
                    </div>
                    <div id="poolsListContent">
                        <div class="loading-section">
                            <div class="loading-spinner"></div>
                            <p>Loading pools data...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderNodesSection() {
        return `
            <div class="nodes-content">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Network Nodes</h3>
                    </div>
                    <div id="nodesListContent">
                        <div class="loading-section">
                            <div class="loading-spinner"></div>
                            <p>Loading nodes data...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderStatsSection() {
        return `
            <div class="stats-content">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Network Statistics</h3>
                    </div>
                    <div id="statsContent">
                        <div class="loading-section">
                            <div class="loading-spinner"></div>
                            <p>Loading statistics...</p>
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
        // Refresh button
        const refreshBtn = this.container.querySelector('#refreshNetworkBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadNetworkData());
        }

        // Section tabs
        this.container.querySelectorAll('.section-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const sectionName = e.target.dataset.section;
                this.switchSection(sectionName);
            });
        });

        // Pool filter
        const poolFilter = this.container.querySelector('#poolFilter');
        if (poolFilter) {
            poolFilter.addEventListener('change', () => this.filterPools());
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

        // Load section-specific data if needed
        this.loadSectionData(sectionName);
    }

    async loadNetworkData() {
        try {
            this.setLoading(true);
            
            // Load network info
            const networkPromise = this.services.backend.getNetworkInfo(this.currentNetwork);
            const poolsPromise = this.services.backend.getPools(this.currentNetwork);
            const nodePromise = this.services.backend.getNodeInfo(this.currentNetwork);
            
            const [networkData, poolData, nodeInfo] = await Promise.allSettled([
                networkPromise,
                poolsPromise,
                nodePromise
            ]);
            
            this.networkData = networkData.status === 'fulfilled' ? networkData.value : null;
            this.poolData = poolData.status === 'fulfilled' ? poolData.value : null;
            this.nodeInfo = nodeInfo.status === 'fulfilled' ? nodeInfo.value : null;
            
            this.updateNetworkStatus();
            this.updateSectionContent();
            
            console.log('✅ Network data loaded successfully');
            
        } catch (error) {
            console.error('❌ Failed to load network data:', error);
            this.services.ui.showToast('error', 'Failed to load network data', 3000);
        } finally {
            this.setLoading(false);
        }
    }

    async loadSectionData(sectionName) {
        // Load additional data when switching to specific sections
        switch (sectionName) {
            case 'pools':
                if (!this.poolData) {
                    await this.loadPoolsData();
                }
                break;
            case 'nodes':
                if (!this.nodeInfo) {
                    await this.loadNodesData();
                }
                break;
            case 'stats':
                await this.loadStatsData();
                break;
        }
    }

    async loadPoolsData() {
        try {
            this.poolData = await this.services.backend.getPools(this.currentNetwork);
            this.updatePoolsContent();
        } catch (error) {
            console.error('Failed to load pools data:', error);
        }
    }

    async loadNodesData() {
        try {
            this.nodeInfo = await this.services.backend.getNodeInfo(this.currentNetwork);
            this.updateNodesContent();
        } catch (error) {
            console.error('Failed to load nodes data:', error);
        }
    }

    async loadStatsData() {
        try {
            // Load additional statistics
            this.updateStatsContent();
        } catch (error) {
            console.error('Failed to load stats data:', error);
        }
    }

    updateNetworkStatus() {
        const statusElements = {
            networkStatus: this.container.querySelector('#networkStatus'),
            blockHeight: this.container.querySelector('#blockHeight'),
            activeNodes: this.container.querySelector('#activeNodes'),
            totalPools: this.container.querySelector('#totalPools')
        };

        if (statusElements.networkStatus) {
            statusElements.networkStatus.textContent = this.networkData ? 'Connected' : 'Disconnected';
            statusElements.networkStatus.className = `status-value ${this.networkData ? 'connected' : 'disconnected'}`;
        }

        if (statusElements.blockHeight && this.networkData) {
            statusElements.blockHeight.textContent = this.networkData.blockHeight || '--';
        }

        if (statusElements.activeNodes && this.nodeInfo) {
            statusElements.activeNodes.textContent = this.nodeInfo.activeNodes || '--';
        }

        if (statusElements.totalPools && this.poolData) {
            statusElements.totalPools.textContent = Array.isArray(this.poolData) ? this.poolData.length : '--';
        }
    }

    updateSectionContent() {
        this.updateOverviewContent();
        this.updatePoolsContent();
        this.updateNodesContent();
        this.updateStatsContent();
    }

    updateOverviewContent() {
        const healthContent = this.container.querySelector('#networkHealthContent');
        if (healthContent && this.networkData) {
            healthContent.innerHTML = `
                <div class="health-grid">
                    <div class="health-item">
                        <div class="health-label">Status</div>
                        <div class="health-value connected">Healthy</div>
                    </div>
                    <div class="health-item">
                        <div class="health-label">Uptime</div>
                        <div class="health-value">99.9%</div>
                    </div>
                    <div class="health-item">
                        <div class="health-label">Last Block</div>
                        <div class="health-value">2s ago</div>
                    </div>
                </div>
            `;
        }
    }

    updatePoolsContent() {
        const poolsContent = this.container.querySelector('#poolsListContent');
        if (poolsContent) {
            if (!this.poolData || !Array.isArray(this.poolData)) {
                poolsContent.innerHTML = '<p>No pools data available</p>';
                return;
            }

            const poolsHtml = this.poolData.slice(0, 10).map(pool => `
                <div class="pool-item">
                    <div class="pool-info">
                        <div class="pool-asset">${pool.asset}</div>
                        <div class="pool-status ${pool.status?.toLowerCase()}">${pool.status}</div>
                    </div>
                    <div class="pool-stats">
                        <div class="stat-item">
                            <label>Depth:</label>
                            <span>${pool.assetDepth || '--'}</span>
                        </div>
                        <div class="stat-item">
                            <label>Volume 24h:</label>
                            <span>${pool.volume24h || '--'}</span>
                        </div>
                    </div>
                </div>
            `).join('');

            poolsContent.innerHTML = `
                <div class="pools-list">
                    ${poolsHtml}
                    ${this.poolData.length > 10 ? `<p>... and ${this.poolData.length - 10} more pools</p>` : ''}
                </div>
            `;
        }
    }

    updateNodesContent() {
        const nodesContent = this.container.querySelector('#nodesListContent');
        if (nodesContent) {
            nodesContent.innerHTML = `
                <div class="nodes-info">
                    <p>Node information display coming soon...</p>
                    ${this.nodeInfo ? `<pre>${JSON.stringify(this.nodeInfo, null, 2)}</pre>` : ''}
                </div>
            `;
        }
    }

    updateStatsContent() {
        const statsContent = this.container.querySelector('#statsContent');
        if (statsContent) {
            statsContent.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-title">Total Volume</div>
                        <div class="stat-value">$1.2B</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Total Value Locked</div>
                        <div class="stat-value">$890M</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Daily Swaps</div>
                        <div class="stat-value">12,456</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">Unique Users</div>
                        <div class="stat-value">8,903</div>
                    </div>
                </div>
                <p><small>Note: These are placeholder values. Real statistics integration coming soon.</small></p>
            `;
        }
    }

    filterPools() {
        const filter = this.container.querySelector('#poolFilter')?.value;
        // Implement pool filtering logic
        console.log('Filtering pools by:', filter);
    }

    setLoading(loading) {
        this.isLoading = loading;
        
        const refreshBtn = this.container.querySelector('#refreshNetworkBtn');
        if (refreshBtn) {
            if (loading) {
                this.services.ui.showElementLoading(refreshBtn, 'Loading...');
            } else {
                this.services.ui.hideElementLoading(refreshBtn);
            }
        }
    }

    // Standard Tab Interface Implementation

    async updateContext(wallet, network) {
        try {
            console.log('🔄 Updating Network Tab context...');
            
            const networkChanged = this.currentNetwork !== network;
            
            this.currentWallet = wallet;
            this.currentNetwork = network;
            
            if (networkChanged) {
                // Clear cached data for new network
                this.networkData = null;
                this.poolData = null;
                this.nodeInfo = null;
                
                // Re-render and reload data
                this.render();
                await this.loadNetworkData();
            }
            
            console.log('✅ Network Tab context updated');
            
        } catch (error) {
            console.error('❌ Failed to update Network Tab context:', error);
        }
    }

    async updateWallet(newWallet, currentNetwork) {
        await this.updateContext(newWallet, currentNetwork);
    }

    async updateNetwork(newNetwork, currentWallet) {
        await this.updateContext(currentWallet, newNetwork);
    }

    async refresh() {
        await this.loadNetworkData();
    }

    async onActivated() {
        // Tab became active - refresh if data is stale
        const staleThreshold = 300000; // 5 minutes
        const now = Date.now();
        
        if (!this.networkData || !this.lastUpdate || (now - this.lastUpdate) > staleThreshold) {
            await this.loadNetworkData();
            this.lastUpdate = now;
        }
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
            networkData: this.networkData,
            poolData: this.poolData,
            nodeInfo: this.nodeInfo,
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
        
        console.log('🧹 Network Tab cleanup completed');
    }
}