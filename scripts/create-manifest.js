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
            if (file.match(/\.(pkg|exe|zip|dmg)$/) || file.includes('Rune.Tools.beta.')) {
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