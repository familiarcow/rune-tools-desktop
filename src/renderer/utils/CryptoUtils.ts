/**
 * Cryptographic Utilities - Secure Password and Data Handling
 * 
 * Provides secure hashing, encryption, and key derivation functions
 * for wallet password management and sensitive data storage.
 * Also includes BIP39 mnemonic validation using the official library.
 */

import * as bip39 from 'bip39'

export class CryptoUtils {
    private static readonly SALT_LENGTH = 32
    private static readonly IV_LENGTH = 16
    private static readonly KEY_LENGTH = 32
    private static readonly ITERATIONS = 100000 // PBKDF2 iterations

    /**
     * Generate a cryptographically secure random salt
     */
    static generateSalt(): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
    }

    /**
     * Generate a cryptographically secure random IV
     */
    static generateIV(): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
    }

    /**
     * Hash a password using PBKDF2 with a random salt
     * Returns the salt and hash for storage
     */
    static async hashPassword(password: string): Promise<{ salt: string, hash: string }> {
        const salt = this.generateSalt()
        const hash = await this.deriveKey(password, salt)
        
        return {
            salt: this.uint8ArrayToHex(salt),
            hash: this.uint8ArrayToHex(hash)
        }
    }

    /**
     * Verify a password against a stored hash
     */
    static async verifyPassword(password: string, storedSalt: string, storedHash: string): Promise<boolean> {
        const salt = this.hexToUint8Array(storedSalt)
        const hash = await this.deriveKey(password, salt)
        const computedHash = this.uint8ArrayToHex(hash)
        
        return this.constantTimeCompare(computedHash, storedHash)
    }

    /**
     * Derive an encryption key from password and salt using PBKDF2
     */
    static async deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
        const encoder = new TextEncoder()
        const passwordBuffer = encoder.encode(password)
        
        // Import the password as a key
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer.buffer as ArrayBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        )
        
        // Derive the key
        const keyBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt.buffer as ArrayBuffer,
                iterations: this.ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            this.KEY_LENGTH * 8 // bits
        )
        
        return new Uint8Array(keyBits)
    }

    /**
     * Encrypt sensitive data (like seed phrases) with a password-derived key
     */
    static async encryptSensitiveData(data: string, password: string): Promise<{
        encryptedData: string,
        salt: string,
        iv: string
    }> {
        const salt = this.generateSalt()
        const iv = this.generateIV()
        const key = await this.deriveKey(password, salt)
        
        // Import the key for AES encryption
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key.buffer as ArrayBuffer,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        )
        
        // Encrypt the data
        const encoder = new TextEncoder()
        const dataBuffer = encoder.encode(data)
        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
            cryptoKey,
            dataBuffer
        )
        
        return {
            encryptedData: this.uint8ArrayToHex(new Uint8Array(encryptedBuffer)),
            salt: this.uint8ArrayToHex(salt),
            iv: this.uint8ArrayToHex(iv)
        }
    }

    /**
     * Decrypt sensitive data with a password-derived key
     */
    static async decryptSensitiveData(
        encryptedData: string,
        password: string,
        salt: string,
        iv: string
    ): Promise<string> {
        const saltBytes = this.hexToUint8Array(salt)
        const ivBytes = this.hexToUint8Array(iv)
        const encryptedBytes = this.hexToUint8Array(encryptedData)
        
        // Derive the same key
        const key = await this.deriveKey(password, saltBytes)
        
        // Import the key for AES decryption
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key.buffer as ArrayBuffer,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        )
        
        // Decrypt the data
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer },
            cryptoKey,
            encryptedBytes.buffer as ArrayBuffer
        )
        
        const decoder = new TextDecoder()
        return decoder.decode(decryptedBuffer)
    }

    /**
     * Generate a secure wallet ID
     */
    static generateWalletId(): string {
        const randomBytes = crypto.getRandomValues(new Uint8Array(16))
        return this.uint8ArrayToHex(randomBytes)
    }

    /**
     * Hash wallet data for integrity verification
     */
    static async hashWalletData(data: any): Promise<string> {
        const encoder = new TextEncoder()
        const dataString = JSON.stringify(data)
        const dataBuffer = encoder.encode(dataString)
        
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
        return this.uint8ArrayToHex(new Uint8Array(hashBuffer))
    }

    /**
     * Convert Uint8Array to hex string
     */
    private static uint8ArrayToHex(bytes: Uint8Array): string {
        return Array.from(bytes)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('')
    }

    /**
     * Convert hex string to Uint8Array
     */
    private static hexToUint8Array(hex: string): Uint8Array {
        const bytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
        }
        return bytes
    }

    /**
     * Constant-time string comparison to prevent timing attacks
     */
    private static constantTimeCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false
        }
        
        let result = 0
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i)
        }
        
        return result === 0
    }

    /**
     * Clear sensitive data from memory (best effort)
     */
    static clearSensitiveData(data: string): string {
        // JavaScript doesn't provide guaranteed memory clearing,
        // but we can overwrite the string reference
        return data.replace(/./g, '0')
    }

    /**
     * Validate BIP39 mnemonic phrase using the official library
     */
    static async validateMnemonic(mnemonic: string): Promise<boolean> {
        try {
            const normalizedMnemonic = mnemonic.trim().toLowerCase()
            console.log('🔍 CryptoUtils.validateMnemonic called with:', {
                wordCount: normalizedMnemonic.split(' ').length,
                bip39Available: !!bip39,
                bip39ValidateExists: typeof bip39.validateMnemonic === 'function'
            })
            
            const result = bip39.validateMnemonic(normalizedMnemonic)
            console.log('🔍 BIP39 library result:', result)
            return result
        } catch (error) {
            console.error('BIP39 validation error:', error)
            return false
        }
    }

    /**
     * Get the complete BIP39 wordlist
     */
    static getBIP39Wordlist(): string[] {
        return bip39.wordlists.english
    }

    /**
     * Generate a BIP39 mnemonic phrase
     * Note: This should use IPC to call the main process where Buffer is available
     */
    static generateMnemonic(strength: number = 128): string {
        // strength: 128 = 12 words, 160 = 15 words, 192 = 18 words, 224 = 21 words, 256 = 24 words
        try {
            return bip39.generateMnemonic(strength)
        } catch (error) {
            console.error('Error generating mnemonic in renderer, should use IPC:', error)
            // Fallback - this should not be used in production
            throw new Error('Mnemonic generation failed - use IPC to main process instead')
        }
    }

    /**
     * Create a secure wallet storage object
     */
    static async createSecureWalletStorage(
        name: string,
        mnemonic: string,
        password: string,
        addresses: { mainnet?: string, stagenet?: string }
    ): Promise<{
        walletId: string,
        name: string,
        addresses: { mainnet?: string, stagenet?: string },
        encryptedSeedPhrase: string,
        passwordHash: string,
        salt: string,
        iv: string,
        createdAt: string,
        isLocked: boolean
    }> {
        const walletId = this.generateWalletId()
        
        // Hash password for authentication
        const { salt: passwordSalt, hash: passwordHash } = await this.hashPassword(password)
        
        // Encrypt mnemonic with password
        const { 
            encryptedData: encryptedMnemonic, 
            salt: mnemonicSalt, 
            iv: mnemonicIV 
        } = await this.encryptSensitiveData(mnemonic, password)
        
        return {
            walletId,
            name,
            addresses,
            encryptedSeedPhrase: encryptedMnemonic,
            passwordHash,
            salt: passwordSalt,
            iv: mnemonicIV,
            createdAt: new Date().toISOString(),
            isLocked: true // New wallets start locked
        }
    }

    /**
     * Verify wallet storage integrity (basic validation)
     */
    static async verifyWalletIntegrity(walletData: any): Promise<boolean> {
        try {
            // Basic validation of required fields
            return !!(
                walletData.walletId &&
                walletData.name &&
                walletData.encryptedSeedPhrase &&
                walletData.passwordHash &&
                walletData.salt &&
                walletData.iv &&
                walletData.addresses
            )
            
        } catch (error) {
            console.error('❌ Failed to verify wallet integrity:', error)
            return false
        }
    }
}