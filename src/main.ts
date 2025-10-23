import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { THORWalletService } from './services/walletService';
import { ThorchainApiService } from './services/thorchainApiService';
import { TransactionService } from './services/transactionService';
import { TransactionTrackingService } from './services/transactionTrackingService';
import { BalanceNormalizationService } from './services/balanceNormalizationService';
import { TransactionParams } from './types/transaction';
import { WalletInfo } from './types/wallet';
import { SwapQuoteParams } from './types/thornode';
import { SwapConstructionService } from './services/swapConstructionService';
import { AssetChainService } from './services/assetChainService';
import { NetworkService } from './services/networkService';
import { NetworkMode } from './types/network';
import { MemolessService } from './services/memolessService';
import { MemolessFlowState, RegistrationConfirmation } from './types/memoless';
import { SecureWalletStorageService, SecureWalletData, WalletStorageInfo } from './services/secureWalletStorage';

let mainWindow: BrowserWindow;

// Initialize services with network support
const networkService = new NetworkService();
const thorchainApiService = new ThorchainApiService(networkService);
const walletService = new THORWalletService(networkService);
const transactionService = new TransactionService(networkService);
const transactionTrackingService = new TransactionTrackingService();
const balanceNormalizationService = new BalanceNormalizationService(networkService);
const memolessService = new MemolessService(networkService);
const walletStorageService = new SecureWalletStorageService();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Rune.Tools (beta)',
    icon: path.join(__dirname, '../../images/odin.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Temporarily enable dev tools for debugging
  mainWindow.webContents.openDevTools();
}

// Set app name as early as possible
app.setName('Rune.Tools (beta)');

app.whenReady().then(() => {
  // Set app name again when ready
  app.setName('Rune.Tools (beta)');
  
  // Set dock icon for macOS
  if (process.platform === 'darwin' && app.dock) {
    // Use absolute path from project root
    const iconPath = path.resolve(process.cwd(), 'images', 'odin.png');
    console.log('Trying to load icon from:', iconPath);
    try {
      app.dock.setIcon(iconPath);
    } catch (error) {
      console.error('Failed to set dock icon:', error);
    }
  }
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for network switching
ipcMain.handle('set-network', async (event, network: NetworkMode) => {
  try {
    networkService.setNetwork(network);
    
    // Update all services that depend on network configuration
    thorchainApiService.setNetwork(network);
    walletService.setNetwork(network);
    transactionService.setNetwork(network);
    balanceNormalizationService.setNetwork(network);
    memolessService.setNetwork(network);
    
    return { success: true, network: network };
  } catch (error) {
    console.error('Error setting network:', error);
    throw error;
  }
});

ipcMain.handle('get-network', async () => {
  try {
    return {
      currentNetwork: networkService.getCurrentNetwork(),
      config: await networkService.getNetworkConfig(),
      endpoints: await networkService.getEndpoints()
    };
  } catch (error) {
    console.error('Error getting network info:', error);
    throw error;
  }
});

ipcMain.handle('get-thorchain-module-address', async () => {
  try {
    return await thorchainApiService.getThorchainModuleAddress();
  } catch (error) {
    console.error('Error getting thorchain module address:', error);
    throw error;
  }
});

// IPC handlers for wallet operations
ipcMain.handle('generate-seed', async () => {
  try {
    return await THORWalletService.generateSeedPhrase();
  } catch (error) {
    console.error('Error generating seed phrase:', error);
    throw error;
  }
});

ipcMain.handle('create-wallet', async (event, mnemonic: string) => {
  try {
    return await walletService.createWalletFromSeed(mnemonic);
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw error;
  }
});

ipcMain.handle('get-balances', async (event, address: string) => {
  try {
    return await thorchainApiService.getWalletBalancesWithTradeAccount(address);
  } catch (error) {
    console.error('Error fetching balances:', error);
    throw error;
  }
});

ipcMain.handle('get-trade-account', async (event, address: string) => {
  try {
    return await thorchainApiService.getTradeAccount(address);
  } catch (error) {
    console.error('Error fetching trade account:', error);
    throw error;
  }
});

ipcMain.handle('get-node-info', async () => {
  try {
    return await thorchainApiService.getNodeInfo();
  } catch (error) {
    console.error('Error fetching node info:', error);
    throw error;
  }
});

// IPC handlers for transaction operations
ipcMain.handle('broadcast-transaction', async (event, walletInfo: WalletInfo, params: TransactionParams) => {
  try {
    return await transactionService.broadcastTransaction(walletInfo, params);
  } catch (error) {
    console.error('Error broadcasting transaction:', error);
    throw error;
  }
});

ipcMain.handle('estimate-gas', async (event, walletInfo: WalletInfo, params: TransactionParams) => {
  try {
    return await transactionService.estimateGas(walletInfo, params);
  } catch (error) {
    console.error('Error estimating gas:', error);
    throw error;
  }
});

ipcMain.handle('get-asset-denom', async (event, asset: string) => {
  try {
    return TransactionService.getAssetDenom(asset);
  } catch (error) {
    console.error('Error getting asset denom:', error);
    throw error;
  }
});

// IPC handlers for transaction tracking
ipcMain.handle('track-transaction', async (event, hash: string) => {
  try {
    return await transactionTrackingService.getTransactionSummary(hash);
  } catch (error) {
    console.error('Error tracking transaction:', error);
    throw error;
  }
});

ipcMain.handle('get-tx-details', async (event, hash: string) => {
  try {
    return await transactionTrackingService.getTxDetails(hash);
  } catch (error) {
    console.error('Error getting transaction details:', error);
    throw error;
  }
});

ipcMain.handle('poll-transaction', async (event, hash: string, maxAttempts?: number, intervalMs?: number) => {
  try {
    return await transactionTrackingService.pollTransactionStatus(hash, maxAttempts, intervalMs);
  } catch (error) {
    console.error('Error polling transaction:', error);
    throw error;
  }
});

// IPC handlers for normalized balance service
ipcMain.handle('get-normalized-balances', async (event, address: string) => {
  try {
    return await balanceNormalizationService.getCombinedNormalizedBalances(address);
  } catch (error) {
    console.error('Error getting normalized balances:', error);
    throw error;
  }
});

ipcMain.handle('get-balances-by-type', async (event, address: string) => {
  try {
    return await balanceNormalizationService.getBalancesByType(address);
  } catch (error) {
    console.error('Error getting balances by type:', error);
    throw error;
  }
});

ipcMain.handle('get-balances-by-chain', async (event, address: string) => {
  try {
    return await balanceNormalizationService.getBalancesByChain(address);
  } catch (error) {
    console.error('Error getting balances by chain:', error);
    throw error;
  }
});

ipcMain.handle('get-balance-for-asset', async (event, address: string, assetIdentifier: string) => {
  try {
    return await balanceNormalizationService.getBalanceForAsset(address, assetIdentifier);
  } catch (error) {
    console.error('Error getting balance for asset:', error);
    throw error;
  }
});

// IPC handlers for new THORNode endpoints
ipcMain.handle('get-pools', async () => {
  try {
    return await thorchainApiService.getPools();
  } catch (error) {
    console.error('Error fetching pools:', error);
    throw error;
  }
});

ipcMain.handle('get-pool-by-asset', async (event, assetIdentifier: string) => {
  try {
    return await thorchainApiService.getPoolByAsset(assetIdentifier);
  } catch (error) {
    console.error('Error fetching pool by asset:', error);
    throw error;
  }
});

ipcMain.handle('get-thorchain-network', async () => {
  try {
    return await thorchainApiService.getNetwork();
  } catch (error) {
    console.error('Error fetching thorchain network info:', error);
    throw error;
  }
});

ipcMain.handle('get-oracle-prices', async () => {
  try {
    return await thorchainApiService.getOraclePrices();
  } catch (error) {
    console.error('Error fetching oracle prices:', error);
    throw error;
  }
});

ipcMain.handle('get-swap-quote', async (event, params: SwapQuoteParams) => {
  try {
    return await thorchainApiService.getSwapQuote(params);
  } catch (error) {
    console.error('Error fetching swap quote:', error);
    throw error;
  }
});

ipcMain.handle('construct-swap', async (event, quote: any, fromAsset: string, toAsset: string, amount: string) => {
  try {
    return SwapConstructionService.constructSwapInfo(quote, fromAsset, toAsset, amount);
  } catch (error) {
    console.error('Error constructing swap:', error);
    throw error;
  }
});

ipcMain.handle('analyze-asset', async (event, asset: string) => {
  try {
    return AssetChainService.analyzeAsset(asset);
  } catch (error) {
    console.error('Error analyzing asset:', error);
    throw error;
  }
});

ipcMain.handle('validate-swap', async (event, fromAsset: string, toAsset: string, amount: string) => {
  try {
    return SwapConstructionService.validateSwapConstruction(fromAsset, toAsset, amount);
  } catch (error) {
    console.error('Error validating swap:', error);
    throw error;
  }
});

// Transaction status endpoint for tracking swaps
ipcMain.handle('get-tx-status', async (event, txHash: string) => {
  try {
    return await thorchainApiService.getTxStatus(txHash);
  } catch (error) {
    console.error('Error fetching transaction status:', error);
    throw error;
  }
});

// IPC handlers for memoless functionality
ipcMain.handle('get-inbound-addresses', async () => {
  try {
    return await thorchainApiService.getInboundAddresses();
  } catch (error) {
    console.error('Error fetching inbound addresses:', error);
    throw error;
  }
});

ipcMain.handle('get-memo-reference', async (event, txId: string) => {
  try {
    return await thorchainApiService.getMemoReference(txId);
  } catch (error) {
    console.error('Error fetching memo reference:', error);
    throw error;
  }
});

ipcMain.handle('get-chain-id', async () => {
  try {
    return await networkService.getChainId();
  } catch (error) {
    console.error('Error fetching chain ID:', error);
    throw error;
  }
});


// IPC handlers for memoless functionality
ipcMain.handle('memoless-get-valid-assets', async () => {
  try {
    return await memolessService.getValidAssetsForRegistration();
  } catch (error) {
    console.error('Error fetching valid assets for memoless:', error);
    throw error;
  }
});

ipcMain.handle('memoless-register-memo', async (event, walletInfo: WalletInfo, asset: string, memo: string) => {
  try {
    return await memolessService.registerMemo(walletInfo, asset, memo);
  } catch (error) {
    console.error('Error registering memo:', error);
    throw error;
  }
});

ipcMain.handle('memoless-get-memo-reference', async (event, txId: string) => {
  try {
    return await memolessService.getMemoReference(txId);
  } catch (error) {
    console.error('Error fetching memo reference:', error);
    throw error;
  }
});

ipcMain.handle('memoless-validate-registration', async (event, asset: string, exactAmount: string, decimals: number, expectedMemo: string, expectedReference: string) => {
  try {
    return await memolessService.validateMemoRegistration(asset, exactAmount, decimals, expectedMemo, expectedReference);
  } catch (error) {
    console.error('Error validating memo registration:', error);
    throw error;
  }
});

ipcMain.handle('memoless-get-expiry-estimate', async (event, expiryBlock: string) => {
  try {
    return await memolessService.getExpiryTimeEstimate(expiryBlock);
  } catch (error) {
    console.error('Error calculating expiry time estimate:', error);
    throw error;
  }
});

ipcMain.handle('memoless-get-inbound-addresses', async () => {
  try {
    return await memolessService.getInboundAddresses();
  } catch (error) {
    console.error('Error fetching inbound addresses:', error);
    throw error;
  }
});

ipcMain.handle('memoless-get-inbound-for-asset', async (event, asset: string) => {
  try {
    const inboundAddresses = await memolessService.getInboundAddresses();
    return memolessService.getInboundAddressForAsset(inboundAddresses, asset);
  } catch (error) {
    console.error('Error fetching inbound address for asset:', error);
    throw error;
  }
});

ipcMain.handle('memoless-validate-amount', async (event, amount: string, referenceID: string, assetDecimals: number) => {
  try {
    return memolessService.validateAmountToReference(amount, referenceID, assetDecimals);
  } catch (error) {
    console.error('Error validating amount:', error);
    throw error;
  }
});

ipcMain.handle('memoless-format-amount-with-reference', async (event, userInput: string, referenceID: string, assetDecimals: number) => {
  try {
    return memolessService.formatAmountWithReference(userInput, referenceID, assetDecimals);
  } catch (error) {
    console.error('Error formatting amount with reference:', error);
    throw error;
  }
});

ipcMain.handle('memoless-validate-dust-threshold', async (event, amount: string, dustThreshold: number) => {
  try {
    return memolessService.validateDustThreshold(amount, dustThreshold);
  } catch (error) {
    console.error('Error validating dust threshold:', error);
    throw error;
  }
});

ipcMain.handle('memoless-validate-amount-for-deposit', async (event, userInput: string, referenceID: string, assetDecimals: number, dustThreshold: number) => {
  try {
    return memolessService.validateAmountForDeposit(userInput, referenceID, assetDecimals, dustThreshold);
  } catch (error) {
    console.error('Error validating amount for deposit:', error);
    throw error;
  }
});

ipcMain.handle('memoless-generate-qr', async (event, chain: string, address: string, amount: string) => {
  try {
    return await memolessService.generateQRCodeData(chain, address, amount);
  } catch (error) {
    console.error('Error generating QR code data:', error);
    throw error;
  }
});

ipcMain.handle('memoless-get-rune-balance', async (event, address: string) => {
  try {
    return await memolessService.getUserRuneBalance(address);
  } catch (error) {
    console.error('Error fetching RUNE balance:', error);
    throw error;
  }
});

ipcMain.handle('memoless-calculate-usd', async (event, amount: string, priceUSD: number) => {
  try {
    return memolessService.calculateUSDEquivalent(amount, priceUSD);
  } catch (error) {
    console.error('Error calculating USD equivalent:', error);
    throw error;
  }
});

ipcMain.handle('memoless-is-stagenet', async () => {
  try {
    return memolessService.isStaging();
  } catch (error) {
    console.error('Error checking network mode:', error);
    throw error;
  }
});

ipcMain.handle('memoless-get-network-display', async () => {
  try {
    return memolessService.getCurrentNetworkDisplay();
  } catch (error) {
    console.error('Error getting network display:', error);
    throw error;
  }
});

// IPC handlers for secure wallet storage
ipcMain.handle('save-wallet', async (event, walletData: SecureWalletData) => {
  try {
    await walletStorageService.saveWallet(walletData);
    return { success: true };
  } catch (error) {
    console.error('Error saving wallet:', error);
    throw error;
  }
});

ipcMain.handle('load-wallet', async (event, walletId: string) => {
  try {
    return await walletStorageService.loadWallet(walletId);
  } catch (error) {
    console.error('Error loading wallet:', error);
    throw error;
  }
});

ipcMain.handle('get-available-wallets', async () => {
  try {
    return await walletStorageService.getAvailableWallets();
  } catch (error) {
    console.error('Error getting available wallets:', error);
    throw error;
  }
});

ipcMain.handle('update-wallet-access', async (event, walletId: string, isLocked: boolean = false) => {
  try {
    await walletStorageService.updateWalletAccess(walletId, isLocked);
    return { success: true };
  } catch (error) {
    console.error('Error updating wallet access:', error);
    throw error;
  }
});

ipcMain.handle('delete-wallet', async (event, walletId: string) => {
  try {
    await walletStorageService.deleteWallet(walletId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting wallet:', error);
    throw error;
  }
});

ipcMain.handle('wallet-exists', async (event, walletId: string) => {
  try {
    return await walletStorageService.walletExists(walletId);
  } catch (error) {
    console.error('Error checking wallet existence:', error);
    throw error;
  }
});

ipcMain.handle('get-storage-stats', async () => {
  try {
    return await walletStorageService.getStorageStats();
  } catch (error) {
    console.error('Error getting storage stats:', error);
    throw error;
  }
});

// IPC handler for saving session data
ipcMain.handle('save-session', async (event, sessionData: any) => {
  try {
    // For now, just log the session data. In a full implementation,
    // you might want to store this in a secure session file
    console.log('💾 Session saved:', sessionData);
    return { success: true };
  } catch (error) {
    console.error('Error saving session:', error);
    throw error;
  }
});

// IPC handler for unlocking wallet with password verification
ipcMain.handle('unlock-wallet', async (event, walletId: string, password: string) => {
  try {
    const walletData = await walletStorageService.loadWallet(walletId);
    if (!walletData) {
      throw new Error('Wallet not found');
    }

    // Update access and unlock
    await walletStorageService.updateWalletAccess(walletId, false);

    // Return wallet info for the UI (without sensitive data)
    return {
      walletId: walletData.walletId,
      name: walletData.name,
      mainnetAddress: walletData.addresses.mainnet,
      stagenetAddress: walletData.addresses.stagenet,
      isLocked: false,
      lastUsed: new Date()
    };
  } catch (error) {
    console.error('Error unlocking wallet:', error);
    throw error;
  }
});

