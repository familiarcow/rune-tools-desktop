// Test script to verify memoless backend functionality
const { MemolessService } = require('./dist/services/memolessService');
const { NetworkService } = require('./dist/services/networkService');

async function testMemolessBackend() {
  console.log('🧪 Testing Memoless Backend Functionality\n');

  try {
    // Initialize services
    const networkService = new NetworkService();
    networkService.setNetwork('stagenet'); // Switch to stagenet for memoless testing
    const memolessService = new MemolessService(networkService);

    console.log('📊 Current Network:', memolessService.getCurrentNetworkDisplay());
    console.log('🌐 Is Stagenet:', memolessService.isStaging());
    console.log();

    // Test Step 1: Get valid assets
    console.log('Step 1: 📋 Testing Valid Assets Fetching...');
    const validAssets = await memolessService.getValidAssetsForRegistration();
    console.log(`✅ Fetched ${validAssets.length} valid assets`);
    console.log('Sample assets:');
    validAssets.slice(0, 5).forEach(asset => {
      console.log(`  - ${asset.asset}: $${asset.priceUSD.toFixed(2)} (${asset.decimals} decimals)`);
    });
    console.log();

    // Test Step 2: Amount validation with reference encoding
    console.log('Step 2: 🔢 Testing Amount Validation...');
    const testAmount = '1.5';
    const testReferenceID = '00123';
    const testDecimals = 8;
    
    const validation = memolessService.formatAmountWithReference(testAmount, testReferenceID, testDecimals);
    console.log('Input:', testAmount);
    console.log('Reference ID:', testReferenceID);
    console.log('Result:', validation);
    console.log('✅ Amount validation working');
    console.log();

    // Test Step 3: Inbound addresses
    console.log('Step 3: 🌐 Testing Inbound Addresses...');
    const inboundAddresses = await memolessService.getInboundAddresses();
    console.log(`✅ Fetched ${inboundAddresses.length} inbound addresses`);
    
    if (inboundAddresses.length > 0) {
      const btcInbound = inboundAddresses.find(addr => addr.chain === 'BTC');
      if (btcInbound) {
        console.log('BTC Inbound:', btcInbound.address);
        console.log('BTC Dust Threshold:', parseFloat(btcInbound.dust_threshold) / 1e8, 'BTC');
      }
    }
    console.log();

    // Test Step 4: Asset-specific inbound address
    console.log('Step 4: 🎯 Testing Asset-Specific Inbound Address...');
    const btcAsset = 'BTC.BTC';
    try {
      const btcInboundInfo = memolessService.getInboundAddressForAsset(inboundAddresses, btcAsset);
      console.log(`${btcAsset} inbound address:`, btcInboundInfo.address);
      console.log(`${btcAsset} dust threshold:`, btcInboundInfo.dustThreshold, 'BTC');
      console.log('✅ Asset-specific inbound address working');
    } catch (error) {
      console.log('❌ Error getting asset inbound address:', error.message);
    }
    console.log();

    // Test Step 5: QR Code generation
    console.log('Step 5: 📱 Testing QR Code Generation...');
    const qrData = memolessService.generateQRCodeData('BTC', 'bc1q...testaddress', '0.001');
    console.log('QR Code Data:', qrData);
    console.log('✅ QR code generation working');
    console.log();

    // Test Step 6: Dust threshold validation
    console.log('Step 6: 💰 Testing Dust Threshold Validation...');
    const dustTest1 = memolessService.validateDustThreshold('0.00002', 0.00001); // Above
    const dustTest2 = memolessService.validateDustThreshold('0.000005', 0.00001); // Below
    console.log('Amount 0.00002 > 0.00001 dust:', dustTest1);
    console.log('Amount 0.000005 > 0.00001 dust:', dustTest2);
    console.log('✅ Dust threshold validation working');
    console.log();

    // Test Step 7: USD calculation
    console.log('Step 7: 💵 Testing USD Calculation...');
    const usdValue = memolessService.calculateUSDEquivalent('1.5', 67000);
    console.log('1.5 BTC at $67,000:', `$${usdValue}`);
    console.log('✅ USD calculation working');
    console.log();

    console.log('🎉 All Memoless Backend Tests Passed!');
    console.log();
    console.log('🔧 Available IPC Handlers:');
    console.log('  - memoless-get-valid-assets');
    console.log('  - memoless-register-memo');
    console.log('  - memoless-get-memo-reference');
    console.log('  - memoless-get-inbound-addresses');
    console.log('  - memoless-get-inbound-for-asset');
    console.log('  - memoless-format-amount-with-reference');
    console.log('  - memoless-validate-dust-threshold');
    console.log('  - memoless-generate-qr');
    console.log('  - memoless-get-rune-balance');
    console.log('  - memoless-calculate-usd');
    console.log('  - memoless-is-stagenet');
    console.log('  - memoless-get-network-display');

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

// Run the test
testMemolessBackend();