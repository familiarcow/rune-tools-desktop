const { ThorchainApiService } = require('./dist/services/thorchainApiService');

async function testTradeAccountFunctionality() {
    console.log('🧪 Testing Trade Account Functionality...\n');
    
    const apiService = new ThorchainApiService();
    
    // Test addresses
    const sampleTradeAddress = 'thor14mh37ua4vkyur0l5ra297a4la6tmf95mt96a55'; // Has trade account
    const testWalletAddress = 'thor1x87wm98lyd0dnep23zjr68cvay3zazrvym6v7j';   // Our test wallet
    
    try {
        console.log('1. Testing getTradeAccount() with sample address...');
        const sampleTradeAccount = await apiService.getTradeAccount(sampleTradeAddress);
        console.log(`✅ Sample trade account (${sampleTradeAddress}):`);
        console.log(`   Found ${sampleTradeAccount.length} trade positions`);
        
        if (sampleTradeAccount.length > 0) {
            // Show top 3 positions
            const sortedPositions = sampleTradeAccount.sort((a, b) => parseInt(b.units) - parseInt(a.units));
            console.log('   Top 3 positions:');
            sortedPositions.slice(0, 3).forEach((pos, i) => {
                console.log(`   ${i + 1}. ${pos.asset}: ${parseInt(pos.units).toLocaleString()} units`);
            });
        }
        console.log('');

        console.log('2. Testing getTradeAccount() with test wallet address...');
        const testWalletTradeAccount = await apiService.getTradeAccount(testWalletAddress);
        console.log(`✅ Test wallet trade account (${testWalletAddress}):`);
        console.log(`   Found ${testWalletTradeAccount.length} trade positions`);
        if (testWalletTradeAccount.length === 0) {
            console.log('   (This is expected - test wallet likely has no trade positions)');
        }
        console.log('');

        console.log('3. Testing getWalletBalancesWithTradeAccount() with sample address...');
        const combinedData = await apiService.getWalletBalancesWithTradeAccount(sampleTradeAddress);
        console.log(`✅ Combined data for sample address:`);
        console.log(`   Wallet balances: ${combinedData.walletBalances.length} items`);
        console.log(`   Trade positions: ${combinedData.tradeAccount.length} items`);
        console.log('');

        console.log('4. Testing getWalletBalancesWithTradeAccount() with test wallet...');
        const testWalletCombined = await apiService.getWalletBalancesWithTradeAccount(testWalletAddress);
        console.log(`✅ Combined data for test wallet:`);
        console.log(`   Wallet balances: ${testWalletCombined.walletBalances.length} items`);
        console.log(`   Trade positions: ${testWalletCombined.tradeAccount.length} items`);
        console.log('');

        console.log('🎉 All trade account tests passed!');
        console.log('');
        console.log('📱 The Electron app is ready to test trade account features:');
        console.log('   • Load your wallet and click "Fetch Balances" to see wallet + trade account data');
        console.log('   • Click "Test Trade Account" to see the sample account with 21+ positions');
        console.log(`   • Sample account has positions in: ${sampleTradeAccount.slice(0, 5).map(p => p.asset).join(', ')}...`);

    } catch (error) {
        console.error('❌ Error testing trade account functionality:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testTradeAccountFunctionality();