/**
 * Asset Service
 * 
 * Handles asset logo rendering with chain overlays
 */

export class AssetService {
  private static readonly CHAIN_IMAGES_PATH = 'images/chains/';
  private static readonly ASSET_IMAGES_PATH = 'images/assets/';
  private static readonly FALLBACK_LOGO = 'images/assets/fallback-logo.svg';

  /**
   * Get the logo with chain overlay for a given asset
   * @param asset The full asset name (e.g., "ETH.USDC-0x1234" or "BTC.BTC")
   * @returns HTML string with the logo and chain overlay
   */
  public static GetLogoWithChain(asset: string): string {
    const { chain, assetName } = this.parseAsset(asset);
    const assetType = this.getAssetType(asset);
    const shadowColor = this.getShadowColor(assetType);
    
    // Generate unique IDs for this logo instance to avoid conflicts
    const containerId = `logo-${this.generateId()}`;
    
    return `
      <div class="asset-logo-container" id="${containerId}">
        <img class="asset-logo asset-type-${assetType}" 
             src="${this.getAssetImagePath(assetName)}" 
             alt="${assetName}"
             style="filter: drop-shadow(0 0 2px ${shadowColor}) drop-shadow(0 0 1px ${shadowColor});" />
        <img class="chain-logo" 
             src="${this.getChainImagePath(chain)}" 
             alt="${chain}"
             style="filter: drop-shadow(0 0 2px ${shadowColor}) drop-shadow(0 0 1px ${shadowColor});" />
      </div>
    `;
  }

  /**
   * Parse an asset string to extract chain and asset name
   * @param asset Full asset string (e.g., "ETH.USDC-0x1234", "ETH-ETH", "BTC~BTC")
   * @returns Object with chain and assetName
   */
  private static parseAsset(asset: string): { chain: string; assetName: string } {
    if (!asset || typeof asset !== 'string') {
      return { chain: 'THOR', assetName: 'RUNE' };
    }

    const assetUpper = asset.toUpperCase();

    // Handle trade assets: BTC~BTC
    if (assetUpper.includes('~')) {
      const parts = assetUpper.split('~');
      const chain = parts[0];
      const assetPart = parts[1] || parts[0];
      // Remove contract address if present (everything after the last dash)
      const dashIndex = assetPart.lastIndexOf('-');
      const assetName = dashIndex !== -1 ? assetPart.substring(0, dashIndex) : assetPart;
      return { chain, assetName };
    }

    // Handle native assets: ETH.USDC-0x1234
    if (assetUpper.includes('.')) {
      const parts = assetUpper.split('.');
      const chain = parts[0];
      const assetPart = parts[1] || parts[0];
      // Remove contract address if present (everything after the last dash)
      const dashIndex = assetPart.lastIndexOf('-');
      const assetName = dashIndex !== -1 ? assetPart.substring(0, dashIndex) : assetPart;
      return { chain, assetName };
    }

    // Handle secured assets: ETH-ETH, BTC-BTC-0x1234
    if (assetUpper.includes('-')) {
      const parts = assetUpper.split('-');
      const chain = parts[0];
      const assetName = parts[1] || parts[0];
      // Note: For secured assets, we only take the first two parts (chain-asset)
      // Additional dashes are considered part of contract addresses
      return { chain, assetName };
    }

    // Single word assets (RUNE, TCY) - assume THOR chain
    return { chain: 'THOR', assetName: assetUpper };
  }

  /**
   * Get the path to the asset image
   * @param assetName The asset name (e.g., "USDC", "BTC")
   * @returns Path to the asset image
   */
  private static getAssetImagePath(assetName: string): string {
    // Try SVG first - let browser handle if it exists
    return `${this.ASSET_IMAGES_PATH}${assetName}.svg`;
  }

  /**
   * Get the path to the chain image
   * @param chain The chain name (e.g., "ETH", "BTC")
   * @returns Path to the chain image
   */
  private static getChainImagePath(chain: string): string {
    // Always try to load the chain image - let browser handle if it exists
    return `${this.CHAIN_IMAGES_PATH}${chain}.svg`;
  }

  /**
   * Determine asset type based on THORChain notation
   * @param asset The asset string to analyze
   * @returns Asset type: 'native', 'secured', or 'trade'
   */
  private static getAssetType(asset: string): 'native' | 'secured' | 'trade' {
    if (!asset || typeof asset !== 'string') {
      return 'native';
    }

    // Trade assets use ~ separator (highest priority)
    if (asset.includes('~')) {
      return 'trade';
    }
    
    // Native assets use . separator (check before secured)
    if (asset.includes('.')) {
      return 'native';
    }
    
    // Secured assets use - separator (and no . or ~)
    if (asset.includes('-')) {
      return 'secured';
    }
    
    // Default: no separator = native
    return 'native';
  }

  /**
   * Get shadow color based on asset type
   * @param assetType The type of asset
   * @returns CSS color value for shadow
   */
  private static getShadowColor(assetType: 'native' | 'secured' | 'trade'): string {
    switch (assetType) {
      case 'secured':
        return '#31FD9D'; // Green for secured assets
      case 'trade':
        return '#03CFFA'; // Blue for trade assets
      case 'native':
      default:
        return '#000000'; // Black for native assets
    }
  }

  /**
   * Generate a unique ID for logo instances
   * @returns Random string ID
   */
  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Initialize CSS styles for logo rendering
   * This should be called once when the application starts
   */
  public static initializeStyles(): void {
    const styleId = 'asset-logo-styles';
    
    // Check if styles are already added
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .asset-logo-container {
        position: relative;
        display: inline-block;
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .asset-logo {
        width: 24px;
        height: 24px;
        object-fit: contain;
        padding: 1px;
      }

      .chain-logo {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 12px;
        height: 12px;
        object-fit: contain;
        padding: 1px;
      }

      /* Handle image loading errors */
      .asset-logo[src*="fallback-logo.svg"] {
        opacity: 0.7;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Handle image loading errors by falling back to the fallback logo
   * @param imgElement The image element that failed to load
   */
  public static handleImageError(imgElement: HTMLImageElement): void {
    // Prevent further error events on this element
    imgElement.removeAttribute('onerror');
    
    if (imgElement.classList.contains('asset-logo')) {
      // Only fallback if not already using fallback
      if (!imgElement.src.includes('fallback-logo.svg')) {
        imgElement.src = this.FALLBACK_LOGO;
      }
    } else if (imgElement.classList.contains('chain-logo')) {
      // Hide chain logos that fail to load
      imgElement.style.display = 'none';
    }
  }
}