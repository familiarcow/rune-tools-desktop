const { ipcRenderer } = require('electron');

let currentWallet: any = null;

// DOM elements
const generateSeedBtn = document.getElementById('generateSeedBtn') as HTMLButtonElement;
const loadWalletBtn = document.getElementById('loadWalletBtn') as HTMLButtonElement;
const fetchBalancesBtn = document.getElementById('fetchBalancesBtn') as HTMLButtonElement;
const fetchNodeInfoBtn = document.getElementById('fetchNodeInfoBtn') as HTMLButtonElement;
const seedPhraseTextarea = document.getElementById('seedPhrase') as HTMLTextAreaElement;
const walletInfoDiv = document.getElementById('walletInfo') as HTMLDivElement;
const walletAddressDiv = document.getElementById('walletAddress') as HTMLDivElement;
const walletPubKeyDiv = document.getElementById('walletPubKey') as HTMLDivElement;
const balancesContainer = document.getElementById('balancesContainer') as HTMLDivElement;
const nodeInfoContainer = document.getElementById('nodeInfoContainer') as HTMLDivElement;
const messagesDiv = document.getElementById('messages') as HTMLDivElement;

// Utility functions
function showMessage(message: string, type: 'success' | 'error' = 'success') {
    const messageElement = document.createElement('div');
    messageElement.className = type;
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
    
    setTimeout(() => {
        messagesDiv.removeChild(messageElement);
    }, 5000);
}

function clearMessages() {
    messagesDiv.innerHTML = '';
}

// Event handlers
generateSeedBtn.addEventListener('click', async () => {
    try {
        clearMessages();
        generateSeedBtn.disabled = true;
        generateSeedBtn.textContent = 'Generating...';
        
        const seedPhrase = await ipcRenderer.invoke('generate-seed');
        seedPhraseTextarea.value = seedPhrase;
        showMessage('Seed phrase generated successfully!');
    } catch (error) {
        console.error('Error generating seed phrase:', error);
        showMessage('Failed to generate seed phrase: ' + (error as Error).message, 'error');
    } finally {
        generateSeedBtn.disabled = false;
        generateSeedBtn.textContent = 'Generate New Seed Phrase';
    }
});

loadWalletBtn.addEventListener('click', async () => {
    try {
        clearMessages();
        const mnemonic = seedPhraseTextarea.value.trim();
        
        if (!mnemonic) {
            showMessage('Please enter a seed phrase first', 'error');
            return;
        }
        
        loadWalletBtn.disabled = true;
        loadWalletBtn.textContent = 'Loading...';
        
        currentWallet = await ipcRenderer.invoke('create-wallet', mnemonic);
        
        walletAddressDiv.textContent = currentWallet.address;
        walletPubKeyDiv.textContent = currentWallet.publicKey;
        walletInfoDiv.style.display = 'block';
        fetchBalancesBtn.disabled = false;
        
        showMessage('Wallet loaded successfully!');
    } catch (error) {
        console.error('Error loading wallet:', error);
        showMessage('Failed to load wallet: ' + (error as Error).message, 'error');
    } finally {
        loadWalletBtn.disabled = false;
        loadWalletBtn.textContent = 'Load Wallet';
    }
});

fetchBalancesBtn.addEventListener('click', async () => {
    try {
        clearMessages();
        if (!currentWallet) {
            showMessage('Please load a wallet first', 'error');
            return;
        }
        
        fetchBalancesBtn.disabled = true;
        fetchBalancesBtn.textContent = 'Fetching...';
        
        const balances = await ipcRenderer.invoke('get-balances', currentWallet.address);
        
        balancesContainer.innerHTML = '<h3>Balances</h3>';
        
        if (balances.length === 0) {
            balancesContainer.innerHTML += '<p>No balances found for this address.</p>';
        } else {
            balances.forEach((balance: any) => {
                const balanceItem = document.createElement('div');
                balanceItem.className = 'balance-item';
                balanceItem.innerHTML = `
                    <span>${balance.asset}</span>
                    <span>${balance.amount}</span>
                `;
                balancesContainer.appendChild(balanceItem);
            });
        }
        
        showMessage('Balances fetched successfully!');
    } catch (error) {
        console.error('Error fetching balances:', error);
        showMessage('Failed to fetch balances: ' + (error as Error).message, 'error');
    } finally {
        fetchBalancesBtn.disabled = false;
        fetchBalancesBtn.textContent = 'Fetch Balances';
    }
});

fetchNodeInfoBtn.addEventListener('click', async () => {
    try {
        clearMessages();
        fetchNodeInfoBtn.disabled = true;
        fetchNodeInfoBtn.textContent = 'Fetching...';
        
        const nodeInfo = await ipcRenderer.invoke('get-node-info');
        
        nodeInfoContainer.innerHTML = '<h3>Node Information</h3>';
        nodeInfoContainer.innerHTML += `<pre>${JSON.stringify(nodeInfo, null, 2)}</pre>`;
        
        showMessage('Node info fetched successfully!');
    } catch (error) {
        console.error('Error fetching node info:', error);
        showMessage('Failed to fetch node info: ' + (error as Error).message, 'error');
    } finally {
        fetchNodeInfoBtn.disabled = false;
        fetchNodeInfoBtn.textContent = 'Fetch Node Info';
    }
});

// Pre-fill the test seed phrase if provided
window.addEventListener('DOMContentLoaded', () => {
    const testSeedPhrase = 'glove romance mirror crisp vivid luxury arch thunder spirit soft supply tattoo';
    seedPhraseTextarea.value = testSeedPhrase;
    showMessage('Test seed phrase loaded. Expected address: thor1x87wm98lyd0dnep23zjr68cvay3zazrvym6v7j');
});