# Motion experiment (0.22.0)

This optional development experiment changes visual feedback only. It adds no dependencies, user settings, deck fields, storage changes, game rules or network services.

## Where it lives

- `src/motion.ts`: shared timing/easing tokens, navigation and card animation plans, render snapshots, cancellation, noninteractive outgoing copies, list movement, counters, notices and dialog hooks.
- `public/motion.css`: press feedback, accent transitions, disclosure/backdrop motion, a temporary card-stack decoration and the moving tab indicator.
- `public/index.html`: loads the separate motion stylesheet after the existing design.
- `src/app.ts`: render identities and action hints connect the decoration layer to existing navigation, cards and Activities. Flashcards updates its side immediately; two visual half-flips replace the old awaited flip so rapid taps cannot queue.
- `src/device-safety.ts`, `src/game-pack-editor.ts`, `src/multiplayer.ts`: optional render/dialog hooks, without changing their underlying data or game behavior.
- `tests/motion.test.mjs`: direction, reduced motion, rapid input, cleanup and unsupported-animation checks.

## Animated interactions

Hierarchical screens enter from the right, with Back reversing the direction. Peer tabs use a short vertical fade, an icon lift and a traveling underline. Existing context colors are retained. Controls compress subtly on press.

Next/Previous cards flick in opposite directions. Random draws and study shuffle briefly suggest a small stack. Flashcards flips around the Y axis, with each face staying within 90 degrees to avoid mirrored text. Activities rerolls and lookup results transition with the same card system. Link question/puzzle changes share this presentation layer; networking and answers are unchanged.

The safety modal and backdrop enter and exit. Existing inline forms, selections, changed counters, status notices, bounded list additions/deletions/reordering and round completion get restrained feedback. Native browser confirmation dialogs remain OS-controlled. Existing progress elements receive CSS transition support; no new progress UI is introduced.

## Safety and performance

Game state changes immediately. Outgoing copies are inert, hidden from assistive technology and unable to receive pointer input. New input cancels previous visual effects rather than building a queue. Timer-only renders do not animate unchanged cards. List animation is skipped above 100 visible rows, and large page copies above 1,000 elements are skipped. Timing tokens are 140 / 220 / 320 ms, with 160 ms exits.

`prefers-reduced-motion: reduce` disables the large motions, flips, springs and press scaling. Enabling it during an animation cancels effects and removes outgoing copies immediately. Missing Web Animations support falls back to immediate UI updates. Disclosure height animation is progressive enhancement; unsupported browsers keep native disclosure behavior with a brief entrance fade.

## Revert

Local checkpoint tag: `pre-motion-0.21.0`. The motion pass is committed separately from recent-card memory. Revert the isolated motion commit using `git revert <motion-commit>` and rebuild/deploy. On GitHub, revert the dedicated motion pull request. Avoid resetting the branch or checking out the checkpoint over later development. Reverting keeps recent-card memory and earlier features intact.

## Manual iPhone checks

1. Check for updates in Settings, close every DeckForge window and reopen. Confirm version 0.22.0.
2. Switch Play / Work / Link / Decks, enter a deck/mode and go Back. Verify fast, appropriate directions and unchanged controls.
3. Draw repeatedly in Prompt Picker; use Next in Catchphrase and Correct/Pass in Headbands. Confirm prompts stay readable and input remains immediate.
4. In Flashcards, flip both ways, tap rapidly, use Previous/Next and Shuffle. Check that the final card/side matches your input without mirrored text or lingering layers.
5. Reorder/add/delete a test card, bulk import into a test deck, reroll an Activity and open/close Device Handoff Safety. Check that content and focus settle correctly.
6. Repeat in portrait and landscape, then enable iOS Settings → Accessibility → Motion → Reduce Motion. Confirm large motion disappears and controls still work.
7. After loading once, test one-device modes in Airplane Mode. Multiplayer still requires a connection.

Automated tests and desktop mobile-sized preview checks do not replace physical iPhone performance and reduced-motion testing.
