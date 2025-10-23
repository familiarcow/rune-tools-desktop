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