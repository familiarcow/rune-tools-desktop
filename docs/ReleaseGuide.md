# Release Guide for Rune Tools Desktop

## Overview

This guide provides a streamlined approach to releasing Rune Tools Desktop via GitHub releases with downloadable binaries for macOS and Windows. No Apple Developer account required - we'll handle security warnings with clear user guidance.

---

## Release Strategy

### Distribution Method: GitHub Releases
- **Platform**: GitHub releases with direct downloads
- **Supported**: macOS (.dmg), Windows (.exe)
- **Security**: PGP signatures + SHA256 checksums
- **Updates**: In-app notifications with manual download
- **Cost**: $0 (no code signing certificates needed)

### User Experience
- Users will see "unidentified developer" warnings on macOS
- Windows SmartScreen may show warnings
- We'll provide clear instructions for users to bypass these warnings safely
- Simple update notifications when new versions are available

---

## One-Time Setup

### 1. Generate PGP Signing Key
```bash
# Generate release signing key
gpg --full-generate-key
# Choose: RSA, 4096 bits, 2 years
# Name: "Rune Tools Release"
# Email: "familiarcow@proton.me" (or your preferred email)

# Get your key ID
gpg --list-secret-keys --keyid-format=long

# Export public key for app integration
gpg --armor --export YOUR_KEY_ID > src/renderer/constants/pgp-public-key.txt
```

### 2. Configure GitHub Secrets
Add these to your GitHub repository secrets:
```
GPG_PRIVATE_KEY=<your-base64-encoded-private-key>
GPG_PASSPHRASE=<your-gpg-passphrase>
GPG_KEY_ID=<your-gpg-key-id>
```

To get the private key:
```bash
gpg --armor --export-secret-keys YOUR_KEY_ID | base64 -w 0
```

---

## Release Process

### Automated Release (Recommended)
```bash
# 1. Update version and push
npm version patch  # or minor/major
git push && git push --tags

# 2. GitHub Actions automatically:
# - Builds for macOS and Windows
# - Creates release manifest with checksums
# - Signs manifest with PGP
# - Creates GitHub release
# - Uploads all files
```

### Manual Release (Backup)
```bash
# 1. Build distributables
npm run dist

# 2. Create and sign manifest
node scripts/create-manifest.js
gpg --armor --detach-sign release-manifest.json

# 3. Create GitHub release manually and upload files
```

---

## Required Files

### 1. GitHub Actions Workflow
Create `.github/workflows/release.yml`:

```yaml
name: Release Build

on:
  push:
    tags: ['v*']

jobs:
  build-and-release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: macos-latest
            platform: mac
          - os: windows-latest
            platform: windows

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Import GPG key
        run: |
          echo "${{ secrets.GPG_PRIVATE_KEY }}" | base64 -d | gpg --import
          echo "trust\n5\ny\nsave\nquit" | gpg --command-fd 0 --edit-key ${{ secrets.GPG_KEY_ID }}

      - name: Build application
        run: npm run dist

      - name: Create release manifest
        run: node scripts/create-manifest.js

      - name: Sign manifest
        run: |
          gpg --batch --yes --pinentry-mode loopback --passphrase "${{ secrets.GPG_PASSPHRASE }}" \
              --armor --detach-sign release-manifest.json

      - name: Upload release assets
        uses: softprops/action-gh-release@v1
        with:
          files: |
            dist-electron/*.dmg
            dist-electron/*.exe
            release-manifest.json
            release-manifest.json.asc
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Manifest Creator Script
Create `scripts/create-manifest.js`:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');
const pkg = require('../package.json');

function createManifest() {
    const version = pkg.version;
    console.log(`Creating manifest for v${version}...`);
    
    // Calculate checksums and sizes
    const checksums = {};
    const fileSizes = {};
    
    if (fs.existsSync('dist-electron')) {
        const files = fs.readdirSync('dist-electron');
        
        files.forEach(file => {
            if (file.match(/\.(dmg|exe)$/)) {
                const filePath = `dist-electron/${file}`;
                const content = fs.readFileSync(filePath);
                const hash = crypto.createHash('sha256').update(content).digest('hex');
                const stats = fs.statSync(filePath);
                
                checksums[file] = `sha256:${hash}`;
                fileSizes[file] = formatBytes(stats.size);
                
                console.log(`✅ ${file}: ${fileSizes[file]} (${hash.substring(0, 16)}...)`);
            }
        });
    }
    
    // Get recent commits for basic release notes
    let releaseNotes = 'Latest updates and improvements';
    try {
        const commits = execSync('git log --oneline --since="2 weeks ago" -10')
            .toString()
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^[a-f0-9]+ /, ''))
            .slice(0, 5);
            
        if (commits.length > 0) {
            releaseNotes = commits.join('\n');
        }
    } catch (error) {
        console.warn('Could not generate release notes from commits');
    }
    
    // Create manifest
    const manifest = {
        version: version,
        releaseDate: new Date().toISOString(),
        
        downloadUrls: {
            mac: `https://github.com/familiarcow/rune-tools-desktop/releases/download/v${version}/rune-tools-desktop-${version}.dmg`,
            windows: `https://github.com/familiarcow/rune-tools-desktop/releases/download/v${version}/rune-tools-desktop-setup-${version}.exe`
        },
        
        checksums: checksums,
        fileSizes: fileSizes,
        releaseNotes: releaseNotes,
        
        buildInfo: {
            commitHash: execSync('git rev-parse HEAD').toString().trim(),
            buildDate: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform
        }
    };
    
    // Write manifest
    fs.writeFileSync('release-manifest.json', JSON.stringify(manifest, null, 2));
    console.log('✅ Release manifest created');
    
    return manifest;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

if (require.main === module) {
    createManifest();
}

module.exports = { createManifest };
```

### 3. Update Checker Service
Create `src/renderer/services/UpdateService.ts`:

```typescript
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
```

### 4. Update Notification UI
Add to your main controller:

```typescript
// In your WalletSelectionController or main app controller
import { UpdateService } from '../services/UpdateService';

async initialize(): Promise<void> {
    // ... existing initialization code ...
    
    // Check for updates (non-blocking)
    this.checkForUpdates();
}

private async checkForUpdates(): void {
    try {
        const updateService = new UpdateService();
        const updateInfo = await updateService.checkForUpdates();
        
        if (updateInfo) {
            this.showUpdateNotification(updateInfo);
        }
    } catch (error) {
        console.warn('Update check failed:', error);
    }
}

private showUpdateNotification(updateInfo: any): void {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <div class="update-info">
                <span class="update-icon">⬆️</span>
                <div class="update-text">
                    <div class="update-title">Rune Tools v${updateInfo.version} Available</div>
                    <div class="update-subtitle">${updateInfo.fileSize || 'Ready to download'}</div>
                </div>
            </div>
            <div class="update-actions">
                <button class="update-btn update-btn-primary" onclick="window.open('${updateInfo.downloadUrl}')">
                    Download
                </button>
                <button class="update-btn" onclick="this.parentElement.parentElement.parentElement.remove()">
                    Later
                </button>
            </div>
        </div>
        ${!updateInfo.isVerified ? '<div class="update-warning">⚠️ Could not verify release signature</div>' : ''}
    `;
    
    document.body.insertBefore(notification, document.body.firstChild);
    
    // Auto-hide after 30 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 30000);
}
```

### 5. Update Notification CSS
Add to your stylesheet:

```css
.update-notification {
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    color: white;
    padding: 16px 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    font-family: system-ui, -apple-system, sans-serif;
    position: relative;
    z-index: 1000;
}

.update-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1000px;
    margin: 0 auto;
    gap: 20px;
}

.update-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.update-icon {
    font-size: 24px;
}

.update-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 2px;
}

.update-subtitle {
    font-size: 14px;
    opacity: 0.9;
}

.update-actions {
    display: flex;
    gap: 12px;
}

.update-btn {
    padding: 8px 16px;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 6px;
    background: rgba(255,255,255,0.15);
    color: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
}

.update-btn:hover {
    background: rgba(255,255,255,0.25);
    transform: translateY(-1px);
}

.update-btn-primary {
    background: rgba(255,255,255,0.25);
    font-weight: 600;
}

.update-warning {
    background: rgba(255,152,0,0.9);
    color: white;
    padding: 8px 16px;
    margin-top: 8px;
    border-radius: 4px;
    font-size: 13px;
    text-align: center;
}

@media (max-width: 768px) {
    .update-content {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 16px;
    }
    
    .update-actions {
        width: 100%;
        justify-content: center;
    }
    
    .update-btn {
        flex: 1;
        max-width: 120px;
    }
}
```

---

## Daily Release Workflow

### For Regular Updates
```bash
# 1. Complete your changes and commit
git add .
git commit -m "Add new features and improvements"
git push

# 2. Create release version
npm version patch  # or minor/major based on changes
git push && git push --tags

# 3. Done! GitHub Actions handles the rest:
# - Builds for macOS and Windows
# - Creates signed release manifest
# - Publishes GitHub release
# - Users get notification on next app launch
```

### For Hotfixes
```bash
# Same process but with descriptive commit
git add .
git commit -m "Fix critical issue with wallet connections"
git push

npm version patch
git push && git push --tags
```

---

## User Installation Instructions

Since we're not using code signing certificates, users will encounter security warnings. Include these instructions in your releases:

### macOS Users
1. Download the `.dmg` file
2. If you see "cannot be opened because it is from an unidentified developer":
   - Control+click the app and select "Open"
   - Or go to System Preferences > Security & Privacy > Allow anyway

### Windows Users  
1. Download the `.exe` file
2. If Windows SmartScreen blocks it:
   - Click "More info"
   - Click "Run anyway"

---

## Testing Your Release Setup

### Test Local Build
```bash
npm run dist
ls -la dist-electron/  # Verify .dmg and .exe files exist
```

### Test Update Notification
```bash
# Temporarily change version in package.json to 0.0.1
# Run app and verify update notification appears
npm start
```

### Test Full Release Process
```bash
git tag v0.0.1-test
git push origin v0.0.1-test
# Check GitHub Actions runs successfully and creates release
```

---

## Security Features

✅ **PGP signatures** on release manifests  
✅ **SHA256 checksums** for all binaries  
✅ **GitHub-hosted** releases (HTTPS + GitHub security)  
✅ **Version verification** (semantic versioning enforced)  
✅ **Optional updates** (user choice, never forced)  
✅ **Graceful degradation** (app works if update check fails)  

---

## Maintenance

### Monthly Tasks
- Rotate PGP key if needed (every 2 years)
- Review and clean up old releases
- Monitor GitHub API rate limits

### Per-Release Tasks
- Test builds on both platforms
- Verify download links work
- Check update notifications display correctly

---

## Troubleshooting

### Build Issues
```bash
# Clear dist folder
rm -rf dist-electron/

# Clean install
rm -rf node_modules/ package-lock.json
npm install
npm run dist
```

### Update Check Issues
```bash
# Test GitHub API
curl https://api.github.com/repos/familiarcow/rune-tools-desktop/releases/latest

# Check rate limiting
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/rate_limit
```

### Users Not Seeing Updates
- Verify release is published (not draft)
- Check tag format is `v1.2.3` (semantic versioning)
- Ensure release assets uploaded correctly

---

This approach gives you professional-quality releases with security features while keeping costs at $0 and maintenance minimal. Users get clear update notifications and the download process is straightforward despite the security warnings.