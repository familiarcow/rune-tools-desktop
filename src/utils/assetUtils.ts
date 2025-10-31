/**
 * Asset Utility Functions
 * 
 * Provides universal asset amount conversion and formatting utilities
 * for THORChain assets across the entire application.
 * 
 * IMPORTANT UNIT TYPES:
 * - NORMALIZED UNITS: Human-readable amounts (e.g., "0.0001" RUNE, "1.5" BTC)
 * - BASE UNITS: Blockchain amounts (e.g., "10000" for 0.0001 RUNE, using 1e8 scaling)
 * 
 * WHEN IMPLEMENTING:
 * - User input is ALWAYS in NORMALIZED UNITS
 * - Balance display is ALWAYS in NORMALIZED UNITS  
 * - Blockchain transactions require BASE UNITS
 * - API responses may contain either - CHECK THE SOURCE!
 */

/**
 * Convert NORMALIZED UNITS to BASE UNITS for blockchain transactions
 * THORChain uses 1e8 base units for all assets (like Bitcoin's satoshis)
 * 
 * INPUT: NORMALIZED UNITS (user-facing amounts)
 * OUTPUT: BASE UNITS (blockchain amounts)
 * 
 * @param amount - NORMALIZED amount as string (e.g., "0.0001")
 * @param asset - Asset identifier (e.g., "THOR.RUNE", "BTC.BTC", "ETH.ETH")  
 * @returns BASE UNITS as string (e.g., "10000" for 0.0001 RUNE)
 */
export function convertToBaseUnits(amount: string, asset?: string): string {
  const amountFloat = parseFloat(amount)
  
  if (isNaN(amountFloat) || amountFloat < 0) {
    throw new Error(`Invalid amount: ${amount}`)
  }
  
  // THORChain uses 1e8 base units for all assets
  // This matches Bitcoin's satoshi system and is used consistently across THORChain
  const baseUnits = Math.floor(amountFloat * 1e8)
  return baseUnits.toString()
}

/**
 * Convert BASE UNITS to NORMALIZED UNITS for display
 * 
 * INPUT: BASE UNITS (blockchain amounts)
 * OUTPUT: NORMALIZED UNITS (user-facing amounts)
 * 
 * @param baseUnits - BASE UNITS as string (e.g., "10000")
 * @param asset - Asset identifier (for future asset-specific formatting)
 * @returns NORMALIZED amount as string (e.g., "0.0001")
 */
export function convertFromBaseUnits(baseUnits: string, asset?: string): string {
  const baseUnitsFloat = parseFloat(baseUnits)
  
  if (isNaN(baseUnitsFloat) || baseUnitsFloat < 0) {
    throw new Error(`Invalid base units: ${baseUnits}`)
  }
  
  // Convert from base units (1e8) to normalized amount
  const normalizedAmount = baseUnitsFloat / 1e8
  return normalizedAmount.toString()
}

/**
 * Format NORMALIZED UNITS for display with appropriate precision
 * 
 * INPUT: NORMALIZED UNITS (user-facing amounts)
 * OUTPUT: Formatted NORMALIZED UNITS (cleaned up for display)
 * 
 * @param amount - NORMALIZED amount as string
 * @param asset - Asset identifier (for future asset-specific formatting)
 * @returns Formatted NORMALIZED amount string
 */
export function formatAmount(amount: string, asset?: string): string {
  const amountFloat = parseFloat(amount)
  
  if (isNaN(amountFloat)) {
    return amount
  }
  
  if (amountFloat === 0) return '0'
  
  // Use up to 8 decimal places to match base unit precision
  // Remove trailing zeros for cleaner display
  return amountFloat.toFixed(8).replace(/\.?0+$/, '')
}

/**
 * Format amount with asset symbol for display
 * 
 * @param amount - Normalized amount as string
 * @param asset - Asset identifier (e.g., "THOR.RUNE")
 * @returns Formatted amount with symbol (e.g., "0.0001 RUNE")
 */
export function formatAmountWithSymbol(amount: string, asset: string): string {
  const formattedAmount = formatAmount(amount)
  const symbol = getAssetSymbol(asset)
  return `${formattedAmount} ${symbol}`
}

/**
 * Extract asset symbol from asset identifier
 * 
 * @param asset - Asset identifier (e.g., "THOR.RUNE", "BTC.BTC")
 * @returns Asset symbol (e.g., "RUNE", "BTC")
 */
export function getAssetSymbol(asset: string): string {
  if (asset === 'THOR.RUNE' || asset === 'RUNE') {
    return 'RUNE'
  }
  
  // For other assets, extract the part after the dot
  const parts = asset.split('.')
  return parts.length > 1 ? parts[1] : asset
}

/**
 * Get asset denomination for blockchain transactions
 * 
 * @param asset - Asset identifier
 * @returns Asset denomination for cosmos transactions
 */
export function getAssetDenom(asset: string): string {
  if (asset === 'THOR.RUNE' || asset === 'RUNE') {
    return 'rune'
  } else if (asset.startsWith('THOR.')) {
    return asset.toLowerCase().replace('.', '/')
  } else {
    // Secured assets use exact format (e.g., 'BTC.BTC', 'ETH.ETH')
    return asset
  }
}

/**
 * Validate amount input string
 * 
 * @param amount - Amount string to validate
 * @returns True if valid, false otherwise
 */
export function isValidAmount(amount: string): boolean {
  if (!amount || amount.trim() === '') return false
  
  const num = parseFloat(amount)
  return !isNaN(num) && num > 0 && isFinite(num)
}

/**
 * Check if amount is dust (too small to be meaningful)
 * 
 * @param amount - Normalized amount as string
 * @param asset - Asset identifier
 * @returns True if amount is dust
 */
export function isDustAmount(amount: string, asset: string): boolean {
  const num = parseFloat(amount)
  if (isNaN(num)) return true
  
  // Consider amounts less than 1 base unit as dust
  return num < (1 / 1e8)
}

/**
 * Converts an asset name to its display format
 * Format: {Chain}.{Asset}-{contract} or {Chain}-{Asset}-{contract} → {Asset} ({Chain})
 * 
 * Examples:
 * - BTC.BTC → BTC (BTC)
 * - GAIA.ATOM → ATOM (GAIA)
 * - BASE.CBBTC-0XCBB7C0000AB88B473B1F5AFD9EF808440EED33BF → CBBTC (BASE)
 * - BASE-CBBTC-0XCBB7C0000AB88B473B1F5AFD9EF808440EED33BF → CBBTC (BASE)
 * 
 * @param asset - The full asset name from the API (dot or dash format)
 * @returns The formatted display name
 */
export function AssetDisplayName(asset: string): string {
  if (!asset || typeof asset !== 'string') {
    return 'Unknown Asset';
  }

  // Handle dot format: {Chain}.{Asset}-{contract}
  const dotIndex = asset.indexOf('.');
  if (dotIndex !== -1) {
    const chain = asset.substring(0, dotIndex);
    const assetPart = asset.substring(dotIndex + 1);

    // Remove contract address if present (everything after the last dash)
    const dashIndex = assetPart.lastIndexOf('-');
    const assetName = dashIndex !== -1 ? assetPart.substring(0, dashIndex) : assetPart;

    return `${assetName} (${chain})`;
  }

  // Handle dash format: {Chain}-{Asset}-{contract}
  // Split by dashes and assume first part is chain, second is asset, rest is contract
  const parts = asset.split('-');
  if (parts.length >= 2) {
    const chain = parts[0];
    const assetName = parts[1];
    return `${assetName} (${chain})`;
  }

  // No separator found, return as-is
  return asset;
}

/**
 * Formats a number to a specific number of decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0.00';
  }
  return value.toFixed(decimals);
}

/**
 * Formats a value from 1e8 format to decimal with specified decimal places
 * @param value - The value in 1e8 format (as string or number)
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted decimal string
 */
export function formatFromE8(value: string | number, decimals: number = 2): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || numValue === null || numValue === undefined) {
    return '0.00';
  }
  const decimalValue = numValue / 1e8;
  return formatNumber(decimalValue, decimals);
}

/**
 * Formats a USD value with currency symbol
 * @param value - The USD value
 * @returns Formatted USD string (e.g., "$1,234.56")
 */
export function formatUSD(value: number): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Formats large numbers with appropriate suffixes (K, M, B, T)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number string with suffix
 */
export function formatLargeNumber(value: number, decimals: number = 1): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e12) {
    return sign + formatNumber(absValue / 1e12, decimals) + 'T';
  } else if (absValue >= 1e9) {
    return sign + formatNumber(absValue / 1e9, decimals) + 'B';
  } else if (absValue >= 1e6) {
    return sign + formatNumber(absValue / 1e6, decimals) + 'M';
  } else if (absValue >= 1e3) {
    return sign + formatNumber(absValue / 1e3, decimals) + 'K';
  } else {
    return sign + formatNumber(absValue, decimals);
  }
}