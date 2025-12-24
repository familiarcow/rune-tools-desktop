# Rune Tools Desktop

A powerful desktop application for interacting with THORChain - manage your RUNE, perform swaps, bond RUNE, stake TCY and explore the THORChain ecosystem with a secure, user-friendly interface

## Features

- **🔐 Secure Wallet Management** - Create and manage THORChain wallets with mnemonic phrase backup
- **💰 RUNE Bonding** - Bond your RUNE to a node to earn rewards
- **🔄 Token Swaps** - Swap between supported assets using THORChain's decentralized exchange infrastructure
- **💧 TCY Staking** - Earn a portion of THORChain's daily income by staking TCY
- **📊 Pool Analytics** - Explore pool statistics, yields, and liquidity data
- **🌐 Rune.Tools Integration** - Access your favorite THORChain power user tool suite Rune.Tools directly from the app
- **✨ Memoless Transactions** - Onboard native assets to THORChain secured assets using Memoless Transactions

## Download

Download the latest release for your platform:

- **macOS**: `Rune.Tools (beta)-macOS-[version]-arm64.dmg`
- **Windows**: `Rune.Tools (beta)-Windows-[version]-x64.exe`

**[→ Get Latest Release](https://github.com/familiarcow/rune-tools-desktop/releases/latest)**

## Installation

### macOS
1. Download the `.dmg` file
2. Double-click to mount the disk image
3. Drag "Rune.Tools (beta)" to your Applications folder
4. If you see a security warning:
   - Right-click the app in Applications and select "Open"
   - Click "Open" in the confirmation dialog

### Windows
1. Download the `.exe` file
2. If Windows SmartScreen shows a warning:
   - Click "More info"
   - Click "Run anyway"
3. Follow the installation wizard


## Security

### Wallet Security
- **Encrypted Storage** - All wallet data is encrypted using AES-256-GCM with password-derived keys
- **PBKDF2 Key Derivation** - Passwords are hashed using PBKDF2 with 100,000 iterations and SHA-256
- **Never Plaintext** - Private keys and mnemonics are never stored in plaintext on disk
- **Salt Protection** - Each wallet uses a unique cryptographic salt for password hashing
- **Local-Only Storage** - Wallet data stored in `~/.runetools/wallets` with 600 permissions (owner read/write only)
- **Memory Clearing** - Sensitive data is cleared from memory after use
- **Secure Random Generation** - Uses `crypto.getRandomValues()` for cryptographically secure randomness
- **Hardened Runtime** - macOS builds use hardened runtime for additional protection
- **No Cloud Sync** - Wallet data never leaves your device

**Why This is Secure:**
The application uses industry-standard encryption (AES-256-GCM) with proper key derivation (PBKDF2). Even if an attacker gains access to your computer, wallet files are encrypted and protected by your password. The high iteration count (100,000) makes brute force attacks computationally expensive.

### Release Security
- **Code Signing** - macOS releases are signed with Apple Developer ID certificate
- **Notarization** - macOS apps are notarized by Apple and pass Gatekeeper verification
- **PGP Signatures** - All releases include cryptographic signatures for integrity verification
- **SHA256 Checksums** - Release manifests include checksums for tamper detection
- **Secure Distribution** - Releases distributed via GitHub's secure infrastructure

### Verifying Release Authenticity

To verify download integrity and authenticity:

1. **Download the release manifest and signature:**
   ```bash
   curl -L -O https://github.com/familiarcow/rune-tools-desktop/releases/latest/download/release-manifest.json
   curl -L -O https://github.com/familiarcow/rune-tools-desktop/releases/latest/download/release-manifest.json.asc
   ```

2. **Import the public signing key:**
   ```bash
   # From keyserver
   gpg --keyserver keyserver.ubuntu.com --recv-keys C6DFD39BDE409E5DE7F9CA4E4733B6751C785B7F
   
   # Or from repository
   curl -L https://raw.githubusercontent.com/familiarcow/rune-tools-desktop/main/PUBKEY.asc | gpg --import
   ```

3. **Verify the signature:**
   ```bash
   gpg --verify release-manifest.json.asc release-manifest.json
   ```

4. **Check file checksums:**
   ```bash
   # Extract checksum from manifest and verify downloaded file
   cat release-manifest.json | jq -r '.checksums["filename.dmg"]' 
   shasum -a 256 filename.dmg
   ```

**GPG Key Information:**
- **Key ID**: `4733B6751C785B7F`
- **Fingerprint**: `C6DFD39BDE409E5DE7F9CA4E4733B6751C785B7F`
- **Owner**: `familiarcow <familiarcow@proton.me>`

## Support

- **Issues**: [GitHub Issues](https://github.com/familiarcow/rune-tools-desktop/issues)
- **Documentation**: [docs/](docs/) folder

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This software is provided "as is" without warranty. Always verify transaction details before signing. Never share your mnemonic phrase or private keys.

---

**Built with ❤️ by [FamiliarCow](https://x.com/familiarcow)**