# PKG Build Fix

## Issue
electron-builder PKG target has a cleanup bug where it tries to delete intermediate files that don't exist:
```
ENOENT: no such file or directory, unlink 'com.familiarcow.runetools.pkg'
```

## Solution
Created `scripts/build-pkg.sh` that:
1. Runs the build process normally
2. Ignores the cleanup error (PKG files are built successfully)
3. Verifies that the PKG files were actually created
4. Returns success if PKG files exist, regardless of cleanup error

## Usage
```bash
npm run dist  # Now uses the workaround script
```

## Files Modified
- `package.json`: Updated `dist` script to use `./scripts/build-pkg.sh`
- `scripts/build-pkg.sh`: New workaround script
- `package.json`: Upgraded electron-builder to 26.3.4

## Result
PKG build now completes successfully and generates both:
- `Rune.Tools (beta)-0.1.5-arm64.pkg` (~131MB)
- `Rune.Tools (beta)-0.1.5.pkg` (x64 version)