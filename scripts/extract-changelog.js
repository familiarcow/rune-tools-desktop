#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Extract the changelog entry for the current version from CHANGELOG.md
 * and create a release-specific changelog.md file
 */

function extractChangelog() {
    try {
        // Read package.json to get current version
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const currentVersion = packageJson.version;
        
        // Read CHANGELOG.md
        const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
        const changelogContent = fs.readFileSync(changelogPath, 'utf8');
        
        console.log(`📝 Extracting changelog for version ${currentVersion}`);
        
        // Split into lines for processing
        const lines = changelogContent.split('\n');
        
        // Find the version section
        const versionPattern = new RegExp(`^## \\[${currentVersion.replace(/\./g, '\\.')}\\]`);
        let startIndex = -1;
        let endIndex = -1;
        
        // Find start of current version section
        for (let i = 0; i < lines.length; i++) {
            if (versionPattern.test(lines[i])) {
                startIndex = i;
                break;
            }
        }
        
        if (startIndex === -1) {
            throw new Error(`Version ${currentVersion} not found in CHANGELOG.md`);
        }
        
        // Find end of current version section (next ## heading or end of file)
        for (let i = startIndex + 1; i < lines.length; i++) {
            if (lines[i].startsWith('## ')) {
                endIndex = i;
                break;
            }
        }
        
        // If no next section found, use end of file
        if (endIndex === -1) {
            endIndex = lines.length;
        }
        
        // Extract the version section
        const versionLines = lines.slice(startIndex, endIndex);
        
        // Create release notes with header and installation info
        const releaseNotes = [
            `# Rune Tools Desktop v${currentVersion}`,
            '',
            ...versionLines.slice(1), // Skip the version header since we have our own
            '',
            '---',
            '',
            '## Downloads',
            '- **macOS**: Download the `.pkg` installer',
            '- **Windows**: Download the `.exe` file',
            '',
            '## Installation Notes',
            'Since these binaries are not code-signed with expensive certificates, you may see security warnings:',
            '',
            '**macOS**: If you see "cannot be opened because it is from an unidentified developer", right-click the installer and select "Open"',
            '',
            '**Windows**: If Windows SmartScreen blocks it, click "More info" then "Run anyway"',
            '',
            '## Verification',
            'You can verify the integrity of downloads using:',
            '- **Checksums**: Included in `release-manifest.json`',
            '- **GPG Signature**: The manifest is cryptographically signed with our release key',
            '',
            '## Need Help?',
            'Join our community or report issues on [GitHub](https://github.com/familiarcow/rune-tools-desktop/issues).'
        ].join('\n');
        
        // Write to changelog.md for the release
        fs.writeFileSync('changelog.md', releaseNotes);
        
        console.log(`✅ Created changelog.md for v${currentVersion}`);
        console.log(`📊 Changelog contains ${versionLines.length} lines`);
        
        // Also extract just the changes for the manifest
        const changesOnly = versionLines.slice(1).join('\n').trim();
        
        // Update the manifest creation
        const manifestPath = 'release-manifest.json';
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            manifest.changelog = changesOnly;
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            console.log('✅ Added changelog to release manifest');
        }
        
    } catch (error) {
        console.error('❌ Failed to extract changelog:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    extractChangelog();
}

module.exports = { extractChangelog };