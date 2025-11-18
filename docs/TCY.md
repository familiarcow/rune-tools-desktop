TCY is an asset native to THORChain. This tab will be a dashboard for TCY.
Asset Name: "THOR.TCY"
Image /coins/TCY.svg

TCY Price
- Get from /pools endpoint
    - `asset_price_in_tor/1e8` for THOR.TCY


There are two places that a user might have TCY:
- In their wallet
- Staked

In Wallet TCY
- Check from usual wallet balance query - THOR.TCY

Staked TCY Balances
- Check thornode: /thorchain/tcy_staker/{address}
- Example response:
```
{
  "address": "thor1005rk5k9uuew3u5y489yd8tgjyrsykknnat8z0",
  "amount": "13035628360"
}
```
    - The amount is in 1e8, so the above address has a balance of 130.03 staked TCY

Staking & Unstaking
- Add a "Stake" button to add to your TCY stake from your wallet
    - User should input the amount they want to stake. Maximum their total TCY wallet balance
    - Initiate a MsgDeposit, skip to Page 2
        - Memo: "TCY+"
        - Asset: TCY
        - Amount: Amount the user wants to stake
        - Make sure we are using the proper asset name & amount syntax for the MsgDeposit
- Add an "Unstake" button to unstake TCY to transfer staked TCY back to your wallet balance
    - User should input the % of their staked balance they want to withdraw. Use a slider
        - We need to use the withdraw % in the withdraw memo (it's in basis points)
        - Slider granularity is 1 / 10000
        - Show how much the user would be withdrawing for their chosen %
        - Default at 100% Withdraw
    - Initiate a MsgDeposit with RUNE as the asset
        - Amount: 0
        - Memo: `TCY-:{WITHDRAWALBASISPOINTS}`
        - Asset: RUNE




TCY Distributions Endpoint:
- Staked TCY earns yield daily, in RUNE
- Use Midgard endpoint to query the TCY earnings distributions on mainnet: `https://midgard.ninerealms.com/v2/tcy/distribution/{address}`
    - `https://stagenet-midgard.ninerealms.com/v2/tcy/distribution/{address}` for stagenet
- Example response:
    {
	"address": "thor1005rk5k9uuew3u5y489yd8tgjyrsykknnat8z0",
	"apr": "0.05860591304104133",
	"distributions": [
		{
			"amount": "260713",
			"date": "1752278173",
			"price": "151047670"
		},
		{
			"amount": "260713",
			"date": "1756902059",
			"price": "120070398"
		}
	],
	"total": "47058623"
}
    - Date is in UNIX
    - Amount is in RUNE*1e8
    - Price is the RUNEUSD price on the date in the corresponding distribution
    - Use Amount * Price to get the USD distribution amount
    - APR is in decimals, convert to a %
    - Total is the total RUNE*1e8 amount distributed

TCY Constants (for distribution calculations):
- Get from thornode: https://thornode.ninerealms.com/thorchain/constants
- MinRuneForTCYStakeDistribution: `constantsData.int_64_values.MinRuneForTCYStakeDistribution / 1e8`
- MinTCYForTCYStakeDistribution: `constantsData.int_64_values.MinTCYForTCYStakeDistribution / 1e8`
- TCYStakeSystemIncomeBps: `constantsData.int_64_values.TCYStakeSystemIncomeBps`

Wallet Balances (Unstaked TCY & RUNE):
- Get from thornode: https://thornode.ninerealms.com/cosmos/bank/v1beta1/balances/{address}
- TCY Balance: Find balance with denom "tcy", amount/1e8
- RUNE Balance: Find balance with denom "rune", amount/1e8
- Display alongside staked balances in the UI

We should also get additional information about TCY to explain to the user:
- Total Supply (210m tokens)
- Staked vs Unstaked vs Pooled

Determine the next TCY distribution:
- Endpoint:
    - Mainnet: https://rpc.ninerealms.com/status
    - Stagenet: https://stagenet-rpc.ninerealms.com/status
- get latest thorchain block height: `sync_info.latest_bloick_height`
- Example:
```
 try {
      // Get current block height
      const statusResponse = await fetchJSON("https://rpc-v2.ninerealms.com/status");
      const currentBlock = Number(statusResponse.result.sync_info.latest_block_height);
      console.log('Current block:', currentBlock);
      
      // Calculate next distribution block
      const nextBlock = 14400 * Math.ceil(currentBlock / 14400);
      nextDistributionBlock = nextBlock;
      const blocksRem = nextBlock - currentBlock;
      blocksRemaining = blocksRem;
      console.log('Next block:', nextBlock, 'Blocks remaining:', blocksRemaining);
      
      // Calculate time remaining (assuming 6 seconds per block)
      const secondsRemaining = blocksRemaining * 6;
      const hours = Math.floor(secondsRemaining / 3600);
      const minutes = Math.floor((secondsRemaining % 3600) / 60);
      
      nextDistributionTime = `${hours}h ${minutes}m`;
      console.log('Time remaining:', nextDistributionTime);
```

- Get the RUNE currently pending distribution
    - This is the RUNE that is accrued to the distribution module that is distributed to all stakers every 14400 blocks
    - Endpoint:
        - Mainnet: https://thornode.ninerealms.com/thorchain/balance/module/tcy_stake
        - Stagenet: https://stagenet-thornode.ninerealms.com/thorchain/balance/module/tcy_stake
    - Balance is in rune*1e8

- Get the user's share of pending rewards based on their TCY stake:
    - eg:
        ```
        const totalTCYSupply = 210000000; // 210 million TCY
      console.log('User staked balance:', stakedBalance);
      const userShare = stakedBalance / totalTCYSupply;
      console.log('User share:', userShare);

      // Calculate user's estimated distribution amount
      nextDistributionAmount = actualDistributionAmount * userShare;
      console.log('Final estimated amount:', nextDistributionAmount);
        ```

- Get TCY liquidity & price info:
    - eg:
        ```
                const fetchTCYLiquidity = async () => {
            try {
            const poolsData = await fetch("https://thornode.ninerealms.com/thorchain/pools").then(res => res.json());
            const tcyPool = poolsData.find(pool => pool.asset === "THOR.TCY");
            if (tcyPool) {
                const balanceAsset = Number(tcyPool.balance_asset) / 1e8;
                const assetPrice = Number(tcyPool.asset_tor_price) / 1e8;
                const liquidity = balanceAsset * assetPrice * 2; // Multiply by 2 for total pool depth
                tcyLiquidity.set(liquidity);
            }
            } catch (error) {
                console.error("Error fetching TCY liquidity:", error);
            }
            };
        ```
    - TCY Price in USD = asset_tor_price/1e8
    - TCY Market Cap = {Tcy Price USD} * {TCY Total Supply}
        - Total supply is 210m coins
    
- Get RUNE Market Cap:
    - Get total RUNE Supply
        - eg https://thornode.ninerealms.com/cosmos/bank/v1beta1/supply/by_denom?denom=rune
            - `{"amount":{"denom":"rune","amount":"42522718444736578"}}`
            - Total RUNE Supply = 42522718444736578/1e8 = 425,227,184.44736578
    - Rune Market Cap = {Rune Price USD} * {Rune Supply USD}

- Compare the TCY Market Cap as a % of the RUNE Market cap: eg 7.45%

## UI Layout Plan

**Section 1 - TCY Market Info (Always shown):**
- TCY price with icon
- TCY market cap 
- TCY vs RUNE market cap percentage
- Total supply breakdown (staked vs unstaked vs pooled)

**Section 2 - Balances & Actions (Always shown):**
- **Balances row:** Staked TCY | Unstaked TCY | Unstaked RUNE (amounts + USD values)
- **Actions row:** Stake button with input | Unstake button with percentage slider

**Section 3 - Rewards & Analytics (Only if staked balance > 0):**
- Current APR from midgard
- Total RUNE distributed to user
- Next distribution countdown + estimated reward
- Distribution history table with recent entries

## Stake & Unstake Popups

**Implementation Pattern:**
- Follow WithdrawDialog component structure (show/hide methods, data interfaces, callback pattern)  
- Use `.tcy-*` scoped CSS selectors (following RULES.md)
- Use `#global-overlay-container` for modal display
- Integrate with SendTransaction modal using `skipToConfirmation: true`
- Pass normalized amounts (user-friendly values) to SendTransaction

**StakeDialog Component:**
- Title: "🏦 Stake TCY"
- Show current unstaked TCY balance with asset icon
- Input field for amount to stake (with MAX button)  
- Validation: Amount must be > 0 and <= unstaked TCY balance
- Transaction preview section showing: Asset: THOR.TCY, Amount: [input], Memo: "TCY+"
- "Continue to Transaction" button → Calls SendTransaction with `transactionType: 'deposit'`

**UnstakeDialog Component:**  
- Title: "📤 Unstake TCY"
- Show current staked TCY balance with asset icon
- Percentage slider (0-100%, step: 0.01% = 1 basis point)
- Real-time calculation showing TCY amount to unstake
- Transaction preview showing: Asset: THOR.RUNE, Amount: 0, Memo: "TCY-:{BASIS_POINTS}"
- "Continue to Transaction" button → Calls SendTransaction with `transactionType: 'deposit'`

**Shared Modal Features:**
- Dialog overlay with close button (×)
- Form validation with error messages  
- Loading states during calculations
- Asset logos with error handling
- Smooth animations for show/hide (following RULES.md #6)

## Legacy TCY App:
```
<script>
  import { onMount } from "svelte";

  let address = "";
  let showData = false;
  let distributions = [];
  let totalDistributed = 0;
  let stakedBalance = 0;
  let unstakedBalance = 0;
  let unstakedRuneBalance = 0;
  let isMobile = false;
  let showAllDistributions = false;
  let runePriceUSD = 0;
  let runePriceInTor = 0;
  let tcyPriceUSD = 0;
  let nextDistributionTime = null;
  let nextDistributionAmount = null;
  let selectedPeriod = '7d';
  let periodOptions = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '60d', label: '60 Days' },
    { value: '90d', label: '90 Days' },
    { value: '365d', label: '1 Year' },
    { value: 'all', label: 'All Time' }
  ];
  let nextDistributionBlock = null;
  let blocksRemaining = null;

  // New state variables for TCY mimir and constants
  let tcyMimir = {
    TCYCLAIMINGHALT: null,
    TCYCLAIMINGSWAPHALT: null,
    TCYSTAKEDISTRIBUTIONHALT: null,
    TCYSTAKINGHALT: null,
    TCYUNSTAKINGHALT: null,
    HALTTCYTRADING: null
  };
  let tcyConstants = {
    MinRuneForTCYStakeDistribution: null,
    MinTCYForTCYStakeDistribution: null,
    TCYStakeSystemIncomeBps: null
  };

  // New variable to store historical RUNE prices
  let historicalRunePrices = [];

  const fetchJSON = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch data from ${url}: ${response.statusText}`);
    return response.json();
  };

  const updateAddressFromURL = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlAddress = urlParams.get("address");
    if (urlAddress) {
      address = urlAddress;
      showData = true;
      fetchData();
    }
  };

  const fetchTCYPrice = async () => {
    try {
      const poolsData = await fetchJSON("https://thornode.ninerealms.com/thorchain/pools");
      const tcyPool = poolsData.find(pool => pool.asset === "THOR.TCY");
      if (tcyPool) {
        tcyPriceUSD = Number(tcyPool.asset_tor_price) / 1e8;
        console.log('TCY Price Debug:', {
          rawPrice: tcyPool.asset_tor_price,
          convertedPrice: tcyPriceUSD
        });
      }
    } catch (error) {
      console.error("Error fetching TCY price:", error);
    }
  };

  const fetchTCYMimir = async () => {
    try {
      const mimirData = await fetchJSON("https://thornode.ninerealms.com/thorchain/mimir");
      tcyMimir = {
        TCYCLAIMINGHALT: mimirData.TCYCLAIMINGHALT,
        TCYCLAIMINGSWAPHALT: mimirData.TCYCLAIMINGSWAPHALT,
        TCYSTAKEDISTRIBUTIONHALT: mimirData.TCYSTAKEDISTRIBUTIONHALT,
        TCYSTAKINGHALT: mimirData.TCYSTAKINGHALT,
        TCYUNSTAKINGHALT: mimirData.TCYUNSTAKINGHALT,
        HALTTCYTRADING: mimirData.HALTTCYTRADING
      };
      console.log('TCY Mimir Status:', tcyMimir);
    } catch (error) {
      console.error("Error fetching TCY mimir:", error);
    }
  };

  const fetchTCYConstants = async () => {
    try {
      const constantsData = await fetchJSON("https://thornode.ninerealms.com/thorchain/constants");
      tcyConstants = {
        MinRuneForTCYStakeDistribution: Number(constantsData.int_64_values.MinRuneForTCYStakeDistribution) / 1e8,
        MinTCYForTCYStakeDistribution: Number(constantsData.int_64_values.MinTCYForTCYStakeDistribution) / 1e8,
        TCYStakeSystemIncomeBps: Number(constantsData.int_64_values.TCYStakeSystemIncomeBps)
      };
      console.log('TCY Constants:', tcyConstants);
    } catch (error) {
      console.error("Error fetching TCY constants:", error);
    }
  };

  const fetchHistoricalRunePrices = async (distributionCount) => {
    try {
      const count = distributionCount + 10; // Add 10 extra as requested
      const historicalData = await fetchJSON(`https://midgard.ninerealms.com/v2/history/rune?interval=day&count=${count}`);
      historicalRunePrices = historicalData.intervals || [];
      console.log('Historical RUNE prices fetched:', historicalRunePrices.length, 'intervals');
    } catch (error) {
      console.error("Error fetching historical RUNE prices:", error);
      historicalRunePrices = [];
    }
  };

  const getHistoricalRunePrice = (timestamp) => {
    // Find the price interval that contains this timestamp
    const interval = historicalRunePrices.find(interval => {
      const startTime = Number(interval.startTime);
      const endTime = Number(interval.endTime);
      return timestamp >= startTime && timestamp <= endTime;
    });
    
    if (interval) {
      return Number(interval.runePriceUSD);
    }
    
    // Fallback to current price if no historical data found
    console.warn('No historical price found for timestamp:', timestamp, 'using current price');
    return runePriceUSD;
  };

  const fetchData = async () => {
    try {
      // Fetch RUNE and TCY prices first
      const networkData = await fetchJSON("https://thornode.ninerealms.com/thorchain/network");
      runePriceInTor = Number(networkData.rune_price_in_tor);
      runePriceUSD = runePriceInTor / 1e8;
      console.log('RUNE Price Debug:', {
        rawPrice: networkData.rune_price_in_tor,
        convertedPrice: runePriceUSD
      });
      await fetchTCYPrice();
      await fetchTCYMimir();
      await fetchTCYConstants();

      // Fetch distribution history
      try {
        const distributionData = await fetchJSON(`https://midgard.ninerealms.com/v2/tcy/distribution/${address}`);
        distributions = distributionData.distributions.sort((a, b) => Number(b.date) - Number(a.date));
        totalDistributed = Number(distributionData.total) / 1e8;
        
        // Fetch historical RUNE prices for the distributions
        if (distributions.length > 0) {
          await fetchHistoricalRunePrices(distributions.length);
        }
      } catch (error) {
        distributions = [];
        totalDistributed = 0;
      }

      // Fetch staked balance
      try {
        const stakedData = await fetchJSON(`https://thornode.ninerealms.com/thorchain/tcy_staker/${address}`);
        console.log('Staked Balance API Response:', stakedData);
        stakedBalance = Number(stakedData.amount) / 1e8;
        console.log('Processed Staked Balance:', stakedBalance);
        
        // Calculate next distribution after we have the staked balance
        await calculateNextDistribution();
      } catch (error) {
        console.error('Error fetching staked balance:', error);
        stakedBalance = 0;
      }

      // Fetch unstaked balances (always attempt this, even if staked fetch fails)
      try {
        const unstakedData = await fetchJSON(`https://thornode.ninerealms.com/cosmos/bank/v1beta1/balances/${address}`);
        const tcyBalance = unstakedData.balances.find(b => b.denom === "tcy");
        const runeBalance = unstakedData.balances.find(b => b.denom === "rune");
        unstakedBalance = tcyBalance ? Number(tcyBalance.amount) / 1e8 : 0;
        unstakedRuneBalance = runeBalance ? Number(runeBalance.amount) / 1e8 : 0;
      } catch (error) {
        unstakedBalance = 'ERROR';
        unstakedRuneBalance = 'ERROR';
        console.log('ERROR');
      }

      // Force a reactive update of apyStats after all data is loaded
      apyStats = calculateAPY(distributions);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (address) {
      showData = true;
      updateURL();
      fetchData();
    }
  };

  const handleRandom = async () => {
    try {
      const response = await fetch("https://thornode.ninerealms.com/thorchain/tcy_stakers");
      const data = await response.json();
      if (data.tcy_stakers && data.tcy_stakers.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.tcy_stakers.length);
        address = data.tcy_stakers[randomIndex].address;
        showData = true;
        updateURL();
        fetchData();
      }
    } catch (error) {
      console.error("Error fetching random staker:", error);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      address = text;
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const updateURL = () => {
    const url = new URL(window.location);
    url.searchParams.set("address", address);
    window.history.pushState({}, '', url);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const numFormat = (x) => Intl.NumberFormat().format(x);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getRecentDistributions = () => {
    const sevenDaysAgo = Date.now() / 1000 - (7 * 24 * 60 * 60);
    return (distributions || []).filter(d => Number(d.date) >= sevenDaysAgo);
  };

  const downloadCSV = () => {
    const headers = ['Date', 'Amount (RUNE)', 'Amount (USD)'];
    const rows = distributions.map(d => {
      const runeAmount = Number(d.amount) / 1e8;
      const historicalPrice = getHistoricalRunePrice(Number(d.date));
      const usdAmount = runeAmount * historicalPrice;
      return [
        formatDate(Number(d.date)),
        runeAmount.toFixed(8),
        usdAmount.toFixed(2)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tcy-distributions-${address.slice(-4)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRuneAmount = (amount) => {
    const value = Number(amount) / 1e8;
    if (value >= 1) {
      return numFormat(value.toFixed(1));
    } else if (value >= 0.01) {
      return numFormat(value.toFixed(3));
    } else {
      return numFormat(value.toFixed(8));
    }
  };

  const calculateAPY = (distributions) => {
    // If no distributions, return null
    if (distributions.length === 0) {
      return null;
    }

    const totalRune = distributions.reduce((sum, d) => 
      sum + (Number(d.amount) / 1e8), 0
    );

    // Calculate average daily RUNE
    const days = distributions.length;
    const avgDailyRune = totalRune / days;
    
    // Annualize
    const annualRune = avgDailyRune * 365;
    const annualUSD = annualRune * runePriceUSD;
    
    // Calculate staked value in USD using the staked balance and TCY price
    const stakedValueUSD = stakedBalance * tcyPriceUSD;

    console.log('Debug APY Calculation:', {
      totalRune,
      days,
      avgDailyRune,
      annualRune,
      runePriceUSD,
      annualUSD,
      stakedBalance,
      tcyPriceUSD,
      stakedValueUSD
    });

    // Calculate APY using the staked value in USD
    const apy = stakedValueUSD > 0 ? (annualUSD / stakedValueUSD) * 100 : 0;

    return {
      totalRune,
      avgDailyRune,
      annualRune,
      annualUSD,
      apy,
      days
    };
  };

  const calculateNextDistribution = async () => {
    try {
      // Get current block height
      const statusResponse = await fetchJSON("https://rpc-v2.ninerealms.com/status");
      const currentBlock = Number(statusResponse.result.sync_info.latest_block_height);
      console.log('Current block:', currentBlock);
      
      // Calculate next distribution block
      const nextBlock = 14400 * Math.ceil(currentBlock / 14400);
      nextDistributionBlock = nextBlock;
      const blocksRem = nextBlock - currentBlock;
      blocksRemaining = blocksRem;
      console.log('Next block:', nextBlock, 'Blocks remaining:', blocksRemaining);
      
      // Calculate time remaining (assuming 6 seconds per block)
      const secondsRemaining = blocksRemaining * 6;
      const hours = Math.floor(secondsRemaining / 3600);
      const minutes = Math.floor((secondsRemaining % 3600) / 60);
      
      nextDistributionTime = `${hours}h ${minutes}m`;
      console.log('Time remaining:', nextDistributionTime);

      // Get current accrued RUNE amount
      const moduleBalance = await fetchJSON("https://thornode.ninerealms.com/thorchain/balance/module/tcy_stake");
      console.log('Module balance response:', moduleBalance);
      
      const currentAccruedRune = Number(moduleBalance.coins.find(c => c.denom === "rune")?.amount || 0) / 1e8;
      console.log('Current accrued RUNE:', currentAccruedRune);

      // Calculate blocks since last distribution
      const lastDistributionBlock = 14400 * Math.floor(currentBlock / 14400);
      const blocksSinceLastDistribution = currentBlock - lastDistributionBlock;
      console.log('Last distribution block:', lastDistributionBlock, 'Blocks since last:', blocksSinceLastDistribution);

      // Calculate RUNE per block rate
      const runePerBlock = currentAccruedRune / blocksSinceLastDistribution;
      console.log('RUNE per block:', runePerBlock);

      // Calculate total estimated RUNE by next distribution
      const totalEstimatedRune = currentAccruedRune + (runePerBlock * blocksRemaining);
      console.log('Total estimated RUNE:', totalEstimatedRune);

      // Calculate actual distribution amount based on MinRuneForTCYStakeDistribution
      const minRuneForDistribution = tcyConstants.MinRuneForTCYStakeDistribution;
      const distributionMultiplier = Math.floor(totalEstimatedRune / minRuneForDistribution);
      const actualDistributionAmount = distributionMultiplier * minRuneForDistribution;
      console.log('Actual distribution amount:', actualDistributionAmount);

      // Calculate user's share based on their TCY stake
      const totalTCYSupply = 210000000; // 210 million TCY
      console.log('User staked balance:', stakedBalance);
      const userShare = stakedBalance / totalTCYSupply;
      console.log('User share:', userShare);

      // Calculate user's estimated distribution amount
      nextDistributionAmount = actualDistributionAmount * userShare;
      console.log('Final estimated amount:', nextDistributionAmount);

    } catch (error) {
      console.error("Error calculating next distribution:", error);
      nextDistributionTime = "Error";
      nextDistributionAmount = null;
      nextDistributionBlock = null;
      blocksRemaining = null;
    }
  };

  $: apyStats = (distributions && distributions.length > 0) ? calculateAPY(distributions) : null;

  onMount(() => {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    updateAddressFromURL();
  });
</script>

<div class="tcy-tracker-wrapper">
  <div class="tcy-tracker">
    {#if !showData}
      <div class="address-form-outer">
        <form class="address-form-card" on:submit={handleSubmit}>
          <h2 class="address-form-title">TCY Yield Tracker</h2>
          <div class="address-form-group">
            <div class="label-with-random">
              <label for="address-input" class="address-form-label">THORChain Address</label>
              <button type="button" class="random-btn" on:click={handleRandom} title="Random Staker">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <path d="M3.3 7l8.7 5 8.7-5"></path>
                  <path d="M12 22V12"></path>
                </svg>
              </button>
            </div>
            <div class="input-with-paste">
              <input id="address-input" class="address-form-input" type="text" bind:value={address} required placeholder="eg thor1...wxyz" />
              <button type="button" class="paste-button" on:click={handlePaste} title="Paste from clipboard">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
              </button>
            </div>
          </div>
          <button class="address-form-btn" type="submit">Track TCY Staking</button>
        </form>
      </div>
    {:else}
      <div class="container">
        <div class="tracker-title-box">
          <h2>TCY Staking - {address.slice(-4)}</h2>
        </div>

        {#if tcyMimir.TCYCLAIMINGHALT === 1 || tcyMimir.TCYCLAIMINGSWAPHALT === 1 || 
           tcyMimir.TCYSTAKEDISTRIBUTIONHALT === 1 || tcyMimir.TCYSTAKINGHALT === 1 || 
           tcyMimir.TCYUNSTAKINGHALT === 1 || tcyMimir.HALTTCYTRADING === 1}
          <div class="alerts-section">
            {#if tcyMimir.TCYCLAIMINGHALT === 1}
              <div class="alert-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="warning-icon">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>TCY Claiming is temporarily paused!</span>
              </div>
            {/if}
            {#if tcyMimir.TCYCLAIMINGSWAPHALT === 1}
              <div class="alert-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="warning-icon">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>TCY Claiming & Swaps are temporarily paused!</span>
              </div>
            {/if}
            {#if tcyMimir.TCYSTAKEDISTRIBUTIONHALT === 1}
              <div class="alert-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="warning-icon">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>TCY payout distributions are temporarily paused!</span>
              </div>
            {/if}
            {#if tcyMimir.TCYSTAKINGHALT === 1}
              <div class="alert-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="warning-icon">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>TCY Staking is temporarily paused!</span>
              </div>
            {/if}
            {#if tcyMimir.TCYUNSTAKINGHALT === 1}
              <div class="alert-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="warning-icon">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <path d="M3.3 7l8.7 5 8.7-5"></path>
                  <path d="M12 22V12"></path>
                </svg>
                <span>TCY Unstaking is temporarily paused!</span>
              </div>
            {/if}
            {#if tcyMimir.HALTTCYTRADING === 1}
              <div class="alert-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="warning-icon">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>TCY Trading is temporarily paused!</span>
              </div>
            {/if}
          </div>
        {/if}

        <div class="vertical-grid">
          <div class="top-row">
            <div class="card staked">
              <h3>Staked Balance</h3>
              <div class="main-value">
                {numFormat(stakedBalance.toFixed(1))}
                <img src="/assets/coins/TCY.svg" alt="TCY" class="tcy-icon" />
              </div>
              <div class="sub-values">
                <span class="usd-value">{formatCurrency(stakedBalance * tcyPriceUSD)}</span>
              </div>
            </div>

            <div class="card apy">
              <h3>APY</h3>
              {#if apyStats}
                <div class="main-value">{apyStats.apy.toFixed(2)}%</div>
                <div class="sub-values">
                  <span class="usd-value">
                    {formatRuneAmount(apyStats.annualRune * 1e8)}
                    <img src="/assets/coins/RUNE-ICON.svg" alt="RUNE" class="rune-icon small" />
                    /yr
                  </span>
                </div>
              {:else}
                <div class="main-value">N/A</div>
                <div class="sub-values">
                  <span class="usd-value">No distributions yet</span>
                </div>
              {/if}
            </div>
          </div>

          <div class="distribution-row">
            <div class="card next-distribution">
              <h3>Next Distribution</h3>
              <div class="main-value">
                {#if nextDistributionTime}
                  {nextDistributionTime}
                {:else}
                  Calculating...
                {/if}
              </div>
              <div class="sub-values">
                <span class="usd-value">
                  {#if nextDistributionBlock && blocksRemaining !== null}
                    <a href={`https://runescan.io/block/${nextDistributionBlock}`} target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;">
                      {blocksRemaining} blocks remaining
                    </a>
                  {:else}
                    Calculating...
                  {/if}
                </span>
              </div>
            </div>

            <div class="card estimated-reward">
              <h3>Estimated Reward</h3>
              <div class="main-value">
                {#if nextDistributionAmount}
                  {formatRuneAmount(nextDistributionAmount * 1e8)}
                  <img src="/assets/coins/RUNE-ICON.svg" alt="RUNE" class="rune-icon" />
                {:else}
                  Calculating...
                {/if}
              </div>
              <div class="sub-values">
                {#if nextDistributionAmount}
                  <span class="usd-value">{formatCurrency(nextDistributionAmount * runePriceUSD)}</span>
                {:else}
                  <span class="usd-value">No estimate available</span>
                {/if}
              </div>
            </div>
          </div>

          {#if apyStats}
            <div class="card yield-details">
              <h3>{apyStats.days} reward distributions</h3>
              <div class="yield-stats">
                <div class="stat-row">
                  <span class="stat-label">Total RUNE Earned</span>
                  <span class="stat-value">
                    {formatRuneAmount(apyStats.totalRune * 1e8)}
                    <img src="/assets/coins/RUNE-ICON.svg" alt="RUNE" class="rune-icon" />
                  </span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Average Daily RUNE</span>
                  <span class="stat-value">
                    {formatRuneAmount(apyStats.avgDailyRune * 1e8)}
                    <img src="/assets/coins/RUNE-ICON.svg" alt="RUNE" class="rune-icon" />
                  </span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Annualized RUNE</span>
                  <span class="stat-value">
                    {formatRuneAmount(apyStats.annualRune * 1e8)}
                    <img src="/assets/coins/RUNE-ICON.svg" alt="RUNE" class="rune-icon" />
                  </span>
                </div>
              </div>
            </div>
          {/if}

          <div class="card unstaked">
            <div class="card-header">
              <h3>Wallet Balances</h3>
              <a href={`https://viewblock.io/thorchain/address/${address}`} target="_blank" rel="noopener noreferrer" class="icon-link" title="View on RuneScan">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-up-right" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                  <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
                </svg>
              </a>
            </div>
            <div class="balance-table">
              <div class="balance-row">
                <div class="asset-info">
                  <img src="/assets/coins/TCY.svg" alt="TCY" class="tcy-icon" />
                  <span class="asset-price">{tcyPriceUSD ? formatCurrency(tcyPriceUSD) : ''}</span>
                </div>
                <div class="balance-info">
                  <span class="amount">
                    {unstakedBalance === 'ERROR' ? 'ERROR' : numFormat(unstakedBalance.toFixed(1))}
                  </span>
                  <span class="usd-value">
                    {unstakedBalance === 'ERROR' ? 'ERROR' : formatCurrency(unstakedBalance * tcyPriceUSD)}
                  </span>
                </div>
              </div>
              <div class="balance-row">
                <div class="asset-info">
                  <img src="/assets/coins/RUNE-ICON.svg" alt="RUNE" class="rune-icon" />
                  <span class="asset-price">{runePriceUSD ? formatCurrency(runePriceUSD) : ''}</span>
                </div>
                <div class="balance-info">
                  <span class="amount">
                    {unstakedRuneBalance === 'ERROR' ? 'ERROR' : formatRuneAmount(unstakedRuneBalance * 1e8)}
                  </span>
                  <span class="usd-value">
                    {unstakedRuneBalance === 'ERROR' ? 'ERROR' : formatCurrency(unstakedRuneBalance * runePriceUSD)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="distribution-history">
            <div class="history-header">
              <h3>Distribution History ({distributions && distributions.length ? distributions.length : 0} events)</h3>
              <div class="history-controls">
                <button class="icon-button" on:click={() => showAllDistributions = !showAllDistributions} title={showAllDistributions ? 'Show Last 7 Days' : 'Show All History'}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrows-expand" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13A.5.5 0 0 1 1 8zM7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708l2-2zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10z"/>
                  </svg>
                </button>
                <button class="icon-button" on:click={downloadCSV} title="Download CSV">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" x2="12" y1="15" y2="3"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="distribution-history-table">
              <div class="dht-header">
                <div class="dht-cell dht-date">Date</div>
                <div class="dht-cell dht-amount">Amount</div>
                <div class="dht-cell dht-usd">USD Value</div>
              </div>
              <div class="dht-body">
                {#each (showAllDistributions ? distributions : getRecentDistributions()) as distribution}
                  <div class="dht-row">
                    <div class="dht-cell dht-date">{formatDate(Number(distribution.date))}</div>
                    <div class="dht-cell dht-amount">
                      <span class="amount-with-icon">{formatRuneAmount(distribution.amount)}<img src="/assets/coins/RUNE-ICON.svg" alt="RUNE" class="rune-icon" /></span>
                    </div>
                    <div class="dht-cell dht-usd">{formatCurrency((Number(distribution.amount) / 1e8) * getHistoricalRunePrice(Number(distribution.date)))}</div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
```