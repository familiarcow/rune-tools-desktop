const assert = require('assert');

// USD conversion logic with reference encoding constraints
class USDAmountConverter {
  constructor(assetPriceUSD, inAssetDecimals, referenceID) {
    this.assetPriceUSD = assetPriceUSD;
    this.inAssetDecimals = inAssetDecimals;
    this.referenceID = referenceID;
    this.referenceLength = referenceID.length;
    this.maxUserDecimals = inAssetDecimals - this.referenceLength;
  }
  
  // Convert USD to valid asset amount with reference encoding
  convertUSDToValidAssetAmount(usdAmount) {
    const baseAssetAmount = parseFloat(usdAmount) / this.assetPriceUSD;
    
    // Find the valid asset amount that's closest to what user wants
    const validAssetAmount = this.findValidAssetAmount(baseAssetAmount);
    
    // Calculate actual USD value of the valid amount
    const actualUSDValue = validAssetAmount * this.assetPriceUSD;
    
    return {
      requestedUSD: usdAmount,
      baseAssetAmount: baseAssetAmount,
      validAssetAmount: validAssetAmount,
      finalAmountWithReference: this.formatWithReference(validAssetAmount),
      actualUSDValue: actualUSDValue,
      usdDifference: actualUSDValue - parseFloat(usdAmount)
    };
  }
  
  // Find closest valid asset amount that can encode the reference ID
  findValidAssetAmount(targetAmount) {
    if (this.maxUserDecimals <= 0) {
      // If reference ID takes all decimals, user can only control integer part
      return Math.floor(targetAmount);
    }
    
    // Convert to string and truncate to available decimal places
    const amountStr = targetAmount.toString();
    const decimalIndex = amountStr.indexOf('.');
    
    if (decimalIndex === -1) {
      return targetAmount; // Integer amount is always valid
    }
    
    const integerPart = amountStr.substring(0, decimalIndex);
    const decimalPart = amountStr.substring(decimalIndex + 1);
    
    // Truncate decimal part to what user can control
    const truncatedDecimal = decimalPart.substring(0, this.maxUserDecimals);
    
    return parseFloat(integerPart + '.' + truncatedDecimal);
  }
  
  formatWithReference(validAssetAmount) {
    let amountStr = validAssetAmount.toString();
    
    if (amountStr.indexOf('.') === -1) {
      amountStr += '.';
    }
    
    const currentDecimals = amountStr.split('.')[1].length;
    const zerosNeeded = this.inAssetDecimals - currentDecimals - this.referenceLength;
    
    return amountStr + '0'.repeat(Math.max(0, zerosNeeded)) + this.referenceID;
  }
  
  // Generate valid USD amounts that result in clean asset amounts
  generateValidUSDAmounts(minUSD, maxUSD, stepCount = 10) {
    const validAmounts = [];
    const step = (maxUSD - minUSD) / stepCount;
    
    for (let usd = minUSD; usd <= maxUSD; usd += step) {
      const conversion = this.convertUSDToValidAssetAmount(usd);
      
      validAmounts.push({
        suggestedUSD: parseFloat(usd.toFixed(2)),
        actualUSD: parseFloat(conversion.actualUSDValue.toFixed(2)),
        assetAmount: conversion.validAssetAmount,
        finalAmount: conversion.finalAmountWithReference
      });
    }
    
    return validAmounts;
  }
}

// Test suite for USD conversion with reference encoding
describe('USD Amount Conversion with Reference Encoding', () => {
  let converter;
  
  beforeEach(() => {
    // BTC price = $50,000, decimals = 8, referenceID = "00003"
    converter = new USDAmountConverter(50000, 8, '00003');
  });
  
  describe('Basic USD to Asset Conversion', () => {
    it('should convert simple USD amount to valid asset amount', () => {
      const result = converter.convertUSDToValidAssetAmount('1000'); // $1000
      
      assert.strictEqual(result.baseAssetAmount, 0.02); // $1000 / $50000 = 0.02 BTC
      assert.strictEqual(result.validAssetAmount, 0.02);
      assert.strictEqual(result.finalAmountWithReference, '0.02000003');
      assert.strictEqual(result.actualUSDValue, 1000);
      assert.strictEqual(result.usdDifference, 0);
    });
    
    it('should handle USD amounts that result in many asset decimals', () => {
      const result = converter.convertUSDToValidAssetAmount('333.33'); // Results in 0.0066666...
      
      assert.strictEqual(result.baseAssetAmount, 0.0066666);
      assert.strictEqual(result.validAssetAmount, 0.006); // Truncated to 3 user decimals
      assert.strictEqual(result.finalAmountWithReference, '0.00600003');
      assert.strictEqual(result.actualUSDValue, 300); // 0.006 * 50000
      assert.strictEqual(result.usdDifference, -33.33); // Less than requested
    });
  });
  
  describe('Decimal Precision Constraints', () => {
    it('should handle case where reference ID limits user control', () => {
      // 7-digit reference ID with 8 decimal places = only 1 user decimal
      const limitedConverter = new USDAmountConverter(50000, 8, '1234567');
      const result = limitedConverter.convertUSDToValidAssetAmount('1234.56');
      
      const expectedAssetAmount = 1234.56 / 50000; // 0.0246912
      assert.strictEqual(result.validAssetAmount, 0.0); // Only integer part (0) + 1 decimal
      assert.strictEqual(result.finalAmountWithReference, '0.01234567');
    });
    
    it('should handle reference ID that uses all decimal places', () => {
      const fullRefConverter = new USDAmountConverter(50000, 6, '123456');
      const result = fullRefConverter.convertUSDToValidAssetAmount('2500'); // 0.05 BTC
      
      assert.strictEqual(result.validAssetAmount, 0); // User can only control integer part
      assert.strictEqual(result.finalAmountWithReference, '0.123456');
      assert.strictEqual(result.actualUSDValue, 0); // 0 * 50000
    });
  });
  
  describe('Valid USD Amount Generation', () => {
    it('should generate valid USD amounts for user selection', () => {
      const validAmounts = converter.generateValidUSDAmounts(100, 200, 5);
      
      assert.strictEqual(validAmounts.length, 6); // Including both endpoints
      
      // All amounts should have valid reference encoding
      validAmounts.forEach(amount => {
        assert(amount.finalAmount.endsWith('00003'));
        assert(amount.actualUSD <= amount.suggestedUSD || Math.abs(amount.actualUSD - amount.suggestedUSD) < 0.01);
      });
    });
    
    it('should show USD difference when conversion loses precision', () => {
      const result = converter.convertUSDToValidAssetAmount('123.456789');
      
      // Should show user that actual USD value differs from requested
      assert.notStrictEqual(result.actualUSDValue, 123.456789);
      assert(Math.abs(result.usdDifference) > 0);
    });
  });
  
  describe('Edge Cases for USD Conversion', () => {
    it('should handle very small USD amounts', () => {
      const result = converter.convertUSDToValidAssetAmount('0.01'); // 1 cent
      
      // $0.01 / $50000 = 0.0000002 BTC, but min precision might round to 0
      assert.strictEqual(result.validAssetAmount, 0);
      assert.strictEqual(result.finalAmountWithReference, '0.00000003');
    });
    
    it('should handle very large USD amounts', () => {
      const result = converter.convertUSDToValidAssetAmount('1000000'); // $1M
      
      assert.strictEqual(result.baseAssetAmount, 20); // $1M / $50k = 20 BTC
      assert.strictEqual(result.validAssetAmount, 20);
      assert.strictEqual(result.finalAmountWithReference, '20.00000003');
    });
    
    it('should handle different asset prices and decimals', () => {
      // ETH: $3000, 18 decimals, long reference
      const ethConverter = new USDAmountConverter(3000, 18, '12345');
      const result = ethConverter.convertUSDToValidAssetAmount('150'); // $150
      
      const expectedETH = 150 / 3000; // 0.05 ETH
      assert.strictEqual(result.validAssetAmount, 0.05);
      
      // Should have 18 decimals with reference at the end
      const finalAmount = result.finalAmountWithReference;
      assert.strictEqual(finalAmount.split('.')[1].length, 18);
      assert(finalAmount.endsWith('12345'));
    });
  });
  
  describe('UX Helper Functions', () => {
    it('should provide clear feedback about USD conversion accuracy', () => {
      const result = converter.convertUSDToValidAssetAmount('333.33');
      
      // UX can show: "Requested: $333.33"
      //              "Actual: $300.00 (due to decimal precision limits)"
      //              "Difference: -$33.33"
      
      assert.strictEqual(result.requestedUSD, '333.33');
      assert.strictEqual(result.actualUSDValue, 300);
      assert.strictEqual(result.usdDifference, -33.33);
    });
    
    it('should help users understand why USD amount changed', () => {
      const converter6decimals = new USDAmountConverter(1000, 6, '12345'); // Only 1 user decimal
      const result = converter6decimals.convertUSDToValidAssetAmount('123.45');
      
      // User wants $123.45 but can only get amounts in $100 increments due to precision
      assert.strictEqual(result.baseAssetAmount, 0.12345);
      assert.strictEqual(result.validAssetAmount, 0.1); // Truncated to 1 decimal
      assert.strictEqual(result.actualUSDValue, 100); // 0.1 * 1000
    });
  });
});

// Test integration with dust threshold validation
describe('USD Conversion with Dust Threshold', () => {
  it('should warn when USD conversion results in amount below dust threshold', () => {
    const converter = new USDAmountConverter(50000, 8, '00003'); // BTC
    const dustThreshold = 1000; // 1000 satoshis = 0.00001 BTC
    
    const result = converter.convertUSDToValidAssetAmount('0.10'); // 10 cents
    const dustThresholdBTC = dustThreshold / 1e8; // 0.00001 BTC
    
    // $0.10 / $50000 = 0.000002 BTC < 0.00001 BTC dust threshold
    assert(result.validAssetAmount < dustThresholdBTC);
    
    // UX should warn user and suggest minimum USD amount
    const minUSDForDustThreshold = dustThresholdBTC * 50000; // $0.50
    assert(parseFloat(result.requestedUSD) < minUSDForDustThreshold);
  });
  
  it('should calculate minimum USD amount to exceed dust threshold', () => {
    const converter = new USDAmountConverter(50000, 8, '00003');
    const dustThreshold = 1000; // satoshis
    
    const minAssetAmount = (dustThreshold / 1e8) + 0.00000001; // Slightly above dust
    const minUSDAmount = minAssetAmount * converter.assetPriceUSD;
    
    const result = converter.convertUSDToValidAssetAmount(minUSDAmount.toString());
    
    assert(result.validAssetAmount > dustThreshold / 1e8);
  });
});

console.log('Running USD conversion with reference encoding tests...');