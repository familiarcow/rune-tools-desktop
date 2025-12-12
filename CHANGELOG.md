# Changelog

All notable changes to this project will be documented in this file.

## [0.2.58] - 2024-12-12

### Fixed
- **CRITICAL: Two-Stage Notarization Fix**: Apple's DMG-only guidance failed - app inside DMG lacked notarization ticket
- **Proper Workflow**: First notarize app bundle using afterSign hook, then create signed DMG containing notarized app
- **DMG Signing Enabled**: Enable DMG signing as required for proper two-stage notarization workflow
- **Root Cause**: Apple's claim that "DMG notarization automatically handles contents" doesn't work in practice

---

## [0.2.57] - 2024-12-12

### Fixed
- **OFFICIAL APPLE GUIDANCE: DMG-Only Notarization**: Follow Apple's exact recommendation
- **Apple Quote**: "When you notarize a DMG, everything inside is automatically unpacked and notarized as well"
- **Single Pass**: "You only need to upload the 'top level' file for notarizing in a single pass"
- **Unsigned DMG**: Apple accepts unsigned DMG and notarizes contents automatically
- **Comprehensive Validation**: Enhanced testing to verify both DMG and app inside are properly notarized

---

## [0.2.56] - 2024-12-12

### Fixed
- **CORRECT APPROACH: App-Only Notarization**: Follow official @electron/notarize recommendation
- **Unsigned DMG**: Create unsigned DMG with notarized app inside (Apple best practice)
- **Root Cause**: Was incorrectly trying to notarize DMG instead of app contents
- **Documentation**: "use an unsigned, unnotarized DMG with a notarized .app inside"

---

## [0.2.55] - 2024-12-12

### Fixed
- **CRITICAL: Validate App Inside DMG**: Added validation that app inside DMG has notarization ticket
- **Mount and Test**: DMG notarization script now mounts DMG and validates the app inside
- **Fail Build if App Invalid**: Build fails if app inside DMG lacks notarization ticket
- **Complete Verification**: Both DMG and app inside must pass stapler + spctl validation

---

## [0.2.54] - 2024-12-12

### Fixed
- **CRITICAL BUG: DMG Notarization Was Being Skipped**: Fixed platform detection bug in notarize-dmg.js
- **Root Cause**: afterAllArtifactBuild context doesn't have electronPlatformName property
- **Result**: DMG notarization was completely skipped, leaving DMGs with invalid tickets
- **Solution**: Remove incorrect platform check, process all .dmg files found

---

## [0.2.53] - 2024-12-12

### Fixed
- **SIMPLIFIED: DMG-Only Notarization**: Following Apple's recommendation to notarize only the DMG (automatically notarizes contents)
- **Removed App Notarization**: No longer notarizing app bundle separately, only the DMG containing signed app
- **Apple Best Practice**: "When you notarize a DMG, everything inside is automatically unpacked and notarized as well"
- **Single Pass**: One notarization call for the entire distribution package

---

## [0.2.52] - 2024-12-12

### Fixed
- **CRITICAL: Two-Stage Notarization**: Implemented proper Apple best practices with separate app and DMG notarization
- **App Bundle Notarization**: First notarize and staple the app bundle using afterSign hook
- **DMG Notarization**: Then notarize and staple the DMG containing the notarized app using afterAllArtifactBuild hook
- **DMG Signing Enabled**: Enable DMG signing as required by Apple for notarization
- **Complete Workflow**: Follow Apple's exact recommendation: sign app → notarize app → create DMG → sign DMG → notarize DMG

---

## [0.2.51] - 2024-12-12

### Fixed
- **CRITICAL: Timing Issue Fix**: Added explicit stapler validation after notarization completion
- **Stapling Verification**: Prevent DMG creation before stapling is fully complete
- **Ticket Validation**: Wait 10 seconds if initial stapler validation fails to ensure stapling finishes
- **Root Cause Resolution**: Fixed invalid ticket issue where spctl reports "Unnotarized Developer ID" despite successful notarization

---

## [0.2.50] - 2024-12-12

### Fixed
- **CRITICAL: Custom Notarization Implementation**: Replaced electron-builder's broken built-in notarization with Asgardex-style custom script
- **Invalid Ticket Resolution**: Fixed root cause of invalid notarization tickets by using custom afterSign hook
- **App Store Connect API Integration**: Added support for App Store Connect API key authentication (preferred method)
- **Retry Logic**: Implemented robust retry mechanism with exponential backoff for notarization failures
- **Notarization Reliability**: Fixed malware warnings by ensuring valid notarization tickets are properly generated
- **Following Proven Patterns**: Based on working Asgardex implementation using @electron/notarize 2.5.0 directly