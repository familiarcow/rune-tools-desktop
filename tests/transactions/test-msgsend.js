const { TransactionService } = require('./dist/services/transactionService');
const { THORWalletService } = require('./dist/services/walletService');

async function testMsgSendTransaction() {
    const testSeedPhrase = 'glove romance mirror crisp vivid luxury arch thunder spirit soft supply tattoo';
    
    try {
        console.log('🧪 Testing MsgSend Transaction Service...');
        
        // Create wallet
        const walletInfo = await THORWalletService.createWalletFromSeed(testSeedPhrase);
        console.log('✅ Wallet created:', walletInfo.address);
        
        // Test MsgSend parameters (to THORChain module address for deposit-like behavior)
        const msgSendParams = {
            asset: 'THOR.RUNE',
            amount: '1000000', // 1 RUNE
            toAddress: 'thor1v8ppstuf6e3x0r4glqc68d5jqcs2tf38cg2q6y', // THORChain module
            memo: 'SWAP:BTC.BTC:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            useMsgDeposit: false // Use MsgSend
        };
        
        console.log('Transaction parameters:', JSON.stringify(msgSendParams, null, 2));
        
        // Test transaction preparation
        const preparedTx = TransactionService.prepareMsgSend(walletInfo.address, msgSendParams);
        console.log('✅ MsgSend prepared successfully');
        console.log('Message:', JSON.stringify(preparedTx.message, null, 2));
        
        // Test parameter validation
        TransactionService.validateTransactionParams(msgSendParams);
        console.log('✅ Parameters validated successfully');
        
        // Test CosmJS client setup (this will connect to network)
        console.log('🔗 Testing network connection...');
        try {
            const { client, signerAddress } = await TransactionService.setupCosmosClient(walletInfo);
            console.log('✅ CosmJS client connected successfully');
            console.log('Signer address:', signerAddress);
            
            // Test gas estimation (this requires network and may fail if no balance)
            console.log('⛽ Testing gas estimation...');
            try {
                const gasEstimate = await TransactionService.estimateGas(walletInfo, msgSendParams);
                console.log('✅ Gas estimated:', gasEstimate);
            } catch (gasError) {
                console.log('⚠️ Gas estimation failed (expected if no balance):', gasError.message);
            }
            
            console.log('');
            console.log('🎉 MsgSend transaction preparation successful!');
            console.log('📝 Next: Test with actual balance to complete transaction broadcasting');
            
        } catch (networkError) {
            console.log('❌ Network connection failed:', networkError.message);
            console.log('   This might be due to network issues or RPC endpoint problems');
        }
        
    } catch (error) {
        console.error('❌ Error testing MsgSend transaction:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testMsgSendTransaction();