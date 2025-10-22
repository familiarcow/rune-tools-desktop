export interface NormalizedAsset {
  // Standardized asset identifier (e.g., "THOR.RUNE", "ETH.USDC-0x1234", "AVAX.AVAX")
  asset: string;
  
  // Chain identifier (e.g., "THOR", "ETH", "AVAX", "BSC")
  chain: string;
  
  // Token symbol (e.g., "RUNE", "USDC", "AVAX")
  symbol: string;
  
  // Contract address for secured assets (optional)
  contractAddress?: string;
  
  // Original raw asset name from API
  rawAsset: string;
  
  // Asset type classification
  type: 'native' | 'secured' | 'trade';
}

export interface NormalizedBalance {
  asset: NormalizedAsset;
  amount: string; // Raw amount in 1e8 format
  amountFormatted: string; // Human-readable amount (e.g., "1.5 RUNE")
  amountNormalized: number; // Decimal amount (e.g., 1.5)
  source: 'wallet' | 'trade_account';
  
  // Additional metadata for trade account balances
  tradeMetadata?: {
    units: string;
    unitsFormatted: string; // Human-readable units
    unitsNormalized: number; // Decimal units
    last_add_height: string;
    last_withdraw_height: string;
  };
}

export interface CombinedBalances {
  address: string;
  balances: NormalizedBalance[];
  summary: {
    totalAssets: number;
    walletAssets: number;
    tradeAccountAssets: number;
    nativeAssets: number;
    securedAssets: number;
    tradeAssets: number;
  };
}