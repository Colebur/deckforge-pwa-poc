# DeckForge

A local-first deck toolkit for party games, group activities and facilitation. Create content once and reuse it across games. Custom decks remain a core feature, with no accounts, analytics or ads. Single-device features need no backend; optional multiplayer uses a temporary-room service.

## Navigation and games

- **Play:** Catchphrase, Heads Up and Taboo.
- **Work:** Jenga and Prompt Picker first, followed by the same party game engines.
- **Link:** Create or join temporary multiplayer Categories rooms.
- **Decks:** one regular deck library, with a separate secondary library for Taboo cards.

Regular decks contain ordered cards and Activities. Context (`play`, `work`, `both`) recommends decks without restricting access. Intended game compatibility organizes pickers; Show All Decks offers an escape hatch when the card format and size fit the game. Jenga requires exactly 54 cards in block-number order.

Catchphrase supports saved teams, Random (60–120 seconds) or fixed timers in 15-second increments, hidden countdown, accelerating ticks and an end buzzer. Heads Up supports manual answers or permission-based motion controls with guided landscape placement, a distinct three-second preparation chime and calibrated tilts. Taboo uses an answer plus five forbidden words and team scoring. Prompt Picker supports a session-only selection of multiple decks, choosing a deck uniformly before a card.

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

Settings → Check for Update downloads updates. Close **all** windows for this app and reopen to activate them. Updates wait rather than reloading an active round. Version **0.13.0** should appear in Settings after this release. Keep the same site address: browser storage belongs to its origin.

## Local data, offline use and backups

Decks and preferences live in IndexedDB on the device. A service worker caches app files and audio after the first successful online load. Settings reports offline readiness. Once ready, close the app, enable airplane mode, reopen and test editing and games. Previously uncached files or failed initial downloads cannot work offline.

Local storage can be lost through browser/site-data removal, storage cleanup, app removal or device loss. Storage protection may reduce eviction but is not a backup guarantee. Export the library in **Backups**, save it to Files or another safe location, and use **Confirm Saved Backup** only after checking the file. Optional monthly reminders run locally when the app is opened. Export requests and confirmed saves are tracked separately.

Restore defaults to adding independent copies. Replacement requires an explicit acknowledgment and creates a local recovery point. Validate a backup before replacing anything. Recovery points remain on the same device and do not protect against site-data removal. Existing deck/state formats normalize safely; no schema change is needed for this release.

## iPhone acceptance checklist

1. Export a backup, update, close all app windows and reopen. Check **0.13.0** and **Ready/cached offline**.
2. Open a deck with over 50 cards. Expand All, inspect the last card, then restore 50-item pages. Card order/numbers should stay unchanged.
3. Duplicate a deck. Edit the copy; confirm the original cards, Activities and organization remain intact.
4. Paste numbered lines with one duplicate. Review without saving, change a line and verify the review disappears. Review again; compare keeping duplicates with Skip duplicates.
5. Add/edit an Activity containing `{card}` twice and `{player}`. Preview against different cards; verify literal replacement and unknown-placeholder retention. Save, close and reopen.
6. In Work, draw a Jenga/Prompt Picker card. Enter Presentation View, hide/show controls, reroll a Random Activity, and exit. The card should remain unchanged by reroll or view toggles. Test portrait and landscape safe areas.
7. Check normal deck editing/reordering and all existing game controls. Confirm Catchphrase expiry/awards, Heads Up manual/tilt controls and Taboo results still work.
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

Optional Categories multiplayer requires internet. Accounts, cloud sync, billing and native packaging are not implemented. The separate native project is outside this repository.

## Navigation motion

Tab changes use a subtle directional fade/slide; opening decks or mode setup uses a small upward entrance, and returning to a library/home uses a light reverse motion. Transitions take 180 milliseconds and never delay input. Tapping the current tab again does not replay motion. Existing navigation focus and scroll behavior remain available. Editing, drawing cards, timers and tilt feedback do not start these animations. A new navigation cancels the previous transition, and the device's Reduce Motion preference disables motion (including when changed while the app is open).

After updating to 0.12.0, try Play → Work → Decks and back, open a deck and a game setup, and switch tabs rapidly. Check portrait/landscape, larger text and keyboard focus. Enable Reduce Motion in device accessibility settings and repeat: navigation should be immediate without sliding/fading. Game prompts should remain steady during rounds.

## Library and round polish

Decks and Taboo Decks support name search, context/compatibility filters, and Name A–Z or Most cards first sorting. Equal card counts remain alphabetical. Labels show intended modes. Clearing filters restores alphabetical order; these UI choices do not change saved card order.

Catchphrase reviews advanced cards and the last card without changing its one-point team rule. Taboo reviews Correct/Passed/Taboo outcomes. Heads Up Play Again starts with the same choices and repeats motion preparation when enabled. All finished timed games offer Change Deck or Settings; changing setup starts a new match rather than carrying team totals. Paused screens explain that time is stopped. Reviews remain session-only.

See [architecture](ARCHITECTURE.md) and the [constitution/readiness review and device checklist](PROJECT_READINESS.md). The license remains undecided; no open-source license is applied by this release.

## Multiplayer Categories (0.13.0)

Link → Create Room starts a Categories room. Enter a temporary nickname, choose a local deck as the category source or enter categories manually, and share the join link/code. Guests use Link → Join Room. The default is 12 categories and three minutes. Players answer privately; the host reveals answers, reviews automatic duplicate exclusions, finalizes scores, and starts the next round.

Only selected round categories, temporary nicknames and answers reach the room service. Deck libraries remain local. Multiplayer requires internet; existing modes retain offline behavior. Switching tabs pauses room requests; returning resumes the same tab’s saved role. Rooms expire after 15 minutes without game/join activity or two hours total. Closing the tab or clearing browser storage can lose recovery credentials.

For local multiplayer testing, run the separate DeckForge-Vote-Test preview on port 4180 as well as this preview on 4173. Production uses the existing room service.

Link also includes Trivia, Team Trivia, Clue Board, Survey Showdown and Word Wheel. See [Link game guide](LINK_GAMES.md) for Game Deck formats, host participation, first-edition rules, backups and device tests.

[Party games release verification](RELEASE_VERIFICATION.md) records automated checks, local and hosted browser trials, and remaining physical-device tests.

## Complete backups and Game Deck editing

In version 0.19.0, Backups → Back Up Everything includes regular/Taboo decks, backs, Activities, Game Decks and saved settings. Older collection files remain readable. Game Decks now have labeled card fields as well as bulk editing. See [complete backup and editing guide](COMPLETE_BACKUPS.md) for exact steps and limits.

## Navigation and rotation

Bottom tabs appear only on the Play, Work, Deck Library and Link landing screens. Game setup, gameplay, editors, Settings and Link room details use Back navigation. In a Link room, Back leaves temporarily and preserves same-tab recovery. Menus remain usable in landscape; gameplay keeps its existing landscape layouts. Viewport refreshes settle rotation events before writing a changed height, while retaining keyboard protection.

Catchphrase round-end team buttons show running totals and award one point; Next Round appears after the decision. Heads Up keeps Play Again on its primary result screen. Detailed reviews and secondary options are expandable below. The stored `headbands` mode identifier remains unchanged for compatibility.

## Deck appearance

Open a regular or Taboo deck and expand **Deck icon**. Enter or paste one emoji using the device emoji keyboard, then choose **Save Icon**. Leave the field empty to restore the card-stack fallback. Compound emoji, skin tones, flags and keycaps are supported. Icons stay local and are included in deck and complete backups, restores and duplicates. Artwork varies by operating system. Existing decks need no migration.

The Soft Shapes visual layer is isolated in `public/soft-shapes.css`; it preserves contextual tab colors and game layouts.
