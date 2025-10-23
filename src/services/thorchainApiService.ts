import axios, { AxiosInstance } from 'axios';
import { Balance, TradeAccount } from '../types/wallet';
import { Pool, RawPool, NetworkInfo, OraclePrice, SwapQuote, SwapQuoteParams } from '../types/thornode';
import { NetworkService } from './networkService';

export class ThorchainApiService {
  private api!: AxiosInstance;
  private networkService: NetworkService;

  constructor(networkService?: NetworkService) {
    this.networkService = networkService || new NetworkService();
    this.updateApiClient();
    
    // Listen for network changes if needed in the future
    this.setupNetworkListener();
  }

  private setupNetworkListener(): void {
    // For now, we'll update manually when needed
    // In the future, we could implement an event system for network changes
  }

  private updateApiClient(): void {
    const config = this.networkService.getNetworkConfigSync();
    this.api = axios.create({
      baseURL: config.thorNodeUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public setNetwork(network: 'mainnet' | 'stagenet'): void {
    this.networkService.setNetwork(network);
    this.updateApiClient();
  }

  public getCurrentNetwork(): string {
    return this.networkService.getCurrentNetwork();
  }

  public async getWalletBalances(address: string): Promise<Balance[]> {
    try {
      const response = await this.api.get(`/cosmos/bank/v1beta1/balances/${address}`);
      
      if (!response.data || !response.data.balances) {
        return [];
      }

      return response.data.balances.map((balance: any) => ({
        asset: balance.denom,
        amount: balance.amount
      }));
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      throw new Error(`Failed to fetch balances for address ${address}`);
    }
  }

  public async getNodeInfo(): Promise<any> {
    try {
      // Try multiple endpoints to get node information
      let response;
      try {
        // Try the main thorchain network endpoint first
        response = await this.api.get('/thorchain/network');
      } catch (networkError) {
        try {
          // Fallback to constants endpoint
          response = await this.api.get('/thorchain/constants');
        } catch (constantsError) {
          // Final fallback - use a simple endpoint that should always work
          response = await this.api.get('/thorchain/pools');
          // If pools work, we can assume the node is healthy
          return { 
            status: 'active', 
            network: this.getCurrentNetwork(),
            endpoints_working: true,
            pools_available: Array.isArray(response.data) ? response.data.length : 0
          };
        }
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching node info:', error);
      // Don't throw error - return a basic status instead
      return {
        status: 'unknown',
        network: this.getCurrentNetwork(),
        error: 'Node info unavailable',
        endpoints_working: false
      };
    }
  }

  public async getMimir(): Promise<any> {
    try {
      const response = await this.api.get('/thorchain/mimir');
      return response.data;
    } catch (error) {
      console.error('Error fetching mimir:', error);
      throw new Error('Failed to fetch THORChain mimir settings');
    }
  }

  public async getConstants(): Promise<any> {
    try {
      const response = await this.api.get('/thorchain/constants');
      return response.data;
    } catch (error) {
      console.error('Error fetching constants:', error);
      throw new Error('Failed to fetch THORChain constants');
    }
  }

  public async getPools(): Promise<Pool[]> {
    try {
      const response = await this.api.get('/thorchain/pools');
      const rawPools: RawPool[] = response.data || [];
      
      // Filter only Available pools and clean up the data
      return rawPools
        .filter(pool => pool.status === 'Available')
        .map(pool => this.cleanPoolData(pool));
    } catch (error) {
      console.error('Error fetching pools:', error);
      throw new Error('Failed to fetch THORChain pools');
    }
  }

  private normalizeAssetIdentifier(asset: string): string {
    // Convert different asset formats to THORChain native format
    // BTC-BTC, BTC~BTC -> BTC.BTC
    // ETH-USDC-0xA0b86a33E6..., ETH~USDC~0xA0b86a33E6... -> ETH.USDC-0xA0b86a33E6...
    
    // Handle trade assets (contains ~)
    if (asset.includes('~')) {
      return asset.replace(/~/g, '.');
    }
    
    // Handle secured assets (contains -)
    if (asset.includes('-')) {
      // For assets like BTC-BTC, convert to BTC.BTC
      // For assets with contract addresses like ETH-USDC-0x..., convert to ETH.USDC-0x...
      const parts = asset.split('-');
      if (parts.length >= 2) {
        // First part is chain, second is symbol, rest is contract address (if any)
        const chain = parts[0];
        const symbol = parts[1];
        const contractAddress = parts.slice(2).join('-'); // Rejoin contract address parts
        
        if (contractAddress) {
          return `${chain}.${symbol}-${contractAddress}`;
        } else {
          return `${chain}.${symbol}`;
        }
      }
    }
    
    // Already in correct format (contains .) or is RUNE
    return asset;
  }

  public findPoolByAsset(pools: Pool[], assetIdentifier: string): Pool | undefined {
    const normalizedAsset = this.normalizeAssetIdentifier(assetIdentifier);
    
    // Try exact match first
    let pool = pools.find(p => p.asset === normalizedAsset);
    if (pool) return pool;
    
    // Try case-insensitive match
    pool = pools.find(p => p.asset.toLowerCase() === normalizedAsset.toLowerCase());
    if (pool) return pool;
    
    // Try matching with original input format
    pool = pools.find(p => p.asset === assetIdentifier);
    if (pool) return pool;
    
    // Try partial matches (useful for assets with long contract addresses)
    if (normalizedAsset.includes('.')) {
      const [chain, assetPart] = normalizedAsset.split('.');
      pool = pools.find(p => {
        const [poolChain, poolAsset] = p.asset.split('.');
        return poolChain === chain && poolAsset && poolAsset.startsWith(assetPart.split('-')[0]);
      });
      if (pool) return pool;
    }
    
    return undefined;
  }

  public async getPoolByAsset(assetIdentifier: string): Promise<Pool | null> {
    try {
      const pools = await this.getPools();
      const pool = this.findPoolByAsset(pools, assetIdentifier);
      return pool || null;
    } catch (error) {
      console.error('Error fetching pool for asset:', error);
      throw new Error(`Failed to fetch pool for asset ${assetIdentifier}`);
    }
  }

  private cleanPoolData(rawPool: RawPool): Pool {
    const parseNumber = (value: string | undefined): number => {
      return value ? parseFloat(value) : 0;
    };

    const normalizeFromE8 = (value: string | undefined): number => {
      return value ? parseFloat(value) / 1e8 : 0;
    };

    return {
      asset: rawPool.asset,
      short_code: rawPool.short_code,
      status: rawPool.status,
      decimal: parseNumber(rawPool.decimal),
      pending_inbound_asset: normalizeFromE8(rawPool.pending_inbound_asset),
      pending_inbound_rune: normalizeFromE8(rawPool.pending_inbound_rune),
      balance_asset: normalizeFromE8(rawPool.balance_asset), // Normalized asset amount
      balance_rune: normalizeFromE8(rawPool.balance_rune),
      pool_units: normalizeFromE8(rawPool.pool_units),
      LP_units: normalizeFromE8(rawPool.LP_units),
      synth_units: normalizeFromE8(rawPool.synth_units),
      synth_supply: normalizeFromE8(rawPool.synth_supply),
      savers_depth: normalizeFromE8(rawPool.savers_depth),
      savers_units: normalizeFromE8(rawPool.savers_units),
      synth_mint_paused: rawPool.synth_mint_paused,
      synth_supply_remaining: normalizeFromE8(rawPool.synth_supply_remaining),
      loan_collateral: normalizeFromE8(rawPool.loan_collateral),
      loan_collateral_remaining: normalizeFromE8(rawPool.loan_collateral_remaining),
      loan_cr: parseNumber(rawPool.loan_cr),
      derived_depth_bps: parseNumber(rawPool.derived_depth_bps),
      volume24h: normalizeFromE8(rawPool.volume24h),
      volume24h_usd: rawPool.volume24h_usd ? parseNumber(rawPool.volume24h_usd) : undefined,
      fees24h: normalizeFromE8(rawPool.fees24h),
      fees24h_usd: rawPool.fees24h_usd ? parseNumber(rawPool.fees24h_usd) : undefined,
      apr: rawPool.apr ? parseNumber(rawPool.apr) : undefined,
      apy: rawPool.apy ? parseNumber(rawPool.apy) : undefined,
      liquidity_apr: rawPool.liquidity_apr ? parseNumber(rawPool.liquidity_apr) : undefined,
      liquidity_apy: rawPool.liquidity_apy ? parseNumber(rawPool.liquidity_apy) : undefined,
      savers_apr: rawPool.savers_apr ? parseNumber(rawPool.savers_apr) : undefined,
      savers_apy: rawPool.savers_apy ? parseNumber(rawPool.savers_apy) : undefined,
      earnings: rawPool.earnings ? normalizeFromE8(rawPool.earnings) : undefined,
      earnings_annual: rawPool.earnings_annual ? normalizeFromE8(rawPool.earnings_annual) : undefined,
      pool_slip_average: rawPool.pool_slip_average ? parseNumber(rawPool.pool_slip_average) : undefined,
      pool_slip_average_24h: rawPool.pool_slip_average_24h ? parseNumber(rawPool.pool_slip_average_24h) : undefined,
      asset_price_usd: rawPool.asset_tor_price ? normalizeFromE8(rawPool.asset_tor_price) : undefined, // Asset USD price
    };
  }

  public async getNetwork(): Promise<NetworkInfo> {
    try {
      const response = await this.api.get('/thorchain/network');
      return response.data;
    } catch (error) {
      console.error('Error fetching network info:', error);
      throw new Error('Failed to fetch THORChain network information');
    }
  }

  public async getOraclePrices(): Promise<OraclePrice[]> {
    try {
      const response = await this.api.get('/thorchain/oracle/prices');
      // The API returns { prices: [...] }
      return response.data?.prices || [];
    } catch (error) {
      console.error('Error fetching oracle prices:', error);
      throw new Error('Failed to fetch THORChain oracle prices');
    }
  }

  public async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuote> {
    try {
      // Build query parameters, only including defined values
      const queryParams = new URLSearchParams();
      
      // Required parameters
      queryParams.append('from_asset', params.from_asset);
      queryParams.append('to_asset', params.to_asset);
      queryParams.append('amount', params.amount.toString());
      queryParams.append('destination', params.destination);
      
      // Optional parameters
      if (params.refund_address) queryParams.append('refund_address', params.refund_address);
      if (params.streaming_interval) queryParams.append('streaming_interval', params.streaming_interval.toString());
      if (params.streaming_quantity) queryParams.append('streaming_quantity', params.streaming_quantity.toString());
      if (params.liquidity_tolerance_bps !== undefined) queryParams.append('liquidity_tolerance_bps', params.liquidity_tolerance_bps.toString());
      if (params.affiliate_bps !== undefined) queryParams.append('affiliate_bps', params.affiliate_bps.toString());
      if (params.affiliate) queryParams.append('affiliate', params.affiliate);
      if (params.height) queryParams.append('height', params.height.toString());
      
      const response = await this.api.get(`/thorchain/quote/swap?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching swap quote:', error);
      throw new Error(`Failed to fetch swap quote: ${(error as any)?.response?.data?.error || (error as Error).message}`);
    }
  }

  public async getTradeAccount(address: string): Promise<TradeAccount[]> {
    try {
      const response = await this.api.get(`/thorchain/trade/account/${address}`);
      
      // Handle empty response (no trade account)
      if (!response.data || response.data === null || (Array.isArray(response.data) && response.data.length === 0)) {
        return [];
      }

      // Ensure it's an array
      const tradeAccounts = Array.isArray(response.data) ? response.data : [response.data];
      
      return tradeAccounts.map((account: any) => ({
        owner: account.owner || address,
        asset: account.asset || 'Unknown',
        units: account.units || '0',
        last_add_height: account.last_add_height || '0',
        last_withdraw_height: account.last_withdraw_height || '0'
      }));
    } catch (error) {
      console.error('Error fetching trade account:', error);
      // Return empty array instead of throwing error for better UX
      console.warn(`No trade account found for address ${address}`);
      return [];
    }
  }

  public async getWalletBalancesWithTradeAccount(address: string): Promise<{
    walletBalances: Balance[];
    tradeAccount: TradeAccount[];
  }> {
    try {
      const [walletBalances, tradeAccount] = await Promise.all([
        this.getWalletBalances(address),
        this.getTradeAccount(address)
      ]);

      return {
        walletBalances,
        tradeAccount
      };
    } catch (error) {
      console.error('Error fetching combined balances:', error);
      throw new Error(`Failed to fetch balances for address ${address}`);
    }
  }

  public async getTxStatus(txHash: string): Promise<any> {
    try {
      const response = await this.api.get(`/thorchain/tx/status/${txHash}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction status:', error);
      throw new Error(`Failed to fetch transaction status for ${txHash}`);
    }
  }

  public async getInboundAddresses(): Promise<any[]> {
    try {
      const response = await this.api.get('/thorchain/inbound_addresses');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching inbound addresses:', error);
      throw new Error('Failed to fetch THORChain inbound addresses');
    }
  }

  public async getMemoReference(txId: string): Promise<any> {
    try {
      const response = await this.api.get(`/thorchain/memo/${txId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching memo reference:', error);
      throw new Error(`Failed to fetch memo reference for transaction ${txId}`);
    }
  }

  public async checkMemoValidation(asset: string, amount: string): Promise<any> {
    try {
      const response = await this.api.get(`/thorchain/memo/check/${asset}/${amount}`);
      return response.data;
    } catch (error) {
      console.error('Error checking memo validation:', error);
      throw new Error(`Failed to check memo validation for ${asset}/${amount}`);
    }
  }

  public async getCurrentBlock(): Promise<any> {
    try {
      const response = await this.api.get('/thorchain/lastblock/THORCHAIN');
      return response.data;
    } catch (error) {
      console.error('Error fetching current block:', error);
      throw new Error('Failed to fetch current THORChain block');
    }
  }

  public async getThorchainModuleAddress(): Promise<string> {
    return this.networkService.getThorchainModuleAddress();
  }

  public async getNetworkInfo(): Promise<{ network: string; prefix: string; endpoints: any; chainId: string }> {
    const config = await this.networkService.getNetworkConfig();
    const endpoints = await this.networkService.getEndpoints();
    return {
      network: this.getCurrentNetwork(),
      prefix: config.addressPrefix,
      endpoints: endpoints,
      chainId: config.chainId || 'unknown'
    };
  }
}