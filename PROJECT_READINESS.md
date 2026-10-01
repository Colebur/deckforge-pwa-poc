# Project readiness review — 0.12.0

## Constitution alignment
- Reusable local content: Cards and Activities belong to decks; templates stay unchanged. Separate specialized Taboo format is preserved.
- Canonical PWA: Play / Work / Decks share engines and a library; install shell and offline cache remain in place. Native project is untouched.
- Privacy: no accounts, tracking, cloud profiles or personal deck server. Export/share is an explicit user action. Hosting serves public app files.
- Simple architecture: no new dependencies or schema. Game/content helpers remain platform-independent; platform services have practical boundaries.
- Facilitator use: Work prioritizes Jenga and Prompt Picker; optional presentation controls remain available. No separate facilitator engine was added.
- Free custom creation: editing/import/export has no billing or paywall.
- Roadmap discipline: no new game modes, multiplayer, backend or native packaging.

## Readiness gaps and decisions
1. License remains undecided. Do not describe the project as licensed open source until a license is deliberately chosen. No license file was added.
2. Audio/icon provenance and redistribution permissions need an asset inventory before a public FOSS release. Do not assume code licensing automatically covers every asset.
3. Physical iPhone/Android acceptance remains essential. Browser/Node results do not establish tilt feel, background audio, safe areas or permanent storage.
4. App UI/session coordination remains concentrated in app.ts. A future scoped screen extraction may improve maintainability; no unrelated rewrite was performed.
5. Local backups remain important. Storage protection and offline caching cannot guarantee permanent data. Git hosting does not back up user libraries.
6. Public-history privacy cleanup is a separate approval-dependent plan. Current work does not rewrite history or change account identity.

## Suggested next release gate
Run the device checklist below, choose a license deliberately, and inventory asset provenance before promoting the project as a reusable open-source distribution. Multiplayer Vote Test remains a separately authorized future project.

## Device acceptance
1. Back up the library. Update online, close all app windows, reopen, and confirm 0.12.0 and offline Ready.
2. In regular and Taboo libraries, search names, combine context/mode filters, then choose Most cards first. Equal counts should sort alphabetically. Clear restores the unfiltered alphabetical list. Deck/card order is unchanged.
3. Open/edit/reorder a deck and its Activities. Return to the library; filters remain during this session. Confirm persistence after reopening.
4. Catchphrase: advance three cards, pause, wait, resume and allow expiry. Review should list only advanced cards plus the last card separately. Award one team/no point; Next Round starts clean and keeps scores.
5. Headbands: finish a manual round; Play Again starts another round with the same choices. With tilt enabled, replay and Resume must use guided preparation/calibration before play. Change Deck or Settings returns to setup.
6. Taboo: use Correct, Pass and Taboo; finish the round. Review outcomes and last unanswered card. Next Round rotates teams and preserves totals; changing setup resets the match.
7. In every timed mode, pause then background/reopen. No answers should register while paused; resume should continue remaining time. Cancelling End leaves the round paused.
8. Test larger text, landscape, VoiceOver, tab navigation and Reduce Motion. Once cached, repeat offline cold launch, deck editing and gameplay/audio/motion. Reopen and verify decks remain.
