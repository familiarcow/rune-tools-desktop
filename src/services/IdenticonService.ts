/**
 * Identicon Service
 * 
 * Securely generates unique visual identifiers (identicons) for wallet addresses
 * using the local jdenticon package instead of external CDN for security
 */

import * as jdenticon from 'jdenticon';

export class IdenticonService {
    private static isConfigured = false;

    /**
     * Configure jdenticon settings once for consistent styling
     */
    private static configure(): void {
        if (this.isConfigured) return;

        jdenticon.configure({
            hues: [207, 87, 45, 258, 11], // Blue, teal, orange, purple, green tones that match our theme
            lightness: {
                color: [0.40, 0.80],
                grayscale: [0.30, 0.90]
            },
            saturation: {
                color: 0.65,
                grayscale: 0.20
            },
            backColor: '#00000000' // Transparent background
        });

        this.isConfigured = true;
    }

    /**
     * Generate an SVG identicon for a given value
     * @param value - The string value to generate identicon for (typically a wallet address)
     * @param size - The size in pixels for the identicon (default: 48)
     * @returns SVG string of the identicon
     */
    public static generateSVG(value: string, size: number = 48): string {
        this.configure();
        
        if (!value) {
            // Return a default identicon for empty values
            value = 'default-wallet';
        }
        
        return jdenticon.toSvg(value, size);
    }

    /**
     * Generate an HTML element containing the identicon as an SVG
     * @param value - The string value to generate identicon for
     * @param size - The size in pixels for the identicon (default: 48)
     * @param className - Additional CSS classes to apply
     * @returns HTML string with the identicon
     */
    public static generateHTML(value: string, size: number = 48, className: string = ''): string {
        const svg = this.generateSVG(value, size);
        
        return `
            <div class="identicon-container ${className}" style="width: ${size}px; height: ${size}px; display: inline-block; border-radius: 50%; overflow: hidden;">
                ${svg}
            </div>
        `;
    }

    /**
     * Generate a data URL for the identicon (useful for setting as image src)
     * @param value - The string value to generate identicon for
     * @param size - The size in pixels for the identicon (default: 48)
     * @returns Data URL string
     */
    public static generateDataURL(value: string, size: number = 48): string {
        const svg = this.generateSVG(value, size);
        const encoded = encodeURIComponent(svg);
        return `data:image/svg+xml,${encoded}`;
    }

    /**
     * Update an existing DOM element with an identicon
     * @param element - The DOM element to update
     * @param value - The string value to generate identicon for
     * @param size - The size in pixels for the identicon (default: 48)
     */
    public static updateElement(element: HTMLElement, value: string, size: number = 48): void {
        const svg = this.generateSVG(value, size);
        element.innerHTML = svg;
    }

    /**
     * Generate identicon and inject it into an element by ID
     * @param elementId - The ID of the element to update
     * @param value - The string value to generate identicon for
     * @param size - The size in pixels for the identicon (default: 48)
     */
    public static renderToElement(elementId: string, value: string, size: number = 48): void {
        const element = document.getElementById(elementId);
        if (element) {
            this.updateElement(element, value, size);
        }
    }

    /**
     * Extract a shortened version of an address for display
     * @param address - The full address string
     * @returns Shortened address string (first 6 + last 4 characters)
     */
    public static shortenAddress(address: string): string {
        if (!address || address.length < 10) {
            return address || 'N/A';
        }
        
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    /**
     * Batch update multiple elements with identicons
     * @param updates - Array of objects with elementId, value, and optional size
     */
    public static batchUpdate(updates: Array<{ elementId: string; value: string; size?: number }>): void {
        updates.forEach(({ elementId, value, size = 48 }) => {
            this.renderToElement(elementId, value, size);
        });
    }
}