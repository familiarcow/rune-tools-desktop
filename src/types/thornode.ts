// THORNode API response interfaces

// Raw Pool interface from THORNode API
export interface RawPool {
  asset: string;
  short_code?: string;
  status: string;
  decimal: string;
  pending_inbound_asset: string;
  pending_inbound_rune: string;
  balance_asset: string;
  balance_rune: string;
  pool_units: string;
  LP_units: string;
  synth_units: string;
  synth_supply: string;
  savers_depth: string;
  savers_units: string;
  synth_mint_paused: boolean;
  synth_supply_remaining: string;
  loan_collateral: string;
  loan_collateral_remaining: string;
  loan_cr: string;
  derived_depth_bps: string;
  volume24h: string;
  volume24h_usd?: string;
  fees24h: string;
  fees24h_usd?: string;
  apr?: string;
  apy?: string;
  liquidity_apr?: string;
  liquidity_apy?: string;
  savers_apr?: string;
  savers_apy?: string;
  earnings?: string;
  earnings_annual?: string;
  pool_slip_average?: string;
  pool_slip_average_24h?: string;
  asset_tor_price: string;
  savers_fill_bps: string;
  savers_capacity_remaining: string;
  trading_halted: boolean;
}

// Cleaned Pool interface with normalized numeric values
export interface Pool {
  asset: string;
  short_code?: string;
  status: string;
  decimal: number;
  pending_inbound_asset: number;
  pending_inbound_rune: number;
  balance_asset: number; // Normalized from raw value / 1e8
  balance_rune: number;
  pool_units: number;
  LP_units: number;
  synth_units: number;
  synth_supply: number;
  savers_depth: number;
  savers_units: number;
  synth_mint_paused: boolean;
  synth_supply_remaining: number;
  loan_collateral: number;
  loan_collateral_remaining: number;
  loan_cr: number;
  derived_depth_bps: number;
  volume24h: number;
  volume24h_usd?: number;
  fees24h: number;
  fees24h_usd?: number;
  apr?: number;
  apy?: number;
  liquidity_apr?: number;
  liquidity_apy?: number;
  savers_apr?: number;
  savers_apy?: number;
  earnings?: number;
  earnings_annual?: number;
  pool_slip_average?: number;
  pool_slip_average_24h?: number;
  asset_price_usd: number; // Normalized from asset_tor_price / 1e8
  savers_fill_bps: number;
  savers_capacity_remaining: number;
  trading_halted: boolean;
}

export interface NetworkInfo {
  bond_reward_rune: string;
  total_bond_units: string;
  total_reserve: string;
  vaults_migrating: boolean;
  gas_spent_rune: string;
  gas_withheld_rune: string;
  outbound_gas_spent_rune: string;
  outbound_gas_withheld_rune: string;
  next_churn_height: string;
  pool_activation_countdown: string;
  pool_cycle_length: string;
  min_rune_pool_depth: string;
  max_anchor_slip: string;
  max_anchor_blocks: string;
  current_height?: string;
  rune_price_in_tor: string;
  tor_price_in_rune: string;
}

export interface OraclePrice {
  symbol: string;
  price: string;
}

export interface PoolsResponse {
  pools: Pool[];
}

export interface OraclePricesResponse {
  prices: OraclePrice[];
}

export interface SwapQuoteParams {
  from_asset: string;
  to_asset: string;
  amount: string | number;
  destination: string;
  refund_address?: string;
  streaming_interval?: number;
  streaming_quantity?: number;
  liquidity_tolerance_bps?: number;
  affiliate_bps?: number;
  affiliate?: string;
  height?: number;
}

export interface SwapQuoteFees {
  asset: string;
  affiliate: string;
  outbound: string;
  liquidity: string;
  total: string;
  slippage_bps: number;
  total_bps: number;
}

export interface SwapQuote {
  // Core fields that should always be present
  memo: string;
  expected_amount_out: string;
  fees: SwapQuoteFees;
  expiry: number;
  warning: string;
  notes: string;
  
  // Asset-specific fields (may vary based on swap type)
  asset?: string; // Target asset for some swap types
  inbound_address?: string; // For cross-chain swaps
  inbound_confirmation_blocks?: number;
  inbound_confirmation_seconds?: number;
  outbound_delay_blocks?: number;
  outbound_delay_seconds?: number;
  dust_threshold?: string;
  recommended_min_amount_in?: string;
  recommended_gas_rate?: string;
  gas_rate_units?: string;
  
  // Streaming swap fields
  max_streaming_quantity?: number;
  streaming_swap_blocks?: number;
  total_swap_seconds?: number;
  
  // Additional fields that might appear
  [key: string]: any; // Allow for additional fields not yet documented
}