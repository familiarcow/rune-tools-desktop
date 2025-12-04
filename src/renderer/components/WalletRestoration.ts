/**
 * Wallet Restoration Component
 * 
 * Comprehensive seed phrase restoration with security features:
 * - Multi-format seed phrase input (12, 15, 18, 21, 24 words)
 * - Real-time validation and word suggestions
 * - BIP39 wordlist validation
 * - Paste handling with automatic formatting
 * - Security warnings and education
 */

import { CryptoUtils } from '../utils/CryptoUtils'

export interface RestoredWallet {
    seedPhrase: string
    wordCount: number
    isValid: boolean
    checksumValid: boolean
    normalizedPhrase: string
}

export class WalletRestoration {
    private container: HTMLElement
    private restoredWallet: RestoredWallet | null = null
    private onCompleteCallback: ((wallet: RestoredWallet) => void) | null = null
    private validationTimer: NodeJS.Timeout | null = null

    // Get BIP39 wordlist from CryptoUtils
    private get BIP39_WORDS(): string[] {
        return CryptoUtils.getBIP39Wordlist()
    }

    constructor(container: HTMLElement) {
        this.container = container
        console.log('🔄 WalletRestoration initialized')
    }

    /**
     * Display the wallet restoration interface
     */
    displayRestoration(): void {
        this.container.innerHTML = `
            <div class="wallet-restoration">
                <div class="restoration-header">
                    <h3>Restore Wallet from Recovery Phrase</h3>
                    <p>Enter your existing recovery phrase to restore your wallet. This should be the same phrase you saved when creating your wallet.</p>
                </div>

                <div class="security-notice">
                    <div class="notice-icon">🔒</div>
                    <div class="notice-content">
                        <h4>Security Notice</h4>
                        <p>Your recovery phrase is extremely sensitive. Make sure you're in a private location and no one can see your screen.</p>
                    </div>
                </div>

                <form id="restorationForm" class="restoration-form">
                    <div class="form-group">
                        <label class="form-label">Recovery Phrase</label>
                        <div class="seed-phrase-input-container">
                            <textarea
                                id="seedPhraseInput"
                                class="form-input seed-phrase-input"
                                placeholder="Enter your recovery phrase... (12, 15, 18, 21, or 24 words separated by spaces)"
                                rows="4"
                                autocomplete="off"
                                autocorrect="off"
                                autocapitalize="off"
                                spellcheck="false"
                            ></textarea>
                            <div class="input-actions">
                                <button type="button" id="pasteBtn" class="btn btn-secondary btn-sm">
                                    📋 Paste
                                </button>
                                <button type="button" id="clearBtn" class="btn btn-secondary btn-sm">
                                    🗑️ Clear
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="validationFeedback" class="validation-feedback"></div>

                    <div class="word-grid-container" id="wordGridContainer" style="display: none;">
                        <h4>Word-by-Word Input</h4>
                        <p class="word-grid-help">You can also enter words individually if preferred:</p>
                        <div id="wordGrid" class="word-grid"></div>
                    </div>

                    <div class="restoration-actions">
                        <button type="submit" id="restoreBtn" class="btn btn-primary" disabled>
                            🔄 Restore Wallet
                        </button>
                        <button type="button" id="toggleInputModeBtn" class="btn btn-secondary">
                            📝 Switch to Word-by-Word
                        </button>
                        <button type="button" id="backBtn" class="btn btn-secondary">
                            ← Back
                        </button>
                    </div>
                </form>

                <div class="restoration-help">
                    <h4>💡 Need Help?</h4>
                    <details>
                        <summary>Common Issues</summary>
                        <ul>
                            <li><strong>Wrong word count:</strong> Recovery phrases are usually 12, 15, 18, 21, or 24 words</li>
                            <li><strong>Spelling errors:</strong> Each word must match the BIP39 word list exactly</li>
                            <li><strong>Word order:</strong> The order of words is critical - they must be in the correct sequence</li>
                            <li><strong>Extra spaces:</strong> Multiple spaces between words will be automatically cleaned up</li>
                        </ul>
                    </details>
                    
                    <details>
                        <summary>Security Tips</summary>
                        <ul>
                            <li>Never store your recovery phrase in digital files or screenshots</li>
                            <li>Use a hardware wallet for large amounts</li>
                            <li>Consider using a secure password manager for backup storage</li>
                            <li>Test your restoration before depositing significant funds</li>
                        </ul>
                    </details>
                </div>
            </div>
        `

        this.setupEventListeners()
    }

    /**
     * Validate the entered seed phrase
     */
    async validateSeedPhrase(seedPhrase: string): Promise<RestoredWallet | null> {
        try {
            // Normalize the input
            const normalizedPhrase = this.normalizeSeedPhrase(seedPhrase)
            const words = normalizedPhrase.split(' ').filter(word => word.length > 0)

            console.log('🔍 Validating seed phrase:', {
                wordCount: words.length,
                hasValidLength: [12, 15, 18, 21, 24].includes(words.length)
            })

            // Check word count
            if (![12, 15, 18, 21, 24].includes(words.length)) {
                console.log('❌ Invalid word count:', words.length)
                return null
            }

            // Check if all words are in BIP39 wordlist
            const invalidWords = words.filter(word => !this.BIP39_WORDS.includes(word.toLowerCase()))
            if (invalidWords.length > 0) {
                console.log('❌ Invalid BIP39 words found:', invalidWords)
            }

            // Validate using CryptoUtils (which uses the official BIP39 library)
            const isValid = await CryptoUtils.validateMnemonic(normalizedPhrase)
            console.log('🔍 BIP39 validation result:', isValid)

            return {
                seedPhrase,
                wordCount: words.length,
                isValid,
                checksumValid: isValid,
                normalizedPhrase
            }

        } catch (error) {
            console.error('Error validating seed phrase:', error)
            return null
        }
    }

    /**
     * Normalize seed phrase input
     */
    private normalizeSeedPhrase(input: string): string {
        return input
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/[^\w\s]/g, ' ') // Replace special characters with spaces
            .replace(/\s+/g, ' ') // Clean up multiple spaces again
            .trim()
    }

    /**
     * Get word suggestions for partial input
     */
    private getWordSuggestions(partial: string, limit: number = 5): string[] {
        if (partial.length < 2) return []
        
        const lowerPartial = partial.toLowerCase()
        return this.BIP39_WORDS
            .filter(word => word.startsWith(lowerPartial))
            .slice(0, limit)
    }

    /**
     * Display validation feedback
     */
    private displayValidation(wallet: RestoredWallet | null, input: string): void {
        const feedback = document.getElementById('validationFeedback')
        const restoreBtn = document.getElementById('restoreBtn') as HTMLButtonElement
        
        if (!feedback || !restoreBtn) return

        if (!input.trim()) {
            feedback.innerHTML = ''
            restoreBtn.disabled = true
            return
        }

        if (!wallet) {
            const words = input.trim().split(/\s+/)
            feedback.innerHTML = `
                <div class="validation-error">
                    <div class="error-icon">❌</div>
                    <div class="error-content">
                        <p><strong>Invalid Recovery Phrase</strong></p>
                        <p>Current word count: ${words.length} (expected: 12, 15, 18, 21, or 24)</p>
                    </div>
                </div>
            `
            restoreBtn.disabled = true
            return
        }

        if (!wallet.isValid) {
            // Show specific validation errors
            const words = wallet.normalizedPhrase.split(' ')
            const invalidWords = words.filter(word => !this.BIP39_WORDS.includes(word.toLowerCase()))
            
            feedback.innerHTML = `
                <div class="validation-error">
                    <div class="error-icon">❌</div>
                    <div class="error-content">
                        <p><strong>Invalid Recovery Phrase</strong></p>
                        ${invalidWords.length > 0 ? `
                            <p>Invalid words: ${invalidWords.join(', ')}</p>
                            <p><small>All words must be from the BIP39 word list.</small></p>
                        ` : `
                            <p>Checksum validation failed. Please check the word order and spelling.</p>
                        `}
                    </div>
                </div>
            `
            restoreBtn.disabled = true
            return
        }

        // Valid seed phrase
        feedback.innerHTML = `
            <div class="validation-success">
                <div class="success-icon">✅</div>
                <div class="success-content">
                    <p><strong>Valid Recovery Phrase</strong></p>
                    <p>${wallet.wordCount} words • Checksum valid • Ready to restore</p>
                </div>
            </div>
        `
        restoreBtn.disabled = false
        this.restoredWallet = wallet
    }

    /**
     * Create word-by-word input grid
     */
    private createWordGrid(wordCount: number = 12): void {
        const wordGrid = document.getElementById('wordGrid')
        if (!wordGrid) return

        wordGrid.innerHTML = ''
        
        for (let i = 0; i < wordCount; i++) {
            const wordInput = document.createElement('div')
            wordInput.className = 'word-input-group'
            wordInput.innerHTML = `
                <label class="word-number">${i + 1}</label>
                <input
                    type="text"
                    class="form-input word-input"
                    id="word-${i}"
                    data-word-index="${i}"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    placeholder="word"
                >
                <div class="word-suggestions" id="suggestions-${i}"></div>
            `
            wordGrid.appendChild(wordInput)
        }

        this.setupWordInputListeners()
    }

    /**
     * Set up event listeners for word inputs
     */
    private setupWordInputListeners(): void {
        const wordInputs = document.querySelectorAll('.word-input') as NodeListOf<HTMLInputElement>
        
        wordInputs.forEach((input, index) => {
            // Input validation and suggestions
            input.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement
                const value = target.value.toLowerCase().trim()
                
                // Show suggestions
                this.showWordSuggestions(index, value)
                
                // Auto-advance to next field if word is complete and valid
                if (value.length > 2 && this.BIP39_WORDS.includes(value)) {
                    const nextInput = document.getElementById(`word-${index + 1}`) as HTMLInputElement
                    if (nextInput && !nextInput.value) {
                        setTimeout(() => nextInput.focus(), 100)
                    }
                }

                // Update main textarea with current words
                this.updateMainTextareaFromGrid()
            })

            // Arrow key navigation
            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' && input.selectionStart === input.value.length) {
                    const nextInput = document.getElementById(`word-${index + 1}`) as HTMLInputElement
                    if (nextInput) {
                        nextInput.focus()
                        e.preventDefault()
                    }
                } else if (e.key === 'ArrowLeft' && input.selectionStart === 0) {
                    const prevInput = document.getElementById(`word-${index - 1}`) as HTMLInputElement
                    if (prevInput) {
                        prevInput.focus()
                        e.preventDefault()
                    }
                }
            })
        })
    }

    /**
     * Show word suggestions
     */
    private showWordSuggestions(wordIndex: number, partial: string): void {
        const suggestionsContainer = document.getElementById(`suggestions-${wordIndex}`)
        if (!suggestionsContainer) return

        if (partial.length < 2) {
            suggestionsContainer.innerHTML = ''
            suggestionsContainer.style.display = 'none'
            return
        }

        const suggestions = this.getWordSuggestions(partial)
        if (suggestions.length === 0) {
            suggestionsContainer.innerHTML = ''
            suggestionsContainer.style.display = 'none'
            return
        }

        suggestionsContainer.innerHTML = suggestions.map(word => 
            `<div class="word-suggestion" data-word="${word}">${word}</div>`
        ).join('')
        
        suggestionsContainer.style.display = 'block'

        // Add click listeners to suggestions
        suggestionsContainer.querySelectorAll('.word-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                const word = suggestion.getAttribute('data-word')
                const input = document.getElementById(`word-${wordIndex}`) as HTMLInputElement
                if (input && word) {
                    input.value = word
                    suggestionsContainer.style.display = 'none'
                    
                    // Move to next input
                    const nextInput = document.getElementById(`word-${wordIndex + 1}`) as HTMLInputElement
                    if (nextInput) {
                        nextInput.focus()
                    }

                    this.updateMainTextareaFromGrid()
                }
            })
        })
    }

    /**
     * Update main textarea from word grid
     */
    private updateMainTextareaFromGrid(): void {
        const wordInputs = document.querySelectorAll('.word-input') as NodeListOf<HTMLInputElement>
        const mainTextarea = document.getElementById('seedPhraseInput') as HTMLTextAreaElement
        
        if (!mainTextarea) return

        const words = Array.from(wordInputs)
            .map(input => input.value.trim())
            .filter(word => word.length > 0)

        mainTextarea.value = words.join(' ')
        
        // Trigger validation
        this.debouncedValidation()
    }

    /**
     * Set up main event listeners
     */
    private setupEventListeners(): void {
        const seedPhraseInput = document.getElementById('seedPhraseInput') as HTMLTextAreaElement
        const pasteBtn = document.getElementById('pasteBtn')
        const clearBtn = document.getElementById('clearBtn')
        const restoreBtn = document.getElementById('restoreBtn')
        const toggleBtn = document.getElementById('toggleInputModeBtn')
        const backBtn = document.getElementById('backBtn')
        const form = document.getElementById('restorationForm') as HTMLFormElement

        // Real-time validation
        if (seedPhraseInput) {
            seedPhraseInput.addEventListener('input', () => {
                this.debouncedValidation()
            })

            seedPhraseInput.addEventListener('paste', (e) => {
                setTimeout(() => this.debouncedValidation(), 100)
            })
        }

        // Paste button
        if (pasteBtn) {
            pasteBtn.addEventListener('click', async () => {
                try {
                    const text = await navigator.clipboard.readText()
                    if (seedPhraseInput) {
                        seedPhraseInput.value = text
                        this.debouncedValidation()
                    }
                } catch (error) {
                    console.error('Failed to paste from clipboard:', error)
                }
            })
        }

        // Clear button
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (seedPhraseInput) {
                    seedPhraseInput.value = ''
                    this.displayValidation(null, '')
                }
            })
        }

        // Toggle input mode
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleInputMode()
            })
        }

        // Form submission
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault()
                if (this.restoredWallet && this.onCompleteCallback) {
                    this.onCompleteCallback(this.restoredWallet)
                }
            })
        }

        // Back button
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Emit back event or handle navigation
                this.container.dispatchEvent(new CustomEvent('walletRestoration:back'))
            })
        }
    }

    /**
     * Debounced validation to avoid excessive API calls
     */
    private debouncedValidation(): void {
        if (this.validationTimer) {
            clearTimeout(this.validationTimer)
        }

        this.validationTimer = setTimeout(async () => {
            const input = (document.getElementById('seedPhraseInput') as HTMLTextAreaElement)?.value || ''
            const wallet = await this.validateSeedPhrase(input)
            this.displayValidation(wallet, input)
        }, 300)
    }

    /**
     * Toggle between textarea and word grid input modes
     */
    private toggleInputMode(): void {
        const wordGridContainer = document.getElementById('wordGridContainer')
        const toggleBtn = document.getElementById('toggleInputModeBtn')
        
        if (!wordGridContainer || !toggleBtn) return

        if (wordGridContainer.style.display === 'none') {
            // Switch to word-by-word mode
            const currentInput = (document.getElementById('seedPhraseInput') as HTMLTextAreaElement)?.value || ''
            const wordCount = currentInput.trim() ? currentInput.trim().split(/\s+/).length : 12
            
            this.createWordGrid(Math.max(12, wordCount))
            wordGridContainer.style.display = 'block'
            toggleBtn.textContent = '📄 Switch to Paragraph'
            
            // Populate grid with current words
            if (currentInput.trim()) {
                const words = currentInput.trim().split(/\s+/)
                words.forEach((word, index) => {
                    const input = document.getElementById(`word-${index}`) as HTMLInputElement
                    if (input) input.value = word
                })
            }
        } else {
            // Switch to textarea mode
            wordGridContainer.style.display = 'none'
            toggleBtn.textContent = '📝 Switch to Word-by-Word'
        }
    }

    /**
     * Set completion callback
     */
    onComplete(callback: (wallet: RestoredWallet) => void): void {
        this.onCompleteCallback = callback
    }

    /**
     * Get the current restored wallet
     */
    getRestoredWallet(): RestoredWallet | null {
        return this.restoredWallet
    }

    /**
     * Reset the restoration component
     */
    reset(): void {
        this.restoredWallet = null
        if (this.validationTimer) {
            clearTimeout(this.validationTimer)
        }
        this.container.innerHTML = ''
    }
}