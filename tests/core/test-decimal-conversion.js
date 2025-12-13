// Test script to validate decimal point conversion logic
function convertToRawUnits(amount, decimals) {
    const [integerPart = '0', decimalPart = ''] = amount.split('.');
    const paddedDecimalPart = decimalPart.padEnd(decimals, '0');
    const rawAmount = integerPart + paddedDecimalPart;
    // Remove leading zeros but keep at least one digit
    return rawAmount.replace(/^0+/, '') || '0';
}

// Test cases based on the examples from our conversation
console.log('Testing decimal point conversion:');
console.log('');

// Test case 1: The problematic case mentioned in conversation
console.log('Test 1: 0.00100002 with 8 decimals');
const result1 = convertToRawUnits('0.00100002', 8);
console.log(`Input: 0.00100002`);
console.log(`Expected: 100002`);
console.log(`Actual: ${result1}`);
console.log(`✅ ${result1 === '100002' ? 'PASS' : 'FAIL'}`);
console.log('');

// Test case 2: Basic case
console.log('Test 2: 1.23456789 with 8 decimals');
const result2 = convertToRawUnits('1.23456789', 8);
console.log(`Input: 1.23456789`);
console.log(`Expected: 123456789`);
console.log(`Actual: ${result2}`);
console.log(`✅ ${result2 === '123456789' ? 'PASS' : 'FAIL'}`);
console.log('');

// Test case 3: Amount with fewer decimals than required
console.log('Test 3: 1.5 with 8 decimals (padding test)');
const result3 = convertToRawUnits('1.5', 8);
console.log(`Input: 1.5`);
console.log(`Expected: 150000000`);
console.log(`Actual: ${result3}`);
console.log(`✅ ${result3 === '150000000' ? 'PASS' : 'FAIL'}`);
console.log('');

// Test case 4: Integer amount
console.log('Test 4: 5 with 8 decimals');
const result4 = convertToRawUnits('5', 8);
console.log(`Input: 5`);
console.log(`Expected: 500000000`);
console.log(`Actual: ${result4}`);
console.log(`✅ ${result4 === '500000000' ? 'PASS' : 'FAIL'}`);
console.log('');

// Test case 5: Reference ID at end (like our memoless case)
console.log('Test 5: 0.00100001 with 8 decimals (reference ID 00001)');
const result5 = convertToRawUnits('0.00100001', 8);
console.log(`Input: 0.00100001`);
console.log(`Expected: 100001`);
console.log(`Actual: ${result5}`);
console.log(`✅ ${result5 === '100001' ? 'PASS' : 'FAIL'}`);