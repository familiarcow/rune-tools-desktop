interface UpdateInfo {
    version: string;
    downloadUrl: string;
    releaseNotes: string;
    fileSize?: string;
    isVerified: boolean;
}

export class UpdateService {
    private currentVersion = require('../../../package.json').version;
    private readonly GITHUB_REPO = 'familiarcow/rune-tools-desktop';
    private readonly RELEASES_API = `https://api.github.com/repos/${this.GITHUB_REPO}/releases/latest`;

    async checkForUpdates(): Promise<UpdateInfo | null> {
        try {
            console.log('🔍 Checking for updates...');
            
            const response = await fetch(this.RELEASES_API, { 
                signal: AbortSignal.timeout(8000) // 8 second timeout
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
                isVerified: isVerified
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
        const platform = process.platform;
        let assetName: string;
        
        if (platform === 'darwin') {
            assetName = '.dmg';
        } else if (platform === 'win32') {
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
            // Look for signed manifest (optional verification)
            const manifestAsset = release.assets.find((a: any) => a.name === 'release-manifest.json');
            const signatureAsset = release.assets.find((a: any) => a.name === 'release-manifest.json.asc');
            
            if (!manifestAsset || !signatureAsset) {
                console.warn('Release manifest or signature not found');
                return false;
            }
            
            // For now, just return true if signature file exists
            // Full PGP verification can be added later if needed
            return true;
            
        } catch (error) {
            console.warn('Release verification failed:', error);
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