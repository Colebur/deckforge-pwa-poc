# DeckForge PWA Lab — isolated proof of concept

This experiment answers whether the important DeckForge experience is practical as a Home Screen web app on Cole's iPhone 15 Pro Max / iOS 27. It is **not a full migration**. The native sibling folder `../DeckForge`, its Xcode project, Git repository, decks, and bundle identifier are untouched.

This folder is its own Git repository, independent of the native app. The separate public PWA repository is https://github.com/Colebur/deckforge-pwa-poc. The tested PWA is live at **https://colebur.github.io/deckforge-pwa-poc/**. Native DeckForge is not uploaded.

## What you can try

- Create, rename and delete decks; add, edit and delete cards.
- Bulk paste: every non-empty line becomes a card. Simple `1. `, `2) `, `- `, `* ` and `•` prefixes are removed. Duplicates stay; negative numbers and decimals are preserved.
- Numbered Lookup: fixed deck-order numbers, Previous / Next / Random. Repeated random picks are allowed; Previous/Next stop at the ends.
- Minimal Catchphrase: saved 5/30/60/90/120/180/300-second duration, randomized cards, Got It +1, Pass +0, pause/resume, final score. This is an individual round score experiment, not the native game's team-point rules. The countdown is hidden unless you choose Show countdown for testing. All cards are used before reshuffling; a refill avoids repeating the immediately preceding card if possible.
- IndexedDB local persistence. Writes report success only after the transaction completes. Editor card lists show 50 at a time so large decks do not create thousands of screen controls.
- Manifest, standalone launch, icon, safe areas, dark mode, 48-pixel controls, and an offline service worker. No external fonts, scripts or media are needed at runtime.
- Settings → Device Tests: real motion/orientation permission requests and live values, vibration feature detection, soft tone, looping audio, background-audio probe, saved persistence marker, persistent-storage request, and versioned JSON backups and validated restore.

Not implemented: Heads Up scoring/tilt calibration, teams, random timer durations, automatic native-deck migration, cloud sync, animations, a background-running game. Catchphrase uses copies of the native beep and buzzer, with the same acceleration curve: roughly two seconds apart initially, speeding toward 0.22 seconds. The arpeggio loop remains only as a diagnostic.

## 1. Run locally on this Mac

1. Open **Terminal** (Command–Space, type Terminal, Return).
2. Replace `/path/to/DeckForge-PWA` with the folder where you saved this project, then run:

```sh
cd /path/to/DeckForge-PWA
sh scripts/dev.sh
```

The helper finds the Node runtime already bundled with Codex on this Mac, installs the one build dependency if needed, compiles TypeScript, runs the 18 rule/media/backup tests, and serves the built app. First dependency installation requires internet. Subsequent builds need no internet if the dependency is already present.

3. Open **http://localhost:4173/** in your Mac browser. Keep Terminal open. Stop with Control–C.

On another computer, install [Node.js LTS](https://nodejs.org/) first. The standard commands are `npm install`, `npm test`, then `npm start` from this folder. `npm test` builds and runs tests; `npm start` serves the already-built `dist` folder. After editing source, stop the server and run the helper again to rebuild.

The server serves only `dist/`, listens on the Mac's loopback address, and never receives deck data. It is a static file server, not an app backend. You cannot enter `localhost:4173` on your phone: that points to the phone itself.

## 2. Open on your iPhone: two free HTTPS routes

HTTPS matters for service workers and iOS sensor permissions. Plain HTTP to a Mac Wi-Fi address is insufficient for the full test. Avoid self-signed certificate warning bypasses.

### Immediate trial: a temporary Cloudflare link

Cloudflare's Quick Tunnel needs no account or paid domain. It temporarily makes the static app files reachable at a random HTTPS address. Anyone who has the address can load these public app files, but there is no endpoint for uploading/reading your device's decks. Keep the link for this experiment only.

1. Leave `sh scripts/dev.sh` running in the first Terminal window.
2. Open another Terminal window and paste:

```sh
cd /path/to/DeckForge-PWA
sh scripts/setup-link.sh
sh scripts/iphone-link.sh
```

The setup helper downloads the official Apple-silicon `cloudflared` release into the ignored `.tools` folder and verifies its published SHA-256 digest. It does not install a system service. This Mac was checked as arm64. On another architecture, use Cloudflare's official download instead. Repeat only `iphone-link.sh` after setup is complete.

3. Find the printed address ending in **`.trycloudflare.com`**. Open the entire `https://…trycloudflare.com` address in **Safari on your iPhone**. You can copy it into a note or AirDrop it to yourself. No USB connection is necessary.
4. Keep both Terminal windows running during initial installation. The Mac must remain awake and connected while serving the first load. Stop the tunnel with Control–C when finished.

**Important:** the tunnel hostname changes each time you restart it. Data belongs to the old website address; a new address has a separate empty library. The old installed app can still work offline after caching, but cannot receive updates once that tunnel ends. This is a short test route, not permanent hosting. Do not build your permanent deck collection at a temporary address.

Official source: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

### Stable trial: GitHub Pages

GitHub Pages is a suitable static HTTPS host for this personal experiment. On GitHub Free, the hosting repository must be **public**. That makes the PWA source public; it does not publish decks stored in your browser. The native repository remains separate and need not be uploaded. No custom domain, hosting payment, backend, or Apple Developer subscription is required for this route.

A ready-to-use workflow lives in `.github/workflows/pages.yml`. It builds/tests first and publishes only `dist/`. This app uses relative URLs and a scoped service worker, so it supports a project URL such as `https://YOUR-USERNAME.github.io/deckforge-pwa-poc/`.

The separate public repository has been created and its source uploaded. Pages uses **GitHub Actions**, with HTTPS enforced. The first automated build/test/deployment succeeded on September 30, 2026. Open **https://colebur.github.io/deckforge-pwa-poc/** in iPhone Safari, including the trailing slash. Your Mac can be asleep or switched off; GitHub serves the app files.

Future source commits to `main` trigger the workflow automatically. It compiles TypeScript, runs all 18 tests, and publishes only `dist/`. Inspect **Actions → Build, test and publish PWA** for the green success result. The local POC repository preserves the original development checkpoints; the public repository currently has the browser-upload commit history. These are separate histories, so do not force-push one over the other. No Git command-line credentials were configured during browser publication.

The live app was checked for HTTPS, offline-cache readiness, a saved marker surviving reload, successful two-byte audio range responses, and no browser warnings/errors. Physical iPhone results remain pending. Do not move the live URL later without planning a deck export/restore path; browser data is scoped to its website origin, and multiple PWAs on the same origin require careful storage namespacing before wider distribution.

Official sources: [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages), [custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## 3. Install to the iPhone Home Screen

1. Open the HTTPS address in **Safari**, not an embedded browser inside another app.
2. Wait for **Ready · cached for offline use** at the bottom. Open Settings → Device Tests to see the same status. If it fails, stay online and reopen; do not proceed with the offline test.
3. Tap Safari's **Share** button. With some layouts, tap the Page Menu first, then Share.
4. Choose **Add to Home Screen**. If missing, scroll to Edit Actions and add it.
5. Keep **Open as Web App** enabled. Name it **Forge POC**, then tap **Add**. This separate label distinguishes the experiment from native DeckForge.
6. Launch **Forge POC from its Home Screen icon**, open Settings → Device Tests, and confirm **Standalone Home Screen app**. Wait for offline readiness here too; do not assume the Safari visit alone prepared the installed app's storage/cache.
7. Create a small test deck in this installed app. A Safari-tab library may be different from the installed app's library; test persistence inside the installed app itself.

[Apple's current iPhone installation instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

## 4. Test offline operation and persistence

1. In the installed app, create a deck, rename it, add/edit/delete a card, and bulk paste a short list with duplicates and numbered prefixes. Wait for the saved message.
2. Start a round once online to check sound. In Settings → Device Tests, tap **Save Test Marker** and write down/screenshot the exact marker. Tap **Check / Request Persistence** and note whether protection is granted.
3. Verify **Ready · cached for offline use**.
4. Enable **Airplane Mode**, then explicitly turn **Wi-Fi off** too. Airplane Mode can leave Wi-Fi enabled.
5. Swipe up to the app switcher and dismiss Forge POC. Relaunch it from its Home Screen icon. The screens, cards, marker and saved duration should remain.
6. Perform a lookup, Previous/Next/Random, add a new test card, and play a five-second round. Play the tone/loop offline too, and tap Check Audio Cache in Settings → Device Tests. It must return a successful two-byte HTTP 206 response while offline. Close and reopen again; the new card should still be there.
7. Restore connectivity. Repeat reopening the next day and after restarting your iPhone. Back up experimental decks with the Backups → Export Backup if keeping them.

The network badge is only a hint. A real offline cold launch, playable screens, and committed edits are the pass condition. Browser storage is not a permanent backup; deleting the app/site data, changing website address, private browsing or storage eviction can lose local decks.

## 5. Test motion/orientation — no full Heads Up game

1. From the **installed HTTPS app**, open **Settings → Device Tests → Enable Sensors** and tap **Allow** if iOS prompts. Permission requests happen directly from your tap; the app requests only motion/orientation, not camera/microphone/location.
2. Within five seconds, usable orientation/motion counts should increase and values should respond when the phone moves. Permission granted with zero or all-null readings is **not** a pass.
3. Hold it sideways in landscape-left, then landscape-right. Tip the screen toward the floor and ceiling at forehead height. Watch beta/gamma and acceleration x/y/z change smoothly.
4. Hold steady for 30 seconds. Note event rate and freshness: repeated multi-second gaps while visible, frozen readings or frequent permission failures are warning signs.
5. Stop Sensors: counts should stop. Enable again: new readings should arrive. Leave the app and return: sensors intentionally stop; tap Enable Sensors again. Fully close/reopen and retry permission. Repeat offline.
6. Use the manual record in `TEST-RESULTS.md` to note both landscape directions, stability, permission behavior and subjective response speed.

This only validates raw sensor access. It does not prove calibration, threshold detection or accidental-answer prevention. Those would need a later focused milestone if the raw readings pass.

## 6. Test audio, background behavior and vibration

- **Foreground:** turn Silent mode off and use a comfortable iPhone volume. In Settings → Device Tests, tap Play Soft Tone. It should be audible. Start Loop and listen through multiple loops; Stop Audio should stop it promptly. Repeat offline and after reopening.
- **Active round:** leave Timer sound enabled and start a 90-second round. Beeps should start about two seconds apart and accelerate until the final buzzer. Pause should stop cues; Resume should restart them. Test a five-second round too. The optional diagnostic loop is now under Device Tests → Audio.
- **Background:** in Settings → Device Tests, enable Keep the loop requested when hidden, start the loop, switch to another app for 30 seconds, then lock the phone for 30 seconds. Return and note what you actually heard. Repeat with the background option enabled during a round (the option remains in memory); the round intentionally pauses when hidden, but the loop remains requested for this probe. Stop Audio when finished. A player reporting playback requested or playing is not proof that iOS emitted audio.
- **Vibration:** tap Test Vibration. If the API is unavailable, record Unsupported. Do not treat a generic button/OS haptic as proof the app can program its own vibration.

These tests are the reason for this prototype. Foreground audio success does not establish background reliability. The background option defaults off. Sensors always stop when hidden. Timers/round progress are not implemented as a background service.

## Small, understandable folder structure

| File/folder | Purpose |
| --- | --- |
| `src/model.ts` | Deck/card definitions, paste cleanup, number validation and round rules. |
| `src/storage.ts` | Opens the browser's IndexedDB and saves/loads the library and duration. |
| `src/app.ts` | Draws the home menu, editors, games, backups and settings and connects taps/forms to the rules. User text is escaped before display. |
| `src/sensors.ts` | Requests sensor access and counts real readings; no tilt scoring. |
| `src/media.ts` | Handles cached audio byte ranges for Safari, without a network request. |
| `src/audio.ts` | Tap-started HTML audio and a short diagnostic event log. |
| `public/` | Page, styles, manifest, icon, and small offline sound files. |
| `scripts/build.mjs` | Copies assets and generates a versioned offline service worker. |
| `scripts/serve.mjs` | Serves built files locally; no data backend. |
| `scripts/dev.sh` | One command to build, test and run on this Mac. |
| `tests/model.test.mjs` | Nine automated rule checks, including 2,000 cards and late answers. |
| `dist/` | Generated website for hosting. Rebuild it; do not edit it directly. |
| `.github/workflows/pages.yml` | Optional GitHub Pages build/test/publication recipe. |
| `TEST-RESULTS.md` | Verified Mac results and your pending iPhone pass/fail sheet. |

Only TypeScript is a build dependency; there are no runtime framework dependencies. Browser IndexedDB stores this POC's library under `deckforge-pwa-poc`. It never opens or changes the native SwiftData database. Test with one app window; simultaneous editing in multiple windows is outside the POC scope.

## Updates and storage limitations

The worker precaches every required built file. Its version changes with file contents. Updates wait for old app windows to close so a round is never forcibly reloaded. After rebuilding/deploying, visit once online to download an update, close **all** windows/tabs for this PWA, then reopen. If needed, close and reopen again after the installed app reports a waiting update. Deck data lives in IndexedDB, separately from the app-file cache.

Home Screen PWAs do not use the free native development provisioning profile, so that seven-day signing deadline does not apply. WebKit also explicitly exempts Home Screen web-app domains from its ITP seven-day script-storage cap. That exemption is not a guarantee of permanent deck storage. IndexedDB/Cache storage can still be removed under storage pressure or by the user; persistent-storage requests may be declined. Keep backups for data that matters.

Sources: [WebKit tracking prevention](https://webkit.org/tracking-prevention/), [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/), [motion/orientation requirements](https://www.w3.org/TR/orientation-event/), [service-worker HTTPS requirements](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [WebKit audio-background history](https://bugs.webkit.org/show_bug.cgi?id=198277).

Cole reports that the original iPhone trial passed persistence, offline use, both game modes, landscape, raw sensors and foreground loop audio. The new 0.2 backup-sharing and accelerating cues still need an iPhone trial. The migration decision remains pending. Do not migrate the native app until Cole explicitly approves after evaluating these results.

## Version 0.2 — backups and a simpler interface

Home now contains Catchphrase, Numbered Lookup, Manage Decks and Backups. Technical probes are tucked under Settings → Device Tests. Editor forms open only when requested. The play screen shows the large word, answer buttons and quiet pause/end controls.

Backups → Export Backup offers the iPhone share sheet when available; choose Save to Files and keep a copy outside the app. A download fallback and Copy backup text are available. Choose Backup File previews the whole file before any data changes. Add deck copies is the default and preserves existing decks. Replace library is explicit and first saves a local restore point. Review Restore Point can undo a replacement or recent destructive edit, but that point lives in the same browser storage: it cannot rescue data after all site storage is cleared.

Versioned backups validate before writing, retain duplicates and exact card order, and support original POC exports. Native DeckForge JSON backup files can also be read as copies; this never opens or changes the native app. Files are limited to 20 MB. Unknown future data versions stop with an error rather than resetting the library. Existing database name, store and keys are preserved across this update.

Settings shows storage protection and installed version 0.2.0. Protection is best effort; exported files remain essential. To update, open online, tap Check for Update, wait for Update ready, close every window/tab for this PWA, then reopen. Do not delete the Home Screen app or clear website data to update.

`src/backup.ts` validates and copies backup data; `src/cues.ts` schedules the native timer rhythm; `tests/backup.test.mjs` covers restore formats, safety, 2,000 cards and cue timing.
