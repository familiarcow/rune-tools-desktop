# Changelog

All notable changes to Rune Tools Desktop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.3] - 2025-12-11

- Fix Apple app notarization configuration

## [0.2.2] - 2025-12-11

- Add Apple app notarization

## [0.2.1] - 2025-12-11

- Fix GitHub Actions workflow to properly distribute macOS DMG files
- Ensure both macOS and Windows builds are automatically uploaded to releases

## [0.2.0] - 2025-12-11

- Fix mac app signing
- Fix TCY distribution history
- Update CSS: TCY & Bond apps
- Link to RUNE Bond to find a node operator if user is not whitelisted
- Added more warnings to Memoless deposit
- Added dynamic version detection in app

## [0.1.7] - 2025-12-05

### Changed  
- **BREAKING**: Reverted from PKG back to DMG installer for macOS distribution
- Improved unsigned app distribution experience with DMG format
- Dual architecture support for both Apple Silicon and Intel Macs

### Removed
- PKG installer configuration and post-install scripts
- Complex PKG workaround scripts (scripts/build-pkg.sh)
- PKG-specific electron-builder cleanup handling

### Technical
- Restored standard electron-builder DMG workflow
- Updated build configuration for both arm64 and x64 architectures
- Simplified distribution process until code signing certificates available

### Reason
- PKG installers require Apple Developer certificates for optimal user experience
- DMG approach better suited for beta/unsigned distribution
- Temporary rollback until proper code signing infrastructure established

## [0.1.6] - 2025-12-05

### Fixed
- Resolved electron-builder PKG cleanup error preventing successful builds
- PKG installers now generate correctly for both ARM64 and x64 architectures

### Changed
- Upgraded electron-builder from v26.0.12 to v26.3.4
- Added workaround script (scripts/build-pkg.sh) for PKG build issues

### Added
- Documentation for PKG build fix (docs/PKG_BUILD_FIX.md)
- Automated handling of electron-builder cleanup bugs

## [0.1.5] - 2025-12-04

### Changed
- **BREAKING**: Switch from DMG to PKG installer for macOS distribution
- Reduced user installation friction from 2 security warnings to 1
- Automated quarantine attribute removal via post-install script
- Professional installer experience with automatic app placement

### Added
- Post-install script for automatic quarantine removal
- Comprehensive installer change documentation
- PKG installer configuration for electron-builder

### Technical
- Updated GitHub Actions workflow for PKG distribution
- Updated release manifest and changelog scripts
- Added InstallerChangeLog.md with rollback procedures

## [0.1.4] - 2025-12-04

### Changed
- Improved version display positioning on wallet selection screen
- Moved version display outside wallet container for better layout separation

### Added
- Documentation for version display system in Architecture.md

## [0.1.3] - 2025-12-04

### Added
- Version display on splash screen for immediate visibility
- Version information under wallet list on selection screen
- Version section in Settings tab with GitHub releases link

### Fixed
- Resolved blockmap file conflicts in GitHub Actions workflow
- Improved release asset handling for cross-platform builds
- Enhanced release documentation with comprehensive troubleshooting

## [0.1.2] - 2025-12-04

### Fixed
- Fixed macOS app "damaged" warning by converting PNG icon to ICNS format
- Fixed Windows GPG key import in GitHub Actions workflow
- Fixed cross-platform build compatibility issues

### Changed
- Updated release workflow to support both macOS and Windows builds
- Improved GPG key handling with platform-specific implementations

## [0.1.0] - 2025-12-04

### Added
- Initial release of Rune Tools Desktop
- Automated release system with GitHub Actions
- In-app update notifications with GPG verification
- PGP-signed release manifests for security
- Cross-platform builds (macOS and Windows)
- Wallet management system with create/import functionality
- THORChain integration for swaps and liquidity provision
- Bond management interface
- Multi-network support (mainnet/stagenet)
- Comprehensive transaction system (MsgSend/MsgDeposit)
- Asset portfolio tracking
- Real-time balance updates
- Secure wallet storage with encryption

### Features
- **Wallet Management**: Create new wallets or import from seed phrases
- **Trading**: Swap assets across THORChain supported chains
- **Liquidity**: Add/remove liquidity from pools
- **Bonding**: Manage THORNode bonds
- **Portfolio**: Track asset balances and USD values
- **Security**: Encrypted local wallet storage + GPG-verified updates
- **Multi-chain**: Support for BTC, ETH, BCH, LTC, DOGE, AVAX, BSC and more
- **Auto-Updates**: Secure, cryptographically verified update system

---

## Release Notes Format

Each release includes:
- **Version number** following semantic versioning
- **Release date** in YYYY-MM-DD format
- **Added**: New features and capabilities
- **Changed**: Modifications to existing features
- **Deprecated**: Features that will be removed
- **Removed**: Features that were removed
- **Fixed**: Bug fixes
- **Security**: Security improvements

## Contributing

When adding entries to the changelog:
1. Add unreleased changes to the `[Unreleased]` section
2. Use clear, user-friendly language
3. Group changes by category (Added, Changed, Fixed, etc.)
4. Include issue/PR numbers when relevant
5. Move unreleased changes to a new version section on release