# DeckForge PWA verification — version 0.2

## Automated and Mac checks

- Strict TypeScript build and all 18 tests pass. Tests cover import/Unicode/duplicates, lookup/shuffle/round rules, cached audio ranges, version guards, invalid backup rejection, add/replace restores, legacy POC and native backup formats, 2,000-card roundtrip and accelerating cue timing.
- Upgraded an existing cached prototype without clearing storage. The original five cards, duplicate Beyoncé, -5 degrees, order and saved duration remained.
- Exported actual backup JSON through the copy-text fallback, selected that file through the file picker, previewed it, added copies, replaced the library, recovered the previous library through its restore point, and reloaded to confirm committed IndexedDB data.
- Created a test deck, bulk imported, edited a card, renamed the deck and added another card. Lookup and Got It/Pass/pause/resume worked. Manual ending says Round ended; natural expiry says Time’s up.
- Final UI checked at 430 × 932 and 932 × 430. Landscape play has a large centered card, two answer buttons and pause/end controls, with no header clutter. Physical safe areas remain an iPhone check.
- Stopped the local static server, reloaded the latest cached UI and completed a five-second round. Existing decks remained usable offline.
- Browser share was unavailable in the embedded Mac browser. The download fallback was requested but no download event could be verified there. The generated JSON and actual file-import/restore path were verified; iPhone Save to Files needs testing.

## Cole’s original iPhone trial (version 0.1)

Device: iPhone 15 Pro Max, iOS 27.0.

Cole reported that decks/cards survived closing and reopening, online/offline operation worked, Lookup and Catchphrase controls worked, landscape worked in both modes, sensors produced readings, loop audio played, and audio/sensors worked offline. These are user-reported physical-device results. They do not establish multi-day durability, calibration quality, background audio or custom haptics.

## Version 0.2 iPhone checklist

- [ ] Settings shows version 0.2.0 after updating; previous decks are intact.
- [ ] Export Backup → Save to Files creates a readable JSON file outside app storage.
- [ ] Choose Backup File → Add deck copies preserves originals and restores exact card order.
- [ ] Replace library → Review Restore Point recovers the prior library (use disposable test decks).
- [ ] Timer begins with widely spaced soft beeps, accelerates smoothly and ends with one buzzer. Pause stops cues; Resume works. Repeat offline.
- [ ] Simpler screens and play controls feel comfortable in portrait and both landscape directions.
- [ ] Offline cold launch and edits still survive reopening, next-day use and a phone restart.
- [ ] Record Settings storage protection result; keep an exported backup regardless.

## Remaining decision limits

No full migration approved or performed. Native DeckForge remains untouched in its own repository. Teams, random durations and completed tilt gameplay are not part of this milestone. Background/locked-screen audio, custom haptics, long-term storage and physical 0.2 sharing/cues remain unverified. Keep native available while evaluating these compromises.

Live trial: https://colebur.github.io/deckforge-pwa-poc/
Source: https://github.com/Colebur/deckforge-pwa-poc
