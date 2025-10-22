import { SwapQuote } from '../types/thornode';
import { AssetChainService, AssetChainInfo } from './assetChainService';
import { TransactionParams } from '../types/transaction';
import { WalletInfo } from '../types/wallet';

export interface SwapConstructionInfo {
  quote: SwapQuote;
  fromAssetInfo: AssetChainInfo;
  toAssetInfo: AssetChainInfo;
  transactionMethod: 'MsgDeposit' | 'ExternalChain';
  expectedAmountOut: string;
  expectedAmountOutFormatted: string;
  expiryLocalTime: string;
  memo: string;
  fees: {
    totalFee: string;
    totalFeeFormatted: string;
    slippageBps: number;
    totalBps: number;
  };
  timing?: {
    inboundConfirmationMinutes?: number;
    outboundDelayMinutes?: number;
    totalSwapMinutes?: number;
  };
  transactionParams?: TransactionParams; // For MsgDeposit transactions
}

export class SwapConstructionService {
  
  /**
   * Analyze a swap quote and construct transaction information
   */
  public static constructSwapInfo(
    quote: SwapQuote,
    fromAsset: string,
    toAsset: string,
    amount: string
  ): SwapConstructionInfo {
    
    // Analyze both assets
    const fromAssetInfo = AssetChainService.analyzeAsset(fromAsset);
    const toAssetInfo = AssetChainService.analyzeAsset(toAsset);
    
    // Determine transaction method based on from_asset
    const transactionMethod = fromAssetInfo.requiresMsgDeposit ? 'MsgDeposit' : 'ExternalChain';
    
    // Format expected amount out
    const expectedAmountOutRaw = parseFloat(quote.expected_amount_out);
    const expectedAmountOutFormatted = this.formatAssetAmount(expectedAmountOutRaw, toAssetInfo.symbol);
    
    // Convert expiry to local time
    const expiryLocalTime = this.formatExpiryTime(quote.expiry);
    
    // Format fees
    const fees = this.formatFees(quote.fees, fromAssetInfo.symbol);
    
    // Format timing information
    const timing = this.formatTiming(quote);
    
    // Create transaction parameters for MsgDeposit if needed
    let transactionParams: TransactionParams | undefined;
    if (transactionMethod === 'MsgDeposit') {
      transactionParams = {
        asset: fromAssetInfo.asset,
        amount: amount,
        memo: quote.memo,
        useMsgDeposit: true
      };
    }
    
    return {
      quote,
      fromAssetInfo,
      toAssetInfo,
      transactionMethod,
      expectedAmountOut: quote.expected_amount_out,
      expectedAmountOutFormatted,
      expiryLocalTime,
      memo: quote.memo,
      fees,
      timing,
      transactionParams
    };
  }
  
  /**
   * Format asset amount with proper decimals and symbol
   */
  private static formatAssetAmount(amountRaw: number, symbol: string): string {
    // Convert from 1e8 decimals
    const amount = amountRaw / 1e8;
    
    if (amount >= 1) {
      return `${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      })} ${symbol}`;
    } else {
      return `${amount.toFixed(8)} ${symbol}`;
    }
  }
  
  /**
   * Convert UNIX timestamp to local time string
   */
  private static formatExpiryTime(expiry: number): string {
    const expiryDate = new Date(expiry * 1000); // Convert from seconds to milliseconds
    
    return expiryDate.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }
  
  /**
   * Format fee information
   */
  private static formatFees(fees: any, assetSymbol: string): {
    totalFee: string;
    totalFeeFormatted: string;
    slippageBps: number;
    totalBps: number;
  } {
    if (!fees) {
      return {
        totalFee: '0',
        totalFeeFormatted: `0 ${assetSymbol}`,
        slippageBps: 0,
        totalBps: 0
      };
    }
    
    const totalFee = fees.total || '0';
    const totalFeeNum = parseFloat(totalFee) / 1e8;
    const totalFeeFormatted = this.formatAssetAmount(parseFloat(totalFee), assetSymbol);
    
    return {
      totalFee,
      totalFeeFormatted,
      slippageBps: fees.slippage_bps || 0,
      totalBps: fees.total_bps || 0
    };
  }
  
  /**
   * Format timing information
   */
  private static formatTiming(quote: SwapQuote): {
    inboundConfirmationMinutes?: number;
    outboundDelayMinutes?: number;
    totalSwapMinutes?: number;
  } | undefined {
    
    const timing: any = {};
    
    if (quote.inbound_confirmation_seconds) {
      timing.inboundConfirmationMinutes = Math.round(quote.inbound_confirmation_seconds / 60);
    }
    
    if (quote.outbound_delay_seconds) {
      timing.outboundDelayMinutes = Math.round(quote.outbound_delay_seconds / 60);
    }
    
    if (quote.total_swap_seconds) {
      timing.totalSwapMinutes = Math.round(quote.total_swap_seconds / 60);
    }
    
    return Object.keys(timing).length > 0 ? timing : undefined;
  }
  
  /**
   * Validate if a swap can be constructed
   */
  public static validateSwapConstruction(
    fromAsset: string,
    toAsset: string,
    amount: string
  ): { valid: boolean; error?: string } {
    
    // Validate assets
    const fromValidation = AssetChainService.validateSwapAsset(fromAsset);
    if (!fromValidation.valid) {
      return { valid: false, error: `Invalid from asset: ${fromValidation.error}` };
    }
    
    const toValidation = AssetChainService.validateSwapAsset(toAsset);
    if (!toValidation.valid) {
      return { valid: false, error: `Invalid to asset: ${toValidation.error}` };
    }
    
    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return { valid: false, error: 'Invalid amount' };
    }
    
    return { valid: true };
  }
  
  /**
   * Check if a quote has expired
   */
  public static isQuoteExpired(expiry: number): boolean {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    return now >= expiry;
  }
  
  /**
   * Get time remaining until expiry
   */
  public static getTimeUntilExpiry(expiry: number): string {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiry - now;
    
    if (remaining <= 0) {
      return 'Expired';
    }
    
    if (remaining < 60) {
      return `${remaining}s`;
    } else if (remaining < 3600) {
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}