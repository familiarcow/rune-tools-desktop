import { Registry, DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { stringToPath } from '@cosmjs/crypto';
import { TransactionParams, TransactionResponse, PreparedTransaction, Coin, TransactionMessage, TransactionFee } from '../types/transaction';
import { MsgDeposit } from '../utils/msgDeposit';
import { WalletInfo } from '../types/wallet';
import { NetworkService } from './networkService';
import { convertToBaseUnits, convertFromBaseUnits, formatAmount, getAssetDenom } from '../utils/assetUtils';

export class TransactionService {
  private static readonly THORCHAIN_HD_PATH = "m/44'/931'/0'/0/0";
  private networkService: NetworkService;
  private thorchainModuleAddress: string | null = null;

  constructor(networkService?: NetworkService) {
    this.networkService = networkService || new NetworkService();
  }

  private async getThorchainModuleAddress(): Promise<string> {
    if (!this.thorchainModuleAddress) {
      this.thorchainModuleAddress = await this.networkService.getThorchainModuleAddress();
    }
    return this.thorchainModuleAddress;
  }

  private getRpcEndpoint(): string {
    return this.networkService.getNetworkConfigSync().rpcUrl;
  }

  private getAddressPrefix(): string {
    return this.networkService.getNetworkConfigSync().addressPrefix;
  }

  public setNetwork(network: 'mainnet' | 'stagenet'): void {
    this.networkService.setNetwork(network);
    // Clear cached module address when network changes
    this.thorchainModuleAddress = null;
    
    // NOTE: We don't cache sequence numbers in this service, but CosmJS clients might
    // Each transaction creates a fresh client connection to avoid stale sequence issues
    console.log('🔄 TransactionService network switched to:', network);
  }

  public static getAssetDenom(asset: string): string {
    return getAssetDenom(asset);
  }

  // Static methods now delegate to centralized assetUtils
  public static convertToBaseUnits(amount: string, asset: string): string {
    return convertToBaseUnits(amount, asset);
  }

  public static convertFromBaseUnits(baseUnits: string, asset: string): string {
    return convertFromBaseUnits(baseUnits, asset);
  }

  public static formatAmount(amount: string, asset: string): string {
    return formatAmount(amount, asset);
  }

  public static validateTransactionParams(params: TransactionParams): void {
    if (!params.asset) {
      throw new Error('Asset is required');
    }
    
    // Amount validation depends on transaction type
    if (params.useMsgDeposit) {
      // For MsgDeposit, amount can be 0 (e.g., memoless registration)
      // Just ensure amount is provided and not negative
      if (!params.amount || parseFloat(params.amount) < 0) {
        throw new Error('Amount must be zero or greater for MsgDeposit transactions');
      }
      if (!params.memo) {
        throw new Error('Memo is required for MsgDeposit transactions');
      }
    } else {
      // For MsgSend, amount must be > 0
      if (!params.amount || parseFloat(params.amount) <= 0) {
        throw new Error('Amount must be greater than zero for send transactions');
      }
      if (!params.toAddress) {
        throw new Error('To address is required for MsgSend transactions');
      }
    }
    // Note: memo is optional for both MsgSend and MsgDeposit (but required for MsgDeposit above)
  }

  public async setupCosmosClient(walletInfo: WalletInfo): Promise<{ client: SigningStargateClient; signerAddress: string }> {
    const signer = await DirectSecp256k1HdWallet.fromMnemonic(walletInfo.mnemonic, {
      prefix: this.getAddressPrefix(),
      hdPaths: [stringToPath(TransactionService.THORCHAIN_HD_PATH)]
    });

    const accounts = await signer.getAccounts();
    const signerAddress = accounts[0].address;

    // For now, let's use standard registry without custom MsgDeposit
    // We'll use MsgSend to THORChain module instead
    const registry = new Registry();

    // Force fresh connection to avoid sequence caching issues
    console.log('🔗 Connecting to RPC endpoint:', this.getRpcEndpoint());
    const client = await SigningStargateClient.connectWithSigner(
      this.getRpcEndpoint(),
      signer,
      { registry }
    );

    return { client, signerAddress };
  }

  public prepareMsgSend(fromAddress: string, params: TransactionParams): PreparedTransaction {
    const denom = TransactionService.getAssetDenom(params.asset);
    
    // CRITICAL: params.amount MUST be in NORMALIZED UNITS (user input)
    // Converting to BASE UNITS for blockchain transaction
    const coin: Coin = {
      denom,
      amount: TransactionService.convertToBaseUnits(params.amount, params.asset)
    };

    const message: TransactionMessage = {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        fromAddress,
        toAddress: params.toAddress!,
        amount: [coin]
      }
    };

    return { message, coin, denom };
  }

  public prepareMsgDeposit(fromAddress: string, params: TransactionParams): PreparedTransaction {
    const denom = TransactionService.getAssetDenom(params.asset);
    
    // CRITICAL: params.amount MUST be in NORMALIZED UNITS (user input)
    // Converting to BASE UNITS for blockchain transaction
    const coin: Coin = {
      denom,
      amount: TransactionService.convertToBaseUnits(params.amount, params.asset)
    };

    const message: TransactionMessage = {
      typeUrl: MsgDeposit.typeUrl,
      value: {
        coins: [coin],
        memo: params.memo || "",
        signer: fromAddress
      }
    };

    return { message, coin, denom };
  }

  public async prepareMsgDepositToModule(fromAddress: string, params: TransactionParams): Promise<PreparedTransaction> {
    // Alternative: Use MsgSend to THORChain module (equivalent to MsgDeposit)
    const denom = TransactionService.getAssetDenom(params.asset);
    const moduleAddress = await this.getThorchainModuleAddress();
    
    // CRITICAL: params.amount MUST be in NORMALIZED UNITS (user input)
    // Converting to BASE UNITS for blockchain transaction
    const coin: Coin = {
      denom,
      amount: TransactionService.convertToBaseUnits(params.amount, params.asset)
    };

    const message: TransactionMessage = {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        fromAddress,
        toAddress: moduleAddress,
        amount: [coin]
      }
    };

    return { message, coin, denom };
  }

  public static getDefaultFee(): TransactionFee {
    return {
      amount: [{ denom: "rune", amount: "2000000" }], // 0.02 RUNE (2M base units)
      gas: "50000000"
    };
  }

  public async broadcastTransaction(
    walletInfo: WalletInfo, 
    params: TransactionParams
  ): Promise<TransactionResponse> {
    // Validate parameters
    TransactionService.validateTransactionParams(params);

    // Setup CosmJS client
    const { client, signerAddress } = await this.setupCosmosClient(walletInfo);
    
    // DEBUG: Force fresh account query to check sequence with retry
    let currentSequence: number | undefined;
    try {
      console.log('🔍 Querying fresh account info for address:', signerAddress);
      const account = await client.getAccount(signerAddress);
      currentSequence = account?.sequence;
      console.log('🔍 DEBUG: Fresh account info from blockchain:', {
        address: signerAddress,
        accountNumber: account?.accountNumber,
        sequence: currentSequence,
        network: this.networkService.getCurrentNetwork(),
        rpcEndpoint: this.getRpcEndpoint()
      });
    } catch (error) {
      console.warn('⚠️ Could not fetch account info for debugging:', error);
    }

    // Prepare transaction message
    let preparedTx: PreparedTransaction;
    
    if (params.useMsgDeposit) {
      // Use MsgSend to THORChain module address (equivalent to MsgDeposit)
      preparedTx = await this.prepareMsgDepositToModule(signerAddress, params);
    } else {
      preparedTx = this.prepareMsgSend(signerAddress, params);
    }

    // Get fee
    const fee = TransactionService.getDefaultFee();

    // Sign and broadcast (memo is supported for both MsgSend and MsgDeposit)
    try {
      // CRITICAL: Query account info RIGHT before signing to see what sequence CosmJS will use
      console.log('🎯 About to call signAndBroadcast - querying sequence CosmJS will use...');
      const preSignAccount = await client.getAccount(signerAddress);
      console.log('🎯 PRE-SIGN: CosmJS will use sequence:', preSignAccount?.sequence);
      
      const response = await client.signAndBroadcast(
        signerAddress,
        [preparedTx.message],
        fee,
        params.memo || ""
      );

      if (response.code !== 0) {
        throw new Error(`Transaction failed: ${response.rawLog}`);
      }

      console.log('✅ Transaction broadcast successful:', response.transactionHash);
      return {
        code: response.code,
        transactionHash: response.transactionHash,
        rawLog: response.rawLog,
        events: response.events as any[]
      };
    } catch (error) {
      console.error('❌ Broadcasting error:', error);
      
      // Check if this is the "tx already exists in cache" error
      if (error instanceof Error && error.message.includes('tx already exists in cache')) {
        console.log('💡 Transaction already exists in cache - this indicates the transaction was previously successful');
        console.log('🔍 This is not an error - the transaction is already submitted to the network');
        // We can't recover the original transaction hash, so we need to handle this gracefully
        throw new Error('Transaction already submitted. Please check your transaction history for the confirmation.');
      }
      
      // Check for sequence mismatch and retry once
      if (error instanceof Error && error.message.includes('account sequence mismatch')) {
        console.log('🔄 Sequence mismatch detected - attempting retry with fresh account info...');
        
        try {
          // Wait a moment for any pending transactions to settle
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Create completely fresh client connection
          const { client: freshClient, signerAddress: freshSigner } = await this.setupCosmosClient(walletInfo);
          
          // Query fresh account info again
          const freshAccount = await freshClient.getAccount(freshSigner);
          console.log('🔄 RETRY: Fresh account sequence:', freshAccount?.sequence);
          
          // If we're still getting the wrong sequence, there's an RPC caching issue
          if (freshAccount?.sequence === currentSequence) {
            console.warn('⚠️ RPC still returning stale sequence after retry - this indicates RPC caching issues');
          }
          
          // Retry the broadcast with fresh client
          const retryResponse = await freshClient.signAndBroadcast(
            freshSigner,
            [preparedTx.message],
            fee,
            params.memo || ""
          );

          if (retryResponse.code !== 0) {
            throw new Error(`Retry transaction failed: ${retryResponse.rawLog}`);
          }

          console.log('✅ RETRY successful:', retryResponse.transactionHash);
          return {
            code: retryResponse.code,
            transactionHash: retryResponse.transactionHash,
            rawLog: retryResponse.rawLog,
            events: retryResponse.events as any[]
          };
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
          throw new Error(`Transaction failed after retry: ${(retryError as Error).message}`);
        }
      }
      
      throw error;
    }
  }

  public async estimateGas(
    walletInfo: WalletInfo, 
    params: TransactionParams
  ): Promise<string> {
    try {
      // Setup CosmJS client
      const { client, signerAddress } = await this.setupCosmosClient(walletInfo);

      // Prepare transaction message
      let preparedTx: PreparedTransaction;
      
      if (params.useMsgDeposit) {
        // Use MsgSend to THORChain module address (equivalent to MsgDeposit)
        preparedTx = await this.prepareMsgDepositToModule(signerAddress, params);
      } else {
        preparedTx = this.prepareMsgSend(signerAddress, params);
      }

      // Simulate transaction to estimate gas
      const gasEstimate = await client.simulate(
        signerAddress,
        [preparedTx.message],
        params.memo || ""
      );

      // Add 20% buffer
      return Math.ceil(gasEstimate * 1.2).toString();
    } catch (error) {
      console.warn('Gas estimation failed, using default gas limit:', error);
      return TransactionService.getDefaultFee().gas;
    }
  }
}