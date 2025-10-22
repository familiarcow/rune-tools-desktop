import { Writer, Reader } from 'protobufjs';
import { MsgDepositValue } from '../types/transaction';

export const MsgDeposit = {
  typeUrl: "/types.MsgDeposit",
  
  encode(message: MsgDepositValue, writer?: Writer): Writer {
    if (!writer) {
      writer = Writer.create();
    }

    // Encode coins array
    if (message.coins && message.coins.length > 0) {
      for (const coin of message.coins) {
        // Write coin as individual fields
        writer.uint32(10).fork();
        writer.uint32(10).string(coin.denom);
        writer.uint32(18).string(coin.amount);
        writer.ldelim();
      }
    }

    // Encode memo
    if (message.memo && message.memo !== "") {
      writer.uint32(18).string(message.memo);
    }

    // Encode signer as string (THORChain address)
    if (message.signer) {
      writer.uint32(26).string(String(message.signer));
    }

    return writer;
  },

  decode(input: Uint8Array | Reader, length?: number): MsgDepositValue {
    const reader = input instanceof Uint8Array ? Reader.create(input) : input;
    let end = length === undefined ? reader.len : reader.pos + length;
    const message: MsgDepositValue = { coins: [], memo: "", signer: "" };

    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          // Decode coin
          const coinLength = reader.uint32();
          const coinEnd = reader.pos + coinLength;
          const coin = { denom: "", amount: "" };
          
          while (reader.pos < coinEnd) {
            const coinTag = reader.uint32();
            switch (coinTag >>> 3) {
              case 1:
                coin.denom = reader.string();
                break;
              case 2:
                coin.amount = reader.string();
                break;
              default:
                reader.skipType(coinTag & 7);
                break;
            }
          }
          message.coins.push(coin);
          break;
        case 2:
          message.memo = reader.string();
          break;
        case 3:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }

    return message;
  },

  fromJSON(object: any): MsgDepositValue {
    return {
      coins: Array.isArray(object?.coins) ? object.coins.map((coin: any) => ({
        amount: String(coin.amount),
        denom: String(coin.denom)
      })) : [],
      memo: String(object.memo || ""),
      signer: String(object.signer || "")
    };
  },

  toJSON(message: MsgDepositValue): any {
    const obj: any = {};
    if (message.coins && message.coins.length) {
      obj.coins = message.coins.map(coin => ({
        amount: coin.amount,
        denom: coin.denom
      }));
    }
    if (message.memo !== "") {
      obj.memo = message.memo;
    }
    if (message.signer !== "") {
      obj.signer = message.signer;
    }
    return obj;
  },

  fromPartial(object: Partial<MsgDepositValue>): MsgDepositValue {
    return {
      coins: object.coins?.map(coin => ({
        amount: String(coin.amount),
        denom: String(coin.denom)
      })) || [],
      memo: String(object.memo || ""),
      signer: String(object.signer || "")
    };
  },

  create(base?: Partial<MsgDepositValue>): MsgDepositValue {
    return this.fromPartial(base || {});
  }
};