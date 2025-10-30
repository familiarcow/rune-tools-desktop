/**
 * Pool Detail Popup Component
 * 
 * Displays detailed information about a selected pool in a modal popup
 */

import { Pool } from '../../types/thornode';
import { AssetDisplayName, formatUSD, formatFromE8 } from '../../utils/assetUtils';

export interface PoolDetailPopupData {
  pool: Pool;
  onClose: () => void;
}

export class PoolDetailPopup {
  private container: HTMLElement;
  private pool: Pool | null = null;
  private onCloseCallback: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Show the pool detail popup
   */
  public show(data: PoolDetailPopupData): void {
    this.pool = data.pool;
    this.onCloseCallback = data.onClose;
    
    this.render();
    this.setupEventListeners();
    
    // Show the popup with animation
    this.container.style.display = 'flex';
    setTimeout(() => {
      this.container.classList.add('visible');
    }, 10);
  }

  /**
   * Hide the pool detail popup
   */
  public hide(): void {
    this.container.classList.remove('visible');
    setTimeout(() => {
      this.container.style.display = 'none';
      this.cleanup();
    }, 300);
  }

  private render(): void {
    if (!this.pool) return;

    const pool = this.pool;
    const displayName = AssetDisplayName(pool.asset);
    const assetPrice = formatFromE8(pool.asset_price_usd * 1e8, 2);
    const poolDepthUSD = formatUSD(pool.balance_asset * pool.asset_price_usd);
    const balanceAsset = this.formatLargeNumber(pool.balance_asset);
    const balanceRune = this.formatLargeNumber(pool.balance_rune);

    this.container.innerHTML = `
      <div class="pool-detail-popup-overlay">
        <div class="pool-detail-popup">
          <!-- Header -->
          <div class="popup-header">
            <div class="popup-title">
              <h3>${displayName}</h3>
              <div class="pool-status ${pool.status.toLowerCase()}">
                ${pool.status}${pool.status === 'Staged' ? ' (Not Available)' : ''}
              </div>
            </div>
            <button class="popup-close-btn" id="closeBtn" type="button">
              <span class="close-icon">×</span>
            </button>
          </div>

          <!-- Content -->
          <div class="popup-content">
            <!-- Basic Information -->
            <div class="info-section">
              <h4 class="section-title">Pool Information</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Full Asset Name</span>
                  <span class="info-value asset-name">${pool.asset}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Display Name</span>
                  <span class="info-value">${displayName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Status</span>
                  <span class="info-value">
                    <span class="pool-status ${pool.status.toLowerCase()}">${pool.status}</span>
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Trading Halted</span>
                  <span class="info-value">${pool.trading_halted ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            <!-- Price and Depth -->
            <div class="info-section">
              <h4 class="section-title">Market Data</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Asset Price</span>
                  <span class="info-value price-value">$${assetPrice}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Pool Depth (USD)</span>
                  <span class="info-value depth-value">${poolDepthUSD}</span>
                </div>
              </div>
            </div>

            <!-- Balances -->
            <div class="info-section">
              <h4 class="section-title">Pool Balances</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Asset Balance</span>
                  <span class="info-value">${balanceAsset} ${this.getAssetSymbol(pool.asset)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">RUNE Balance</span>
                  <span class="info-value">${balanceRune} RUNE</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="popup-footer">
            <button class="btn btn-secondary" id="closeFooterBtn" type="button">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // Close button in header
    const closeBtn = this.container.querySelector('#closeBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.onClose());
    }

    // Close button in footer
    const closeFooterBtn = this.container.querySelector('#closeFooterBtn');
    if (closeFooterBtn) {
      closeFooterBtn.addEventListener('click', () => this.onClose());
    }

    // Overlay click to close
    const overlay = this.container.querySelector('.pool-detail-popup-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.onClose();
        }
      });
    }

    // Escape key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Store reference for cleanup
    (this.container as any)._escapeHandler = handleEscape;
  }

  private onClose(): void {
    this.hide();
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  private cleanup(): void {
    // Remove event listeners
    const escapeHandler = (this.container as any)._escapeHandler;
    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler);
      delete (this.container as any)._escapeHandler;
    }

    // Clear container
    this.container.innerHTML = '';
    
    // Reset state
    this.pool = null;
    this.onCloseCallback = null;
  }

  /**
   * Extract asset symbol from full asset name
   */
  private getAssetSymbol(asset: string): string {
    const dotIndex = asset.indexOf('.');
    if (dotIndex === -1) return asset;
    
    const assetPart = asset.substring(dotIndex + 1);
    const dashIndex = assetPart.lastIndexOf('-');
    return dashIndex !== -1 ? assetPart.substring(0, dashIndex) : assetPart;
  }

  /**
   * Format large numbers with appropriate suffixes
   */
  private formatLargeNumber(value: number, decimals: number = 2): string {
    if (isNaN(value) || value === null || value === undefined) {
      return '0';
    }

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1e12) {
      return sign + (absValue / 1e12).toFixed(decimals) + 'T';
    } else if (absValue >= 1e9) {
      return sign + (absValue / 1e9).toFixed(decimals) + 'B';
    } else if (absValue >= 1e6) {
      return sign + (absValue / 1e6).toFixed(decimals) + 'M';
    } else if (absValue >= 1e3) {
      return sign + (absValue / 1e3).toFixed(decimals) + 'K';
    } else {
      return sign + value.toFixed(decimals);
    }
  }
}