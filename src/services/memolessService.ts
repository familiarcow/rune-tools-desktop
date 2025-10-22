import { ThorchainApiService } from './thorchainApiService';
import { TransactionService } from './transactionService';
import { NetworkService } from './networkService';
import { Pool } from '../types/thornode';
import { WalletInfo } from '../types/wallet';
import * as QRCode from 'qrcode';
import { 
  MemolessAsset, 
  MemolessRegistration, 
  InboundAddress, 
  AmountValidationResult, 
  QRCodeData,
  MemolessFlowState,
  RegistrationConfirmation,
  MemoCheckResponse
} from '../types/memoless';

export class MemolessService {
  private thorchainApiService: ThorchainApiService;
  private transactionService: TransactionService;
  private networkService: NetworkService;

  constructor(networkService?: NetworkService) {
    this.networkService = networkService || new NetworkService();
    this.thorchainApiService = new ThorchainApiService(this.networkService);
    this.transactionService = new TransactionService(this.networkService);
  }

  public setNetwork(network: 'mainnet' | 'stagenet'): void {
    this.networkService.setNetwork(network);
    this.thorchainApiService.setNetwork(network);
    this.transactionService.setNetwork(network);
  }

  // Step 2: Get valid assets for registration (excluding tokens)
  public async getValidAssetsForRegistration(): Promise<MemolessAsset[]> {
    try {
      const pools = await this.thorchainApiService.getPools();
      
      // Filter: Status = Available, exclude tokens, exclude ALL THOR chain assets
      const validAssets = pools
        .filter(pool => pool.status === 'Available')
        .filter(pool => !this.isToken(pool.asset))
        .filter(pool => !pool.asset.startsWith('THOR.')) // Remove all THOR chain assets
        .map(pool => this.convertPoolToMemolessAsset(pool));

      // Sort by descending balance_rune
      validAssets.sort((a, b) => b.balanceRune - a.balanceRune);

      return validAssets;
    } catch (error) {
      console.error('Error fetching valid assets:', error);
      throw new Error(`Failed to fetch valid assets: ${(error as Error).message}`);
    }
  }

  // Check if asset is a token (has contract address)
  private isToken(asset: string): boolean {
    // Asset format: {chain}.{asset}-{contract}
    // If there's a '-{contract}' at the end, it's a token
    const parts = asset.split('.');
    if (parts.length === 2) {
      const assetPart = parts[1];
      return assetPart.includes('-');
    }
    return false;
  }

  // Convert pool data to MemolessAsset
  private convertPoolToMemolessAsset(pool: Pool): MemolessAsset {
    return {
      asset: pool.asset,
      status: pool.status,
      decimals: pool.decimal || 8,
      priceUSD: pool.asset_price_usd || 0,
      balanceRune: pool.balance_rune || 0,
      isToken: false // Already filtered out tokens
    };
  }


  // Step 3: Register memo with MsgDeposit
  public async registerMemo(
    walletInfo: WalletInfo, 
    asset: string, 
    memo: string
  ): Promise<string> {
    try {
      const registrationMemo = `REFERENCE:${asset}:${memo}`;
      
      const transactionParams = {
        asset: 'THOR.RUNE',
        amount: '1', // Minimal amount for registration (1 RUNE = 1e8)
        useMsgDeposit: true,
        memo: registrationMemo
      };

      const result = await this.transactionService.broadcastTransaction(walletInfo, transactionParams);
      
      if (result.code !== 0) {
        throw new Error(`Registration failed: ${result.rawLog}`);
      }

      return result.transactionHash;
    } catch (error) {
      console.error('Error registering memo:', error);
      throw new Error(`Failed to register memo: ${(error as Error).message}`);
    }
  }

  // Step 4: Check reference ID after registration
  public async getMemoReference(txId: string): Promise<MemolessRegistration> {
    try {
      // Wait 6 seconds for transaction to confirm
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      const response = await this.thorchainApiService.getMemoReference(txId);
      
      return {
        asset: response.asset,
        memo: response.memo,
        reference: response.reference,
        height: response.height,
        registrationHash: response.registration_hash,
        registeredBy: response.registered_by
      };
    } catch (error) {
      console.error('Error fetching memo reference:', error);
      throw new Error(`Failed to fetch memo reference: ${(error as Error).message}`);
    }
  }

  // Step 4.5: Validate memo registration with amount
  public async validateMemoRegistration(
    asset: string,
    exactAmount: string,
    decimals: number,
    expectedMemo: string,
    expectedReference: string
  ): Promise<{ isValid: boolean; memoCheck: MemoCheckResponse; errors: string[] }> {
    try {
      
      // Convert exactAmount from asset units to raw_amount 
      // Use string manipulation to avoid floating point precision issues
      const [integerPart = '0', decimalPart = ''] = exactAmount.split('.');
      const paddedDecimalPart = decimalPart.padEnd(decimals, '0');
      const rawAmountStr = integerPart + paddedDecimalPart;
      const rawAmount = parseInt(rawAmountStr.replace(/^0+/, '') || '0');
      
      
      const apiUrl = `/thorchain/memo/check/${asset}/${rawAmount}`;
      
      const memoCheck = await this.thorchainApiService.checkMemoValidation(asset, rawAmount.toString());
      const errors: string[] = [];

      // Validate reference matches (as specified in memoless.md line 283)
      if (memoCheck.reference !== expectedReference) {
        const error = `Reference mismatch: expected ${expectedReference}, got ${memoCheck.reference}`;
        console.error(`VALIDATION FAILED: ${error}`);
        console.error(`Validation API call URL: ${apiUrl}`);
        console.error(`API Response:`, JSON.stringify(memoCheck, null, 2));
        errors.push(error);
      }

      // Validate memo matches (as specified in memoless.md line 284)
      if (memoCheck.memo !== expectedMemo) {
        const error = `Memo mismatch: expected ${expectedMemo}, got ${memoCheck.memo}`;
        console.error(`VALIDATION FAILED: ${error}`);
        console.error(`Validation API call URL: ${apiUrl}`);
        console.error(`API Response:`, JSON.stringify(memoCheck, null, 2));
        errors.push(error);
      }

      // If either check fails, abort and log error (as specified in memoless.md line 285)
      if (errors.length > 0) {
        console.error(`MEMO VALIDATION ABORTED - ${errors.length} validation errors found`);
        return {
          isValid: false,
          memoCheck,
          errors
        };
      }


      return {
        isValid: true,
        memoCheck,
        errors: []
      };
    } catch (error) {
      console.error('ERROR in validateMemoRegistration:', error);
      return {
        isValid: false,
        memoCheck: {} as MemoCheckResponse,
        errors: [`Failed to validate memo registration: ${(error as Error).message}`]
      };
    }
  }

  // Step 5: Get inbound addresses
  public async getInboundAddresses(): Promise<InboundAddress[]> {
    try {
      return await this.thorchainApiService.getInboundAddresses();
    } catch (error) {
      console.error('Error fetching inbound addresses:', error);
      throw new Error(`Failed to fetch inbound addresses: ${(error as Error).message}`);
    }
  }

  // Step 6: Get inbound address for specific asset
  public getInboundAddressForAsset(
    inboundAddresses: InboundAddress[], 
    asset: string
  ): { address: string; dustThreshold: number } {
    const chain = asset.split('.')[0]; // Extract chain from asset (e.g., 'BTC' from 'BTC.BTC')
    
    const inboundAddress = inboundAddresses.find(addr => addr.chain === chain);
    
    if (!inboundAddress) {
      throw new Error(`No inbound address found for chain: ${chain}`);
    }

    return {
      address: inboundAddress.address,
      dustThreshold: parseFloat(inboundAddress.dust_threshold) / 1e8 // Normalize from raw to asset units
    };
  }

  // Step 7: Validate amount with reference encoding
  public validateAmountToReference(
    amount: string, 
    referenceID: string, 
    assetDecimals: number
  ): boolean {
    try {
      let amountStr = amount.toString();
      
      // Ensure decimal point exists
      if (amountStr.indexOf('.') === -1) {
        amountStr += '.';
      }
      
      // Pad with zeros to match assetDecimals
      const [integerPart, decimalPart = ''] = amountStr.split('.');
      const paddedDecimals = decimalPart.padEnd(assetDecimals, '0').substring(0, assetDecimals);
      
      // Get last referenceID.length digits
      const referenceLength = referenceID.length;
      const lastDigits = paddedDecimals.slice(-referenceLength);
      
      return lastDigits === referenceID;
    } catch (error) {
      console.error('Error validating amount to reference:', error);
      return false;
    }
  }

  // Format user input with reference ID
  public formatAmountWithReference(
    userInput: string, 
    referenceID: string, 
    assetDecimals: number
  ): AmountValidationResult {
    try {
      const warnings: string[] = [];
      const errors: string[] = [];
      
      let inputStr = userInput.toString().trim();
      
      // Basic validation
      const numericInput = parseFloat(inputStr);
      if (isNaN(numericInput) || numericInput <= 0) {
        return {
          isValid: false,
          processedInput: inputStr,
          finalAmount: '',
          equivalentUSD: '0.00',
          warnings: [],
          errors: ['Amount must be a valid positive number']
        };
      }

      // Handle decimal precision
      const referenceLength = referenceID.length;
      const maxUserDecimals = Math.max(0, assetDecimals - referenceLength);
      
      if (inputStr.indexOf('.') !== -1) {
        const decimalPart = inputStr.split('.')[1];
        if (decimalPart.length > maxUserDecimals) {
          inputStr = inputStr.substring(0, inputStr.indexOf('.') + maxUserDecimals + 1);
          warnings.push('Amount truncated to fit reference ID requirements');
        }
      }

      // Ensure decimal point
      if (inputStr.indexOf('.') === -1) {
        inputStr += '.';
      }

      // Build final amount: user input + zeros + reference ID
      const [integerPart, decimalPart = ''] = inputStr.split('.');
      const zerosNeeded = Math.max(0, assetDecimals - decimalPart.length - referenceLength);
      const finalAmount = inputStr + '0'.repeat(zerosNeeded) + referenceID;

      // Validate that the base amount (excluding reference digits) is greater than 0
      const finalAmountNum = parseFloat(finalAmount);
      const referenceValue = parseInt(referenceID) / Math.pow(10, assetDecimals);
      const baseAmount = finalAmountNum - referenceValue;
      
      if (baseAmount <= 0) {
        return {
          isValid: false,
          processedInput: inputStr.replace(/\.$/, ''),
          finalAmount: finalAmount,
          equivalentUSD: '0.00',
          warnings: warnings,
          errors: ['Amount is too small - the base amount (excluding reference ID) must be greater than 0']
        };
      }

      return {
        isValid: true,
        processedInput: inputStr.replace(/\.$/, ''), // Remove trailing dot for display
        finalAmount: finalAmount,
        equivalentUSD: '0.00', // Will be calculated separately
        warnings: warnings,
        errors: []
      };
    } catch (error) {
      return {
        isValid: false,
        processedInput: userInput,
        finalAmount: '',
        equivalentUSD: '0.00',
        warnings: [],
        errors: [`Error processing amount: ${(error as Error).message}`]
      };
    }
  }

  // Validate amount against dust threshold
  public validateDustThreshold(amount: string, dustThreshold: number): boolean {
    const numericAmount = parseFloat(amount);
    return numericAmount > dustThreshold;
  }

  // Comprehensive validation with dust threshold and base amount checks
  public validateAmountForDeposit(
    userInput: string,
    referenceID: string,
    assetDecimals: number,
    dustThreshold: number
  ): AmountValidationResult {
    // First run the basic formatting and reference validation
    const basicValidation = this.formatAmountWithReference(userInput, referenceID, assetDecimals);
    
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // Additional dust threshold validation
    const finalAmountNum = parseFloat(basicValidation.finalAmount);
    if (!this.validateDustThreshold(basicValidation.finalAmount, dustThreshold)) {
      return {
        ...basicValidation,
        isValid: false,
        errors: [...basicValidation.errors, `Amount ${basicValidation.finalAmount} is below the dust threshold of ${dustThreshold}. Please increase your deposit amount.`]
      };
    }

    // All validations passed
    return basicValidation;
  }

  // Step 8: Generate QR code data
  public async generateQRCodeData(chain: string, address: string, amount: string): Promise<QRCodeData> {
    const chainFormatMap: { [key: string]: string } = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BSC': 'ethereum',
      'LTC': 'litecoin',
      'BCH': 'bitcoincash',
      'TRON': 'tron',
      'BASE': 'ethereum',
      'GAIA': 'cosmos',
      'DOGE': 'dogecoin',
      'AVAX': 'avalanche',
      'XRP': 'xrp'
    };

    const qrFormat = chainFormatMap[chain];
    let qrString: string;

    if (qrFormat) {
      if (chain === 'BASE') {
        qrString = `${qrFormat}:${address}@8453?value=${amount}`;
      } else if (chain === 'BSC') {
        qrString = `${qrFormat}:${address}@56?value=${amount}`;
      } else if (qrFormat === 'ethereum') {
        qrString = `${qrFormat}:${address}?value=${amount}`;
      } else {
        qrString = `${qrFormat}:${address}?amount=${amount}`;
      }
    } else {
      // Fallback for unknown chains - just encode the amount
      qrString = amount;
      console.warn(`Unknown chain ${chain} for QR code generation`);
    }

    // Generate the actual QR code image
    let qrCodeDataURL: string | undefined;
    try {
      qrCodeDataURL = await QRCode.toDataURL(qrString, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });
    } catch (error) {
      console.error('Error generating QR code image:', error);
      // QR code image generation failed, but we can still return the string data
    }

    return {
      chain: chain,
      address: address,
      amount: amount,
      qrString: qrString,
      qrCodeDataURL: qrCodeDataURL
    };
  }

  // Get user's RUNE balance for registration confirmation
  public async getUserRuneBalance(address: string): Promise<string> {
    try {
      const balances = await this.thorchainApiService.getWalletBalances(address);
      const runeBalance = balances.find(balance => balance.asset === 'rune');
      
      if (runeBalance) {
        // Convert from raw amount to RUNE (divide by 1e8)
        const runeAmount = parseFloat(runeBalance.amount) / 1e8;
        return runeAmount.toFixed(2);
      }
      
      return '0.00';
    } catch (error) {
      console.error('Error fetching RUNE balance:', error);
      return '0.00';
    }
  }

  // Calculate equivalent USD amount
  public calculateUSDEquivalent(amount: string, priceUSD: number): string {
    try {
      const numericAmount = parseFloat(amount);
      const usdValue = numericAmount * priceUSD;
      return usdValue.toFixed(2);
    } catch (error) {
      return '0.00';
    }
  }

  // Check if current network is stagenet
  public isStaging(): boolean {
    return this.networkService.getCurrentNetwork() === 'stagenet';
  }

  // Get current network display name
  public getCurrentNetworkDisplay(): string {
    const network = this.networkService.getCurrentNetwork();
    return network === 'stagenet' ? 'Stagenet' : 'Mainnet';
  }

  // Calculate estimated time until block expiry
  public calculateBlockTimeEstimate(currentBlock: number, expiryBlock: number): string {
    const blockDifference = expiryBlock - currentBlock;
    
    if (blockDifference <= 0) {
      return 'Expired';
    }
    
    // Each block is approximately 6 seconds
    const totalSeconds = blockDifference * 6;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    
    if (totalHours >= 1) {
      return `${totalHours}h`;
    } else if (totalMinutes >= 1) {
      return `${totalMinutes}m`;
    } else {
      return '<1m';
    }
  }

  // Get current THORChain block and calculate expiry time
  public async getExpiryTimeEstimate(expiryBlock: string): Promise<{ 
    currentBlock: number; 
    expiryBlock: number; 
    timeRemaining: string; 
    blocksRemaining: number 
  }> {
    try {
      const blockData = await this.thorchainApiService.getCurrentBlock();
      const currentBlock = blockData[0]?.thorchain || 0;
      const expiryBlockNum = parseInt(expiryBlock);
      const blocksRemaining = expiryBlockNum - currentBlock;
      const timeRemaining = this.calculateBlockTimeEstimate(currentBlock, expiryBlockNum);
      
      return {
        currentBlock: currentBlock,
        expiryBlock: expiryBlockNum,
        timeRemaining: timeRemaining,
        blocksRemaining: blocksRemaining
      };
    } catch (error) {
      console.error('Error calculating expiry time:', error);
      return {
        currentBlock: 0,
        expiryBlock: parseInt(expiryBlock),
        timeRemaining: 'Unknown',
        blocksRemaining: 0
      };
    }
  }
}