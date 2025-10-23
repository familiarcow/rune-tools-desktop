/**
 * Debug Application - Progressive Loading Test
 * 
 * This will test each component step by step to isolate the exact failure point.
 */

console.log('🔍 Debug app starting...');

window.addEventListener('load', async () => {
    try {
        console.log('✅ Window Load Event - all scripts should be loaded');
        
        // Wait a bit more to ensure all scripts have executed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const errorDiv = document.createElement('div');
        errorDiv.id = 'debugOutput';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 20px;
            font-family: monospace;
            font-size: 12px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 9999;
            border-radius: 8px;
        `;
        document.body.appendChild(errorDiv);
        
        const log = (message) => {
            console.log(message);
            errorDiv.innerHTML += message + '<br>';
        };
        
        const error = (message, err) => {
            console.error(message, err);
            errorDiv.innerHTML += `<span style="color: #ff6b6b;">${message}: ${err?.message || err}</span><br>`;
            if (err?.stack) {
                errorDiv.innerHTML += `<span style="color: #ffa726; font-size: 10px;">${err.stack}</span><br>`;
            }
        };
        
        log('🔍 Starting progressive loading test...');
        
        // Test 1: Check if basic DOM elements exist
        log('Test 1: Checking DOM elements...');
        const app = document.getElementById('app');
        const walletPhase = document.getElementById('walletSelectionPhase');
        const mainPhase = document.getElementById('mainAppPhase');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const toastContainer = document.getElementById('toastContainer');
        
        if (!app) throw new Error('App element not found');
        if (!walletPhase) throw new Error('WalletSelectionPhase element not found');
        if (!mainPhase) throw new Error('MainAppPhase element not found');
        if (!loadingOverlay) throw new Error('LoadingOverlay element not found');
        if (!toastContainer) throw new Error('ToastContainer element not found');
        log('✅ All required DOM elements found');
        
        // Test 2: Check if basic script execution works
        log('Test 2: Checking inline test classes...');
        
        log('Checking TestClass1 (inline script)...');
        const test1Type = typeof window.TestClass1;
        log(`TestClass1: ${test1Type}`);
        if (test1Type === 'undefined') {
            error('TestClass1 not available - basic script execution failed', new Error('TestClass1 missing'));
        }
        
        log('Checking TestClass2 (inline script after external)...');
        const test2Type = typeof window.TestClass2;
        log(`TestClass2: ${test2Type}`);
        if (test2Type === 'undefined') {
            error('TestClass2 not available - script execution interrupted', new Error('TestClass2 missing'));
        }
        
        // Test 3: Check if service classes are available - one by one
        log('Test 3: Checking service classes one by one...');
        
        log('Checking BackendService...');
        const backendType = typeof window.BackendService;
        log(`BackendService: ${backendType}`);
        if (backendType === 'undefined') {
            error('BackendService class not available', new Error('BackendService missing'));
        }
        
        log('Checking StateManager...');
        const stateType = typeof window.StateManager;
        log(`StateManager: ${stateType}`);
        if (stateType === 'undefined') {
            error('StateManager class not available', new Error('StateManager missing'));
        }
        
        log('Checking UIService...');
        const uiType = typeof window.UIService;
        log(`UIService: ${uiType}`);
        if (uiType === 'undefined') {
            error('UIService class not available', new Error('UIService missing'));
        }
        
        log('Checking Utils...');
        const utilsType = typeof window.Utils;
        log(`Utils: ${utilsType}`);
        if (utilsType === 'undefined') {
            throw new Error(`Utils class not available - previous scripts may have failed`);
        }
        
        log('✅ All service classes available');
        
        // Test 3: Try to instantiate services one by one
        log('Test 3: Instantiating services...');
        
        const services = {};
        
        log('Creating Utils...');
        services.utils = new Utils();
        log('✅ Utils created');
        
        log('Creating BackendService...');
        services.backend = new BackendService();
        log('✅ BackendService created');
        
        log('Creating StateManager...');
        services.state = new StateManager();
        log('✅ StateManager created');
        
        log('Creating UIService...');
        services.ui = new UIService();
        log('✅ UIService created');
        
        // Test 4: Try to initialize services one by one
        log('Test 4: Initializing services...');
        
        log('Initializing BackendService...');
        await services.backend.initialize();
        log('✅ BackendService initialized');
        
        log('Initializing StateManager...');
        await services.state.initialize();
        log('✅ StateManager initialized');
        
        log('Initializing UIService...');
        await services.ui.initialize();
        log('✅ UIService initialized');
        
        // Test 5: Check controller classes
        log('Test 5: Checking controller classes...');
        const controllerClasses = ['WalletSelectionController', 'ApplicationController', 'HeaderDisplay', 'SettingsManager'];
        for (const className of controllerClasses) {
            const classType = typeof window[className];
            log(`${className}: ${classType}`);
            if (classType === 'undefined') {
                error(`${className} class not available`, new Error('Class missing'));
                continue; // Don't throw, continue testing
            }
        }
        
        // Test 6: Try to create wallet selection controller
        log('Test 6: Creating WalletSelectionController...');
        if (typeof WalletSelectionController !== 'undefined') {
            const walletController = new WalletSelectionController(walletPhase, services);
            log('✅ WalletSelectionController created');
            
            log('Initializing WalletSelectionController...');
            await walletController.initialize([]);
            log('✅ WalletSelectionController initialized');
        } else {
            error('WalletSelectionController not available', new Error('Class missing'));
        }
        
        // Test 7: Show success
        log('🎉 All tests passed! The application should work.');
        walletPhase.style.display = 'flex';
        loadingOverlay.style.display = 'none';
        
    } catch (err) {
        console.error('❌ Debug test failed:', err);
        const errorDiv = document.getElementById('debugOutput') || document.body;
        errorDiv.innerHTML += `<span style="color: #ff6b6b;">❌ FATAL ERROR: ${err.message}</span><br>`;
        if (err.stack) {
            errorDiv.innerHTML += `<span style="color: #ffa726; font-size: 10px;">${err.stack}</span><br>`;
        }
        
        // Show error in main UI as well
        const mainError = document.createElement('div');
        mainError.innerHTML = `
            <div style="
                position: fixed; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                background: #ff6b6b; 
                color: white; 
                padding: 20px; 
                border-radius: 8px; 
                z-index: 9998;
                font-family: system-ui;
                text-align: center;
                max-width: 400px;
            ">
                <strong>Debug Test Failed</strong><br>
                ${err.message}<br>
                <small>Check debug panel for details</small>
            </div>
        `;
        document.body.appendChild(mainError);
    }
});