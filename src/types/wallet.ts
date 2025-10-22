export interface WalletInfo {
  address: string;
  publicKey: string;
  mnemonic: string;
}

export interface Balance {
  asset: string;
  amount: string;
}

export interface TradeAccountPosition {
  asset: string;
  units: string;
  last_add_height: string;
  last_withdraw_height: string;
}

export interface TradeAccount {
  owner: string;
  asset: string;
  units: string;
  last_add_height: string;
  last_withdraw_height: string;
}

export interface ThorchainNode {
  address: string;
  bond: string;
  status: string;
}