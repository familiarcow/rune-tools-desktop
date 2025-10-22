import { ThorchainApiService } from './thorchainApiService';
import { Balance, TradeAccount } from '../types/wallet';
import { NormalizedAsset, NormalizedBalance, CombinedBalances } from '../types/normalizedBalance';
import { NetworkService } from './networkService';

export class BalanceNormalizationService {
  private thorchainApi: ThorchainApiService;

  constructor(networkService?: NetworkService) {
    this.thorchainApi = new ThorchainApiService(networkService);
  }

  public setNetwork(network: 'mainnet' | 'stagenet'): void {
    this.thorchainApi.setNetwork(network);
  }

  /**
   * THORChain Asset Type Classification:
   * 
   * NATIVE ASSETS (use . notation):
   * - L1 native assets on their respective chains (e.g., BTC.BTC, ETH.ETH, THOR.RUNE)
   * - These are the actual native tokens on each blockchain
   * 
   * SECURED ASSETS (use - notation):  
   * - THORChain-native assets representing claims on L1 native assets (e.g., BTC-BTC, ETH-ETH)
   * - Backed 1:1 by actual L1 assets held in THORChain vaults
   * - Can be redeemed for the underlying L1 asset
   * 
   * TRADE ASSETS (use ~ notation):
   * - THORChain-native assets for trading exposure to L1 assets (e.g., BTC~BTC, ETH~ETH)  
   * - Used for trading operations within THORChain's ecosystem
   * - Provide exposure to underlying assets through THORChain's trade system
   * 
   * Asset notation format: CHAIN.ASSET-CONTRACT or CHAIN-ASSET-CONTRACT or CHAIN~ASSET-CONTRACT
   * - CHAIN: The blockchain (BTC, ETH, AVAX, THOR, etc.)
   * - ASSET: The token symbol (BTC, ETH, USDC, RUNE, etc.)
   * - CONTRACT: Optional contract address (only for tokens, not native coins)
   */

  /**
   * Determine the asset type based on THORChain notation
   */
  public getAssetType(asset: string): 'native' | 'secured' | 'trade' {
    if (!asset || typeof asset !== 'string') {
      return 'native';
    }

    if (asset.includes('~')) {
      return 'trade';
    } else if (asset.includes('-')) {
      return 'secured';  
    } else if (asset.includes('.')) {
      return 'native';
    } else {
      // Single name assets (like "rune", "tcy") are THOR native assets
      return 'native';
    }
  }

  /**
   * Normalize a raw asset name to standardized format
   */
  public normalizeAssetName(rawAsset: string): NormalizedAsset {
    // Handle empty or undefined assets
    if (!rawAsset || typeof rawAsset !== 'string') {
      return {
        asset: 'UNKNOWN',
        chain: 'UNKNOWN', 
        symbol: 'UNKNOWN',
        rawAsset: rawAsset || 'undefined',
        type: 'native'
      };
    }

    const asset = rawAsset.trim();
    const assetType = this.getAssetType(asset);

    // Handle single-name THOR native assets (e.g., "rune", "tcy")
    if (this.isNativeThorAsset(asset)) {
      const symbol = asset.toUpperCase();
      return {
        asset: `THOR.${symbol}`,
        chain: 'THOR',
        symbol: symbol,
        rawAsset: asset,
        type: 'native'
      };
    }

    // Parse based on asset type
    switch (assetType) {
      case 'native':
        return this.parseNativeAsset(asset);
      case 'secured':
        return this.parseSecuredAsset(asset);
      case 'trade':
        return this.parseTradeAsset(asset);
      default:
        return {
          asset: asset.toUpperCase(),
          chain: 'UNKNOWN',
          symbol: asset.toUpperCase(),
          rawAsset: asset,
          type: 'native'
        };
    }
  }

  /**
   * Check if asset is a native THOR asset (single name like "rune", "tcy")
   */
  private isNativeThorAsset(asset: string): boolean {
    const nativeAssets = [
      'rune', 'tcy', 'thor', // Known THOR native assets
    ];
    
    const lowerAsset = asset.toLowerCase();
    
    // Check against known native assets
    if (nativeAssets.includes(lowerAsset)) {
      return true;
    }
    
    // Single word without separators is likely native THOR asset
    return !asset.includes('-') && !asset.includes('~') && !asset.includes('.') && asset.length <= 10;
  }

  /**
   * Parse native asset format (e.g., "BTC.BTC", "ETH.USDC-0x1234")
   */
  private parseNativeAsset(asset: string): NormalizedAsset {
    const parts = asset.split('.');
    
    if (parts.length < 2) {
      return {
        asset: asset.toUpperCase(),
        chain: 'UNKNOWN',
        symbol: 'UNKNOWN',
        rawAsset: asset,
        type: 'native'
      };
    }

    const chain = parts[0].toUpperCase();
    const assetPart = parts[1];
    
    // Check if asset part has contract address (e.g., "USDC-0x1234")
    const assetParts = assetPart.split('-');
    const symbol = assetParts[0].toUpperCase();
    const contractAddress = assetParts.length > 1 ? assetParts.slice(1).join('-') : undefined;

    return {
      asset: contractAddress ? `${chain}.${symbol}-${contractAddress}` : `${chain}.${symbol}`,
      chain: chain,
      symbol: symbol,
      contractAddress: contractAddress,
      rawAsset: asset,
      type: 'native'
    };
  }

  /**
   * Parse secured asset format (e.g., "BTC-BTC", "ETH-USDC-0x1234")
   */
  private parseSecuredAsset(asset: string): NormalizedAsset {
    const parts = asset.split('-');
    
    if (parts.length < 2) {
      return {
        asset: asset.toUpperCase(),
        chain: 'UNKNOWN',
        symbol: 'UNKNOWN',
        rawAsset: asset,
        type: 'secured'
      };
    }

    const chain = parts[0].toUpperCase();
    const symbol = parts[1].toUpperCase();
    const contractAddress = parts.length > 2 ? parts.slice(2).join('-') : undefined;

    // Keep the secured asset notation format
    return {
      asset: contractAddress ? `${chain}-${symbol}-${contractAddress}` : `${chain}-${symbol}`,
      chain: chain,
      symbol: symbol,
      contractAddress: contractAddress,
      rawAsset: asset,
      type: 'secured'
    };
  }

  /**
   * Parse trade asset format (e.g., "BTC~BTC", "ETH~USDC-0x1234")
   */
  private parseTradeAsset(asset: string): NormalizedAsset {
    const parts = asset.split('~');
    
    if (parts.length !== 2) {
      return {
        asset: asset.toUpperCase(),
        chain: 'UNKNOWN',
        symbol: 'UNKNOWN',
        rawAsset: asset,
        type: 'trade'
      };
    }

    const chain = parts[0].toUpperCase();
    const assetPart = parts[1];

    // Handle contract addresses in trade assets (e.g., "USDC-0x1234")
    const assetParts = assetPart.split('-');
    const symbol = assetParts[0].toUpperCase();
    const contractAddress = assetParts.length > 1 ? assetParts.slice(1).join('-') : undefined;

    // Keep the trade asset notation format
    return {
      asset: contractAddress ? `${chain}~${symbol}-${contractAddress}` : `${chain}~${symbol}`,
      chain: chain,
      symbol: symbol,
      contractAddress: contractAddress,
      rawAsset: asset,
      type: 'trade'
    };
  }

  /**
   * Normalize wallet balance to standardized format
   */
  private normalizeWalletBalance(balance: Balance): NormalizedBalance {
    const asset = this.normalizeAssetName(balance.asset);
    const amountNormalized = this.normalizeAmount(balance.amount);
    
    return {
      asset,
      amount: balance.amount,
      amountFormatted: this.formatAmount(amountNormalized, asset.symbol),
      amountNormalized,
      source: 'wallet'
    };
  }

  /**
   * Normalize trade account position to standardized format
   */
  private normalizeTradeAccountBalance(tradeAccount: TradeAccount): NormalizedBalance {
    const asset = this.normalizeAssetName(tradeAccount.asset);
    const unitsNormalized = this.normalizeAmount(tradeAccount.units);
    
    return {
      asset,
      amount: tradeAccount.units, // Trade accounts use "units" as amount
      amountFormatted: this.formatAmount(unitsNormalized, asset.symbol),
      amountNormalized: unitsNormalized,
      source: 'trade_account',
      tradeMetadata: {
        units: tradeAccount.units,
        unitsFormatted: this.formatAmount(unitsNormalized, asset.symbol),
        unitsNormalized,
        last_add_height: tradeAccount.last_add_height,
        last_withdraw_height: tradeAccount.last_withdraw_height
      }
    };
  }

  /**
   * Get combined and normalized balances for an address
   */
  public async getCombinedNormalizedBalances(address: string): Promise<CombinedBalances> {
    try {
      // Fetch both wallet and trade account data
      const data = await this.thorchainApi.getWalletBalancesWithTradeAccount(address);

      // Normalize wallet balances
      const normalizedWalletBalances = data.walletBalances.map(balance => 
        this.normalizeWalletBalance(balance)
      );

      // Normalize trade account balances
      const normalizedTradeBalances = data.tradeAccount.map(tradeAccount => 
        this.normalizeTradeAccountBalance(tradeAccount)
      );

      // Combine all balances
      const allBalances = [...normalizedWalletBalances, ...normalizedTradeBalances];

      // Generate summary
      const summary = {
        totalAssets: allBalances.length,
        walletAssets: normalizedWalletBalances.length,
        tradeAccountAssets: normalizedTradeBalances.length,
        nativeAssets: allBalances.filter(b => b.asset.type === 'native').length,
        securedAssets: allBalances.filter(b => b.asset.type === 'secured').length,
        tradeAssets: allBalances.filter(b => b.asset.type === 'trade').length
      };

      return {
        address,
        balances: allBalances,
        summary
      };

    } catch (error) {
      console.error('Error getting combined normalized balances:', error);
      throw new Error(`Failed to get normalized balances for address ${address}: ${(error as Error).message}`);
    }
  }

  /**
   * Get normalized balances grouped by asset type
   */
  public async getBalancesByType(address: string): Promise<{
    native: NormalizedBalance[];
    secured: NormalizedBalance[];
    trade: NormalizedBalance[];
  }> {
    const combinedBalances = await this.getCombinedNormalizedBalances(address);

    return {
      native: combinedBalances.balances.filter(b => b.asset.type === 'native'),
      secured: combinedBalances.balances.filter(b => b.asset.type === 'secured'),
      trade: combinedBalances.balances.filter(b => b.asset.type === 'trade')
    };
  }

  /**
   * Get normalized balances grouped by chain
   */
  public async getBalancesByChain(address: string): Promise<Record<string, NormalizedBalance[]>> {
    const combinedBalances = await this.getCombinedNormalizedBalances(address);

    const balancesByChain: Record<string, NormalizedBalance[]> = {};

    combinedBalances.balances.forEach(balance => {
      const chain = balance.asset.chain;
      if (!balancesByChain[chain]) {
        balancesByChain[chain] = [];
      }
      balancesByChain[chain].push(balance);
    });

    return balancesByChain;
  }

  /**
   * Normalize amount from 1e8 format to decimal
   */
  private normalizeAmount(amount: string): number {
    if (!amount || amount === '0') {
      return 0;
    }
    
    const amountNum = parseFloat(amount);
    return amountNum / 1e8;
  }
  
  /**
   * Format normalized amount with proper decimals and symbol
   */
  private formatAmount(normalizedAmount: number, symbol: string): string {
    if (normalizedAmount === 0) {
      return `0 ${symbol}`;
    }
    
    // For amounts >= 1, show up to 6 decimal places
    if (normalizedAmount >= 1) {
      return `${normalizedAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      })} ${symbol}`;
    }
    
    // For smaller amounts, show up to 8 decimal places to preserve precision
    return `${normalizedAmount.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')} ${symbol}`;
  }

  /**
   * Find balance for a specific normalized asset
   */
  public async getBalanceForAsset(address: string, assetIdentifier: string): Promise<NormalizedBalance | null> {
    const combinedBalances = await this.getCombinedNormalizedBalances(address);
    
    return combinedBalances.balances.find(balance => 
      balance.asset.asset === assetIdentifier || 
      balance.asset.rawAsset === assetIdentifier
    ) || null;
  }
}