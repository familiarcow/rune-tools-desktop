# AssetSelector Component Design Documentation

## Overview

The AssetSelector component is a reusable, professional-grade asset selection interface that replaces basic HTML dropdowns with a visually rich component featuring asset logos, real-time pricing, balances, and search functionality. It's designed to match the aesthetics of professional crypto trading platforms like Binance, Coinbase Pro, and Uniswap.

## Architecture

### Component Structure
```
AssetSelector/
├── src/renderer/components/AssetSelector.ts    # Main component class
├── src/renderer/index.html                     # CSS styles (inline)
└── Integration in consuming components         # SwapTab.ts, etc.
```

### Core Files Modified

1. **`/src/renderer/components/AssetSelector.ts`** - Main component implementation
2. **`/src/renderer/components/SwapTab.ts`** - Integration and usage example
3. **`/src/renderer/index.html`** - CSS styling (moved inline due to Vite bundling issues)
4. **`/src/services/swapService.ts`** - Made `getAssetPricing()` method public for real price data

## Component Interface

### AssetSelectorOption Interface
```typescript
interface AssetSelectorOption {
  asset: string;           // "THOR.RUNE", "BTC.BTC", etc.
  displayName?: string;    // Optional override (defaults to AssetDisplayName())
  balance?: string;        // User's balance for this asset
  usdValue?: number;       // Total USD value of user's balance
  assetPrice?: number;     // USD price per unit of asset
  disabled?: boolean;      // Disable selection of this option
}
```

### AssetSelectorConfig Interface
```typescript
interface AssetSelectorConfig {
  id: string;                    // Unique component ID
  placeholder?: string;          // Placeholder text ("Select asset...")
  displayMode: AssetSelectorDisplayMode; // Display mode (see below)
  searchable?: boolean;          // Enable search functionality
  maxHeight?: string;            // Max dropdown height ("300px")
  onSelectionChange?: (asset: string | null) => void; // Selection callback
}
```

### Display Modes

The component supports three display modes:

1. **`name-only`** - Shows only asset names with logos
   - Best for: Simple asset selection without financial data
   - Shows: Asset logo + normalized name

2. **`user-balances`** - Shows user balances and USD values
   - Best for: Wallet interfaces, "from asset" selection
   - Shows: Asset logo + name + price per unit + user balance + total USD value

3. **`asset-prices`** - Shows current asset prices
   - Best for: Trading interfaces, "to asset" selection
   - Shows: Asset logo + name + current USD price per unit

## Implementation Guide

### Basic Usage

```typescript
import { AssetSelector, AssetSelectorOption } from './AssetSelector';

// 1. Create container element in HTML
const container = document.querySelector('#asset-selector-container');

// 2. Prepare asset data
const options: AssetSelectorOption[] = [
  {
    asset: 'THOR.RUNE',
    balance: '100.5',
    usdValue: 80.4,
    assetPrice: 0.8
  },
  {
    asset: 'BTC.BTC',
    balance: '0.001',
    usdValue: 43.0,
    assetPrice: 43000
  }
];

// 3. Initialize component
const assetSelector = new AssetSelector(container, {
  id: 'my-asset-selector',
  placeholder: 'Select an asset...',
  displayMode: 'user-balances',
  searchable: true,
  onSelectionChange: (asset) => {
    console.log('Selected asset:', asset);
  }
});

// 4. Initialize with data
await assetSelector.initialize(options);
```

### Advanced Usage - SwapTab Integration

```typescript
// From Asset Selector (with user balances)
const fromOptions: AssetSelectorOption[] = this.fromAssets.map(asset => {
  const balance = parseFloat(asset.balance);
  const assetPrice = balance > 0 ? asset.usdValue / balance : 0;
  
  return {
    asset: asset.asset,
    balance: asset.balance,
    usdValue: asset.usdValue,
    assetPrice: assetPrice
  };
});

this.fromAssetSelector = new AssetSelector(fromContainer, {
  id: 'from-asset-selector-component',
  placeholder: 'Select asset to swap',
  displayMode: 'user-balances',
  searchable: true,
  onSelectionChange: (asset) => this.onFromAssetChange(asset || '')
});

// To Asset Selector (with real-time pricing)
const toOptions: AssetSelectorOption[] = await Promise.all(
  this.toAssets.map(async asset => {
    // Get real prices from SwapService
    const { price } = await this.swapService.getAssetPricing(asset.asset, 1);
    
    return {
      asset: asset.asset,
      assetPrice: price
    };
  })
);

this.toAssetSelector = new AssetSelector(toContainer, {
  id: 'to-asset-selector-component',
  placeholder: 'Select destination asset',
  displayMode: 'asset-prices',
  searchable: true,
  onSelectionChange: (asset) => this.onToAssetChange(asset || '')
});
```

## Styling Architecture

### CSS Organization
Due to Vite bundling constraints, styles are currently embedded in `/src/renderer/index.html`. The styling uses:

- **CSS Custom Properties** for theming and consistency
- **Dark theme** optimized color scheme
- **Professional animations** with cubic-bezier transitions
- **Responsive design** patterns
- **Accessibility** compliant focus states

### Key Style Classes
```css
.asset-selector                    /* Main container */
.asset-selector-trigger           /* Clickable trigger button */
.asset-selector-dropdown          /* Dropdown content container */
.asset-selector-option            /* Individual asset option */
.asset-selector-option-logo       /* Asset logo container */
.asset-selector-option-content    /* Option text content */
.asset-selector-search            /* Search input container */
```

## Data Integration

### Price Data Sources
The component integrates with existing price data infrastructure:

1. **User Balances** - From `BackendService.getNormalizedBalances()`
2. **Asset Prices** - From `SwapService.getAssetPricing()` (pools/network endpoints)
3. **Asset Logos** - From `AssetService.GetLogoWithChain()`
4. **Asset Names** - Normalized via `AssetDisplayName()` utility

### Real-time Updates
```typescript
// Update options with new data
assetSelector.updateOptions(newOptions);

// Set selected asset programmatically
assetSelector.setSelectedAsset('THOR.RUNE');

// Get current selection
const selected = assetSelector.getSelectedAsset();
```

## Component Lifecycle

1. **Constructor** - Set up configuration and container reference
2. **Initialize** - Render DOM, set up event listeners, load data
3. **User Interaction** - Handle clicks, keyboard navigation, search
4. **Selection Change** - Update visual state, trigger callbacks
5. **Cleanup** - `destroy()` method removes DOM and event listeners

### Event Handling
- **Click/Tap** - Toggle dropdown, select options
- **Keyboard Navigation** - Arrow keys, Enter, Escape
- **Search** - Real-time filtering of options
- **Outside Click** - Auto-close dropdown
- **Image Error** - Fallback handling for missing logos

## Error Handling

The component includes robust error handling for:

- **Missing Images** - Falls back to text labels via `AssetService.handleImageError()`
- **Invalid Data** - Graceful degradation for missing price/balance data
- **Network Issues** - Continues functioning with cached/fallback data
- **DOM Issues** - Defensive programming for missing elements

## Accessibility Features

- **ARIA Attributes** - Proper role, expanded, selected states
- **Keyboard Navigation** - Full keyboard support
- **Focus Management** - Logical tab order and focus trapping
- **Screen Reader Support** - Semantic markup and labels
- **High Contrast** - Professional dark theme with sufficient contrast

## Performance Optimizations

- **Lazy Loading** - Images loaded on-demand
- **Event Delegation** - Efficient event handling
- **Debounced Search** - Optimized search filtering
- **Memory Management** - Proper cleanup and disposal
- **Minimal Reflows** - Efficient DOM manipulation

## Usage in Other Components

To use AssetSelector in new components:

1. **Import the component**
   ```typescript
   import { AssetSelector, AssetSelectorOption } from './AssetSelector';
   ```

2. **Prepare your container HTML**
   ```html
   <div class="asset-selector-container" id="my-selector"></div>
   ```

3. **Prepare your data** with appropriate display mode
   ```typescript
   const options: AssetSelectorOption[] = // your asset data
   ```

4. **Initialize and handle selection**
   ```typescript
   const selector = new AssetSelector(container, config);
   await selector.initialize(options);
   ```

5. **Cleanup when component unmounts**
   ```typescript
   selector.destroy();
   ```

## Future Enhancements

Potential improvements for future versions:

- **Multi-select Mode** - Allow selection of multiple assets
- **Custom Templates** - Pluggable rendering for different use cases
- **Virtual Scrolling** - Handle thousands of assets efficiently
- **Advanced Filtering** - Filter by chain, asset type, etc.
- **Favorites/Recents** - User preference tracking
- **External CSS** - Resolve Vite bundling for separate CSS files

## Troubleshooting

### Common Issues

1. **Styles not applying** - Verify styles are in index.html
2. **Images not loading** - Check AssetService.initializeStyles() called
3. **Prices showing $0.00** - Ensure SwapService.getAssetPricing() is accessible
4. **Search not working** - Verify searchable: true in config
5. **Dropdown not opening** - Check click event handlers and CSS classes

### Debug Mode
Enable debug logging:
```typescript
// Component logs prefixed with 🎨, 🔧, 🎯, etc.
// Check browser console for initialization and interaction logs
```

This design provides a flexible, professional asset selection component that can be easily integrated throughout the application while maintaining consistency and performance.