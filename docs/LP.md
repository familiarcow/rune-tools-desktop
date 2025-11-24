
Tracking liquidity positions:
- Mainnet: https://midgard.ninerealms.com/v2/member/{address}
- Stagenet: https://stagenet-midgard.ninerealms.com/v2/member/{address}
- Ensure to use the network context to pull the proper network

{
	"pools": [
		{
			"assetAdded": "57029397945",
			"assetAddress": "qz7262r7uufxk89ematxrf6yquk7zfwrjqm97vskzw",
			"assetDeposit": "57029397945",
			"assetPending": "0",
			"assetWithdrawn": "0",
			"dateFirstAdded": "1647913096",
			"dateLastAdded": "1683074329",
			"liquidityUnits": "3059999955206",
			"pool": "BCH.BCH",
			"runeAdded": "4837032747226",
			"runeAddress": "thor1egxvam70a86jafa8gcg3kqfmfax3s0m2g3m754",
			"runeDeposit": "4837032747226",
			"runePending": "0",
			"runeWithdrawn": "0"
		},
		{
			"assetAdded": "172310000000",
			"assetAddress": "0x04c5998ded94f89263370444ce64a99b7dbc9f46",
			"assetDeposit": "172310000000",
			"assetPending": "0",
			"assetWithdrawn": "0",
			"dateFirstAdded": "1694591876",
			"dateLastAdded": "1706495387",
			"liquidityUnits": "2474598145535",
			"pool": "BSC.BNB",
			"runeAdded": "14450000000000",
			"runeAddress": "thor1egxvam70a86jafa8gcg3kqfmfax3s0m2g3m754",
			"runeDeposit": "14450000000000",
			"runePending": "0",
			"runeWithdrawn": "0"
		}
    ]
}
- Record the liquidtyUnits for each pool

Get the pool's LP units:
- /pools endpoint, for each "pool" from the midgard, response find the corresponding "asset" in the pools endpoint. Get the balance_rune, pool_units, LP_units, 
- pool_units = LP_units + synth_units
- User's share of the pool = {liquidityUnits} / {pool_units} = {UserShareOfPool}
- Get the pool's total value in RUNE = {poolTotalLiquidityInRune} = {balance_rune} * 2
- We know the USD price of RUNE
- Use this to calculate the USD value of the user's liquidity position
