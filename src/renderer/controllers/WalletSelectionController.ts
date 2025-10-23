/**
 * Wallet Selection Controller
 * 
 * Manages the wallet selection phase of the application:
 * - Wallet detection and listing
 * - Wallet creation flow
 * - Wallet authentication
 * - Network selection
 */

import { BackendService } from '../services/BackendService'
import { StateManager } from '../services/StateManager'
import { UIService } from '../services/UIService'
import { CryptoUtils } from '../utils/CryptoUtils'
import { WalletGenerator, GeneratedWallet } from '../components/WalletGenerator'
import { WalletRestoration, RestoredWallet } from '../components/WalletRestoration'

export interface WalletInfo {
    walletId: string
    name: string
    mainnetAddress?: string
    stagenetAddress?: string
    isLocked: boolean
    lastUsed?: Date
}

export interface CreateWalletData {
    name: string
    password: string
    confirmPassword: string
    seedPhrase?: string
    importMode: boolean
}

export class WalletSelectionController {
    private backend: BackendService
    private state: StateManager
    private ui: UIService
    private availableWallets: WalletInfo[] = []
    private currentNetwork: 'mainnet' | 'stagenet' = 'mainnet'
    private walletGenerator: WalletGenerator | null = null
    private walletRestoration: WalletRestoration | null = null

    constructor(backend: BackendService, state: StateManager, ui: UIService) {
        this.backend = backend
        this.state = state
        this.ui = ui
        console.log('🔧 WalletSelectionController initialized')
    }

    async initialize(): Promise<void> {
        try {
            console.log('WalletSelectionController initializing...')
            
            // Load current network
            const networkInfo = await this.backend.getNetwork()
            this.currentNetwork = networkInfo.currentNetwork || 'mainnet'
            
            // Load available wallets
            await this.refreshWalletList()
            
            // Setup UI event listeners
            this.setupEventListeners()
            
            // Update UI
            this.updateWalletSelectionUI()
            
            console.log('✅ WalletSelectionController initialized')
        } catch (error) {
            console.error('❌ Failed to initialize WalletSelectionController:', error)
            throw error
        }
    }

    private setupEventListeners(): void {

        // Create wallet button
        const createWalletBtn = document.getElementById('create-wallet-btn')
        if (createWalletBtn) {
            createWalletBtn.addEventListener('click', () => this.showCreateWalletFlow())
        }

        // Import wallet button
        const importWalletBtn = document.getElementById('import-wallet-btn')
        if (importWalletBtn) {
            importWalletBtn.addEventListener('click', () => this.showImportWalletFlow())
        }

        // Refresh wallets button
        const refreshBtn = document.getElementById('refresh-wallets-btn')
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshWalletList())
        }
    }

    async refreshWalletList(): Promise<void> {
        try {
            console.log('Refreshing wallet list...')
            
            // Get available wallets from backend
            const wallets = await this.backend.getAvailableWallets()
            console.log('Raw wallet list from backend:', wallets)
            this.availableWallets = wallets || []
            
            // Update UI
            this.updateWalletList()
            
            console.log('✅ Wallet list refreshed:', this.availableWallets.length, 'wallets')
            if (this.availableWallets.length > 0) {
                console.log('Wallet details:', this.availableWallets.map(w => ({ 
                    id: w.walletId, 
                    name: w.name, 
                    mainnet: w.mainnetAddress,
                    stagenet: w.stagenetAddress
                })))
            }
        } catch (error) {
            console.error('❌ Failed to refresh wallet list:', error)
            this.ui.showError('Failed to load wallets: ' + (error as Error).message)
        }
    }

    private updateWalletSelectionUI(): void {
        // Update wallet list
        this.updateWalletList()
    }

    private updateWalletList(): void {
        const walletList = document.getElementById('wallet-list')
        if (!walletList) return

        if (!this.availableWallets || this.availableWallets.length === 0) {
            walletList.innerHTML = `
                <div class="no-wallets">
                    <p>No wallets found</p>
                    <p>Create or import a wallet to get started</p>
                </div>
            `
            return
        }

        walletList.innerHTML = (this.availableWallets || []).map(wallet => `
            <div class="wallet-item" data-wallet-id="${wallet.walletId}">
                <div class="wallet-info">
                    <div class="wallet-name">${wallet.name}</div>
                    <div class="wallet-address">
                        ${this.currentNetwork === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress}
                    </div>
                    ${wallet.lastUsed ? `<div class="wallet-last-used">Last used: ${wallet.lastUsed.toLocaleDateString()}</div>` : ''}
                </div>
                <div class="wallet-actions">
                    <button class="btn btn-primary" onclick="walletController.selectWallet('${wallet.walletId}')">
                        Unlock
                    </button>
                </div>
            </div>
        `).join('')
    }


    async selectWallet(walletId: string): Promise<void> {
        try {
            const wallet = this.availableWallets.find(w => w.walletId === walletId)
            if (!wallet) {
                throw new Error('Wallet not found')
            }

            // SECURITY: Always require password authentication to decrypt the seed phrase
            // Every wallet access must authenticate, regardless of "locked" status
            this.showUnlockWalletDialog(wallet)
        } catch (error) {
            console.error('❌ Failed to select wallet:', error)
            this.ui.showError('Failed to select wallet: ' + (error as Error).message)
        }
    }

    private showUnlockWalletDialog(wallet: WalletInfo): void {
        const dialog = document.getElementById('unlock-wallet-dialog')
        if (!dialog) return

        // Set wallet info
        const walletNameEl = document.getElementById('unlock-wallet-name')
        if (walletNameEl) walletNameEl.textContent = wallet.name

        const walletAddressEl = document.getElementById('unlock-wallet-address')
        if (walletAddressEl) {
            const address = this.currentNetwork === 'mainnet' 
                ? wallet.mainnetAddress 
                : wallet.stagenetAddress
            walletAddressEl.textContent = address || 'Address not available'
        }

        // Setup form handler
        const form = document.getElementById('unlock-wallet-form') as HTMLFormElement
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault()
                const password = (form.querySelector('[name="password"]') as HTMLInputElement).value
                await this.unlockWallet(wallet.walletId, password)
            }
        }

        // Show dialog
        dialog.classList.add('active')
    }

    async unlockWallet(walletId: string, password: string): Promise<void> {
        try {
            console.log('Unlocking wallet:', walletId)
            
            // Unlock wallet via backend
            const unlockedWallet = await this.backend.unlockWallet(walletId, password)
            
            // Hide unlock dialog
            const dialog = document.getElementById('unlock-wallet-dialog')
            if (dialog) dialog.classList.remove('active')
            
            // Proceed to main app
            await this.proceedToMainApp(unlockedWallet)
            
        } catch (error) {
            console.error('❌ Failed to unlock wallet:', error)
            this.ui.showError('Failed to unlock wallet: ' + (error as Error).message)
        }
    }

    showCreateWalletFlow(): void {
        console.log('Starting advanced wallet creation flow...')
        
        // Hide wallet selection, show creation flow
        this.ui.hideElement('wallet-selection-content')
        this.ui.showElement('wallet-creation-content')
        
        // Initialize wallet generator
        const generatorContainer = document.getElementById('wallet-generator-container')
        if (generatorContainer) {
            this.walletGenerator = new WalletGenerator(generatorContainer, this.backend)
            
            // Set up completion callback
            this.walletGenerator.onComplete(async (generatedWallet: GeneratedWallet) => {
                await this.completeWalletCreation(generatedWallet)
            })

            // Start the generation process
            this.startWalletGeneration()
        }
        
        // Setup fallback creation form
        this.setupWalletCreationForm()
    }

    showImportWalletFlow(): void {
        console.log('Starting advanced wallet import flow...')
        
        // Hide wallet selection, show import flow
        this.ui.hideElement('wallet-selection-content')
        this.ui.showElement('wallet-import-content')
        
        // Initialize wallet restoration
        const restorationContainer = document.getElementById('wallet-restoration-container')
        if (restorationContainer) {
            this.walletRestoration = new WalletRestoration(restorationContainer)
            
            // Set up completion callback
            this.walletRestoration.onComplete(async (restoredWallet: RestoredWallet) => {
                await this.completeWalletRestoration(restoredWallet)
            })

            // Display restoration interface
            this.walletRestoration.displayRestoration()

            // Handle back navigation
            restorationContainer.addEventListener('walletRestoration:back', () => {
                this.returnToWalletSelection()
            })
        }
        
        // Setup fallback import form
        this.setupWalletImportForm()
    }

    private setupWalletCreationForm(): void {
        // Generate new seed phrase button
        const generateSeedBtn = document.getElementById('generate-seed-btn')
        if (generateSeedBtn) {
            generateSeedBtn.onclick = () => this.generateNewSeedPhrase()
        }

        // Creation form handler
        const form = document.getElementById('wallet-creation-form') as HTMLFormElement
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault()
                this.handleWalletCreation(form)
            }
        }

        // Back button
        const backBtn = document.getElementById('wallet-creation-back-btn')
        if (backBtn) {
            backBtn.onclick = () => this.returnToWalletSelection()
        }
    }

    private setupWalletImportForm(): void {
        const form = document.getElementById('wallet-import-form') as HTMLFormElement
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault()
                this.handleWalletImport(form)
            }
        }

        // Back button
        const backBtn = document.getElementById('wallet-import-back-btn')
        if (backBtn) {
            backBtn.onclick = () => this.returnToWalletSelection()
        }
    }

    async generateNewSeedPhrase(): Promise<void> {
        try {
            console.log('Generating new seed phrase...')
            
            const seedPhrase = await this.backend.generateSeed()
            
            // Display seed phrase
            const seedDisplay = document.getElementById('seed-phrase-display')
            if (seedDisplay) {
                seedDisplay.textContent = seedPhrase
                seedDisplay.style.display = 'block'
            }
            
            console.log('✅ Seed phrase generated')
        } catch (error) {
            console.error('❌ Failed to generate seed phrase:', error)
            this.ui.showError('Failed to generate seed phrase: ' + (error as Error).message)
        }
    }

    private async handleWalletCreation(form: HTMLFormElement): Promise<void> {
        let seedPhrase = ''
        
        try {
            const formData = new FormData(form)
            const data: CreateWalletData = {
                name: formData.get('name') as string,
                password: formData.get('password') as string,
                confirmPassword: formData.get('confirmPassword') as string,
                seedPhrase: formData.get('seedPhrase') as string,
                importMode: false
            }

            seedPhrase = data.seedPhrase! // Keep reference for clearing

            // Validate form data with enhanced security checks
            await this.validateWalletCreationData(data)

            // Create wallet addresses from seed phrase
            const wallet = await this.backend.createWallet(data.seedPhrase!)
            
            // Create secure wallet storage object
            const secureWalletData = await CryptoUtils.createSecureWalletStorage(
                data.name,
                data.seedPhrase!,
                data.password,
                {
                    mainnet: wallet.mainnetAddress,
                    stagenet: wallet.stagenetAddress
                }
            )

            // Save wallet to secure storage
            await this.backend.saveWallet(secureWalletData)
            
            console.log('Secure wallet created:', {
                walletId: secureWalletData.walletId,
                name: secureWalletData.name,
                addresses: secureWalletData.addresses,
                createdAt: secureWalletData.createdAt
                // Note: Not logging sensitive encrypted data
            })
            
            this.ui.showSuccess('Wallet created securely!')
            
            // Clear sensitive data from memory
            data.seedPhrase = CryptoUtils.clearSensitiveData(data.seedPhrase!)
            data.password = CryptoUtils.clearSensitiveData(data.password)
            data.confirmPassword = CryptoUtils.clearSensitiveData(data.confirmPassword)
            
            // Clear form
            form.reset()
            
            // Add a small delay to ensure file system operations complete
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // Refresh wallet list and return to selection
            await this.refreshWalletList()
            this.returnToWalletSelection()
            
        } catch (error) {
            console.error('❌ Failed to create wallet:', error)
            this.ui.showError('Failed to create wallet: ' + (error as Error).message)
        } finally {
            // Always clear sensitive data from memory
            if (seedPhrase) {
                seedPhrase = CryptoUtils.clearSensitiveData(seedPhrase)
            }
        }
    }

    private async handleWalletImport(form: HTMLFormElement): Promise<void> {
        let seedPhrase = ''
        
        try {
            const formData = new FormData(form)
            const data: CreateWalletData = {
                name: formData.get('name') as string,
                password: formData.get('password') as string,
                confirmPassword: formData.get('confirmPassword') as string,
                seedPhrase: formData.get('seedPhrase') as string,
                importMode: true
            }

            seedPhrase = data.seedPhrase! // Keep reference for clearing

            // Validate form data with enhanced security checks
            await this.validateWalletCreationData(data)

            // Import wallet (create addresses from existing seed phrase)
            const wallet = await this.backend.createWallet(data.seedPhrase!)
            
            // Create secure wallet storage object
            const secureWalletData = await CryptoUtils.createSecureWalletStorage(
                data.name,
                data.seedPhrase!,
                data.password,
                {
                    mainnet: wallet.mainnetAddress,
                    stagenet: wallet.stagenetAddress
                }
            )

            // Save wallet to secure storage
            await this.backend.saveWallet(secureWalletData)
            
            console.log('Secure wallet imported:', {
                walletId: secureWalletData.walletId,
                name: secureWalletData.name,
                addresses: secureWalletData.addresses,
                createdAt: secureWalletData.createdAt
                // Note: Not logging sensitive encrypted data
            })
            
            this.ui.showSuccess('Wallet imported securely!')
            
            // Clear sensitive data from memory
            data.seedPhrase = CryptoUtils.clearSensitiveData(data.seedPhrase!)
            data.password = CryptoUtils.clearSensitiveData(data.password)
            data.confirmPassword = CryptoUtils.clearSensitiveData(data.confirmPassword)
            
            // Clear form
            form.reset()
            
            // Add a small delay to ensure file system operations complete
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // Refresh wallet list and return to selection
            await this.refreshWalletList()
            this.returnToWalletSelection()
            
        } catch (error) {
            console.error('❌ Failed to import wallet:', error)
            this.ui.showError('Failed to import wallet: ' + (error as Error).message)
        } finally {
            // Always clear sensitive data from memory
            if (seedPhrase) {
                seedPhrase = CryptoUtils.clearSensitiveData(seedPhrase)
            }
        }
    }

    private async validateWalletCreationData(data: CreateWalletData): Promise<void> {
        if (!data.name || data.name.trim().length < 3) {
            throw new Error('Wallet name must be at least 3 characters')
        }

        if (!data.password || data.password.length < 6) {
            throw new Error('Password must be at least 6 characters')
        }

        if (data.password !== data.confirmPassword) {
            throw new Error('Passwords do not match')
        }

        if (!data.seedPhrase || data.seedPhrase.trim().length === 0) {
            throw new Error('Seed phrase is required')
        }

        // Validate mnemonic format and entropy
        const isValidMnemonic = await CryptoUtils.validateMnemonic(data.seedPhrase)
        if (!isValidMnemonic) {
            throw new Error('Invalid seed phrase format. Must be 12, 15, 18, 21, or 24 words')
        }
    }

    private returnToWalletSelection(): void {
        this.ui.hideElement('wallet-creation-content')
        this.ui.hideElement('wallet-import-content')
        this.ui.showElement('wallet-selection-content')
    }

    async proceedToMainApp(wallet: WalletInfo): Promise<void> {
        try {
            console.log('Proceeding to main application with wallet:', wallet.walletId)
            
            // Store active wallet in state
            this.state.setData('activeWallet', wallet)
            this.state.setData('currentNetwork', this.currentNetwork)
            
            // Save session
            await this.backend.saveSession({
                walletId: wallet.walletId,
                network: this.currentNetwork,
                timestamp: new Date().toISOString()
            })
            
            // Transition to main application
            this.ui.hideElement('wallet-selection-phase')
            this.ui.showElement('main-application-phase')
            
            // Initialize main application (TODO: implement main app controller)
            console.log('🚀 Main application phase activated')
            
        } catch (error) {
            console.error('❌ Failed to proceed to main app:', error)
            this.ui.showError('Failed to start application: ' + (error as Error).message)
        }
    }

    getCurrentNetwork(): 'mainnet' | 'stagenet' {
        return this.currentNetwork
    }

    getAvailableWallets(): WalletInfo[] {
        return [...this.availableWallets]
    }

    /**
     * Start wallet generation with the WalletGenerator component
     */
    private async startWalletGeneration(): Promise<void> {
        if (!this.walletGenerator) return

        try {
            // Generate initial seed phrase
            const generatedWallet = await this.walletGenerator.generateSeedPhrase()
            this.walletGenerator.displaySeedPhrase(generatedWallet)
        } catch (error) {
            console.error('❌ Failed to start wallet generation:', error)
            this.ui.showError('Failed to generate seed phrase: ' + (error as Error).message)
        }
    }

    /**
     * Complete wallet creation after seed phrase verification
     */
    private async completeWalletCreation(generatedWallet: GeneratedWallet): Promise<void> {
        try {
            console.log('📝 Completing wallet creation...')

            // Show wallet naming and password form
            this.showWalletFinalizationForm(generatedWallet.seedPhrase, false)

        } catch (error) {
            console.error('❌ Failed to complete wallet creation:', error)
            this.ui.showError('Failed to complete wallet creation: ' + (error as Error).message)
        }
    }

    /**
     * Complete wallet restoration after seed phrase validation
     */
    private async completeWalletRestoration(restoredWallet: RestoredWallet): Promise<void> {
        try {
            console.log('📝 Completing wallet restoration...')

            if (!restoredWallet.isValid) {
                throw new Error('Invalid seed phrase provided')
            }

            // Show wallet naming and password form
            this.showWalletFinalizationForm(restoredWallet.normalizedPhrase, true)

        } catch (error) {
            console.error('❌ Failed to complete wallet restoration:', error)
            this.ui.showError('Failed to complete wallet restoration: ' + (error as Error).message)
        }
    }

    /**
     * Show final wallet naming and password form
     */
    private showWalletFinalizationForm(seedPhrase: string, isImport: boolean): void {
        const title = isImport ? 'Finalize Wallet Restoration' : 'Finalize Wallet Creation'
        const action = isImport ? 'Restore' : 'Create'

        // Find or create finalization container
        let finalizationContainer = document.getElementById('wallet-finalization-container')
        if (!finalizationContainer) {
            finalizationContainer = document.createElement('div')
            finalizationContainer.id = 'wallet-finalization-container'
            const parentContainer = isImport 
                ? document.getElementById('wallet-import-content')
                : document.getElementById('wallet-creation-content')
            
            if (parentContainer) {
                parentContainer.appendChild(finalizationContainer)
            }
        }

        finalizationContainer.innerHTML = `
            <div class="wallet-finalization">
                <div class="finalization-header">
                    <h3>${title}</h3>
                    <p>Choose a name and password for your wallet. This password will be used to unlock your wallet.</p>
                </div>

                <div class="security-notice">
                    <div class="notice-icon">🔒</div>
                    <div class="notice-content">
                        <p><strong>Security:</strong> Your seed phrase will be encrypted with AES-256-GCM encryption and your password will be hashed with PBKDF2.</p>
                    </div>
                </div>

                <form id="finalizationForm" class="finalization-form">
                    <div class="form-group">
                        <label class="form-label">Wallet Name</label>
                        <input 
                            type="text" 
                            id="walletName" 
                            class="form-input" 
                            placeholder="My THORChain Wallet" 
                            value="${isImport ? 'Restored Wallet' : 'New Wallet'}"
                            required
                        >
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input 
                            type="password" 
                            id="walletPassword" 
                            class="form-input" 
                            placeholder="Choose a secure password" 
                            required
                        >
                        <small class="form-help">This password will be required to unlock your wallet.</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Confirm Password</label>
                        <input 
                            type="password" 
                            id="confirmPassword" 
                            class="form-input" 
                            placeholder="Confirm your password" 
                            required
                        >
                    </div>

                    <div class="finalization-actions">
                        <button type="submit" class="btn btn-primary">
                            🚀 ${action} Wallet
                        </button>
                        <button type="button" id="finalizationBackBtn" class="btn btn-secondary">
                            ← Back
                        </button>
                    </div>
                </form>
            </div>
        `

        // Hide other containers
        const generatorContainer = document.getElementById('wallet-generator-container')
        const restorationContainer = document.getElementById('wallet-restoration-container')
        if (generatorContainer) generatorContainer.style.display = 'none'
        if (restorationContainer) restorationContainer.style.display = 'none'

        // Setup form handlers
        this.setupFinalizationForm(seedPhrase, isImport)
    }

    /**
     * Setup finalization form event handlers
     */
    private setupFinalizationForm(seedPhrase: string, isImport: boolean): void {
        const form = document.getElementById('finalizationForm') as HTMLFormElement
        const backBtn = document.getElementById('finalizationBackBtn')

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault()
                await this.finalizeWallet(seedPhrase, isImport)
            })
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Show previous step
                const generatorContainer = document.getElementById('wallet-generator-container')
                const restorationContainer = document.getElementById('wallet-restoration-container')
                const finalizationContainer = document.getElementById('wallet-finalization-container')
                
                if (finalizationContainer) finalizationContainer.style.display = 'none'
                
                if (isImport && restorationContainer) {
                    restorationContainer.style.display = 'block'
                } else if (!isImport && generatorContainer) {
                    generatorContainer.style.display = 'block'
                }
            })
        }
    }

    /**
     * Finalize wallet creation/restoration
     */
    private async finalizeWallet(seedPhrase: string, isImport: boolean): Promise<void> {
        const walletName = (document.getElementById('walletName') as HTMLInputElement)?.value
        const password = (document.getElementById('walletPassword') as HTMLInputElement)?.value
        const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement)?.value

        try {
            // Validation
            if (!walletName || walletName.trim().length < 3) {
                throw new Error('Wallet name must be at least 3 characters')
            }

            if (!password || password.length < 6) {
                throw new Error('Password must be at least 6 characters')
            }

            if (password !== confirmPassword) {
                throw new Error('Passwords do not match')
            }

            // Create wallet addresses from seed phrase
            const wallet = await this.backend.createWallet(seedPhrase)
            
            // Create secure wallet storage object
            const secureWalletData = await CryptoUtils.createSecureWalletStorage(
                walletName.trim(),
                seedPhrase,
                password,
                {
                    mainnet: wallet.mainnetAddress,
                    stagenet: wallet.stagenetAddress
                }
            )

            // Save wallet to secure storage
            await this.backend.saveWallet(secureWalletData)
            
            console.log(`✅ Wallet ${isImport ? 'restored' : 'created'} securely:`, {
                walletId: secureWalletData.walletId,
                name: secureWalletData.name,
                addresses: secureWalletData.addresses,
                createdAt: secureWalletData.createdAt
            })
            
            this.ui.showSuccess(`Wallet ${isImport ? 'restored' : 'created'} successfully!`)
            
            // Clear sensitive data from memory
            CryptoUtils.clearSensitiveData(seedPhrase)
            CryptoUtils.clearSensitiveData(password)
            CryptoUtils.clearSensitiveData(confirmPassword)
            
            // Add a small delay to ensure file system operations complete
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // Refresh wallet list and return to selection
            await this.refreshWalletList()
            this.returnToWalletSelection()
            
        } catch (error) {
            console.error(`❌ Failed to ${isImport ? 'restore' : 'create'} wallet:`, error)
            this.ui.showError(`Failed to ${isImport ? 'restore' : 'create'} wallet: ` + (error as Error).message)
        }
    }
}