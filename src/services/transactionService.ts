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
    if (!params.amount || parseFloat(params.amount) <= 0) {
      throw new Error('Amount must be greater than zero');
    }
    if (params.useMsgDeposit && !params.memo) {
      throw new Error('Memo is required for MsgDeposit transactions');
    }
    if (!params.useMsgDeposit && !params.toAddress) {
      throw new Error('To address is required for MsgSend transactions');
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
    const response = await client.signAndBroadcast(
      signerAddress,
      [preparedTx.message],
      fee,
      params.memo || ""
    );

    if (response.code !== 0) {
      throw new Error(`Transaction failed: ${response.rawLog}`);
    }

    return {
      code: response.code,
      transactionHash: response.transactionHash,
      rawLog: response.rawLog,
      events: response.events as any[]
    };
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