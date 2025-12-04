/**
 * LP Service - Liquidity Position Value Calculations
 * 
 * Handles fetching and calculating USD value of user's liquidity positions
 * across all THORChain pools using Midgard API and pool data.
 */

export interface LiquidityPosition {
    pool: string
    liquidityUnits: string
    assetAddress: string
    runeAddress: string
    assetAdded: string
    runeAdded: string
    assetDeposit: string
    runeDeposit: string
    dateFirstAdded: string
    dateLastAdded: string
}

export interface MidgardMemberResponse {
    pools: LiquidityPosition[]
}

export interface PoolData {
    asset: string
    balance_rune: string
    pool_units: string
    LP_units: string
    synth_units: string
}

export interface LpPositionValue {
    pool: string
    liquidityUnits: string
    userShareOfPool: number
    poolTotalLiquidityInRune: number
    userLiquidityInRune: number
    userLiquidityInUsd: number
}

export class LpService {
    private static instance: LpService
    
    public static getInstance(): LpService {
        if (!LpService.instance) {
            LpService.instance = new LpService()
        }
        return LpService.instance
    }

    /**
     * Get user's liquidity positions from Midgard
     */
    async getUserLiquidityPositions(address: string, network: 'mainnet' | 'stagenet'): Promise<LiquidityPosition[]> {
        try {
            const baseUrl = network === 'mainnet' 
                ? 'https://midgard.ninerealms.com'
                : 'https://stagenet-midgard.ninerealms.com'
            
            const response = await fetch(`${baseUrl}/v2/member/${address}`)
            
            if (!response.ok) {
                console.log(`LP positions not found for address ${address}`)
                return []
            }
            
            const data: MidgardMemberResponse = await response.json()
            return data.pools || []
            
        } catch (error) {
            console.error('Error fetching LP positions:', error)
            return []
        }
    }

    /**
     * Get pool data from THORNode
     */
    async getPoolsData(network: 'mainnet' | 'stagenet'): Promise<PoolData[]> {
        try {
            const baseUrl = network === 'mainnet' 
                ? 'https://thornode.ninerealms.com'
                : 'https://stagenet-thornode.ninerealms.com'
            
            const response = await fetch(`${baseUrl}/thorchain/pools`)
            
            if (!response.ok) {
                throw new Error(`Failed to fetch pools data: ${response.status}`)
            }
            
            const pools: PoolData[] = await response.json()
            return pools
            
        } catch (error) {
            console.error('Error fetching pools data:', error)
            return []
        }
    }

    /**
     * Calculate USD value of user's liquidity positions
     */
    async calculateLpUsdValue(
        address: string, 
        network: 'mainnet' | 'stagenet', 
        runeUsdPrice: number
    ): Promise<{ totalUsdValue: number, positions: LpPositionValue[] }> {
        try {
            console.log('🏊‍♂️ Calculating LP USD value for:', { address, network, runeUsdPrice })
            
            // Get user's liquidity positions
            const userPositions = await this.getUserLiquidityPositions(address, network)
            if (userPositions.length === 0) {
                console.log('No LP positions found for user')
                return { totalUsdValue: 0, positions: [] }
            }
            
            console.log(`Found ${userPositions.length} LP positions:`, userPositions.map(p => p.pool))
            
            // Get current pool data
            const poolsData = await this.getPoolsData(network)
            if (poolsData.length === 0) {
                console.log('No pools data available')
                return { totalUsdValue: 0, positions: [] }
            }
            
            const positionValues: LpPositionValue[] = []
            let totalUsdValue = 0
            
            // Calculate value for each position
            for (const position of userPositions) {
                const poolData = poolsData.find(pool => pool.asset === position.pool)
                
                if (!poolData) {
                    console.log(`Pool data not found for ${position.pool}`)
                    continue
                }
                
                // Calculate position value
                const positionValue = this.calculatePositionValue(position, poolData, runeUsdPrice)
                positionValues.push(positionValue)
                totalUsdValue += positionValue.userLiquidityInUsd
                
                console.log(`LP Position ${position.pool}:`, {
                    userShare: `${(positionValue.userShareOfPool * 100).toFixed(4)}%`,
                    runeValue: positionValue.userLiquidityInRune.toFixed(2),
                    usdValue: `$${positionValue.userLiquidityInUsd.toFixed(2)}`
                })
            }
            
            console.log(`✅ Total LP USD Value: $${totalUsdValue.toFixed(2)}`)
            
            return { totalUsdValue, positions: positionValues }
            
        } catch (error) {
            console.error('Error calculating LP USD value:', error)
            return { totalUsdValue: 0, positions: [] }
        }
    }

    /**
     * Calculate the USD value of a single liquidity position
     */
    private calculatePositionValue(
        position: LiquidityPosition, 
        poolData: PoolData, 
        runeUsdPrice: number
    ): LpPositionValue {
        // User's liquidity units
        const liquidityUnits = parseFloat(position.liquidityUnits)
        
        // Pool's total units = LP_units + synth_units
        const poolUnits = parseFloat(poolData.LP_units) + parseFloat(poolData.synth_units)
        
        // User's share of the pool = liquidityUnits / poolUnits
        const userShareOfPool = liquidityUnits / poolUnits
        
        // Pool's total liquidity in RUNE = balance_rune * 2 (since it's balanced 50/50)
        const poolTotalLiquidityInRune = parseFloat(poolData.balance_rune) / 1e8 * 2
        
        // User's liquidity in RUNE
        const userLiquidityInRune = poolTotalLiquidityInRune * userShareOfPool
        
        // User's liquidity in USD
        const userLiquidityInUsd = userLiquidityInRune * runeUsdPrice
        
        return {
            pool: position.pool,
            liquidityUnits: position.liquidityUnits,
            userShareOfPool,
            poolTotalLiquidityInRune,
            userLiquidityInRune,
            userLiquidityInUsd
        }
    }
}