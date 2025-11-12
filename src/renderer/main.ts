/**
 * Rune Tools Application - Main Entry Point
 * 
 * Two-phase application architecture:
 * Phase 1: Wallet Selection & Authentication
 * Phase 2: Main Application Interface
 */

// Polyfill Buffer for BIP39 library compatibility
import { Buffer } from 'buffer'
;(globalThis as any).Buffer = Buffer

// CSS imports
import './styles/password-input.css'
import './styles/pools-tab.css'
import './styles/wallet-selection-improved.css'

// Component imports
import { splashScreen } from './components/SplashScreen'

// Service imports
import { BackendService } from './services/BackendService'
import { StateManager } from './services/StateManager'
import { UIService } from './services/UIService'
import { Utils } from './services/Utils'

// Controller imports
import { WalletSelectionController } from './controllers/WalletSelectionController'

// Global application state
let app: RuneToolsApplication | null = null

class RuneToolsApplication {
    private backend: BackendService
    private state: StateManager
    private ui: UIService
    private utils: Utils
    private walletController: WalletSelectionController | null = null

    constructor() {
        this.backend = new BackendService()
        this.state = new StateManager()
        this.ui = new UIService()
        this.utils = new Utils()
        
        console.log('🔧 RuneToolsApplication created')
    }

    async initialize(): Promise<void> {
        try {
            console.log('🚀 Initializing Rune Tools Application...')

            // Initialize core services with individual error handling
            console.log('🔧 Initializing backend service...')
            await this.backend.initialize()
            console.log('✅ Backend service ready')

            console.log('🔧 Initializing state manager...')
            await this.state.initialize()
            console.log('✅ State manager ready')

            console.log('🔧 Initializing UI service...')
            await this.ui.initialize()
            console.log('✅ UI service ready')

            console.log('🔧 Initializing utils...')
            await this.utils.initialize()
            console.log('✅ Utils ready')

            console.log('✅ All core services initialized')

            // Check for existing session
            console.log('🔍 Checking for active session...')
            const activeSession = await this.backend.getActiveSession()
            
            if (activeSession) {
                console.log('🔄 Found active session, attempting to restore...')
                // TODO: Validate and restore session
                await this.startWalletSelection()
            } else {
                console.log('🆕 No active session found, starting wallet selection...')
                await this.startWalletSelection()
            }

        } catch (error) {
            console.error('❌ Failed to initialize application:', error)
            console.error('Error details:', error)
            
            // Hide splash screen on error
            await splashScreen.hide()
            
            this.showFatalError(error as Error)
        }
    }

    private async startWalletSelection(): Promise<void> {
        try {
            console.log('👛 Starting wallet selection phase...')

            // Initialize wallet selection controller
            this.walletController = new WalletSelectionController(
                this.backend,
                this.state,
                this.ui
            )

            // Make controller globally available
            ;(window as any).walletController = this.walletController
            console.log('✅ walletController exposed globally:', !!((window as any).walletController))

            await this.walletController.initialize()

            console.log('✅ Wallet selection phase ready')
            
            // Automatically hide splash screen after wallet selection is ready
            console.log('⏳ Auto-transitioning to wallet selection...')
            setTimeout(async () => {
                await splashScreen.hide()
                console.log('✅ Splash screen hidden')
            }, 1500) // 1.5 second delay to show the loaded state

        } catch (error) {
            console.error('❌ Failed to start wallet selection:', error)
            
            // Hide splash screen on error
            await splashScreen.hide()
            
            this.showFatalError(error as Error)
        }
    }

    private showFatalError(error: Error): void {
        const errorDiv = document.createElement('div')
        errorDiv.innerHTML = `
            <div style="
                position: fixed; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                background: var(--error, #ff4444); 
                color: white; 
                padding: 24px; 
                border-radius: 8px; 
                z-index: 9999;
                font-family: system-ui;
                text-align: center;
                max-width: 500px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            ">
                <h3 style="margin-top: 0;">⚠️ Application Error</h3>
                <p>Failed to initialize Rune Tools</p>
                <small style="opacity: 0.8; font-family: monospace;">
                    ${error.message}
                </small>
                <br><br>
                <button onclick="location.reload()" style="
                    padding: 8px 16px; 
                    background: rgba(255,255,255,0.2); 
                    border: none; 
                    border-radius: 4px; 
                    color: white; 
                    cursor: pointer;
                ">
                    Reload Application
                </button>
            </div>
        `
        document.body.appendChild(errorDiv)
    }

    // Getters for debugging
    getBackend(): BackendService { return this.backend }
    getState(): StateManager { return this.state }
    getUI(): UIService { return this.ui }
    getUtils(): Utils { return this.utils }
    getWalletController(): WalletSelectionController | null { return this.walletController }
}

// Application initialization
console.log('🚀 Starting Rune Tools Application...')

// Splash screen is already visible in HTML - no need to show it manually

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Create and initialize application
        app = new RuneToolsApplication()
        
        // Make app globally available for debugging
        ;(window as any).app = app
        
        await app.initialize()
        
        console.log('✅ Rune Tools Application ready!')
        
    } catch (error) {
        console.error('❌ Fatal initialization error:', error)
        
        // Create error display if app creation failed
        const errorDiv = document.createElement('div')
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errorDiv.innerHTML = `
            <div style="
                position: fixed; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                background: #ff4444; 
                color: white; 
                padding: 24px; 
                border-radius: 8px; 
                z-index: 9999;
                font-family: system-ui;
                text-align: center;
                max-width: 500px;
            ">
                <strong>⚠️ Critical Error</strong><br>
                Application failed to start<br>
                <small>Error: ${errorMessage}</small><br><br>
                <button onclick="location.reload()" style="
                    padding: 8px 16px; 
                    background: rgba(255,255,255,0.2); 
                    border: none; 
                    border-radius: 4px; 
                    color: white; 
                    cursor: pointer;
                ">
                    Reload
                </button>
            </div>
        `
        document.body.appendChild(errorDiv)
    }
})

// Hot reloading support
declare const module: any
if (typeof module !== 'undefined' && module.hot) {
    module.hot.accept(() => {
        console.log('🔄 Hot reload detected, refreshing app...')
        location.reload()
    })
}