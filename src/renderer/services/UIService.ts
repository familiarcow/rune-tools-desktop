/**
 * UI Service - User Interface Management
 * 
 * Handles toasts, modals, loading states, and other UI interactions
 */

export class UIService {
    private name: string = 'UIService'
    private isInitialized: boolean = false
    private toastContainer?: HTMLElement
    private modalContainer?: HTMLElement
    private loadingOverlay?: HTMLElement

    constructor() {
        console.log('🎨 UIService created')
    }

    async initialize(): Promise<boolean> {
        try {
            console.log('UIService initializing...')
            
            // Get UI containers
            this.toastContainer = document.getElementById('toastContainer') || undefined
            this.modalContainer = document.getElementById('modalContainer') || undefined
            this.loadingOverlay = document.getElementById('loadingOverlay') || undefined
            
            this.isInitialized = true
            console.log('✅ UIService initialized')
            return true
        } catch (error) {
            console.error('❌ Failed to initialize UIService:', error)
            throw error
        }
    }

    // Toast notifications - now creates its own container if not found
    showToast(type: 'success' | 'error' | 'warning' | 'info', message: string, duration: number = 5000): void {
        console.log(`Toast ${type}: ${message}`)
        
        // Create notification container if it doesn't exist
        let container = document.getElementById('notification-container')
        if (!container) {
            container = document.createElement('div')
            container.id = 'notification-container'
            container.style.position = 'fixed'
            container.style.top = '20px'
            container.style.right = '20px'
            container.style.zIndex = '2000'
            document.body.appendChild(container)
        }

        const notification = document.createElement('div')
        notification.className = `notification ${type}`
        notification.textContent = message
        
        container.appendChild(notification)

        // Show animation
        setTimeout(() => notification.classList.add('show'), 100)

        // Auto remove
        if (duration > 0) {
            setTimeout(() => this.removeToast(notification), duration)
        }
    }

    private removeToast(notification: HTMLElement): void {
        notification.classList.remove('show')
        setTimeout(() => notification.remove(), 300)
    }

    // Modal dialogs
    async showModal(config: any): Promise<any> {
        console.log('showModal:', config)
        return new Promise((resolve) => {
            // Mock implementation
            setTimeout(() => resolve(true), 100)
        })
    }

    hideModal(modalId?: string): void {
        console.log('hideModal:', modalId)
        // Mock implementation
    }

    // Confirmation dialogs
    async confirm(message: string, title: string = 'Confirm'): Promise<boolean> {
        return new Promise((resolve) => {
            const result = window.confirm(`${title}\n\n${message}`)
            resolve(result)
        })
    }

    // Loading states
    showLoading(text: string = 'Loading...'): void {
        if (this.loadingOverlay) {
            const loadingText = this.loadingOverlay.querySelector('.loading-text')
            if (loadingText) {
                loadingText.textContent = text
            }
            this.loadingOverlay.style.display = 'flex'
        }
    }

    hideLoading(): void {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none'
        }
    }

    // Element-specific loading
    showElementLoading(element: HTMLElement, text?: string): void {
        element.style.opacity = '0.5'
        element.style.pointerEvents = 'none'
        
        if (text) {
            element.setAttribute('data-original-text', element.textContent || '')
            element.textContent = text
        }
    }

    hideElementLoading(element: HTMLElement): void {
        element.style.opacity = ''
        element.style.pointerEvents = ''
        
        const originalText = element.getAttribute('data-original-text')
        if (originalText) {
            element.textContent = originalText
            element.removeAttribute('data-original-text')
        }
    }

    // Theme management
    setTheme(theme: 'dark' | 'light'): void {
        document.documentElement.setAttribute('data-theme', theme)
        console.log('Theme set to:', theme)
    }

    // Notification methods (aliases for showToast)
    showSuccess(message: string, duration?: number): void {
        this.showToast('success', message, duration)
    }

    showError(message: string, duration?: number): void {
        this.showToast('error', message, duration)
    }

    showWarning(message: string, duration?: number): void {
        this.showToast('warning', message, duration)
    }

    showInfo(message: string, duration?: number): void {
        this.showToast('info', message, duration)
    }

    // Element visibility management
    showElement(elementId: string): void {
        const element = document.getElementById(elementId)
        if (element) {
            element.classList.remove('hidden')
            element.style.display = ''
        } else {
            console.warn(`Element not found: ${elementId}`)
        }
    }

    hideElement(elementId: string): void {
        const element = document.getElementById(elementId)
        if (element) {
            element.classList.add('hidden')
        } else {
            console.warn(`Element not found: ${elementId}`)
        }
    }

    // Toggle element visibility
    toggleElement(elementId: string): void {
        const element = document.getElementById(elementId)
        if (element) {
            if (element.classList.contains('hidden')) {
                this.showElement(elementId)
            } else {
                this.hideElement(elementId)
            }
        }
    }

    getName(): string {
        return this.name
    }

    getIsInitialized(): boolean {
        return this.isInitialized
    }
}