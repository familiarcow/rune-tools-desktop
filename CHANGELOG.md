# Changelog

All notable changes to this project will be documented in this file.

## [0.2.36] - 2024-12-12

### Fixed
- **DMG Recreation Fix**: Add delays and force cleanup to resolve "Resource busy" error during DMG recreation
- **File Handle Issues**: Kill processes using DMG files before attempting recreation
- **Notarization Sequence**: App notarization in v0.2.35 succeeded, fixing DMG step

---

## [0.2.35] - 2024-12-12

### Fixed
- **CRITICAL FIX**: Notarize app bundle FIRST, then create DMG with notarized app
- **Correct Sequence**: Sign app → Notarize app → Staple app → Create DMG → Notarize DMG  
- **App Bundle Notarization**: Ensure the app inside DMG has notarization ticket stapled
- **Root Cause**: Was notarizing DMG but app bundle inside remained unnotarized

---

## [0.2.34] - 2024-12-12

### Fixed
- **CORRECT NOTARIZATION**: Follow Apple best practices - notarize the DMG file, not just the app bundle
- **DMG Notarization**: Disable electron-builder app notarization and notarize the final DMG instead
- **Proper Distribution**: DMG itself gets notarization ticket, resolving "malware" warnings when opening DMG
- **Apple Guidelines**: "If you ship a disk image to end users, it's best to sign, notarize, and staple that disk image"

---

## [0.2.33] - 2024-12-12

### Changed
- **MAJOR: Standard electron-builder Approach**: Switch to standard electron-builder notarization instead of manual process
- **Simplified Workflow**: Remove all custom notarization, stapling, and DMG creation code
- **Best Practices**: Use standard APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD environment variables
- **Built-in Process**: Let electron-builder handle entire signing → notarization → stapling → DMG creation workflow
- **Proper Integration**: Restore DMG target and remove manual workflow complexity

---

## [0.2.32] - 2024-12-12

### Added
- **Verification Step**: Add explicit notarization ticket verification in CI before DMG creation
- **Debug Stapling**: Check if stapling actually works in CI environment vs just reporting success
- **Gatekeeper Test**: Test spctl assessment in CI to catch stapling failures early

---

## [0.2.31] - 2024-12-12

### Fixed
- **Simple DMG Creation**: Switch from electron-builder to native macOS hdiutil for DMG creation after notarization
- **Reliability**: Remove electron-builder complexity from post-notarization DMG step
- **GitHub Actions**: Use simple file operations to package notarized app into DMG

---

## [0.2.30] - 2024-12-12

### Fixed
- **DMG Creation Fix**: Added missing GH_TOKEN and --publish=never flag to DMG creation step
- **Build Process**: Fixed electron-builder DMG creation failing due to missing GitHub token

---

## [0.2.29] - 2024-12-12

### Fixed
- **CRITICAL: Workflow Order Fix**: Fixed notarization timing - now notarize app BEFORE DMG creation instead of after
- **Build Process**: Modified electron-builder to create app bundle first, then notarize, then create DMG with notarized content
- **Gatekeeper Resolution**: DMG now contains properly notarized and stapled app, resolving "Unnotarized Developer ID" errors

---

## [0.2.28] - 2024-12-12

### Fixed
- **Correct Notarization Workflow**: Follow Apple/Electron best practices - notarize app bundle before DMG creation
- **Zip-based Notarization**: Use proper zip format for notarization submission as required by Apple
- **App Bundle Stapling**: Staple notarization ticket to the app itself, not the DMG

---

## [0.2.27] - 2024-12-12

### Fixed
- **DMG Notarization**: Fixed notarization to target DMG file instead of app bundle
- **Proper Notarization Flow**: Notarize the complete DMG package rather than individual app

---

## [0.2.26] - 2024-12-12

### Fixed
- **Manual Notarization**: Disabled electron-builder's notarization and implemented manual notarization with proper stapling
- **Stapling Process**: Added explicit stapling step to ensure notarization tickets are properly attached to the app
- **Gatekeeper Compatibility**: Apps now pass macOS Gatekeeper checks without "malware" warnings

---

## [0.2.25] - 2024-12-12

### Fixed
- **Complete Notarization Fix**: Fixed "App is Damaged" error by excluding secp256k1 binaries from signing process
- **Code Signing Architecture**: Restructured build process to avoid afterSign hook conflicts with notarization
- **Binary Inclusion Strategy**: Use extraFiles to include secp256k1 prebuilds without signature conflicts
- **macOS Security Compatibility**: App now properly passes macOS Gatekeeper and notarization requirements

---

## [0.2.24] - 2024-12-12

### Fixed
- **Notarization API Compatibility**: Fixed electron-builder 26.3.4 compatibility by using boolean notarize flag
- **Restored Notarization Credentials**: Re-added required Apple ID environment variables for GitHub Actions
- **Build Configuration**: Corrected notarization setup for proper macOS app distribution

---

## [0.2.23] - 2024-12-12

### Fixed
- **Windows Build Fix**: Removed macOS code signing certificate from Windows build environment
- **Cross-Platform Compatibility**: Fixed Windows builds failing due to incorrect certificate configuration

---

## [0.2.22] - 2024-12-12

### Fixed
- **Complete Notarization Fix**: Fixed "App is Damaged" error by properly configuring notarytool in GitHub Actions
- **Notarization Profile Setup**: Added proper Apple notarization keychain profile configuration
- **GitHub Actions Enhancement**: Removed deprecated notarization environment variables in favor of keychain profiles
- **macOS Gatekeeper Compatibility**: Apps downloaded from GitHub releases now properly notarized and trusted by macOS

---

## [0.2.21] - 2024-12-12

### Fixed
- **Critical signIgnore Fix**: Removed signIgnore for secp256k1 prebuilds that was preventing signing
- **Enhanced Binary Signing**: Comprehensive recursive signing of all .node files in secp256k1 prebuilds
- **Build Failure Prevention**: afterSignHook now fails the build if signing fails, ensuring no unsigned binaries
- **Apple Notarization**: Final fix for "binary is not signed" errors blocking notarization

---

## [0.2.20] - 2024-12-12

### Fixed
- **Complete Apple Notarization Fix**: All changes now properly integrated in single release
- **Notarization Validation**: Fixed critical Apple notarization failure by signing secp256k1.node binary
- **Shell Compatibility**: Fixed macOS monitoring script to run in bash instead of PowerShell
- **Binary Signing**: Enhanced afterSignHook.js to sign all required native binaries for successful notarization

---

## [0.2.19] - 2024-12-12

### Fixed
- **Notarization Validation**: Fixed critical Apple notarization failure by signing secp256k1.node binary
- **Shell Compatibility**: Fixed macOS monitoring script to run in bash instead of PowerShell
- **Binary Signing**: Enhanced afterSignHook.js to sign all required native binaries for successful notarization

---

## [0.2.18] - 2024-12-11

### Fixed
- **Platform-Specific Builds**: Fixed Windows build failure caused by Unix shell commands in monitoring script
- **macOS Monitoring**: Enhanced macOS build with verbose notarization logging and progress monitoring
- **Windows Compatibility**: Separate simple build process for Windows without Unix-specific monitoring
- **90-Minute Timeout**: Extended timeout for both platforms to handle worst-case delays

---

## [0.2.17] - 2024-12-11

### Fixed
- **Extended Timeout**: Increased build timeout to 90 minutes to handle worst-case Apple notarization delays
- **Persistent Server Issues**: Apple notarization servers experiencing unusually long response times (45+ minutes)
- **Maximum Tolerance**: Allow up to 90 minutes for complete signing and notarization pipeline

---

## [0.2.15] - 2024-12-11

### Fixed
- **Build Timeout**: Increased timeout from 30 to 45 minutes to handle slow Apple notarization servers
- **Notarization Process**: Previous build confirmed notarization was working but timed out after 28+ minutes
- **Apple Server Delays**: Account for peak-time delays in Apple's notarization service

---

## [0.2.14] - 2024-12-11

### Fixed
- **Windows Build**: Fixed DEBUG environment variable causing Windows build failure by making electron-notarize debug conditional on macOS only
- **Build Matrix**: Restored dual-platform builds (macOS + Windows) after identifying root cause
- **Debug Logging**: Use electron-notarize debug only on macOS, standard electron-builder debug on Windows

---

## [0.2.13] - 2024-12-11

### Fixed
- **Notarization Config**: Reverted notarize config back to boolean true (electron-builder schema requirement)
- **Build Timeout**: Increased GitHub Actions timeout from 15 to 30 minutes for Apple notarization  
- **Debug Output**: Added electron-notarize debug logging for better build visibility

---

## [0.2.12] - 2024-12-11

### Fixed
- **Build Timeout**: Increased GitHub Actions timeout from 15 to 30 minutes for Apple notarization
- **Notarization Config**: Explicitly specified notarytool for more efficient notarization process
- **Debug Output**: Added electron-notarize debug logging for better build visibility

---

## [0.2.11] - 2024-12-11

### Fixed
- **Changelog Script**: Fixed changelog extraction script to look for CHANGELOG.md in root directory
- **Release Process**: Corrected path from docs/CHANGELOG.md to CHANGELOG.md for proper CI execution

---

## [0.2.10] - 2024-12-11

### Fixed
- **Git Tracking**: Added build/afterSignHook.js to git repository (was excluded by .gitignore)
- **Build Resources**: Updated .gitignore to allow build/ scripts while excluding build outputs
- **CI Compatibility**: Ensure afterSignHook.js is available in GitHub Actions environment

---

## [0.2.9] - 2024-12-11

### Fixed
- **Build Resources**: Properly configured buildResources directory to ensure afterSignHook.js is accessible during builds
- **Framework Signing**: Confirmed enhanced framework component signing works correctly for Squirrel and Mantle frameworks
- **Local Build Tested**: Verified complete build process works with proper certificate signing

---

## [0.2.8] - 2024-12-11

### Fixed
- **Build Files**: Added `build/**/*` to files array to ensure afterSignHook.js is included in the package
- Resolved "Cannot find module afterSignHook.js" error during CI builds

---

## [0.2.7] - 2024-12-11

### Fixed
- **Electron Builder Configuration**: Fixed notarize configuration to use boolean value instead of object
- Corrected invalid schema error that prevented builds from completing

---

## [0.2.6] - 2024-12-11

### Changed
- **Test Build**: Re-release to test Apple certificate signing with newly configured GitHub secrets
- Verify that code signing and notarization now work correctly with proper certificate import

---

## [0.2.5] - 2024-12-11

### Fixed
- **Apple Code Signing & Notarization**: Resolved critical signing issues that prevented app notarization
  - Added proper Apple certificate import in GitHub Actions workflow
  - Enhanced framework component signing with detailed per-component signing for Squirrel.framework and Mantle.framework
  - Fixed "binary is not signed with a valid Developer ID certificate" errors
  - Fixed "signature does not include a secure timestamp" errors
  - Improved signing reliability by using explicit certificate identity instead of auto-discovery

### Technical Improvements
- Enhanced afterSignHook.js with comprehensive framework component signing
- Updated GitHub Actions workflow to properly handle Apple certificates
- Better error handling and logging during the signing process

---

## [0.2.4] - 2024-12-11
### Changed
- Improve notarization configuration for all app components

## [0.2.3] - 2024-12-11
### Fixed
- Fix Apple app notarization configuration

## [0.2.2] - 2024-12-11
### Added
- Add Apple app notarization

## [0.2.1] - 2024-12-11
### Fixed
- Fix DMG distribution in GitHub Actions

## [0.2.0] - 2024-12-11
### Added
- Dynamic version system and settings improvements