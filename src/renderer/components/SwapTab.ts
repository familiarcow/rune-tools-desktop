/**
 * Swap Tab Component
 * 
 * Implements the swap interface as specified in docs/Swaps.md:
 * - From/To asset selectors
 * - Amount input with USD conversion
 * - Advanced options (asset type, slippage, streaming)
 * - Quote fetching and display
 * - Integration with SendTransaction modal
 */

import { BackendService } from '../services/BackendService';
import { SendTransaction, SendTransactionData, AssetBalance as SendAssetBalance } from './SendTransaction';
import { SwapService, SwapAsset, ToAsset, AssetType, SwapParams, SwapQuoteDisplay } from '../../services/swapService';

export interface SwapTabData {
    walletId: string;
    name: string;
    address: string;
    network: 'mainnet' | 'stagenet';
}

export class SwapTab {
    private container: HTMLElement;
    private backend: BackendService;
    private swapService: SwapService;
    private walletData: SwapTabData | null = null;
    private sendTransaction: SendTransaction | null = null;

    // UI State
    private fromAssets: SwapAsset[] = [];
    private toAssets: ToAsset[] = [];
    private selectedFromAsset: string = '';
    private selectedToAsset: string = '';
    private currentQuote: SwapQuoteDisplay | null = null;
    private advancedOptionsExpanded: boolean = false;

    constructor(container: HTMLElement, backend: BackendService) {
        this.container = container;
        this.backend = backend;
        this.swapService = new SwapService(backend);
    }

    async initialize(wallet: any, network: 'mainnet' | 'stagenet'): Promise<void> {
        try {
            console.log('🔄 Initializing SwapTab...', { wallet: wallet.name, network });
            
            // Set the network in SwapService
            this.swapService.setNetwork(network);
            
            this.walletData = {
                walletId: wallet.walletId,
                name: wallet.name,
                address: network === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress,
                network
            };

            this.render();
            await this.loadSwapData();
            
            console.log('✅ SwapTab initialized');
        } catch (error) {
            console.error('❌ Failed to initialize SwapTab:', error);
            throw error;
        }
    }

    private render(): void {
        if (!this.walletData) return;

        this.container.innerHTML = `
            <div class="swap-tab">
                <!-- Swap Header -->
                <div class="swap-header">
                    <h3>💱 Swap Assets</h3>
                    <p class="swap-description">Trade your THOR native, secured, and trade assets</p>
                </div>

                <!-- Swap Form -->
                <div class="swap-form">
                    <!-- From Asset and Amount Section (same line) -->
                    <div class="swap-section">
                        <div class="from-amount-row">
                            <div class="from-asset-column">
                                <label class="swap-label">From Asset</label>
                                <div class="asset-selector-container">
                                    <select class="asset-selector" id="from-asset-selector">
                                        <option value="">Select asset to swap</option>
                                    </select>
                                    <div class="asset-balance" id="from-asset-balance">
                                        Balance: -
                                    </div>
                                </div>
                            </div>
                            <div class="amount-column">
                                <label class="swap-label">Amount</label>
                                <div class="amount-input-container">
                                    <div class="amount-input-wrapper">
                                        <input type="number" class="amount-input" id="amount-input" placeholder="0.00" step="any" min="0">
                                        <button type="button" class="max-btn" id="max-btn" disabled>MAX</button>
                                    </div>
                                    <div class="amount-usd" id="amount-usd">$0.00</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Swap Direction Arrow -->
                    <div class="swap-arrow">
                        <div class="arrow-icon">↓</div>
                    </div>

                    <!-- To Asset Section -->
                    <div class="swap-section">
                        <label class="swap-label">To Asset</label>
                        <div class="asset-selector-container">
                            <select class="asset-selector" id="to-asset-selector">
                                <option value="">Select destination asset</option>
                            </select>
                        </div>
                    </div>

                    <!-- Advanced Options -->
                    <div class="advanced-options">
                        <div class="advanced-header" id="advanced-header">
                            <span class="advanced-toggle" id="advanced-toggle">▶</span>
                            <span>Advanced Options</span>
                        </div>
                        <div class="advanced-content" id="advanced-content" style="display: none;">
                            <!-- Recipient Address (for Native type) - Full Width - TOP POSITION -->
                            <div class="advanced-field" id="recipient-address-field" style="display: none;">
                                <label class="advanced-label">Recipient Address</label>
                                <input type="text" class="advanced-input" id="recipient-address" placeholder="Enter recipient address">
                            </div>

                            <!-- First Row: Asset Type and Slippage -->
                            <div class="advanced-row">
                                <div class="advanced-field-inline">
                                    <label class="advanced-label">Asset Type</label>
                                    <select class="advanced-input-compact" id="asset-type-selector">
                                        <option value="secured">Secured</option>
                                        <option value="trade">Trade</option>
                                        <option value="native">Native</option>
                                    </select>
                                </div>
                                <div class="advanced-field-inline">
                                    <label class="advanced-label">Slippage (%)</label>
                                    <input type="number" class="advanced-input-compact" id="slippage-tolerance" value="1" step="0.1" min="0.1" max="10">
                                </div>
                            </div>

                            <!-- Second Row: Streaming Options -->
                            <div class="advanced-row">
                                <div class="advanced-field-inline">
                                    <label class="advanced-label">Streaming Quantity</label>
                                    <input type="number" class="advanced-input-compact" id="streaming-quantity" value="0" min="0">
                                </div>
                                <div class="advanced-field-inline">
                                    <label class="advanced-label">Streaming Interval</label>
                                    <input type="number" class="advanced-input-compact" id="streaming-interval" value="1" min="1">
                                </div>
                            </div>

                            <!-- Custom Refund Address - Full Width -->
                            <div class="advanced-field">
                                <label class="advanced-label">Custom Refund Address</label>
                                <input type="text" class="advanced-input" id="custom-refund-address" placeholder="Optional refund address">
                            </div>
                        </div>
                    </div>

                    <!-- Get Quote Button -->
                    <button class="btn btn-primary btn-large" id="get-quote-btn" disabled>
                        Get Quote
                    </button>

                    <!-- Quote Display -->
                    <div class="quote-section" id="quote-section" style="display: none;">
                        <div class="quote-header">
                            <h4>💰 Swap Quote</h4>
                        </div>
                        <div class="quote-details" id="quote-details">
                            <!-- Quote content will be populated here -->
                        </div>
                        <button class="btn btn-success btn-large" id="continue-btn">
                            Continue to Transaction
                        </button>
                    </div>

                    <!-- Error Display -->
                    <div class="error-section" id="error-section" style="display: none;">
                        <div class="error-message" id="error-message"></div>
                    </div>

                    <!-- Loading States -->
                    <div class="loading-section" id="loading-section" style="display: none;">
                        <div class="loading-message">
                            <span class="loading-spinner">🔄</span>
                            <span id="loading-text">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // From asset selector
        const fromSelector = this.container.querySelector('#from-asset-selector') as HTMLSelectElement;
        if (fromSelector) {
            fromSelector.addEventListener('change', (e) => this.onFromAssetChange((e.target as HTMLSelectElement).value));
        }

        // To asset selector
        const toSelector = this.container.querySelector('#to-asset-selector') as HTMLSelectElement;
        if (toSelector) {
            toSelector.addEventListener('change', (e) => this.onToAssetChange((e.target as HTMLSelectElement).value));
        }

        // Amount input
        const amountInput = this.container.querySelector('#amount-input') as HTMLInputElement;
        if (amountInput) {
            amountInput.addEventListener('input', (e) => this.onAmountChange((e.target as HTMLInputElement).value));
        }

        // Advanced options toggle
        const advancedHeader = this.container.querySelector('#advanced-header');
        if (advancedHeader) {
            advancedHeader.addEventListener('click', () => this.toggleAdvancedOptions());
        }

        // Asset type selector
        const assetTypeSelector = this.container.querySelector('#asset-type-selector') as HTMLSelectElement;
        if (assetTypeSelector) {
            assetTypeSelector.addEventListener('change', (e) => this.onAssetTypeChange((e.target as HTMLSelectElement).value as AssetType));
        }

        // Get quote button
        const getQuoteBtn = this.container.querySelector('#get-quote-btn');
        if (getQuoteBtn) {
            getQuoteBtn.addEventListener('click', () => this.getQuote());
        }

        // Continue button
        const continueBtn = this.container.querySelector('#continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.continueToTransaction());
        }

        // Max button
        const maxBtn = this.container.querySelector('#max-btn');
        if (maxBtn) {
            maxBtn.addEventListener('click', () => this.onMaxButtonClick());
        }

        // Form validation on input changes
        this.container.addEventListener('input', () => this.validateForm());
    }

    private async loadSwapData(): Promise<void> {
        try {
            if (!this.walletData) return;

            this.showLoading('Loading available assets...');

            // Load from and to assets
            const [fromAssets, toAssets] = await Promise.all([
                this.swapService.getFromAssets(this.walletData.address),
                this.swapService.getToAssets()
            ]);

            this.fromAssets = fromAssets;
            this.toAssets = toAssets;

            this.populateFromAssetSelector();
            this.populateToAssetSelector();

            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Failed to load swap data:', error);
            this.showError('Failed to load swap data: ' + (error as Error).message);
        }
    }

    private populateFromAssetSelector(): void {
        const selector = this.container.querySelector('#from-asset-selector') as HTMLSelectElement;
        if (!selector) return;

        // Clear existing options except first
        selector.innerHTML = '<option value="">Select asset to swap</option>';

        // Add assets ordered by USD value
        this.fromAssets.forEach(asset => {
            const option = document.createElement('option');
            option.value = asset.asset;
            option.textContent = `${asset.asset} (${this.formatBalance(asset.balance)} - ${this.formatUsd(asset.usdValue)})`;
            selector.appendChild(option);
        });
    }

    private populateToAssetSelector(): void {
        const selector = this.container.querySelector('#to-asset-selector') as HTMLSelectElement;
        if (!selector) return;

        // Get current asset type
        const assetTypeSelector = this.container.querySelector('#asset-type-selector') as HTMLSelectElement;
        const assetType = assetTypeSelector?.value as AssetType || 'secured';

        // Clear existing options except first
        selector.innerHTML = '<option value="">Select destination asset</option>';

        // Add assets ordered by balance_rune, formatted for the selected asset type
        this.toAssets.forEach(asset => {
            const option = document.createElement('option');
            option.value = asset.asset;
            option.textContent = this.formatToAssetDisplay(asset.asset, assetType);
            selector.appendChild(option);
        });
    }

    private formatToAssetDisplay(asset: string, assetType: AssetType): string {
        // Don't change THOR assets - they stay as THOR.RUNE, etc.
        if (asset.startsWith('THOR.')) {
            return asset;
        }

        // Format other assets based on type
        if (assetType === 'secured') {
            return asset.replace(/\./g, '-');
        } else if (assetType === 'trade') {
            return asset.replace(/\./g, '~');
        } else {
            // Native type - keep original format
            return asset;
        }
    }

    private onFromAssetChange(asset: string): void {
        this.selectedFromAsset = asset;
        
        if (asset) {
            const selectedAsset = this.fromAssets.find(a => a.asset === asset);
            this.updateFromAssetBalance(selectedAsset);
        } else {
            this.updateFromAssetBalance(null);
        }

        // Update Max button state
        this.updateMaxButtonState();

        this.validateForm();
        this.hideQuote();
    }

    private onToAssetChange(asset: string): void {
        this.selectedToAsset = asset;
        
        // Check if any THOR asset is selected - force asset type to native
        if (asset.startsWith('THOR.')) {
            const assetTypeSelector = this.container.querySelector('#asset-type-selector') as HTMLSelectElement;
            if (assetTypeSelector) {
                assetTypeSelector.value = 'native';
                this.onAssetTypeChange('native');
            }
        }

        // Update recipient address field based on current asset type selection
        const currentAssetType = (this.container.querySelector('#asset-type-selector') as HTMLSelectElement)?.value as AssetType || 'secured';
        this.updateRecipientAddressField(currentAssetType);

        this.validateForm();
        this.hideQuote();
    }

    private onAmountChange(amount: string): void {
        this.updateAmountUsd(amount);
        this.validateForm();
        this.hideQuote();
    }

    private onAssetTypeChange(assetType: AssetType): void {
        this.updateRecipientAddressField(assetType);
        // Refresh the to_asset selector to show assets in the new format
        this.populateToAssetSelector();
        // Preserve the current selection if possible
        if (this.selectedToAsset) {
            const selector = this.container.querySelector('#to-asset-selector') as HTMLSelectElement;
            if (selector) {
                selector.value = this.selectedToAsset;
            }
        }
        this.hideQuote();
    }

    private updateFromAssetBalance(asset: SwapAsset | null | undefined): void {
        const balanceEl = this.container.querySelector('#from-asset-balance');
        if (!balanceEl) return;

        if (asset) {
            balanceEl.textContent = `Balance: ${this.formatBalance(asset.balance)} ${asset.asset} (${this.formatUsd(asset.usdValue)})`;
        } else {
            balanceEl.textContent = 'Balance: -';
        }
    }

    private async updateAmountUsd(amount: string): Promise<void> {
        const usdEl = this.container.querySelector('#amount-usd');
        if (!usdEl) return;

        if (!amount || !this.selectedFromAsset || parseFloat(amount) <= 0) {
            usdEl.textContent = '$0.00';
            return;
        }

        try {
            const usdValue = await this.swapService.calculateUsdValue(this.selectedFromAsset, amount);
            usdEl.textContent = this.formatUsd(usdValue);
        } catch (error) {
            console.warn('Failed to calculate USD value:', error);
            usdEl.textContent = '$0.00';
        }
    }

    private updateRecipientAddressField(assetType: AssetType): void {
        const recipientField = this.container.querySelector('#recipient-address-field') as HTMLElement;
        if (!recipientField) return;

        // If to_asset is a THOR asset, always hide the recipient field (uses user's THOR address)
        if (this.selectedToAsset.startsWith('THOR.')) {
            recipientField.style.display = 'none';
        } else if (assetType === 'native') {
            // For non-THOR native assets, show the recipient field
            recipientField.style.display = 'block';
        } else {
            // For secured/trade assets, hide the recipient field
            recipientField.style.display = 'none';
        }
    }

    private updateMaxButtonState(): void {
        const maxBtn = this.container.querySelector('#max-btn') as HTMLButtonElement;
        if (!maxBtn) return;

        // Enable Max button only if an asset is selected
        maxBtn.disabled = !this.selectedFromAsset;
    }

    private onMaxButtonClick(): void {
        if (!this.selectedFromAsset) return;

        const selectedAsset = this.fromAssets.find(a => a.asset === this.selectedFromAsset);
        if (!selectedAsset) return;

        let maxAmount = parseFloat(selectedAsset.balance);
        
        // If it's THOR.RUNE, subtract 0.02 for gas
        if (this.selectedFromAsset === 'THOR.RUNE') {
            maxAmount = Math.max(0, maxAmount - 0.02);
        }

        // Update the amount input
        const amountInput = this.container.querySelector('#amount-input') as HTMLInputElement;
        if (amountInput) {
            amountInput.value = maxAmount.toString();
            // Trigger the amount change event to update USD value
            this.onAmountChange(maxAmount.toString());
        }
    }

    private toggleAdvancedOptions(): void {
        this.advancedOptionsExpanded = !this.advancedOptionsExpanded;
        
        const toggleIcon = this.container.querySelector('#advanced-toggle');
        const content = this.container.querySelector('#advanced-content') as HTMLElement;
        
        if (toggleIcon && content) {
            toggleIcon.textContent = this.advancedOptionsExpanded ? '▼' : '▶';
            content.style.display = this.advancedOptionsExpanded ? 'block' : 'none';
        }
    }

    private validateForm(): void {
        const getQuoteBtn = this.container.querySelector('#get-quote-btn') as HTMLButtonElement;
        if (!getQuoteBtn) return;

        const isValid = this.selectedFromAsset && 
                       this.selectedToAsset && 
                       this.getAmountValue() > 0;

        getQuoteBtn.disabled = !isValid;
    }

    private getAmountValue(): number {
        const amountInput = this.container.querySelector('#amount-input') as HTMLInputElement;
        return amountInput ? parseFloat(amountInput.value) || 0 : 0;
    }

    private async getQuote(): Promise<void> {
        try {
            if (!this.walletData) return;

            this.showLoading('Getting swap quote...');
            this.hideError();

            const swapParams = this.buildSwapParams();
            const quote = await this.swapService.getSwapQuote(swapParams, this.walletData.address);
            
            this.currentQuote = quote;
            this.displayQuote(quote);
            this.hideLoading();

        } catch (error) {
            console.error('❌ Failed to get quote:', error);
            this.showError('Failed to get quote: ' + (error as Error).message);
            this.hideLoading();
        }
    }

    private buildSwapParams(): SwapParams {
        const amountInput = this.container.querySelector('#amount-input') as HTMLInputElement;
        const assetTypeSelector = this.container.querySelector('#asset-type-selector') as HTMLSelectElement;
        const recipientInput = this.container.querySelector('#recipient-address') as HTMLInputElement;
        const slippageInput = this.container.querySelector('#slippage-tolerance') as HTMLInputElement;
        const streamingQuantityInput = this.container.querySelector('#streaming-quantity') as HTMLInputElement;
        const streamingIntervalInput = this.container.querySelector('#streaming-interval') as HTMLInputElement;
        const refundAddressInput = this.container.querySelector('#custom-refund-address') as HTMLInputElement;

        return {
            fromAsset: this.selectedFromAsset,
            toAsset: this.selectedToAsset,
            amount: amountInput?.value || '0',
            assetType: (assetTypeSelector?.value || 'secured') as AssetType,
            recipientAddress: recipientInput?.value || undefined,
            liquidityToleranceBps: Math.floor((parseFloat(slippageInput?.value || '1') * 100)),
            streamingQuantity: parseInt(streamingQuantityInput?.value || '0'),
            streamingInterval: parseInt(streamingIntervalInput?.value || '1'),
            customRefundAddress: refundAddressInput?.value || undefined
        };
    }

    private displayQuote(quote: SwapQuoteDisplay): void {
        const quoteSection = this.container.querySelector('#quote-section') as HTMLElement;
        const quoteDetails = this.container.querySelector('#quote-details');
        
        if (!quoteSection || !quoteDetails) return;

        quoteDetails.innerHTML = `
            <div class="quote-main-row">
                <div class="quote-input">
                    <span class="quote-label">Input</span>
                    <span class="quote-value">${quote.inputAmount} ${this.selectedFromAsset}</span>
                </div>
                <div class="quote-arrow">→</div>
                <div class="quote-output">
                    <span class="quote-label">You will receive</span>
                    <span class="quote-value-large">${quote.outputAmount} ${quote.outputAsset}</span>
                </div>
            </div>
            <div class="quote-details-row">
                <div class="quote-detail-item">
                    <span class="quote-detail-label">To Address</span>
                    <span class="quote-detail-value">${this.formatAddress(quote.toAddress)}</span>
                </div>
                <div class="quote-detail-item">
                    <span class="quote-detail-label">Swap Time</span>
                    <span class="quote-detail-value">${quote.swapTimeSeconds}s</span>
                </div>
                <div class="quote-detail-item">
                    <span class="quote-detail-label">Total Fees</span>
                    <span class="quote-detail-value">${quote.totalFeesPercent}%</span>
                </div>
            </div>
        `;

        quoteSection.style.display = 'block';
    }

    private async continueToTransaction(): Promise<void> {
        try {
            if (!this.currentQuote || !this.walletData) {
                this.showError('No quote available');
                return;
            }

            console.log('📤 Opening Send transaction for swap');

            // Use global overlay container for popup
            const dialogContainer = document.getElementById('global-overlay-container');
            if (!dialogContainer) {
                console.error('Global overlay container not found');
                return;
            }

            // Initialize SendTransaction component if not exists
            if (!this.sendTransaction) {
                this.sendTransaction = new SendTransaction(dialogContainer, this.backend);
            }

            // Get wallet balances for SendTransaction (reuse existing logic)
            const fromAsset = this.fromAssets.find(a => a.asset === this.selectedFromAsset);
            const sendBalances: SendAssetBalance[] = fromAsset ? [{
                asset: fromAsset.asset,
                balance: fromAsset.balance,
                usdValue: fromAsset.usdValue.toString()
            }] : [];

            // Prepare wallet data for send dialog
            const sendWalletData: SendTransactionData = {
                walletId: this.walletData.walletId,
                name: this.walletData.name,
                currentAddress: this.walletData.address,
                network: this.walletData.network,
                availableBalances: sendBalances
            };

            // Pre-populated transaction data for MsgDeposit
            const prePopulatedData = {
                transactionType: 'deposit',
                asset: this.selectedFromAsset,
                amount: this.currentQuote.inputAmount,
                memo: this.currentQuote.quote.memo,
                skipToConfirmation: true // Skip to password confirmation step
            };

            // Show the send dialog with pre-populated data
            await this.sendTransaction.initialize(sendWalletData, () => {
                console.log('📝 Swap transaction dialog closed');
                // Could refresh data here if needed
            }, prePopulatedData);

        } catch (error) {
            console.error('❌ Failed to open transaction dialog:', error);
            this.showError('Failed to open transaction dialog: ' + (error as Error).message);
        }
    }

    private hideQuote(): void {
        const quoteSection = this.container.querySelector('#quote-section') as HTMLElement;
        if (quoteSection) {
            quoteSection.style.display = 'none';
        }
        this.currentQuote = null;
    }

    private showLoading(message: string): void {
        const loadingSection = this.container.querySelector('#loading-section') as HTMLElement;
        const loadingText = this.container.querySelector('#loading-text');
        
        if (loadingSection && loadingText) {
            loadingText.textContent = message;
            loadingSection.style.display = 'block';
        }
    }

    private hideLoading(): void {
        const loadingSection = this.container.querySelector('#loading-section') as HTMLElement;
        if (loadingSection) {
            loadingSection.style.display = 'none';
        }
    }

    private showError(message: string): void {
        const errorSection = this.container.querySelector('#error-section') as HTMLElement;
        const errorMessage = this.container.querySelector('#error-message');
        
        if (errorSection && errorMessage) {
            errorMessage.textContent = message;
            errorSection.style.display = 'block';
        }
    }

    private hideError(): void {
        const errorSection = this.container.querySelector('#error-section') as HTMLElement;
        if (errorSection) {
            errorSection.style.display = 'none';
        }
    }

    // Utility methods
    private formatAddress(address: string): string {
        if (!address) return 'Unknown Address';
        return `${address.slice(0, 10)}...${address.slice(-6)}`;
    }

    private formatUsd(value: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value);
    }

    private formatBalance(balance: string): string {
        const num = parseFloat(balance);
        if (isNaN(num)) return '0.00';
        return num.toFixed(6).replace(/\.?0+$/, '');
    }

    // Public methods
    async refreshData(): Promise<void> {
        await this.loadSwapData();
    }

    async updateNetwork(network: 'mainnet' | 'stagenet'): Promise<void> {
        if (!this.walletData) return;
        
        console.log('🔄 SwapTab updating network to:', network);
        
        // Update network in SwapService
        this.swapService.setNetwork(network);
        
        this.walletData.network = network;
        
        // Clear current state
        this.fromAssets = [];
        this.toAssets = [];
        this.selectedFromAsset = '';
        this.selectedToAsset = '';
        this.hideQuote();
        
        // Reload data with new network
        await this.refreshData();
        
        console.log('✅ SwapTab network updated to:', network);
    }

    updateWalletAddress(wallet: any, network: 'mainnet' | 'stagenet'): void {
        if (!this.walletData) return;

        const newAddress = network === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress;
        this.walletData.address = newAddress;
        this.walletData.network = network;

        console.log(`SwapTab address updated for ${network}:`, newAddress);
    }
}