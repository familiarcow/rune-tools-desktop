#!/bin/bash

# Post-install script for Rune Tools Desktop
# Automatically removes quarantine attribute to prevent "damaged app" warnings

set -e

# Application path
APP_PATH="/Applications/Rune.Tools (beta).app"

# Log function
log() {
    echo "[Rune Tools Installer] $1" >> /tmp/runetools-install.log
}

log "Starting post-install script"

# Check if application exists
if [ ! -d "$APP_PATH" ]; then
    log "ERROR: Application not found at $APP_PATH"
    exit 1
fi

log "Application found at $APP_PATH"

# Remove quarantine attribute
if xattr -d com.apple.quarantine "$APP_PATH" 2>/dev/null; then
    log "SUCCESS: Quarantine attribute removed"
else
    # This might fail if the attribute doesn't exist, which is fine
    log "INFO: Quarantine attribute removal completed (may not have existed)"
fi

# Set executable permissions to ensure app can launch
if chmod +x "$APP_PATH/Contents/MacOS"/* 2>/dev/null; then
    log "SUCCESS: Executable permissions set"
else
    log "WARNING: Could not set executable permissions"
fi

# Verify the app is ready to launch
if [ -x "$APP_PATH/Contents/MacOS/Rune.Tools (beta)" ]; then
    log "SUCCESS: Application is ready to launch"
else
    log "WARNING: Application executable may not be properly configured"
fi

log "Post-install script completed"

# Clean up log after 24 hours (run in background)
(sleep 86400 && rm -f /tmp/runetools-install.log) &

exit 0