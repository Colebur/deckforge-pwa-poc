# Verification — 0.11.0

## Automated

Strict TypeScript compilation and production offline build pass. All 76 Node tests pass. The build caches 32 app/audio assets.

New checks cover independent deck/card/Activity IDs and content, copy naming, duplicate positions, non-mutating import review, optional duplicate skipping, Activity placeholder preservation, atomic rejection of invalid Taboo batches, whole-card Taboo duplicate matching and escaped preview output.

Existing tests continue covering old state/backup formats, 2,000-card backup roundtrips, metadata and structural compatibility, Activity sessions, card order, game scoring/timers, motion calibration/diagonal tilt math, audio scheduling, cached media ranges, local preferences and keyboard behavior.

## Browser and physical-device checks

Browser results and remaining device acceptance checks are recorded with the release report. The README contains exact manual installation/update, editor, presentation, persistence and offline steps.

Earlier physical-device trials reported working Home Screen installation, saved decks between launches, online/offline games, landscape layouts, motion readings and offline audio. These reports do not establish permanent storage, background playback reliability or support on every browser/device.

Physical-device acceptance remains necessary for the new presentation safe areas, touch targets, VoiceOver and existing audio/tilt behavior. No automated test simulates a physical iPhone sensor or installation.

Current local browser checks confirm the 50-card page, Expand All to 55 cards and collapse, cleaned import review with repeated-line detection and optional skipping, stale-review invalidation after text editing, Activity draft preview, independent deck copy, and Work presentation hide/show/exit retaining the same card. A 390×844 presentation preview has no horizontal overflow. Physical acceptance is still pending.
