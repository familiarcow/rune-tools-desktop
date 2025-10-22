export type NetworkMode = 'mainnet' | 'stagenet';

export interface NetworkConfig {
  mode: NetworkMode;
  thorNodeUrl: string;
  rpcUrl: string;
  addressPrefix: string;
  chainId?: string; // Will be fetched dynamically
}

export interface ThorchainModuleInfo {
  name: string;
  address: string;
  coins: any[];
}

export interface NodeInfo {
  default_node_info: {
    protocol_version: {
      p2p: string;
      block: string;
      app: string;
    };
    default_node_id: string;
    listen_addr: string;
    network: string; // This is the chain ID
    version: string;
    channels: string;
    moniker: string;
    other: {
      tx_index: string;
      rpc_address: string;
    };
  };
  application_version: {
    name: string;
    app_name: string;
    version: string;
    git_commit: string;
    build_tags: string;
    go_version: string;
    build_deps: Array<{
      path: string;
      version: string;
      sum: string;
    }>;
  };
}

export const NETWORK_CONFIGS: Record<NetworkMode, NetworkConfig> = {
  mainnet: {
    mode: 'mainnet',
    thorNodeUrl: 'https://thornode.ninerealms.com',
    rpcUrl: 'https://rpc.ninerealms.com',
    addressPrefix: 'thor'
  },
  stagenet: {
    mode: 'stagenet',
    thorNodeUrl: 'https://stagenet-thornode.ninerealms.com',
    rpcUrl: 'https://stagenet-rpc.ninerealms.com',
    addressPrefix: 'sthor'
  }
};