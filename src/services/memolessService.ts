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

// Legacy helper functions for backward compatibility
export class MemolessLegacyHelpers {
  private memolessService: MemolessService;

  constructor(memolessService: MemolessService) {
    this.memolessService = memolessService;
  }

  // Legacy validation functions matching the exact names from docs
  validateAmountToReference(amount: string, referenceID: string, inAssetDecimals?: number): boolean {
    const decimals = inAssetDecimals || this.memolessService.getAssetDecimals('BTC.BTC'); // Default fallback
    return this.memolessService.validateAmountToReference(amount, referenceID, decimals);
  }

  validateAmountAboveInboundDustThreshold(amount: string, dustThreshold?: number): boolean {
    const threshold = dustThreshold || 0.00001; // Default fallback
    return this.memolessService.validateAmountAboveInboundDustThreshold(amount, threshold * 1e8); // Convert to raw units
  }

  // Legacy amount formatting that appends reference ID exactly as specified
  formatAmountWithReferenceID(
    userInput: string, 
    referenceID: string, 
    inAssetDecimals: number
  ): string {
    const result = this.memolessService.formatAmountWithReference(userInput, referenceID, inAssetDecimals);
    return result.finalAmount;
  }

  // Helper to check if amount needs truncation (no rounding)
  truncateAmountToDecimals(amount: string, maxDecimals: number): string {
    const [integerPart, decimalPart = ''] = amount.split('.');
    if (decimalPart.length <= maxDecimals) {
      return amount;
    }
    // Truncate decimals without rounding
    const truncatedDecimals = decimalPart.substring(0, maxDecimals);
    return `${integerPart}.${truncatedDecimals}`;
  }

  // Get the last N digits from decimal part
  getLastDecimalDigits(amount: string, digitCount: number, assetDecimals: number): string {
    const [, decimalPart = ''] = amount.split('.');
    const paddedDecimals = decimalPart.padEnd(assetDecimals, '0');
    return paddedDecimals.slice(-digitCount);
  }

  // Example generation for docs validation
  generateExampleAmounts(referenceID: string, inAssetDecimals: number): {
    examples: string[];
    explanation: string;
  } {
    const refLength = referenceID.length;
    const examples: string[] = [];
    
    // Generate examples with different user amounts
    const baseAmounts = ['1', '0.5', '10.25', '100'];
    
    baseAmounts.forEach(baseAmount => {
      const result = this.memolessService.formatAmountWithReference(baseAmount, referenceID, inAssetDecimals);
      if (result.isValid) {
        examples.push(`${baseAmount} → ${result.finalAmount}`);
      }
    });

    const explanation = `For referenceID '${referenceID}' (${refLength} digits) with ${inAssetDecimals} decimals: ` +
      `The last ${refLength} decimal digits must be exactly '${referenceID}'.`;

    return { examples, explanation };
  }
}

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
        amount: '0', // Zero amount for memoless registration - memo contains the intent
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

  // Step 4: Check reference ID after registration using /thorchain/memo/{MsgDepositTXID}
  public async getMemoReference(txId: string): Promise<MemolessRegistration> {
    try {
      console.log(`Retrieving memo reference for transaction: ${txId}`);
      
      // Wait for transaction to be confirmed (6 seconds per THORChain block time)
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      const response = await this.thorchainApiService.getMemoReference(txId);
      
      console.log('Memo reference retrieved:', response);
      
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

  // Retry mechanism for reference ID retrieval with exponential backoff
  public async getMemoReferenceWithRetry(
    txId: string, 
    maxRetries: number = 5,
    initialDelay: number = 6000
  ): Promise<MemolessRegistration> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} to retrieve memo reference for ${txId}`);
        
        if (attempt > 1) {
          // Exponential backoff: 6s, 12s, 24s, 48s, 96s
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.log(`Waiting ${delay/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Initial delay
          await new Promise(resolve => setTimeout(resolve, initialDelay));
        }
        
        const response = await this.thorchainApiService.getMemoReference(txId);
        
        if (response && response.reference) {
          console.log(`Successfully retrieved memo reference on attempt ${attempt}:`, response);
          return {
            asset: response.asset,
            memo: response.memo,
            reference: response.reference,
            height: response.height,
            registrationHash: response.registration_hash,
            registeredBy: response.registered_by
          };
        } else {
          throw new Error('Reference ID not found in response');
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          break;
        }
      }
    }
    
    throw new Error(`Failed to retrieve memo reference after ${maxRetries} attempts: ${lastError?.message}`);
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

  // Step 7: Validate amount with reference encoding (per docs lines 191-196)
  public validateAmountToReference(
    amount: string, 
    referenceID: string, 
    assetDecimals: number
  ): boolean {
    try {
      let amountStr = amount.toString();
      
      // If amount has more decimals than assetDecimals, remove extra digits (DO NOT ROUND)
      const [integerPart, decimalPart = ''] = amountStr.split('.');
      let processedDecimalPart = decimalPart;
      
      if (decimalPart.length > assetDecimals) {
        processedDecimalPart = decimalPart.substring(0, assetDecimals);
        console.log(`Amount truncated from ${amountStr} to ${integerPart}.${processedDecimalPart}`);
      }
      
      // Pad with zeros to match assetDecimals
      const paddedDecimals = processedDecimalPart.padEnd(assetDecimals, '0');
      
      // Get last referenceID.length digits
      const referenceLength = referenceID.length;
      const lastDigits = paddedDecimals.slice(-referenceLength);
      
      // Verify that it equals the referenceID exactly
      const isValid = lastDigits === referenceID;
      
      console.log('validateAmountToReference:', {
        amount: amountStr,
        processedAmount: `${integerPart}.${paddedDecimals}`,
        referenceID,
        lastDigits,
        isValid
      });
      
      return isValid;
    } catch (error) {
      console.error('Error validating amount to reference:', error);
      return false;
    }
  }

  // Helper: validateAmountAboveInboundDustThreshold (per docs line 197-198)
  public validateAmountAboveInboundDustThreshold(
    amount: string, 
    dustThreshold: number
  ): boolean {
    try {
      const numericAmount = parseFloat(amount);
      const normalizedDustThreshold = dustThreshold / 1e8; // Convert from raw to asset units
      const isAboveThreshold = numericAmount > normalizedDustThreshold;
      
      console.log('validateAmountAboveInboundDustThreshold:', {
        amount: numericAmount,
        dustThreshold: normalizedDustThreshold,
        isAboveThreshold
      });
      
      return isAboveThreshold;
    } catch (error) {
      console.error('Error validating dust threshold:', error);
      return false;
    }
  }

  // Format user input with reference ID (per docs lines 260-271)
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

      // Calculate reference encoding constraints
      const referenceLength = referenceID.length;
      const maxUserDecimals = Math.max(0, assetDecimals - referenceLength);
      
      // Handle user input decimal precision
      const [integerPart, decimalPart = ''] = inputStr.split('.');
      let processedDecimalPart = decimalPart;
      
      // Truncate if user has too many decimals
      if (decimalPart.length > maxUserDecimals) {
        processedDecimalPart = decimalPart.substring(0, maxUserDecimals);
        warnings.push(`Amount truncated to ${maxUserDecimals} decimals to fit reference ID`);
      }

      // Build final amount: integer + user decimals + padding zeros + reference ID
      const zerosNeeded = Math.max(0, assetDecimals - processedDecimalPart.length - referenceLength);
      const finalDecimalPart = processedDecimalPart + '0'.repeat(zerosNeeded) + referenceID;
      const finalAmount = `${integerPart}.${finalDecimalPart}`;

      // Validate that the base amount is meaningful
      const finalAmountNum = parseFloat(finalAmount);
      const referenceValue = parseInt(referenceID) / Math.pow(10, assetDecimals);
      const baseAmount = finalAmountNum - referenceValue;
      
      if (baseAmount <= 0) {
        return {
          isValid: false,
          processedInput: inputStr,
          finalAmount: finalAmount,
          equivalentUSD: '0.00',
          warnings: warnings,
          errors: ['Amount is too small - the base amount (excluding reference ID) must be greater than 0']
        };
      }

      console.log('formatAmountWithReference:', {
        userInput: inputStr,
        referenceID,
        assetDecimals,
        maxUserDecimals,
        zerosNeeded,
        finalAmount,
        baseAmount
      });

      return {
        isValid: true,
        processedInput: inputStr,
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

  // Get current THORChain block and calculate expiry time (per docs lines 236-257)
  public async getExpiryTimeEstimate(expiryBlock: string): Promise<{ 
    currentBlock: number; 
    expiryBlock: number; 
    timeRemaining: string; 
    blocksRemaining: number 
  }> {
    try {
      // Get current THORChain block using /thorchain/lastblock/THORCHAIN
      const blockData = await this.thorchainApiService.getCurrentBlock();
      const currentBlock = blockData[0]?.thorchain || 0;
      const expiryBlockNum = parseInt(expiryBlock);
      const blocksRemaining = expiryBlockNum - currentBlock;
      const timeRemaining = this.calculateBlockTimeEstimate(currentBlock, expiryBlockNum);
      
      console.log('Expiry time calculation:', {
        currentBlock,
        expiryBlock: expiryBlockNum,
        blocksRemaining,
        timeRemaining
      });
      
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

  // Helper functions for legacy memoless compatibility
  
  // Convert USD amount to asset amount using price
  public convertUSDToAsset(usdAmount: string, priceUSD: number): string {
    try {
      const usd = parseFloat(usdAmount);
      if (priceUSD <= 0) return '0';
      const assetAmount = usd / priceUSD;
      return assetAmount.toString();
    } catch (error) {
      console.error('Error converting USD to asset:', error);
      return '0';
    }
  }

  // Convert asset amount to USD using price
  public convertAssetToUSD(assetAmount: string, priceUSD: number): string {
    try {
      const asset = parseFloat(assetAmount);
      const usdValue = asset * priceUSD;
      return usdValue.toFixed(2);
    } catch (error) {
      console.error('Error converting asset to USD:', error);
      return '0.00';
    }
  }

  // Get asset decimals with fallback to 8
  public getAssetDecimals(asset: string): number {
    const [chain] = asset.split('.');
    const decimalMap: { [key: string]: number } = {
      'BTC': 8,
      'ETH': 18,
      'LTC': 8,
      'BCH': 8,
      'BNB': 8,
      'AVAX': 18,
      'ATOM': 6,
      'DOGE': 8,
      'BSC': 18,
      'GAIA': 6,
      'BASE': 18,
      'XRP': 6
    };
    return decimalMap[chain] || 8;
  }

  // Extract chain from asset identifier
  public getAssetChain(asset: string): string {
    return asset.split('.')[0];
  }

  // Check if asset is a gas asset (not a token)
  public isGasAsset(asset: string): boolean {
    // Gas assets don't have contract addresses (no hyphen in asset part)
    const parts = asset.split('.');
    if (parts.length !== 2) return false;
    
    const [chain, assetPart] = parts;
    return !assetPart.includes('-');
  }

  // Normalize raw amount to asset units (divide by 10^decimals)
  public normalizeRawAmount(rawAmount: string, decimals: number): string {
    try {
      const raw = parseFloat(rawAmount);
      const normalized = raw / Math.pow(10, decimals);
      return normalized.toString();
    } catch (error) {
      console.error('Error normalizing raw amount:', error);
      return '0';
    }
  }

  // Convert asset units to raw amount (multiply by 10^decimals)
  public denormalizeToRawAmount(assetAmount: string, decimals: number): string {
    try {
      // Use string manipulation to avoid floating point precision issues
      const [integerPart = '0', decimalPart = ''] = assetAmount.split('.');
      const paddedDecimalPart = decimalPart.padEnd(decimals, '0').substring(0, decimals);
      const rawAmountStr = integerPart + paddedDecimalPart;
      return parseInt(rawAmountStr.replace(/^0+/, '') || '0').toString();
    } catch (error) {
      console.error('Error denormalizing to raw amount:', error);
      return '0';
    }
  }

  // Format transaction hash for explorer URL (strip 0x prefix if present)
  public formatTxHashForExplorer(txHash: string): string {
    if (txHash.startsWith('0x')) {
      return txHash.substring(2);
    }
    return txHash;
  }

  // Generate explorer URL for transaction tracking
  public getExplorerUrl(txHash: string, network: 'mainnet' | 'stagenet' = 'stagenet'): string {
    const cleanHash = this.formatTxHashForExplorer(txHash);
    if (network === 'mainnet') {
      return `https://thorchain.net/tx/${cleanHash}`;
    } else {
      return `https://stagenet.thorchain.net/tx/${cleanHash}`;
    }
  }
}