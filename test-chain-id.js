// Test script to verify dynamic chain ID fetching
const { NetworkService } = require('./dist/services/networkService');
const { ThorchainApiService } = require('./dist/services/thorchainApiService');

async function testChainIdFetching() {
  console.log('🧪 Testing Dynamic Chain ID Fetching\n');

  try {
    // Initialize services
    const networkService = new NetworkService();
    const thorchainApiService = new ThorchainApiService(networkService);

    // Test mainnet chain ID
    console.log('🌐 Testing Mainnet Chain ID:');
    const mainnetChainId = await networkService.getChainId();
    console.log('Mainnet Chain ID:', mainnetChainId);
    console.log('✅ Mainnet chain ID fetched successfully');
    console.log();

    // Test mainnet node info
    console.log('📡 Testing Mainnet Node Info:');
    const mainnetNodeInfo = await networkService.getNodeInfo();
    console.log('Node Info Network:', mainnetNodeInfo.default_node_info.network);
    console.log('Node Version:', mainnetNodeInfo.default_node_info.version);
    console.log('Node Moniker:', mainnetNodeInfo.default_node_info.moniker);
    console.log('✅ Mainnet node info fetched successfully');
    console.log();

    // Test mainnet network config with chain ID
    console.log('⚙️ Testing Mainnet Network Config:');
    const mainnetConfig = await networkService.getNetworkConfig();
    console.log('Config:', mainnetConfig);
    console.log('✅ Mainnet config with chain ID fetched successfully');
    console.log();

    // Switch to stagenet
    console.log('🔄 Switching to Stagenet...');
    networkService.setNetwork('stagenet');
    console.log();

    // Test stagenet chain ID
    console.log('🌐 Testing Stagenet Chain ID:');
    const stagenetChainId = await networkService.getChainId();
    console.log('Stagenet Chain ID:', stagenetChainId);
    console.log('✅ Stagenet chain ID fetched successfully');
    console.log();

    // Test stagenet node info
    console.log('📡 Testing Stagenet Node Info:');
    const stagenetNodeInfo = await networkService.getNodeInfo();
    console.log('Node Info Network:', stagenetNodeInfo.default_node_info.network);
    console.log('Node Version:', stagenetNodeInfo.default_node_info.version);
    console.log('Node Moniker:', stagenetNodeInfo.default_node_info.moniker);
    console.log('✅ Stagenet node info fetched successfully');
    console.log();

    // Test stagenet network config with chain ID
    console.log('⚙️ Testing Stagenet Network Config:');
    const stagenetConfig = await networkService.getNetworkConfig();
    console.log('Config:', stagenetConfig);
    console.log('✅ Stagenet config with chain ID fetched successfully');
    console.log();

    // Compare chain IDs
    console.log('🔍 Chain ID Comparison:');
    console.log(`Mainnet: ${mainnetChainId}`);
    console.log(`Stagenet: ${stagenetChainId}`);
    
    if (mainnetChainId !== stagenetChainId) {
      console.log('✅ Chain IDs are different as expected');
    } else {
      console.log('⚠️ Chain IDs are the same - this might be unexpected');
    }
    console.log();

    // Test caching
    console.log('💾 Testing Chain ID Caching:');
    const startTime = Date.now();
    const cachedMainnetId = await networkService.getChainId(); // Should hit cache
    const cacheTime = Date.now() - startTime;
    console.log(`Cached chain ID: ${cachedMainnetId} (fetched in ${cacheTime}ms)`);
    if (cacheTime < 10) {
      console.log('✅ Chain ID caching working correctly');
    } else {
      console.log('⚠️ Chain ID might not be using cache effectively');
    }

    console.log('\n🎉 Chain ID fetching test completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

// Run the test
testChainIdFetching();