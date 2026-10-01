# DeckForge project constitution

Project principles recorded September 30, 2026. This is project context, not authorization to build the roadmap all at once.

## Purpose
Create or import content once, then reuse it across games and group activities. DeckForge is a general-purpose group activity, party game and facilitator toolkit: closer to “VLC for group activities” than an ad-heavy party game app. Keep it fast, simple, privacy-respecting, highly customizable and usable without accounts. Custom deck creation remains a free core feature. Families, classrooms, casual groups and professional facilitators are all intended audiences. A public-good/FOSS direction is possible; this does not itself select a software license.

## Platform and architecture
The PWA is canonical for now, supporting iPhone, Android and desktop through one codebase with optional Home Screen installation. Preserve the separate native SwiftUI project untouched. Do not introduce Capacitor or native packaging without explicit approval. Keep deck, game and session logic platform-independent. Isolate storage, audio, motion, haptics and sharing behind small modules/interfaces where practical. Avoid speculative abstractions, new frameworks or replacing working architecture without a compelling reason.

## Privacy and cost
No required accounts, email, persistent profiles, individual analytics, tracking, advertising identifiers or persistent multiplayer identity. Decks and preferences stay local unless the user explicitly exports/shares them. No authentication, cloud sync, Firebase Auth, backend, analytics, ads, subscriptions, paywalls, billing or purchases without explicit approval. Donations, curated packs or other distribution models are only future possibilities.

## Reusable content
A regular Deck contains many Cards and many ordered Activities. Activities normally belong to a deck rather than an individual card. Store the original template; render `{card}` using the selected card text. Replace every exact occurrence; leave unknown placeholders unchanged. No full template language or future placeholders are currently authorized. Keep specialized Taboo decks separate from the regular library.

## Facilitator use
Support facilitator-controlled interaction and readable shared-screen presentation. Participants may be unable to handle staff phones; future designs should work with a facilitator retaining possession, including use alongside physical cards/objects. Do not create a separate Facilitator Mode without approval.

## Roadmap context only
Possible future modes include trivia, Jeopardy-inspired, Family Feud-inspired, Blank Slate-inspired, categories, voting/ranking, drawing/guessing and collaboration. Current navigation is Play / Work / Decks. Play and Work share game engines and one deck library; Work prioritizes Jenga and Prompt Picker. Future multiplayer may distinguish one device from everyone’s device within Play. That is roadmap context, not an implementation request.

If multiplayer is explicitly approved later, start with a small “Vote Test” proof of concept before complex games. Use temporary nicknames, room codes/QR codes, host roles and ephemeral server-assisted realtime state. Test private input, synchronized reveal, disconnect/reconnect and automatic expiry/deletion of abandoned rooms. No permanent accounts, multiplayer history or server-side personal deck library by default.

## Development discipline
Inspect the existing implementation before changing it. Do not rewrite from scratch, refactor unrelated code or implement the entire roadmap in one pass. Keep dependencies minimal and TypeScript readable. Build/test after logical milestones and fix errors before stopping. Explain architectural changes. Preserve existing games/settings, local persistence, service worker caching, offline use, mobile UI and PWA installation. A browser check cannot claim physical iPhone Home Screen/sensor/audio verification; record what still needs testing on the device.

## Activities acceptance
Regular deck editor: Cards / Activities tabs; add, edit, delete, reorder and bulk paste Activities. Lookup modes: None (default), Fixed / Choose One, Random avoiding immediate repeats when possible, Cycle in saved order with wrap. Random reroll keeps the card and changes only the Activity if alternatives exist. Session state must not mutate content or persist mode selections. Zero Activities must produce no invalid/empty instruction controls. Old decks become `activities: []` safely. Backups must retain templates, dates and order.

Verify legacy decks, CRUD/order/persistence, literal substitution (multiple occurrences and unknown placeholders), each mode, reroll, existing games and offline production build. Provide iPhone test steps and report limitations. Recommend cleanup separately; do not implement it without approval.
