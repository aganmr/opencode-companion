# Changelog

All notable changes to this project are documented in this file.

Versioning: `A.B.C` — **A** = breaking change / major overhaul, **B** = new feature, **C** = bug fix (each digit 0–99, with rollover to the left digit).

## [1.0.0] - 2026-10-30

First release.

### Added
- Connect to an opencode server by scanning its QR code or entering a URL manually
- Live "Connected" status pill (auto-hides after 1 minute, toggleable)
- Pinch-to-zoom in the WebView (toggleable)
- Scanned-servers list (last 3, with expiry labels) and saved servers with one-tap reconnect
- Settings: appearance & behavior preferences, clear scanned/saved data
- Links to the opencode documentation and this repo's issue tracker
- "Buy me a coffee" donation sheet:
  - GCash: QR screen with one-tap download to the phone's gallery (local native module `gcash-image`, MediaStore scoped storage, no runtime permissions)
  - Ko-fi: coming soon
