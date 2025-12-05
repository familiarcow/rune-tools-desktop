# macOS Installer Change: DMG → PKG

## Problem Statement

**Issue**: Users experienced friction with unsigned macOS app distribution using `.dmg` files
- Users encountered **2 security warnings** (DMG file + App launch)
- Many users abandoned installation after first warning
- Required manual drag-to-Applications step
- "App is damaged" messaging created negative user perception

## Solution Implemented

**Change**: Switch from `.dmg` to `.pkg` installer with automated quarantine removal
- Users see only **1 security warning** (installer only)
- Professional installer experience familiar to macOS users
- Automatic quarantine attribute removal via post-install script
- No manual installation steps required

## Technical Implementation

### Files Changed:
1. **`package.json`** - Updated electron-builder config
2. **`scripts/postinstall.sh`** - New post-install script
3. **`.github/workflows/release.yml`** - Updated for .pkg files
4. **`scripts/create-manifest.js`** - Updated file patterns
5. **`scripts/extract-changelog.js`** - Updated release notes

### New Configuration:
```json
"mac": {
  "target": [{ "target": "pkg", "arch": ["arm64", "x64"] }]
},
"pkg": {
  "scripts": "scripts/postinstall.sh",
  "installLocation": "/Applications",
  "allowAnywhere": false
}
```

### Post-Install Script Logic:
```bash
#!/bin/bash
# Remove quarantine attribute automatically
xattr -d com.apple.quarantine "/Applications/Rune.Tools (beta).app"
# Set executable permissions
chmod +x "/Applications/Rune.Tools (beta).app/Contents/MacOS/*"
```

## User Experience Comparison

### Before (DMG):
1. Download `.dmg` → Security warning #1
2. Right-click → Open → Confirm
3. Mount DMG → Drag to Applications
4. Launch app → Security warning #2  
5. Right-click app → Open → Confirm
6. App finally launches

**Result**: 2 security overrides, 6 steps, high abandonment rate

### After (PKG):
1. Download `.pkg` → Security warning #1
2. Right-click installer → Open → Confirm
3. Follow installer → Enter password
4. Launch app directly (no warning)

**Result**: 1 security override, 4 steps, 50% less friction

## Rollback Process

### If PKG approach fails:
1. Revert `package.json` changes:
   ```json
   "mac": {
     "icon": "images/logos/odin.icns",
     "category": "public.app-category.finance"
   }
   ```
2. Remove `pkg` configuration section
3. Delete `scripts/postinstall.sh`  
4. Update workflow to use `*.dmg` instead of `*.pkg`
5. Update manifest script: `\.(dmg|exe|zip)$`
6. Update changelog script: "Download the `.dmg` file"

### Rollback commands:
```bash
git checkout HEAD~1 -- package.json
rm scripts/postinstall.sh
git checkout HEAD~1 -- .github/workflows/release.yml
git checkout HEAD~1 -- scripts/create-manifest.js
git checkout HEAD~1 -- scripts/extract-changelog.js
```

## Testing Plan

### Local Testing:
1. `npm run dist` - Verify `.pkg` file is created
2. Install locally: Test post-install script execution
3. Launch app: Verify no quarantine warnings

### Release Testing:  
1. Create test release (v0.1.5)
2. Download on clean macOS system
3. Verify single security warning workflow
4. Confirm app launches without additional warnings

## Risk Assessment

**Low Risk**: 
- Electron-builder has mature `.pkg` support
- Post-install scripts are standard macOS practice
- Easy rollback to previous `.dmg` approach
- No changes to app functionality, only packaging

**Benefits**:
- Significantly improved user onboarding
- More professional installer experience  
- Reduced support requests about installation
- Better user retention through first install

## Success Metrics

**Before (DMG)**:
- 2 security warnings
- ~6 manual steps  
- High user abandonment

**Target (PKG)**:
- 1 security warning
- ~4 steps total
- 50% reduction in installation friction

## Version History

- **v0.1.4 and earlier**: DMG + manual quarantine removal
- **v0.1.5**: PKG installer with automated quarantine removal
- **Rollback available**: Can revert to DMG if issues arise