# Changelog

All notable changes to this project will be documented in this file.

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