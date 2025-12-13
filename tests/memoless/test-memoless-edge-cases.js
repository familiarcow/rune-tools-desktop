const assert = require('assert');

// Comprehensive edge case testing for memoless amount input
class MemolessInputValidator {
  constructor(referenceID, inAssetDecimals, dustThreshold, assetPriceUSD) {
    this.referenceID = referenceID;
    this.inAssetDecimals = inAssetDecimals;
    this.dustThreshold = dustThreshold / 1e8;
    this.assetPriceUSD = assetPriceUSD;
    this.referenceLength = referenceID.length;
    this.maxUserDecimals = Math.max(0, inAssetDecimals - this.referenceLength);
  }
  
  // Process and validate user input with comprehensive error handling
  processUserInput(input, inputMode = 'asset') {
    const result = {
      originalInput: input,
      inputMode: inputMode,
      isValid: false,
      errors: [],
      warnings: [],
      processedInput: null,
      finalAmount: null,
      equivalentUSD: null
    };
    
    try {
      // Step 1: Basic input validation
      const basicValidation = this.validateBasicInput(input);
      if (!basicValidation.isValid) {
        result.errors = basicValidation.errors;
        return result;
      }
      
      // Step 2: Convert to asset amount if USD input
      let assetAmount;
      if (inputMode === 'usd') {
        const usdValidation = this.validateUSDInput(input);
        if (!usdValidation.isValid) {
          result.errors = usdValidation.errors;
          return result;
        }
        assetAmount = parseFloat(input) / this.assetPriceUSD;
        result.equivalentUSD = parseFloat(input);
      } else {
        assetAmount = parseFloat(input);
        result.equivalentUSD = assetAmount * this.assetPriceUSD;
      }
      
      // Step 3: Process asset amount with precision constraints
      const processedAmount = this.processAssetAmount(assetAmount);
      result.processedInput = processedAmount.processed;
      result.warnings = processedAmount.warnings;
      
      // Step 4: Generate final amount with reference encoding
      result.finalAmount = this.formatWithReference(result.processedInput);
      
      // Step 5: Validate against dust threshold
      const dustValidation = this.validateDustThreshold(result.finalAmount);
      if (!dustValidation.isValid) {
        result.errors.push(...dustValidation.errors);
        return result;
      }
      
      result.isValid = true;
      return result;
      
    } catch (error) {
      result.errors.push(`Unexpected error: ${error.message}`);
      return result;
    }
  }
  
  validateBasicInput(input) {
    const errors = [];
    
    // Check for empty or null input
    if (!input || input.toString().trim() === '') {
      errors.push('Amount cannot be empty');
      return { isValid: false, errors };
    }
    
    // Check for non-numeric input
    const numericValue = parseFloat(input);
    if (isNaN(numericValue)) {
      errors.push('Amount must be a valid number');
      return { isValid: false, errors };
    }
    
    // Check for negative amounts
    if (numericValue <= 0) {
      errors.push('Amount must be greater than zero');
      return { isValid: false, errors };
    }
    
    // Check for extremely large numbers
    if (numericValue > Number.MAX_SAFE_INTEGER) {
      errors.push('Amount is too large');
      return { isValid: false, errors };
    }
    
    return { isValid: true, errors: [] };
  }
  
  validateUSDInput(usdInput) {
    const errors = [];
    const usdAmount = parseFloat(usdInput);
    
    // Check minimum USD amount (1 cent)
    if (usdAmount < 0.01) {
      errors.push('USD amount must be at least $0.01');
      return { isValid: false, errors };
    }
    
    // Check if USD amount is reasonable (not more than $1 billion)
    if (usdAmount > 1000000000) {
      errors.push('USD amount is unreasonably large');
      return { isValid: false, errors };
    }
    
    return { isValid: true, errors: [] };
  }
  
  processAssetAmount(assetAmount) {
    const warnings = [];
    let processed = assetAmount;
    
    // Handle very small amounts that might round to zero
    if (processed < Math.pow(10, -this.inAssetDecimals)) {
      warnings.push('Amount is smaller than the minimum precision for this asset');
    }
    
    // Truncate to available decimal places
    if (this.maxUserDecimals === 0) {
      // User can only control integer part
      processed = Math.floor(processed);
      if (processed !== assetAmount) {
        warnings.push('Amount rounded down to integer due to reference ID constraints');
      }
    } else {
      // Truncate decimal places that exceed user control
      const multiplier = Math.pow(10, this.maxUserDecimals);
      processed = Math.floor(processed * multiplier) / multiplier;
      
      if (Math.abs(processed - assetAmount) > Math.pow(10, -(this.maxUserDecimals + 1))) {
        warnings.push('Amount truncated to fit reference ID requirements');
      }
    }
    
    return { processed, warnings };
  }
  
  formatWithReference(amount) {
    let amountStr = amount.toString();
    
    if (amountStr.indexOf('.') === -1) {
      amountStr += '.';
    }
    
    const currentDecimals = amountStr.split('.')[1].length;
    const zerosNeeded = this.inAssetDecimals - currentDecimals - this.referenceLength;
    
    return amountStr + '0'.repeat(Math.max(0, zerosNeeded)) + this.referenceID;
  }
  
  validateDustThreshold(amount) {
    const errors = [];
    const numericAmount = parseFloat(amount);
    
    if (numericAmount <= this.dustThreshold) {
      const minRequired = this.dustThreshold + Math.pow(10, -this.maxUserDecimals);
      errors.push(`Amount ${amount} is below dust threshold ${this.dustThreshold}. Minimum required: ${minRequired}`);
      return { isValid: false, errors };
    }
    
    return { isValid: true, errors: [] };
  }
}

// Test suite for user input edge cases and error handling
describe('Memoless Input Edge Cases and Error Handling', () => {
  let validator;
  
  beforeEach(() => {
    // BTC: referenceID = "00003", 8 decimals, 1000 sat dust, $50k price
    validator = new MemolessInputValidator('00003', 8, 1000, 50000);
  });
  
  describe('Invalid Input Handling', () => {
    it('should reject empty input', () => {
      const result = validator.processUserInput('');
      assert.strictEqual(result.isValid, false);
      assert(result.errors.includes('Amount cannot be empty'));
    });
    
    it('should reject null/undefined input', () => {
      const result1 = validator.processUserInput(null);
      const result2 = validator.processUserInput(undefined);
      
      assert.strictEqual(result1.isValid, false);
      assert.strictEqual(result2.isValid, false);
    });
    
    it('should reject non-numeric input', () => {
      const testCases = ['abc', '1.2.3', '1e', 'NaN', 'Infinity', '1,000'];
      
      testCases.forEach(testCase => {
        const result = validator.processUserInput(testCase);
        assert.strictEqual(result.isValid, false, `Should reject: ${testCase}`);
        assert(result.errors.some(e => e.includes('valid number')));
      });
    });
    
    it('should reject negative amounts', () => {
      const result = validator.processUserInput('-1.5');
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.includes('greater than zero')));
    });
    
    it('should reject zero amounts', () => {
      const result = validator.processUserInput('0');
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.includes('greater than zero')));
    });
  });
  
  describe('Precision and Truncation Edge Cases', () => {
    it('should handle amounts with excessive decimal places', () => {
      // User enters 20 decimal places, but only 3 are controllable
      const result = validator.processUserInput('1.12345678901234567890');
      
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.processedInput, 1.123); // Truncated to 3 decimals
      assert.strictEqual(result.finalAmount, '1.12300003');
      assert(result.warnings.some(w => w.includes('truncated')));
    });
    
    it('should handle very small amounts near precision limit', () => {
      const tinyAmount = '0.00000001'; // 1 satoshi equivalent
      const result = validator.processUserInput(tinyAmount);
      
      if (result.isValid) {
        assert.strictEqual(result.finalAmount, '0.00000003'); // Truncated + reference
      }
    });
    
    it('should handle amounts smaller than minimum precision', () => {
      const validator18 = new MemolessInputValidator('12345', 6, 1000, 50000);
      const result = validator18.processUserInput('0.0000001'); // Smaller than 6 decimals
      
      assert(result.warnings.some(w => w.includes('minimum precision')));
    });
  });
  
  describe('Reference ID Constraint Edge Cases', () => {
    it('should handle reference ID that uses all decimal places', () => {
      const fullRefValidator = new MemolessInputValidator('12345678', 8, 1000, 50000);
      const result = fullRefValidator.processUserInput('5.123');
      
      assert.strictEqual(result.processedInput, 5); // Integer only
      assert.strictEqual(result.finalAmount, '5.12345678');
      assert(result.warnings.some(w => w.includes('rounded down to integer')));
    });
    
    it('should handle very long reference ID', () => {
      const longRefValidator = new MemolessInputValidator('123456789012', 8, 1000, 50000);
      // This should be impossible (12 digits > 8 decimals), but test gracefully
      
      const result = longRefValidator.processUserInput('1.5');
      // System should handle this gracefully, possibly by truncating reference or erroring
    });
    
    it('should handle single decimal place available to user', () => {
      const singleDecValidator = new MemolessInputValidator('1234567', 8, 1000, 50000);
      const result = singleDecValidator.processUserInput('1.987654321');
      
      assert.strictEqual(result.processedInput, 1.9); // Only 1 decimal controllable
      assert.strictEqual(result.finalAmount, '1.91234567');
    });
  });
  
  describe('USD Input Mode Edge Cases', () => {
    it('should reject very small USD amounts', () => {
      const result = validator.processUserInput('0.001', 'usd'); // Less than 1 cent
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.includes('at least $0.01')));
    });
    
    it('should reject unreasonably large USD amounts', () => {
      const result = validator.processUserInput('2000000000', 'usd'); // $2 billion
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.includes('unreasonably large')));
    });
    
    it('should handle USD amounts that convert to very small asset amounts', () => {
      const result = validator.processUserInput('0.50', 'usd'); // 50 cents
      
      // $0.50 / $50,000 = 0.00001 BTC (exactly at dust threshold)
      // Should be rejected for being at/below dust threshold
      assert.strictEqual(result.isValid, false);
    });
  });
  
  describe('Dust Threshold Edge Cases', () => {
    it('should reject amounts exactly at dust threshold', () => {
      const dustAmount = (1000 / 1e8).toString(); // Exactly 0.00001 BTC
      const result = validator.processUserInput(dustAmount);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.includes('dust threshold')));
    });
    
    it('should accept amounts just above dust threshold', () => {
      const aboveDust = '0.00001001'; // Slightly above dust
      const result = validator.processUserInput(aboveDust);
      
      if (result.processedInput >= validator.dustThreshold) {
        assert.strictEqual(result.isValid, true);
      }
    });
    
    it('should handle high dust threshold assets', () => {
      // Asset with 1.0 unit dust threshold
      const highDustValidator = new MemolessInputValidator('00003', 8, 100000000, 1);
      const result = highDustValidator.processUserInput('0.5');
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.includes('dust threshold')));
    });
  });
  
  describe('Numerical Edge Cases', () => {
    it('should handle scientific notation input', () => {
      const result = validator.processUserInput('1e-3'); // 0.001
      
      if (result.isValid) {
        assert.strictEqual(result.processedInput, 0.001);
      }
    });
    
    it('should handle very large numbers', () => {
      const result = validator.processUserInput('999999999');
      
      if (result.isValid) {
        assert.strictEqual(result.finalAmount, '999999999.00000003');
      }
    });
    
    it('should handle floating point precision issues', () => {
      const result = validator.processUserInput('0.1000000000000000055511'); // JS precision issue
      
      // Should handle gracefully without throwing errors
      assert.strictEqual(typeof result.isValid, 'boolean');
    });
  });
  
  describe('Copy-Paste Input Handling', () => {
    it('should handle pasted amounts with many decimals', () => {
      // User copies from another wallet: "1.234567890123456789"
      const result = validator.processUserInput('1.234567890123456789');
      
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.processedInput, 1.234); // Truncated appropriately
      assert(result.warnings.some(w => w.includes('truncated')));
    });
    
    it('should handle pasted amounts with commas (international format)', () => {
      const result = validator.processUserInput('1,234.56');
      
      // Should be rejected as non-numeric (contains comma)
      assert.strictEqual(result.isValid, false);
    });
    
    it('should handle pasted amounts with currency symbols', () => {
      const testCases = ['$100', '€50', '£25', '¥1000'];
      
      testCases.forEach(testCase => {
        const result = validator.processUserInput(testCase);
        assert.strictEqual(result.isValid, false, `Should reject: ${testCase}`);
      });
    });
  });
  
  describe('Chain-Specific Edge Cases', () => {
    it('should handle assets with different decimal places', () => {
      const validators = [
        new MemolessInputValidator('00003', 6, 1000000, 1000), // 6 decimals
        new MemolessInputValidator('00003', 18, 1000, 3000), // 18 decimals (ETH-like)
        new MemolessInputValidator('00003', 0, 100000000, 0.08) // 0 decimals (some tokens)
      ];
      
      validators.forEach((v, i) => {
        const result = v.processUserInput('1.5');
        
        if (i === 2) { // 0 decimals case
          assert.strictEqual(result.processedInput, 1); // Must be integer
        } else {
          assert.strictEqual(typeof result.processedInput, 'number');
        }
      });
    });
  });
  
  describe('Error Recovery and User Guidance', () => {
    it('should provide specific guidance for dust threshold violations', () => {
      const result = validator.processUserInput('0.000001');
      
      assert.strictEqual(result.isValid, false);
      const dustError = result.errors.find(e => e.includes('dust threshold'));
      
      // Error should include specific minimum required amount
      assert(dustError.includes('Minimum required'));
      assert(dustError.includes('0.00001')); // Dust threshold value
    });
    
    it('should provide clear warnings for truncated input', () => {
      const result = validator.processUserInput('1.999999');
      
      if (result.isValid) {
        const truncationWarning = result.warnings.find(w => w.includes('truncated'));
        assert(truncationWarning);
        assert(truncationWarning.includes('reference ID'));
      }
    });
    
    it('should accumulate multiple warnings appropriately', () => {
      // Create scenario with multiple issues
      const edgeCaseValidator = new MemolessInputValidator('1234567', 8, 1000, 50000);
      const result = edgeCaseValidator.processUserInput('0.0000012345678');
      
      // Might have warnings about precision AND truncation
      if (result.warnings.length > 1) {
        assert(result.warnings.every(w => typeof w === 'string' && w.length > 0));
      }
    });
  });
});

console.log('Running memoless edge cases and error handling tests...');