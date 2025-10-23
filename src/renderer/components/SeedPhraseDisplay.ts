/**
 * Seed Phrase Display Component
 * 
 * Visual component for displaying seed phrases in a grid format.
 * Features:
 * - 3x4 grid layout for 12-word phrases (adjusts for other lengths)
 * - Word numbering
 * - Responsive design
 * - Copy functionality
 * - Security warnings
 */

export interface SeedPhraseDisplayOptions {
    seedPhrase: string
    showNumbers?: boolean
    allowCopy?: boolean
    gridCols?: number
    className?: string
    onCopy?: () => void
}

export class SeedPhraseDisplay {
    private container: HTMLElement
    private options: SeedPhraseDisplayOptions

    constructor(container: HTMLElement, options: SeedPhraseDisplayOptions) {
        this.container = container
        this.options = {
            showNumbers: true,
            allowCopy: true,
            gridCols: 3,
            className: 'seed-phrase-display',
            ...options
        }
    }

    /**
     * Render the seed phrase display
     */
    render(): void {
        if (!this.options.seedPhrase) {
            console.error('❌ SeedPhraseDisplay: No seed phrase provided')
            return
        }

        const words = this.options.seedPhrase.split(' ').filter(word => word.length > 0)
        if (words.length === 0) {
            console.error('❌ SeedPhraseDisplay: Seed phrase is empty')
            return
        }

        const { gridCols = 3, showNumbers = true, allowCopy = true, className = 'seed-phrase-display' } = this.options

        // Calculate optimal grid layout
        const totalWords = words.length
        const rows = Math.ceil(totalWords / gridCols)

        this.container.innerHTML = `
            <div class="${className}">
                ${allowCopy ? this.renderCopySection() : ''}
                
                <div class="seed-phrase-grid" style="
                    display: grid;
                    grid-template-columns: repeat(${gridCols}, 1fr);
                    grid-template-rows: repeat(${rows}, 1fr);
                    gap: 12px;
                    padding: 20px;
                    background: var(--bg-secondary);
                    border-radius: var(--border-radius);
                    border: 2px solid var(--warning);
                    margin: 16px 0;
                ">
                    ${words.map((word, index) => this.renderSeedWord(word, index + 1, showNumbers)).join('')}
                </div>

                ${this.renderSecurityNotice()}
            </div>
        `

        if (allowCopy) {
            this.setupCopyFunctionality()
        }
    }

    /**
     * Render individual seed word
     */
    private renderSeedWord(word: string, number: number, showNumber: boolean): string {
        return `
            <div class="seed-word-item" style="
                display: flex;
                align-items: center;
                padding: 8px 12px;
                background: var(--bg-input);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                transition: all 0.2s;
                cursor: default;
                user-select: text;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 14px;
            ">
                ${showNumber ? `
                    <span class="word-number" style="
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 24px;
                        height: 24px;
                        background: var(--accent-primary);
                        color: var(--bg-primary);
                        border-radius: 50%;
                        font-size: 12px;
                        font-weight: bold;
                        margin-right: 8px;
                        flex-shrink: 0;
                    ">${number}</span>
                ` : ''}
                <span class="word-text" style="
                    flex: 1;
                    color: var(--text-primary);
                    font-weight: 500;
                ">${word}</span>
            </div>
        `
    }

    /**
     * Render copy section
     */
    private renderCopySection(): string {
        return `
            <div class="seed-phrase-actions" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            ">
                <h4 style="margin: 0; color: var(--text-primary);">
                    Your Recovery Phrase
                </h4>
                <button id="copySeedPhraseBtn" class="btn btn-secondary" style="
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                    padding: 6px 12px;
                " title="Copy to clipboard">
                    <span class="copy-icon">📋</span>
                    <span class="copy-text">Copy</span>
                </button>
            </div>
        `
    }

    /**
     * Render security notice
     */
    private renderSecurityNotice(): string {
        return `
            <div class="seed-phrase-security-notice" style="
                margin-top: 16px;
                padding: 12px;
                background: rgba(255, 170, 0, 0.1);
                border: 1px solid var(--warning);
                border-radius: 6px;
                font-size: 13px;
                line-height: 1.5;
            ">
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <span style="font-size: 16px;">⚠️</span>
                    <div>
                        <p style="margin: 0 0 8px 0; font-weight: bold; color: var(--warning);">
                            Security Warning
                        </p>
                        <ul style="margin: 0; padding-left: 16px; color: var(--text-secondary);">
                            <li>Write down these words in the exact order shown</li>
                            <li>Store them in a safe, offline location</li>
                            <li>Never share your recovery phrase with anyone</li>
                            <li>Anyone with these words can access your wallet</li>
                        </ul>
                    </div>
                </div>
            </div>
        `
    }

    /**
     * Setup copy functionality
     */
    private setupCopyFunctionality(): void {
        const copyBtn = this.container.querySelector('#copySeedPhraseBtn') as HTMLButtonElement
        if (!copyBtn) return

        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(this.options.seedPhrase)
                
                // Update button appearance
                const copyIcon = copyBtn.querySelector('.copy-icon')
                const copyText = copyBtn.querySelector('.copy-text')
                
                if (copyIcon && copyText) {
                    copyIcon.textContent = '✅'
                    copyText.textContent = 'Copied!'
                    copyBtn.style.background = 'var(--success)'
                    copyBtn.style.color = 'var(--bg-primary)'
                    
                    setTimeout(() => {
                        copyIcon.textContent = '📋'
                        copyText.textContent = 'Copy'
                        copyBtn.style.background = ''
                        copyBtn.style.color = ''
                    }, 2000)
                }

                // Call callback if provided
                if (this.options.onCopy) {
                    this.options.onCopy()
                }
            } catch (error) {
                console.error('Failed to copy seed phrase:', error)
                
                // Show error state
                const copyText = copyBtn.querySelector('.copy-text')
                if (copyText) {
                    copyText.textContent = 'Failed'
                    copyBtn.style.background = 'var(--error)'
                    copyBtn.style.color = 'white'
                    
                    setTimeout(() => {
                        copyText.textContent = 'Copy'
                        copyBtn.style.background = ''
                        copyBtn.style.color = ''
                    }, 2000)
                }
            }
        })
    }

    /**
     * Update the displayed seed phrase
     */
    updateSeedPhrase(seedPhrase: string): void {
        this.options.seedPhrase = seedPhrase
        this.render()
    }

    /**
     * Get optimal grid columns for word count
     */
    static getOptimalColumns(wordCount: number): number {
        switch (wordCount) {
            case 12: return 3  // 3x4 grid
            case 15: return 3  // 3x5 grid
            case 18: return 3  // 3x6 grid
            case 21: return 3  // 3x7 grid
            case 24: return 4  // 4x6 grid
            default: return 3  // Default 3 columns
        }
    }

    /**
     * Create a seed phrase display with automatic optimal layout
     */
    static createOptimalDisplay(container: HTMLElement, seedPhrase: string, options: Partial<SeedPhraseDisplayOptions> = {}): SeedPhraseDisplay {
        const words = seedPhrase.split(' ').filter(word => word.length > 0)
        const optimalCols = SeedPhraseDisplay.getOptimalColumns(words.length)
        
        return new SeedPhraseDisplay(container, {
            seedPhrase,
            gridCols: optimalCols,
            ...options
        })
    }

    /**
     * Destroy the component
     */
    destroy(): void {
        this.container.innerHTML = ''
    }
}