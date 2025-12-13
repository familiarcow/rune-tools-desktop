const { TransactionTrackingService } = require('./dist/services/transactionTrackingService');

async function testTransactionTracking() {
    console.log('🔍 Testing Transaction Tracking Fix...\n');
    
    const trackingService = new TransactionTrackingService();
    
    // Test the specific transaction that was showing as undefined
    const testTxHash = '111F3BF85F2FF2302189F02BAEC699B0E08BFE14376530C60F8107827A7268E6';
    
    try {
        console.log(`Testing transaction: ${testTxHash}`);
        console.log('Expected: Should show as "done" with all stages completed\n');
        
        const summary = await trackingService.getTransactionSummary(testTxHash);
        
        console.log('✅ Transaction Summary Result:');
        console.log(`Hash: ${summary.hash}`);
        console.log(`Status: ${summary.status}`);
        
        if (summary.error) {
            console.log(`❌ Error: ${summary.error}`);
        }
        
        console.log('\n📋 Stages:');
        summary.stages.forEach((stage, i) => {
            const status = stage.completed ? '✅' : '⏳';
            console.log(`  ${i + 1}. ${status} ${stage.name}`);
            if (stage.details) {
                console.log(`     └─ ${stage.details}`);
            }
        });
        
        // Check if all stages are completed
        const allCompleted = summary.stages.every(stage => stage.completed);
        console.log(`\n🎯 Overall Result:`);
        console.log(`   All stages completed: ${allCompleted ? '✅ YES' : '❌ NO'}`);
        console.log(`   Status: "${summary.status}"`);
        
        if (allCompleted && summary.status === 'done') {
            console.log('\n🎉 SUCCESS: Transaction correctly shows as completed!');
        } else {
            console.log('\n⚠️  Issue: Transaction should show as completed but doesn\'t');
        }
        
        // Test basic tx info availability
        if (summary.basicInfo) {
            console.log('\n📊 Basic Info Available:');
            console.log(`   From: ${summary.basicInfo.from_address}`);
            console.log(`   To: ${summary.basicInfo.to_address}`);
            console.log(`   Memo: ${summary.basicInfo.memo}`);
        } else {
            console.log('\n📊 Basic Info: Not available (this is normal for some transactions)');
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testTransactionTracking();