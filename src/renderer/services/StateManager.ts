/**
 * State Manager - Application State Management
 * 
 * Centralized state management for the entire application
 */

interface AppState {
    phase: 'onboarding' | 'application'
    wallet?: any
    network: 'mainnet' | 'stagenet'
    activeTab: string
    isLoading: boolean
    settings: any
}

export class StateManager {
    private name: string = 'StateManager'
    private isInitialized: boolean = false
    private state: AppState
    private listeners: Map<string, Function[]> = new Map()

    constructor() {
        this.state = {
            phase: 'onboarding',
            network: 'mainnet',
            activeTab: 'wallet',
            isLoading: false,
            settings: {}
        }
        console.log('🗂️ StateManager created')
    }

    async initialize(): Promise<boolean> {
        try {
            console.log('StateManager initializing...')
            this.isInitialized = true
            console.log('✅ StateManager initialized')
            return true
        } catch (error) {
            console.error('❌ Failed to initialize StateManager:', error)
            throw error
        }
    }

    // State getters
    getState(key?: keyof AppState): any {
        if (key) {
            return this.state[key]
        }
        return { ...this.state }
    }

    getPhase(): 'onboarding' | 'application' {
        return this.state.phase
    }

    getWallet(): any {
        return this.state.wallet
    }

    getNetwork(): 'mainnet' | 'stagenet' {
        return this.state.network
    }

    getActiveTab(): string {
        return this.state.activeTab
    }

    // State setters
    setState(updates: Partial<AppState>): void {
        const oldState = { ...this.state }
        this.state = { ...this.state, ...updates }
        
        // Notify listeners
        for (const key of Object.keys(updates)) {
            this.notifyListeners(key as keyof AppState, updates[key as keyof AppState], oldState[key as keyof AppState])
        }
    }

    setPhase(phase: 'onboarding' | 'application'): void {
        this.setState({ phase })
    }

    setWallet(wallet: any): void {
        this.setState({ wallet })
    }

    setNetwork(network: 'mainnet' | 'stagenet'): void {
        this.setState({ network })
    }

    setActiveTab(tab: string): void {
        this.setState({ activeTab: tab })
    }

    updateSettings(settings: any): void {
        this.setState({ settings: { ...this.state.settings, ...settings } })
    }

    // Generic data setter for any key-value pairs
    setData(key: string, value: any): void {
        // Store in the settings object or create a dynamic state property
        if (key in this.state) {
            this.setState({ [key]: value } as Partial<AppState>)
        } else {
            // Store in settings for non-standard keys
            this.updateSettings({ [key]: value })
        }
    }

    // Generic data getter
    getData(key: string): any {
        if (key in this.state) {
            return this.state[key as keyof AppState]
        }
        return this.state.settings[key]
    }

    // Generic data clearer
    clearData(key: string): void {
        if (key in this.state) {
            this.setState({ [key]: undefined } as Partial<AppState>)
        } else {
            // Remove from settings
            const newSettings = { ...this.state.settings }
            delete newSettings[key]
            this.setState({ settings: newSettings })
        }
    }

    // Event listeners
    addListener(key: keyof AppState, listener: Function): void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, [])
        }
        this.listeners.get(key)!.push(listener)
    }

    removeListener(key: keyof AppState, listener: Function): void {
        const listeners = this.listeners.get(key)
        if (listeners) {
            const index = listeners.indexOf(listener)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }

    private notifyListeners(key: keyof AppState, newValue: any, oldValue: any): void {
        const listeners = this.listeners.get(key)
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(newValue, oldValue)
                } catch (error) {
                    console.error(`Error in state listener for ${key}:`, error)
                }
            })
        }
    }

    getName(): string {
        return this.name
    }

    getIsInitialized(): boolean {
        return this.isInitialized
    }
}