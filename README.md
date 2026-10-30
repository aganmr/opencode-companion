# opencode companion

A dark-themed React Native companion app for [opencode](https://opencode.ai). Scan an opencode remote QR code with your phone's camera and open the session's connect URL in a full-screen web view.

> ## ⚠️ Unofficial project
>
> This app is an **independent community project. It is NOT affiliated with,
> endorsed by, or sponsored by Anomaly Innovations, Inc.** or the OpenCode
> team, and is not the official companion app for OpenCode.
>
> **OpenCode** is a registered trademark of **Anomaly Innovations, Inc.**
> (U.S. Serial No. 99379413, registered May 19, 2026). All product names,
> logos, and brands mentioned in this project are the property of their
> respective owners and are used for identification purposes only.

## Features

- **Scan** — camera-based QR scanning of the opencode remote QR payload:
  `{"code":"...","urls":["https://..."]}` → opens `urls[0] + "/auth/connect/" + code`.
  The pairing link is **one-time and short-lived (~5 min)**; it authenticates the
  phone's WebView with a **session cookie that lasts 30 days**.
- **Scanned servers** — the three most recent scanned server **origins** are
  saved on-device (Redux, persisted via AsyncStorage) and listed on the home
  screen. Tapping a card reconnects to the origin — the WebView cookie
  re-authenticates, so no new QR scan is needed while the 30-day session is
  valid.
- **Expiry estimate** — each session card shows the time-ago plus an estimated
  expiry (`1h ago · expires in 30 days`, from connect time + 30 days). Amber when
  ≤ 7 days remain, red `expired — scan QR again` when past due. The cookie's real
  expiry can't be read from the app, so a lapsed session surfaces as a 401/403
  error panel instead.
- **Saved servers** — add a server by typing host + port (no QR needed); it
  appears as a card on the home screen and opens the Connect screen for that
  origin. Saving returns to the home screen immediately with a brief
  **"Server saved"** snackbar there.
- **Settings** — version, opencode docs/issue links, toggles (auto-hide status
  pill, WebView zoom), clear-scanned-servers / clear-servers with confirmation,
  and a donation flow: "Buy me a coffee" opens a slide-up sheet with **Ko-fi**
  (coming soon) and **GCash** (QR screen with a save-to-gallery download,
  written to MediaStore by a local Kotlin native module — no permissions on
  Android 10+).
- **Disconnect** — the close button on the Connect screen confirms
  ("Disconnect?") and returns to the home screen; there is no in-app quit.
- **Connection monitoring** — live status pill (Connecting… / Connected /
  Offline) driven by device connectivity (`NetInfo`), an offline banner, and
  automatic page reload when the connection returns.
- **Error handling** — lapsed sessions (401/403 "not signed in"), expired
  pairing links (404/410), network failures, and malformed QR codes all show
  friendly error states with Retry / Scan-again actions.
- **Material Design 3** components (react-native-paper) with an opencode-style
  dark theme.

## Tech stack

- Expo SDK 58 (bare / ejected workflow), React Native 0.88, TypeScript
- `@reduxjs/toolkit` + `react-redux` + `redux-persist` (AsyncStorage) — app state
- `expo-camera` — QR scanning
- `react-native-webview` — session page (with injected JS helpers, see `src/lib/webview/`)
- `@react-native-community/netinfo` — device connectivity monitoring
- `@react-navigation/native-stack` — navigation
- `react-native-paper` — Material Design 3 components
- `@react-native-clipboard/clipboard` — copy to clipboard
- `gcash-image` — local Kotlin native module (TurboModule) that saves the GCash
  QR image to the phone's gallery via MediaStore

## Project structure

```
App.tsx                        # providers + navigation container
src/
  theme.ts                     # opencode-style MD3 dark theme
  lib/
    qr.ts                      # QR payload parsing + pairing URL building
    sessionExpiry.ts           # 30-day session expiry estimate + labels
    time.ts                    # relative time formatting
    webview/
      historyProbe.ts          # page-side "can the SPA go back?" probe
      imeFix.ts                # page-side keyboard/IME scroll-into-view fix
  store/                       # Redux Toolkit store (persisted)
    store.ts
    rootReducer.ts
    sessionsSlice.ts           # scanned servers (max 3, origins)
    serversSlice.ts            # manually saved servers
    settingsSlice.ts           # user settings (pill auto-hide, zoom)
    uiSlice.ts                 # ephemeral UI state (e.g. serverSaved flag)
    legacyMigration.ts         # one-time import of legacy AsyncStorage keys
    hooks.ts                   # typed useAppDispatch / useAppSelector
  navigation/RootNavigator.tsx
  screens/
    HomeScreen.tsx             # sessions + saved servers + scan/add entries + snackbar
    ScannerScreen.tsx          # camera + QR scanning
    ConnectScreen.tsx          # full-screen WebView + monitoring + disconnect + errors
    AddServerScreen.tsx        # manual host + port entry
    SettingsScreen.tsx         # about, settings toggles, data clearing, donations
    GcashDonationScreen.tsx    # GCash QR image + save-to-gallery download
  components/
    SessionCard.tsx            # scanned-server row (time-ago, expiry label, long-press delete)
    ServerCard.tsx             # saved-server row
    ScanOverlay.tsx
    ErrorPanel.tsx
    DonationSheet.tsx          # slide-up sheet (Ko-fi / GCash options)
native/
  gcash-image/                 # local Kotlin native module (MediaStore gallery save)
maestro/flows/                 # device E2E flows (Maestro)
```

## Development

Yarn is the package manager for this project (`yarn.lock` is the source of truth).

```bash
yarn
npx expo start          # dev client / Metro
yarn android            # run on Android device/emulator
```

### Native projects (bare workflow)

- `android/` is committed and ready: `cd android && gradlew assembleDebug`
- `ios/` is generated from macOS or Linux: `npx expo prebuild -p ios --yarn` (Expo skips iOS prebuild on Windows), then `cd ios && pod install`, and commit the folder

## Testing

Every feature is tested at two levels: **Jest** (unit/component) and **UI** (device E2E).

### Jest (unit + component)

```bash
yarn test               # run the whole suite
yarn test:watch
```

- `jest-expo` preset + `@testing-library/react-native`
- `src/store/__tests__/store.test.ts` — all slices (sessions cap/dedupe, servers, settings, UI flag, legacy migration)
- `src/lib/__tests__/sessionExpiry.test.ts` — expiry boundaries and labels
- `src/lib/webview/__tests__/imeFix.test.ts` — injected-script behavior
- `src/components/__tests__/SessionCard.test.tsx` — card behavior (long-press → delete, expiry label/color)
- `src/components/__tests__/DonationSheet.test.tsx` — sheet options (Ko-fi / GCash)
- `src/screens/__tests__/` — HomeScreen (snackbar on fresh save, expiry labels), AddServerScreen (save → immediate back), ConnectScreen (close FAB size/icon), ScannerScreen, SettingsScreen (donation sheet wiring), GcashDonationScreen (QR + gallery-save snackbar)
- `jest-setup.js` — mocks for AsyncStorage, NetInfo, safe-area, and vector icons

### UI (device E2E, Maestro + ADB)

Flows live in `maestro/flows/`:

| Flow | Covers |
|---|---|
| `connect-success-path.yaml` | session card → connect screen loads |
| `connect-error-path.yaml` | 404 → expired panel → scan again |
| `connect-monitor.yaml` | connected status pill + close FAB |
| `donation-flow.yaml` | coffee → sheet → Ko-fi snackbar / GCash QR → gallery save |

Run: `maestro test maestro/flows/<name>.yaml` (Maestro needs `JAVA_HOME` set).

Offline / auto-reconnect scenarios are driven with ADB (`adb shell svc wifi disable` / `svc data disable`, then `enable`) plus screenshot assertions — Maestro cannot call ADB mid-flow, so those steps are orchestrated around the flow runs.

## Release builds (Play Store)

The release signing key lives **outside** git:

- `android/release.keystore` — the signing key (gitignored)
- `android/keystore.properties` — store/key passwords + alias (gitignored)

`android/app/build.gradle` reads the properties file and falls back to the debug key when it's missing, so local builds never break.

```bash
cd android
./gradlew bundleRelease    # signed AAB → app/build/outputs/bundle/release/app-release.aab
./gradlew assembleRelease  # signed APK (for sideloading)
```

Play Store requires the **App Bundle** (`.aab`).

> **Back up `android/release.keystore` and `android/keystore.properties` together, in a safe place.** Losing the keystore means you can never publish an update for this app on the Play Store — the app's identity is bound to that key forever.

## Future enhancements

- **Version checker** — detect when a newer build of the app is available and prompt the user to update
- Push notifications
- Deep linking
