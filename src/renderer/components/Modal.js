/**
 * Modal Component
 * 
 * Basic modal component placeholder
 */

class Modal {
    // Placeholder modal functionality
    // The actual modal functionality is handled by UIService
    
    static show(config) {
        if (window.runeToolsApp?.services?.ui) {
            return window.runeToolsApp.services.ui.showModal(config);
        }
        console.warn('Modal service not available');
        return null;
    }
    
    static hide(modalId) {
        if (window.runeToolsApp?.services?.ui) {
            window.runeToolsApp.services.ui.hideModal(modalId);
        }
    }
}