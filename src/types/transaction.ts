export interface Coin {
  denom: string;
  amount: string;
}

export interface MsgSendValue {
  fromAddress: string;
  toAddress: string;
  amount: Coin[];
}

export interface MsgDepositValue {
  coins: Coin[];
  memo: string;
  signer: string;
}

export interface TransactionMessage {
  typeUrl: string;
  value: MsgSendValue | MsgDepositValue;
}

export interface TransactionFee {
  amount: Coin[];
  gas: string;
}

export interface TransactionParams {
  asset: string;
  amount: string;
  memo?: string;
  toAddress?: string; // Required for MsgSend, not used for MsgDeposit
  useMsgDeposit?: boolean;
}

export interface TransactionResponse {
  code: number;
  transactionHash: string;
  rawLog?: string;
  events?: any[];
}

export interface PreparedTransaction {
  message: TransactionMessage;
  coin: Coin;
  denom: string;
}