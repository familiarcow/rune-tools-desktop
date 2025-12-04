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
import { PasswordInput } from '../components/PasswordInput'
import { WalletGenerator, GeneratedWallet } from '../components/WalletGenerator'
import { WalletRestoration, RestoredWallet } from '../components/WalletRestoration'
import { ApplicationController } from './ApplicationController'
import { IdenticonService } from '../../services/IdenticonService'
import { UpdateService } from '../services/UpdateService'

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
    private appController: ApplicationController | null = null
    // Reusable password input instances
    private passwordInputs: Map<string, PasswordInput> = new Map()

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
            
            // Check for updates (non-blocking)
            this.checkForUpdates()
            
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

    }

    async refreshWalletList(): Promise<void> {
        try {
            console.log('Refreshing wallet list...')
            
            // Get available wallets from backend
            const rawWallets = await this.backend.getAvailableWallets()
            console.log('Raw wallet list from backend:', rawWallets)
            
            // Map the backend format to frontend format
            this.availableWallets = (rawWallets || []).map(wallet => ({
                walletId: wallet.walletId,
                name: wallet.name,
                mainnetAddress: wallet.addresses?.mainnet,
                stagenetAddress: wallet.addresses?.stagenet,
                isLocked: wallet.isLocked,
                lastUsed: wallet.lastUsed
            }))
            
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
                <div class="wallet-selection-list-empty">
                    <div class="wallet-selection-list-empty-icon">👛</div>
                    <div class="wallet-selection-list-empty-title">No wallets found</div>
                    <div class="wallet-selection-list-empty-subtitle">Create or import a wallet to get started</div>
                </div>
            `
            return
        }

        walletList.innerHTML = (this.availableWallets || []).map((wallet, index) => {
            const currentAddress = this.currentNetwork === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress;
            const shortAddress = IdenticonService.shortenAddress(currentAddress || '');
            const avatarId = `wallet-avatar-${wallet.walletId}`;
            
            return `
            <div class="wallet-selection-item" data-wallet-id="${wallet.walletId}">
                <div class="wallet-selection-item-avatar">
                    <div id="${avatarId}" class="identicon-placeholder loading">
                        ${wallet.name.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div class="wallet-selection-item-info">
                    <div class="wallet-selection-item-name">${wallet.name}</div>
                    <div class="wallet-selection-item-address">${shortAddress}</div>
                    ${wallet.lastUsed ? `<div class="wallet-selection-item-last-used">Last used: ${wallet.lastUsed.toLocaleDateString()}</div>` : ''}
                </div>
                <div class="wallet-selection-item-actions">
                    <button class="wallet-selection-item-delete-btn" onclick="walletController.showDeleteWalletDialog('${wallet.walletId}')" title="Delete wallet permanently">
                        <span class="wallet-selection-item-icon">🗑️</span>
                        <span class="wallet-selection-item-text">Delete</span>
                    </button>
                    <button class="wallet-selection-item-unlock-btn" onclick="walletController.selectWallet('${wallet.walletId}')">
                        <span class="wallet-selection-item-icon">🔓</span>
                        <span class="wallet-selection-item-text">Unlock</span>
                    </button>
                </div>
            </div>
        `;
        }).join('');

        // Generate identicons immediately to prevent visual jumps
        this.generateWalletIdenticonsImmediate()
    }

    private generateWalletIdenticonsImmediate(): void {
        if (!this.availableWallets) return;

        // Generate identicons immediately after DOM insertion to prevent visual jumps
        requestAnimationFrame(() => {
            this.availableWallets.forEach(wallet => {
                const currentAddress = this.currentNetwork === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress;
                const avatarId = `wallet-avatar-${wallet.walletId}`;
                const element = document.getElementById(avatarId);
                
                if (!element) return;
                
                // Use the wallet address or walletId as the identicon seed for consistency
                const identiconValue = currentAddress || wallet.walletId;
                
                try {
                    // Add smooth loading transition
                    element.style.opacity = '0.7';
                    
                    // Generate and render identicon
                    IdenticonService.renderToElement(avatarId, identiconValue, 48);
                    
                    // Remove loading state and fade in
                    element.classList.remove('loading');
                    element.style.opacity = '1';
                    
                } catch (error) {
                    console.warn(`Failed to generate identicon for wallet ${wallet.name}:`, error);
                    // Fallback: remove loading state but keep text placeholder
                    element.classList.remove('loading');
                    element.style.opacity = '1';
                }
            });
        });
    }

    private generateWalletIdenticons(): void {
        if (!this.availableWallets) return;

        // Legacy method for backwards compatibility
        setTimeout(() => {
            this.availableWallets.forEach(wallet => {
                const currentAddress = this.currentNetwork === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress;
                const avatarId = `wallet-avatar-${wallet.walletId}`;
                
                // Use the wallet address or walletId as the identicon seed for consistency
                const identiconValue = currentAddress || wallet.walletId;
                
                try {
                    IdenticonService.renderToElement(avatarId, identiconValue, 48);
                } catch (error) {
                    console.warn(`Failed to generate identicon for wallet ${wallet.name}:`, error);
                    // Fallback: keep the text placeholder
                }
            });
        }, 10);
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
            walletAddressEl.textContent = IdenticonService.shortenAddress(address || '')
        }

        // Generate identicon for unlock dialog
        const currentAddress = this.currentNetwork === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress;
        const identiconValue = currentAddress || wallet.walletId;
        
        setTimeout(() => {
            try {
                IdenticonService.renderToElement('unlock-wallet-avatar', identiconValue, 56);
            } catch (error) {
                console.warn('Failed to generate identicon for unlock dialog:', error);
            }
        }, 10);

        // Clear any previous error state
        const errorEl = document.getElementById('unlock-wallet-error')
        if (errorEl) errorEl.classList.remove('active')

        // Initialize unlock password input
        this.createPasswordInput('unlockPasswordContainer', {
            id: 'unlockPassword',
            label: 'Password',
            placeholder: 'Enter wallet password',
            autocomplete: 'current-password'
        })

        // Setup form handler
        const form = document.getElementById('unlock-wallet-form') as HTMLFormElement
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault()
                const password = this.getPasswordValue('unlockPasswordContainer')
                await this.unlockWallet(wallet.walletId, password)
            }
        }

        // Show dialog
        dialog.classList.add('active')
    }

    async unlockWallet(walletId: string, password: string): Promise<void> {
        const loadingEl = document.getElementById('unlock-wallet-loading')
        const errorEl = document.getElementById('unlock-wallet-error')
        const errorMessageEl = document.getElementById('unlock-wallet-error-message')
        const submitBtn = document.querySelector('.wallet-unlock-btn-primary') as HTMLButtonElement

        try {
            console.log('Unlocking wallet:', walletId)
            
            // Show loading state
            if (loadingEl) loadingEl.classList.add('active')
            if (errorEl) errorEl.classList.remove('active')
            if (submitBtn) submitBtn.disabled = true

            // Unlock wallet via backend
            const unlockedWallet = await this.backend.unlockWallet(walletId, password)
            
            // Hide loading state
            if (loadingEl) loadingEl.classList.remove('active')
            if (submitBtn) submitBtn.disabled = false
            
            // Hide unlock dialog
            const dialog = document.getElementById('unlock-wallet-dialog')
            if (dialog) dialog.classList.remove('active')
            
            // Proceed to main app
            await this.proceedToMainApp(unlockedWallet)
            
        } catch (error) {
            console.error('❌ Failed to unlock wallet:', error)
            
            // Hide loading state
            if (loadingEl) loadingEl.classList.remove('active')
            if (submitBtn) submitBtn.disabled = false
            
            // Show error state
            if (errorEl) errorEl.classList.add('active')
            if (errorMessageEl) {
                const errorMessage = (error as Error).message
                if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('incorrect') || errorMessage.toLowerCase().includes('wrong')) {
                    errorMessageEl.textContent = 'Incorrect password. Please try again.'
                } else {
                    errorMessageEl.textContent = 'Failed to unlock wallet: ' + errorMessage
                }
            }
            
            // Clear the password input for security
            const passwordInput = this.passwordInputs.get('unlockPasswordContainer')
            if (passwordInput) {
                passwordInput.clear()
            }
        }
    }

    showDeleteWalletDialog(walletId: string): void {
        try {
            const wallet = this.availableWallets.find(w => w.walletId === walletId)
            if (!wallet) {
                throw new Error('Wallet not found')
            }

            const dialog = document.getElementById('delete-wallet-dialog')
            if (!dialog) return

            // Set wallet info in dialog
            const walletNameEl = document.getElementById('delete-wallet-name')
            if (walletNameEl) walletNameEl.textContent = wallet.name

            const walletAddressEl = document.getElementById('delete-wallet-address')
            if (walletAddressEl) {
                const address = this.currentNetwork === 'mainnet' 
                    ? wallet.mainnetAddress 
                    : wallet.stagenetAddress
                walletAddressEl.textContent = address || 'Address not available'
            }

            // Setup delete confirmation handler
            const confirmBtn = document.getElementById('confirm-delete-btn')
            if (confirmBtn) {
                // Remove any existing listeners
                const newConfirmBtn = confirmBtn.cloneNode(true) as HTMLElement
                confirmBtn.parentNode?.replaceChild(newConfirmBtn, confirmBtn)
                
                // Add new listener
                newConfirmBtn.addEventListener('click', () => this.deleteWallet(walletId))
            }

            // Show dialog
            dialog.classList.add('active')
        } catch (error) {
            console.error('❌ Failed to show delete dialog:', error)
            this.ui.showError('Failed to show delete dialog: ' + (error as Error).message)
        }
    }

    async deleteWallet(walletId: string): Promise<void> {
        try {
            console.log('Deleting wallet:', walletId)
            
            // Delete wallet via backend
            await this.backend.deleteWallet(walletId)
            
            // Hide delete dialog
            const dialog = document.getElementById('delete-wallet-dialog')
            if (dialog) dialog.classList.remove('active')
            
            // Show success message
            this.ui.showSuccess('Wallet deleted successfully')
            
            // Refresh wallet list to remove deleted wallet
            await this.refreshWalletList()
            
            console.log('✅ Wallet deleted successfully')
        } catch (error) {
            console.error('❌ Failed to delete wallet:', error)
            this.ui.showError('Failed to delete wallet: ' + (error as Error).message)
        }
    }

    showCreateWalletFlow(): void {
        console.log('🚀 Starting advanced wallet creation flow...')
        
        // Clean up any existing components first
        this.walletGenerator = null
        this.walletRestoration = null
        
        // Hide wallet selection, show creation flow
        this.ui.hideElement('wallet-selection-content')
        this.ui.showElement('wallet-creation-content')
        
        // Initialize wallet generator
        const generatorContainer = document.getElementById('wallet-generator-container')
        console.log('🔍 Generator container found:', !!generatorContainer, 'display:', generatorContainer?.style.display)
        
        if (generatorContainer) {
            // Clear any existing content and ensure it's visible
            generatorContainer.innerHTML = ''
            generatorContainer.style.display = 'block'
            generatorContainer.style.visibility = 'visible'
            generatorContainer.style.opacity = '1'
            
            console.log('🔍 After reset - display:', generatorContainer.style.display, 'visibility:', generatorContainer.style.visibility)
            
            console.log('🔧 Creating new WalletGenerator...')
            this.walletGenerator = new WalletGenerator(generatorContainer, this.backend)
            
            // Set up completion callback
            this.walletGenerator.onComplete(async (generatedWallet: GeneratedWallet) => {
                await this.completeWalletCreation(generatedWallet)
            })

            // Start the generation process
            console.log('🎲 Starting wallet generation...')
            this.startWalletGeneration()
            
            // Handle exit event from wallet generator
            generatorContainer.addEventListener('walletGeneration:exit', () => {
                this.returnToWalletSelection()
            })
        }
        
        // Setup fallback creation form
        this.setupWalletCreationForm()
    }

    showImportWalletFlow(): void {
        console.log('Starting advanced wallet import flow...')
        
        // Clean up any existing components first
        this.walletGenerator = null
        this.walletRestoration = null
        
        // Hide wallet selection, show import flow
        this.ui.hideElement('wallet-selection-content')
        this.ui.showElement('wallet-import-content')
        
        // Initialize wallet restoration
        const restorationContainer = document.getElementById('wallet-restoration-container')
        if (restorationContainer) {
            // Clear any existing content and ensure it's visible
            restorationContainer.innerHTML = ''
            restorationContainer.style.display = 'block'
            
            this.walletRestoration = new WalletRestoration(restorationContainer)
            
            // Set up completion callback
            this.walletRestoration.onComplete(async (restoredWallet: RestoredWallet) => {
                await this.completeWalletRestoration(restoredWallet)
            })

            // Display restoration interface
            try {
                console.log('📱 Displaying restoration interface...')
                this.walletRestoration.displayRestoration()
                console.log('✅ Restoration interface displayed')
            } catch (error) {
                console.error('❌ Failed to display restoration interface:', error)
                throw error
            }

            // Handle back navigation
            restorationContainer.addEventListener('walletRestoration:back', () => {
                this.returnToWalletSelection()
            })
        }
        
        // Setup fallback import form
        this.setupWalletImportForm()
    }

    private setupWalletCreationForm(): void {
        // Initialize fallback form password inputs
        this.createPasswordInput('creationPasswordContainer', {
            id: 'creationPassword',
            label: 'Password',
            placeholder: 'Secure password',
            autocomplete: 'new-password'
        })

        this.createPasswordInput('creationConfirmPasswordContainer', {
            id: 'creationConfirmPassword',
            label: 'Confirm Password',
            placeholder: 'Confirm password',
            autocomplete: 'new-password'
        })

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
        // Initialize fallback form password inputs
        this.createPasswordInput('importPasswordContainer', {
            id: 'importPassword',
            label: 'Password',
            placeholder: 'Secure password',
            autocomplete: 'new-password'
        })

        this.createPasswordInput('importConfirmPasswordContainer', {
            id: 'importConfirmPassword',
            label: 'Confirm Password',
            placeholder: 'Confirm password',
            autocomplete: 'new-password'
        })

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
                password: this.getPasswordValue('creationPasswordContainer'),
                confirmPassword: this.getPasswordValue('creationConfirmPasswordContainer'),
                seedPhrase: formData.get('seedPhrase') as string,
                importMode: false
            }

            seedPhrase = data.seedPhrase! // Keep reference for clearing

            // Validate form data with enhanced security checks
            await this.validateWalletCreationData(data)

            // Create wallet addresses from seed phrase (derives both mainnet and stagenet addresses)
            const wallet = await this.backend.createWallet(data.seedPhrase!)
            
            console.log('✅ Wallet addresses derived:', {
                mainnet: wallet.mainnetAddress,
                stagenet: wallet.stagenetAddress,
                current: wallet.address
            })
            
            // Create secure wallet storage object with real derived addresses
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
                password: this.getPasswordValue('importPasswordContainer'),
                confirmPassword: this.getPasswordValue('importConfirmPasswordContainer'),
                seedPhrase: formData.get('seedPhrase') as string,
                importMode: true
            }

            seedPhrase = data.seedPhrase! // Keep reference for clearing

            // Validate form data with enhanced security checks
            await this.validateWalletCreationData(data)

            // Import wallet (derive addresses from existing seed phrase for both networks)
            const wallet = await this.backend.createWallet(data.seedPhrase!)
            
            console.log('✅ Imported wallet addresses derived:', {
                mainnet: wallet.mainnetAddress,
                stagenet: wallet.stagenetAddress,
                current: wallet.address
            })
            
            // Create secure wallet storage object with real derived addresses
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
        console.log('🧹 Returning to wallet selection...')
        
        // Clean up component instances (may have already been done by performThoroughCleanup)
        if (this.walletGenerator) {
            this.walletGenerator.reset()
            this.walletGenerator = null
        }
        if (this.walletRestoration) {
            this.walletRestoration = null
        }
        
        // Clear all component containers to prevent conflicts
        const generatorContainer = document.getElementById('wallet-generator-container')
        if (generatorContainer) {
            generatorContainer.innerHTML = ''
            generatorContainer.style.display = 'none'
        }
        
        const restorationContainer = document.getElementById('wallet-restoration-container')
        if (restorationContainer) {
            restorationContainer.innerHTML = ''
            restorationContainer.style.display = 'none'
        }
        
        // Clear finalization containers that might be dynamically created
        const finalizationContainer = document.getElementById('wallet-finalization-container')
        if (finalizationContainer) {
            finalizationContainer.innerHTML = ''
            finalizationContainer.remove() // Remove it completely
        }
        
        // Clear simple forms
        const simpleCreationForm = document.getElementById('simple-creation-form')
        if (simpleCreationForm) {
            simpleCreationForm.style.display = 'none'
        }
        
        const simpleImportForm = document.getElementById('simple-import-form')
        if (simpleImportForm) {
            simpleImportForm.style.display = 'none'
        }
        
        // Reset container displays to default
        const creationContent = document.getElementById('wallet-creation-content')
        if (creationContent) {
            creationContent.style.display = ''
        }
        
        const importContent = document.getElementById('wallet-import-content')
        if (importContent) {
            importContent.style.display = ''
        }
        
        // Hide all content sections and show wallet selection
        this.ui.hideElement('wallet-creation-content')
        this.ui.hideElement('wallet-import-content')
        this.ui.showElement('wallet-selection-content')
        
        console.log('✅ Returned to wallet selection')
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
            
            // Transition to main application UI
            this.ui.hideElement('wallet-selection-phase')
            this.ui.showElement('main-application-phase')
            
            // Initialize Application Controller
            if (!this.appController) {
                this.appController = new ApplicationController(this.backend, this.state, this.ui)
            }
            
            // Initialize main application with wallet and network
            await this.appController.initialize(wallet, this.currentNetwork)
            
            console.log('🚀 Main application phase activated')
            
        } catch (error) {
            console.error('❌ Failed to proceed to main app:', error)
            this.ui.showError('Failed to start application: ' + (error as Error).message)
            
            // Revert UI state on error
            this.ui.hideElement('main-application-phase')
            this.ui.showElement('wallet-selection-phase')
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
                        <div id="walletPasswordContainer"></div>
                        <small class="form-help">This password will be required to unlock your wallet.</small>
                    </div>
                    
                    <div class="form-group">
                        <div id="confirmPasswordContainer"></div>
                    </div>

                    <div class="finalization-actions">
                        <button type="submit" class="btn btn-primary">
                            🚀 ${action} Wallet
                        </button>
                        <button type="button" id="finalizationCancelBtn" class="btn btn-danger">
                            ✕ Cancel
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
     * Create and register a password input component
     */
    private createPasswordInput(containerId: string, options: {
        id: string
        label: string
        placeholder: string
        required?: boolean
        autocomplete?: string
    }): PasswordInput | null {
        const container = document.getElementById(containerId)
        if (!container) return null

        const passwordInput = new PasswordInput(container, {
            required: true,
            autocomplete: 'current-password',
            ...options
        })
        
        this.passwordInputs.set(containerId, passwordInput)
        return passwordInput
    }

    /**
     * Get password value from a password input by container ID
     */
    private getPasswordValue(containerId: string): string {
        return this.passwordInputs.get(containerId)?.getValue() || ''
    }

    /**
     * Initialize password input components
     */
    private initializePasswordInputs(): void {
        this.createPasswordInput('walletPasswordContainer', {
            id: 'walletPassword',
            label: 'Password',
            placeholder: 'Choose a secure password',
            autocomplete: 'new-password'
        })

        this.createPasswordInput('confirmPasswordContainer', {
            id: 'confirmPassword',
            label: 'Confirm Password',
            placeholder: 'Confirm your password',
            autocomplete: 'new-password'
        })
    }

    /**
     * Setup finalization form event handlers
     */
    private setupFinalizationForm(seedPhrase: string, isImport: boolean): void {
        const form = document.getElementById('finalizationForm') as HTMLFormElement
        const cancelBtn = document.getElementById('finalizationCancelBtn')

        // Initialize password input components
        this.initializePasswordInputs()

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault()
                await this.finalizeWallet(seedPhrase, isImport)
            })
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                // Show confirmation dialog before canceling
                const actionType = isImport ? 'wallet restoration' : 'wallet creation'
                const confirmed = confirm(
                    `Are you sure you want to cancel ${actionType}?\n\n` +
                    `This will discard your progress and return to the main screen.`
                )
                
                if (confirmed) {
                    console.log('🚫 User confirmed cancellation, performing thorough cleanup...')
                    
                    // Clear sensitive data from memory
                    if (seedPhrase) {
                        console.log('🧹 Clearing sensitive data from memory')
                    }
                    
                    // Perform thorough cleanup before returning to wallet selection
                    this.performThoroughCleanup()
                    
                    // Cancel the entire process and return to wallet selection
                    this.returnToWalletSelection()
                }
            })
        }
    }

    /**
     * Perform thorough cleanup of all wallet creation/restoration state
     */
    private performThoroughCleanup(): void {
        console.log('🧹 Performing thorough wallet creation state cleanup...')
        
        try {
            // 1. Reset component instances with proper cleanup
            if (this.walletGenerator) {
                this.walletGenerator.reset()
                this.walletGenerator = null
            }
            if (this.walletRestoration) {
                this.walletRestoration = null
            }
            
            // Clear all password inputs
            for (const [containerId, passwordInput] of this.passwordInputs) {
                passwordInput.clear()
            }
            this.passwordInputs.clear()
            
            // 2. Clear all containers and remove all child elements (only if they exist)
            const containers = [
                'wallet-generator-container',
                'wallet-restoration-container', 
                'wallet-finalization-container',
                'simple-creation-form',
                'simple-import-form'
            ]
            
            containers.forEach(containerId => {
                const container = document.getElementById(containerId)
                if (container && container.parentNode) {
                    try {
                        // Remove all event listeners by cloning and replacing
                        const newContainer = container.cloneNode(false) as HTMLElement
                        container.parentNode.replaceChild(newContainer, container)
                        
                        // Clear content and hide
                        newContainer.innerHTML = ''
                        newContainer.style.display = 'none'
                        
                        console.log(`✅ Cleaned container: ${containerId}`)
                    } catch (containerError) {
                        console.warn(`⚠️ Could not clean container ${containerId}:`, containerError)
                        // Fallback: just clear content
                        container.innerHTML = ''
                    }
                }
            })
            
            // 3. Remove any dynamically created elements (defensive)
            try {
                const dynamicElements = document.querySelectorAll('.wallet-generator, .wallet-restoration, .wallet-finalization')
                dynamicElements.forEach(element => {
                    if (element.parentNode) {
                        element.remove()
                    }
                })
            } catch (dynamicError) {
                console.warn('⚠️ Error removing dynamic elements:', dynamicError)
            }
            
            // 4. Clear any global state that might be set
            const globalOverlay = document.getElementById('global-overlay-container')
            if (globalOverlay) {
                globalOverlay.innerHTML = ''
            }
            
            console.log('✅ Thorough cleanup completed')
            
        } catch (error) {
            console.error('❌ Error during thorough cleanup:', error)
            // Don't re-throw, just log and continue
        }
    }

    /**
     * Finalize wallet creation/restoration
     */
    private async finalizeWallet(seedPhrase: string, isImport: boolean): Promise<void> {
        const walletName = (document.getElementById('walletName') as HTMLInputElement)?.value
        const password = this.getPasswordValue('walletPasswordContainer')
        const confirmPassword = this.getPasswordValue('confirmPasswordContainer')

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

    /**
     * Check for updates and show notification if available
     */
    private async checkForUpdates(): Promise<void> {
        try {
            const updateService = new UpdateService()
            const updateInfo = await updateService.checkForUpdates()
            
            if (updateInfo) {
                this.showUpdateNotification(updateInfo)
            }
        } catch (error) {
            console.warn('Update check failed:', error)
        }
    }

    /**
     * Show update notification banner
     */
    private showUpdateNotification(updateInfo: any): void {
        // Remove any existing update notification
        const existingNotification = document.getElementById('update-notification')
        if (existingNotification) {
            existingNotification.remove()
        }

        const notification = document.createElement('div')
        notification.id = 'update-notification'
        notification.className = 'update-notification'
        notification.innerHTML = `
            <div class="update-content">
                <div class="update-info">
                    <span class="update-icon">⬆️</span>
                    <div class="update-text">
                        <div class="update-title">Rune Tools v${updateInfo.version} Available</div>
                        <div class="update-subtitle">${updateInfo.fileSize || 'Ready to download'}</div>
                        ${!updateInfo.isVerified ? '<div class="update-warning-text">⚠️ Could not verify release signature</div>' : ''}
                    </div>
                </div>
                <div class="update-actions">
                    <button class="update-btn update-btn-primary" onclick="window.open('${updateInfo.downloadUrl}')">
                        Download
                    </button>
                    <button class="update-btn" onclick="document.getElementById('update-notification').remove()">
                        Later
                    </button>
                </div>
            </div>
        `
        
        document.body.insertBefore(notification, document.body.firstChild)
        
        // Auto-hide after 30 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove()
            }
        }, 30000)
    }
}