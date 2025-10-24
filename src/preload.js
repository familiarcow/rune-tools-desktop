/**
 * Preload script for secure IPC communication
 * Exposes a limited API to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => {
    // Allow all IPC channels that are defined in main.ts
    const allowedChannels = [
      // Network operations
      'set-network',
      'get-network',
      'get-thorchain-module-address',
      
      // Wallet operations
      'generate-seed',
      'create-wallet',
      'get-balances',
      'get-trade-account',
      'get-node-info',
      
      // Transaction operations
      'broadcast-transaction',
      'estimate-gas',
      'get-asset-denom',
      'track-transaction',
      'get-tx-details',
      'poll-transaction',
      
      // Balance operations
      'get-normalized-balances',
      'get-balances-by-type',
      'get-balances-by-chain',
      'get-balance-for-asset',
      
      // THORNode endpoints
      'get-pools',
      'get-pool-by-asset',
      'get-thorchain-network',
      'get-oracle-prices',
      'get-swap-quote',
      'construct-swap',
      'analyze-asset',
      'validate-swap',
      'get-tx-status',
      
      // Memoless operations
      'get-inbound-addresses',
      'get-memo-reference',
      'get-chain-id',
      'memoless-get-valid-assets',
      'memoless-register-memo',
      'memoless-get-memo-reference',
      'memoless-validate-registration',
      'memoless-get-expiry-estimate',
      'memoless-get-inbound-addresses',
      'memoless-get-inbound-for-asset',
      'memoless-validate-amount',
      'memoless-format-amount-with-reference',
      'memoless-validate-dust-threshold',
      'memoless-validate-amount-for-deposit',
      'memoless-generate-qr',
      'memoless-get-rune-balance',
      'memoless-calculate-usd',
      'memoless-is-stagenet',
      'memoless-get-network-display',
      'get-memoless-service',
      
      // Secure wallet storage
      'save-wallet',
      'load-wallet',
      'get-available-wallets',
      'update-wallet-access',
      'delete-wallet',
      'wallet-exists',
      'get-storage-stats',
      'save-session',
      'unlock-wallet',
      'decrypt-wallet-mnemonic'
    ];
    
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    } else {
      throw new Error(`IPC channel '${channel}' is not allowed`);
    }
  }
});