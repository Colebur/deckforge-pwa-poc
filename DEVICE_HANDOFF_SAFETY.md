# Launch layout and device handoff safety · 0.19.1

Prompt Picker is available in both Play and Work. It uses the same session engine, deck compatibility, context ranking, Show All Decks, Activities and TV View in either section.

The app shell refreshes its viewport height at startup, page load, resume and resize, without rerendering a game. CSS supplies a full-height fallback before JavaScript starts. Input focus is excluded from height refreshes to avoid reacting to the onscreen keyboard. Physical iPhone Home Screen cold launches still require device testing.

## Safety tutorial

On the first visit to Work on iPhone/iPad or Android, a blue modal explains device handoff restrictions. Desktop and unknown platforms never receive it automatically. Work → Device Handoff Safety and Settings → Device Handoff Safety reopen it manually.

The modal does not activate an OS feature. Its instructions follow [Apple Guided Access guidance](https://support.apple.com/en-au/111795) and [Android App Pinning guidance](https://support.google.com/android/answer/9455138?hl=en). Menus and shortcuts may vary by device/version. Restrictions reduce accidental access, without guaranteeing security. Keep Guided Access Touch and Motion enabled for interactive/tilt games, and end Guided Access to make emergency calls.

The seen flag is saved only after dismissal, in the existing IndexedDB state store under `device-handoff-safety-seen`. It is separate from decks, preferences and backup/restore. No migration or new dependencies are needed. The modal uses native dialog focus trapping, keyboard Escape dismissal, an accessible heading and a clear Got it button. A failed save leaves it open with retry feedback.

## iPhone checks

1. Online, use Settings → Check for Update. Once ready, close all DeckForge windows and reopen. Verify version 0.19.1.
2. Fully close the Home Screen app and reopen without tapping a tab. Check the bottom tab bar reaches the bottom safe area. Repeat portrait/landscape and a background/resume cycle.
3. In Play, open Prompt Picker. Check Play recommendations, Show All Decks, Activities and draw controls. Repeat from Work and check Work recommendations.
4. Open Work. Check Guided Access instructions appear. Tap Got it, switch tabs and return; close/reopen and return. It should stay dismissed.
5. Reopen the instructions using Work → Device Handoff Safety.
6. To repeat first-run testing, open Settings → Device Handoff Safety → Reset First-Run Tutorial, then open Work. This resets only the tutorial flag, never decks.
7. Reopen offline and repeat the tutorial/reopen controls and a local game.

On Android, check the App Pinning wording and authentication option. On desktop, check Work does not automatically show the tutorial; manual help remains available.

Validation: 114 automated tests passed, production build succeeded with 49 offline assets. Browser preview verified launch/tab bottom alignment at 393×852, Play Prompt Picker recommendations, manual dialog and Settings reset controls. Physical OS restrictions and iPhone cold launch are manual checks.
