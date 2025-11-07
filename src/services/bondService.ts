/**
 * Bond Service
 * 
 * Manages THORChain node bonding operations:
 * - Bond discovery for user addresses
 * - Bond data fetching and calculations
 * - APY and reward calculations
 * - Node status monitoring
 */

export interface BondProvider {
    bond_address: string
    bond: string
}

export interface NodeData {
    node_address: string
    status: string
    bond_providers: {
        providers: BondProvider[]
        node_operator_fee: string
    }
    current_award: string
}

export interface BondNodeInfo {
    address: string
    addressSuffix: string
    status: string
    bond: number
    totalBond: number
    bondOwnershipPercentage: number
    award: number
    apy: number
    nodeOperatorFee: number
    bondFormatted: string
    bondFullAmount: number
}

export interface NetworkData {
    bondingAPY: number
    activeNodeCount: number
    standbyNodeCount: number
    totalActiveBond: number
    totalStandbyBond: number
    nextChurnHeight: number
    poolActivationCountdown: number
    poolShareFactor: number
}

export interface UserBondData {
    bondAddress: string
    totalBond: number
    totalAward: number
    aggregateAPY: number
    nodes: BondNodeInfo[]
    isMultiNode: boolean
}

export class BondService {
    private network: 'mainnet' | 'stagenet' = 'mainnet'
    private recentChurnTimestamp: number = 0

    constructor(network: 'mainnet' | 'stagenet' = 'mainnet') {
        this.network = network
    }

    setNetwork(network: 'mainnet' | 'stagenet'): void {
        this.network = network
    }

    private getBaseUrl(): string {
        return this.network === 'mainnet' 
            ? 'https://thornode.ninerealms.com'
            : 'https://stagenet-thornode.ninerealms.com'
    }

    private getMidgardUrl(): string {
        return this.network === 'mainnet'
            ? 'https://midgard.ninerealms.com'
            : 'https://stagenet-midgard.ninerealms.com'
    }

    private async fetchJSON(url: string): Promise<any> {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Failed to fetch data from ${url}: ${response.statusText}`)
        }
        return response.json()
    }

    private async fetchText(url: string): Promise<string> {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Failed to fetch data from ${url}: ${response.statusText}`)
        }
        return response.text()
    }

    private formatBondAmount(bondAmount: number): string {
        const runeAmount = bondAmount / 1e8
        if (runeAmount >= 1000000) {
            return Math.round(runeAmount / 1000000) + "M"
        } else if (runeAmount >= 1000) {
            return Math.round(runeAmount / 1000) + "k"
        } else {
            return Math.round(runeAmount).toString()
        }
    }

    async fetchUserBonds(bondAddress: string): Promise<UserBondData | null> {
        try {
            // Fetch bond data from midgard
            const bondData = await this.fetchJSON(`${this.getMidgardUrl()}/v2/bonds/${bondAddress}`)
            
            if (!bondData.nodes || bondData.nodes.length === 0) {
                return null // Not whitelisted on any nodes
            }

            // Process all nodes user is whitelisted for (regardless of bond size)
            const nodesWithBond = bondData.nodes

            // Fetch churn data for APY calculations
            await this.fetchChurnData()

            let bondNodeInfos: BondNodeInfo[] = []

            if (nodesWithBond.length === 1) {
                // Single node
                const singleNodeInfo = await this.fetchSingleNodeData(nodesWithBond[0].address, bondAddress)
                bondNodeInfos = [singleNodeInfo]
            } else {
                // Multiple nodes
                bondNodeInfos = await this.fetchMultiNodeData(nodesWithBond, bondAddress)
            }

            // Calculate totals
            const totalBond = bondNodeInfos.reduce((sum, node) => sum + node.bond, 0)
            const totalAward = bondNodeInfos.reduce((sum, node) => sum + node.award, 0)
            
            // Debug logging for small awards
            if (bondAddress === 'sthor1g6pnmnyeg48yc3lg796plt0uw50qpp7humfggz') {
                console.log('🔍 Aggregation Debug:', {
                    bondNodeInfos: bondNodeInfos.map(n => ({ address: n.address, award: n.award, bond: n.bond })),
                    totalBond,
                    totalAward,
                    totalAwardInRune: totalAward / 1e8
                })
            }
            
            // Calculate weighted average APY
            let weightedAPYSum = 0
            for (const node of bondNodeInfos) {
                const weight = node.bond / totalBond
                weightedAPYSum += node.apy * weight
            }

            return {
                bondAddress,
                totalBond,
                totalAward,
                aggregateAPY: weightedAPYSum,
                nodes: bondNodeInfos,
                isMultiNode: bondNodeInfos.length > 1
            }

        } catch (error) {
            console.error('Error fetching bond data:', error)
            throw error
        }
    }

    private async fetchChurnData(): Promise<void> {
        try {
            const churns = await this.fetchJSON(`${this.getMidgardUrl()}/v2/churns`)
            this.recentChurnTimestamp = Number(churns[0].date) / 1e9
        } catch (error) {
            console.error('Error fetching churn data:', error)
            // Use fallback timestamp if churn data is unavailable
            this.recentChurnTimestamp = Date.now() / 1000 - 86400 // 24 hours ago
        }
    }

    private async fetchSingleNodeData(nodeAddress: string, bondAddress: string): Promise<BondNodeInfo> {
        const nodeData = await this.fetchJSON(`${this.getBaseUrl()}/thorchain/node/${nodeAddress}`)
        return this.processNodeData(nodeData, bondAddress)
    }

    private async fetchMultiNodeData(nodes: any[], bondAddress: string): Promise<BondNodeInfo[]> {
        const nodeDataPromises = nodes.map(async (node: any) => {
            const nodeData = await this.fetchJSON(`${this.getBaseUrl()}/thorchain/node/${node.address}`)
            return this.processNodeData(nodeData, bondAddress)
        })

        return Promise.all(nodeDataPromises)
    }

    private processNodeData(nodeData: NodeData, bondAddress: string): BondNodeInfo {
        const bondProviders = nodeData.bond_providers.providers
        
        let userBond = 0
        let totalBond = 0
        
        for (const provider of bondProviders) {
            if (provider.bond_address === bondAddress) {
                userBond = Number(provider.bond)
            }
            totalBond += Number(provider.bond)
        }
        
        const bondOwnershipPercentage = userBond / totalBond
        const nodeOperatorFee = Number(nodeData.bond_providers.node_operator_fee) / 10000
        
        // Fix: Apply node operator fee AFTER calculating user's share
        // This matches the legacy implementation where fee is applied to the total award first
        const totalCurrentAward = Number(nodeData.current_award)
        const currentAwardAfterFee = totalCurrentAward * (1 - nodeOperatorFee)
        const userAward = bondOwnershipPercentage * currentAwardAfterFee
        
        // Debug logging for small awards
        if (bondAddress === 'sthor1g6pnmnyeg48yc3lg796plt0uw50qpp7humfggz') {
            console.log('🔍 Bond Award Debug:', {
                nodeAddress: nodeData.node_address,
                totalCurrentAward,
                nodeOperatorFee,
                currentAwardAfterFee,
                bondOwnershipPercentage,
                userAward,
                userBond,
                totalBond
            })
        }
        
        // Calculate APY based on time since last churn (matching legacy logic)
        const currentTime = Date.now() / 1000
        const timeDiff = currentTime - this.recentChurnTimestamp
        const timeDiffInYears = timeDiff / (60 * 60 * 24 * 365.25)
        
        // Debug logging for small awards
        if (bondAddress === 'sthor1g6pnmnyeg48yc3lg796plt0uw50qpp7humfggz') {
            console.log('🔍 APY Debug:', {
                recentChurnTimestamp: this.recentChurnTimestamp,
                currentTime,
                timeDiff,
                timeDiffInYears
            })
        }
        
        // Prevent division by zero and invalid calculations
        let apy = 0
        if (userBond > 0 && timeDiffInYears > 0 && userAward > 0) {
            const APR = userAward / userBond / timeDiffInYears
            // Use compound interest formula matching legacy: (1 + APR/365)^365 - 1
            apy = Math.pow(1 + APR / 365, 365) - 1
            
            // Sanitize extreme values
            if (!isFinite(apy) || apy < 0 || apy > 100) {
                apy = 0
            }
        }

        return {
            address: nodeData.node_address,
            addressSuffix: nodeData.node_address.slice(-4),
            status: nodeData.status,
            bond: userBond,
            totalBond,
            bondOwnershipPercentage,
            award: userAward,
            apy,
            nodeOperatorFee,
            bondFormatted: this.formatBondAmount(userBond),
            bondFullAmount: Math.round(userBond / 1e8)
        }
    }

    async getNextChurnInfo(): Promise<{ nextChurnTime: number; countdown: string }> {
        try {
            const churnIntervalText = await this.fetchText(
                `${this.getBaseUrl()}/thorchain/mimir/key/CHURNINTERVAL`
            )
            const churnInterval = Number(churnIntervalText)
            const churnIntervalSeconds = churnInterval * 6
            const nextChurnTime = this.recentChurnTimestamp + churnIntervalSeconds
            
            const now = Date.now() / 1000
            const secondsLeft = nextChurnTime - now
            
            let countdown = "Now!"
            if (secondsLeft > 0) {
                const days = Math.floor(secondsLeft / (3600 * 24))
                const hours = Math.floor((secondsLeft % (3600 * 24)) / 3600)
                const minutes = Math.floor((secondsLeft % 3600) / 60)
                countdown = `${days > 0 ? days + "d " : ""}${hours}h ${minutes}m`
            }

            return { nextChurnTime, countdown }
        } catch (error) {
            console.error('Error fetching churn interval:', error)
            return { nextChurnTime: 0, countdown: "Unknown" }
        }
    }

    async getRunePrice(): Promise<number> {
        try {
            const networkData = await this.fetchJSON(`${this.getBaseUrl()}/thorchain/network`)
            return networkData.rune_price_in_tor / 1e8
        } catch (error) {
            console.error('Error fetching RUNE price:', error)
            return 0
        }
    }

    async getBtcPrice(): Promise<number> {
        try {
            const btcPoolData = await this.fetchJSON(`${this.getBaseUrl()}/thorchain/pool/BTC.BTC`)
            const balanceAsset = btcPoolData.balance_asset
            const balanceRune = btcPoolData.balance_rune
            return balanceAsset / balanceRune
        } catch (error) {
            console.error('Error fetching BTC pool data:', error)
            return 0
        }
    }

    async getNodesByAddress(bondAddress: string): Promise<string[]> {
        try {
            const bondData = await this.fetchJSON(`${this.getMidgardUrl()}/v2/bonds/${bondAddress}`)
            if (!bondData.nodes) return []
            
            return bondData.nodes
                .filter((node: any) => Number(node.bond) > 1e8)
                .map((node: any) => node.address)
        } catch (error) {
            console.error('Error fetching nodes for address:', error)
            return []
        }
    }

    async canRemoveBond(nodeAddress: string): Promise<boolean> {
        try {
            const nodeData = await this.fetchJSON(`${this.getBaseUrl()}/thorchain/node/${nodeAddress}`)
            return nodeData.status === 'Standby'
        } catch (error) {
            console.error('Error checking node status:', error)
            return false
        }
    }

    async getNetworkData(): Promise<NetworkData> {
        try {
            const networkData = await this.fetchJSON(`${this.getMidgardUrl()}/v2/network`)
            
            return {
                bondingAPY: Number(networkData.bondingAPY),
                activeNodeCount: Number(networkData.activeNodeCount),
                standbyNodeCount: Number(networkData.standbyNodeCount),
                totalActiveBond: Number(networkData.bondMetrics?.totalActiveBond || 0),
                totalStandbyBond: Number(networkData.bondMetrics?.totalStandbyBond || 0),
                nextChurnHeight: Number(networkData.nextChurnHeight),
                poolActivationCountdown: Number(networkData.poolActivationCountdown),
                poolShareFactor: Number(networkData.poolShareFactor)
            }
        } catch (error) {
            console.error('Error fetching network data:', error)
            // Return defaults if network call fails
            return {
                bondingAPY: 0,
                activeNodeCount: 0,
                standbyNodeCount: 0,
                totalActiveBond: 0,
                totalStandbyBond: 0,
                nextChurnHeight: 0,
                poolActivationCountdown: 0,
                poolShareFactor: 0
            }
        }
    }
}