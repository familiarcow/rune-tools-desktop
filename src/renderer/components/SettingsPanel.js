/**
 * Settings Panel Component
 * 
 * Basic settings panel component placeholder
 */

class SettingsPanel {
    // Placeholder settings panel functionality
    // The actual settings functionality is handled by SettingsManager
    
    static show() {
        if (window.runeToolsApp?.controllers?.settingsManager) {
            window.runeToolsApp.controllers.settingsManager.showSettings();
        }
    }
    
    static hide() {
        if (window.runeToolsApp?.controllers?.settingsManager) {
            window.runeToolsApp.controllers.settingsManager.hideSettings();
        }
    }
}