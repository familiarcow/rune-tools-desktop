Memoless is a THORChain feature to be able to register a memo so that it can detect the intent of a deposit based on the User's deposit amount rather than 
needing a memo with an L1 deposit.

First, we need to register an Asset & Memo with a MsgDeposit. 

Step 1
- Determine what the Memo we want to register is: {memoToRegister}.
- To start, we'll have the user just write the string for the {memoToRegister}. In a subsequent update, we'll automatically populate this using another service.

Step 2
- To Get the list of valid {assetToRegister}:
- Query `/pools` endpoint.
Eg
```
[
 {
    "asset": "GAIA.ATOM",
    "short_code": "g",
    "status": "Available",
    "decimals": 6,
    "pending_inbound_asset": "0",
    "pending_inbound_rune": "0",
    "balance_asset": "8564702836032",
    "balance_rune": "32134415450828",
    "asset_tor_price": "314404180",
    "pool_units": "17164769649849",
    "LP_units": "13121561100850",
    "synth_units": "4043208548999",
    "synth_supply": "4034878467080",
    "savers_depth": "3925393667635",
    "savers_units": "3070134681777",
    "savers_fill_bps": "0",
    "savers_capacity_remaining": "0",
    "synth_mint_paused": true,
    "synth_supply_remaining": "6242764936158",
    "loan_collateral": "0",
    "loan_collateral_remaining": "0",
    "loan_cr": "0",
    "derived_depth_bps": "9677",
    "trading_halted": false
  },
  {
    "asset": "AVAX.SOL-0XFE6B19286885A4F7F55ADAD09C3CD1F906D2478F",
    "status": "Available",
    "pending_inbound_asset": "0",
    "pending_inbound_rune": "0",
    "balance_asset": "38291225697",
    "balance_rune": "8406263764268",
    "asset_tor_price": "18834562349",
    "pool_units": "2810282227951",
    "LP_units": "2805246443473",
    "synth_units": "5035784478",
    "synth_supply": "137229178",
    "savers_depth": "0",
    "savers_units": "0",
    "savers_fill_bps": "0",
    "savers_capacity_remaining": "0",
    "synth_mint_paused": true,
    "synth_supply_remaining": "45812241658",
    "loan_collateral": "0",
    "loan_collateral_remaining": "0",
    "loan_cr": "0",
    "derived_depth_bps": "0",
    "trading_halted": false
  },
]
```
- Status must = Available
- Sort by descending `balance_rune`
- Remove any assets from the /pools list where chain = THOR (exclude all THOR chain assets completely)

- In this implementation, Tokens are not allowed. To check whether an asset is a token or not, we need to check the syntax.
    - Asset syntax in this format is is: `{chain}.{asset}-{contract}`
    - If there is a `-{contract}`  at the end of the "asset" string, the asset is a token
        - eg `BTC.BTC` and `GAIA.ATOM` are not tokens
        - `AVAX.SOL-0XFE6B19286885A4F7F55ADAD09C3CD1F906D2478F` is a token. Not a valid {assetToRegister}

- Let the user select their {assetToRegister} from a dropdown list

- Record the `asset_tor_price/1e8`. This is the asset's price in USD: `{inAssetPriceUSD}`
- Record the `decimals`: {inAssetDecimals}
    - If an asset does not have a defined `decimals` from the `/pools` response, set it to `8`

Step 3
- Create MsgDeposit transaction with Memo: `REFERENCE:{assetToRegister}:{memoToRegister}`
- Confirm the {assetToRegister} and {memoToRegister} with the user. Once confirmed, send the MsgDeposit transaction to register the memo.
- Return the TXID of the MsgDeposit: {MsgDepositTXID}

Step 4
- Check the reference ID of the memo using this endpoint: `/thorchain/memo/{MsgDepositTXID}`
- It will return a response like this:
```
{
  "asset": "BTC.BTC",
  "memo": "=:BSC.BNB:0x3021c479f7f8c9f1d5c7d8523ba5e22c0bcb5430:0/1/0",
  "reference": "00003",
  "height": "6694474",
  "registration_hash": "10186C7BCB3E7841108D2039400146243E488DDC084C30864B7459F7CBF462D1",
  "registered_by": "sthor19phfqh3ce3nnjhh0cssn433nydq9shx76s8qgg"
}
```
- We can save these paramaters to use:
```
{
  "asset": "{registeredAsset}",
  "memo": "{registeredMemo}",
  "reference": "{referenceID}",
  "height": "{registrationBlockheight}",
  "registration_hash": "{registrationHash}",
  "registered_by": "{registrationAddress}"
}
```

Step 5:
- Get the THORChain Inbound Addresses: `/thorchain/inbound_addresses`

Example response:
```
[
  {
    "chain": "AVAX",
    "pub_key": "sthorpub1addwnpepqdj8cgqtrrhm7jpdznccfxt6pk8dxc5mr7ygvcqnjpvvjaxhwcf3smhwe8s",
    "address": "0xe21966cd0a142971f0c276c0cd48d39222bba02b",
    "router": "0xd6a6c0b3bb4150a98a379811934e440989209db6",
    "halted": false,
    "global_trading_paused": false,
    "chain_trading_paused": false,
    "chain_lp_actions_paused": false,
    "observed_fee_rate": "10",
    "gas_rate": "15",
    "gas_rate_units": "nAVAX",
    "outbound_tx_size": "100000",
    "outbound_fee": "1520994",
    "dust_threshold": "1"
  },
  {
    "chain": "BTC",
    "pub_key": "sthorpub1addwnpepqdj8cgqtrrhm7jpdznccfxt6pk8dxc5mr7ygvcqnjpvvjaxhwcf3smhwe8s",
    "address": "bc1qalgy3f70we7p3ymp36c2njepccr90nrj5wr535",
    "halted": false,
    "global_trading_paused": false,
    "chain_trading_paused": false,
    "chain_lp_actions_paused": false,
    "observed_fee_rate": "5",
    "gas_rate": "7",
    "gas_rate_units": "satsperbyte",
    "outbound_tx_size": "1000",
    "outbound_fee": "5188",
    "dust_threshold": "1000"
  },
  {
    "chain": "XRP",
    "pub_key": "sthorpub1addwnpepqdj8cgqtrrhm7jpdznccfxt6pk8dxc5mr7ygvcqnjpvvjaxhwcf3smhwe8s",
    "address": "r41prCJ48LSjo5hK8PajKkyqzvA6NFYR44",
    "halted": false,
    "global_trading_paused": false,
    "chain_trading_paused": false,
    "chain_lp_actions_paused": false,
    "observed_fee_rate": "500",
    "gas_rate": "750",
    "gas_rate_units": "drop",
    "outbound_tx_size": "1",
    "outbound_fee": "10349800",
    "dust_threshold": "100000000"
  }
]
```
Step 6:
- Get the {chain} of the {registeredAsset}: {registeredAssetChain}
    - {registeredAsset} should be in {chain}.{asset} format
- Return the important information for the corresponding `RegisteredAssetChain`
    - `address` = {assetInThorchainInboundAddress}
    - `dust_threshold` = {assetInDustThreshold}


Step 7:
- Determine the valid `amount` that the user can send based on the {referenceID}
    - Check the length {referenceIDLength} of {referenceID}
    - The reference number is encoded in the transaction amount that the user will send as the last {referenceIDLength} digits of the amount
    - The last {referenceIDLength} digits must be EXACTLY the {referenceID}
    - The possible amounts can go up to `{inAssetDecimals}` decimals
    - Only the decimals matter. Any amount of digits can come before the decimals

Examples:
 - For example, if the {referenceID} = 00003 which is 5 digits, and {inAssetDecimals} = 8, the Amount to send must be: `xxxx.xxx00003`
    - Only the last 5 decimals matter in this example. It doesn't matter for anything greater than the thousandths digit
- If the {referenceID} = 12345 and the {inAssetDecimals} = 6, the amount must be: `xx.x12345`
    - There is a maximum of 6 decimals in this example and a 5 digit refence code. So we can only freely define anything greater or including the tenths digit.


- Create a validation function `validateAmountToReference(amount,referenceID)` that can validate whether an `amount` is valid with a given `referenceID`
    - If amount of decimals is greater than {inAssetDecimals}, remove anything further than {inAssetDecimals}. DO NOT ROUND. Simply remove the extra digits.
    - Get the last {referenceIDLength} digits. Verify that it equals the referenceID
    - Example: if the amount = 1.234567899 and the inAssetDecimals = 8, change the amount to 1.23456789
    - Example: if the amount = 1.234567899 and the inAssetDecimals = 6, change the amount to 1.234567

- Create a validation function `validateAmountAboveInboundDustThreshold(amount)`
    - We must verify that the `amount` for the registeredAsset is > `assetInDustThreshold/1e8`

- Validate Final Amount Using Alternate Memoless Endpoint
  - After getting the reference ID and having the final deposit amount, validate the memo registration using: `/thorchain/memo/check/{registeredAsset}/{raw_amount}`
  - Convert `exactAmount` from asset units to `{raw_amount}` by multiplying by `10^{inAssetDecimals}`
    - Example: `exactAmount` = `0.00100001 BASE.ETH` with {inAssetDecimals} = 8 decimals becomes `0.00100001 * 10^8 = 100001`
  - Example API call: `https://stagenet-thornode.ninerealms.com/thorchain/memo/check/BASE.ETH/100001`
  - Do not round
  - Response format:
  ```
  {
    "reference": "00002",
    "available": false,
    "expires_at": "6712308",
    "usage_count": "1",
    "max_use": "3",
    "can_register": false,
    "memo": "=:XRP.XRP:sthor1g6pnmnyeg48yc3lg796plt0uw50qpp7humfggz"
  }
  ```

  - Run this check after a new `exactAmount` is calculated
    - Confirm that `response.reference` matches the expected `{referenceID}` from Step 4
    - Confirm that `response.memo` matches the expected `{memoToRegister}` from user input
    - If either above check fails, abort and log an error with the validation API call URL & response

  - Record these values:
    - `expires_at`: THORChain block number when the registration expires
    - `usage_count`: Number of times this registration has been used so far
    - `max_use`: Maximum number of times this registration can be used
    - `available`: Whether the registration is currently available for use

  - Display to the user:
    - Show usage statistics: "Used {usage_count} of {max_use} times"
    - Show expiration info: "Expires at block: {expires_at}"
    - Calculate and display estimated time remaining until expiry
    - Include this information in the "Make Deposit" section before critical instructions

- **Time Calculation (New):**
  - Get current THORChain block using: `/thorchain/lastblock/THORCHAIN`
  - Response format:
  ```
  [
    {
      "chain": "THORCHAIN",
      "last_observed_in": 0,
      "last_signed_out": 6708399,
      "thorchain": 6709417
    }
  ]
  ```
  - Use the `thorchain` value as the current block number
  - Calculate blocks remaining: `{expires_at} - {current_block}`
  - Estimate time remaining: `blocks_remaining * 6 seconds`
  - Display format:
    - If ≥ 1 hour: show as hours only (e.g., "24h")
    - If < 1 hour but ≥ 1 minute: show as minutes (e.g., "59m") 
    - If < 1 minute: show as "<1m"
    - If expired: show "Expired"
  - Display example: "Time remaining: ~24h" (with orange color for visibility)    

- User interface:
    - Let the user choose to enter their `User Inputted Amount` between asset (asset) terms or USD terms
        - If user chooses USD:
            - We have the {inAssetPriceUSD}
            - If the user chooses to enter in USD, we must only select an `amount` that passes the above validation
        - If user chooses {amount}:
            - No conversion is needed, since we already have the the asset in like terms.
            - Ensure it passes above verification
            - Let the user enter the amount they desire to send, but always ensure that the `validateAmountToReference()` is valid
            - Append any number the user enters with the decimals required for the validation to succeed
            - Eg if the user attempts to enter 1 and the referenceID = 10005 & inAssetDecimals = 8, the number should be 1.00010005
            - Basically, do not under any circumstances let the user edit the last `referenceIDLength` digits of the amount to send
            - Always insert the referenceID so that it ends at the decimal corresponding to the inAssetDecimals



Step 8: 
- Generate a QR code that encodes the {amount} and {assetInThorchainInboundAddress} for the given {registeredAsset}
- Use the following format, given the {chain} of the {registeredAsset}
    - BTC: `bitcoin:<address>?amount=<amount>`
    - ETH: `ethereum:<address>?value=<amount>`
    - BSC: `ethereum:<address>@56?value=<amount>`
    - LTC: `litecoin:<address>?amount=<amount>`
    - BCH: `bitcoincash:<address>?amount=<amount>`
    - TRON: `tron:<address>?amount=<amount>`
    - BASE: `ethereum:<address>@8453?value=<amount>`
    - GAIA: `cosmos:<address>?amount=<amount>`
    - DOGE: `dogecoin:<address>?amount=<amount>`
    - AVAX: `avalanche:<address>?amount=<amount>`
    - XRP: `xrp:<address>?amount=<amount>`
    - If the chain is not defined in the above list, only encode the <amount> in the QR code. 
        - Log an error that the {chain} is undefined in QR code to chain list
- Encode the above response in a QR code image

Step 9:
- Collect all relevant information for the user and display it to them
    - `{registeredAsset}`
    - `{registeredMemo}`
    - `{amount}`
    - `{assetInThorchainInboundAddress}`
    - QR Code

- Display specific instructions to the user:
    - Send EXACTLY {amount} to {assetInThorchainInboundAddress} on {registeredAssetChain}
    - If you do not follow these instructions exactly, your funds may be irrecoverably lost
    - Do not edit the amount to send under any circumstances.
    - Do not send with low gas rate. Your transaction should be confirmed within 10 minutes or else you risk irrecoverable loss of funds.
    - After confirmation on the blockchain, you can track your transaction using your Transaction ID
- After confirming all of the above, let the user enter their TX hash: `{txhash}`
- **Transaction Tracking:**
  - When the user clicks "Track My Deposit", open a modal dialog for TXID input
  - Validate that the TXID is a valid hexadecimal string (minimum 32 characters)
  - If the TXID starts with `0x` (common for Ethereum/BSC transactions), strip the `0x` prefix before using it
  - Format the URL as: https://thorchain.net/tx/{txhash} (where {txhash} is the cleaned TXID without 0x prefix)
  - Examples:
    - Bitcoin TXID: `1a2b3c4d5e6f...` (64 characters) → https://thorchain.net/tx/1a2b3c4d5e6f...
    - Ethereum TXID: `0x1a2b3c4d5e6f...` (66 characters) → https://thorchain.net/tx/1a2b3c4d5e6f... (0x stripped)
    - BSC TXID: `0x1a2b3c4d5e6f...` (66 characters) → https://thorchain.net/tx/1a2b3c4d5e6f... (0x stripped)

