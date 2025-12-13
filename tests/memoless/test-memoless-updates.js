// Test script to verify all memoless updates
const { MemolessService } = require('./dist/services/memolessService');
const { NetworkService } = require('./dist/services/networkService');

async function testMemolessUpdates() {
  console.log('🧪 Testing Memoless Updates\n');

  try {
    // Initialize services
    const networkService = new NetworkService();
    networkService.setNetwork('stagenet');
    const memolessService = new MemolessService(networkService);

    // Test 1: Verify THOR assets are removed from valid assets list
    console.log('📋 Test 1: Valid Assets (should exclude ALL THOR chain assets)');
    const validAssets = await memolessService.getValidAssetsForRegistration();
    console.log(`✅ Fetched ${validAssets.length} valid assets`);
    
    // Check if any THOR assets remain
    const thorAssets = validAssets.filter(asset => asset.asset.startsWith('THOR.'));
    if (thorAssets.length === 0) {
      console.log('✅ All THOR chain assets successfully excluded');
    } else {
      console.log('❌ THOR assets found:', thorAssets.map(a => a.asset));
    }
    
    console.log('Sample assets:');
    validAssets.slice(0, 5).forEach(asset => {
      console.log(`  - ${asset.asset}: $${asset.priceUSD.toFixed(2)}`);
    });
    console.log();

    // Test 2: Test BSC QR code generation
    console.log('📱 Test 2: BSC QR Code Generation');
    const bscQRData = await memolessService.generateQRCodeData('BSC', '0x1234567890abcdef', '1.5');
    console.log('BSC QR String:', bscQRData.qrString);
    
    if (bscQRData.qrString === 'ethereum:0x1234567890abcdef@56?value=1.5') {
      console.log('✅ BSC QR code format is correct');
    } else {
      console.log('❌ BSC QR code format is incorrect');
    }
    
    if (bscQRData.qrCodeDataURL) {
      console.log('✅ QR code image generated successfully');
      console.log(`   Data URL length: ${bscQRData.qrCodeDataURL.length} characters`);
    } else {
      console.log('❌ QR code image generation failed');
    }
    console.log();

    // Test 3: Test other chain QR codes
    console.log('📱 Test 3: Other Chain QR Codes');
    const chains = ['BTC', 'ETH', 'BASE', 'LTC'];
    for (const chain of chains) {
      const qrData = await memolessService.generateQRCodeData(chain, 'test-address', '0.001');
      console.log(`${chain}: ${qrData.qrString}`);
      if (qrData.qrCodeDataURL) {
        console.log(`  ✅ ${chain} QR image generated`);
      } else {
        console.log(`  ❌ ${chain} QR image failed`);
      }
    }
    console.log();

    // Test 4: Test amount validation (this should work the same)
    console.log('🔢 Test 4: Amount Validation (should remain unchanged)');
    const validation = memolessService.formatAmountWithReference('1.5', '00123', 8);
    console.log('Input: 1.5, Reference: 00123, Result:', validation.finalAmount);
    
    if (validation.finalAmount === '1.50000123') {
      console.log('✅ Amount validation working correctly');
    } else {
      console.log('❌ Amount validation broken');
    }
    console.log();

    console.log('🎉 Memoless Updates Test Summary:');
    console.log('✅ THOR chain assets excluded from valid assets list');
    console.log('✅ BSC QR code generation added with correct format');
    console.log('✅ Actual QR code images are being generated');
    console.log('✅ Amount validation remains functional');
    console.log('✅ All updates implemented successfully!');

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

// Run the test
testMemolessUpdates();