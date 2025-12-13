# Release Guide for Rune Tools Desktop

## Overview

This guide provides a streamlined approach to releasing Rune Tools Desktop via GitHub releases with downloadable binaries for macOS and Windows. No Apple Developer account required - we'll handle security warnings with clear user guidance.

---

## Release Strategy

### Distribution Method: GitHub Releases
- **Platform**: GitHub releases with direct downloads
- **Supported**: macOS (.dmg), Windows (.exe)
- **Security**: PGP signatures + SHA256 checksums
- **Updates**: In-app notifications with manual download + changelog
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
The working `.github/workflows/release.yml` is already configured with:
- Cross-platform builds (macOS + Windows)
- Platform-specific GPG key import (Unix vs PowerShell)
- Proper Node.js version (20)
- PERSONAL_GITHUB_TOKEN for release permissions
- ICNS icon support for macOS

### 2. Scripts Setup
The working scripts are already configured:
- `scripts/create-manifest.js` - Generates release manifest with checksums and file sizes
- `scripts/extract-changelog.js` - Extracts version-specific changelog from `docs/CHANGELOG.md`

Both scripts are integrated into the GitHub Actions workflow.

### 3. Update System
The update system is fully implemented with:
- `UpdateService.ts` - Complete update checking with GPG verification
- `AppConstants.ts` - Embedded PGP public key and version management  
- Browser-compatible implementation (no Node.js dependencies)
- Real cryptographic verification using OpenPGP.js

### 4. Update Notification UI
The UI system is fully integrated in:
- `WalletSelectionController.ts` - Update checking and notification display
- `index.html` - Inline CSS following app patterns
- Complete notification system with Download/Changelog/Later buttons
- GPG verification status indicators

---

## Daily Release Workflow

### For Regular Updates
```bash
# 1. Update docs/CHANGELOG.md with your changes
# Add entries under [Unreleased] section following the format

# 2. Complete your changes and commit
git add .
git commit -m "Add new features and improvements"
git push

# 3. Create release version (this moves changelog entries)
npm version patch  # or minor/major based on changes
# Manually move [Unreleased] entries to new [x.x.x] section in docs/CHANGELOG.md
git add docs/CHANGELOG.md && git commit -m "Update changelog for release"
git push && git push --tags

# 4. Done! GitHub Actions handles the rest:
# - Builds for macOS and Windows
# - Creates signed release manifest with changelog
# - Publishes GitHub release with full changelog
# - Users get notification with download + changelog buttons
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
2. Double-click to mount the disk image
3. Drag "Rune.Tools (beta)" to your Applications folder
4. If you see "cannot be opened because it is from an unidentified developer":
   - Right-click the app in Applications and select "Open"
   - Click "Open" in the confirmation dialog

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

### Release Asset Conflicts
If you encounter "already_exists" errors during GitHub Actions:

```bash
# Delete conflicting release and recreate
gh release delete v1.2.3 --yes
git push origin :refs/tags/v1.2.3  # Delete remote tag
git push origin v1.2.3             # Push tag again to trigger fresh build
```

**Root Cause:** This happens when:
- Package.json version doesn't match the git tag
- Previous builds left artifacts with the same names
- Release was manually created with conflicting asset names

**Prevention:**
1. Always update `package.json` and `AppConstants.ts` versions together
2. Update `docs/CHANGELOG.md` with version entry before tagging
3. Use semantic versioning consistently

### Version Mismatch Issues
```bash
# Ensure all version references match
grep -r "0.1.0" package.json src/renderer/constants/AppConstants.ts docs/CHANGELOG.md

# Update all versions consistently
npm version patch  # Updates package.json automatically
# Manually update AppConstants.ts and CHANGELOG.md to match
```

### Changelog Extraction Failures
If `extract-changelog.js` fails with "Version X.X.X not found":

```bash
# 1. Add missing version section to docs/CHANGELOG.md
echo "## [1.2.3] - $(date +%Y-%m-%d)

### Fixed
- Your changes here

" >> docs/CHANGELOG.md

# 2. Or use the Unreleased section fallback
# The script will automatically use [Unreleased] if specific version isn't found
```

### GPG Key Import Failures

**macOS/Linux (Bash):**
```bash
# Test GPG import locally
echo "$GPG_PRIVATE_KEY" | base64 -d > /tmp/test.key
gpg --batch --import /tmp/test.key
rm /tmp/test.key
```

**Windows (PowerShell):**
```powershell
# Test GPG import on Windows
$key = [System.Convert]::FromBase64String($env:GPG_PRIVATE_KEY)
Set-Content -Path "test.key" -Value $key -Encoding Byte
gpg --batch --import test.key
Remove-Item test.key
```

**Common Issues:**
- Base64 encoding includes line breaks (use `-w 0` flag)
- GPG passphrase not set in secrets
- GPG key ID format incorrect (use long format)

### GitHub Actions Permission Issues
If you see "403 Forbidden" errors:

1. **Use PERSONAL_GITHUB_TOKEN instead of GITHUB_TOKEN**:
   ```yaml
   env:
     GITHUB_TOKEN: ${{ secrets.PERSONAL_GITHUB_TOKEN }}
   ```

2. **Ensure token has correct permissions**:
   - `contents: write` - For creating releases
   - `actions: read` - For workflow access

3. **Generate token with proper scopes**:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Create token with `public_repo` scope (or `repo` for private repos)

### Cross-Platform Build Issues

**Matrix Strategy Problems:**
```yaml
# Use proper matrix configuration
strategy:
  matrix:
    os: [macos-latest, windows-latest]
    # NOT: separate include blocks for each OS
```

**Platform-Specific Commands:**
```yaml
# Use conditional steps for platform differences
- name: Import GPG key (Unix)
  if: runner.os != 'Windows'
  # bash commands

- name: Import GPG key (Windows)  
  if: runner.os == 'Windows'
  # powershell commands
```

### Icon Format Issues (macOS)
If macOS app appears "damaged":

```bash
# Convert PNG to ICNS format
mkdir app.iconset
sips -z 16 16 icon.png --out app.iconset/icon_16x16.png
sips -z 32 32 icon.png --out app.iconset/icon_16x16@2x.png
# ... (create all required sizes)
iconutil -c icns app.iconset -o icon.icns

# Update package.json
"mac": {
  "icon": "path/to/icon.icns"  # Use .icns, not .png
}
```

### Update Check Issues
```bash
# Test GitHub API
curl https://api.github.com/repos/familiarcow/rune-tools-desktop/releases/latest

# Check rate limiting
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/rate_limit
```

### Complete Release Workflow Debugging

**Step-by-step verification:**
1. **Local build test**: `npm run dist` 
2. **Version consistency**: All files have matching versions
3. **Changelog entry**: Version section exists in CHANGELOG.md
4. **GPG setup**: Keys imported and trusted
5. **GitHub secrets**: All required secrets configured
6. **Clean release**: No conflicting assets exist

**Emergency Release Cleanup:**
```bash
# Nuclear option: delete everything and start fresh
gh release delete v1.2.3 --yes
git tag -d v1.2.3
git push origin :refs/tags/v1.2.3

# Fix versions, changelog, commit
git add -A && git commit -m "Fix release issues"
git tag v1.2.3 && git push && git push --tags
```

### Users Not Seeing Updates
- Verify release is published (not draft)
- Check tag format is `v1.2.3` (semantic versioning)
- Ensure release assets uploaded correctly
- Confirm app version is older than release version

---

## Complete Feature Summary

### ✅ What's Implemented

**Release Automation:**
- ✅ GitHub Actions workflow for cross-platform builds (macOS + Windows)
- ✅ PGP signing of release manifests for security verification
- ✅ Automatic checksums and file size calculation
- ✅ Changelog extraction and integration into releases
- ✅ Release asset uploads with comprehensive metadata

**Update System:**
- ✅ In-app update notifications with version checking
- ✅ Real GPG signature verification using OpenPGP.js
- ✅ Platform detection and appropriate download links
- ✅ Update notification UI with Download/Changelog/Later buttons
- ✅ Graceful error handling and timeout protection
- ✅ Browser-compatible implementation (no Node.js dependencies)

**Security Features:**
- ✅ Embedded PGP public key for release verification
- ✅ Cryptographic signature validation of release manifests
- ✅ SHA256 checksums for file integrity verification
- ✅ Secure update checking with timeout protection
- ✅ Visual indicators for GPG verification status

**User Experience:**
- ✅ Clean update notifications that don't disrupt workflow
- ✅ Direct links to changelog via GitHub releases
- ✅ Clear installation instructions for security warnings
- ✅ Persistent notifications until user dismisses
- ✅ File size and verification status display

**Developer Experience:**
- ✅ Simple workflow: update changelog → commit → tag → automated release
- ✅ Comprehensive release manifest with build metadata
- ✅ Clear troubleshooting documentation
- ✅ Version extraction from CHANGELOG.md
- ✅ Professional GitHub release pages with formatted changelogs

### 📁 File Structure Overview

**Scripts:**
- `scripts/create-manifest.js` - Generates release manifest with checksums
- `scripts/extract-changelog.js` - Extracts version-specific changelog
- `.github/workflows/release.yml` - Complete GitHub Actions workflow

**Services:**
- `src/renderer/services/UpdateService.ts` - Complete update checking system
- `src/renderer/constants/AppConstants.ts` - Version and configuration constants
- `src/renderer/controllers/WalletSelectionController.ts` - Update UI integration

**Documentation:**
- `docs/CHANGELOG.md` - Version history following Keep a Changelog format
- `docs/ReleaseGuide.md` - This comprehensive release guide

**Generated Files:**
- `release-manifest.json` - Release metadata and checksums
- `release-manifest.json.asc` - PGP signature of manifest
- `changelog.md` - Version-specific changelog for GitHub releases

### 🔐 Security Implementation Details

**PGP Integration:**
- Public key embedded in `AppConstants.ts` for security
- Private key stored as base64 in GitHub secrets
- Real cryptographic verification, not just file existence checks
- Support for both macOS and Windows GPG commands
- Signature verification with detailed logging

**Update Security:**
- Timeout protection against slow/malicious responses
- Graceful degradation when verification fails
- Visual indicators for verification status
- No automatic downloads - user-initiated only
- Secure manifest parsing with error handling

### 🚀 Future Enhancements Ready

The system is designed to easily support:
- **Auto-updates**: Change download buttons to automatic installation
- **Beta channels**: Modify GitHub API endpoints for pre-releases
- **Linux support**: Add Linux builds to the GitHub Actions matrix
- **Delta updates**: Implement differential updates for faster downloads
- **Update scheduling**: Add user preferences for update timing

---

## Quick Reference Commands

**Development:**
```bash
npm run build    # Build application
npm start        # Build and launch
npm run dev      # Development mode
```

**Release:**
```bash
# Update changelog, commit changes
git add . && git commit -m "Description" && git push

# Create release (moves changelog entries to version section)
npm version patch  # or minor/major
git add docs/CHANGELOG.md && git commit -m "Update changelog for release"
git push && git push --tags
```

**Testing:**
```bash
# Test GitHub API
curl https://api.github.com/repos/familiarcow/rune-tools-desktop/releases/latest

# Verify GPG setup
gpg --list-secret-keys --keyid-format=long
```

---

This approach gives you professional-quality releases with security features while keeping costs at $0 and maintenance minimal. Users get clear update notifications with integrated changelog access, and the download process is straightforward despite the security warnings.