const { TransactionTrackingService } = require('./dist/services/transactionTrackingService');

async function testTransactionTracking() {
    const sampleTxHash = '30CC2BACBE6BB78474693148CE91499E3C1B6B5E96255E0F4A082C0B8DB5BDC9';
    const trackingService = new TransactionTrackingService();
    
    console.log('🔍 Testing Transaction Tracking Service');
    console.log('Sample TX Hash:', sampleTxHash);
    console.log('');

    try {
        // Test basic transaction info
        console.log('1. Testing getTx() - Basic transaction info...');
        const basicTx = await trackingService.getTx(sampleTxHash);
        console.log('✅ Basic TX Info:');
        console.log(`   Status: ${basicTx.status}`);
        console.log(`   From: ${basicTx.from_address}`);
        console.log(`   To: ${basicTx.to_address}`);
        console.log(`   Memo: ${basicTx.memo}`);
        console.log('');

        // Test transaction stages
        console.log('2. Testing getTxStages() - Processing stages...');
        const stages = await trackingService.getTxStages(sampleTxHash);
        console.log('✅ Transaction Stages:');
        console.log(`   Inbound Observed: ${stages.inbound_observed.completed ? '✅' : '⏳'}`);
        console.log(`   Inbound Confirmed: ${stages.inbound_confirmation_counted.completed ? '✅' : '⏳'}`);
        console.log(`   Inbound Finalized: ${stages.inbound_finalised.completed ? '✅' : '⏳'}`);
        console.log(`   Swap Pending: ${stages.swap_status.pending ? '⏳' : '✅'}`);
        if (stages.swap_finalised) {
            console.log(`   Swap Finalized: ${stages.swap_finalised.completed ? '✅' : '⏳'}`);
        }
        console.log('');

        // Test transaction summary
        console.log('3. Testing getTransactionSummary() - Formatted summary...');
        const summary = await trackingService.getTransactionSummary(sampleTxHash);
        console.log('✅ Transaction Summary:');
        console.log(`   Hash: ${summary.hash}`);
        console.log(`   Status: ${summary.status}`);
        console.log('   Stages:');
        summary.stages.forEach(stage => {
            console.log(`     ${stage.completed ? '✅' : '⏳'} ${stage.name}${stage.details ? ` - ${stage.details}` : ''}`);
        });
        console.log('');

        // Test detailed transaction info
        console.log('4. Testing getTxDetails() - Detailed transaction info...');
        const details = await trackingService.getTxDetails(sampleTxHash);
        console.log('✅ Transaction Details:');
        console.log(`   Actions: ${details.actions.length} action(s)`);
        if (details.actions.length > 0) {
            const action = details.actions[0];
            console.log(`   Action Type: ${action.type}`);
            console.log(`   Action Status: ${action.status}`);
            if (action.metadata && action.metadata.swap) {
                console.log(`   Swap Memo: ${action.metadata.swap.memo}`);
                console.log(`   Swap Target: ${action.metadata.swap.swapTarget}`);
                console.log(`   Swap Slip: ${action.metadata.swap.swapSlip}`);
            }
        }
        console.log('');

        console.log('🎉 All transaction tracking tests passed!');
        console.log('');
        console.log('📱 The Electron app is ready to test transaction tracking:');
        console.log('   • Click "Test Sample TX" to load the sample transaction');
        console.log('   • Click "Track Transaction" for instant status');
        console.log('   • Click "Poll Until Complete" for real-time monitoring');

    } catch (error) {
        console.error('❌ Error testing transaction tracking:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testTransactionTracking();