/**
 * Utils - Utility Functions
 * 
 * Helper functions used throughout the application
 */

export class Utils {
    private name: string = 'Utils'

    constructor() {
        console.log('🛠️ Utils created')
    }

    async initialize(): Promise<boolean> {
        console.log('✅ Utils initialized')
        return true
    }

    // Address formatting
    formatAddress(address: string, length: number = 8): string {
        if (!address) return 'N/A'
        if (address.length <= length * 2) return address
        
        return `${address.slice(0, length)}...${address.slice(-length)}`
    }

    // Network information
    getNetworkInfo(network: 'mainnet' | 'stagenet'): { name: string; color: string; dot: string } {
        switch (network) {
            case 'mainnet':
                return {
                    name: 'Mainnet',
                    color: '#51cf66',
                    dot: 'mainnet'
                }
            case 'stagenet':
                return {
                    name: 'Stagenet', 
                    color: '#ffa726',
                    dot: 'stagenet'
                }
            default:
                return {
                    name: 'Unknown',
                    color: '#888',
                    dot: ''
                }
        }
    }

    // Number formatting
    formatNumber(num: number, decimals: number = 2): string {
        if (num === 0) return '0'
        if (num < 0.01) return '< 0.01'
        
        return num.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals
        })
    }

    // Currency formatting
    formatCurrency(amount: number, currency: string = 'USD'): string {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount)
    }

    // Time formatting
    formatTime(timestamp: string | number): string {
        const date = new Date(timestamp)
        return date.toLocaleString()
    }

    formatTimeAgo(timestamp: string | number): string {
        const now = Date.now()
        const then = new Date(timestamp).getTime()
        const diff = now - then
        
        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)
        
        if (days > 0) return `${days}d ago`
        if (hours > 0) return `${hours}h ago`
        if (minutes > 0) return `${minutes}m ago`
        return `${seconds}s ago`
    }

    // Copy to clipboard
    async copyToClipboard(text: string): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch (error) {
            console.error('Failed to copy to clipboard:', error)
            return false
        }
    }

    // Generate random ID
    generateId(prefix: string = 'id'): string {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
    }

    // Debounce function
    debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout
        
        return (...args: Parameters<T>) => {
            clearTimeout(timeout)
            timeout = setTimeout(() => func.apply(this, args), wait)
        }
    }

    // Throttle function
    throttle<T extends (...args: any[]) => any>(
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void {
        let inThrottle: boolean
        
        return (...args: Parameters<T>) => {
            if (!inThrottle) {
                func.apply(this, args)
                inThrottle = true
                setTimeout(() => inThrottle = false, limit)
            }
        }
    }

    // Deep clone object
    deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj))
    }

    // Wait/sleep function
    sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    getName(): string {
        return this.name
    }
}