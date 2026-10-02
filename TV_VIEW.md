# TV View — first milestone

TV View supports Prompt Picker, Jenga and Link Trivia. It uses the device’s existing screen mirroring; it does not require a browser on the television or add a Cast SDK.

## Prompt Picker and Jenga

1. Open the mode and select a deck. Draw a prompt or choose a block number.
2. Tap **TV View**. Rotate the device into landscape.
3. Connect screen mirroring using the device’s normal controls (for example, Control Center → Screen Mirroring on iOS).
4. Use **Full Screen** if the browser supports it. Use **Hide Controls** for a cleaner screen; **Show Controls** restores them.
5. Continue drawing prompts or selecting numbers with the existing controls. Activities still appear with their cards.
6. **Exit TV View** returns to the normal layout.

The canvas uses a 16:9 layout in landscape and scales its text. The television’s resolution, letterboxing and latency depend on the source device and mirroring hardware. The app cannot guarantee a separate 1080p output stream. These local modes retain their existing offline behavior.

## Link Trivia

1. On the host’s phone, open Link and create a Trivia room. Players join using the regular room code/link.
2. Tap **TV View Link**. Copy the separate TV link and open it on the Mac or spare device that will mirror to the television.
3. Mirror that device using its normal system controls. Tap **Full Screen** where supported. Continue hosting/answering on the phones.
4. Start Trivia. The display shows the current question and optional timer, then public answers/results after reveal and totals after scoring.
5. Copying the existing link again does not disconnect the display. **Replace TV Link** requires a second tap and revokes the previous link.

The display is read-only and does not occupy a player slot. It receives neither hidden answer keys nor private player drafts before reveal, and cannot submit answers or control the room. Anyone with the TV link can view the public audience screen, including nicknames and revealed answers. Share it only with the intended audience.

The temporary display credential is separate from host/player credentials. It travels in the URL fragment and authenticated request header, not the room URL query. It expires with the room. Watching alone does not keep the room alive. The host remains responsible for running the game. A network connection is required for Link; refresh/reconnect resumes the display while the room and link remain valid.

Only Trivia has a separate audience endpoint in this milestone. Other Link games, direct Chromecast integration, and Catchphrase/Headbands TV layouts are outside this change. Large result lists can scroll. A TV cannot receive a private host interface and an independent public interface through mirroring the same screen: use a separate mirrored device for Link.

## Manual acceptance checks

- Prompt Picker and Jenga: enter TV View, use landscape, advance cards/numbers, confirm Activities remain correct, hide/show controls, exit normally.
- Trivia: confirm opening the TV link does not increase player count; begin a round and verify no answer key or private draft appears before reveal.
- Reveal, score and advance: confirm the display follows the host without reopening the link.
- Replace the link: confirm the old display reports that its link ended and the new display connects.
- Try real AirPlay/screen mirroring: check text readability, edge clipping and latency on the television. Browser checks cannot establish physical casting behavior.
- Close and reopen the installed app after updating, confirm decks remain intact, and test local TV View offline.

## Architecture

Local TV View extends the existing presentation state. Game logic, decks and persistence are unchanged. Link uses a small explicit public-state projection on the server and a separate audience renderer on the client; it never reuses a host snapshot. The mirroring choice remains outside the game engine, so future platform adapters can be added without changing game rules.
