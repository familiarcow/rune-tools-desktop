// Test script to verify network switching functionality
const { NetworkService } = require('./dist/services/networkService');
const { ThorchainApiService } = require('./dist/services/thorchainApiService');

async function testNetworkSwitching() {
  console.log('🧪 Testing Network Switching Functionality\n');

  try {
    // Initialize services
    const networkService = new NetworkService();
    const thorchainApiService = new ThorchainApiService(networkService);

    console.log('📋 Initial Network Configuration:');
    console.log('Current Network:', networkService.getCurrentNetwork());
    console.log('Config:', networkService.getNetworkConfig());
    console.log('Endpoints:', networkService.getEndpoints());
    console.log();

    // Test mainnet thorchain module address
    console.log('🌐 Testing Mainnet THORChain Module Address:');
    try {
      const mainnetModuleAddress = await thorchainApiService.getThorchainModuleAddress();
      console.log('Mainnet Module Address:', mainnetModuleAddress);
      console.log('✅ Mainnet module address fetched successfully');
    } catch (error) {
      console.log('❌ Mainnet module address fetch failed:', error.message);
    }
    console.log();

    // Switch to stagenet
    console.log('🔄 Switching to Stagenet...');
    networkService.setNetwork('stagenet');
    
    console.log('📋 Updated Network Configuration:');
    console.log('Current Network:', networkService.getCurrentNetwork());
    console.log('Config:', networkService.getNetworkConfig());
    console.log('Endpoints:', networkService.getEndpoints());
    console.log();

    // Test stagenet thorchain module address
    console.log('🌐 Testing Stagenet THORChain Module Address:');
    try {
      const stagenetModuleAddress = await thorchainApiService.getThorchainModuleAddress();
      console.log('Stagenet Module Address:', stagenetModuleAddress);
      console.log('✅ Stagenet module address fetched successfully');
      
      // Verify address prefix is different
      if (stagenetModuleAddress.startsWith('sthor')) {
        console.log('✅ Stagenet address has correct prefix (sthor)');
      } else {
        console.log('❌ Stagenet address does not have sthor prefix');
      }
    } catch (error) {
      console.log('❌ Stagenet module address fetch failed:', error.message);
    }
    console.log();

    // Test API endpoints
    console.log('📡 Testing API Endpoints:');
    try {
      const pools = await thorchainApiService.getPools();
      console.log(`✅ Successfully fetched ${pools.length} pools from stagenet`);
      
      if (pools.length > 0) {
        console.log(`Sample pool: ${pools[0].asset} (${pools[0].status})`);
      }
    } catch (error) {
      console.log('❌ Pool fetch failed:', error.message);
    }
    console.log();

    // Switch back to mainnet
    console.log('🔄 Switching back to Mainnet...');
    networkService.setNetwork('mainnet');
    
    console.log('📋 Final Network Configuration:');
    console.log('Current Network:', networkService.getCurrentNetwork());
    console.log();

    console.log('🎉 Network switching test completed!');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

// Run the test
testNetworkSwitching();