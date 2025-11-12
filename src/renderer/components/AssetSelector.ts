/**
 * AssetSelector Component
 * 
 * A professional, reusable asset selection component that replaces basic HTML dropdowns
 * with a visually rich interface featuring asset logos, pricing, balances, and search.
 * 
 * Features:
 * - Three display modes: name-only, user-balances, asset-prices
 * - Search functionality with real-time filtering
 * - Keyboard navigation support
 * - Professional styling with animations
 * - Error handling for missing images
 * - Full accessibility compliance
 */

import { AssetService } from '../../services/assetService';
import { AssetDisplayName } from '../../utils/assetUtils';

export interface AssetSelectorOption {
  asset: string;           // "THOR.RUNE", "BTC.BTC", etc.
  displayName?: string;    // Optional override (defaults to AssetDisplayName())
  balance?: string;        // User's balance for this asset
  usdValue?: number;       // Total USD value of user's balance
  assetPrice?: number;     // USD price per unit of asset
  disabled?: boolean;      // Disable selection of this option
}

export type AssetSelectorDisplayMode = 'name-only' | 'user-balances' | 'asset-prices';

export interface AssetSelectorConfig {
  id: string;                    // Unique component ID
  placeholder?: string;          // Placeholder text
  displayMode: AssetSelectorDisplayMode; // Display mode
  searchable?: boolean;          // Enable search functionality
  maxHeight?: string;            // Max dropdown height
  onSelectionChange?: (asset: string | null) => void; // Selection callback
}

export class AssetSelector {
  private container: HTMLElement;
  private config: AssetSelectorConfig;
  private options: AssetSelectorOption[] = [];
  private filteredOptions: AssetSelectorOption[] = [];
  private selectedAsset: string | null = null;
  private isOpen: boolean = false;
  private searchTerm: string = '';
  
  // DOM elements
  private triggerElement: HTMLElement | null = null;
  private dropdownElement: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private optionsContainer: HTMLElement | null = null;

  constructor(container: HTMLElement, config: AssetSelectorConfig) {
    this.container = container;
    this.config = {
      placeholder: 'Select asset...',
      searchable: true,
      maxHeight: '300px',
      ...config
    };
  }

  /**
   * Initialize the component with asset options
   */
  async initialize(options: AssetSelectorOption[]): Promise<void> {
    console.log('🎨 AssetSelector: Initializing with', options.length, 'options');
    
    this.options = options;
    this.filteredOptions = [...options];
    
    this.render();
    this.setupEventListeners();
    
    console.log('✅ AssetSelector: Initialized successfully');
  }

  /**
   * Render the component DOM structure
   */
  private render(): void {
    const selectedOption = this.options.find(opt => opt.asset === this.selectedAsset);
    const displayText = selectedOption ? this.formatOptionDisplay(selectedOption, true) : this.config.placeholder;
    
    this.container.innerHTML = `
      <div class="asset-selector" id="${this.config.id}">
        <div class="asset-selector-trigger" tabindex="0" role="button" aria-haspopup="listbox" aria-expanded="false">
          ${selectedOption ? this.renderSelectedOption(selectedOption) : `<span class="placeholder">${displayText}</span>`}
          <span class="dropdown-arrow">▼</span>
        </div>
        <div class="asset-selector-dropdown" style="display: none; max-height: ${this.config.maxHeight};">
          ${this.config.searchable ? this.renderSearchInput() : ''}
          <div class="asset-selector-options" role="listbox">
            ${this.renderOptions()}
          </div>
        </div>
      </div>
    `;

    // Store DOM references
    this.triggerElement = this.container.querySelector('.asset-selector-trigger');
    this.dropdownElement = this.container.querySelector('.asset-selector-dropdown');
    this.searchInput = this.container.querySelector('.asset-selector-search input');
    this.optionsContainer = this.container.querySelector('.asset-selector-options');
  }

  /**
   * Render the search input
   */
  private renderSearchInput(): string {
    return `
      <div class="asset-selector-search">
        <input type="text" placeholder="Search assets..." value="${this.searchTerm}" />
      </div>
    `;
  }

  /**
   * Render the selected option in the trigger
   */
  private renderSelectedOption(option: AssetSelectorOption): string {
    const logo = AssetService.GetLogoWithChain(option.asset, 24);
    const displayName = option.displayName || AssetDisplayName(option.asset);
    
    return `
      <div class="selected-asset">
        ${logo}
        <span class="selected-asset-name">${displayName}</span>
      </div>
    `;
  }

  /**
   * Render all available options
   */
  private renderOptions(): string {
    if (this.filteredOptions.length === 0) {
      return '<div class="no-options">No assets found</div>';
    }

    return this.filteredOptions
      .map(option => this.renderOption(option))
      .join('');
  }

  /**
   * Render a single option
   */
  private renderOption(option: AssetSelectorOption): string {
    const isSelected = option.asset === this.selectedAsset;
    const isDisabled = option.disabled;
    const logo = AssetService.GetLogoWithChain(option.asset, 32);
    const displayText = this.formatOptionDisplay(option, false);
    
    return `
      <div class="asset-selector-option ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}"
           data-asset="${option.asset}"
           role="option"
           aria-selected="${isSelected}"
           ${isDisabled ? 'aria-disabled="true"' : ''}>
        <div class="asset-selector-option-logo">
          ${logo}
        </div>
        <div class="asset-selector-option-content">
          ${displayText}
        </div>
      </div>
    `;
  }

  /**
   * Format option display text based on display mode
   */
  private formatOptionDisplay(option: AssetSelectorOption, isSelected: boolean): string {
    const displayName = option.displayName || AssetDisplayName(option.asset);
    
    switch (this.config.displayMode) {
      case 'name-only':
        return `<div class="option-name">${displayName}</div>`;
        
      case 'user-balances':
        const balance = option.balance ? parseFloat(option.balance) : 0;
        const usdValue = option.usdValue || 0;
        const pricePerUnit = option.assetPrice || (balance > 0 ? usdValue / balance : 0);
        
        return `
          <div class="option-main">
            <div class="option-name">${displayName}</div>
            <div class="balance-amount">Balance: ${this.formatBalance(option.balance || '0')}</div>
          </div>
          <div class="option-balance">
            <div class="option-price">$${this.formatNumber(pricePerUnit, 4)}</div>
            <div class="balance-usd">$${this.formatNumber(usdValue, 2)}</div>
          </div>
        `;
        
      case 'asset-prices':
        const price = option.assetPrice || 0;
        return `
          <div class="option-main">
            <div class="option-name">${displayName}</div>
            <div class="option-price">$${this.formatNumber(price, 4)}</div>
          </div>
        `;
        
      default:
        return `<div class="option-name">${displayName}</div>`;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Trigger click
    if (this.triggerElement) {
      this.triggerElement.addEventListener('click', () => this.toggle());
      this.triggerElement.addEventListener('keydown', (e) => this.handleTriggerKeydown(e));
    }

    // Search input
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => this.handleSearch((e.target as HTMLInputElement).value));
      this.searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
    }

    // Option clicks
    if (this.optionsContainer) {
      this.optionsContainer.addEventListener('click', (e) => this.handleOptionClick(e));
    }

    // Outside click to close
    document.addEventListener('click', (e) => this.handleOutsideClick(e));

    // Setup image error handling
    this.setupImageErrorHandling();
  }

  /**
   * Setup image error handling for asset logos
   */
  private setupImageErrorHandling(): void {
    const images = this.container.querySelectorAll('.asset-logo, .chain-logo');
    images.forEach(img => {
      (img as HTMLImageElement).addEventListener('error', () => {
        AssetService.handleImageError(img as HTMLImageElement);
      });
    });
  }

  /**
   * Handle trigger keydown events
   */
  private handleTriggerKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.toggle();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.open();
        this.focusFirstOption();
        break;
      case 'Escape':
        this.close();
        break;
    }
  }

  /**
   * Handle search input keydown events
   */
  private handleSearchKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.focusFirstOption();
        break;
      case 'Escape':
        this.close();
        break;
    }
  }

  /**
   * Handle search input
   */
  private handleSearch(term: string): void {
    this.searchTerm = term.toLowerCase();
    this.filterOptions();
    this.updateOptionsDisplay();
  }

  /**
   * Filter options based on search term
   */
  private filterOptions(): void {
    if (!this.searchTerm) {
      this.filteredOptions = [...this.options];
      return;
    }

    this.filteredOptions = this.options.filter(option => {
      const displayName = (option.displayName || AssetDisplayName(option.asset)).toLowerCase();
      const asset = option.asset.toLowerCase();
      return displayName.includes(this.searchTerm) || asset.includes(this.searchTerm);
    });
  }

  /**
   * Update options display after filtering
   */
  private updateOptionsDisplay(): void {
    if (this.optionsContainer) {
      this.optionsContainer.innerHTML = this.renderOptions();
      this.setupImageErrorHandling();
    }
  }

  /**
   * Handle option click
   */
  private handleOptionClick(e: Event): void {
    const optionElement = (e.target as HTMLElement).closest('.asset-selector-option');
    if (!optionElement) return;

    const asset = optionElement.getAttribute('data-asset');
    if (!asset || optionElement.classList.contains('disabled')) return;

    this.selectOption(asset);
  }

  /**
   * Handle outside click to close dropdown
   */
  private handleOutsideClick(e: Event): void {
    if (!this.container.contains(e.target as Node)) {
      this.close();
    }
  }

  /**
   * Select an option
   */
  private selectOption(asset: string): void {
    this.selectedAsset = asset;
    this.close();
    this.updateTriggerDisplay();
    
    // Trigger callback
    if (this.config.onSelectionChange) {
      this.config.onSelectionChange(asset);
    }
    
    console.log('🎯 AssetSelector: Selected asset:', asset);
  }

  /**
   * Update trigger display after selection
   */
  private updateTriggerDisplay(): void {
    if (!this.triggerElement) return;

    const selectedOption = this.options.find(opt => opt.asset === this.selectedAsset);
    const triggerContent = this.triggerElement.querySelector('.selected-asset, .placeholder');
    
    if (triggerContent && selectedOption) {
      triggerContent.outerHTML = this.renderSelectedOption(selectedOption);
      this.setupImageErrorHandling();
    }
  }

  /**
   * Focus first option in dropdown
   */
  private focusFirstOption(): void {
    const firstOption = this.optionsContainer?.querySelector('.asset-selector-option:not(.disabled)') as HTMLElement;
    if (firstOption) {
      firstOption.focus();
    }
  }

  /**
   * Toggle dropdown open/close
   */
  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open dropdown
   */
  private open(): void {
    if (this.isOpen) return;

    this.isOpen = true;
    
    if (this.dropdownElement) {
      this.dropdownElement.style.display = 'block';
    }
    
    if (this.triggerElement) {
      this.triggerElement.setAttribute('aria-expanded', 'true');
      this.triggerElement.classList.add('open');
    }

    // Focus search input if available
    if (this.searchInput) {
      setTimeout(() => this.searchInput?.focus(), 50);
    }

    console.log('🔧 AssetSelector: Opened dropdown');
  }

  /**
   * Close dropdown
   */
  private close(): void {
    if (!this.isOpen) return;

    this.isOpen = false;
    
    if (this.dropdownElement) {
      this.dropdownElement.style.display = 'none';
    }
    
    if (this.triggerElement) {
      this.triggerElement.setAttribute('aria-expanded', 'false');
      this.triggerElement.classList.remove('open');
    }

    // Clear search
    this.searchTerm = '';
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    this.filterOptions();
    this.updateOptionsDisplay();

    console.log('🔧 AssetSelector: Closed dropdown');
  }

  /**
   * Update options with new data
   */
  updateOptions(options: AssetSelectorOption[]): void {
    this.options = options;
    this.filterOptions();
    this.updateOptionsDisplay();
    console.log('🔄 AssetSelector: Updated with', options.length, 'options');
  }

  /**
   * Set selected asset programmatically
   */
  setSelectedAsset(asset: string | null): void {
    this.selectedAsset = asset;
    this.updateTriggerDisplay();
    console.log('🎯 AssetSelector: Set selected asset to:', asset);
  }

  /**
   * Get current selection
   */
  getSelectedAsset(): string | null {
    return this.selectedAsset;
  }

  /**
   * Cleanup and destroy component
   */
  destroy(): void {
    document.removeEventListener('click', this.handleOutsideClick);
    this.container.innerHTML = '';
    console.log('🧹 AssetSelector: Destroyed component');
  }

  // Utility methods
  private formatNumber(value: number, decimals: number): string {
    if (isNaN(value) || value === 0) return '0.00';
    return value.toFixed(decimals).replace(/\.?0+$/, '');
  }

  private formatBalance(balance: string): string {
    const num = parseFloat(balance);
    if (isNaN(num)) return '0.00';
    return num.toFixed(6).replace(/\.?0+$/, '');
  }
}