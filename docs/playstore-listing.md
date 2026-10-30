# Play Store listing assets — Opencode Companion

Everything needed to fill in the Play Console store listing. Copy/paste per section.
Character limits are Play's: short description 80, full description 4000.

## 1. App identity

| Field | Value |
|---|---|
| App name | `Opencode Companion` |
| Package name | `com.opencode.companion` |
| Language | English (default) |
| App type | Application |
| App icon | `full-512.png` (512×512, in `icon-drafts/render/` — the Prompt Beacon) |
| Version code | `10000` |
| Version name | `1.0.0` |
| Minimum Android | Android 7.0 (API 24) |
| Target Android | Android 15 (API 36) |
| 64-bit | Yes (arm64-v8a) |

## 2. Short description (80 chars max)

```
Scan a QR code to control your opencode sessions from your phone.
```
(65 chars)

## 3. Full description (4000 chars max)

```
Opencode Companion is an unofficial companion app for opencode, the AI coding agent. Scan the QR code shown by an opencode remote session and that session opens in a full-screen, browser-quality web view on your phone.

Not affiliated with or endorsed by the opencode project.

WHAT YOU CAN DO
• Scan to connect. Point your camera at the opencode remote QR code. The pairing link is one-time and short-lived (~5 minutes); one scan authenticates your phone for 30 days.
• Reconnect without re-scanning. The three most recently scanned servers are saved on your device (host and port only). Tap a card to reopen the session — the saved cookie re-authenticates while the 30-day session is valid.
• Expiry estimates. Each session card shows when it was connected and when it is expected to expire. It turns amber with a week remaining and red when the session has lapsed.
• Add servers by hand. Type a host and port when you can't scan a QR code.
• Live connection status. A status pill (Connecting / Connected / Offline), an offline banner, and an automatic page reload when connectivity returns.
• Friendly error states. Lapsed sessions, expired pairing links, network failures, and malformed QR codes all show clear explanations with Retry and Scan-again actions.

PRIVACY
The app collects no data. There are no accounts, no analytics, no advertising, and no third-party SDKs. Your server list and session cookies live in local app storage on your phone, and the only network traffic is the direct connection between your phone and the opencode servers you choose. See the privacy policy linked on this page.

DONATIONS
Optional and informational only. "Buy me a coffee" in Settings shows a Ko-fi link and a GCash QR code you can save to your gallery. Nothing is purchased inside the app.

REQUIRES
Android 7.0 (API 24) or later.
```

## 4. Privacy policy

- Host `docs/privacy-policy.html` publicly. Easiest: GitHub Pages on this repo
  (main branch → root, then the URL is
  `https://<user>.github.io/opencode-companion/docs/privacy-policy.html`).
- Paste that URL into **App content → Privacy policy**.
- Text: see `docs/privacy-policy.html`.

## 5. Data Safety form

| Question | Answer |
|---|---|
| Do you collect any data? | **We do not collect any data** |
| Do you process sensitive personal data? | No |
| Do you share any data with third parties? | **We do not share any data** |
| Is any data used to verify identity? | N/A (no data collected) |
| Data types collected | *(none — nothing to list)* |
| Data types shared | *(none — nothing to list)* |
| Location data | Not collected |
| Used for app functionality | The app processes the server URLs you enter and the session cookie your browser view stores, entirely on-device. No personal data. |
| Security | Data is stored in local app storage (Android keystore-protected app data) |

**Permissions explanation** (if the form asks about `READ/WRITE_EXTERNAL_STORAGE`):
> "Used only on Android 9–12 to save the optional donation QR code image to your
> photo gallery. The permission is not requested on Android 13+."

## 6. Content rating

- Expected result: **Everyone (3+)**
- Self-assessment questionnaire: all "none" — no violence, no nudity, no
  substance use, no gambling, no user-generated content.
- Note for context: the app renders web pages from user-specified opencode
  servers (its core function, like a browser). Browsers are rated Everyone.
- **Designed for kids:** No — "Not made for kids" (developer tool).

## 7. Release notes (v1.0.0)

```
First public release.

• Scan an opencode remote QR code to open the session on your phone
• 30-day sessions with expiry estimates
• Saved server list (last 3 scanned origins) plus manual host:port entry
• Live connection status: offline banner and auto-reload
• Settings: auto-hide status pill, WebView zoom, clear servers
• Optional donation via Ko-fi / GCash (informational only)

Works on Android 7.0 (API 24) and up.
```

## 8. URLs (App content → Links)

| Field | Value |
|---|---|
| Website | `https://github.com/aganmr/opencode-companion` |
| Privacy policy | *(GitHub Pages URL from section 4)* |
| Terms of service | *(optional — can point to the same repo)* |

## 9. Store screenshots (you have these)

- Phone: at least 2, 16:9 or 9:16, 320–3840 px per side, PNG/JPG
- Suggested: Home screen (server cards), Connect screen (web view)

## 10. Play App Signing

- Enable **Play App Signing** (required for new apps).
- Developer upload key = the release keystore in `android/release.keystore`
  (fingerprint SHA-256 `24:C1:8C:BE:42:DB:9F:06:5C:F0:72:8A:E2:12:9C:09:38:81:1B:B4:73:9E:64:63:80:0F:75:D7:1C:96:DE:1D`).
- Play generates and stores the final app-signing key.
- **Back up `android/release.keystore` + its password now** (see keystore.properties, gitignored).

## 11. AAB upload

- File: `android/app/build/outputs/bundle/release/app-release.aab`
- Signed with the release **upload key** (JAR/v1 scheme — the standard for
  AABs). Play App Signing (required for new apps) re-signs the distribution
  APKs it generates with v2/v3/v4 using the Google-held app signing key, so
  the v2+ requirement for targetSdk 30+ is satisfied by Play, not the upload.
- Verified: the AAB's embedded certificate SHA-256 matches
  `android/release.keystore` (`24:C1:8C:BE:…`).
- Built with `-P EX_DEV_CLIENT_NETWORK_INSPECTOR=false` (no dev-tools network endpoint).
