/**
 * Wallet Authentication Modal Component
 * 
 * Basic wallet auth modal component placeholder
 */

class WalletAuthModal {
    // Placeholder wallet auth modal functionality
    // The actual functionality is handled by SettingsManager
    
    static show(wallet) {
        if (window.runeToolsApp?.controllers?.settingsManager) {
            window.runeToolsApp.controllers.settingsManager.showWalletAuthModal(wallet);
        }
    }
    
    static hide() {
        const modal = document.getElementById('walletAuthModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}