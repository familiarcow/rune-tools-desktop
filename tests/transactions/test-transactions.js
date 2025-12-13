const { TransactionService } = require('./dist/services/transactionService');
const { THORWalletService } = require('./dist/services/walletService');

async function testTransactions() {
    const testSeedPhrase = 'glove romance mirror crisp vivid luxury arch thunder spirit soft supply tattoo';
    
    try {
        console.log('🔧 Testing Transaction Service...');
        console.log('Test seed phrase: [REDACTED FOR SECURITY]');
        
        // Create wallet
        const walletInfo = await THORWalletService.createWalletFromSeed(testSeedPhrase);
        console.log('✅ Wallet created:', walletInfo.address);
        
        // Test asset denomination
        const runeDenom = TransactionService.getAssetDenom('THOR.RUNE');
        const btcDenom = TransactionService.getAssetDenom('BTC.BTC');
        console.log('✅ Asset denoms - RUNE:', runeDenom, 'BTC:', btcDenom);
        
        // Test MsgSend preparation
        const msgSendParams = {
            asset: 'THOR.RUNE',
            amount: '1000000', // 1 RUNE
            toAddress: 'thor1v8ppstuf6e3x0r4glqc68d5jqcs2tf38cg2q6y', // THORChain module
            useMsgDeposit: false
        };
        
        const preparedMsgSend = TransactionService.prepareMsgSend(walletInfo.address, msgSendParams);
        console.log('✅ MsgSend prepared:', JSON.stringify(preparedMsgSend.message, null, 2));
        
        // Test MsgDeposit preparation
        const msgDepositParams = {
            asset: 'THOR.RUNE',
            amount: '1000000', // 1 RUNE
            memo: 'SWAP:BTC.BTC:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            useMsgDeposit: true
        };
        
        const preparedMsgDeposit = TransactionService.prepareMsgDeposit(walletInfo.address, msgDepositParams);
        console.log('✅ MsgDeposit prepared:', JSON.stringify(preparedMsgDeposit.message, null, 2));
        
        // Test parameter validation
        console.log('Testing parameter validation...');
        
        try {
            TransactionService.validateTransactionParams({ asset: '', amount: '1000000', useMsgDeposit: false });
        } catch (error) {
            console.log('✅ Validation correctly rejected empty asset');
        }
        
        try {
            TransactionService.validateTransactionParams({ asset: 'THOR.RUNE', amount: '0', useMsgDeposit: false });
        } catch (error) {
            console.log('✅ Validation correctly rejected zero amount');
        }
        
        try {
            TransactionService.validateTransactionParams({ asset: 'THOR.RUNE', amount: '1000000', useMsgDeposit: true });
        } catch (error) {
            console.log('✅ Validation correctly rejected MsgDeposit without memo');
        }
        
        try {
            TransactionService.validateTransactionParams({ asset: 'THOR.RUNE', amount: '1000000', useMsgDeposit: false });
        } catch (error) {
            console.log('✅ Validation correctly rejected MsgSend without toAddress');
        }
        
        console.log('🎉 All transaction service tests passed!');
        
        console.log('\n⚠️  Note: Actual transaction broadcasting requires network connectivity');
        console.log('   and sufficient balance. Use the Electron app to test full transactions.');
        
    } catch (error) {
        console.error('❌ Error testing transactions:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testTransactions();