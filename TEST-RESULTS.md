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

## 0.12.0 validation
Strict TypeScript compilation and production build succeeded (32 cached assets). All 79 Node tests pass. Added checks cover card-count ordering with alphabetical ties/nonmutation, session-only Catchphrase review reset, and pause/deadline rejection across timed modes.

Local browser: combined Work/name filters, Most cards first and Clear; Headbands manual summary/replay/pause/resume/setup return; Catchphrase two advances, 15-second expiry, review and No point; Taboo complete-deck outcome review. Browser warning/error logs empty; horizontal overflow absent at the tested viewport. Cached preview updated normally without resetting its existing library. Physical iPhone Home Screen/offline/audio/motion/Reduce Motion checks remain manual (PROJECT_READINESS.md).

## 0.13.0 integration validation

- Existing 79 tests passed before integration-specific tests were added.
- Four integration tests verify the Link root, non-mutating category draw, and request credentials/payload/cache policy.
- Room server: 22 tests passed, including approved-origin preflight, continued member authorization, rejected unapproved origins and resumable host role.
- Production TypeScript/build completed. Local two-player browser validation passed: private answers, duplicate exclusions, host overrides, score finalization, next round, direct local-deck source, tab switching and host reload recovery. Hosted validation remains pending; no physical-device claims made.
