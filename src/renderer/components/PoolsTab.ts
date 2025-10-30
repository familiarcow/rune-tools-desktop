/**
 * Pools Tab Component
 * 
 * Displays a table of THORChain pools with search/filter functionality
 * and pool detail popup on row click
 */

import { BackendService } from '../services/BackendService';
import { PoolsService, ProcessedPool, PoolSearchFilters } from '../../services/poolsService';
import { PoolDetailPopup } from './PoolDetailPopup';
import { Pool } from '../../types/thornode';
import { AssetService } from '../../services/assetService';

export interface PoolsTabData {
  walletId: string;
  name: string;
  address: string;
  network: 'mainnet' | 'stagenet';
}

export class PoolsTab {
  private container: HTMLElement;
  private backend: BackendService;
  private poolsService: PoolsService;
  private poolDetailPopup: PoolDetailPopup | null = null;
  private walletData: PoolsTabData | null = null;

  // UI State
  private pools: ProcessedPool[] = [];
  private filteredPools: ProcessedPool[] = [];
  private currentFilters: PoolSearchFilters = {
    searchTerm: '',
    showStaged: true,
    sortBy: 'depth',
    sortDirection: 'desc'
  };
  private isLoading: boolean = false;

  constructor(container: HTMLElement, backend: BackendService) {
    this.container = container;
    this.backend = backend;
    this.poolsService = new PoolsService();
  }

  async initialize(wallet: PoolsTabData): Promise<void> {
    try {
      console.log('🏊 Initializing PoolsTab...', { wallet: wallet.name, network: wallet.network });
      
      this.walletData = wallet;
      
      // Set the network in PoolsService
      this.poolsService.setNetwork(wallet.network);
      
      // Initialize asset logo styles
      AssetService.initializeStyles();
      
      this.render();
      await this.loadPoolsData();
      
      console.log('✅ PoolsTab initialized');
    } catch (error) {
      console.error('❌ Failed to initialize PoolsTab:', error);
      throw error;
    }
  }

  private render(): void {
    if (!this.walletData) return;

    this.container.innerHTML = `
      <div class="pools-tab">
        <!-- Pools Header -->
        <div class="pools-header">
          <div class="pools-title">
            <h3>🏊 THORChain Pools</h3>
            <p class="pools-description">View all liquidity pools on ${this.walletData.network === 'mainnet' ? 'Mainnet' : 'Stagenet'}</p>
          </div>
          <button class="btn btn-secondary refresh-btn" id="refreshBtn" type="button">
            <span class="refresh-icon">🔄</span>
            Refresh
          </button>
        </div>

        <!-- Pool Statistics -->
        <div class="pools-stats" id="poolsStats" style="display: none;">
          <div class="stat-item">
            <span class="stat-value" id="totalPoolsCount">-</span>
            <span class="stat-label">Total Pools</span>
          </div>
          <div class="stat-item">
            <span class="stat-value" id="availablePoolsCount">-</span>
            <span class="stat-label">Available</span>
          </div>
          <div class="stat-item">
            <span class="stat-value" id="stagedPoolsCount">-</span>
            <span class="stat-label">Staged</span>
          </div>
          <div class="stat-item">
            <span class="stat-value" id="totalDepthUSD">-</span>
            <span class="stat-label">Total Depth (USD)</span>
          </div>
        </div>

        <!-- Search and Filters -->
        <div class="pools-controls">
          <div class="search-input-container">
            <input type="text" class="search-input" id="searchInput" placeholder="Search pools by asset name...">
            <span class="search-icon">🔍</span>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">
              <input type="checkbox" id="showStagedCheckbox" checked>
              <span class="checkbox-text">Show Staged Pools</span>
            </label>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Sort by:</label>
            <select class="filter-select" id="sortSelect">
              <option value="depth">Pool Depth</option>
              <option value="volume">24h Volume</option>
              <option value="asset">Asset Name</option>
              <option value="price">Asset Price</option>
            </select>
          </div>
        </div>

        <!-- Pools Table -->
        <div class="pools-table-container">
          <table class="pools-table" id="poolsTable">
            <thead>
              <tr>
                <th class="sortable" data-sort="asset">
                  Asset
                  <span class="sort-indicator"></span>
                </th>
                <th class="sortable" data-sort="price">
                  Price (USD)
                  <span class="sort-indicator"></span>
                </th>
                <th class="sortable" data-sort="volume">
                  24h Volume (USD)
                  <span class="sort-indicator"></span>
                </th>
                <th class="sortable" data-sort="depth">
                  Pool Depth (USD)
                  <span class="sort-indicator"></span>
                </th>
              </tr>
            </thead>
            <tbody id="poolsTableBody">
              <!-- Pool rows will be populated here -->
            </tbody>
          </table>
        </div>

        <!-- Loading State -->
        <div class="loading-section" id="loadingSection" style="display: none;">
          <div class="loading-message">
            <span class="loading-spinner">🔄</span>
            <span id="loadingText">Loading pools...</span>
          </div>
        </div>

        <!-- Error State -->
        <div class="error-section" id="errorSection" style="display: none;">
          <div class="error-message" id="errorMessage"></div>
          <button class="btn btn-primary" id="retryBtn" type="button">
            Retry
          </button>
        </div>

        <!-- Empty State -->
        <div class="empty-section" id="emptySection" style="display: none;">
          <div class="empty-message">
            <span class="empty-icon">🔍</span>
            <h4>No pools found</h4>
            <p>Try adjusting your search or filters</p>
          </div>
        </div>
      </div>

      <!-- Pool Detail Popup Container -->
      <div class="pool-detail-popup-container" id="poolDetailContainer" style="display: none;"></div>
    `;

    this.setupEventListeners();
    this.initializePoolDetailPopup();
  }

  private setupEventListeners(): void {
    // Refresh button
    const refreshBtn = this.container.querySelector('#refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshPools());
    }

    // Search input
    const searchInput = this.container.querySelector('#searchInput') as HTMLInputElement;
    if (searchInput) {
      // Debounce search input
      let searchTimeout: NodeJS.Timeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.currentFilters.searchTerm = searchInput.value;
          this.applyFilters();
        }, 300);
      });
    }

    // Show staged checkbox
    const showStagedCheckbox = this.container.querySelector('#showStagedCheckbox') as HTMLInputElement;
    if (showStagedCheckbox) {
      showStagedCheckbox.addEventListener('change', () => {
        this.currentFilters.showStaged = showStagedCheckbox.checked;
        this.applyFilters();
      });
    }

    // Sort select
    const sortSelect = this.container.querySelector('#sortSelect') as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.currentFilters.sortBy = sortSelect.value as any;
        this.applyFilters();
      });
    }

    // Table header sorting
    const sortableHeaders = this.container.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const sortBy = header.getAttribute('data-sort');
        if (sortBy) {
          // Toggle sort direction if same column
          if (this.currentFilters.sortBy === sortBy) {
            this.currentFilters.sortDirection = this.currentFilters.sortDirection === 'desc' ? 'asc' : 'desc';
          } else {
            this.currentFilters.sortBy = sortBy as any;
            this.currentFilters.sortDirection = 'desc';
          }
          this.applyFilters();
          this.updateSortIndicators();
        }
      });
    });

    // Retry button
    const retryBtn = this.container.querySelector('#retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.loadPoolsData());
    }
  }

  private initializePoolDetailPopup(): void {
    const popupContainer = this.container.querySelector('#poolDetailContainer') as HTMLElement;
    if (popupContainer) {
      this.poolDetailPopup = new PoolDetailPopup(popupContainer);
    }
  }

  private async loadPoolsData(): Promise<void> {
    try {
      this.showLoading('Loading pools...');
      this.hideError();
      this.hideEmpty();

      const pools = await this.poolsService.getProcessedPools();
      this.pools = pools;

      this.applyFilters();
      this.updateStats();
      this.hideLoading();
      this.showStats();

      console.log(`✅ PoolsTab: Loaded ${pools.length} pools`);

    } catch (error) {
      console.error('❌ Failed to load pools:', error);
      this.showError('Failed to load pools data: ' + (error as Error).message);
      this.hideLoading();
    }
  }

  private applyFilters(): void {
    this.filteredPools = this.poolsService.filterPools(this.pools, this.currentFilters);
    this.renderPoolsTable();
    this.updateSortIndicators();

    // Show empty state if no results
    if (this.filteredPools.length === 0 && this.pools.length > 0) {
      this.showEmpty();
    } else {
      this.hideEmpty();
    }
  }

  private renderPoolsTable(): void {
    const tableBody = this.container.querySelector('#poolsTableBody');
    if (!tableBody) return;

    if (this.filteredPools.length === 0) {
      tableBody.innerHTML = '';
      return;
    }

    const rows = this.filteredPools.map(pool => {
      const priceFormatted = this.poolsService.formatPoolPrice(pool.price);
      const volumeFormatted = this.poolsService.formatVolume24h(pool.volume24h);
      const depthFormatted = this.poolsService.formatPoolDepth(pool.poolDepthUSD);
      const statusClass = pool.status.toLowerCase();
      const statusText = pool.status === 'Staged' ? `${pool.displayName} (Staged)` : pool.displayName;
      const logoHtml = AssetService.GetLogoWithChain(pool.asset);

      return `
        <tr class="pool-row ${statusClass}" data-asset="${pool.asset}">
          <td class="asset-cell">
            <div class="asset-info-with-logo">
              ${logoHtml}
              <span class="asset-name">${statusText}</span>
            </div>
          </td>
          <td class="price-cell">
            <span class="price-value">$${priceFormatted}</span>
          </td>
          <td class="volume-cell">
            <span class="volume-value">${volumeFormatted}</span>
          </td>
          <td class="depth-cell">
            <span class="depth-value">${depthFormatted}</span>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.innerHTML = rows;

    // Add click listeners to rows
    const poolRows = tableBody.querySelectorAll('.pool-row');
    poolRows.forEach(row => {
      row.addEventListener('click', () => {
        const asset = row.getAttribute('data-asset');
        if (asset) {
          this.showPoolDetail(asset);
        }
      });
    });

    // Setup image error handling
    this.setupImageErrorHandling();
  }

  private setupImageErrorHandling(): void {
    // Add error handlers to all asset and chain logos
    const assetLogos = this.container.querySelectorAll('.asset-logo, .chain-logo');
    assetLogos.forEach(img => {
      (img as HTMLImageElement).addEventListener('error', () => {
        AssetService.handleImageError(img as HTMLImageElement);
      });
    });
  }

  private async showPoolDetail(asset: string): Promise<void> {
    if (!this.poolDetailPopup) return;

    try {
      const poolData = await this.poolsService.getPoolDetails(asset);
      if (poolData) {
        this.poolDetailPopup.show({
          pool: poolData,
          onClose: () => {
            console.log('🔄 Pool detail popup closed');
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to show pool details:', error);
      this.showError('Failed to load pool details');
    }
  }

  private updateStats(): void {
    if (this.pools.length === 0) return;

    const stats = this.poolsService.calculatePoolStats(this.pools);
    
    const totalPoolsEl = this.container.querySelector('#totalPoolsCount');
    const availablePoolsEl = this.container.querySelector('#availablePoolsCount');
    const stagedPoolsEl = this.container.querySelector('#stagedPoolsCount');
    const totalDepthEl = this.container.querySelector('#totalDepthUSD');

    if (totalPoolsEl) totalPoolsEl.textContent = stats.totalPools.toString();
    if (availablePoolsEl) availablePoolsEl.textContent = stats.availablePools.toString();
    if (stagedPoolsEl) stagedPoolsEl.textContent = stats.stagedPools.toString();
    if (totalDepthEl) totalDepthEl.textContent = this.poolsService.formatPoolDepth(stats.totalDepthUSD);
  }

  private updateSortIndicators(): void {
    // Clear all indicators
    const indicators = this.container.querySelectorAll('.sort-indicator');
    indicators.forEach(indicator => {
      indicator.textContent = '';
      indicator.className = 'sort-indicator';
    });

    // Set active indicator
    const activeHeader = this.container.querySelector(`[data-sort="${this.currentFilters.sortBy}"] .sort-indicator`);
    if (activeHeader) {
      activeHeader.textContent = this.currentFilters.sortDirection === 'desc' ? '↓' : '↑';
      activeHeader.classList.add('active');
    }
  }

  private async refreshPools(): Promise<void> {
    console.log('🔄 Refreshing pools data...');
    await this.loadPoolsData();
  }

  // UI State Management
  private showLoading(message: string): void {
    const loadingSection = this.container.querySelector('#loadingSection') as HTMLElement;
    const loadingText = this.container.querySelector('#loadingText');
    
    if (loadingSection && loadingText) {
      loadingText.textContent = message;
      loadingSection.style.display = 'block';
    }

    // Hide other sections
    const tableContainer = this.container.querySelector('.pools-table-container') as HTMLElement;
    if (tableContainer) tableContainer.style.display = 'none';
  }

  private hideLoading(): void {
    const loadingSection = this.container.querySelector('#loadingSection') as HTMLElement;
    if (loadingSection) {
      loadingSection.style.display = 'none';
    }

    // Show table
    const tableContainer = this.container.querySelector('.pools-table-container') as HTMLElement;
    if (tableContainer) tableContainer.style.display = 'block';
  }

  private showError(message: string): void {
    const errorSection = this.container.querySelector('#errorSection') as HTMLElement;
    const errorMessage = this.container.querySelector('#errorMessage');
    
    if (errorSection && errorMessage) {
      errorMessage.textContent = message;
      errorSection.style.display = 'block';
    }

    // Hide other sections
    const tableContainer = this.container.querySelector('.pools-table-container') as HTMLElement;
    if (tableContainer) tableContainer.style.display = 'none';
    this.hideStats();
  }

  private hideError(): void {
    const errorSection = this.container.querySelector('#errorSection') as HTMLElement;
    if (errorSection) {
      errorSection.style.display = 'none';
    }
  }

  private showEmpty(): void {
    const emptySection = this.container.querySelector('#emptySection') as HTMLElement;
    if (emptySection) {
      emptySection.style.display = 'block';
    }
  }

  private hideEmpty(): void {
    const emptySection = this.container.querySelector('#emptySection') as HTMLElement;
    if (emptySection) {
      emptySection.style.display = 'none';
    }
  }

  private showStats(): void {
    const statsSection = this.container.querySelector('#poolsStats') as HTMLElement;
    if (statsSection) {
      statsSection.style.display = 'flex';
    }
  }

  private hideStats(): void {
    const statsSection = this.container.querySelector('#poolsStats') as HTMLElement;
    if (statsSection) {
      statsSection.style.display = 'none';
    }
  }

  // Public methods for network updates
  async updateNetwork(network: 'mainnet' | 'stagenet'): Promise<void> {
    if (!this.walletData) return;
    
    console.log('🔄 PoolsTab updating network to:', network);
    
    // Update network in service and wallet data
    this.poolsService.setNetwork(network);
    this.walletData.network = network;
    
    // Update header description
    const description = this.container.querySelector('.pools-description');
    if (description) {
      description.textContent = `View all liquidity pools on ${network === 'mainnet' ? 'Mainnet' : 'Stagenet'}`;
    }
    
    // Clear current data and reload
    this.pools = [];
    this.filteredPools = [];
    this.hideStats();
    
    await this.loadPoolsData();
    
    console.log('✅ PoolsTab network updated to:', network);
  }

  updateWalletAddress(wallet: any, network: 'mainnet' | 'stagenet'): void {
    if (!this.walletData) return;

    const newAddress = network === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress;
    this.walletData.address = newAddress;
    this.walletData.network = network;

    console.log(`PoolsTab address updated for ${network}:`, newAddress);
  }

  async refreshData(): Promise<void> {
    await this.loadPoolsData();
  }
}