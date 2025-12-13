const assert = require('assert');

// UX interaction helpers for Approach 1 input masking
class MemolessAmountInput {
  constructor(referenceID, inAssetDecimals, assetPriceUSD) {
    this.referenceID = referenceID;
    this.inAssetDecimals = inAssetDecimals;
    this.assetPriceUSD = assetPriceUSD;
    this.inputMode = 'asset'; // 'asset' or 'usd'
  }
  
  // Process user input and return UX state
  processUserInput(userInput) {
    if (this.inputMode === 'usd') {
      return this.processUSDInput(userInput);
    } else {
      return this.processAssetInput(userInput);
    }
  }
  
  processAssetInput(assetAmount) {
    const referenceLength = this.referenceID.length;
    const maxUserDecimals = this.inAssetDecimals - referenceLength;
    
    let inputStr = assetAmount.toString();
    
    // Truncate if user exceeds available decimal places
    const decimalIndex = inputStr.indexOf('.');
    if (decimalIndex !== -1) {
      const currentDecimals = inputStr.length - decimalIndex - 1;
      if (currentDecimals > maxUserDecimals) {
        inputStr = inputStr.substring(0, decimalIndex + maxUserDecimals + 1);
      }
    }
    
    const actualAmountToSend = this.formatAmountWithReference(inputStr);
    
    return {
      userInput: inputStr,
      actualAmountToSend: actualAmountToSend,
      isValid: true,
      equivalentUSD: (parseFloat(actualAmountToSend) * this.assetPriceUSD).toFixed(2),
      warning: inputStr !== assetAmount.toString() ? 'Input truncated to fit reference ID' : null
    };
  }
  
  processUSDInput(usdAmount) {
    const assetAmount = parseFloat(usdAmount) / this.assetPriceUSD;
    const result = this.processAssetInput(assetAmount);
    
    return {
      ...result,
      userInputUSD: usdAmount,
      userInput: result.userInput, // This is the asset amount
      equivalentUSD: usdAmount // Keep user's USD input
    };
  }
  
  formatAmountWithReference(userInput) {
    let inputStr = userInput.toString();
    
    if (inputStr.indexOf('.') === -1) {
      inputStr += '.';
    }
    
    const referenceLength = this.referenceID.length;
    const userDecimals = inputStr.split('.')[1].length;
    const zerosNeeded = this.inAssetDecimals - userDecimals - referenceLength;
    
    return inputStr + '0'.repeat(Math.max(0, zerosNeeded)) + this.referenceID;
  }
  
  // Validate against dust threshold
  validateDustThreshold(amount, dustThresholdRaw) {
    const dustThreshold = dustThresholdRaw / 1e8;
    return parseFloat(amount) > dustThreshold;
  }
}

// Test suite for UX input masking interactions
describe('MemolessAmountInput - UX Interactions', () => {
  let amountInput;
  
  beforeEach(() => {
    // referenceID = "00003", decimals = 8, price = $50 per asset
    amountInput = new MemolessAmountInput('00003', 8, 50.0);
  });
  
  describe('Asset Input Mode', () => {
    it('should process simple asset input with real-time preview', () => {
      const result = amountInput.processUserInput('1.5');
      
      assert.strictEqual(result.userInput, '1.5');
      assert.strictEqual(result.actualAmountToSend, '1.50000003');
      assert.strictEqual(result.equivalentUSD, '75.00'); // 1.5 * 50
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.warning, null);
    });
    
    it('should truncate user input that exceeds available decimals', () => {
      const result = amountInput.processUserInput('1.23456789');
      
      assert.strictEqual(result.userInput, '1.234'); // Truncated to fit reference
      assert.strictEqual(result.actualAmountToSend, '1.23400003');
      assert.strictEqual(result.warning, 'Input truncated to fit reference ID');
    });
    
    it('should handle integer input gracefully', () => {
      const result = amountInput.processUserInput('5');
      
      assert.strictEqual(result.userInput, '5');
      assert.strictEqual(result.actualAmountToSend, '5.00000003');
      assert.strictEqual(result.equivalentUSD, '250.00');
    });
  });
  
  describe('USD Input Mode', () => {
    beforeEach(() => {
      amountInput.inputMode = 'usd';
    });
    
    it('should convert USD input to asset amount with reference encoding', () => {
      const result = amountInput.processUserInput('100'); // $100 USD
      
      assert.strictEqual(result.userInputUSD, '100');
      assert.strictEqual(result.userInput, '2'); // $100 / $50 = 2 assets
      assert.strictEqual(result.actualAmountToSend, '2.00000003');
      assert.strictEqual(result.equivalentUSD, '100');
    });
    
    it('should handle fractional USD amounts', () => {
      const result = amountInput.processUserInput('75.50'); // $75.50
      
      const expectedAssetAmount = 75.50 / 50.0; // 1.51
      assert.strictEqual(result.userInput, '1.51');
      assert.strictEqual(result.actualAmountToSend, '1.51000003');
    });
    
    it('should handle USD amounts that result in many asset decimals', () => {
      const result = amountInput.processUserInput('33.33'); // Results in 0.6666...
      
      // Should truncate to fit available decimal places
      assert.strictEqual(result.userInput, '0.666'); // Truncated
      assert.strictEqual(result.actualAmountToSend, '0.66600003');
    });
  });
  
  describe('Input Validation Edge Cases', () => {
    it('should handle very small amounts', () => {
      const result = amountInput.processUserInput('0.001');
      
      assert.strictEqual(result.actualAmountToSend, '0.00100003');
      assert.strictEqual(result.isValid, true);
    });
    
    it('should handle maximum precision input', () => {
      // With referenceID length 5, user can input 3 decimals max (8 - 5 = 3)
      const result = amountInput.processUserInput('1.999');
      
      assert.strictEqual(result.actualAmountToSend, '1.99900003');
      assert.strictEqual(result.warning, null);
    });
    
    it('should prevent user from controlling reference digits', () => {
      // Even if user tries to input reference digits, they get overridden
      const result1 = amountInput.processUserInput('1.50000004');
      const result2 = amountInput.processUserInput('1.5');
      
      // Both should result in same final amount
      assert.strictEqual(result1.actualAmountToSend, '1.50000003');
      assert.strictEqual(result2.actualAmountToSend, '1.50000003');
    });
  });
  
  describe('Dust Threshold Validation', () => {
    it('should validate amounts above dust threshold', () => {
      const dustThreshold = 1000; // Raw value, will be divided by 1e8
      const isValid = amountInput.validateDustThreshold('0.00002', dustThreshold);
      
      assert.strictEqual(isValid, true); // 0.00002 > 0.00001 (1000/1e8)
    });
    
    it('should reject amounts below dust threshold', () => {
      const dustThreshold = 1000; // 1000/1e8 = 0.00001
      const isValid = amountInput.validateDustThreshold('0.000005', dustThreshold);
      
      assert.strictEqual(isValid, false); // 0.000005 < 0.00001
    });
  });
  
  describe('Real-time UX Feedback', () => {
    it('should provide comprehensive UX state for UI rendering', () => {
      const result = amountInput.processUserInput('1.234');
      
      // UX component can use this to show:
      // "You entered: 1.234 BTC ($61.70)"
      // "You will send: 1.23400003 BTC"
      // "⚠️ Amount will be encoded with reference ID"
      
      assert.strictEqual(result.userInput, '1.234');
      assert.strictEqual(result.actualAmountToSend, '1.23400003');
      assert.strictEqual(result.equivalentUSD, '61.70');
      assert.strictEqual(result.isValid, true);
    });
    
    it('should show when user input differs from actual send amount', () => {
      const result = amountInput.processUserInput('1.23456789');
      
      // Clear indication that input was modified
      assert.notStrictEqual(result.userInput, '1.23456789');
      assert.strictEqual(result.warning, 'Input truncated to fit reference ID');
    });
  });
});

// Test different reference ID lengths and decimal combinations
describe('Reference ID Length Variations', () => {
  it('should handle short reference ID (2 digits)', () => {
    const input = new MemolessAmountInput('99', 8, 50);
    const result = input.processUserInput('1.5');
    
    assert.strictEqual(result.actualAmountToSend, '1.50000099');
  });
  
  it('should handle long reference ID (7 digits)', () => {
    const input = new MemolessAmountInput('1234567', 8, 50);
    const result = input.processUserInput('1.5');
    
    assert.strictEqual(result.actualAmountToSend, '1.51234567');
  });
  
  it('should handle reference ID equal to decimal places', () => {
    const input = new MemolessAmountInput('12345678', 8, 50);
    const result = input.processUserInput('1.5');
    
    // User input gets completely overridden
    assert.strictEqual(result.actualAmountToSend, '1.12345678');
    assert.strictEqual(result.userInput, '1'); // Truncated to integer
  });
  
  it('should handle assets with fewer decimals (like BTC with 8)', () => {
    const input = new MemolessAmountInput('00003', 6, 50000); // 6 decimals, high price
    const result = input.processUserInput('0.001');
    
    assert.strictEqual(result.actualAmountToSend, '0.000003'); // 1 user decimal + 5 reference
  });
});

console.log('Running memoless UX interaction tests...');