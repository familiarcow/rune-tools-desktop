/**
 * MemoCreationService - THORChain Memo Generation
 * 
 * Service for generating THORChain memos for different operation types:
 * - Deposit: Trade or secured account deposits
 * - Custom: User-defined memos
 */

export type MemoType = 'custom' | 'deposit'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface ParsedMemo {
  type: MemoType
  originalMemo: string
  params: any
}

// Memo Parameter Interfaces
export interface DepositMemoParams {
  type: 'trade' | 'secured' // Deposit type
  address: string // Account address
}

export interface CustomMemoParams {
  memo: string // Raw memo string
}

export type MemoParams = DepositMemoParams | CustomMemoParams

export class MemoCreationService {
  private static instance: MemoCreationService | null = null

  static getInstance(): MemoCreationService {
    if (!MemoCreationService.instance) {
      MemoCreationService.instance = new MemoCreationService()
    }
    return MemoCreationService.instance
  }

  private constructor() {
    console.log('🔧 MemoCreationService initialized')
  }


  /**
   * Generate memo based on type and parameters
   */
  generateMemo(type: MemoType, params: MemoParams): string {
    switch (type) {
      case 'deposit':
        return this.generateDepositMemo(params as DepositMemoParams)
      case 'custom':
        return (params as CustomMemoParams).memo
      default:
        throw new Error(`Unsupported memo type: ${type}`)
    }
  }

  /**
   * Generate a unified DEPOSIT memo
   * Format: TRADE+:ADDR or SECURE+:ADDR
   */
  generateDepositMemo(params: DepositMemoParams): string {
    if (params.type === 'trade') {
      return `TRADE+:${params.address}`
    } else {
      return `SECURE+:${params.address}`
    }
  }

  /**
   * Validate memo parameters for a given type
   */
  validateMemoParams(type: MemoType, params: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      switch (type) {
        case 'deposit':
          this.validateDepositParams(params, errors, warnings)
          break
        case 'custom':
          this.validateCustomParams(params, errors, warnings)
          break
        default:
          errors.push(`Invalid memo type: ${type}`)
      }
    } catch (error) {
      errors.push(`Validation error: ${(error as Error).message}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }


  private validateDepositParams(params: DepositMemoParams, errors: string[], warnings: string[]): void {
    if (!params.address) {
      errors.push('Account address is required')
    } else if (!this.isValidThorAddress(params.address)) {
      errors.push('Invalid THORChain address format')
    }

    if (!params.type || !['trade', 'secured'].includes(params.type)) {
      errors.push('Deposit type must be either "trade" or "secured"')
    }
  }

  private validateCustomParams(params: CustomMemoParams, errors: string[], warnings: string[]): void {
    if (!params.memo || params.memo.trim().length === 0) {
      errors.push('Custom memo cannot be empty')
    }

    if (params.memo && params.memo.length > 250) {
      warnings.push('Memo is quite long and may fail on some chains')
    }
  }

  /**
   * Parse a memo string to determine its type and extract parameters
   */
  parseMemo(memo: string): ParsedMemo | null {
    if (!memo || memo.trim().length === 0) {
      return null
    }

    const trimmedMemo = memo.trim()
    const parts = trimmedMemo.split(':')

    if (parts.length === 0) return null

    const action = parts[0].toUpperCase()

    try {
      switch (action) {
        case 'TRADE+':
        case 'SECURE+':
          return this.parseDepositMemo(trimmedMemo, parts, action)
        default:
          return {
            type: 'custom',
            originalMemo: trimmedMemo,
            params: { memo: trimmedMemo }
          }
      }
    } catch (error) {
      console.warn('Failed to parse memo:', error)
      return {
        type: 'custom',
        originalMemo: trimmedMemo,
        params: { memo: trimmedMemo }
      }
    }
  }


  private parseDepositMemo(memo: string, parts: string[], action: string): ParsedMemo {
    const params: DepositMemoParams = {
      type: action === 'TRADE+' ? 'trade' : 'secured',
      address: parts[1] || ''
    }

    return {
      type: 'deposit',
      originalMemo: memo,
      params
    }
  }

  // Validation helper methods
  private isValidAssetFormat(asset: string): boolean {
    if (!asset) return false
    const parts = asset.split('.')
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0
  }

  private isValidAddress(address: string): boolean {
    if (!address) return false
    // Basic length check - addresses vary by chain but are typically 20+ characters
    return address.length >= 20 && address.length <= 100
  }

  private isValidThorAddress(address: string): boolean {
    if (!address) return false
    // THORChain addresses start with 'thor' or 'sthor' (stagenet)
    return (address.startsWith('thor') || address.startsWith('sthor')) && address.length >= 40
  }

  /**
   * Get display name for memo type
   */
  getMemoTypeDisplayName(type: MemoType): string {
    switch (type) {
      case 'custom':
        return 'Custom Memo'
      case 'deposit':
        return 'Deposit'
      default:
        return 'Unknown'
    }
  }

  /**
   * Get description for memo type
   */
  getMemoTypeDescription(type: MemoType): string {
    switch (type) {
      case 'custom':
        return 'Enter your own memo string'
      case 'deposit':
        return 'Deposit assets to account'
      default:
        return ''
    }
  }
}