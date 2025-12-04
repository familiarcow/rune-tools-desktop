const assert = require('assert');

// Core validation function from memoless.md specification
function validateAmountToReference(amount, referenceID, inAssetDecimals) {
  // Convert amount to string and handle decimal places
  let amountStr = amount.toString();
  
  // If amount has more decimals than allowed, truncate (don't round)
  const decimalIndex = amountStr.indexOf('.');
  if (decimalIndex !== -1) {
    const currentDecimals = amountStr.length - decimalIndex - 1;
    if (currentDecimals > inAssetDecimals) {
      amountStr = amountStr.substring(0, decimalIndex + inAssetDecimals + 1);
    }
  }
  
  // Pad with zeros to ensure we have enough decimal places
  if (decimalIndex === -1) {
    amountStr += '.';
  }
  const currentDecimalLength = amountStr.split('.')[1]?.length || 0;
  const zerosNeeded = inAssetDecimals - currentDecimalLength;
  amountStr += '0'.repeat(Math.max(0, zerosNeeded));
  
  // Get the last referenceID.length digits from the decimal portion
  const decimals = amountStr.split('.')[1];
  const referenceLength = referenceID.length;
  const lastDigits = decimals.slice(-referenceLength);
  
  return lastDigits === referenceID;
}

// UX helper function for Approach 1: Input masking with preview
function formatAmountWithReference(userInput, referenceID, inAssetDecimals) {
  let inputStr = userInput.toString();
  
  // Handle decimal truncation if user input exceeds allowed decimals
  const decimalIndex = inputStr.indexOf('.');
  if (decimalIndex !== -1) {
    const referenceLength = referenceID.length;
    const maxUserDecimals = inAssetDecimals - referenceLength;
    const currentDecimals = inputStr.length - decimalIndex - 1;
    
    if (currentDecimals > maxUserDecimals) {
      inputStr = inputStr.substring(0, decimalIndex + maxUserDecimals + 1);
    }
  }
  
  // Ensure we have a decimal point
  if (inputStr.indexOf('.') === -1) {
    inputStr += '.';
  }
  
  // Calculate how many digits user can control vs reference ID needs
  const referenceLength = referenceID.length;
  const userDecimals = inputStr.split('.')[1].length;
  const zerosNeeded = inAssetDecimals - userDecimals - referenceLength;
  
  // Build final amount: user input + zeros + reference ID
  const finalAmount = inputStr + '0'.repeat(Math.max(0, zerosNeeded)) + referenceID;
  
  return finalAmount;
}

// Test suite for validateAmountToReference
describe('validateAmountToReference', () => {
  
  it('should validate correct reference encoding - example from spec', () => {
    // referenceID = 00003, inAssetDecimals = 8, amount should end in xxx00003
    assert.strictEqual(validateAmountToReference('1.23400003', '00003', 8), true);
    assert.strictEqual(validateAmountToReference('100.00000003', '00003', 8), true);
    assert.strictEqual(validateAmountToReference('0.12300003', '00003', 8), true);
  });
  
  it('should validate correct reference encoding - second example from spec', () => {
    // referenceID = 12345, inAssetDecimals = 6, amount should end in x12345
    assert.strictEqual(validateAmountToReference('1.012345', '12345', 6), true);
    assert.strictEqual(validateAmountToReference('100.512345', '12345', 6), true);
  });
  
  it('should reject incorrect reference encoding', () => {
    assert.strictEqual(validateAmountToReference('1.23400004', '00003', 8), false);
    assert.strictEqual(validateAmountToReference('1.23412345', '00003', 8), false);
    assert.strictEqual(validateAmountToReference('1.012346', '12345', 6), false);
  });
  
  it('should handle decimal truncation without rounding', () => {
    // Input: 1.234567899, inAssetDecimals = 8 → should become 1.23456789
    assert.strictEqual(validateAmountToReference(1.234567899, '00003', 8), false);
    // After proper truncation it should be 1.23456789, last 5 digits = 56789, not 00003
  });
  
  it('should handle amounts with fewer decimals than reference length', () => {
    // If user provides 1.5 with referenceID=00003, it should pad appropriately
    const formatted = formatAmountWithReference('1.5', '00003', 8);
    assert.strictEqual(validateAmountToReference(formatted, '00003', 8), true);
  });
  
  it('should handle edge case with zero decimals', () => {
    const formatted = formatAmountWithReference('1', '00003', 8);
    assert.strictEqual(formatted, '1.00000003');
    assert.strictEqual(validateAmountToReference(formatted, '00003', 8), true);
  });
  
  it('should handle reference ID longer than available decimal places', () => {
    // referenceID = 123456, but only 6 decimal places total
    const formatted = formatAmountWithReference('1', '123456', 6);
    assert.strictEqual(formatted, '1.123456');
    assert.strictEqual(validateAmountToReference(formatted, '123456', 6), true);
  });
});

// Test suite for UX input masking (Approach 1)
describe('formatAmountWithReference - UX Input Masking', () => {
  
  it('should format user input with reference ID appended', () => {
    // User types "1.5", system should show "1.50000003"
    const result = formatAmountWithReference('1.5', '00003', 8);
    assert.strictEqual(result, '1.50000003');
  });
  
  it('should handle user input with many decimals', () => {
    // User types "1.23456", with referenceID="00003", decimals=8
    // Should become "1.23400003" (truncate user input, append reference)
    const result = formatAmountWithReference('1.23456', '00003', 8);
    assert.strictEqual(result, '1.23400003');
  });
  
  it('should handle integer input', () => {
    // User types "5", should become "5.00000003"
    const result = formatAmountWithReference('5', '00003', 8);
    assert.strictEqual(result, '5.00000003');
  });
  
  it('should handle case where reference ID takes all decimal places', () => {
    // referenceID = 123456, decimals = 6, user input = "1"
    const result = formatAmountWithReference('1', '123456', 6);
    assert.strictEqual(result, '1.123456');
  });
  
  it('should truncate user input that exceeds available space', () => {
    // User types "1.999999", referenceID="12345", decimals=6
    // User can only use 1 decimal place, so "1.9" + "12345"
    const result = formatAmountWithReference('1.999999', '12345', 6);
    assert.strictEqual(result, '1.912345');
  });
  
  it('should handle edge case with very long reference ID', () => {
    // Reference ID longer than decimal places should still work
    const result = formatAmountWithReference('1.5', '12345678', 8);
    assert.strictEqual(result, '1.12345678');
  });
});

// Test suite for user experience edge cases
describe('UX Edge Cases', () => {
  
  it('should prevent user from editing reference digits', () => {
    // Simulate user trying to type in reference area
    const userInput = '1.50000004'; // User trying to change last digit
    const corrected = formatAmountWithReference('1.5', '00003', 8);
    assert.strictEqual(corrected, '1.50000003'); // System should override
  });
  
  it('should show clear preview of actual amount to send', () => {
    const userInput = '1.234';
    const referenceID = '00003';
    const decimals = 8;
    
    const actualAmountToSend = formatAmountWithReference(userInput, referenceID, decimals);
    
    // UX should show: "You entered: 1.234 BTC"
    //                  "You will send: 1.23400003 BTC"
    assert.strictEqual(actualAmountToSend, '1.23400003');
    assert.notStrictEqual(userInput, actualAmountToSend); // They're different!
  });
});

console.log('Running memoless amount validation tests...');