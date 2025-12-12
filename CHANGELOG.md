# Changelog

All notable changes to this project will be documented in this file.

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