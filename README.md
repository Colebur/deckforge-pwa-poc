# DeckForge

A local-first deck toolkit for party games, group activities and facilitation. Create content once and reuse it across games. Custom decks remain a core feature, with no accounts, analytics, ads or backend.

## Navigation and games

- **Play:** Catchphrase, Headbands and Taboo.
- **Work:** Jenga and Prompt Picker first, followed by the same party game engines.
- **Decks:** one regular deck library, with a separate secondary library for Taboo cards.

Regular decks contain ordered cards and Activities. Context (`play`, `work`, `both`) recommends decks without restricting access. Intended game compatibility organizes pickers; Show All Decks offers an escape hatch when the card format and size fit the game. Jenga requires exactly 54 cards in block-number order.

Catchphrase supports saved teams, Random (30–90 seconds) or fixed timers in 15-second increments, hidden countdown, accelerating ticks and an end buzzer. Headbands supports manual answers or permission-based motion controls with guided landscape placement, a distinct three-second preparation chime and calibrated tilts. Taboo uses an answer plus five forbidden words and team scoring. Prompt Picker supports a session-only selection of multiple decks, choosing a deck uniformly before a card.

## Deck editing

Create, rename, delete, reorder, edit or bulk-paste cards and Activities. Each non-empty line becomes an item; simple numbered/bulleted prefixes are stripped. Taboo lines use `Answer | forbidden 1 | forbidden 2 | forbidden 3 | forbidden 4 | forbidden 5`.

Bulk paste now requires **Review Import → Confirm Import**. Review shows cleaned text and duplicate counts. Duplicates remain unless **Skip duplicates** is checked. Editing the pasted list invalidates the review. Taboo validates every line before saving anything.

**Deck options → Duplicate Deck** creates an independent copy with fresh IDs and preserves content, order, Activities and organization. Duplicate prompt checks report card positions without deleting content. Card lists use 50-item pages; **Expand All** below the paging buttons shows every card, and **Show 50 at a Time** restores paging. Expanding a very large library may be slower on older devices.

The Activity editor previews a draft against a selected card. `{card}` inserts literal card text at every occurrence; unknown placeholders stay unchanged. Stored templates are never changed by rendering. Jenga and Prompt Picker support None, Fixed, Random (avoiding immediate repeats), Cycle and activity-only reroll.

## Work presentation

After displaying a card in Jenga or Prompt Picker, choose **Presentation View** for a larger shared-screen prompt. **Hide Controls** hides navigation/answer controls; **Show Controls** remains accessible at the bottom. Exit Presentation returns to the same card and Activity. This is an optional view of the existing session, not a separate game engine. Keyboard Escape exits presentation. Activity reroll changes the instruction without changing the card.

## Run locally

Install Node.js LTS from the official Node.js website. From this project folder:

```sh
npm install
npm run build
npm test
npm run start
```

Open `http://localhost:4173/`. `npm test` rebuilds before running the tests. The optional `sh scripts/dev.sh` combines installation, building, testing and serving.

The local server is a development preview. The preview server binds to localhost on the computer. It is not an iPhone installation link; plain HTTP LAN origins also lack the secure context required for service workers or some sensors. Use the deployed HTTPS GitHub Pages website for installation and complete offline/motion tests. No paid hosting or database is required by this app.

## Install and update

On iPhone, open the HTTPS deployment in Safari, use Share → Add to Home Screen, then launch the icon. Android browsers offer an install/add-to-home-screen option; desktop installation depends on browser support.

Settings → Check for Update downloads updates. Close **all** windows for this app and reopen to activate them. Updates wait rather than reloading an active round. Version **0.11.0** should appear in Settings after this release. Keep the same site address: browser storage belongs to its origin.

## Local data, offline use and backups

Decks and preferences live in IndexedDB on the device. A service worker caches app files and audio after the first successful online load. Settings reports offline readiness. Once ready, close the app, enable airplane mode, reopen and test editing and games. Previously uncached files or failed initial downloads cannot work offline.

Local storage can be lost through browser/site-data removal, storage cleanup, app removal or device loss. Storage protection may reduce eviction but is not a backup guarantee. Export the library in **Backups**, save it to Files or another safe location, and use **Confirm Saved Backup** only after checking the file. Optional monthly reminders run locally when the app is opened. Export requests and confirmed saves are tracked separately.

Restore defaults to adding independent copies. Replacement requires an explicit acknowledgment and creates a local recovery point. Validate a backup before replacing anything. Recovery points remain on the same device and do not protect against site-data removal. Existing deck/state formats normalize safely; no schema change is needed for this release.

## iPhone acceptance checklist

1. Export a backup, update, close all app windows and reopen. Check **0.11.0** and **Ready/cached offline**.
2. Open a deck with over 50 cards. Expand All, inspect the last card, then restore 50-item pages. Card order/numbers should stay unchanged.
3. Duplicate a deck. Edit the copy; confirm the original cards, Activities and organization remain intact.
4. Paste numbered lines with one duplicate. Review without saving, change a line and verify the review disappears. Review again; compare keeping duplicates with Skip duplicates.
5. Add/edit an Activity containing `{card}` twice and `{player}`. Preview against different cards; verify literal replacement and unknown-placeholder retention. Save, close and reopen.
6. In Work, draw a Jenga/Prompt Picker card. Enter Presentation View, hide/show controls, reroll a Random Activity, and exit. The card should remain unchanged by reroll or view toggles. Test portrait and landscape safe areas.
7. Check normal deck editing/reordering and all existing game controls. Confirm Catchphrase expiry/awards, Headbands manual/tilt controls and Taboo results still work.
8. Once cached, repeat a cold launch, draw/edit, audio and sensor trial offline. Use Device Tests for permission/support diagnostics. Confirm saved data after reopening.
9. Check larger text, VoiceOver reading order, bottom controls and Home Screen behavior on a physical device.

## Architecture

- `src/app.ts`: current screens, UI events and session coordination.
- `src/model.ts`, `modes.ts`, `games.ts`, `taboo.ts`, `activities.ts`, `prompt-session.ts`, `editor-tools.ts`: platform-independent content and session helpers.
- `src/ui.ts`: shared safe HTML display and contextual deck picker helpers.
- `src/storage.ts`, `backup.ts`: IndexedDB boundary and versioned validation/export/restore.
- `src/game-audio.ts`, `audio.ts`, `sensors.ts`: current web audio and motion services.
- `src/share.ts`, `haptics.ts`: small web adapters for file sharing/download, clipboard and vibration diagnostics.
- `public/`: app shell, styling, manifest, icons and audio.
- `scripts/build.mjs`: offline asset list and versioned service worker generation.
- `tests/`: Node tests for import, validation, migration, sessions, motion math, audio scheduling and shared display.

The shared picker extraction preserves existing ranking/filter behavior. Sharing and haptics have small interfaces; audio, motion and storage keep their existing boundaries. This leaves practical seams for future native packaging without adding Capacitor or speculative infrastructure.

## Platform limits

Motion/audio require browser support, permissions and user interaction. A motion sensor detects orientation/movement, not physical forehead contact. Haptics may be unavailable on iPhone. Screen lock, backgrounding and interruptions can suspend audio or gameplay; foreground trials do not prove reliable background playback. Exact physical sound, sensor feel and safe-area behavior require device testing. HTTPS hosting and cached assets enable offline use but do not promise permanent storage or perpetual hosting.

No multiplayer, accounts, cloud sync, billing or native packaging are implemented by this release. The separate native project is outside this repository.
