/**
 * Simple Application Test
 * 
 * Minimal version to test basic functionality
 */

console.log('🚀 Starting simple app test...');

// Test basic DOM manipulation
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('✅ DOM Content Loaded');
        
        // Test basic elements exist
        const app = document.getElementById('app');
        if (!app) {
            throw new Error('App element not found');
        }
        
        console.log('✅ App element found');
        
        // Test basic service loading
        if (typeof Utils === 'undefined') {
            throw new Error('Utils class not available');
        }
        
        if (typeof BackendService === 'undefined') {
            throw new Error('BackendService class not available');
        }
        
        console.log('✅ Basic classes loaded');
        
        // Try to create basic services
        const utils = new Utils();
        const backend = new BackendService();
        
        console.log('✅ Services instantiated');
        
        // Test backend initialization
        await backend.initialize();
        console.log('✅ Backend service initialized');
        
        // Show success message
        const walletSelectionPhase = document.getElementById('walletSelectionPhase');
        if (walletSelectionPhase) {
            walletSelectionPhase.innerHTML = `
                <div class="wallet-selection-screen">
                    <div class="brand-header">
                        <div class="brand-logo">⚡</div>
                        <h1>Rune Tools</h1>
                        <p>Application loaded successfully!</p>
                    </div>
                    <div class="loading-section">
                        <p>✅ All basic services initialized</p>
                        <p>Ready for full implementation</p>
                    </div>
                </div>
            `;
            
            // Show the wallet selection phase
            walletSelectionPhase.style.display = 'flex';
        }
        
        console.log('🎉 Simple app test completed successfully!');
        
    } catch (error) {
        console.error('❌ Simple app test failed:', error);
        
        // Show error in UI
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                position: fixed; 
                top: 20px; 
                right: 20px; 
                background: #ff6b6b; 
                color: white; 
                padding: 16px; 
                border-radius: 8px; 
                z-index: 9999;
                font-family: system-ui;
                max-width: 400px;
            ">
                <strong>Simple App Test Error</strong><br>
                ${error.message}<br>
                <small>Check console for details</small>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
});