/**
 * Pools Service
 * 
 * Handles pools data fetching, processing, and display calculations for the Pools tab
 */

import { ThorchainApiService } from './thorchainApiService';
import { MidgardApiService, MidgardPool } from './midgardApiService';
import { NetworkService } from './networkService';
import { Pool } from '../types/thornode';
import { AssetDisplayName, formatFromE8, formatUSD } from '../utils/assetUtils';

export interface ProcessedPool {
  asset: string;
  displayName: string;
  status: string;
  price: number; // asset_tor_price / 1e8
  poolDepthUSD: number; // balance_asset * price
  volume24h: number; // 24h volume in USD from Midgard
  balance_asset: number;
  balance_rune: number;
  trading_halted: boolean;
}

export interface PoolSearchFilters {
  searchTerm?: string;
  showStaged?: boolean;
  sortBy?: 'asset' | 'price' | 'depth' | 'volume';
  sortDirection?: 'asc' | 'desc';
}

export class PoolsService {
  private thorchainApi: ThorchainApiService;
  private midgardApi: MidgardApiService;
  private networkService: NetworkService;

  constructor(networkService?: NetworkService) {
    this.networkService = networkService || new NetworkService();
    this.thorchainApi = new ThorchainApiService(this.networkService);
    this.midgardApi = new MidgardApiService(this.networkService);
  }

  /**
   * Update the network for all API calls
   */
  public setNetwork(network: 'mainnet' | 'stagenet'): void {
    this.networkService.setNetwork(network);
    this.thorchainApi.setNetwork(network);
    this.midgardApi.setNetwork(network);
  }

  /**
   * Fetch and process all pools data for display in the Pools tab
   * Returns processed pools sorted by balance_rune (Available first, then Staged)
   */
  public async getProcessedPools(): Promise<ProcessedPool[]> {
    try {
      console.log('🏊 PoolsService: Fetching all pools...');
      
      // Fetch pools from both THORNode and Midgard APIs in parallel
      const [thorchainPools, midgardPools] = await Promise.all([
        this.thorchainApi.getAllPools(),
        this.midgardApi.getPools()
      ]);
      
      console.log(`📊 PoolsService: Processing ${thorchainPools.length} pools with volume data`);
      
      // Create a map of asset -> volume for quick lookup
      const volumeMap = new Map<string, number>();
      midgardPools.forEach(pool => {
        const volume = parseFloat(pool.volume24h) / 1e8; // Convert from 1e8 to USD
        volumeMap.set(pool.asset, volume);
      });
      
      // Process each pool for display with volume data
      const processedPools = thorchainPools.map(pool => 
        this.processPool(pool, volumeMap.get(pool.asset) || 0)
      );
      
      // Sort pools: Available first (by balance_rune desc), then Staged
      const sortedPools = this.sortPoolsForDisplay(processedPools);
      
      console.log(`✅ PoolsService: Processed ${sortedPools.length} pools`);
      return sortedPools;
      
    } catch (error) {
      console.error('❌ PoolsService: Failed to fetch pools:', error);
      throw new Error('Failed to load pools data');
    }
  }

  /**
   * Search and filter pools based on provided criteria
   */
  public filterPools(pools: ProcessedPool[], filters: PoolSearchFilters): ProcessedPool[] {
    let filteredPools = [...pools];

    // Apply search term filter
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchTerm = filters.searchTerm.toLowerCase().trim();
      filteredPools = filteredPools.filter(pool => 
        pool.asset.toLowerCase().includes(searchTerm) ||
        pool.displayName.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (!filters.showStaged) {
      filteredPools = filteredPools.filter(pool => pool.status === 'Available');
    }

    // Apply sorting
    if (filters.sortBy) {
      filteredPools = this.sortPools(filteredPools, filters.sortBy, filters.sortDirection || 'desc');
    }

    return filteredPools;
  }

  /**
   * Get detailed pool information for popup display
   */
  public async getPoolDetails(asset: string): Promise<Pool | null> {
    try {
      const pools = await this.thorchainApi.getAllPools();
      return pools.find(pool => pool.asset === asset) || null;
    } catch (error) {
      console.error('❌ PoolsService: Failed to get pool details:', error);
      return null;
    }
  }

  /**
   * Process a raw pool into display format
   */
  private processPool(pool: Pool, volume24h: number = 0): ProcessedPool {
    const price = pool.asset_price_usd;
    const poolDepthUSD = pool.balance_asset * price;

    return {
      asset: pool.asset,
      displayName: AssetDisplayName(pool.asset),
      status: pool.status,
      price,
      poolDepthUSD,
      volume24h,
      balance_asset: pool.balance_asset,
      balance_rune: pool.balance_rune,
      trading_halted: pool.trading_halted
    };
  }

  /**
   * Sort pools for main display: Available first (by balance_rune desc), then Staged
   */
  private sortPoolsForDisplay(pools: ProcessedPool[]): ProcessedPool[] {
    const availablePools = pools
      .filter(pool => pool.status === 'Available')
      .sort((a, b) => b.balance_rune - a.balance_rune);

    const stagedPools = pools
      .filter(pool => pool.status === 'Staged')
      .sort((a, b) => b.balance_rune - a.balance_rune);

    return [...availablePools, ...stagedPools];
  }

  /**
   * Sort pools by specific criteria
   */
  private sortPools(pools: ProcessedPool[], sortBy: string, direction: 'asc' | 'desc'): ProcessedPool[] {
    return pools.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'asset':
          compareValue = a.displayName.localeCompare(b.displayName);
          break;
        case 'price':
          compareValue = a.price - b.price;
          break;
        case 'depth':
          compareValue = a.poolDepthUSD - b.poolDepthUSD;
          break;
        case 'volume':
          compareValue = a.volume24h - b.volume24h;
          break;
        default:
          compareValue = b.balance_rune - a.balance_rune; // Default to balance_rune desc
      }

      return direction === 'asc' ? compareValue : -compareValue;
    });
  }

  /**
   * Format pool data for display
   */
  public formatPoolPrice(price: number): string {
    return formatFromE8(price * 1e8, 2); // Convert back to e8 format for formatFromE8
  }

  public formatPoolDepth(depthUSD: number): string {
    return formatUSD(depthUSD);
  }

  public formatVolume24h(volume: number): string {
    // Round to nearest dollar and format with commas, no decimals
    const rounded = Math.round(volume);
    return '$' + rounded.toLocaleString();
  }

  public formatBalance(balance: number): string {
    if (balance >= 1e12) {
      return (balance / 1e12).toFixed(2) + 'T';
    } else if (balance >= 1e9) {
      return (balance / 1e9).toFixed(2) + 'B';
    } else if (balance >= 1e6) {
      return (balance / 1e6).toFixed(2) + 'M';
    } else if (balance >= 1e3) {
      return (balance / 1e3).toFixed(2) + 'K';
    } else {
      return balance.toFixed(2);
    }
  }

  /**
   * Calculate pool statistics for overview
   */
  public calculatePoolStats(pools: ProcessedPool[]): {
    totalPools: number;
    availablePools: number;
    stagedPools: number;
    totalDepthUSD: number;
  } {
    const availablePools = pools.filter(p => p.status === 'Available');
    const stagedPools = pools.filter(p => p.status === 'Staged');
    const totalDepthUSD = availablePools.reduce((sum, pool) => sum + pool.poolDepthUSD, 0);

    return {
      totalPools: pools.length,
      availablePools: availablePools.length,
      stagedPools: stagedPools.length,
      totalDepthUSD
    };
  }
}