// Debug script to see actual node info response structure
const axios = require('axios');

async function debugNodeInfo() {
  console.log('🔍 Debugging Node Info Response Structure\n');

  try {
    // Test mainnet
    console.log('📡 Fetching Mainnet Node Info:');
    const mainnetResponse = await axios.get('https://thornode.ninerealms.com/cosmos/base/tendermint/v1beta1/node_info');
    console.log('Response structure:', JSON.stringify(mainnetResponse.data, null, 2));
    console.log();

    // Also try the direct tendermint endpoint
    console.log('📡 Trying Alternative Mainnet Endpoint:');
    try {
      const altResponse = await axios.get('https://rpc.ninerealms.com/node_info');
      console.log('Alternative response:', JSON.stringify(altResponse.data, null, 2));
    } catch (error) {
      console.log('Alternative endpoint failed:', error.message);
    }
    console.log();

  } catch (error) {
    console.error('💥 Debug failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

debugNodeInfo();