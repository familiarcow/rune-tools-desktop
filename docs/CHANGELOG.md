# Changelog

All notable changes to Rune Tools Desktop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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