/**
 * SplashScreen Component
 * 
 * Controls the visibility of the inline splash screen that's embedded 
 * directly in the HTML to prevent any flash during app startup.
 */

export class SplashScreen {
    private container: HTMLElement | null = null;
    private isVisible: boolean = false;

    constructor() {
        // Find the inline splash screen element
        this.container = document.getElementById('splash-screen-inline');
        if (this.container) {
            this.isVisible = true; // Already visible by default
        }
    }

    // No need to create elements - they're already in the HTML

    public show(): void {
        if (!this.container) return;
        
        // The splash screen is already visible by default in the HTML
        this.isVisible = true;
        this.container.style.opacity = '1';
        this.container.style.pointerEvents = 'auto';
    }

    public hide(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.container || !this.isVisible) {
                resolve();
                return;
            }

            // Fade out the splash screen
            this.container.style.opacity = '0';
            this.container.style.pointerEvents = 'none';
            this.isVisible = false;

            setTimeout(() => {
                if (this.container) {
                    this.container.style.display = 'none';
                }
                resolve();
            }, 500);
        });
    }

    // Floating animations are now handled by inline CSS in the HTML

    public destroy(): void {
        // Don't remove the container since it's part of the HTML
        // Just hide it if it's still visible
        if (this.container) {
            this.container.style.display = 'none';
        }
        this.isVisible = false;
    }
}

// Export singleton instance
export const splashScreen = new SplashScreen();