# Iron Ledger for iPhone (Xcode)

A native iPhone app that shows the live Iron Ledger web app
(https://jakesilverthorn-a11y.github.io/iron-ledger/) and adds what a web page can't do:

- **Apple Health, read directly**: weight, body fat, resting heart rate, HRV, sleep, steps and active energy.
  No Shortcut needed. The first time it reads two months of history; after that it reads a few days each
  time you open the app (at most every 3 hours).
- **Rest-over notification** (time-sensitive, gets through Focus) when the rest timer ends while you're in another app or the phone is locked.
- **Rest chime that works on silent** (1.2): the app plays the chime itself, so it sounds with the ring switch on silent and your music keeps playing.
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

## Updating to a new version (the app is already on your phone)

1. Download the new `IronLedger-iOS.zip`, unzip it, and use the new `ios` folder in place of the old one
   (delete or rename the old folder first so you don't open the wrong project).
2. Open `IronLedger.xcodeproj` in Xcode. Use **Xcode 27.1 or newer**: built with it, the app fills the
   iPhone Duo's big inner screen.
3. Project → target **IronLedger** → **Signing & Capabilities** → pick your **Team** again
   (the zip doesn't carry it). Keep the bundle ID the same as last time, or iPhone installs a second copy.
4. Choose your iPhone at the top of the Xcode window and press ▶ (Run). It installs over the old app:
   your workouts, sign-in and settings stay (they live on the phone and on the server, not in the app file).
   Or Archive → Distribute → TestFlight as below.

The version number in Xcode (target → General) goes up with each zip, so you can tell which one is installed
(iPhone Settings → General → iPhone Storage → Iron Ledger shows it too).

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

## Versions

- **1.4 (build 5)**: timer beeps (wall sits, planks, tempo) are played by the app and mix with your music; nothing in the app stops your music any more.

- **1.3 (build 4)**: the app speaks the tempo and hold timer cues itself ("down… two… one… up"), on silent and over music.

- **1.2 (build 3)**: rest chime played by the app (sounds on silent, mixes with music). Rebuild with Xcode 27.1+ for the full iPhone Duo inner screen.
- **1.1 (build 2)**: Apple Health read directly, workouts saved to Health, quick actions, waist size.
