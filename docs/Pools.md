The next major tab is /pools

Data source: `/thorchain/pools` endpoint

Sample response:
```
[
  {
    "asset": "AVAX.AVAX",
    "short_code": "a",
    "status": "Available",
    "pending_inbound_asset": "0",
    "pending_inbound_rune": "0",
    "balance_asset": "6981116381857",
    "balance_rune": "151903940210854",
    "asset_tor_price": "1778821885",
    "pool_units": "88092922806959",
    "LP_units": "62361854400314",
    "synth_units": "25731068406645",
    "synth_supply": "4078229611474",
    "savers_depth": "3960836133855",
    "savers_units": "3450281845752",
    "savers_fill_bps": "0",
    "savers_capacity_remaining": "0",
    "synth_mint_paused": true,
    "synth_supply_remaining": "4299110046754",
    "loan_collateral": "0",
    "loan_collateral_remaining": "0",
    "loan_cr": "0",
    "derived_depth_bps": "6524",
    "trading_halted": false
  },
  {
    "asset": "AVAX.SOL-0XFE6B19286885A4F7F55ADAD09C3CD1F906D2478F",
    "status": "Available",
    "pending_inbound_asset": "0",
    "pending_inbound_rune": "0",
    "balance_asset": "38178811491",
    "balance_rune": "8431015294421",
    "asset_tor_price": "18052850085",
    "pool_units": "2810297082079",
    "LP_units": "2805246443473",
    "synth_units": "5050638606",
    "synth_supply": "137229178",
    "savers_depth": "0",
    "savers_units": "0",
    "savers_fill_bps": "0",
    "savers_capacity_remaining": "0",
    "synth_mint_paused": true,
    "synth_supply_remaining": "45677344611",
    "loan_collateral": "0",
    "loan_collateral_remaining": "0",
    "loan_cr": "0",
    "derived_depth_bps": "0",
    "trading_halted": false
  },
  {
    "asset": "BCH.BCH",
    "short_code": "c",
    "status": "Available",
    "pending_inbound_asset": "2059596",
    "pending_inbound_rune": "0",
    "balance_asset": "425804618794",
    "balance_rune": "278166176992919",
    "asset_tor_price": "53405041510",
    "pool_units": "128265304997835",
    "LP_units": "43611774029130",
    "synth_units": "84653530968705",
    "synth_supply": "562051670704",
    "savers_depth": "560282196552",
    "savers_units": "514418857711",
    "savers_fill_bps": "0",
    "savers_capacity_remaining": "0",
    "synth_mint_paused": true,
    "synth_supply_remaining": "0",
    "loan_collateral": "0",
    "loan_collateral_remaining": "0",
    "loan_cr": "0",
    "derived_depth_bps": "9500",
    "trading_halted": false
  }
]
  ```

Make sure that this tab respects the network we are on: stagenet or mainnet

The purpose of this tab is to be a table of the pools that are on the network.

Make a list including:
- Asset (Use Display Name)
- Asset price: asset_tor_price/1e8 - show 2 decimal digits only
- Pool depth USD (balance_asset/1e8 * asset_tor_price/1e8)

Sort by descending balance_rune of status = available pools
At the bottom of the list, you can show the pools where status = staged. But add (Staged) to the name, since they are not available.

We'll want to make a universal function for AssetDisplayName({asset}). We will want to use this display name functionality in other tabs and places on the app.
- To determine an asset's Display Name:
- Take the asset's name eg BTC.BTC
- The asset name is always structured like {Chain}.{Asset}-{contract}
- Not every asset has a contract. If it has no contract there is no -{contract} in the name
- The display name is: {Asset} ({chain})


Examples:
BTC.BTC -> BTC (BTC)
GAIA.ATOM -> ATOM (GAIA)
BASE.CBBTC-0XCBB7C0000AB88B473B1F5AFD9EF808440EED33BF -> CBBTC (BASE)


