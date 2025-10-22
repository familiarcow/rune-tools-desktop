const { THORWalletService } = require('./dist/services/walletService');

async function testWallet() {
    const testSeedPhrase = 'glove romance mirror crisp vivid luxury arch thunder spirit soft supply tattoo';
    const expectedAddress = 'thor1x87wm98lyd0dnep23zjr68cvay3zazrvym6v7j';
    
    try {
        console.log('Testing wallet service...');
        console.log('Test seed phrase:', testSeedPhrase);
        console.log('Expected address:', expectedAddress);
        
        const walletInfo = await THORWalletService.createWalletFromSeed(testSeedPhrase);
        
        console.log('Generated address:', walletInfo.address);
        console.log('Public key:', walletInfo.publicKey);
        
        const addressMatch = walletInfo.address === expectedAddress;
        console.log('Address match:', addressMatch ? '✅' : '❌');
        
        if (!addressMatch) {
            console.log('❌ Address mismatch! Expected:', expectedAddress, 'Got:', walletInfo.address);
        } else {
            console.log('✅ Wallet service working correctly!');
        }
        
    } catch (error) {
        console.error('❌ Error testing wallet:', error.message);
    }
}

testWallet();