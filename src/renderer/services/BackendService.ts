/**
 * Backend Service - IPC Communication Layer
 * 
 * Handles all communication with the main Electron process
 * via IPC handlers defined in main.ts
 */

declare global {
    interface Window {
        electronAPI?: {
            invoke: (channel: string, ...args: any[]) => Promise<any>
        }
    }
}

export class BackendService {
    private name: string = 'BackendService'
    private isInitialized: boolean = false
    private ipc: any
    private currentNetwork: 'mainnet' | 'stagenet' = 'mainnet' // Track current network for mock responses

    constructor() {
        // Use window.electronAPI if available, otherwise show error
        if ((window as any).electronAPI) {
            this.ipc = (window as any).electronAPI
            console.log('🔧 BackendService created (using real IPC)')
        } else {
            // Fall back to mock only for development, but prefer real IPC
            this.ipc = {
                invoke: async (channel: string, ...args: any[]) => {
                    console.warn(`⚠️ Using mock IPC for ${channel} - real IPC not available`)
                    return this.getMockResponse(channel, args)
                }
            }
            console.log('🔧 BackendService created (using mock - consider checking preload.js)')
        }
        
        console.log('🔍 Window.electronAPI available:', !!(window as any).electronAPI)
    }

    async initialize(): Promise<boolean> {
        try {
            console.log('BackendService initializing...')
            
            // Test real IPC connection
            const networkInfo = await this.getNetwork()
            
            // Update our internal network state to match backend
            if (networkInfo?.currentNetwork) {
                this.currentNetwork = networkInfo.currentNetwork
                console.log(`🔄 Backend network synchronized to: ${this.currentNetwork}`)
            }
            
            this.isInitialized = true
            console.log('✅ BackendService initialized with real IPC', { 
                network: networkInfo,
                hasElectronAPI: !!(window as any).electronAPI
            })
            return true
        } catch (error) {
            console.error('❌ Failed to initialize BackendService:', error)
            console.log('🔄 Falling back to mock mode for development')
            this.isInitialized = true // Allow mock mode to work
            return true
        }
    }

    // Mock responses for development
    private getMockResponse(channel: string, args: any[]): any {
        switch (channel) {
            case 'get-network':
                return {
                    currentNetwork: this.currentNetwork,
                    config: { 
                        rpcUrl: this.currentNetwork === 'mainnet' 
                            ? 'https://rpc.ninerealms.com' 
                            : 'https://stagenet-rpc.ninerealms.com'
                    },
                    endpoints: { 
                        thornode: this.currentNetwork === 'mainnet'
                            ? 'https://thornode.ninerealms.com'
                            : 'https://stagenet-thornode.ninerealms.com'
                    }
                }
            case 'set-network':
                const [network] = args
                this.updateCurrentNetwork(network as 'mainnet' | 'stagenet')
                return { success: true, network: this.currentNetwork }
            case 'generate-seed':
                return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
            case 'create-wallet':
                return {
                    walletId: 'mock-wallet-id',
                    mainnetAddress: 'thor1mock123456789abcdef',
                    stagenetAddress: 'sthor1mock123456789abcdef'
                }
            case 'get-balances':
                // Return mock balances based on current network
                return this.getMockBalances()
            case 'get-normalized-balances':
                return this.getMockNormalizedBalances()
            case 'get-trade-account':
                return this.getMockTradeAccount()
            case 'get-node-info':
                return this.getMockNodeInfo()
            case 'save-wallet':
                // Mock saving - just return success
                console.log('Mock wallet saved:', args[0]?.name || 'Unknown wallet')
                return { success: true }
            case 'get-available-wallets':
                // Return empty array for now - in development mode there won't be real wallets
                return []
            case 'unlock-wallet':
                const [walletId] = args
                return {
                    walletId,
                    name: 'Mock Wallet',
                    mainnetAddress: 'thor1mock123456789abcdef',
                    stagenetAddress: 'sthor1mock123456789abcdef',
                    isLocked: false,
                    lastUsed: new Date()
                }
            default:
                return null
        }
    }

    // Mock balance data based on network
    private getMockBalances(): any[] {
        if (this.currentNetwork === 'mainnet') {
            return [
                { asset: 'BTC.BTC', amount: '0.12345678', chain: 'BTC' },
                { asset: 'ETH.ETH', amount: '2.5', chain: 'ETH' },
                { asset: 'THOR.RUNE', amount: '1000.0', chain: 'THOR' }
            ]
        } else {
            return [
                { asset: 'BTC.BTC', amount: '0.05', chain: 'BTC' },
                { asset: 'ETH.ETH', amount: '1.0', chain: 'ETH' },
                { asset: 'THOR.RUNE', amount: '500.0', chain: 'THOR' }
            ]
        }
    }

    private getMockNormalizedBalances(): any[] {
        return [
            { asset: 'THOR.RUNE', amount: '1000.0', chain: 'THOR' }
        ]
    }

    private getMockTradeAccount(): any {
        return {
            balances: this.currentNetwork === 'mainnet' ? [
                { asset: 'THOR.RUNE', amount: '100.0', chain: 'THOR' }
            ] : [
                { asset: 'THOR.RUNE', amount: '50.0', chain: 'THOR' }
            ]
        }
    }

    private getMockNodeInfo(): any {
        return {
            network: this.currentNetwork,
            status: 'active',
            version: '1.0.0',
            bond: '1000000000000'
        }
    }

    // Wallet operations
    async generateSeed(): Promise<string> {
        return await this.ipc.invoke('generate-seed')
    }

    async createWallet(mnemonic: string): Promise<any> {
        return await this.ipc.invoke('create-wallet', mnemonic)
    }






    // Network operations
    async setNetwork(network: 'mainnet' | 'stagenet'): Promise<any> {
        return await this.ipc.invoke('set-network', network)
    }

    async getNetwork(): Promise<any> {
        return await this.ipc.invoke('get-network')
    }

    // Wallet balance operations
    async getBalances(address: string): Promise<any> {
        return await this.ipc.invoke('get-balances', address)
    }

    async getTradeAccount(address: string): Promise<any> {
        return await this.ipc.invoke('get-trade-account', address)
    }

    async getNormalizedBalances(address: string): Promise<any> {
        return await this.ipc.invoke('get-normalized-balances', address)
    }

    // THORChain network operations
    async getNodeInfo(): Promise<any> {
        return await this.ipc.invoke('get-node-info')
    }

    async getPools(): Promise<any> {
        return await this.ipc.invoke('get-pools')
    }

    async getOraclePrices(): Promise<any> {
        return await this.ipc.invoke('get-oracle-prices')
    }

    async getThorchainNetwork(): Promise<any> {
        return await this.ipc.invoke('get-thorchain-network')
    }

    // Transaction operations
    async broadcastTransaction(walletInfo: any, params: any): Promise<any> {
        return await this.ipc.invoke('broadcast-transaction', walletInfo, params)
    }

    async estimateGas(walletInfo: any, params: any): Promise<any> {
        return await this.ipc.invoke('estimate-gas', walletInfo, params)
    }

    async trackTransaction(hash: string): Promise<any> {
        return await this.ipc.invoke('track-transaction', hash)
    }

    // Swap operations
    async getSwapQuote(params: any): Promise<any> {
        return await this.ipc.invoke('get-swap-quote', params)
    }

    async constructSwap(quote: any, fromAsset: string, toAsset: string, amount: string): Promise<any> {
        return await this.ipc.invoke('construct-swap', quote, fromAsset, toAsset, amount)
    }

    // Memoless operations (Stagenet only)
    async memolessGetValidAssets(): Promise<any> {
        return await this.ipc.invoke('memoless-get-valid-assets')
    }

    async memolessRegisterMemo(walletInfo: any, asset: string, memo: string): Promise<any> {
        return await this.ipc.invoke('memoless-register-memo', walletInfo, asset, memo)
    }

    async memolessIsStaging(): Promise<boolean> {
        return await this.ipc.invoke('memoless-is-stagenet')
    }

    // Secure wallet storage operations
    async saveWallet(walletData: any): Promise<any> {
        return await this.ipc.invoke('save-wallet', walletData)
    }

    async loadWallet(walletId: string): Promise<any> {
        return await this.ipc.invoke('load-wallet', walletId)
    }

    async getAvailableWallets(): Promise<any[]> {
        return await this.ipc.invoke('get-available-wallets')
    }

    async updateWalletAccess(walletId: string, isLocked: boolean = false): Promise<any> {
        return await this.ipc.invoke('update-wallet-access', walletId, isLocked)
    }

    async deleteWallet(walletId: string): Promise<any> {
        return await this.ipc.invoke('delete-wallet', walletId)
    }

    async walletExists(walletId: string): Promise<boolean> {
        return await this.ipc.invoke('wallet-exists', walletId)
    }

    async getStorageStats(): Promise<any> {
        return await this.ipc.invoke('get-storage-stats')
    }

    async saveSession(sessionData: any): Promise<any> {
        return await this.ipc.invoke('save-session', sessionData)
    }

    async unlockWallet(walletId: string, password: string): Promise<any> {
        return await this.ipc.invoke('unlock-wallet', walletId, password)
    }

    async getActiveSession(): Promise<any> {
        // For now, return null - no active session management yet
        return null
    }

    getName(): string {
        return this.name
    }

    getIsInitialized(): boolean {
        return this.isInitialized
    }

    // Get current network - this is the source of truth for all network-dependent operations
    getCurrentNetwork(): 'mainnet' | 'stagenet' {
        return this.currentNetwork
    }

    // Update current network internally (used by mock responses)
    private updateCurrentNetwork(network: 'mainnet' | 'stagenet'): void {
        this.currentNetwork = network
        console.log(`🔄 BackendService network updated to: ${this.currentNetwork}`)
    }
}