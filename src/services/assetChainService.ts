/**
 * Asset Chain Detection Service
 * Determines which blockchain chain an asset belongs to and whether it requires THORChain native transactions
 */

export interface AssetChainInfo {
  asset: string;
  chain: string;
  symbol: string;
  isNativeThor: boolean; // true if it's a THOR native, secured, or trade asset
  assetType: 'native' | 'secured' | 'trade' | 'external';
  requiresMsgDeposit: boolean; // true if should use MsgDeposit instead of external chain tx
  contractAddress?: string;
}

export class AssetChainService {
  
  /**
   * Parse and analyze an asset to determine its chain and transaction requirements
   */
  public static analyzeAsset(asset: string): AssetChainInfo {
    if (!asset || typeof asset !== 'string') {
      throw new Error('Invalid asset format');
    }

    const assetUpper = asset.toUpperCase().trim();
    
    // Handle single-name THOR native assets (e.g., "rune", "tcy")
    if (this.isSingleNameThorAsset(assetUpper)) {
      return {
        asset: `THOR.${assetUpper}`,
        chain: 'THOR',
        symbol: assetUpper,
        isNativeThor: true,
        assetType: 'native',
        requiresMsgDeposit: true
      };
    }
    
    // Determine asset type by notation
    let assetType: 'native' | 'secured' | 'trade' | 'external';
    let isNativeThor: boolean;
    
    if (assetUpper.includes('~')) {
      // Trade assets (e.g., BTC~BTC, ETH~USDC)
      assetType = 'trade';
      isNativeThor = true;
    } else if (assetUpper.includes('-') && !assetUpper.includes('.')) {
      // Secured assets (e.g., BTC-BTC, ETH-USDC-0x1234)
      assetType = 'secured';
      isNativeThor = true;
    } else if (assetUpper.includes('.')) {
      // Check if it's THOR.ASSET (native THOR) or external chain asset
      const chainPart = assetUpper.split('.')[0];
      if (chainPart === 'THOR') {
        assetType = 'native';
        isNativeThor = true;
      } else {
        assetType = 'external';
        isNativeThor = false;
      }
    } else {
      // Fallback for unknown format
      assetType = 'external';
      isNativeThor = false;
    }
    
    // Parse the asset components
    const parsedAsset = this.parseAssetComponents(assetUpper);
    
    return {
      asset: parsedAsset.fullAsset,
      chain: parsedAsset.chain,
      symbol: parsedAsset.symbol,
      contractAddress: parsedAsset.contractAddress,
      isNativeThor,
      assetType,
      requiresMsgDeposit: isNativeThor
    };
  }
  
  /**
   * Check if an asset is a single-name THOR native asset
   */
  private static isSingleNameThorAsset(asset: string): boolean {
    const nativeAssets = ['RUNE', 'TCY', 'THOR'];
    const lowerAsset = asset.toLowerCase();
    
    // Check against known native assets
    if (nativeAssets.some(native => native.toLowerCase() === lowerAsset)) {
      return true;
    }
    
    // Single word without separators is likely native THOR asset
    return !asset.includes('-') && !asset.includes('~') && !asset.includes('.') && asset.length <= 10;
  }
  
  /**
   * Parse asset components based on notation type
   */
  private static parseAssetComponents(asset: string): {
    fullAsset: string;
    chain: string;
    symbol: string;
    contractAddress?: string;
  } {
    
    if (asset.includes('~')) {
      // Trade assets: CHAIN~SYMBOL or CHAIN~SYMBOL-CONTRACT
      const [chain, assetPart] = asset.split('~');
      const assetParts = assetPart.split('-');
      const symbol = assetParts[0];
      const contractAddress = assetParts.length > 1 ? assetParts.slice(1).join('-') : undefined;
      
      return {
        fullAsset: contractAddress ? `${chain}~${symbol}-${contractAddress}` : `${chain}~${symbol}`,
        chain,
        symbol,
        contractAddress
      };
      
    } else if (asset.includes('-') && !asset.includes('.')) {
      // Secured assets: CHAIN-SYMBOL or CHAIN-SYMBOL-CONTRACT
      const parts = asset.split('-');
      const chain = parts[0];
      const symbol = parts[1];
      const contractAddress = parts.length > 2 ? parts.slice(2).join('-') : undefined;
      
      return {
        fullAsset: contractAddress ? `${chain}-${symbol}-${contractAddress}` : `${chain}-${symbol}`,
        chain,
        symbol,
        contractAddress
      };
      
    } else if (asset.includes('.')) {
      // Native assets: CHAIN.SYMBOL or CHAIN.SYMBOL-CONTRACT
      const [chain, assetPart] = asset.split('.');
      const assetParts = assetPart.split('-');
      const symbol = assetParts[0];
      const contractAddress = assetParts.length > 1 ? assetParts.slice(1).join('-') : undefined;
      
      return {
        fullAsset: contractAddress ? `${chain}.${symbol}-${contractAddress}` : `${chain}.${symbol}`,
        chain,
        symbol,
        contractAddress
      };
      
    } else {
      // Unknown format, treat as single asset
      return {
        fullAsset: asset,
        chain: 'UNKNOWN',
        symbol: asset,
      };
    }
  }
  
  /**
   * Get the blockchain network for external chain transactions
   */
  public static getExternalChainNetwork(chain: string): string {
    const chainMappings: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'AVAX': 'avalanche',
      'BSC': 'binance-smart-chain',
      'LTC': 'litecoin',
      'BCH': 'bitcoin-cash',
      'DOGE': 'dogecoin',
      'ATOM': 'cosmos',
      'GAIA': 'cosmos'
    };
    
    return chainMappings[chain.toUpperCase()] || chain.toLowerCase();
  }
  
  /**
   * Validate if an asset can be used for swaps
   */
  public static validateSwapAsset(asset: string): { valid: boolean; error?: string } {
    try {
      const info = this.analyzeAsset(asset);
      
      if (info.chain === 'UNKNOWN') {
        return { valid: false, error: 'Unknown asset format' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }
}