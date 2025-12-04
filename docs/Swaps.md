The next app to build is a SWAP tab. This tab will be to trade THOR native assets. The Memoless tab is used to Deposit native assets into your rune wallet and store them as Secured or Trade assets. Once they're secured or trade assets, we can start swapping

First the functions & APIs that will enable the app:
- /pools
- /quote


User Interface:

1) from_asset selector: Use the same logic as the Wallet frontend. We need to get the user's balances for RUNE, other THOR native assets, secured assets, and trade assets. These are the assets that are available to swap. We want these available in a dropdown, ordered by descending USD value. We already perform this logic on the Wallet screen.
    - Show each asset type separately. If we have BTC-BTC and BTC~BTC, they should be listed separately, as they are on the wallet screen.
    - Order the list by descending USD value of the user's holdings (amount * priceUSD)

2) to_asset selector: There are more available destinations than assets we have in the wallet. To find all of the destinations, we need to pull the /pools endpoint. Pull any asset where status = available. Order by descending balance_rune. Add THOR.RUNE, since it will not be in the /pools list. 

3) amount input: the user will input the amount of the `from_asset` they want to swap. We will need to convert to Base Units, so multiply by 1e8 for the quote endpoint input. Display a conversion of the inputted amount to usd (amount * assetPriceUSD)

4) Advanced options: Hide it behind an expandable section, collapsed by default. Users should be able to swap without ever touching this section. 
    - Asset type dropdown: Secured, Native, or Trade.
        - We should edit the display of the "asset dropdown" based on the type here. Display the asset list in the proper format corresponding to the selection here.
        - Note that THOR.RUNE can only be Native type, not Secured or Trade. if THOR.RUNE is selected, change the type to Native.
        - If type = native, 
            - we need an recipient address input
            - we don't need to adjust the asset name at all for the quote
        - If type = secured 
            - use the user's THOR address for the recipient
            - adjust the asset name to replace `.` with `-`. Eg BTC.BTC -> BTC-BTC
        - If type = trade
            - use the user's THOR address for the recipient
            - adjust the asset name to replace `.` with `~` Eg BTC.BTC -> BTC~BTC
    - Liquidity_tolerance_bps. This is the slippage tolerance from the quote. The input is in basis points, but we want the user to put it in %. By default, 100 or 1%.
    - Streaming_quantity -> default = 0
    - Streaming_interval -> default = 1
    - Custom refund address -> default `null` / no input.

5) Get quote button
    - Request quote from thornode using the above information
    - If any of the fields (such as custom refund address) are not filled out, simply exclude it from the quote request
    - Only get a quote when this button is clicked, not automatically.

6) Quote Details
    - When a quote is received, un-hide this section.
        - If the quote response is an error, don't show this section and instead display the error
    - This section should show the quote for your swap, using the response from the thornode /quote endpoint
    - Display:
        - Input -> Output
            - Input Amount {in_asset}
            - Quoted Amount Out: expected_amount_out/1e8 {out_asset}
        - To_address
        - Swap Time: {total_swap_seconds} seconds
        - Total Fees: "total_bps/10000" %
    - Continue button

6) After "Continue" button is pressed
    - Call the Send function / popup modal.
    - Skip right to page 2 for the password confirmation to send transaction - since we know the swap details from above
        - Type: MsgDeposit
        - Asset: in_asset
        - Amount: amount
        - Memo: memo from quote response


===============

Sample THORNode Quote Request

```
curl -X 'GET' \
  'https://thornode.ninerealms.com/thorchain/quote/swap?from_asset=BTC-BTC&to_asset=ETH-ETH&amount=1000000&destination=thor17hwqt302e5f2xm4h95ma8wuggqkvfzgvsnh5z9&refund_address=thor17hwqt302e5f2xm4h95ma8wuggqkvfzgvsnh5z9&streaming_interval=1&streaming_quantity=0&liquidity_tolerance_bps=100' \
  -H 'accept: application/json'
```
Sample Response
```
{
  "outbound_delay_blocks": 1,
  "outbound_delay_seconds": 6,
  "fees": {
    "asset": "ETH-ETH",
    "affiliate": "0",
    "outbound": "438",
    "liquidity": "56960",
    "total": "57398",
    "slippage_bps": 19,
    "total_bps": 20
  },
  "expiry": 1761848491,
  "warning": "Do not cache this response. Do not send funds after the expiry.",
  "notes": "Broadcast a MsgDeposit to the THORChain network with the appropriate memo. Do not use multi-in, multi-out transactions.",
  "dust_threshold": "1000",
  "recommended_min_amount_in": "30",
  "recommended_gas_rate": "3",
  "gas_rate_units": "satsperbyte",
  "memo": "=:ETH-ETH:thor17hwqt302e5f2xm4h95ma8wuggqkvfzgvsnh5z9/thor17hwqt302e5f2xm4h95ma8wuggqkvfzgvsnh5z9:28148477/1/0",
  "expected_amount_out": "28432806",
  "max_streaming_quantity": 1,
  "streaming_swap_blocks": 0,
  "total_swap_seconds": 6
}
```