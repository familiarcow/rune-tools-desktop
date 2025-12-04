/**
 * Midgard API Service
 * 
 * Handles API calls to THORChain's Midgard API for pool analytics data
 */

import { NetworkService } from './networkService';

export interface MidgardPool {
  asset: string;
  volume24h: string;
  annualPercentageRate: string;
  assetDepth: string;
  runeDepth: string;
  liquidityUnits: string;
  poolAPY: string;
}

export class MidgardApiService {
  private networkService: NetworkService;

  constructor(networkService: NetworkService) {
    this.networkService = networkService;
  }

  /**
   * Set the network for API calls
   */
  public setNetwork(network: 'mainnet' | 'stagenet'): void {
    this.networkService.setNetwork(network);
  }

  /**
   * Get all pools from Midgard API
   */
  public async getPools(): Promise<MidgardPool[]> {
    try {
      const currentNetwork = this.networkService.getCurrentNetwork();
      const baseUrl = currentNetwork === 'mainnet' 
        ? 'https://midgard.ninerealms.com' 
        : 'https://stagenet-midgard.ninerealms.com';
      
      const url = `${baseUrl}/v2/pools`;
      
      console.log(`🌊 MidgardApiService: Fetching pools from ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Midgard API error: ${response.status} ${response.statusText}`);
      }
      
      const pools: MidgardPool[] = await response.json();
      console.log(`✅ MidgardApiService: Fetched ${pools.length} pools`);
      
      return pools;
      
    } catch (error) {
      console.error('❌ MidgardApiService: Failed to fetch pools:', error);
      throw new Error('Failed to fetch pool analytics data');
    }
  }

  /**
   * Get volume data for a specific pool
   */
  public async getPoolVolume(asset: string): Promise<number> {
    try {
      const pools = await this.getPools();
      const pool = pools.find(p => p.asset === asset);
      
      if (!pool) {
        console.warn(`⚠️ Pool ${asset} not found in Midgard data`);
        return 0;
      }
      
      // Convert volume24h from string and divide by 1e8 to get USD
      const volume = parseFloat(pool.volume24h) / 1e8;
      return volume;
      
    } catch (error) {
      console.error('❌ MidgardApiService: Failed to get pool volume:', error);
      return 0;
    }
  }
}