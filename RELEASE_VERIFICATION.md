# Link party games milestone

Implemented PWA 0.14.0 and room service 0.4.0. Native SwiftUI project untouched. Existing regular deck persistence formats and Activities unchanged.

## Added
- Trivia and Team Trivia with private answers, server deadlines, explicit accepted alternatives, host review and idempotent score finalization.
- Clue Board with category/value tiles and one-time selection.
- Survey Showdown with ranked answers; one captain answer per team on phones; spoken answer reveals, strikes and host-awarded points.
- Word Wheel with regular phrase decks, server spins, turn enforcement, consonant occurrence scoring, vowel purchases and puzzle solving.
- Host participation toggle and private/spoken delivery choices.
- Separate local Game Decks editor with bulk line formats, whole-batch validation and separate JSON backup/import copies.

## Architecture and data
`party.ts` contains authoritative platform-independent rules. `party-content.ts` is identical in both repositories for content validation and accepted alternatives. The existing room transport, credential recovery, room expiry and CORS allowlist are retained. Rich decks use independent IndexedDB `deckforge-game-packs`; no changes to the existing regular/Taboo library schema. Only selected temporary game content reaches the room server.

Changed PWA files: package.json, README.md, LINK_GAMES.md, src/app.ts (version only), src/multiplayer.ts, src/party-content.ts, src/party-ui.ts, src/game-pack-storage.ts, src/game-pack-editor.ts, public/style.css, tests/party-content.test.mjs.
Changed server files: package.json, PARTY_GAMES.md, scripts/serve.mjs, src/room.ts, src/worker.ts, src/party-content.ts, src/party.ts, tests/room.test.mjs, tests/party.test.mjs.

## Verification
- Both TypeScript compilations and production builds pass.
- 119 automated tests pass: 87 PWA + 32 server.
- Local browser: rich quiz/survey deck creation and persistence after closing/reopening; two-player private Trivia, accepted alias, host override, scoring and guest reload recovery; Team Trivia shared scores; nonplaying spoken Clue Board host scoring and used tile; Survey board reveal broadcast, strike and manual score; Word Wheel spin, consonant reveal/score, vowel cost, solve and next puzzle; Categories start/save/lock/reveal/finalize regression with two correct points.
- Existing local regular deck remains present. This does not verify the physical phone's library, sensor/audio or Home Screen behavior; manual iPhone checks remain in LINK_GAMES.md.

## Limits
This release uses simplified first-edition rules. No clue buzzer race/wagers/daily doubles; survey face-offs/steals managed aloud by host; Wheel bankruptcy clears session points rather than a separate round bank. No animated wheel/final bonus round. Room limit 12 people, 25 cards, 128 KiB requests, 15-minute meaningful-activity idle expiry, two-hour hard lifetime. Quiz alternatives use exact case/punctuation normalization, not semantic AI or fuzzy factual acceptance. The deck author may know uploaded answers even when playing-host API views hide keys.

Game Decks have a separate backup; regular library backups do not include them. Line editor reserves pipes/semicolons as delimiters. Settings update downloads new offline assets but waits for every app window to close before activation.

## Release
Server PR: https://github.com/Colebur/deckforge-vote-test/pull/5
Server merged commit c7389696f9a239551b5946a6ac224652b914fcbf; Cloudflare successful build ff07cd2b-de7c-4461-8fe0-3d29675675c7.
PWA PR: https://github.com/Colebur/deckforge-pwa-poc/pull/17
PWA merged commit b95ec722cb6dacf1ec95e5e404d32a57f0f68c7d; GitHub Actions build/test/Pages deployment succeeded in run 37023889003. Hosted PWA verification passed: two-player Trivia creation/join/private saves, automatic deadline reveal, accepted alternative scoring (200 each), finalization, guest reload recovery, no browser console errors. Settings confirms 0.14.0 and Ready/cached offline assets.

Recommended future cleanup (not implemented): unify duplicated content types into a tiny shared source when both projects need more changes; integrate Game Decks into an explicit combined backup format; broaden card editor controls beyond line editing. Further game rule refinements should follow physical group trials.
