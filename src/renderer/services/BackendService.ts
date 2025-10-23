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

    constructor() {
        // Use window.electronAPI if available (production), otherwise mock for development
        this.ipc = (window as any).electronAPI || {
            invoke: async (channel: string, ...args: any[]) => {
                // SECURITY: Never log args as they may contain sensitive data like seed phrases
                console.log(`Mock IPC call: ${channel} [args count: ${args.length}]`)
                return this.getMockResponse(channel, args)
            }
        }
        
        const isUsingMock = !(window as any).electronAPI
        console.log('🔧 BackendService created', isUsingMock ? '(using mock)' : '(using real IPC)')
        console.log('🔍 Window.electronAPI available:', !!(window as any).electronAPI)
        console.log('🔍 Window keys:', Object.keys(window).filter(key => key.includes('electron')))
    }

    async initialize(): Promise<boolean> {
        try {
            console.log('BackendService initializing...')
            // Test IPC connection
            const networkInfo = await this.getNetwork()
            this.isInitialized = true
            console.log('✅ BackendService initialized', { network: networkInfo })
            return true
        } catch (error) {
            console.error('❌ Failed to initialize BackendService:', error)
            throw error
        }
    }

    // Mock responses for development
    private getMockResponse(channel: string, args: any[]): any {
        switch (channel) {
            case 'get-network':
                return {
                    currentNetwork: 'mainnet',
                    config: { rpcUrl: 'https://rpc.ninerealms.com' },
                    endpoints: { thornode: 'https://thornode.ninerealms.com' }
                }
            case 'generate-seed':
                return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
            case 'create-wallet':
                return {
                    walletId: 'mock-wallet-id',
                    mainnetAddress: 'thor1mock123456789',
                    stagenetAddress: 'sthor1mock123456789'
                }
            case 'get-balances':
                return []
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
                    mainnetAddress: 'thor1mock123456789',
                    stagenetAddress: 'sthor1mock123456789',
                    isLocked: false,
                    lastUsed: new Date()
                }
            default:
                return null
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
}