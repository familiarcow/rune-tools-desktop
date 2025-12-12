# Changelog

All notable changes to this project will be documented in this file.

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