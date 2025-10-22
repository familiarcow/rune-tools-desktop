import { NetworkMode, NetworkConfig, NETWORK_CONFIGS, ThorchainModuleInfo, NodeInfo } from '../types/network';
import axios, { AxiosInstance } from 'axios';

export class NetworkService {
  private currentNetwork: NetworkMode = 'mainnet';
  private api!: AxiosInstance;
  private moduleAddressCache: Map<NetworkMode, string> = new Map();
  private chainIdCache: Map<NetworkMode, string> = new Map();

  constructor() {
    this.updateApiClient();
  }

  public getCurrentNetwork(): NetworkMode {
    return this.currentNetwork;
  }

  public async getNetworkConfig(): Promise<NetworkConfig> {
    const baseConfig = NETWORK_CONFIGS[this.currentNetwork];
    const chainId = await this.getChainId();
    return {
      ...baseConfig,
      chainId: chainId
    };
  }

  public getNetworkConfigSync(): NetworkConfig {
    const baseConfig = NETWORK_CONFIGS[this.currentNetwork];
    const cachedChainId = this.chainIdCache.get(this.currentNetwork);
    return {
      ...baseConfig,
      chainId: cachedChainId
    };
  }

  public setNetwork(network: NetworkMode): void {
    if (this.currentNetwork !== network) {
      this.currentNetwork = network;
      this.updateApiClient();
    }
  }

  private updateApiClient(): void {
    const config = this.getNetworkConfigSync();
    this.api = axios.create({
      baseURL: config.thorNodeUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async getThorchainModuleAddress(): Promise<string> {
    // Check cache first
    const cached = this.moduleAddressCache.get(this.currentNetwork);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.api.get('/thorchain/balance/module/thorchain');
      const moduleInfo: ThorchainModuleInfo = response.data;
      
      if (!moduleInfo.address) {
        throw new Error('No thorchain module address found in response');
      }

      // Cache the result
      this.moduleAddressCache.set(this.currentNetwork, moduleInfo.address);
      
      return moduleInfo.address;
    } catch (error) {
      console.error('Error fetching thorchain module address:', error);
      throw new Error(`Failed to fetch thorchain module address for ${this.currentNetwork}: ${(error as Error).message}`);
    }
  }

  public async getChainId(): Promise<string> {
    // Check cache first
    const cached = this.chainIdCache.get(this.currentNetwork);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.api.get('/cosmos/base/tendermint/v1beta1/node_info');
      const nodeInfo: NodeInfo = response.data;
      
      if (!nodeInfo.default_node_info?.network) {
        throw new Error('No chain ID found in node info response');
      }

      const chainId = nodeInfo.default_node_info.network;
      
      // Cache the result
      this.chainIdCache.set(this.currentNetwork, chainId);
      
      return chainId;
    } catch (error) {
      console.error('Error fetching chain ID:', error);
      throw new Error(`Failed to fetch chain ID for ${this.currentNetwork}: ${(error as Error).message}`);
    }
  }

  public async getNodeInfo(): Promise<NodeInfo> {
    try {
      const response = await this.api.get('/cosmos/base/tendermint/v1beta1/node_info');
      return response.data;
    } catch (error) {
      console.error('Error fetching node info:', error);
      throw new Error(`Failed to fetch node info for ${this.currentNetwork}: ${(error as Error).message}`);
    }
  }

  public clearCache(): void {
    this.moduleAddressCache.clear();
    this.chainIdCache.clear();
  }

  public isMainnet(): boolean {
    return this.currentNetwork === 'mainnet';
  }

  public isStagenet(): boolean {
    return this.currentNetwork === 'stagenet';
  }

  // Helper method to get the appropriate endpoint URLs
  public async getEndpoints() {
    const config = await this.getNetworkConfig();
    return {
      thorNode: config.thorNodeUrl,
      rpc: config.rpcUrl,
      prefix: config.addressPrefix,
      chainId: config.chainId
    };
  }

  // Synchronous version for cases where chain ID might not be needed immediately
  public getEndpointsSync() {
    const config = this.getNetworkConfigSync();
    return {
      thorNode: config.thorNodeUrl,
      rpc: config.rpcUrl,
      prefix: config.addressPrefix,
      chainId: config.chainId
    };
  }
}