/**
 * Secure Wallet Storage Service
 * 
 * Handles secure storage and retrieval of encrypted wallet data in the main process.
 * Creates and manages a .runetools directory in the user's home folder.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface SecureWalletData {
    walletId: string
    name: string
    addresses: {
        mainnet?: string
        stagenet?: string
    }
    encryptedSeedPhrase: string
    passwordHash: string
    salt: string
    iv: string
    createdAt: string
    lastUsed?: string
    isLocked: boolean
}

export interface WalletStorageInfo {
    walletId: string
    name: string
    addresses: {
        mainnet?: string
        stagenet?: string
    }
    isLocked: boolean
    lastUsed?: Date
}

export class SecureWalletStorageService {
    private readonly storageDir: string

    constructor() {
        // Create .runetools directory in user's home folder
        this.storageDir = path.join(os.homedir(), '.runetools', 'wallets')
        this.ensureStorageDir()
    }

    /**
     * Ensure the storage directory exists
     */
    private ensureStorageDir(): void {
        try {
            if (!fs.existsSync(this.storageDir)) {
                fs.mkdirSync(this.storageDir, { recursive: true, mode: 0o700 }) // Private directory
                console.log('✅ Created wallet storage directory:', this.storageDir)
            }
        } catch (error) {
            console.error('❌ Failed to create storage directory:', error)
            throw new Error('Failed to create secure storage directory')
        }
    }

    /**
     * Save encrypted wallet data to file system
     */
    async saveWallet(walletData: SecureWalletData): Promise<void> {
        try {
            const filePath = path.join(this.storageDir, `${walletData.walletId}.json`)
            
            // Check if wallet already exists
            if (fs.existsSync(filePath)) {
                throw new Error(`Wallet with ID ${walletData.walletId} already exists`)
            }

            // Write wallet data to file with restricted permissions
            fs.writeFileSync(filePath, JSON.stringify(walletData, null, 2), { 
                mode: 0o600,  // Read/write for owner only
                encoding: 'utf8'
            })

            console.log('✅ Wallet saved securely:', walletData.walletId)
        } catch (error) {
            console.error('❌ Failed to save wallet:', error)
            throw error
        }
    }

    /**
     * Load wallet data by wallet ID
     */
    async loadWallet(walletId: string): Promise<SecureWalletData | null> {
        try {
            const filePath = path.join(this.storageDir, `${walletId}.json`)
            
            if (!fs.existsSync(filePath)) {
                return null
            }

            const data = fs.readFileSync(filePath, 'utf8')
            const walletData = JSON.parse(data) as SecureWalletData

            // Validate wallet data structure
            if (!this.validateWalletData(walletData)) {
                console.warn('⚠️ Invalid wallet data structure:', walletId)
                return null
            }

            return walletData
        } catch (error) {
            console.error('❌ Failed to load wallet:', error)
            return null
        }
    }

    /**
     * Get list of all available wallets
     */
    async getAvailableWallets(): Promise<WalletStorageInfo[]> {
        try {
            const files = fs.readdirSync(this.storageDir)
            const wallets: WalletStorageInfo[] = []

            for (const file of files) {
                if (!file.endsWith('.json')) continue

                const walletId = path.basename(file, '.json')
                const walletData = await this.loadWallet(walletId)
                
                if (walletData) {
                    wallets.push({
                        walletId: walletData.walletId,
                        name: walletData.name,
                        addresses: walletData.addresses,
                        isLocked: walletData.isLocked,
                        lastUsed: walletData.lastUsed ? new Date(walletData.lastUsed) : undefined
                    })
                }
            }

            // Sort by last used (most recent first)
            wallets.sort((a, b) => {
                if (!a.lastUsed && !b.lastUsed) return a.name.localeCompare(b.name)
                if (!a.lastUsed) return 1
                if (!b.lastUsed) return -1
                return b.lastUsed.getTime() - a.lastUsed.getTime()
            })

            return wallets
        } catch (error) {
            console.error('❌ Failed to get available wallets:', error)
            return []
        }
    }

    /**
     * Update wallet's last used timestamp and lock status
     */
    async updateWalletAccess(walletId: string, isLocked: boolean = false): Promise<void> {
        try {
            const walletData = await this.loadWallet(walletId)
            if (!walletData) {
                throw new Error(`Wallet not found: ${walletId}`)
            }

            walletData.lastUsed = new Date().toISOString()
            walletData.isLocked = isLocked

            const filePath = path.join(this.storageDir, `${walletId}.json`)
            fs.writeFileSync(filePath, JSON.stringify(walletData, null, 2), { 
                mode: 0o600,
                encoding: 'utf8'
            })

            console.log('✅ Updated wallet access:', walletId, `(locked: ${isLocked})`)
        } catch (error) {
            console.error('❌ Failed to update wallet access:', error)
            throw error
        }
    }

    /**
     * Delete a wallet from storage
     */
    async deleteWallet(walletId: string): Promise<void> {
        try {
            const filePath = path.join(this.storageDir, `${walletId}.json`)
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
                console.log('✅ Wallet deleted:', walletId)
            }
        } catch (error) {
            console.error('❌ Failed to delete wallet:', error)
            throw error
        }
    }

    /**
     * Check if a wallet exists
     */
    async walletExists(walletId: string): Promise<boolean> {
        const filePath = path.join(this.storageDir, `${walletId}.json`)
        return fs.existsSync(filePath)
    }

    /**
     * Validate wallet data structure
     */
    private validateWalletData(data: any): data is SecureWalletData {
        return (
            typeof data === 'object' &&
            typeof data.walletId === 'string' &&
            typeof data.name === 'string' &&
            typeof data.addresses === 'object' &&
            typeof data.encryptedSeedPhrase === 'string' &&
            typeof data.passwordHash === 'string' &&
            typeof data.salt === 'string' &&
            typeof data.iv === 'string' &&
            typeof data.createdAt === 'string' &&
            typeof data.isLocked === 'boolean'
        )
    }

    /**
     * Get storage directory path
     */
    getStorageDirectory(): string {
        return this.storageDir
    }

    /**
     * Get storage statistics
     */
    async getStorageStats(): Promise<{
        directory: string
        totalWallets: number
        diskSpace: number
    }> {
        try {
            const files = fs.readdirSync(this.storageDir)
            const walletFiles = files.filter(file => file.endsWith('.json'))
            
            let totalSize = 0
            for (const file of walletFiles) {
                const filePath = path.join(this.storageDir, file)
                const stats = fs.statSync(filePath)
                totalSize += stats.size
            }

            return {
                directory: this.storageDir,
                totalWallets: walletFiles.length,
                diskSpace: totalSize
            }
        } catch (error) {
            console.error('❌ Failed to get storage stats:', error)
            throw error
        }
    }
}