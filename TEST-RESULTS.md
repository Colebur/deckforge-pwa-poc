# DeckForge PWA feasibility results

## Verified on the Mac browser

- TypeScript strict build succeeds.
- Nine automated rule/media tests pass: paste cleanup/Unicode/duplicates, lookup bounds, 2,000-card shuffle integrity, round deck snapshot/use-before-refill, pause/resume and late answers, pass/refill behavior, invalid/empty inputs and single-card decks, Safari byte ranges, and invalid-range handling.
- Browser screen checks: create/rename deck, add/edit/delete test card, bulk import five cards, preserve duplicate Beyoncé and `-5 degrees`, fixed lookup, Previous/Next/Random, Got It +1 / Pass +0, pause/resume.
- Responsive preview: 430 × 932 portrait and 932 × 430 landscape. Landscape has no horizontal overflow; game controls are at least 48 pixels high. This is a viewport test, not physical safe-area verification.
- Server-stopped check: reload rendered the cached app, kept the renamed five-card deck and exact persistence marker, and completed a five-second round. Mac network hint still said Online because the internet connection itself remained active; the static server was confirmed stopped.
- No browser error/warning logs were present at that offline-round check.

## Required iPhone trial — not yet verified

Device: iPhone 15 Pro Max / iOS 27.0
URL: __________________________
Date: __________________________
Installed from Home Screen: __________________________

| Criterion | Pass / Fail / Unsupported | Notes |
| --- | --- | --- |
| Launches standalone from Home Screen without Safari chrome | Pending | |
| Initial offline cache says Ready | Pending | |
| Airplane Mode + Wi-Fi off, dismiss app, cold launch succeeds | Pending | |
| Original deck/card order, duplicates, edits and test marker survive reopening | Pending | |
| New offline edits survive a second reopening | Pending | |
| Duration survives reopening | Pending | |
| CRUD/bulk paste/lookup feel comfortable on the actual screen | Pending | |
| Got It / Pass / pause / expiry give correct round results | Pending | |
| Portrait and both landscape directions are readable/tappable | Pending | |
| Sensor permission allowed and actual usable readings arrive | Pending | |
| Sensor values respond smoothly both landscape directions / up and down | Pending | |
| No repeated multi-second sensor gaps during 30 seconds of foreground use | Pending | |
| Stop/restart, app return, cold reopen, offline sensors work | Pending | |
| Tap-started tone audible, including offline | Pending | |
| Loop audible through multiple cycles and during active round | Pending | |
| Pause/Resume and expiry sound behave acceptably | Pending | |
| Background/app-switch/lock audio continues or can resume acceptably | Pending | |
| Custom vibration supported and actually felt | Pending | Optional; unsupported does not block core games |
| Storage persistence request result recorded | Pending | Best-effort storage requires a backup plan |
| Decks survive next-day reopening and phone restart | Pending | |

## Decision rule

Proceed to discussing a migration only if standalone/offline launch, local persistence, deck editing, lookup, timed gameplay, foreground audio, and raw sensor access pass on the iPhone. If sensor support fails, do not commit to the future Heads Up experience yet. If reliable locked-screen/background audio is essential and fails, keep native or reconsider that requirement. Vibration may be an accepted compromise. Repeat the storage checks over more than one day; one successful reload is insufficient evidence of long-term reliability.

The POC does not prove finished tilt recognition, multi-team gameplay, full backup restore, all sound combinations, or upgrade/data-migration behavior. Those remain future milestones, not silently included migration work.

## Pause checkpoint

Cole paused before leaving for work. The final source compiles and all seven rule tests pass. The updated shared audio-cue implementation and GitHub-style subfolder server still need their final browser checks. No temporary HTTPS tunnel or GitHub site was created; iPhone installation and physical tests remain pending. Local test servers were stopped for the pause. Resume with `./scripts/dev.sh`.

## Resumed verification

- Strict compilation and all nine tests passed on resume.
- The latest app loaded under a GitHub-style `/deckforge-pwa-poc/` path and reloaded after stopping that test server. Its saved deck and five-second duration persisted.
- The updated cue player accepted tone/loop requests and the five-second round completed without browser errors. Physical audibility and iOS interruptions remain unverified.
- Added explicit media byte-range responses for Safari and a Check Audio Cache button. With the local server stopped, the latest module service worker served the cached app and returned HTTP 206 with exactly two requested audio bytes.
- Cole authorized creating a separate public GitHub Pages repository, then signed into GitHub. Repository `Colebur/deckforge-pwa-poc` was created through the browser. Publication is being configured.
