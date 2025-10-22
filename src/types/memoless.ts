export interface MemolessAsset {
  asset: string;
  status: string;
  decimals: number;
  priceUSD: number;
  balanceRune: number;
  isToken: boolean;
}

export interface MemolessRegistration {
  asset: string;
  memo: string;
  reference: string;
  height: string;
  registrationHash: string;
  registeredBy: string;
}

export interface InboundAddress {
  chain: string;
  pub_key: string;
  address: string;
  router?: string;
  halted: boolean;
  global_trading_paused: boolean;
  chain_trading_paused: boolean;
  chain_lp_actions_paused: boolean;
  observed_fee_rate: string;
  gas_rate: string;
  gas_rate_units: string;
  outbound_tx_size: string;
  outbound_fee: string;
  dust_threshold: string;
}

export interface AmountValidationResult {
  isValid: boolean;
  processedInput: string;
  finalAmount: string;
  equivalentUSD: string;
  warnings: string[];
  errors: string[];
}

export interface QRCodeData {
  chain: string;
  address: string;
  amount: string;
  qrString: string;
  qrCodeDataURL?: string; // Base64 data URL of the QR code image
}

export interface MemolessFlowState {
  step: number;
  asset?: string;
  memo?: string;
  registrationTxId?: string;
  referenceData?: MemolessRegistration;
  memoCheck?: MemoCheckResponse;
  inboundAddress?: string;
  dustThreshold?: number;
  amount?: string;
  qrData?: QRCodeData;
  userTxId?: string;
}

export interface RegistrationConfirmation {
  asset: string;
  memo: string;
  runeBalance: string;
  transactionFee: string;
  confirmed: boolean;
}

export interface MemoCheckResponse {
  reference: string;
  available: boolean;
  expires_at: string;
  usage_count: string;
  max_use: string;
  can_register: boolean;
  memo: string;
}