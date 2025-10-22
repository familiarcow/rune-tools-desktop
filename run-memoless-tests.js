// Simple test runner for memoless functionality tests
const assert = require('assert');

// Mock describe/it functions for simple test running
global.describe = function(name, fn) {
  console.log(`\n📋 ${name}`);
  try {
    fn();
    console.log(`✅ ${name} - All tests passed`);
  } catch (error) {
    console.log(`❌ ${name} - FAILED: ${error.message}`);
  }
};

global.it = function(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.log(`  ✗ ${name}: ${error.message}`);
    throw error; // Re-throw to fail the describe block
  }
};

global.beforeEach = function(fn) {
  // Simple implementation - just call the function
  fn();
};

console.log('🧪 Running Memoless Amount Input Tests\n');

// Load and run all test files
try {
  console.log('Running amount validation tests...');
  require('./test-memoless-amount-validation.js');
  
  console.log('\nRunning UX interaction tests...');
  require('./test-memoless-ux-interactions.js');
  
  console.log('\nRunning USD conversion tests...');
  require('./test-memoless-usd-conversion.js');
  
  console.log('\nRunning dust threshold tests...');
  require('./test-memoless-dust-threshold.js');
  
  console.log('\nRunning edge cases tests...');
  require('./test-memoless-edge-cases.js');
  
  console.log('\n🎉 All test suites completed!');
  
} catch (error) {
  console.error('\n💥 Test execution failed:', error.message);
  process.exit(1);
}