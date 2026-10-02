# Link games

Link now supports Categories, Trivia, Team Trivia, Clue Board, Survey Showdown and Word Wheel. All use the existing temporary-room service, up to 12 people, without accounts. Internet is required for Link; existing one-device modes and local editors remain available offline.

## Create content

Open Link → Game Decks. These are a separate local library, keeping regular decks and Activities unchanged. Export Game Decks separately for backup; the regular library export does not include them. Imports validate the entire file and add independent copies. Up to 200 decks with 500 cards each are supported; a room takes at most 25 cards. Only the selected room content is uploaded, and disappears with room expiry/deletion.

Trivia/Team Trivia/Clue Board use quiz decks, one card per line:

```
Red planet? | Mars | The planet Mars | Space | 100
Our star? | Sun | The Sun | Space | 200
```

Fields: question, answer, semicolon-separated accepted alternatives, category, points. Only question and answer are required. Edit, remove or move whole lines to change cards. Avoid literal pipes/semicolons inside text. Survey decks use:

```
Name a common pet | Dog:40;Canine | Cat:30;Kitten
```

Each answer has its own points and optional alternatives. Word Wheel uses an existing regular deck as a phrase source, limited to Latin-letter phrases (A–Z, including supported accented letters). Rich question decks do not appear in one-device deck pickers.

## Host and input styles

Create Room, choose a mode and temporary nickname, then share the join link/code. Guests simply join; they do not need the host's deck.

“I’m playing too” defaults on. The normal room API hides answer keys and other players' input until reveal. A deck author already knows the uploaded content; this is not an anti-cheating system against the deck author or a host inspecting their own upload. Turn the toggle off to facilitate without scoring and see answer keys during spoken rounds.

Phone rounds save private answers after a brief pause, use a server-authoritative deadline, and reveal automatically when time expires. Only received answers count; offline typing cannot extend a deadline. Team Trivia and Survey use one captain per team (first playing person joined). Everyone chooses a team before starting. A captain's answer is visible to teammates, but not opponents.

Spoken rounds let the host judge answers. A playing host judges after reveal; a nonplaying host can record rulings as play happens. Exact answers/explicit alternatives are accepted automatically, ignoring case and punctuation. Other synonyms require a host ruling; fuzzy spelling never automatically awards factual correctness. The host can change points before finalizing. Finalization awards points once.

## First-edition rules

- Trivia: randomized questions, individual points.
- Team Trivia: the same rules with a shared captain answer/team score.
- Clue Board: host selects unused category/value tiles. Everyone answers the selected clue. No buzzer race, wagering, daily doubles or negative scores yet.
- Survey Showdown: private rounds take one answer per team and award that answer's ranked value. A nonplaying spoken host can reveal board entries, record up to three strikes, manage turns/steals aloud, and manually award team points. These are facilitator tools; full face-off/steal automation is not implemented.
- Word Wheel: server chooses spin values; consonants earn value × occurrences, vowels cost 250, wrong guesses lose the turn, solving earns 500. Bankrupt clears that player's session points. No animated wheel, separate round bank or timed final round yet. All players can see the puzzle, and only the current player/nonplaying host controls the turn.

Session totals persist while the room is active. Rooms expire after 15 minutes without meaningful activity, with a two-hour hard maximum. Polling alone does not extend them. Return from the same browser tab to preserve the recovery credential. Room answers are temporary, not permanent history.

## iPhone checks

1. After the release, Settings → Check for Update; close every window of the PWA and reopen. Confirm version 0.14.0.
2. Open Link → Game Decks; create the sample quiz and survey above. Close/reopen and verify they persist. Export their separate backup.
3. Create Trivia with host participation on. Join from another device. Submit an accepted alternative, reveal, change a disputed answer's points, finalize, and continue. Verify keys/opponent answers were hidden before reveal.
4. Repeat with host participation off and spoken input. Verify the host has no score and can judge aloud.
5. In Team Trivia, assign teams and test a third teammate: captain submits, teammate can read but cannot overwrite.
6. In Clue Board, choose a tile, score it, return to the board and verify the tile cannot be replayed.
7. In Survey, test private answer scoring and spoken board reveals/strikes/manual points. Other devices should see revealed board entries.
8. In Word Wheel, select a regular phrase deck. Test spinning, consonants, vowels after earning 250, wrong guesses, exact solve and turn changes.
9. Briefly disconnect/reconnect a guest before the deadline. Verify recovery; late answers must not change scores.
10. Test Categories and existing one-device modes again. Offline, confirm local editors and one-device games work; Link should report the lost connection.

Core rules/content validation are platform-independent TypeScript. The room transport and separate IndexedDB adapter remain small replaceable modules. No Capacitor, authentication, analytics or new hosting service was introduced.
