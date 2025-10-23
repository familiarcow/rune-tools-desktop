# Wallet Balance Processing Architecture

This document provides a complete technical breakdown of how wallet balances are fetched, processed, classified, and displayed in the THORChain desktop application.

**Latest Updates**: Added collapsible asset sections, asset price display, and cleaned UI (November 2024)

---

## 🔄 **Processing Flow Overview**

The wallet balance system handles complex THORChain asset data through a multi-stage pipeline:

```mermaid
graph TD
    A[User Unlocks Wallet] --> B[loadWalletData]
    B --> C[Fetch from 3 Data Sources]
    C --> D[processBalanceData]
    D --> E[Asset Classification & Filtering]
    E --> F[Price Lookup & USD Calculation]
    F --> G[UI Update & Display]
    
    C --> H[/cosmos/bank/v1beta1/balances]
    C --> I[/balances/normalized - Primary]
    C --> J[/thorchain/trade/account]
    
    E --> K[Synthetic Assets Filtered Out]
    E --> L[4-Tier Classification System]
    
    F --> M[Pool Price Lookup]
    F --> N[RUNE Price from /network]
```

---

## 📊 **Data Sources**

### **1. Raw Balances** (`/cosmos/bank/v1beta1/balances/{address}`)
- **Purpose**: Basic Cosmos SDK balance data
- **Status**: Available as fallback (not currently used in primary flow)
- **Format**: Simple cosmos denomination and amount pairs

### **2. Internal Balance Normalization Service** - **PRIMARY SOURCE**
- **Purpose**: Our own processing service that fetches raw data and enriches it with metadata and formatting
- **Status**: Primary data source for balance processing (calls `BalanceNormalizationService.getCombinedNormalizedBalances()`)
- **What it does**: Fetches raw balance data from multiple endpoints, then normalizes and enriches it internally
- **Format**: Returns complex objects with asset metadata, formatted amounts, and normalization

**Example Normalized Balance Object:**
```typescript
{
  asset: {
    identifier: "BTC/BTC",
    chain: "THOR",
    symbol: "BTC"
  },
  amount: "6",
  amountFormatted: "0.00000006 BTC/BTC",
  amountNormalized: 6e-8,
  source: "wallet"
}
```

### **3. Trade Account Balances** (`/thorchain/trade/account/{address}`)
- **Purpose**: Assets held in THORChain trade accounts
- **Status**: Secondary source for trade-specific assets  
- **Format**: Array of trade account balance objects

---

## 🏗️ **Implementation Architecture**

### **Entry Point: `loadWalletData()`** (`WalletTab.ts:209-235`)

```typescript
private async loadWalletData(): Promise<void> {
    // Parallel fetch from all data sources
    const [balances, normalizedBalances, tradeAccount] = await Promise.allSettled([
        this.backend.getBalances(this.walletData.address),           // Fallback
        this.backend.getNormalizedBalances(this.walletData.address), // PRIMARY
        this.backend.getTradeAccount(this.walletData.address)        // Trade assets
    ])
    
    // Process and categorize all assets
    await this.processBalanceData(balances, normalizedBalances, tradeAccount)
    
    // Update UI with processed data
    this.updatePortfolioSummary()
    this.updateAssetTiers()
}
```

### **Core Processing: `processBalanceData()`** (`WalletTab.ts:237-297`)

**Step 1: Extract Normalized Balance Array**
```typescript
// Handle multiple possible response formats
const normalizedArray = normalizedBalances.value.balances || 
                        (Array.isArray(normalizedBalances.value) ? 
                         normalizedBalances.value : [normalizedBalances.value])
```

**Step 2: Process Each Asset**
```typescript
for (const balance of normalizedArray) {
    const assetName = this.extractAssetName(balance)     // Extract asset identifier
    const assetType = this.getAssetType(assetName)       // Classify by separator
    
    console.log('🔍 Balance classification:', {
        balance: balance,
        extractedAssetName: assetName,
        assetType: assetType
    })
    
    // CRITICAL: Filter out deprecated synthetic assets
    if (assetType === 'synthetic') {
        console.log('🚫 Skipping deprecated synthetic asset:', assetName)
        continue // Excluded from portfolio
    }
    
    // Create final asset balance object with USD pricing
    const assetBalance = await this.createAssetBalance(balance, assetType)
    processedBalances.push(assetBalance)
    totalUsd += assetBalance.usdValue
}
```

**Step 3: Process Trade Account Assets**
```typescript
// Add trade account balances (always classified as 'trade' tier)
if (tradeAccount.status === 'fulfilled' && tradeAccount.value) {
    for (const balance of tradeAccount.value.balances || []) {
        const assetBalance = await this.createAssetBalance(balance, 'trade')
        processedBalances.push(assetBalance)
        totalUsd += assetBalance.usdValue
    }
}
```

---

## 🏷️ **Asset Classification System**

### **Core Function: `getAssetType()`** (`WalletTab.ts:481-525`)

**Logic: Find First Separator Character**
```typescript
private getAssetType(assetName: string): 'thor-native' | 'secured' | 'trade' | 'synthetic' {
    const asset = assetName.toUpperCase()
    
    // Special case: known native assets
    if (asset === 'RUNE' || asset === 'TCY') {
        return 'thor-native'
    }
    
    // Find first separator in the string
    const separators = ['/', '~', '-', '.']
    let firstSeparator = null
    let firstSeparatorIndex = asset.length
    
    for (const separator of separators) {
        const index = asset.indexOf(separator)
        if (index !== -1 && index < firstSeparatorIndex) {
            firstSeparator = separator
            firstSeparatorIndex = index
        }
    }
    
    // Classify based on FIRST separator found
    if (firstSeparator === '/') return 'synthetic'    // FILTERED OUT
    if (firstSeparator === '~') return 'trade'        
    if (firstSeparator === '-') return 'secured'      
    if (firstSeparator === '.') return 'thor-native'  
    
    return 'thor-native' // Single word assets default to native
}
```

### **Classification Examples**

| Asset Name | First Separator | Classification | Action |
|------------|----------------|----------------|---------|
| `ETH~USDC-0x12334` | `~` (position 3) | `trade` | ✅ Display |
| `BTC-BTC` | `-` (position 3) | `secured` | ✅ Display |
| `THOR.BTC/BTC` | `.` (position 4) | `thor-native` | ✅ Display |
| `BTC/BTC` | `/` (position 3) | `synthetic` | ❌ **Filtered Out** |
| `BNB/ETH-1C9` | `/` (position 3) | `synthetic` | ❌ **Filtered Out** |
| `RUNE` | none | `thor-native` | ✅ Display |
| `TCY` | none | `thor-native` | ✅ Display |

**Key Insight**: The first separator wins - `ETH~USDC-0x12334` is classified as `trade` because `~` appears before `-`.

### **Asset Name Extraction: `extractAssetName()`** (`WalletTab.ts:457-470`)

Handles multiple balance object formats:
```typescript
private extractAssetName(balance: any): string {
    const asset = balance.asset
    
    if (typeof asset === 'string') {
        return asset                    // Simple string format
    }
    
    if (typeof asset === 'object' && asset !== null) {
        // Complex object format - try multiple fields
        return asset.asset || asset.identifier || asset.symbol || 'UNKNOWN'
    }
    
    return 'UNKNOWN'
}
```

---

## 💰 **Price Lookup & USD Calculation**

### **Asset Balance Creation: `createAssetBalance()`** (`WalletTab.ts:299-337`)

**Data Extraction**
```typescript
private async createAssetBalance(rawBalance: any, tier: AssetBalance['tier']): Promise<AssetBalance> {
    let asset: string
    let balance: string  
    let normalizedAmount: number = 0
    
    if (typeof rawBalance.asset === 'object' && rawBalance.asset !== null) {
        // Rich normalized balance format
        asset = this.extractAssetName(rawBalance)
        balance = rawBalance.amountFormatted || rawBalance.amount || '0'
        normalizedAmount = rawBalance.amountNormalized || 0
    } else {
        // Simple balance format
        asset = rawBalance.asset || 'UNKNOWN'
        balance = rawBalance.amount || '0'
        normalizedAmount = parseFloat(balance) / 100000000 // Convert from e8 format
    }
}
```

**Pool Asset Normalization: `normalizeAssetForPoolLookup()`** (`WalletTab.ts:361-388`)
```typescript
private normalizeAssetForPoolLookup(asset: string): string {
    const assetUpper = asset.toUpperCase()
    
    // Native assets: rune -> THOR.RUNE
    if (assetUpper === 'RUNE') return 'THOR.RUNE'
    if (assetUpper === 'TCY') return 'THOR.TCY'
    
    // Already normalized (THOR.ASSET)
    if (assetUpper.startsWith('THOR.')) return assetUpper
    
    // Replace first separator with '.' for pool lookup
    if (assetUpper.includes('-')) return assetUpper.replace('-', '.')  // BTC-BTC → BTC.BTC
    if (assetUpper.includes('~')) return assetUpper.replace('~', '.')  // ETH~USDC → ETH.USDC
    
    return assetUpper
}
```

### **Price Lookup: `getAssetPricing()`** (`WalletTab.ts:402-452`)

**RUNE Special Handling**
```typescript
private async getRunePricing(normalizedAmount: number): Promise<{ price: number, usdValue: number }> {
    // Get RUNE price from /network endpoint (not pools)
    const network = await this.backend.getThorchainNetwork()
    if (network && network.rune_price_in_tor) {
        // Convert from tor units to USD (rune_price_in_tor/1e8)
        const price = parseFloat(network.rune_price_in_tor) / 100000000
        const usdValue = normalizedAmount * price
        return { price, usdValue }
    }
    return { price: 5.50, usdValue: normalizedAmount * 5.50 } // Fallback
}
```

**Pool-Based Pricing**
```typescript
private async getAssetPricing(poolAssetId: string, normalizedAmount: number): Promise<{ price: number, usdValue: number }> {
    // Special RUNE handling
    if (poolAssetId === 'THOR.RUNE' || poolAssetId.includes('RUNE')) {
        return await this.getRunePricing(normalizedAmount)
    }
    
    // Get pools data for other assets
    const pools = await this.backend.getPools()
    const pool = pools.find((p: any) => p.asset.toLowerCase() === poolAssetId.toLowerCase())
    
    if (pool && pool.asset_price_usd) {
        const price = parseFloat(pool.asset_price_usd) || 0
        const usdValue = normalizedAmount * price
        return { price, usdValue }
    }
    
    // Fallback pricing for missing pools
    return { price: 1.0, usdValue: normalizedAmount * 1.0 }
}
```

---

## 📱 **UI Display System**

### **New UI Features (2024 Update)**

**Collapsible Asset Sections**
- Secured and Trade asset sections now have collapse/expand buttons (▼/▶)
- Sections are collapsed by default when they contain no assets
- Users can toggle visibility to reduce visual clutter
- State is managed in the `collapsedSections` Set

**Asset Price Display**
- Each asset now shows its current USD price next to the name
- Format: `THOR.RUNE - $1.05` (2 decimal places)
- Prices are fetched from pool data and network endpoints
- Integrated into the asset display template

**Cleaned Up UI**
- Removed description text under tier headers ("Assets native to THORChain...")
- Removed percentage change display from portfolio summary
- More focused, streamlined interface

### **Portfolio Tier Calculation: `calculateTierValues()`** (`WalletTab.ts:538-562`)

```typescript
private calculateTierValues(): void {
    let thorNative = 0, secured = 0, trade = 0
    
    for (const balance of this.walletData.balances) {
        switch (balance.tier) {
            case 'thor-native': thorNative += balance.usdValue; break
            case 'secured': secured += balance.usdValue; break  
            case 'trade': trade += balance.usdValue; break
        }
    }
    
    this.walletData.portfolioSummary.thorNativeValue = thorNative
    this.walletData.portfolioSummary.securedValue = secured
    this.walletData.portfolioSummary.tradeValue = trade
}
```

### **Asset Display: `updateAssetList()`** (`WalletTab.ts:605-634`)

```typescript
private updateAssetList(tier: AssetBalance['tier'], containerId: string): void {
    const assets = this.walletData.balances.filter(balance => balance.tier === tier)
    
    if (assets.length === 0) {
        container.innerHTML = `<div class="no-assets">No ${tier.replace('-', ' ')} assets found</div>`
        return
    }
    
    // NEW: Asset display now includes price in the asset name
    container.innerHTML = assets.map(asset => `
        <div class="asset-item">
            <div class="asset-info">
                <div class="asset-symbol">${asset.asset} - ${this.formatPrice(asset.price)}</div>
                <div class="asset-chain">${asset.chain}</div>
            </div>
            <div class="asset-amounts">
                <div class="asset-balance">${this.formatBalance(asset.balance)} ${asset.asset}</div>
                <div class="asset-usd-value">${this.formatUsd(asset.usdValue)}</div>
            </div>
        </div>
    `).join('')
}
```

---

## 🔧 **Technical Implementation Details**

### **Data Types**

```typescript
export interface AssetBalance {
    asset: string                                    // Asset name/identifier
    chain: string                                    // Blockchain (THOR, BTC, ETH, etc.)
    tier: 'thor-native' | 'secured' | 'trade'      // Classification tier
    balance: string                                  // Formatted balance amount
    usdValue: number                                // USD equivalent value
    price?: number                                  // Price per unit in USD (NEW: displayed in UI)
}

export interface PortfolioSummary {
    totalUsdValue: number      // Total portfolio value in USD
    thorNativeValue: number    // THOR native assets USD value
    securedValue: number       // Secured assets USD value  
    tradeValue: number        // Trade assets USD value
    change24h?: number        // 24h change percentage (removed from UI)
}

// NEW: Collapse state management
export class WalletTab {
    private collapsedSections: Set<string> = new Set(['secured', 'trade']) // Default collapsed
    
    // NEW: Formatting methods
    private formatPrice(price?: number): string {
        if (!price || price === 0) return '$0.00'
        return price.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }
}
```

### **Error Handling**

**Balance Processing Errors**
```typescript
} catch (error) {
    console.error('❌ Failed to load wallet data:', error)
    this.showError('Failed to load wallet data: ' + (error as Error).message)
}
```

**Price Lookup Fallbacks**
```typescript
// Fallback pricing when pool data unavailable
let fallbackPrice = 1.0
if (poolAssetId.includes('BTC')) fallbackPrice = 45000
else if (poolAssetId.includes('ETH')) fallbackPrice = 3000

return { price: fallbackPrice, usdValue: normalizedAmount * fallbackPrice }
```

### **Performance Considerations**

**Parallel Data Fetching**
```typescript
// All data sources fetched simultaneously
const [balances, normalizedBalances, tradeAccount] = await Promise.allSettled([
    this.backend.getBalances(this.walletData.address),
    this.backend.getNormalizedBalances(this.walletData.address), 
    this.backend.getTradeAccount(this.walletData.address)
])
```

**Efficient Classification**
```typescript
// Single pass through separators for classification
for (const separator of separators) {
    const index = asset.indexOf(separator)
    if (index !== -1 && index < firstSeparatorIndex) {
        firstSeparator = separator
        firstSeparatorIndex = index
    }
}
```

---

## 🚫 **Synthetic Asset Filtering**

### **Why Filter Synthetic Assets?**

Synthetic assets (identified by `/` separator) are **deprecated** in THORChain and cause issues:

1. **Pricing Problems**: Synthetic assets don't have proper pool data
2. **User Confusion**: Deprecated assets shouldn't be shown in portfolio  
3. **API Inconsistencies**: Synthetic assets return inconsistent data formats

### **Filtering Implementation**

**Detection**
```typescript
// Any asset with '/' as first separator is synthetic
if (firstSeparator === '/') {
    return 'synthetic' // Will be filtered out
}
```

**Exclusion**
```typescript
// Skip synthetic assets completely
if (assetType === 'synthetic') {
    console.log('🚫 Skipping deprecated synthetic asset:', assetName)
    continue // Not added to portfolio
}
```

**Examples of Filtered Assets**
- `BTC/BTC` → Filtered (deprecated synthetic BTC)
- `BNB/ETH-1C9` → Filtered (deprecated synthetic)
- `THOR.BTC/BTC` → Filtered (synthetic with THOR prefix)

---

## 🔄 **Network Context Updates**

### **Network Switching: `updateNetwork()`** (`WalletTab.ts:672-702`)

When user switches networks, the entire balance processing pipeline re-runs:

```typescript
async updateNetwork(network: 'mainnet' | 'stagenet'): Promise<void> {
    // Update network context
    this.walletData.network = network
    
    // Clear current data
    this.walletData.balances = []
    this.walletData.portfolioSummary = { totalUsdValue: 0, thorNativeValue: 0, securedValue: 0, tradeValue: 0 }
    
    // Show loading state
    this.updateAssetTiers()
    
    // Re-run entire balance processing pipeline
    await this.refreshData()
}
```

### **Address Context Updates: `updateWalletAddress()`** (`WalletTab.ts:705-719`)

When wallet context changes, address display updates:

```typescript
updateWalletAddress(wallet: any, network: 'mainnet' | 'stagenet'): void {
    const newAddress = network === 'mainnet' ? wallet.mainnetAddress : wallet.stagenetAddress
    this.walletData.address = newAddress
    this.walletData.network = network
    
    // Update address display in UI
    const addressEl = this.container.querySelector('.address-text')
    if (addressEl && newAddress) {
        addressEl.textContent = this.formatAddress(newAddress)
    }
}
```

---

## 🐛 **Known Issues & Solutions**

### **Issue 1: Complex Asset Naming**
**Problem**: THORChain assets have inconsistent naming across endpoints  
**Solution**: Sophisticated asset name extraction with fallbacks

### **Issue 2: Synthetic Asset Confusion**  
**Problem**: Deprecated synthetic assets appear in balance data
**Solution**: Proactive filtering based on `/` separator detection

### **Issue 3: Multiple Data Formats**
**Problem**: Different endpoints return different balance object structures
**Solution**: Flexible data extraction with type checking and fallbacks

### **Issue 4: Price Lookup Complexity**
**Problem**: Different asset types require different pricing strategies
**Solution**: Asset normalization for pool lookup + special RUNE handling

---

## 📊 **Console Debug Output**

The system provides comprehensive logging for debugging:

```typescript
console.log('🔄 Loading wallet data for', this.walletData.address)
console.log('🔍 Processing normalized balances (primary):', normalizedBalances.value)
console.log('📊 Detailed normalized balances inspection:', normalizedArray)

console.log('🔍 Balance classification:', {
    balance: balance,
    extractedAssetName: assetName,
    assetType: assetType
})

console.log('🚫 Skipping deprecated synthetic asset:', assetName)
console.log('🔧 Creating asset balance for tier:', tier, 'data:', rawBalance)
console.log('💰 Asset pricing:', { asset, poolAssetId, normalizedAmount, price, usdValue })
console.log('✅ Wallet data loaded:', this.walletData.portfolioSummary)
```

---

## 🎯 **Summary**

The wallet balance processing system handles the complexity of THORChain's diverse asset ecosystem through:

1. **Multi-Source Data Fetching**: Combines normalized balances with trade account data
2. **Sophisticated Asset Classification**: First-separator-wins logic for accurate categorization
3. **Proactive Synthetic Filtering**: Excludes deprecated synthetic assets before pricing
4. **Flexible Price Lookup**: Pool-based pricing with RUNE special handling
5. **Real-Time Updates**: Network and wallet context switching with full pipeline re-execution
6. **Comprehensive Error Handling**: Fallbacks and graceful degradation throughout

This architecture successfully transforms raw THORChain data into a clean, categorized portfolio display while filtering out problematic assets and handling the complexity of multi-network, multi-asset-type scenarios.

The implementation is more complex than originally anticipated in the Architecture specification, but this complexity is necessary to handle the real-world intricacies of THORChain's asset ecosystem and provide users with accurate, reliable balance information.

### **Recent UI Enhancements**

**Collapsible Sections Implementation**
```typescript
// Toggle section visibility
private toggleSection(tier: 'secured' | 'trade'): void {
    const isCollapsed = this.collapsedSections.has(tier)
    
    if (isCollapsed) {
        this.collapsedSections.delete(tier)
    } else {
        this.collapsedSections.add(tier)
    }
    
    this.updateSectionVisibility(tier)
}

// Apply visual states with auto-collapse for empty sections
private applyCollapsedStates(): void {
    const securedAssets = this.walletData?.balances.filter(b => b.tier === 'secured') || []
    const tradeAssets = this.walletData?.balances.filter(b => b.tier === 'trade') || []
    
    // Auto-collapse empty sections
    if (securedAssets.length === 0) this.collapsedSections.add('secured')
    if (tradeAssets.length === 0) this.collapsedSections.add('trade')
    
    this.updateSectionVisibility('secured')
    this.updateSectionVisibility('trade')
}
```

**HTML Structure Updates**
```html
<!-- NEW: Collapsible header structure -->
<div class="tier-header" data-tier="secured">
    <div class="tier-header-left">
        <button class="collapse-btn" id="secured-collapse-btn" title="Toggle secured assets">▼</button>
        <h4>🔒 Secured Assets</h4>
    </div>
    <span class="tier-value" id="secured-value">$0.00</span>
</div>
```

**CSS Additions**
```css
.tier-header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.collapse-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
}

.collapse-btn:hover {
    background: var(--bg-input);
    color: var(--text-primary);
}
```

These enhancements improve the user experience by:
1. **Reducing visual clutter** - Empty sections are collapsed by default
2. **Providing price context** - Users can quickly see current asset values
3. **Enabling customization** - Users control which sections they want to see
4. **Maintaining clean design** - Removed redundant text and percentage displays