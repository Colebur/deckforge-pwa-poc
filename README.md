# DeckForge PWA Lab — isolated proof of concept

This experiment answers whether the important DeckForge experience is practical as a Home Screen web app on Cole's iPhone 15 Pro Max / iOS 27. It is **not a full migration**. The native sibling folder `../DeckForge`, its Xcode project, Git repository, decks, and bundle identifier are untouched.

This folder is its own Git repository, independent of the native app. The separate public PWA repository is https://github.com/Colebur/deckforge-pwa-poc. The tested PWA is live at **https://colebur.github.io/deckforge-pwa-poc/**. Native DeckForge is not uploaded.

## What you can try

- Create, rename and delete decks; add, edit and delete cards.
- Bulk paste: every non-empty line becomes a card. Simple `1. `, `2) `, `- `, `* ` and `•` prefixes are removed. Duplicates stay; negative numbers and decimals are preserved.
- Numbered Lookup: fixed deck-order numbers, Previous / Next / Random. Repeated random picks are allowed; Previous/Next stop at the ends.
- Catchphrase: saved 2–8 named teams, Random (30–90 seconds) or fixed 15-second increments, Next Card, pause/resume, one team point awarded after expiry and a match scoreboard.
- Headbands: stable sideways calibration, tilt down Correct / up Pass, manual controls, native feedback clips and results. Each card is used once; finishing the deck ends the round.

- IndexedDB local persistence. Writes report success only after the transaction completes. Editor card lists show 50 at a time so large decks do not create thousands of screen controls.
- Manifest, standalone launch, icon, safe areas, dark mode, 48-pixel controls, and an offline service worker. No external fonts, scripts or media are needed at runtime.
- Settings → Device Tests: real motion/orientation permission requests and live values, vibration feature detection, soft tone, looping audio, background-audio probe, saved persistence marker, persistent-storage request, and versioned JSON backups and validated restore.

Not implemented: automatic native-deck migration, cloud sync, animations or a background-running game. Catchphrase uses copies of the native beep and buzzer, with a smooth revised curve: roughly two seconds apart initially, approaching 0.18 seconds in the urgent ending. The arpeggio loop remains only as a diagnostic.

## 1. Run locally on this Mac

1. Open **Terminal** (Command–Space, type Terminal, Return).
2. Replace `/path/to/DeckForge-PWA` with the folder where you saved this project, then run:

```sh
cd /path/to/DeckForge-PWA
sh scripts/dev.sh
```

The helper finds the Node runtime already bundled with Codex on this Mac, installs the one build dependency if needed, compiles TypeScript, runs the 32 rule/media/backup/game/audio tests, and serves the built app. First dependency installation requires internet. Subsequent builds need no internet if the dependency is already present.

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

Future source commits to `main` trigger the workflow automatically. It compiles TypeScript, runs all 32 tests, and publishes only `dist/`. Inspect **Actions → Build, test and publish PWA** for the green success result. The local POC repository preserves the original development checkpoints; the public repository currently has the browser-upload commit history. These are separate histories, so do not force-push one over the other. No Git command-line credentials were configured during browser publication.

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

Settings shows storage protection and installed version 0.4.0. Protection is best effort; exported files remain essential. To update, open online, tap Check for Update, wait for Update ready, close every window/tab for this PWA, then reopen. Do not delete the Home Screen app or clear website data to update.

`src/backup.ts` validates and copies backup data; `src/cues.ts` schedules the native timer rhythm; `tests/backup.test.mjs` covers restore formats, safety, 2,000 cards and cue timing.

## Version 0.3 — native game rules

Catchphrase now uses 2–8 saved, unique team names. Random (30–90 seconds) is the initial setting; fixed choices run from 15 to 300 seconds in 15-second steps. Random is chosen afresh every round. Give clues, tap Next Card and pass between teams. After expiry, choose one team for one point or No point. A round cannot score twice or start again before that decision. The shuffled deck continues across rounds. Scores last for the current game; team names and timer preferences survive reopening. Original POC libraries keep their decks, IDs, order and marker.

Game audio uses a tap-unlocked Web Audio clock, rather than repeated HTML play requests from UI ticks. The smooth curve begins near two seconds, reaches rapid roughly 0.18-second beeps near the end, and schedules a firmer two-tone square-wave buzzer at the exact audio deadline. Pause cancels scheduled cues, Resume replans the remaining time, and an interruption pauses play. The diagnostic loop remains in Device Tests only. The loop is optional and not part of the countdown. Foreground iPhone audibility and perceived urgency still need physical testing.

Headbands uses its own saved timer (60 seconds initially, with Random and the same fixed choices). With Tilt controls enabled, Start requests motion permission directly from the tap, then waits for a stable sideways forehead hold before starting the clock. Tilt down for Correct, up for Pass, then return to neutral. It uses both landscape directions, stable calibration, a held-angle threshold and a return-to-neutral delay to avoid repeated answers. Browser acceleration is converted to the native gravity convention. Shaking, stale samples, upright positioning or changing landscape direction requires recalibration. Pause/resume requires a fresh hold. Use Buttons is always available when motion is unavailable; switching off Tilt controls starts directly.

Each Headbands card appears once per round; finishing the deck ends the round. Results include Correct, Passed and Unanswered. Accepted answers play copies of the native cheerful correct/pass clips. The last accepted answer keeps its feedback even when the deck finishes. Late answers cannot score or play a correct cue. The app requests screen wake lock when available; if unavailable, the phone's Auto-Lock setting still applies. Leaving the app pauses play and stops motion.

Backups/state are now version 2, including teams and the separate Headbands timer. Version 1 exports and existing storage remain readable. Older app versions should be updated before using new-format data. Do not clear website data to update.

Important files: `src/games.ts` contains team/timer/result rules; `src/tilt.ts` contains tilt detection; `src/game-audio.ts` schedules sound; `src/app.ts` connects the screens; `tests/games.test.mjs` and `tests/audio.test.mjs` check rules, sensor sequences and output scheduling. No native file is edited.

References: [Web Audio resume](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume), [audio interruption states](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state), [device motion coordinate conventions](https://www.w3.org/TR/orientation-event/).

## Version 0.3.1 — gentler tilt controls

The answer threshold is 25° from the calibrated position (previously 35°), with an 80 ms deliberate hold (previously 120 ms). Returning to the 12° neutral zone rearms after 180 ms (previously 250 ms). One held tilt still scores once. Cole reports the 0.3 teams, timer and tilt controls work on iPhone; this adjustment needs a new physical trial for feel and accidental answers.

## Version 0.3.2 — centered game prompts

Active game prompts sit in the center of the play area, with the main answers and smaller Pause/End buttons together at the bottom. Tilt-enabled Headbands hides Correct/Pass and enlarges the prompt. Switching off Tilt controls or choosing Use Buttons during calibration restores both manual answers. Calibration and round results keep their existing layouts.

## Version 0.4.0 — Prompt Picker

Choose one non-empty deck or All Decks, then draw a prompt for charades, Pictionary or 20 Questions. Draw Again chooses a fresh random card, Decks returns to selection, and Home exits. Every card position across all decks has equal probability; bigger decks contribute proportionally more cards. Duplicate text remains separate cards, and independent draws may repeat. The source deck is shown above the large centered word. Works offline with existing local decks and backups; no timer, scoring or storage-format change.

## Taboo (0.5.0)
Taboo has a separate collection: Home → Taboo → Manage Taboo Decks. Regular decks and All Decks draws are unchanged. Each Taboo card stores an answer and five forbidden words. Paste one card per line: `Astronaut | Space | NASA | Rocket | Moon | Helmet`. Invalid lines stop the entire import before saving.

Teams take turns. Correct adds 1, Pass adds 0, and Taboo subtracts 1. Scores may be negative. Another player judges forbidden words; there is no microphone monitoring. Cards appear once per round and reshuffle next round. Random and fixed timers, pause, audio and offline play use the existing app behavior. Team scores reset when leaving the game; team names and timer settings remain saved.

Backups now use format version 3 and include both separate collections. Versions 1 and 2 and native exports remain readable. A single-deck export includes only that deck. After installing this update, use this version for new mixed backups.

Check on iPhone: create and reopen a Taboo deck, play in portrait and landscape, confirm Correct/Pass/Taboo scoring, pause/resume, team rotation, final buzzer, and offline operation. Export and restore copies to confirm both collections stay separate.

## Activities (0.6.0)
The project direction is recorded in [PROJECT_CONSTITUTION.md](PROJECT_CONSTITUTION.md). The PWA remains canonical; the native app is preserved separately. No roadmap modes, backend or Capacitor integration were added.

Regular decks now have `activities: Activity[]`, where an Activity is `{id, text, createdAt}`. List position supplies order; timestamps are ISO strings. Old decks load with an empty list while IDs, cards and settings stay intact. IndexedDB's database/store/key remain unchanged. State and export format are now version 4; versions 1–3, original POC exports and native exports remain readable. Newer unknown formats fail safely. Add-copy restore regenerates Activity IDs while keeping text, dates and order. Restore and single-deck exports include Activities.

Manage Decks → a regular deck → Activities supports add/edit/delete, up/down ordering, and bulk paste (one template per non-empty line, using the existing prefix cleanup). Card ordering now uses the same small controls. Ordering is disabled during editing to preserve unsaved text; save/cancel first. Activity deletion asks for a second in-app confirmation and saves a local restore point.

Numbered Lookup defaults to None on entry or deck change. Decks without Activities hide the Activity controls. Choose Fixed, Random or Cycle before showing a card; settings can also be changed while viewing one. Show, Previous, Next and Random each count as a selection, even if the same card is selected again. Random excludes the previous Activity when alternatives exist; a single Activity remains usable and has no reroll button. Cycle follows order and wraps. Reroll changes the instruction only. Changing mode starts a fresh Activity sequence for the current card. Leaving Lookup or reloading resets the session to None.

`src/activities.ts` is a platform-neutral helper, with no storage, DOM, sensor or audio dependency. Its session snapshots templates; `renderActivity` substitutes exact `{card}` occurrences using a callback so replacement characters in card text stay literal. Unknown placeholders remain untouched. The app escapes the final result for safe plain-text display. Existing storage/audio/motion modules were reused; future Capacitor adapters do not require rewriting Activity logic.

### iPhone acceptance checks
1. Online, Settings → Check for Update. Close all DeckForge windows and reopen. Confirm 0.6.0. Keep a backup first.
2. Open an older deck. Confirm its cards and other games still work; Lookup should show no Activity controls.
3. Create “Feelings” with cards Frustrated, Happy, Proud. In Activities bulk paste:
   - `I feel {card} when...`
   - `Show {card} with your face.`
   - `Draw {card} and describe {card} to {player}.`
4. Edit one Activity, add another, delete it with confirmation, move the third up/down. Close/reopen and confirm the list/template/order remain. In Cards, edit and reorder a card; confirm Lookup numbers follow the saved order.
5. Lookup → Feelings → Fixed → first Activity → Show 1, Next, Previous, Random. The instruction changes the card text but keeps its template.
6. Choose Random, Show a card several times and reroll. With three Activities, instructions should not repeat immediately. Reroll must keep both the card and its number.
7. Choose Cycle; select four times and confirm 1, 2, 3, 1 in the current saved Activity order. The repeated placeholder should substitute twice and `{player}` should remain visible.
8. Choose None and confirm the instruction disappears. Switch decks or return Home/reenter and confirm None is the default. Try portrait/landscape; card text should remain dominant and controls reachable.
9. Export a backup to Files, restore as Add copies, and check both cards and Activities in the imported deck. Existing decks and Taboo decks must remain intact. Optional Replace should be tested only after saving a separate backup.
10. Once Settings reports offline-ready, enable Airplane Mode and turn Wi-Fi off. Fully close/reopen from the Home Screen. Repeat Lookup/Activities editing and play Catchphrase, Headbands, Prompt Picker and Taboo. Verify timer/audio/tilt on the actual phone.

Possible later cleanup (requires approval): move screen rendering/event handlers from the growing `app.ts` into small modules, then define platform-service interfaces only when a real second implementation needs them. This release deliberately keeps the existing architecture.

## Library, Lookup and Headbands polish (0.7.0)
- Swipe a regular or Taboo library row left to reveal Delete; swiping never deletes. Swipe right to close it. Tap the red button to delete; a local restore point is saved in Backups. Existing in-editor delete options remain available for keyboard users.
- A muted pencil beside Settings opens Rename while inside a regular or Taboo deck (including from its Activities tab).
- Libraries and all game deck dropdowns display alphabetical, case-insensitive, natural-number sorting. Stored deck order and card numbering are unchanged.
- Landscape Lookup hides setup, number entry and the header while keeping the current card/Activity, number and navigation controls. Portrait restores the same selections. Rotate back to enter a specific number or change settings.
- An Activity is one large sentence: template portions are italic and regular weight; each `{card}` portion is bold. Unknown placeholders remain literal. A template without `{card}` displays its instruction and the card below it, so the card is never lost.
- Tilt Headbands now waits for landscape, then recognizes placement motion (gravity change or a relative heading flip) and a steady sideways pose. Motion cannot prove forehead contact. “I’m at My Forehead” confirms placement if automatic detection misses it; valid steady motion readings are still required. Three soft tones accompany 3, 2, 1 when Timer sound is enabled. The round timer starts after placement, with a baseline captured from that actual pose. Moving or losing readings during countdown cancels it. During gameplay, a lost baseline pauses the round and Resume repeats calibration, rather than silently adopting a new baseline. Gentle 25-degree gestures, return-to-neutral debounce, manual buttons, timer and answer feedback remain.

Phone checks: swipe left without tapping and verify the deck remains; tap Delete on a disposable deck and review its restore point; rename using the pencil; check alphabetical lists in all modes; rotate Lookup back and forth with a selected Activity; start Headbands in portrait, rotate, raise/flip to forehead and hold through 3/2/1. Check both landscape directions, Correct/Pass, neutral return, pause/resume recalibration and offline use. Actual sensor placement detection needs physical-phone confirmation; browser checks cover guidance and the button fallback, while synthetic tests cover placement transitions, countdown cancellation, baseline capture and both tilt directions.

## Navigation and Headbands refinement (0.7.1)
The header Back arrow returns regular deck editors to Deck Library and Taboo editors to Taboo Decks. Headbands preparation uses three short 1320 Hz triangle chimes, distinct from the regular gameplay tick. Active tilt detection tolerates diagonal sideways lean while keeping the 25-degree elevation threshold, 80 ms hold and neutral-return debounce. Invalid/stale motion or changing to the opposite landscape direction still requires recalibration. Calibration itself still asks for a steady landscape forehead pose.
Phone checks: open/edit a deck, then use the top-left arrow and confirm its library appears; try Taboo too. Start Headbands with Timer Sound enabled and compare the three chimes with gameplay ticks. In both landscape directions, tilt down-left/down-right for Correct and up-left/up-right for Pass, returning to neutral after each. Sideways lean alone must not answer. Repeat offline.

## Play / Work / Decks (0.8.0)

The default screen is Play. A safe-area-aware bottom bar links Play, Work and Decks. Play keeps the existing four recreational modes; Work uses the same catalog and game engines with Numbered Lookup / Jenga first. Decks opens the existing alphabetical regular library, with card/Activity counts and context. Taboo Decks and Backups are secondary tools there. The bar remains available on setup, editing, settings and result screens; active games and landscape Lookup preserve their immersive presentation. Rotate Lookup back to portrait to reach navigation/setup. The Back arrow from an editor returns to its library; game setup returns to its launch section. Reopening starts on Play.

### Organization and migration
`Deck` and `TabooDeck` extend `DeckMetadata`: `deckContext: 'play' | 'work' | 'both'` and `compatibleModes: string[]`. Regular editor → Deck organization exposes Best suited for and Available in with an explicit Save Organization button. It is also available from Activities. Taboo has the same context control, but its format-specific checklist contains only Taboo. Regular cards lack the five forbidden words required by Taboo; Show All is an escape from user assignments, not from structural card requirements.

`src/modes.ts` defines the five actual current IDs (`lookup`, `catchphrase`, `headbands`, `prompts`, `taboo`), titles, descriptions, icons and card formats. It supplies browser-independent metadata validation and picker ranking. Compatibility describes intent, separately from card structure. Unknown future mode IDs are retained through organization edits/export rather than dropped; no future modes are implemented.

Missing context becomes Both. Missing compatibility becomes all four supported regular modes or Taboo for Taboo cards. An explicit empty list stays empty. This normalization happens in memory on load; a normal edit persists it through the existing atomic IndexedDB save. Database name, store, keys and database version are unchanged. No deck/card/Activity IDs, order, text or timer/team settings are changed by normalization. State and backups now use format version 5; raw POC, versions 1–4 and native exports remain readable. Older app versions correctly refuse version-5 data instead of overwriting it. New backups should be opened with this release or newer.

### Selection behavior
Play and Work pass a launch context into setup only. Existing round/session engines are unchanged. The default picker shows non-empty compatible decks, ordered launch context → Both → opposite context, alphabetically within each group. Optgroups label recommendations clearly. Show All Decks appends the unassigned/non-compatible decks in another group, ranked the same way. Hiding that group clears an incompatible selection rather than accidentally starting it invisibly. If there are no compatible decks, Show All remains available when another non-empty deck exists. Empty decks remain editable in Decks and need cards before gameplay.

Prompt Picker applies the same rules to both a single deck and its combined pool. “Compatible Decks” draws equally across every card in the filtered pool. Show All changes that pool to every non-empty regular deck and labels it “All Decks.” Every new mode launch resets this expansion and chooses its first recommendation; starting/pausing/continuing a round does not change its cards.

The new catalog/ranking helpers have no browser dependencies and can be reused in a later Capacitor package. Storage, sound and motion services and the generated offline worker keep their existing architecture. No new dependencies, backend, accounts, tracking or engines were added.

### iPhone acceptance checks
1. First export a backup from Decks → Backups to Files. Update online via Settings → Check for Update, close every DeckForge app/Safari window, reopen, and verify 0.8.0. Do not clear website data or uninstall to update.
2. Confirm it opens to Play with Catchphrase, Headbands, Prompt Picker and Taboo, without Lookup. Tap Work: Lookup must be first, followed by those same four modes. Tap Decks: all your regular decks should appear with unchanged card/Activity counts, and Taboo Decks/Backups should be accessible below.
3. Create three disposable decks called Test Play, Test Work and Test Both. Bulk paste three cards into each. Open Deck organization and save the matching Best suited for value. Check Catchphrase for all three; uncheck Headbands on Test Work. Reload/reopen and verify saved controls and all cards persist.
4. Launch Catchphrase from Play. Its picker must rank Test Play before Test Both before Test Work (other decks can appear within their groups alphabetically). Launch it from Work: Test Work comes before Test Both before Test Play. Context never removes an opposite-context compatible deck.
5. Launch Headbands: Test Work must be absent normally. Tap Show All Decks, select it and play with buttons/tilts. In Decks uncheck every Available in box for Test Work and save. It must stay in Decks and be selectable through Show All in regular modes. Hide Other decks again and verify it cannot remain invisibly selected.
6. In Test Work → Activities paste `I feel {card} when...`, `Show {card}.`, `Draw {card} and {card} to {player}.`; edit, reorder, delete a disposable Activity and reopen. In Work → Lookup select it through Show All. Verify None, Fixed across Next, Random without immediate repeats, reroll without changing the card number, and Cycle wrapping in saved order. Multiple placeholders become bold card text; `{player}` remains literal. Rotate landscape and back to check layout/state.
7. Rename with the pencil, edit a card, reorder cards and verify Lookup numbers follow that order. Swipe-delete a disposable deck and confirm the red button is required. Check Backups → Local recovery. Do not restore Replace over your real library without a separate exported file.
8. Test Catchphrase teams/timer/score, Headbands placement/chimes/diagonal tilt, Taboo teams/forbidden words/score, and Prompt Picker single/combined pools. In Prompt Picker, Test Work appears only after Show All if Prompt Picker is unchecked. The bottom bar hides during active games and returns after finishing.
9. Export a backup and restore as Add copies. Copies must retain context, compatibility, Activities and exact card order. Existing decks must remain. New backup format is 5.
10. Once Settings says cached for offline use, enable Airplane Mode and turn Wi-Fi off. Fully close/reopen the Home Screen app. Check all three tabs, organization edits, selection and an offline round. Actual Home Screen safe-area behavior, audio and sensors require a physical-device check; desktop viewport checks do not prove those.

Follow-up candidates requiring approval: searchable library/pickers when real library size warrants it; extract individual screen modules from app.ts; update GitHub Actions dependencies. These are not part of this release.

## Jenga, multi-deck Prompt Picker and section accents (0.9.0)

Work begins with **Jenga**, then **Prompt Picker**. Both are Work tools; Play retains Catchphrase, Headbands and Taboo. Shared games keep their launch section for sorting and accent color. Decks uses its own purple, regardless of a deck's context.

Jenga reuses the numbered lookup route (`lookup` internally), ActivitySession and styled template display. It requires **exactly 54 cards**, even with Show All. Cards retain their stored order as block numbers 1–54. The compatibility checkbox is disabled and explains the requirement at other sizes. A previously assigned deck that changes size keeps its intent saved, but becomes unusable in Jenga until it returns to 54. No cards are deleted or truncated. Other tools accept arbitrary non-empty deck sizes.

Version-5 and older data removes only `lookup` assignments on decks with other than 54 cards. Valid 54-card assignments, Prompt Picker assignments, context, IDs, card order, Activities and settings remain intact. Missing metadata gets supported defaults, with Jenga omitted for non-54 decks. State/export format is now **6**; formats 1–5 and native backups remain readable. Existing database/store/key and atomic save/recovery are unchanged. Older releases refuse version 6 instead of overwriting it. New empty decks begin unassigned to Jenga.

Prompt Picker uses searchable, scrollable checkboxes with Select Compatible and Clear. Show All exposes unassigned decks; explicitly select those you want. Hiding Show All removes hidden decks from the session selection. Selection is session-only, initially all compatible decks, and never creates a merged deck. Empty decks cannot be drawn from. Setup changes start a fresh session.

`src/prompt-session.ts` snapshots selected decks, randomly chooses a deck with equal probability, then chooses a card within it. Large decks do not dominate. The immediately previous card is excluded when selecting the same multi-card deck again. A singleton may repeat when its deck is selected again; changing deck probabilities to prevent that would compromise equal-deck balancing. Duplicate text on separate cards may also recur. This is not an exhaustive shuffle/history system.

Each source deck has its own ActivitySession. None shows only the card; Fixed chooses one Activity **per selected deck**; Random avoids repeating that deck's last Activity where possible; Cycle advances and wraps independently for each deck. Reroll keeps the card/source unchanged. A source with zero Activities always shows the card alone. The shared card display safely escapes text and uses the existing `{card}` part renderer: repeated occurrences work, unknown placeholders remain literal, instructions use italic regular weight and inserted card text uses bold. Stored templates never change.

The centralized CSS tokens `--play-accent`, `--work-accent`, `--decks-accent` and matching soft colors have light/dark variants. A `data-context` attribute on body selects red/blue/purple. Primary buttons, icons, highlights, focus outlines and selected controls inherit these tokens. Tab labels, icons, headings, aria-current and an active underline convey context without color alone. Core deck/session helpers remain browser-independent; no new dependencies or backend were added.

### iPhone checks for 0.9.0
1. Export a backup. Online, Settings → Check for Update; close all DeckForge windows and reopen. Verify 0.9.0 and cached offline status. Do not clear site data or reinstall.
2. Check Play has red accents and Catchphrase/Headbands/Taboo. Work is blue, with Jenga first and Prompt Picker second. Decks is purple in light and dark appearance. Launch Catchphrase from Play and Work and confirm its buttons retain the respective accent.
3. In Decks create a test deck, bulk paste 54 lines, and assign Jenga under Deck organization. At 53 or 55 cards, verify the disabled control/explanation and absence from Jenga even after Show All. Return to 54 and verify an existing assignment becomes playable again. Check that no content vanished.
4. In Jenga enter 1, 27 and 54; compare the stored card order. Reject 0, 55 and non-numbers. Test Previous/Next/Random, all Activity modes, reroll, repeated `{card}` and unknown placeholders, portrait and landscape.
5. Make two Prompt Picker decks of different sizes, each with three distinct Activities. Select one, then both; try search, Select Compatible, Clear and Show All. Clear must disable Draw. There must be no number entry. Draw repeatedly and confirm both source names appear, rather than only the larger deck.
6. In Prompt Picker try None, Fixed (choose one per deck), Random and Cycle. Each card must use only its source deck's Activity; cycles should advance independently. Reroll must change only the Activity where alternatives exist. Try a deck with no Activities.
7. Check rename/edit/reorder/import/Activities still save and survive closing/reopening. Export format-6 backup and restore with Add copies; verify metadata and order. Do not Replace your real library for a test.
8. Once cached, switch Airplane Mode on and Wi-Fi off, fully close/reopen, then test the tabs, Jenga and a multi-deck draw. Confirm the standalone safe areas and long Activity prompts remain readable in both orientations. Test Catchphrase/Headbands/Taboo normally, including sound and tilt on the physical phone.

Files changed: src/modes.ts, src/backup.ts, src/app.ts, new src/prompt-session.ts, public/style.css, package.json, this README, tests/activities.test.mjs, tests/backup.test.mjs, tests/games.test.mjs, tests/navigation.test.mjs, tests/taboo.test.mjs and new tests/prompt-session.test.mjs. Production build caches the new session module. No native app files changed.


## 0.10.0 — Library, backups and accessibility

The universal Deck Library and separate Taboo library now have name search, exact Play/Work/Both context filters, intended-mode filters, Unassigned, a result count, and Clear Search & Filters. Filters combine, keep alphabetical ordering, and never change stored content or game pickers. They remain during navigation in the current app window and reset when reopening. The library mode filter shows declared assignments; a dormant Jenga assignment can appear here while the game's 54-card gate still prevents playing it.

Backups shows the last full-library export request and the last backup **you confirm saving**. Browsers cannot prove a download was retained in Files, so these are separate. Individual-deck exports do not count as full-library backups. Monthly reminders are opt-in and appear in Decks only while using the app; the first reminder is 30 days after enabling, subsequent reminders are 30 days after the last confirmed backup. Snooze lasts seven days. No push notifications, background scheduling, upload, account or backend is involved. Text backups can also be confirmed after saving them yourself.

Import still defaults to Add copies. Its preview now includes cards, Activities, context and mode assignments, plus matching-name information separated by regular/Taboo format. Replacement shows the current library summary and requires an explicit acknowledgment; the action also checks this guard. Existing atomic restore points are preserved.

Settings includes Larger text and keyboard help. Browser zoom remains allowed. Layouts wrap controls and long text, visible focus survives screen updates, a skip link reaches the main content, and reduced-motion preference disables CSS transitions and scripted smooth editor scrolling. The deck-row ellipsis reveals the same recoverable Delete action as swiping; Escape hides it. It never auto-deletes. Focus rings remain visible inside clipped lists.

Keyboard shortcuts are contextual and only invoke existing visible, enabled controls. They ignore text fields, buttons, menus, editable content, modifiers and held-key repeats. Jenga: Left/Right, R. Prompt presentation: Space to draw. Timed games: Space to pause/resume; Catchphrase Right; Headbands with buttons Down/Up; Taboo Right/Left/V. They never start timed rounds, end rounds or bypass hidden tilt-only buttons.

Preferences live under a separate `preferences` key in the existing IndexedDB state store; no database version or library/backup-format change is required. Missing/malformed preferences have safe defaults. Preferences are device-local and deliberately excluded from deck backups (a restored library must not falsely claim a recent backup confirmation). Core filter/reminder/shortcut helpers in `src/refinements.ts` have no browser dependencies. Storage continues behind the existing storage module; no speculative Capacitor abstraction or unrelated game refactor was added.

Changed files: `src/app.ts`, new `src/refinements.ts`, `src/storage.ts`, `public/index.html`, `public/style.css`, `package.json`, `README.md`, new `tests/refinements.test.mjs`.

### iPhone acceptance checks
1. Export a backup before updating. Settings → Check for Update; wait, close every DeckForge window, reopen and verify **0.10.0** and Ready/cached offline.
2. Decks → search part of a deck name; combine Context and Available in. Check the result count, alphabetical order and empty-result explanation. Clear restores all decks. Try the separate Taboo library too. Both is an exact metadata category, not an inclusion of Play/Work.
3. Open a filtered deck, edit a card/Activity and return. Confirm the filter remains and saved data still works. Try Jenga, Prompt Picker, Catchphrase, Headbands and Taboo normally; picker compatibility is unchanged.
4. Backups → export the full library, save to Files, then tap I Saved a Full-Library Backup. Confirm the requested and confirmed dates appear. Enable monthly reminders and reopen to verify the switch/date persist. Reminder threshold and snooze have automated clock tests; you need not wait a month to test them.
5. Choose a backup and expand Preview decks. Confirm counts/Activities/context/modes. Add copies is default. Switch to Replace: it must be disabled until the acknowledgment is checked. Cancel rather than replacing your real library for a test. Add copies can be used if you want an import round-trip; delete test copies afterward using local recovery if needed.
6. Settings → Larger text. Reopen and confirm it stays enabled. Inspect library, editor, long Activities, game setup/presentation and backup screens in portrait/landscape and light/dark appearance. Browser text zoom should remain usable. Turn on VoiceOver and check labels, reading order, result counts and prompt announcements; physical assistive-technology behavior still needs your acceptance.
7. Tap a deck’s ellipsis: Delete appears but nothing is deleted until you tap it. With a keyboard, Tab/Enter work, Escape dismisses Delete, the skip link reaches content, and game shortcuts work from main content. Shortcuts must not alter a game while typing.
8. After offline cache is Ready, enable Airplane Mode and turn Wi-Fi off, fully close/reopen and repeat search, editing, backups and gameplay. Verify local preferences and deck content remain. No native iOS files were changed.
