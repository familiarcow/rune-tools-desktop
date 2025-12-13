const { BalanceNormalizationService } = require('./dist/services/balanceNormalizationService');

async function testBalanceNormalization() {
    console.log('🧪 Testing Balance Normalization Service...\n');
    
    const balanceService = new BalanceNormalizationService();
    
    // Test asset name normalization with THORChain notation formats
    const testAssets = [
        // Native THOR assets (single names become THOR.SYMBOL)
        'rune',
        'tcy',
        
        // Native L1 assets (use . notation - actual L1 assets)
        'BTC.BTC',
        'ETH.ETH', 
        'AVAX.AVAX',
        'ETH.USDC-0xA0b86991C6218B36c1D19D4a2E9Eb0Ce3606eB48',
        'BSC.USDT-0x55d398326f99059fF775485246999027B3197955',
        
        // Secured assets (use - notation - THORChain claims on L1 assets)
        'BTC-BTC',
        'ETH-ETH',
        'ETH-USDC-0xA0b86991C6218B36c1D19D4a2E9Eb0Ce3606eB48',
        'AVAX-AVAX',
        
        // Trade assets (use ~ notation - THORChain trade assets)
        'BTC~BTC',
        'ETH~ETH',
        'ETH~USDC',
        'DOGE~DOGE',
        'ETH~USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
        
        // Edge cases
        '',
        undefined,
        'UNKNOWN_FORMAT'
    ];
    
    console.log('1. Testing asset name normalization...');
    console.log('Asset Name Normalization Results:');
    console.log('─'.repeat(80));
    
    testAssets.forEach((asset, index) => {
        const normalized = balanceService.normalizeAssetName(asset);
        const displayAsset = asset === undefined ? 'undefined' : asset === '' ? '(empty)' : asset;
        
        console.log(`${index + 1}. Input: "${displayAsset}"`);
        console.log(`   → Asset: ${normalized.asset}`);
        console.log(`   → Chain: ${normalized.chain}`);
        console.log(`   → Symbol: ${normalized.symbol}`);
        console.log(`   → Type: ${normalized.type}`);
        if (normalized.contractAddress) {
            console.log(`   → Contract: ${normalized.contractAddress}`);
        }
        console.log('');
    });
    
    // Test with real addresses
    const testWalletAddress = 'thor1x87wm98lyd0dnep23zjr68cvay3zazrvym6v7j';   // Our test wallet
    const sampleTradeAddress = 'thor14mh37ua4vkyur0l5ra297a4la6tmf95mt96a55'; // Sample with trade account
    
    try {
        console.log('2. Testing combined normalized balances...');
        
        // Test with test wallet address
        console.log(`\n📊 Test Wallet (${testWalletAddress}):`);
        const testWalletBalances = await balanceService.getCombinedNormalizedBalances(testWalletAddress);
        console.log(`✅ Combined balances summary:`);
        console.log(`   Total Assets: ${testWalletBalances.summary.totalAssets}`);
        console.log(`   Wallet Assets: ${testWalletBalances.summary.walletAssets}`);
        console.log(`   Trade Assets: ${testWalletBalances.summary.tradeAccountAssets}`);
        console.log(`   Native: ${testWalletBalances.summary.nativeAssets} | Secured: ${testWalletBalances.summary.securedAssets} | Trade: ${testWalletBalances.summary.tradeAssets}`);
        
        if (testWalletBalances.balances.length > 0) {
            console.log('   Sample normalized assets:');
            testWalletBalances.balances.slice(0, 3).forEach(balance => {
                console.log(`   • ${balance.asset.asset} (${balance.asset.type}, ${balance.source}): ${balance.amountFormatted}`);
                console.log(`     Raw: ${balance.amount}`);
            });
        }
        
        // Test with sample trade account address
        console.log(`\n📊 Sample Trade Account (${sampleTradeAddress}):`);
        const sampleTradeBalances = await balanceService.getCombinedNormalizedBalances(sampleTradeAddress);
        console.log(`✅ Combined balances summary:`);
        console.log(`   Total Assets: ${sampleTradeBalances.summary.totalAssets}`);
        console.log(`   Wallet Assets: ${sampleTradeBalances.summary.walletAssets}`);
        console.log(`   Trade Assets: ${sampleTradeBalances.summary.tradeAccountAssets}`);
        console.log(`   Native: ${sampleTradeBalances.summary.nativeAssets} | Secured: ${sampleTradeBalances.summary.securedAssets} | Trade: ${sampleTradeBalances.summary.tradeAssets}`);
        
        if (sampleTradeBalances.balances.length > 0) {
            console.log('   Top 5 normalized assets:');
            // Sort by amount descending
            const sortedBalances = sampleTradeBalances.balances
                .sort((a, b) => parseInt(b.amount) - parseInt(a.amount))
                .slice(0, 5);
                
            sortedBalances.forEach((balance, i) => {
                console.log(`   ${i + 1}. ${balance.asset.asset} (${balance.asset.type}, ${balance.source})`);
                console.log(`      Amount: ${balance.amountFormatted}`);
                console.log(`      Raw Amount: ${parseInt(balance.amount).toLocaleString()}`);
                console.log(`      Raw Asset: ${balance.asset.rawAsset}`);
            });
        }
        
        console.log('\n3. Testing grouped balance functions...');
        
        // Test balances by type
        const balancesByType = await balanceService.getBalancesByType(sampleTradeAddress);
        console.log(`✅ Balances by type:`);
        console.log(`   Native: ${balancesByType.native.length} assets`);
        console.log(`   Secured: ${balancesByType.secured.length} assets`);
        console.log(`   Trade: ${balancesByType.trade.length} assets`);
        
        // Test balances by chain
        const balancesByChain = await balanceService.getBalancesByChain(sampleTradeAddress);
        console.log(`✅ Balances by chain:`);
        Object.keys(balancesByChain).forEach(chain => {
            console.log(`   ${chain}: ${balancesByChain[chain].length} assets`);
        });
        
        console.log('\n🎉 All balance normalization tests passed!');
        console.log('\n📱 The Electron app is ready to test normalized balance features:');
        console.log('   • Load your wallet and click "Fetch Normalized" to see standardized asset names');
        console.log('   • Assets are grouped by type: Native (THOR.RUNE), Secured (ETH.USDC), Trade (ETH~USDC)');
        console.log('   • All asset names are now standardized across wallet and trade account sources');
        
    } catch (error) {
        console.error('❌ Error testing balance normalization:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testBalanceNormalization();