import { ThorchainApiService } from './thorchainApiService';
import { BackendService } from '../renderer/services/BackendService';
import { NetworkService } from './networkService';
import { Pool, SwapQuote, SwapQuoteParams } from '../types/thornode';
import { AssetBalance } from '../renderer/components/WalletTab';

export interface SwapAsset {
    asset: string;
    balance: string;
    usdValue: number;
    price?: number;
}

export interface ToAsset {
    asset: string;
    displayName: string;
    balanceRune: number;
}

export type AssetType = 'native' | 'secured' | 'trade';

export interface SwapParams {
    fromAsset: string;
    toAsset: string;
    amount: string; // User input amount (not base units)
    assetType: AssetType;
    recipientAddress?: string; // For native type
    liquidityToleranceBps: number;
    streamingQuantity: number;
    streamingInterval: number;
    customRefundAddress?: string;
}

export interface SwapQuoteDisplay {
    quote: SwapQuote;
    inputAmount: string;
    outputAmount: string;
    outputAsset: string;
    toAddress: string;
    swapTimeSeconds: number;
    totalFeesPercent: string;
}

export class SwapService {
    private backend: BackendService;
    private thorchainApi: ThorchainApiService;
    private networkService: NetworkService;

    constructor(backend: BackendService, networkService?: NetworkService) {
        this.backend = backend;
        this.networkService = networkService || new NetworkService();
        this.thorchainApi = new ThorchainApiService(this.networkService);
    }

    /**
     * Update the network for all API calls
     */
    public setNetwork(network: 'mainnet' | 'stagenet'): void {
        this.networkService.setNetwork(network);
        this.thorchainApi.setNetwork(network);
    }

    /**
     * Get available assets for swapping from user's wallet balances
     * Reuses the same data that WalletTab fetches via BackendService
     */
    async getFromAssets(walletAddress: string): Promise<SwapAsset[]> {
        try {
            console.log('🔍 SwapService: Getting from assets for address:', walletAddress);
            
            // Use the same method that WalletTab uses - this gets all balance types
            // and returns them in a normalized format with proper asset typing
            const combinedBalances = await this.backend.getNormalizedBalances(walletAddress);
            
            const swapAssets: SwapAsset[] = [];
            
            if (combinedBalances && combinedBalances.balances) {
                console.log('📊 SwapService: Processing balances:', combinedBalances.balances.length);
                
                for (const balance of combinedBalances.balances) {
                    // Skip assets with zero balance
                    const normalizedAmount = balance.amountNormalized || 0;
                    if (normalizedAmount <= 0) continue;
                    
                    // Skip synthetic assets (deprecated)
                    const assetName = balance.asset?.asset || balance.asset?.identifier || balance.asset?.symbol || balance.asset;
                    if (!assetName || assetName.includes('/')) continue; // Skip synthetic assets
                    
                    // Calculate USD value for this asset
                    const { price, usdValue } = await this.getAssetPricing(assetName, normalizedAmount);
                    
                    swapAssets.push({
                        asset: assetName,
                        balance: balance.amountFormatted || balance.amount || '0',
                        usdValue,
                        price
                    });
                }
            }
            
            // Also get trade account balances
            try {
                const tradeAccount = await this.backend.getTradeAccount(walletAddress);
                if (tradeAccount && tradeAccount.balances) {
                    console.log('💰 SwapService: Processing trade account balances:', tradeAccount.balances.length);
                    
                    for (const balance of tradeAccount.balances) {
                        const asset = balance.asset;
                        if (!asset) continue;
                        
                        const normalizedAmount = parseFloat(balance.amount) / 1e8;
                        if (normalizedAmount <= 0) continue;

                        // Get pricing for trade asset
                        const { price, usdValue } = await this.getAssetPricing(asset, normalizedAmount);
                        
                        swapAssets.push({
                            asset,
                            balance: normalizedAmount.toString(),
                            usdValue,
                            price
                        });
                    }
                }
            } catch (tradeError) {
                console.warn('⚠️ SwapService: Could not fetch trade account balances:', (tradeError as Error).message);
                // Continue without trade balances - this is not critical
            }

            // Sort by descending USD value
            const sortedAssets = swapAssets.sort((a, b) => b.usdValue - a.usdValue);
            
            console.log('✅ SwapService: Found swap assets:', sortedAssets.length, 'assets');
            return sortedAssets;

        } catch (error) {
            console.error('❌ SwapService: Failed to get from assets:', error);
            throw new Error('Failed to load available assets for swapping');
        }
    }

    /**
     * Get available destination assets from pools data
     */
    async getToAssets(): Promise<ToAsset[]> {
        try {
            const pools = await this.thorchainApi.getPools();
            
            const toAssets: ToAsset[] = [];

            // Add THOR.RUNE first (not in pools)
            toAssets.push({
                asset: 'THOR.RUNE',
                displayName: 'THOR.RUNE',
                balanceRune: Number.MAX_SAFE_INTEGER // Always show first
            });

            // Add available pool assets
            for (const pool of pools) {
                if (pool.status === 'Available') {
                    toAssets.push({
                        asset: pool.asset,
                        displayName: pool.asset,
                        balanceRune: pool.balance_rune
                    });
                }
            }

            // Sort by descending balance_rune (RUNE will be first due to MAX_SAFE_INTEGER)
            return toAssets.sort((a, b) => b.balanceRune - a.balanceRune);

        } catch (error) {
            console.error('Failed to get to assets:', error);
            throw new Error('Failed to load available destination assets');
        }
    }

    /**
     * Format asset name for quote request based on asset type
     */
    formatAssetForQuote(asset: string, assetType: AssetType): string {
        // Native type: no changes needed
        if (assetType === 'native') {
            return asset;
        }

        // Secured type: replace . with -
        if (assetType === 'secured') {
            return asset.replace(/\./g, '-');
        }

        // Trade type: replace . with ~
        if (assetType === 'trade') {
            return asset.replace(/\./g, '~');
        }

        return asset;
    }

    /**
     * Get destination address based on asset type and to_asset
     */
    getDestinationAddress(assetType: AssetType, toAsset: string, userAddress: string, customAddress?: string): string {
        // If the to_asset starts with THOR, always use user's THOR address
        if (toAsset.startsWith('THOR.')) {
            return userAddress;
        }
        
        // For non-THOR assets, follow the asset type rules
        if (assetType === 'native' && customAddress) {
            return customAddress;
        }
        
        // Secured and trade assets, or native without custom address
        return userAddress;
    }

    /**
     * Request swap quote from THORNode
     */
    async getSwapQuote(params: SwapParams, userAddress: string): Promise<SwapQuoteDisplay> {
        try {
            // Convert amount to base units (1e8)
            const amountInBaseUnits = Math.floor(parseFloat(params.amount) * 1e8);
            
            // Format assets for quote
            const fromAsset = this.formatAssetForQuote(params.fromAsset, 'native'); // from_asset is always in wallet format
            const toAsset = this.formatAssetForQuote(params.toAsset, params.assetType);
            
            // Get destination address
            const destination = this.getDestinationAddress(params.assetType, params.toAsset, userAddress, params.recipientAddress);
            
            // Build quote parameters
            const quoteParams: SwapQuoteParams = {
                from_asset: fromAsset,
                to_asset: toAsset,
                amount: amountInBaseUnits,
                destination,
                streaming_interval: params.streamingInterval,
                streaming_quantity: params.streamingQuantity,
                liquidity_tolerance_bps: params.liquidityToleranceBps
            };

            // Add optional parameters
            if (params.customRefundAddress) {
                quoteParams.refund_address = params.customRefundAddress;
            }

            // Get quote from API
            const quote = await this.thorchainApi.getSwapQuote(quoteParams);

            // Format quote for display
            return this.formatQuoteForDisplay(quote, params, destination);

        } catch (error) {
            console.error('Failed to get swap quote:', error);
            throw new Error(`Failed to get swap quote: ${(error as Error).message}`);
        }
    }

    /**
     * Format quote response for UI display
     */
    private formatQuoteForDisplay(quote: SwapQuote, params: SwapParams, destination: string): SwapQuoteDisplay {
        const outputAmount = (parseFloat(quote.expected_amount_out) / 1e8).toString();
        const totalFeesPercent = ((quote.fees?.total_bps || 0) / 100).toFixed(2);
        
        // Use the same formatted asset that was submitted to the API
        const formattedToAsset = this.formatAssetForQuote(params.toAsset, params.assetType);

        return {
            quote,
            inputAmount: params.amount,
            outputAmount,
            outputAsset: formattedToAsset,
            toAddress: destination,
            swapTimeSeconds: quote.total_swap_seconds || 0,
            totalFeesPercent
        };
    }

    /**
     * Calculate USD value of amount for display
     */
    async calculateUsdValue(asset: string, amount: string): Promise<number> {
        try {
            const normalizedAmount = parseFloat(amount);
            if (isNaN(normalizedAmount) || normalizedAmount <= 0) return 0;

            const { usdValue } = await this.getAssetPricing(asset, normalizedAmount);
            return usdValue;
        } catch (error) {
            console.warn('Failed to calculate USD value:', error);
            return 0;
        }
    }

    /**
     * Validate if asset can be of specified type
     */
    canAssetBeType(asset: string, assetType: AssetType): boolean {
        // THOR.RUNE can only be native
        if (asset === 'THOR.RUNE' && assetType !== 'native') {
            return false;
        }
        
        return true;
    }

    // Helper methods for asset pricing (still needed for trade assets)

    public async getAssetPricing(asset: string, normalizedAmount: number): Promise<{ price: number, usdValue: number }> {
        try {
            // Normalize asset for pool lookup
            const poolAssetId = this.normalizeAssetForPoolLookup(asset);
            
            // Special handling for RUNE
            if (poolAssetId === 'THOR.RUNE' || poolAssetId.includes('RUNE')) {
                return await this.getRunePricing(normalizedAmount);
            }
            
            // Get pools data for other assets
            const pools = await this.thorchainApi.getPools();
            const pool = pools.find((p: Pool) => p.asset.toLowerCase() === poolAssetId.toLowerCase());
            
            if (pool && pool.asset_price_usd) {
                const price = pool.asset_price_usd;
                const usdValue = normalizedAmount * price;
                return { price, usdValue };
            } else {
                // Fallback pricing
                let fallbackPrice = 1.0;
                if (poolAssetId.includes('BTC')) fallbackPrice = 45000;
                else if (poolAssetId.includes('ETH')) fallbackPrice = 3000;
                
                return { price: fallbackPrice, usdValue: normalizedAmount * fallbackPrice };
            }
        } catch (error) {
            console.error('Failed to get asset pricing:', error);
            return { price: 1.0, usdValue: normalizedAmount * 1.0 };
        }
    }

    private normalizeAssetForPoolLookup(asset: string): string {
        const assetUpper = asset.toUpperCase();
        
        if (assetUpper === 'RUNE') return 'THOR.RUNE';
        if (assetUpper === 'TCY') return 'THOR.TCY';
        if (assetUpper.startsWith('THOR.')) return assetUpper;
        
        // Convert secured/trade format to pool format
        if (assetUpper.includes('-')) {
            return assetUpper.replace('-', '.');
        }
        if (assetUpper.includes('~')) {
            return assetUpper.replace('~', '.');
        }
        
        return assetUpper;
    }

    private async getRunePricing(normalizedAmount: number): Promise<{ price: number, usdValue: number }> {
        try {
            const network = await this.thorchainApi.getNetwork();
            if (network && network.rune_price_in_tor) {
                const price = parseFloat(network.rune_price_in_tor) / 1e8;
                const usdValue = normalizedAmount * price;
                return { price, usdValue };
            } else {
                return { price: 5.50, usdValue: normalizedAmount * 5.50 };
            }
        } catch (error) {
            console.error('Failed to get RUNE price:', error);
            return { price: 5.50, usdValue: normalizedAmount * 5.50 };
        }
    }
}