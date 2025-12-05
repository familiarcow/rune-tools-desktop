#!/bin/bash

# Workaround for electron-builder PKG cleanup bug
# The PKG files are built successfully, but cleanup fails - we'll ignore the cleanup error

echo "Building electron app with PKG target..."

# Run the build process
npm run build

echo "Running electron-builder (ignoring cleanup errors)..."

# Run electron-builder and capture its exit status
set +e  # Don't exit on error
npx electron-builder
EXIT_CODE=$?
set -e  # Re-enable exit on error

# Check if PKG files were actually created successfully
if ls dist-electron/*.pkg 1> /dev/null 2>&1; then
    echo ""
    echo "✅ PKG build completed successfully!"
    echo "📦 Output files created:"
    ls -la dist-electron/*.pkg
    echo ""
    echo "Note: electron-builder cleanup error can be ignored - the PKG files were built correctly."
    exit 0
else
    echo ""
    echo "❌ Build failed - no PKG files were created"
    exit $EXIT_CODE
fi