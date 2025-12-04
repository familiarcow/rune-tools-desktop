/**
 * Tools Tab Component (TypeScript)
 * 
 * Displays rune.tools website in an iframe.
 * Implements the standard tab interface for context management.
 */

export class WebsiteTab {
    private container: HTMLElement
    private services: any
    private currentWallet: any = null
    private currentNetwork: 'mainnet' | 'stagenet' = 'mainnet'
    private isLoading: boolean = false
    private initialized: boolean = false

    constructor(container: HTMLElement, services: any) {
        this.container = container
        this.services = services
    }

    async initialize(wallet: any, network: 'mainnet' | 'stagenet'): Promise<void> {
        try {
            console.log('🚀 Initializing Tools Tab...')
            
            this.currentWallet = wallet
            this.currentNetwork = network
            
            // Render initial UI
            this.render()
            
            this.initialized = true
            console.log('✅ Tools Tab initialized')
            
        } catch (error) {
            console.error('❌ Failed to initialize Tools Tab:', error)
            this.renderError('Failed to initialize tools tab')
        }
    }

    private render(): void {
        if (!this.container) return
        
        this.container.innerHTML = `
            <div class="website-tab-container">
                <div class="website-tab-iframe-wrapper">
                    <iframe 
                        id="websiteIframe"
                        class="website-tab-iframe"
                        src="https://rune.tools?source=desktop-app"
                        title="Rune Tools"
                        frameborder="0"
                        allowfullscreen>
                    </iframe>
                </div>
            </div>
        `
        
        this.attachEventListeners()
        this.addComponentStyles()
    }

    private addComponentStyles(): void {
        // Check if styles already exist to avoid duplicates
        if (document.getElementById('website-tab-styles')) return
        
        const style = document.createElement('style')
        style.id = 'website-tab-styles'
        style.textContent = `
            .website-tab-container {
                height: 100%;
                width: 100%;
                padding: 0;
                display: flex;
                flex-direction: column;
                position: relative;
            }
            
            .website-tab-iframe-wrapper {
                flex: 1;
                width: 100%;
                height: 100%;
                min-height: calc(100vh - 200px);
                position: relative;
                overflow: hidden;
            }
            
            .website-tab-iframe {
                width: 100%;
                height: 100%;
                min-height: calc(100vh - 200px);
                border: none;
                background: var(--bg-card);
                border-radius: var(--border-radius);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                display: block;
            }
            
            .website-tab-loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: var(--text-secondary);
                font-size: 16px;
            }
            
            .website-tab-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: var(--text-secondary);
                text-align: center;
            }
            
            .website-tab-error-icon {
                font-size: 3rem;
                margin-bottom: var(--spacing-md);
            }
        `
        document.head.appendChild(style)
    }

    private renderError(message: string): void {
        if (!this.container) return
        
        this.container.innerHTML = `
            <div class="website-tab-container">
                <div class="website-tab-error">
                    <div class="website-tab-error-icon">❌</div>
                    <h3>Error Loading Tools</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="this.render()">
                        Retry
                    </button>
                </div>
            </div>
        `
    }

    private attachEventListeners(): void {
        const iframe = this.container.querySelector('#websiteIframe') as HTMLIFrameElement
        if (iframe) {
            // Show loading indicator while iframe loads
            this.showLoadingState()
            
            iframe.addEventListener('load', () => {
                this.hideLoadingState()
                console.log('✅ Website iframe loaded successfully')
            })
            
            iframe.addEventListener('error', () => {
                this.hideLoadingState()
                console.error('❌ Failed to load website iframe')
                this.renderError('Failed to load rune.tools website')
            })
        }
    }

    private showLoadingState(): void {
        const wrapper = this.container.querySelector('.website-tab-iframe-wrapper')
        if (wrapper) {
            const loadingDiv = document.createElement('div')
            loadingDiv.className = 'website-tab-loading'
            loadingDiv.id = 'websiteLoading'
            loadingDiv.textContent = 'Loading tools...'
            wrapper.appendChild(loadingDiv)
        }
    }

    private hideLoadingState(): void {
        const loadingDiv = this.container.querySelector('#websiteLoading')
        if (loadingDiv) {
            loadingDiv.remove()
        }
    }

    // Standard Tab Interface Implementation

    async updateContext(wallet: any, network: 'mainnet' | 'stagenet'): Promise<void> {
        try {
            console.log('🔄 Updating Tools Tab context...')
            
            this.currentWallet = wallet
            this.currentNetwork = network
            
            // Tools tab doesn't need to update based on wallet/network changes
            // but we track the context for consistency
            
            console.log('✅ Tools Tab context updated')
            
        } catch (error) {
            console.error('❌ Failed to update Tools Tab context:', error)
        }
    }

    async updateWallet(newWallet: any, currentNetwork: 'mainnet' | 'stagenet'): Promise<void> {
        await this.updateContext(newWallet, currentNetwork)
    }

    async updateNetwork(newNetwork: 'mainnet' | 'stagenet', currentWallet: any): Promise<void> {
        await this.updateContext(currentWallet, newNetwork)
    }

    async refresh(): Promise<void> {
        // Refresh the iframe by reloading it
        const iframe = this.container.querySelector('#websiteIframe') as HTMLIFrameElement
        if (iframe) {
            this.showLoadingState()
            iframe.src = iframe.src // This triggers a reload
        }
    }

    async onActivated(): Promise<void> {
        // Tab became active
        console.log('🛠️ Tools Tab activated')
    }

    getNetworkRequirements(): string[] {
        return ['mainnet', 'stagenet'] // Works on both networks
    }

    validateRequirements(wallet: any, network: string): boolean {
        return true // Tools tab doesn't require wallet or specific network
    }

    isInitialized(): boolean {
        return this.initialized
    }

    getState(): any {
        return {
            wallet: this.currentWallet,
            network: this.currentNetwork,
            isLoading: this.isLoading
        }
    }

    setState(newState: any): void {
        Object.assign(this, newState)
    }

    cleanup(): void {
        // Remove component styles when cleaning up
        const styles = document.getElementById('website-tab-styles')
        if (styles) {
            styles.remove()
        }
        
        if (this.container) {
            this.container.innerHTML = ''
        }
        
        console.log('🧹 Tools Tab cleanup completed')
    }
}