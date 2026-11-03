# Iron Ledger for iPhone (Xcode)

A native iPhone app that shows the live Iron Ledger web app
(https://jakesilverthorn-a11y.github.io/iron-ledger/) and adds what a web page can't do:

- **Apple Health, read directly**: weight, body fat, resting heart rate, HRV, sleep, steps and active energy.
  No Shortcut needed. The first time it reads two months of history; after that it reads a few days each
  time you open the app (at most every 3 hours).
- **Rest-over notification** (time-sensitive, gets through Focus) when the rest timer ends while you're in another app or the phone is locked.
- **Haptics** on ticking a set and when rest is over.
- **Screen stays on** during a workout.
- **Share sheet** for backups, workout pictures and the timeline video.
- **Workouts saved to Apple Health** as strength training (Fitness app, Activity rings), with estimated calories.
  Can be turned off in the app's Apple Health screen.
- **Quick actions**: press and hold the app icon for *Today's workout*, *Empty workout* or *Log weight*.
- **Waist size** is read from Health into your measurements.

Your workouts are the same as on the web: sign in with the same username.
Changes to the web app show up in the app automatically, so there's nothing to rebuild for normal updates.
Only the native parts (Swift files in `IronLedger/`) need Xcode.

## First run

1. Open `IronLedger.xcodeproj` in Xcode.
2. Click the **IronLedger** project (blue icon) → target **IronLedger** → **Signing & Capabilities**.
   Pick your **Team** (your paid developer account). If the bundle ID `com.jakesilverthorn.ironledger` is
   taken, change it to anything unique.
3. HealthKit is already set up (the entitlement file is included). If Xcode asks, let it register the App ID.
4. Plug in your iPhone (or pick it from the device list), then press ▶ (Run).
   The first time, on the iPhone: Settings → Privacy & Security → Developer Mode → On.

## Getting it onto your phone (and friends') with TestFlight

1. In App Store Connect (appstoreconnect.apple.com) → Apps → **+** → New App, with the same bundle ID.
2. In Xcode choose **Any iOS Device (arm64)** as the destination → **Product → Archive** →
   **Distribute App** → **TestFlight & App Store** → Upload.
3. In App Store Connect → TestFlight, add yourself (and friends, by email) as testers.
   They install the free **TestFlight** app and accept the invite.

TestFlight builds last 90 days; upload a new build before then (only needed when the Swift side changes,
or to renew).

## Files

- `IronLedger/IronLedgerApp.swift`: app entry, notification behaviour.
- `IronLedger/WebViewController.swift`: the web view, links, alert/confirm, offline screen.
- `IronLedger/NativeBridge.swift`: what the page can ask for (`window.webkit.messageHandlers.il`).
- `IronLedger/HealthReader.swift`: reads Apple Health into one row per day.
- `IronLedger/Info.plist`: permissions text and `WKAppBoundDomains` (lets the app work offline).
- Web side of the bridge: `src/native.js` in the main project.
