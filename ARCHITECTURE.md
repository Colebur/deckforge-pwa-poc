# DeckForge architecture

## Content and sessions
One library holds regular decks and separate Taboo decks. A regular deck has ordered Cards, ordered Activities, context and intended mode compatibility. Context recommends rather than restricts. Compatibility filters pickers; Show All remains available within structural requirements (Jenga needs 54 cards). Play and Work pass launch context into the same game engines. Neither creates a second library.

`model.ts` owns cards, decks, imports, shuffle and Catchphrase rounds. `games.ts` owns teams, timers and Headbands rounds. `taboo.ts` owns specialized validation and rounds. `activities.ts` replaces literal `{card}` occurrences without changing templates; `prompt-session.ts` coordinates multi-deck draws. `modes.ts` is the game catalog and contextual ranking. `refinements.ts` provides local library filtering/sorting and preference helpers. These modules use no DOM, storage or network APIs.

`app.ts` coordinates screens, events and current sessions. Round review data belongs to an in-memory session, never the library. Catchphrase advances are informational, not an extra scoring rule. Headbands replay preserves current choices and runs the same preparation/calibration flow. Change Deck or Settings discards the finished match and returns to setup. No game-history profile is stored.

## Platform boundaries
`storage.ts` reads/writes IndexedDB and local recovery points. `backup.ts` validates/normalizes versioned data and exports/restores copies. `game-audio.ts` and `audio.ts` own web audio; `sensors.ts` owns permission and sensor events. `tilt.ts` and `headbands-setup.ts` process sensor values separately from permission acquisition. `share.ts` and `haptics.ts` are small adapters. `ui.ts` escapes text and creates shared display/picker markup.

Future Capacitor adapters can replace platform boundaries without rewriting deck/session rules. The UI still contains browser lifecycle, wake-lock and service-worker integration. Extract those only when a concrete packaging requirement warrants it; there is no Capacitor dependency now.

## Persistence and updates
IndexedDB state format remains version 6. Existing missing Activities/context/compatibility normalize safely. Search, sort and filters are session UI state and do not alter deck/card order. New round review is session-only. No data migration is required for 0.12.0.

The manifest and public shell support installation. `scripts/build.mjs` copies assets, hashes them and generates the service worker. Updates cache a complete shell and wait for all old app windows to close. Keep the same origin/path to retain access to local data. A cache is not a deck backup.

## Validation
Compile TypeScript, build the PWA, then run Node tests. Browser checks cover layout/navigation and controls; physical devices must verify Home Screen, offline cold launch, audio and motion. Background interruptions can suspend browser APIs; timed games pause on hiding the app or audio interruption. A paused Headbands round recalibrates before continuing.

## Boundaries
No account, analytics, backend, cloud sync, payments or multiplayer exists. The native SwiftUI project is separate and outside this repository. The software license is undecided; a public repository alone is not a selected open-source license.

## Link boundary

`multiplayer.ts` mounts a contained UI with its own listeners and timers. Unmount aborts requests and cancels timers; tab-scoped credentials/drafts allow resuming. `room-transport.ts` isolates fetch, endpoint selection and cancellation. Room rules and scoring remain authoritative in the separate Worker. `category-source.ts` draws from a read-only snapshot of local card text. No IndexedDB schema change is required. Service-worker caching excludes cross-origin requests and POST requests.

The Worker permits its own origin and an explicitly configured PWA origin, supplies preflight/error CORS headers, and still checks room member/host credentials. No cookies or permanent identities are introduced. A future realtime transport can replace the request adapter without changing saved deck data.
