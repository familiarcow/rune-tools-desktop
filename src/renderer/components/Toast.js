/**
 * Toast Component
 * 
 * Basic toast component placeholder
 */

class Toast {
    // Placeholder toast functionality
    // The actual toast functionality is handled by UIService
    
    static show(type, message, duration) {
        if (window.runeToolsApp?.services?.ui) {
            return window.runeToolsApp.services.ui.showToast(type, message, duration);
        }
        console.warn('Toast service not available');
        return null;
    }
    
    static hide(toastId) {
        if (window.runeToolsApp?.services?.ui) {
            window.runeToolsApp.services.ui.hideToast(toastId);
        }
    }
}