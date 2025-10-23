const { ipcRenderer } = require('electron');

// Global state
let currentWallet = null;
let currentBalances = null;
let availablePools = [];
let networkInfo = null;
let currentQuote = null;
let trackingInterval = null;
let currentNetworkMode = 'mainnet';
let memolessState = {
    step: 1,
    asset: null,
    memo: null,
    registrationTxId: null,
    referenceData: null,
    inboundAddress: null,
    dustThreshold: null,
    amount: null,
    qrData: null,
    userTxId: null
};

// DOM elements - Basic wallet management
const generateSeedBtn = document.getElementById('generateSeedBtn');
const loadWalletBtn = document.getElementById('loadWalletBtn');
const fetchBalancesBtn = document.getElementById('fetchBalancesBtn');
const fetchNormalizedBtn = document.getElementById('fetchNormalizedBtn');
const seedPhraseTextarea = document.getElementById('seedPhrase');
const walletInfoDiv = document.getElementById('walletInfo');
const walletAddressDiv = document.getElementById('walletAddress');
const walletPubKeyDiv = document.getElementById('walletPubKey');
const balancesContainer = document.getElementById('balancesContainer');
const messagesDiv = document.getElementById('messages');

// DOM elements - Swap interface
const fromAssetSelect = document.getElementById('fromAssetSelect');
const toAssetSelect = document.getElementById('toAssetSelect');
const assetVariant = document.getElementById('assetVariant');
const swapAmountInput = document.getElementById('swapAmount');
const fromAssetBalance = document.getElementById('fromAssetBalance');
const fromAssetUSD = document.getElementById('fromAssetUSD');
const toAssetUSD = document.getElementById('toAssetUSD');
const quoteSection = document.getElementById('quoteSection');
const quoteDisplay = document.getElementById('quoteDisplay');
const getQuoteBtn = document.getElementById('getQuoteBtn');
const executeSwapBtn = document.getElementById('executeSwapBtn');
const swapTracking = document.getElementById('swapTracking');
const trackingDisplay = document.getElementById('trackingDisplay');

// Utility functions
function showMessage(message, type = 'info', duration = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error' : 'success';
    messageDiv.textContent = message;
    
    // Add click to dismiss functionality
    messageDiv.style.cursor = 'pointer';
    messageDiv.title = 'Click to dismiss';
    messageDiv.addEventListener('click', () => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    });
    
    messagesDiv.appendChild(messageDiv);
    
    // Smart duration based on message content and type
    let timeoutDuration = duration;
    if (!timeoutDuration) {
        if (message.toLowerCase().includes('transaction') || message.toLowerCase().includes('txid') || message.toLowerCase().includes('hash')) {
            timeoutDuration = 15000; // 15 seconds for transaction messages
        } else if (type === 'error') {
            timeoutDuration = 8000; // 8 seconds for errors
        } else {
            timeoutDuration = 5000; // 5 seconds for regular messages
        }
    }
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, timeoutDuration);
}

function formatAmount(amount, decimals = 6) {
    return parseFloat(amount).toFixed(decimals);
}

function formatUSD(amount) {
    return '$' + parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getAssetVariantFormat(baseAsset, variant) {
    // THOR.RUNE doesn't have variants, always return as-is
    if (baseAsset === 'THOR.RUNE') {
        return baseAsset;
    }
    
    switch(variant) {
        case 'secured':
            return baseAsset.replace('.', '-');
        case 'trade':
            return baseAsset.replace('.', '~');
        case 'native':
        default:
            return baseAsset;
    }
}

// Wallet Management
generateSeedBtn.addEventListener('click', async () => {
    try {
        const seedPhrase = await ipcRenderer.invoke('generate-seed');
        seedPhraseTextarea.value = seedPhrase;
        showMessage('New seed phrase generated successfully!');
    } catch (error) {
        showMessage(`Error generating seed: ${error.message}`, 'error');
    }
});

loadWalletBtn.addEventListener('click', async () => {
    const seedPhrase = seedPhraseTextarea.value.trim();
    if (!seedPhrase) {
        showMessage('Please enter a seed phrase', 'error');
        return;
    }

    try {
        currentWallet = await ipcRenderer.invoke('create-wallet', seedPhrase);
        
        walletAddressDiv.textContent = currentWallet.address;
        walletPubKeyDiv.textContent = currentWallet.publicKey;
        walletInfoDiv.style.display = 'block';
        
        fetchBalancesBtn.disabled = false;
        fetchNormalizedBtn.disabled = false;
        
        showMessage('Wallet loaded successfully!');
        
        // Load pools, network info, and balances automatically
        await loadPools();
        await loadNetworkInfo();
        await loadBalances();
        
    } catch (error) {
        showMessage(`Error loading wallet: ${error.message}`, 'error');
    }
});

// Balance Management
fetchBalancesBtn.addEventListener('click', loadBalances);
fetchNormalizedBtn.addEventListener('click', loadNormalizedBalances);

async function loadBalances() {
    if (!currentWallet) return;
    
    try {
        const balanceData = await ipcRenderer.invoke('get-balances', currentWallet.address);
        currentBalances = balanceData;
        displayBalances(balanceData);
        updateFromAssetSelect(balanceData.walletBalances);
        showMessage('Balances updated!');
    } catch (error) {
        showMessage(`Error fetching balances: ${error.message}`, 'error');
    }
}

async function loadNormalizedBalances() {
    if (!currentWallet) return;
    
    try {
        const normalizedBalances = await ipcRenderer.invoke('get-normalized-balances', currentWallet.address);
        displayNormalizedBalances(normalizedBalances);
        showMessage('Normalized balances loaded!');
    } catch (error) {
        showMessage(`Error fetching normalized balances: ${error.message}`, 'error');
    }
}

function displayBalances(balanceData) {
    let html = '<h3>Raw Balances</h3>';
    
    if (balanceData.walletBalances.length > 0) {
        html += '<h4>Wallet Balances:</h4>';
        balanceData.walletBalances.forEach(balance => {
            html += `<div class="balance-item"><span>${balance.asset}</span><span>${balance.amount}</span></div>`;
        });
    }
    
    if (balanceData.tradeAccount.length > 0) {
        html += '<h4>Trade Account:</h4>';
        balanceData.tradeAccount.forEach(account => {
            html += `<div class="balance-item"><span>${account.asset}</span><span>${account.units}</span></div>`;
        });
    }
    
    if (balanceData.walletBalances.length === 0 && balanceData.tradeAccount.length === 0) {
        html += '<p>No balances found</p>';
    }
    
    balancesContainer.innerHTML = html;
}

function displayNormalizedBalances(balances) {
    let html = '<h3>Normalized Balances</h3>';
    balances.forEach(balance => {
        const usdValue = balance.price_usd ? formatUSD(balance.total_balance_usd) : 'N/A';
        html += `
            <div class="balance-item">
                <div>
                    <strong>${balance.asset_identifier}</strong><br>
                    <small>Total: ${formatAmount(balance.total_balance)} | USD: ${usdValue}</small>
                </div>
            </div>
        `;
    });
    
    if (balances.length === 0) {
        html += '<p>No normalized balances found</p>';
    }
    
    balancesContainer.innerHTML = html;
}

function updateFromAssetSelect(walletBalances) {
    fromAssetSelect.innerHTML = '<option value="">Select from wallet...</option>';
    
    walletBalances.forEach(balance => {
        if (parseFloat(balance.amount) > 0) {
            const option = document.createElement('option');
            option.value = balance.asset;
            const fullAmount = parseFloat(balance.amount) / 1e8;
            option.textContent = `${balance.asset} (${fullAmount})`;
            option.dataset.balance = balance.amount;
            fromAssetSelect.appendChild(option);
        }
    });
}

// Pool Management
async function loadPools() {
    try {
        availablePools = await ipcRenderer.invoke('get-pools');
        updateToAssetSelect();
        showMessage(`Loaded ${availablePools.length} available pools`);
    } catch (error) {
        showMessage(`Error loading pools: ${error.message}`, 'error');
    }
}

async function loadNetworkInfo() {
    try {
        networkInfo = await ipcRenderer.invoke('get-network');
        updateToAssetSelect(); // Update again after getting network info
        showMessage('Network info loaded');
    } catch (error) {
        showMessage(`Error loading network info: ${error.message}`, 'error');
    }
}

function updateToAssetSelect() {
    toAssetSelect.innerHTML = '<option value="">Select destination...</option>';
    
    // Add THOR.RUNE first if we have network info
    if (networkInfo && networkInfo.rune_price_in_tor) {
        const runePrice = parseFloat(networkInfo.rune_price_in_tor) / 1e8;
        const option = document.createElement('option');
        option.value = 'THOR.RUNE';
        option.textContent = `THOR.RUNE ($${formatAmount(runePrice, 2)})`;
        option.dataset.price = runePrice;
        toAssetSelect.appendChild(option);
    }
    
    // Sort pools by descending balance_rune (most liquid first)
    const sortedPools = [...availablePools].sort((a, b) => b.balance_rune - a.balance_rune);
    
    // Add all pool assets in order of liquidity
    sortedPools.forEach(pool => {
        const option = document.createElement('option');
        option.value = pool.asset;
        option.textContent = `${pool.asset} ($${formatAmount(pool.asset_price_usd || 0, 2)})`;
        option.dataset.price = pool.asset_price_usd || 0;
        toAssetSelect.appendChild(option);
    });
}

// Swap Interface Event Handlers
fromAssetSelect.addEventListener('change', updateFromAssetInfo);
toAssetSelect.addEventListener('change', updateToAssetInfo);
assetVariant.addEventListener('change', updateToAssetInfo);
swapAmountInput.addEventListener('input', updateFromAssetInfo);

function updateFromAssetInfo() {
    const selectedAsset = fromAssetSelect.value;
    const amount = parseFloat(swapAmountInput.value) || 0;
    
    if (selectedAsset) {
        const option = fromAssetSelect.selectedOptions[0];
        const balance = parseFloat(option.dataset.balance) / 1e8;
        fromAssetBalance.textContent = `Balance: ${formatAmount(balance)}`;
        
        // Get USD price from pools
        const pool = availablePools.find(p => p.asset === selectedAsset);
        if (pool && pool.asset_price_usd) {
            const usdValue = amount * pool.asset_price_usd;
            fromAssetUSD.textContent = `≈ ${formatUSD(usdValue)}`;
        } else {
            fromAssetUSD.textContent = '';
        }
        
        updateQuoteButton();
    } else {
        fromAssetBalance.textContent = '';
        fromAssetUSD.textContent = '';
    }
}

function updateToAssetInfo() {
    const selectedAsset = toAssetSelect.value;
    
    if (selectedAsset) {
        let price = 0;
        
        // Handle THOR.RUNE price from network info
        if (selectedAsset === 'THOR.RUNE' && networkInfo && networkInfo.rune_price_in_tor) {
            price = parseFloat(networkInfo.rune_price_in_tor) / 1e8;
        } else {
            // Handle pool asset prices
            const pool = availablePools.find(p => p.asset === selectedAsset);
            if (pool && pool.asset_price_usd) {
                price = pool.asset_price_usd;
            }
        }
        
        if (price > 0) {
            toAssetUSD.textContent = `Price: ${formatUSD(price)}`;
        } else {
            toAssetUSD.textContent = '';
        }
        
        updateQuoteButton();
    } else {
        toAssetUSD.textContent = '';
    }
}

function updateQuoteButton() {
    const hasFromAsset = fromAssetSelect.value;
    const hasToAsset = toAssetSelect.value;
    const hasAmount = parseFloat(swapAmountInput.value) > 0;
    const hasWallet = currentWallet;
    
    getQuoteBtn.disabled = !(hasFromAsset && hasToAsset && hasAmount && hasWallet);
    
    if (hasFromAsset && hasToAsset && hasAmount) {
        quoteSection.style.display = 'block';
    }
}

// Quote and Swap Functionality
getQuoteBtn.addEventListener('click', async () => {
    const fromAsset = fromAssetSelect.value;
    const toAssetBase = toAssetSelect.value;
    const variant = assetVariant.value;
    const amount = parseFloat(swapAmountInput.value);
    
    if (!fromAsset || !toAssetBase || !amount || !currentWallet) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    // Convert to asset variant format
    const toAsset = getAssetVariantFormat(toAssetBase, variant);
    
    try {
        getQuoteBtn.disabled = true;
        getQuoteBtn.textContent = 'Getting Quote...';
        
        const quoteParams = {
            from_asset: fromAsset,
            to_asset: toAsset,
            amount: Math.floor(amount * 1e8).toString(), // Convert to 1e8 format
            destination: currentWallet.address,
            streaming_quantity: 0,
            streaming_interval: 0
        };
        
        currentQuote = await ipcRenderer.invoke('get-swap-quote', quoteParams);
        displayQuote(currentQuote, fromAsset, toAsset, amount);
        executeSwapBtn.disabled = false;
        
        showMessage('Quote retrieved successfully!');
        
    } catch (error) {
        showMessage(`Error getting quote: ${error.message}`, 'error');
    } finally {
        getQuoteBtn.disabled = false;
        getQuoteBtn.textContent = 'Get Quote';
    }
});

function displayQuote(quote, fromAsset, toAsset, amount) {
    const expectedOut = parseFloat(quote.expected_amount_out) / 1e8;
    const fees = quote.fees;
    
    const html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <strong>Swap Details:</strong><br>
                From: ${formatAmount(amount)} ${fromAsset}<br>
                To: ~${formatAmount(expectedOut)} ${toAsset}<br>
                <br>
                <strong>Fees:</strong><br>
                Liquidity: ${formatAmount(parseFloat(fees.liquidity) / 1e8)}<br>
                Outbound: ${formatAmount(parseFloat(fees.outbound) / 1e8)}<br>
                Total Fee: ${formatAmount(parseFloat(fees.total) / 1e8)}<br>
                Slippage: ${(fees.slippage_bps / 100).toFixed(2)}%
            </div>
            <div>
                <strong>Transaction:</strong><br>
                Memo: <code style="font-size: 11px; word-break: break-all;">${quote.memo}</code><br>
                <br>
                <strong>Timing:</strong><br>
                Expires: ${new Date(quote.expiry * 1000).toLocaleString()}<br>
                <br>
                ${quote.warning ? `<div style="color: #ff6b6b;"><strong>Warning:</strong> ${quote.warning}</div>` : ''}
                ${quote.notes ? `<div style="color: #888;"><strong>Notes:</strong> ${quote.notes}</div>` : ''}
            </div>
        </div>
    `;
    
    quoteDisplay.innerHTML = html;
}

executeSwapBtn.addEventListener('click', async () => {
    if (!currentQuote || !currentWallet) {
        showMessage('No quote available or wallet not loaded', 'error');
        return;
    }
    
    try {
        executeSwapBtn.disabled = true;
        executeSwapBtn.textContent = 'Executing...';
        
        // Construct transaction parameters
        const txParams = {
            asset: fromAssetSelect.value,
            amount: Math.floor(parseFloat(swapAmountInput.value) * 1e8).toString(),
            memo: currentQuote.memo,
            useMsgDeposit: true
        };
        
        const txResult = await ipcRenderer.invoke('broadcast-transaction', currentWallet, txParams);
        
        if (txResult.code === 0) {
            showMessage('Swap transaction broadcasted successfully!');
            startTransactionTracking(txResult.transactionHash);
        } else {
            showMessage(`Transaction failed: ${txResult.rawLog}`, 'error');
        }
        
    } catch (error) {
        showMessage(`Error executing swap: ${error.message}`, 'error');
    } finally {
        executeSwapBtn.disabled = false;
        executeSwapBtn.textContent = 'Execute Swap';
    }
});

// Transaction Tracking
function startTransactionTracking(txHash) {
    swapTracking.style.display = 'block';
    trackingDisplay.innerHTML = `
        <div><strong>Transaction Hash:</strong> ${txHash}</div>
        <div><strong>Status:</strong> <span id="txStatus">Tracking...</span></div>
        <div id="txDetails"></div>
    `;
    
    let pollCount = 0;
    const maxPolls = 200; // 10 minutes at 3-second intervals
    
    // Poll every 3 seconds
    trackingInterval = setInterval(async () => {
        pollCount++;
        try {
            const status = await ipcRenderer.invoke('get-tx-status', txHash);
            updateTrackingDisplay(status, txHash, pollCount);
            
            // Only stop tracking if the transaction is actually complete
            if (status.observed_tx && status.observed_tx.finalise_height) {
                clearInterval(trackingInterval);
                setTimeout(() => {
                    loadBalances();
                    showMessage('Swap completed! Balances refreshed.');
                }, 2000);
                return;
            }
            
            // Stop polling after max attempts
            if (pollCount >= maxPolls) {
                clearInterval(trackingInterval);
                showMessage('Transaction tracking timeout. Please check manually.', 'error');
            }
            
        } catch (error) {
            console.error('Error tracking transaction:', error);
            // Don't stop tracking on errors, just log them
        }
    }, 3000);
}

function updateTrackingDisplay(status, txHash, pollCount) {
    const statusElement = document.getElementById('txStatus');
    const detailsElement = document.getElementById('txDetails');
    
    if (status.observed_tx) {
        const tx = status.observed_tx;
        statusElement.textContent = tx.finalise_height ? 'Completed' : 'Processing';
        statusElement.style.color = tx.finalise_height ? '#51cf66' : '#ffd43b';
        
        let details = `
            <div style="margin-top: 10px;">
                <strong>Transaction Details:</strong><br>
                Block Height: ${tx.height || 'Pending'}<br>
                ${tx.finalise_height ? `Finalized at Height: ${tx.finalise_height}<br>` : ''}
                Status: ${tx.status || 'Unknown'}<br>
            </div>
        `;
        
        if (tx.out_txs && tx.out_txs.length > 0) {
            details += '<div style="margin-top: 10px;"><strong>Outbound Transactions:</strong><br>';
            tx.out_txs.forEach((outTx, i) => {
                details += `${i + 1}. Chain: ${outTx.chain}, Hash: ${outTx.hash}<br>`;
            });
            details += '</div>';
        }
        
        detailsElement.innerHTML = details;
    } else {
        statusElement.textContent = 'Waiting for observation...';
        statusElement.style.color = '#ffd43b';
        const timeWaiting = Math.floor((pollCount * 3) / 60);
        const seconds = (pollCount * 3) % 60;
        detailsElement.innerHTML = `
            <div style="margin-top: 10px;">
                <div>Transaction not yet observed by THORChain</div>
                <div style="color: #888; font-size: 12px; margin-top: 5px;">
                    Polling attempt: ${pollCount} | Time waiting: ${timeWaiting}m ${seconds}s
                </div>
                <div style="color: #888; font-size: 12px;">
                    This is normal for new transactions. Will keep checking every 3 seconds...
                </div>
            </div>
        `;
    }
}

// Tab Navigation
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tab navigation
    initTabNavigation();
    
    // Initialize network status
    initNetworkStatus();
    
    showMessage('Welcome! Please load your wallet to start swapping.');
});

function initTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Load memoless data when switching to memoless tab
            if (targetTab === 'memoless') {
                loadMemolessAssets();
            }
        });
    });
}

async function initNetworkStatus() {
    const networkStatusElement = document.getElementById('networkStatus');
    const networkDisplay = document.getElementById('networkDisplay');
    const memolessTabBtn = document.getElementById('memolessTabBtn');
    const mainnetRadio = document.getElementById('mainnetRadio');
    const stagenetRadio = document.getElementById('stagenetRadio');
    const networkSwitchInfo = document.getElementById('networkSwitchInfo');
    
    try {
        // Get current network info
        const networkInfo = await ipcRenderer.invoke('get-network');
        currentNetworkMode = networkInfo.currentNetwork;
        
        // Update network display
        const networkName = currentNetworkMode === 'stagenet' ? 'Stagenet' : 'Mainnet';
        networkDisplay.textContent = networkName;
        
        // Update CSS class for styling
        networkStatusElement.className = `network-status network-${currentNetworkMode}`;
        
        // Update radio buttons
        if (currentNetworkMode === 'stagenet') {
            stagenetRadio.checked = true;
            mainnetRadio.checked = false;
        } else {
            mainnetRadio.checked = true;
            stagenetRadio.checked = false;
        }
        
        // Enable memoless tab only on stagenet
        updateMemolessTabState();
        
        // Add network switcher functionality (top-right status)
        networkStatusElement.addEventListener('click', () => {
            toggleNetwork();
        });
        
        // Add radio button event listeners
        mainnetRadio.addEventListener('change', () => {
            if (mainnetRadio.checked) {
                switchToNetwork('mainnet');
            }
        });
        
        stagenetRadio.addEventListener('change', () => {
            if (stagenetRadio.checked) {
                switchToNetwork('stagenet');
            }
        });
        
    } catch (error) {
        console.error('Error initializing network status:', error);
        networkDisplay.textContent = 'Network Error';
    }
}

function updateMemolessTabState() {
    const memolessTabBtn = document.getElementById('memolessTabBtn');
    const networkSwitchInfo = document.getElementById('networkSwitchInfo');
    
    if (currentNetworkMode === 'stagenet') {
        memolessTabBtn.disabled = false;
        memolessTabBtn.title = '';
        networkSwitchInfo.textContent = 'Memoless is available on Stagenet';
        networkSwitchInfo.style.color = '#51cf66';
    } else {
        memolessTabBtn.disabled = true;
        memolessTabBtn.title = 'Memoless is only available on Stagenet';
        networkSwitchInfo.textContent = 'Switch to Stagenet to use Memoless';
        networkSwitchInfo.style.color = '#ffa726';
    }
}

async function switchToNetwork(network) {
    if (network === currentNetworkMode) return;
    
    try {
        showMessage(`Switching to ${network}...`);
        
        await ipcRenderer.invoke('set-network', network);
        
        // Update current network mode
        currentNetworkMode = network;
        
        // Update all UI elements
        const networkDisplay = document.getElementById('networkDisplay');
        const networkStatusElement = document.getElementById('networkStatus');
        
        const networkName = network === 'stagenet' ? 'Stagenet' : 'Mainnet';
        networkDisplay.textContent = networkName;
        networkStatusElement.className = `network-status network-${network}`;
        
        // Update memoless tab state
        updateMemolessTabState();
        
        // Clear wallet and balances when switching networks
        if (currentWallet) {
            currentWallet = null;
            currentBalances = null;
            availablePools = [];
            networkInfo = null;
            
            // Reset UI
            document.getElementById('walletInfo').style.display = 'none';
            document.getElementById('fetchBalancesBtn').disabled = true;
            document.getElementById('fetchNormalizedBtn').disabled = true;
            document.getElementById('balancesContainer').innerHTML = '';
            document.getElementById('fromAssetSelect').innerHTML = '<option value="">Select from wallet...</option>';
            document.getElementById('toAssetSelect').innerHTML = '<option value="">Select destination...</option>';
            
            showMessage(`Switched to ${networkName}. Please reload your wallet.`, 'info');
        } else {
            showMessage(`Switched to ${networkName}`);
        }
        
    } catch (error) {
        showMessage(`Error switching to ${network}: ${error.message}`, 'error');
        
        // Revert radio button selection
        const mainnetRadio = document.getElementById('mainnetRadio');
        const stagenetRadio = document.getElementById('stagenetRadio');
        
        if (currentNetworkMode === 'stagenet') {
            stagenetRadio.checked = true;
            mainnetRadio.checked = false;
        } else {
            mainnetRadio.checked = true;
            stagenetRadio.checked = false;
        }
    }
}

async function toggleNetwork() {
    try {
        const newNetwork = currentNetworkMode === 'mainnet' ? 'stagenet' : 'mainnet';
        await ipcRenderer.invoke('set-network', newNetwork);
        
        // Reload the page to reflect network change
        location.reload();
        
    } catch (error) {
        showMessage(`Error switching network: ${error.message}`, 'error');
    }
}

// Memoless functionality
let validMemolessAssets = [];

async function loadMemolessAssets() {
    const assetSelect = document.getElementById('assetSelect');
    const assetPrice = document.getElementById('assetPrice');
    
    try {
        assetSelect.innerHTML = '<option value="">Loading assets...</option>';
        
        validMemolessAssets = await ipcRenderer.invoke('memoless-get-valid-assets');
        
        assetSelect.innerHTML = '<option value="">Select an asset...</option>';
        validMemolessAssets.forEach(asset => {
            const option = document.createElement('option');
            option.value = asset.asset;
            option.textContent = `${asset.asset} - $${asset.priceUSD.toFixed(2)}`;
            option.dataset.price = asset.priceUSD;
            option.dataset.decimals = asset.decimals;
            assetSelect.appendChild(option);
        });
        
        showMessage(`Loaded ${validMemolessAssets.length} valid memoless assets`);
        
    } catch (error) {
        showMessage(`Error loading memoless assets: ${error.message}`, 'error');
        assetSelect.innerHTML = '<option value="">Error loading assets</option>';
    }
}

// Asset selection handler
document.addEventListener('DOMContentLoaded', () => {
    const assetSelect = document.getElementById('assetSelect');
    const assetPrice = document.getElementById('assetPrice');
    const memoStep = document.getElementById('memoStep');
    const registerMemoBtn = document.getElementById('registerMemoBtn');
    
    assetSelect.addEventListener('change', (e) => {
        const selectedAsset = e.target.value;
        const selectedOption = e.target.selectedOptions[0];
        
        if (selectedAsset) {
            const price = selectedOption.dataset.price;
            assetPrice.textContent = `Current price: $${parseFloat(price).toFixed(2)} USD`;
            
            memolessState.asset = selectedAsset;
            memoStep.style.display = 'block';
        } else {
            assetPrice.textContent = '';
            memoStep.style.display = 'none';
            registerMemoBtn.style.display = 'none';
        }
    });
    
    // Memo input handler
    const memoInput = document.getElementById('memoInput');
    memoInput.addEventListener('input', (e) => {
        memolessState.memo = e.target.value.trim();
        
        if (memolessState.asset && memolessState.memo) {
            registerMemoBtn.style.display = 'inline-block';
        } else {
            registerMemoBtn.style.display = 'none';
        }
    });
    
    // Register memo button handler
    registerMemoBtn.addEventListener('click', showRegistrationConfirmation);
});

async function showRegistrationConfirmation() {
    const overlay = document.getElementById('registrationOverlay');
    const confirmAsset = document.getElementById('confirmAsset');
    const confirmMemo = document.getElementById('confirmMemo');
    const confirmRuneBalance = document.getElementById('confirmRuneBalance');
    
    try {
        // Update confirmation details
        confirmAsset.textContent = memolessState.asset;
        confirmMemo.textContent = memolessState.memo;
        
        // Get RUNE balance if wallet is loaded
        if (currentWallet) {
            const runeBalance = await ipcRenderer.invoke('memoless-get-rune-balance', currentWallet.address);
            confirmRuneBalance.textContent = `${runeBalance} RUNE`;
        } else {
            confirmRuneBalance.textContent = '0.00 RUNE (No wallet loaded)';
        }
        
        // Show overlay
        overlay.style.display = 'flex';
        
    } catch (error) {
        showMessage(`Error preparing registration: ${error.message}`, 'error');
    }
}

function cancelRegistration() {
    const overlay = document.getElementById('registrationOverlay');
    overlay.style.display = 'none';
}

// Confirm registration handler
document.addEventListener('DOMContentLoaded', () => {
    const confirmRegistrationBtn = document.getElementById('confirmRegistrationBtn');
    
    confirmRegistrationBtn.addEventListener('click', async () => {
        if (!currentWallet) {
            showMessage('Please load a wallet first', 'error');
            return;
        }
        
        try {
            confirmRegistrationBtn.disabled = true;
            confirmRegistrationBtn.textContent = 'Registering...';
            
            // Register the memo
            const txHash = await ipcRenderer.invoke('memoless-register-memo', 
                currentWallet, memolessState.asset, memolessState.memo);
            
            memolessState.registrationTxId = txHash;
            
            showMessage(`Memo registered! Transaction: ${txHash}`);
            
            // Hide overlay
            cancelRegistration();
            
            // Wait and get reference data
            setTimeout(async () => {
                await getMemoReference();
            }, 6000);
            
        } catch (error) {
            showMessage(`Registration failed: ${error.message}`, 'error');
        } finally {
            confirmRegistrationBtn.disabled = false;
            confirmRegistrationBtn.textContent = 'Confirm Registration';
        }
    });
});

async function getMemoReference() {
    try {
        showMessage('Getting reference ID...', 'info');
        
        const referenceData = await ipcRenderer.invoke('memoless-get-memo-reference', 
            memolessState.registrationTxId);
        
        memolessState.referenceData = referenceData;
        
        showMessage(`Reference ID: ${referenceData.reference}`);
        
        // Show amount configuration step
        showAmountStep();
        
    } catch (error) {
        showMessage(`Error getting reference: ${error.message}`, 'error');
        showErrorStep(`Failed to get reference ID: ${error.message}`);
    }
}

function showAmountStep() {
    const amountStep = document.getElementById('amountStep');
    const amountInput = document.getElementById('amountInput');
    const amountPreview = document.getElementById('amountPreview');
    const previewAmount = document.getElementById('previewAmount');
    const previewUSD = document.getElementById('previewUSD');
    const amountTypeAsset = document.getElementById('amountTypeAsset');
    const amountTypeUSD = document.getElementById('amountTypeUSD');
    const amountInputLabel = document.getElementById('amountInputLabel');
    
    amountStep.style.display = 'block';
    
    // Handle amount type switching
    const updateAmountInputLabel = () => {
        const selectedAsset = validMemolessAssets.find(a => a.asset === memolessState.asset);
        if (amountTypeAsset.checked) {
            amountInputLabel.textContent = `Enter amount in ${selectedAsset ? selectedAsset.asset : 'asset'} terms`;
            amountInput.placeholder = '0.00';
        } else {
            amountInputLabel.textContent = 'Enter amount in USD terms';
            amountInput.placeholder = '0.00 USD';
        }
        amountInput.value = '';
        amountPreview.style.display = 'none';
    };
    
    amountTypeAsset.addEventListener('change', updateAmountInputLabel);
    amountTypeUSD.addEventListener('change', updateAmountInputLabel);
    
    // Add real-time amount validation
    amountInput.addEventListener('input', async (e) => {
        const userAmount = e.target.value;
        
        if (!userAmount || !memolessState.referenceData) {
            amountPreview.style.display = 'none';
            clearValidationErrors();
            return;
        }
        
        try {
            const selectedAsset = validMemolessAssets.find(a => a.asset === memolessState.asset);
            if (!selectedAsset) return;
            
            let finalUserAmount = userAmount;
            
            // Convert USD to asset amount if USD mode is selected
            if (amountTypeUSD.checked) {
                const usdAmount = parseFloat(userAmount);
                if (isNaN(usdAmount) || usdAmount <= 0) {
                    amountPreview.style.display = 'none';
                    showValidationErrors(['USD amount must be a valid positive number']);
                    return;
                }
                finalUserAmount = (usdAmount / selectedAsset.priceUSD).toString();
            }
            
            // Get inbound info for dust threshold validation
            const inboundInfo = await ipcRenderer.invoke('memoless-get-inbound-for-asset', memolessState.asset);
            
            // Use comprehensive validation with dust threshold
            const validation = await ipcRenderer.invoke('memoless-validate-amount-for-deposit',
                finalUserAmount, memolessState.referenceData.reference, selectedAsset.decimals, inboundInfo.dustThreshold);
            
            if (validation.isValid) {
                clearValidationErrors();
                previewAmount.textContent = validation.finalAmount;
                
                // Calculate USD equivalent
                const usdValue = await ipcRenderer.invoke('memoless-calculate-usd',
                    validation.finalAmount, selectedAsset.priceUSD);
                previewUSD.textContent = `$${usdValue} USD`;
                
                amountPreview.style.display = 'block';
                
                // Store final amount and dust threshold
                memolessState.amount = validation.finalAmount;
                memolessState.dustThreshold = inboundInfo.dustThreshold;
                
                console.log(`DEBUG: Stored memolessState.amount = ${memolessState.amount}`);
                
                // Show deposit step after a brief delay
                setTimeout(() => {
                    showDepositStep();
                }, 1000);
                
            } else {
                amountPreview.style.display = 'none';
                showValidationErrors(validation.errors);
            }
            
            // Show warnings even if valid
            if (validation.warnings && validation.warnings.length > 0) {
                showValidationWarnings(validation.warnings);
            }
            
        } catch (error) {
            console.error('Error validating amount:', error);
            showValidationErrors([`Validation error: ${error.message}`]);
        }
    });
}

// Validation feedback functions
function showValidationErrors(errors) {
    clearValidationErrors();
    if (!errors || errors.length === 0) return;
    
    const amountInputContainer = document.querySelector('.amount-input-container');
    const errorDiv = document.createElement('div');
    errorDiv.id = 'amountValidationErrors';
    errorDiv.style.cssText = 'color: #ff6b6b; background-color: #2d1b1b; padding: 8px 12px; border-radius: 4px; margin: 8px 0; border-left: 4px solid #ff6b6b; font-size: 14px;';
    
    const errorList = errors.map(error => `• ${error}`).join('<br>');
    errorDiv.innerHTML = `<strong>Validation Errors:</strong><br>${errorList}`;
    
    amountInputContainer.appendChild(errorDiv);
}

function showValidationWarnings(warnings) {
    clearValidationWarnings();
    if (!warnings || warnings.length === 0) return;
    
    const amountInputContainer = document.querySelector('.amount-input-container');
    const warningDiv = document.createElement('div');
    warningDiv.id = 'amountValidationWarnings';
    warningDiv.style.cssText = 'color: #ffa726; background-color: #2d2418; padding: 8px 12px; border-radius: 4px; margin: 8px 0; border-left: 4px solid #ffa726; font-size: 14px;';
    
    const warningList = warnings.map(warning => `• ${warning}`).join('<br>');
    warningDiv.innerHTML = `<strong>Warnings:</strong><br>${warningList}`;
    
    amountInputContainer.appendChild(warningDiv);
}

function clearValidationErrors() {
    const existing = document.getElementById('amountValidationErrors');
    if (existing) existing.remove();
}

function clearValidationWarnings() {
    const existing = document.getElementById('amountValidationWarnings');
    if (existing) existing.remove();
}

async function validateMemoRegistration(selectedAsset) {
    try {
        showMessage('Validating memo registration...', 'info');
        
        console.log(`DEBUG: About to validate with memolessState.amount = ${memolessState.amount}`);
        
        const validation = await ipcRenderer.invoke('memoless-validate-registration',
            memolessState.asset,
            memolessState.amount,
            selectedAsset.decimals,
            memolessState.memo,
            memolessState.referenceData.reference
        );
        
        if (validation.isValid) {
            // Store memo check data
            memolessState.memoCheck = validation.memoCheck;
            showMessage('Memo registration validated successfully!');
        } else {
            showMessage('Memo validation failed', 'error');
            console.warn('Memo validation errors:', validation.errors);
            // Don't show validation errors in UI since this happens in deposit step
            // Just log for debugging
        }
        
    } catch (error) {
        console.error('Error validating memo registration:', error);
        showMessage(`Error validating memo: ${error.message}`, 'error');
    }
}

async function showDepositStep() {
    const depositStep = document.getElementById('depositStep');
    const depositAmount = document.getElementById('depositAmount');
    const depositAssetName = document.getElementById('depositAssetName');
    const depositChain = document.getElementById('depositChain');
    const depositAddress = document.getElementById('depositAddress');
    const exactAmount = document.getElementById('exactAmount');
    
    try {
        depositStep.style.display = 'block';
        
        // Get inbound address for asset
        const inboundInfo = await ipcRenderer.invoke('memoless-get-inbound-for-asset', memolessState.asset);
        memolessState.inboundAddress = inboundInfo.address;
        memolessState.dustThreshold = inboundInfo.dustThreshold;
        
        // Parse asset format: CHAIN.ASSET (e.g., "BSC.BNB" -> chain: "BSC", asset: "BNB")
        const [chain, assetName] = memolessState.asset.split('.');
        
        // Update UI with proper asset name and chain
        depositAmount.textContent = memolessState.amount;
        depositAssetName.textContent = assetName; // e.g., "BNB"
        depositChain.textContent = chain; // e.g., "BSC"
        depositAddress.textContent = inboundInfo.address;
        exactAmount.textContent = memolessState.amount;
        
        // Validate memo registration if we haven't done it yet
        if (!memolessState.memoCheck && memolessState.referenceData && memolessState.amount) {
            const selectedAsset = validMemolessAssets.find(a => a.asset === memolessState.asset);
            if (selectedAsset) {
                await validateMemoRegistration(selectedAsset);
            }
        }
        
        // Display usage statistics if available
        if (memolessState.memoCheck) {
            const usageStats = document.getElementById('usageStats');
            const usageCount = document.getElementById('usageCount');
            const maxUse = document.getElementById('maxUse');
            const expiresAt = document.getElementById('expiresAt');
            const expiryTimeContainer = document.getElementById('expiryTimeContainer');
            const expiryTime = document.getElementById('expiryTime');
            
            usageCount.textContent = memolessState.memoCheck.usage_count;
            maxUse.textContent = memolessState.memoCheck.max_use;
            expiresAt.textContent = memolessState.memoCheck.expires_at;
            usageStats.style.display = 'block';
            
            // Calculate and display expiry time estimate
            calculateExpiryTime(memolessState.memoCheck.expires_at);
        }
        
        // Generate QR code
        const qrData = await ipcRenderer.invoke('memoless-generate-qr',
            chain, inboundInfo.address, memolessState.amount);
        memolessState.qrData = qrData;
        
        // Display actual QR code image or fallback to text
        const qrPlaceholder = document.getElementById('qrPlaceholder');
        if (qrData.qrCodeDataURL) {
            // Show actual QR code image
            qrPlaceholder.innerHTML = `<img src="${qrData.qrCodeDataURL}" alt="QR Code" style="max-width: 100%; height: auto; border-radius: 8px;">`;
            qrPlaceholder.style.border = 'none';
            qrPlaceholder.style.backgroundColor = 'transparent';
        } else {
            // Fallback to text display
            qrPlaceholder.textContent = qrData.qrString;
            qrPlaceholder.style.fontSize = '12px';
            qrPlaceholder.style.wordBreak = 'break-all';
            qrPlaceholder.style.border = '2px dashed #555';
            qrPlaceholder.style.backgroundColor = '#333';
        }
        
        showMessage('Deposit instructions ready!');
        
    } catch (error) {
        showMessage(`Error preparing deposit: ${error.message}`, 'error');
        showErrorStep(`Failed to prepare deposit: ${error.message}`);
    }
}

function showErrorStep(message) {
    const errorStep = document.getElementById('errorStep');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    errorStep.style.display = 'block';
    
    // Hide other steps
    document.getElementById('amountStep').style.display = 'none';
    document.getElementById('depositStep').style.display = 'none';
}

function restartMemolessFlow() {
    // Reset state
    memolessState = {
        step: 1,
        asset: null,
        memo: null,
        registrationTxId: null,
        referenceData: null,
        inboundAddress: null,
        dustThreshold: null,
        amount: null,
        qrData: null,
        userTxId: null
    };
    
    // Hide all steps except first
    document.getElementById('memoStep').style.display = 'none';
    document.getElementById('amountStep').style.display = 'none';
    document.getElementById('depositStep').style.display = 'none';
    document.getElementById('errorStep').style.display = 'none';
    document.getElementById('registerMemoBtn').style.display = 'none';
    
    // Reset form fields
    document.getElementById('assetSelect').value = '';
    document.getElementById('memoInput').value = '';
    document.getElementById('amountInput').value = '';
    document.getElementById('assetPrice').textContent = '';
    
    showMessage('Memoless flow restarted');
}

// Copy to clipboard functionality
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        showMessage('Copied to clipboard!');
    }).catch(err => {
        showMessage('Failed to copy to clipboard', 'error');
    });
}

// Add event listeners for restart buttons
document.addEventListener('DOMContentLoaded', () => {
    const startOverBtn = document.getElementById('startOverBtn');
    const restartBtn = document.getElementById('restartBtn');
    const trackDepositBtn = document.getElementById('trackDepositBtn');
    
    if (startOverBtn) {
        startOverBtn.addEventListener('click', restartMemolessFlow);
    }
    
    if (restartBtn) {
        restartBtn.addEventListener('click', restartMemolessFlow);
    }
    
    if (trackDepositBtn) {
        trackDepositBtn.addEventListener('click', () => {
            openTrackingModal();
        });
    }
});

// Calculate and display expiry time estimate
async function calculateExpiryTime(expiryBlock) {
    try {
        const expiryTimeContainer = document.getElementById('expiryTimeContainer');
        const expiryTime = document.getElementById('expiryTime');
        
        expiryTimeContainer.style.display = 'block';
        expiryTime.textContent = 'Calculating...';
        
        const expiryEstimate = await ipcRenderer.invoke('memoless-get-expiry-estimate', expiryBlock);
        
        if (expiryEstimate.timeRemaining === 'Expired') {
            expiryTime.textContent = 'Expired';
            expiryTime.style.color = '#ff6b6b';
        } else if (expiryEstimate.timeRemaining === 'Unknown') {
            expiryTime.textContent = 'Unknown';
            expiryTime.style.color = '#888';
        } else {
            expiryTime.textContent = `~${expiryEstimate.timeRemaining}`;
            expiryTime.style.color = '#ffa726';
        }
        
    } catch (error) {
        console.error('Error calculating expiry time:', error);
        const expiryTime = document.getElementById('expiryTime');
        if (expiryTime) {
            expiryTime.textContent = 'Error';
            expiryTime.style.color = '#ff6b6b';
        }
    }
}

// Transaction tracking modal functions
function openTrackingModal() {
    const trackingOverlay = document.getElementById('trackingOverlay');
    const txidInput = document.getElementById('txidInput');
    const trackingError = document.getElementById('trackingError');
    
    // Clear previous input and errors
    txidInput.value = '';
    trackingError.style.display = 'none';
    
    trackingOverlay.style.display = 'flex';
    
    // Focus on input after a short delay to ensure modal is visible
    setTimeout(() => {
        txidInput.focus();
    }, 100);
}

function closeTrackingModal() {
    const trackingOverlay = document.getElementById('trackingOverlay');
    trackingOverlay.style.display = 'none';
}

function formatTxIdForExplorer(txid) {
    // Strip 0x prefix if present (for Ethereum/BSC transactions)
    if (txid.startsWith('0x') || txid.startsWith('0X')) {
        return txid.slice(2);
    }
    return txid;
}

function validateTxId(txid) {
    if (!txid || typeof txid !== 'string') {
        return false;
    }
    
    const cleanTxid = txid.trim();
    
    // Basic validation - should be at least 32 characters (most chains use 32-64 char hashes)
    if (cleanTxid.length < 32) {
        return false;
    }
    
    // Check for valid hex characters (with or without 0x prefix)
    const hexPattern = /^(0x)?[a-fA-F0-9]+$/;
    return hexPattern.test(cleanTxid);
}

function openBlockExplorer() {
    const txidInput = document.getElementById('txidInput');
    const trackingError = document.getElementById('trackingError');
    const txid = txidInput.value.trim();
    
    // Hide any previous errors
    trackingError.style.display = 'none';
    
    if (!validateTxId(txid)) {
        trackingError.textContent = 'Please enter a valid transaction hash (minimum 32 characters, hexadecimal format).';
        trackingError.style.display = 'block';
        return;
    }
    
    // Format the TXID for the explorer (remove 0x prefix if present)
    const formattedTxid = formatTxIdForExplorer(txid);
    
    // Open thorchain.net block explorer
    const explorerUrl = `https://thorchain.net/tx/${formattedTxid}`;
    
    try {
        window.open(explorerUrl, '_blank');
        showMessage(`Opening block explorer for transaction: ${formattedTxid}`);
        closeTrackingModal();
    } catch (error) {
        trackingError.textContent = 'Failed to open block explorer. Please check your browser settings.';
        trackingError.style.display = 'block';
    }
}

// Allow Enter key to trigger the explorer opening
document.addEventListener('DOMContentLoaded', () => {
    const txidInput = document.getElementById('txidInput');
    if (txidInput) {
        txidInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                openBlockExplorer();
            }
        });
    }
    
    // Transaction tracking event listeners
    const trackTxBtn = document.getElementById('trackTxBtn');
    const pollTxBtn = document.getElementById('pollTxBtn');
    const testSampleTxBtn = document.getElementById('testSampleTxBtn');
    
    if (trackTxBtn) {
        trackTxBtn.addEventListener('click', trackTransaction);
    }
    
    if (pollTxBtn) {
        pollTxBtn.addEventListener('click', pollTransaction);
    }
    
    if (testSampleTxBtn) {
        testSampleTxBtn.addEventListener('click', testSampleTransaction);
    }
});

// Transaction tracking functions
async function trackTransaction() {
    const hashInput = document.getElementById('trackTxHash');
    const hash = hashInput.value.trim();
    
    if (!hash) {
        showMessage('Please enter a transaction hash', 'error');
        return;
    }
    
    try {
        showMessage('Tracking transaction...', 'info');
        
        const result = await ipcRenderer.invoke('track-transaction', hash);
        displayTransactionStages(result);
        
        showMessage('Transaction tracking complete!');
        
    } catch (error) {
        console.error('Error tracking transaction:', error);
        showMessage(`Error tracking transaction: ${error.message}`, 'error');
    }
}

async function pollTransaction() {
    const hashInput = document.getElementById('trackTxHash');
    const hash = hashInput.value.trim();
    
    if (!hash) {
        showMessage('Please enter a transaction hash', 'error');
        return;
    }
    
    try {
        showMessage('Polling transaction status...', 'info');
        
        const result = await ipcRenderer.invoke('poll-transaction', hash, 30, 2000);
        displayTransactionStages(result);
        
        if (result.completed) {
            showMessage(`Transaction completed after ${result.attempts} attempts!`);
        } else {
            showMessage(`Polling stopped after ${result.attempts} attempts. Transaction may still be processing.`, 'error');
        }
        
    } catch (error) {
        console.error('Error polling transaction:', error);
        showMessage(`Error polling transaction: ${error.message}`, 'error');
    }
}

function testSampleTransaction() {
    // This would use a known test transaction hash for demonstration
    const hashInput = document.getElementById('trackTxHash');
    hashInput.value = 'F8C44AEB30D7EBE6230C0A68A1781F48AE96A4A18E32EE8FF94D3AAE8CAF3E9C'; // Sample hash
    trackTransaction();
}

function displayTransactionStages(result) {
    const trackingResult = document.getElementById('trackingResult');
    const stagesDisplay = document.getElementById('stagesDisplay');
    const stagesContainer = document.getElementById('stagesContainer');
    
    // Basic result display
    trackingResult.innerHTML = `
        <div class="card" style="background-color: #2d2d2d; padding: 15px; margin: 10px 0; border-radius: 6px;">
            <h4>Transaction: ${result.hash.substring(0, 16)}...</h4>
            <p><strong>Status:</strong> <span style="color: ${getStatusColor(result.status)}">${result.status.toUpperCase()}</span></p>
            ${result.error ? `<p style="color: #ff6b6b;"><strong>Error:</strong> ${result.error}</p>` : ''}
        </div>
    `;
    
    // Enhanced stages display
    if (result.stages && result.stages.length > 0) {
        stagesContainer.innerHTML = '';
        
        result.stages.forEach(stage => {
            const stageElement = createStageElement(stage);
            stagesContainer.appendChild(stageElement);
        });
        
        stagesDisplay.style.display = 'block';
    } else {
        stagesDisplay.style.display = 'none';
    }
}

function createStageElement(stage) {
    const div = document.createElement('div');
    
    let stageClass = 'pending';
    let iconContent = '○';
    
    if (stage.completed) {
        stageClass = 'completed';
        iconContent = '✓';
    } else if (stage.started) {
        stageClass = 'started';
        iconContent = '◐';
    }
    
    let details = '';
    if (stage.details) {
        details = stage.details;
    } else if (stage.final_count > 0) {
        details = `Count: ${stage.final_count}`;
    }
    
    div.className = `stage-item ${stageClass}`;
    div.innerHTML = `
        <div class="stage-icon ${stageClass}">${iconContent}</div>
        <div class="stage-content">
            <div class="stage-name">${stage.name}</div>
            ${details ? `<div class="stage-details">${details}</div>` : ''}
        </div>
    `;
    
    return div;
}

function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'completed': return '#51cf66';
        case 'processing': return '#ffa726';
        case 'pending': return '#666';
        case 'unknown': return '#ff6b6b';
        default: return '#ccc';
    }
}