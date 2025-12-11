interface UpdateInfo {
    version: string;
    downloadUrl: string;
    releaseNotes: string;
    fileSize?: string;
    isVerified: boolean;
    changelogUrl: string;
}

import { getAppVersion, GITHUB_REPO, UPDATE_CHECK_TIMEOUT, RELEASE_PGP_PUBLIC_KEY } from '../constants/AppConstants';
import * as openpgp from 'openpgp';

export class UpdateService {
    private currentVersion: string = '0.0.0';
    private readonly GITHUB_REPO = GITHUB_REPO;
    private readonly RELEASES_API = `https://api.github.com/repos/${this.GITHUB_REPO}/releases/latest`;

    constructor() {
        // Initialize current version asynchronously
        this.initCurrentVersion();
    }

    private async initCurrentVersion() {
        try {
            this.currentVersion = await getAppVersion();
        } catch (error) {
            console.error('Failed to get current version:', error);
            this.currentVersion = '0.0.0';
        }
    }

    async checkForUpdates(): Promise<UpdateInfo | null> {
        // Ensure current version is loaded
        if (this.currentVersion === '0.0.0') {
            await this.initCurrentVersion();
        }
        try {
            console.log('🔍 Checking for updates...');
            
            const response = await fetch(this.RELEASES_API, { 
                signal: AbortSignal.timeout(UPDATE_CHECK_TIMEOUT)
            });
            
            if (!response.ok) {
                console.warn('Update check failed:', response.status);
                return null;
            }
            
            const release = await response.json();
            const latestVersion = release.tag_name.replace('v', '');
            
            if (!this.isNewerVersion(latestVersion)) {
                console.log('✅ Already on latest version');
                return null;
            }
            
            // Get platform-specific download info
            const downloadInfo = this.getPlatformDownloadInfo(release);
            if (!downloadInfo) {
                console.warn('No download available for current platform');
                return null;
            }
            
            // Try to verify release (optional, non-blocking)
            const isVerified = await this.verifyRelease(release);
            
            const updateInfo: UpdateInfo = {
                version: latestVersion,
                downloadUrl: downloadInfo.url,
                releaseNotes: this.formatReleaseNotes(release.body || 'Updates available'),
                fileSize: downloadInfo.size,
                isVerified: isVerified,
                changelogUrl: `https://github.com/${this.GITHUB_REPO}/releases/tag/v${latestVersion}`
            };
            
            console.log(`✅ Update available: v${latestVersion}`);
            return updateInfo;
            
        } catch (error) {
            console.warn('Update check failed:', error);
            return null; // Fail silently to not disrupt app
        }
    }
    
    private isNewerVersion(remoteVersion: string): boolean {
        const current = this.currentVersion.split('.').map(Number);
        const remote = remoteVersion.split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
            if (remote[i] > current[i]) return true;
            if (remote[i] < current[i]) return false;
        }
        return false;
    }
    
    private getPlatformDownloadInfo(release: any): { url: string; size?: string } | null {
        // Detect platform using navigator instead of process
        const platform = navigator.platform.toLowerCase();
        const userAgent = navigator.userAgent.toLowerCase();
        let assetName: string;
        
        if (platform.includes('mac') || userAgent.includes('mac')) {
            assetName = '.dmg';
        } else if (platform.includes('win') || userAgent.includes('win')) {
            assetName = '.exe';
        } else {
            return null; // Unsupported platform
        }
        
        const asset = release.assets.find((a: any) => a.name.endsWith(assetName));
        if (!asset) return null;
        
        return {
            url: asset.browser_download_url,
            size: this.formatBytes(asset.size)
        };
    }
    
    private async verifyRelease(release: any): Promise<boolean> {
        try {
            console.log('🔐 Starting GPG signature verification...');
            
            // Look for signed manifest and signature
            const manifestAsset = release.assets.find((a: any) => a.name === 'release-manifest.json');
            const signatureAsset = release.assets.find((a: any) => a.name === 'release-manifest.json.asc');
            
            if (!manifestAsset || !signatureAsset) {
                console.warn('❌ Release manifest or signature not found');
                return false;
            }
            
            // Download the manifest and signature
            const [manifestResponse, signatureResponse] = await Promise.all([
                fetch(manifestAsset.browser_download_url, { signal: AbortSignal.timeout(10000) }),
                fetch(signatureAsset.browser_download_url, { signal: AbortSignal.timeout(10000) })
            ]);
            
            if (!manifestResponse.ok || !signatureResponse.ok) {
                console.warn('❌ Failed to download manifest or signature');
                return false;
            }
            
            const manifestContent = await manifestResponse.text();
            const signatureContent = await signatureResponse.text();
            
            console.log('📄 Downloaded manifest and signature');
            
            // Load our public key
            const publicKeyArmored = await this.getPublicKey();
            if (!publicKeyArmored) {
                console.warn('❌ Could not load public key');
                return false;
            }
            
            // Verify the signature
            const isValid = await this.verifyPGPSignature(manifestContent, signatureContent, publicKeyArmored);
            
            if (isValid) {
                console.log('✅ GPG signature verification passed!');
                return true;
            } else {
                console.warn('❌ GPG signature verification failed!');
                return false;
            }
            
        } catch (error) {
            console.warn('❌ Release verification failed:', error);
            return false;
        }
    }
    
    private async getPublicKey(): Promise<string | null> {
        try {
            // Use embedded public key for security
            return RELEASE_PGP_PUBLIC_KEY;
        } catch (error) {
            console.warn('Could not load public key:', error);
            return null;
        }
    }
    
    private async verifyPGPSignature(message: string, signature: string, publicKeyArmored: string): Promise<boolean> {
        try {
            // Parse the public key
            const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
            
            // Parse the signature
            const signatureObj = await openpgp.readSignature({ armoredSignature: signature });
            
            // Create message object
            const messageObj = await openpgp.createMessage({ text: message });
            
            // Verify the signature
            const verificationResult = await openpgp.verify({
                message: messageObj,
                signature: signatureObj,
                verificationKeys: publicKey
            });
            
            // Check if any signature is valid (sig.verified is a Promise<boolean>)
            const verificationPromises = verificationResult.signatures.map(sig => sig.verified);
            const verificationResults = await Promise.all(verificationPromises);
            const isValid = verificationResults.some(result => result === true);
            
            console.log('🔍 Signature verification result:', {
                isValid,
                signaturesChecked: verificationResult.signatures.length,
                keyId: publicKey.getKeyIDs()[0]?.toHex()
            });
            
            return isValid;
            
        } catch (error) {
            console.warn('PGP verification error:', error);
            return false;
        }
    }
    
    private formatReleaseNotes(notes: string): string {
        // Clean up and format release notes
        return notes
            .split('\n')
            .slice(0, 5) // First 5 lines
            .join('\n')
            .trim();
    }
    
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}