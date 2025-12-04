import * as bip39 from 'bip39';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { stringToPath } from '@cosmjs/crypto';
import { toBech32 } from '@cosmjs/encoding';
import { WalletInfo } from '../types/wallet';
import { NetworkService } from './networkService';

export class THORWalletService {
  private static readonly DERIVATION_PATH = "m/44'/931'/0'/0/0";
  private networkService: NetworkService;

  constructor(networkService?: NetworkService) {
    this.networkService = networkService || new NetworkService();
  }

  private getAddressPrefix(): string {
    return this.networkService.getNetworkConfigSync().addressPrefix;
  }

  public static async generateSeedPhrase(): Promise<string> {
    return bip39.generateMnemonic();
  }

  public static validateSeedPhrase(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  public async createWalletFromSeed(mnemonic: string): Promise<WalletInfo> {
    if (!THORWalletService.validateSeedPhrase(mnemonic)) {
      throw new Error('Invalid seed phrase');
    }

    // Derive addresses for both networks
    const mainnetAddress = await this.deriveAddressForNetwork(mnemonic, 'mainnet');
    const stagenetAddress = await this.deriveAddressForNetwork(mnemonic, 'stagenet');

    // Create wallet with current network's prefix to get pubkey
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: this.getAddressPrefix(),
      hdPaths: [stringToPath(THORWalletService.DERIVATION_PATH)]
    });

    const accounts = await wallet.getAccounts();
    const account = accounts[0];

    return {
      address: account.address, // Current network address
      mainnetAddress,
      stagenetAddress,
      publicKey: Buffer.from(account.pubkey).toString('hex'),
      mnemonic: mnemonic
    };
  }

  private async deriveAddressForNetwork(mnemonic: string, network: 'mainnet' | 'stagenet'): Promise<string> {
    const prefix = network === 'mainnet' ? 'thor' : 'sthor';
    
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: prefix,
      hdPaths: [stringToPath(THORWalletService.DERIVATION_PATH)]
    });

    const accounts = await wallet.getAccounts();
    return accounts[0].address;
  }

  public async deriveAddress(mnemonic: string): Promise<string> {
    const walletInfo = await this.createWalletFromSeed(mnemonic);
    return walletInfo.address;
  }

  public setNetwork(network: 'mainnet' | 'stagenet'): void {
    this.networkService.setNetwork(network);
  }

  public getCurrentNetwork(): string {
    return this.networkService.getCurrentNetwork();
  }

  public async getNetworkConfig() {
    return await this.networkService.getNetworkConfig();
  }

  public async getChainId(): Promise<string> {
    return await this.networkService.getChainId();
  }
}