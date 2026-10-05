# Recent Card Memory

Randomized single-device modes can remember the most recently shown cards across sessions. In Decks, open a deck and expand **Deck options** to change **Recent Card Memory** or choose **Reset Recent Cards**. Memory starts on for every deck. Reset asks for confirmation and affects that deck only.

## How it works

- The rolling window stores the newest unique card IDs, capped at half the current deck size, rounded down. An 11-card deck remembers 5; a 2-card deck remembers 1. A singleton remains playable without a history window.
- Each draw first respects the mode's eligible cards and its immediate-repeat protection. It randomly chooses a fresh eligible card whenever possible, falling back to eligible recent cards only when necessary.
- Cards enter history when they become the displayed/current prompt. Selecting a deck, preparing a pool, pausing, rerendering, or rereading results does not record a draw.
- Catchphrase keeps its bag across team rounds and refills when exhausted. Headbands and Taboo still exhaust the deck without repeating within a round.
- Prompt Picker preserves each card's source deck and gives selected decks equal probability regardless of card count. Only the chosen deck's history changes. Charades/Pictionary uses this same Prompt Picker flow.
- Flashcards and Jenga, including Jenga's Random button, do not read or update recent memory. Link's server-controlled games and category history retain their existing rules.
- Turning memory off ignores its stored history and stops recording draws. Turning it back on resumes the remembered window. Reset clears it, without changing the toggle.
- Deleted cards/decks are pruned on startup and content edits/restores. Added cards are fresh; copied/imported decks with new IDs start fresh. Duplicate prompt text with distinct card IDs counts as distinct cards.

## Storage and architecture

`RecentCards`, `chooseCard`, and `RandomCardBag` in `src/recent-cards.ts` are platform-independent. Games receive an optional `DrawMemory` adapter, so another platform can provide persistence without changing game rules.

The existing IndexedDB database (`deckforge-pwa-poc`, `state` store) holds a separate `recent-cards` key, with a versioned per-deck map of enabled flags and card ID arrays. No card text is copied, no network calls occur, and no database/schema migration is required. Deck content and recovery copies are not rewritten for gameplay. This device-local usage state is intentionally excluded from content backup/export files.

Writes are queued in draw order. Storage errors are reported; deck data is not replaced or cleared. A failed history load leaves deck editing/gameplay usable and disables history settings until reopening succeeds. Like existing local data, history disappears if browser/site data is cleared. Concurrent windows maintain separate in-memory views; use one active gameplay window for consistent history.

## Device checks

1. Use a 6-card deck with distinct words. Confirm memory is on and reset it. Selecting the deck without drawing should leave the count at zero.
2. Draw three prompts in Prompt Picker, then close/reopen. The deck should remember three cards. In a new session, the next draw should avoid those three; the window stays capped at three as you continue.
3. Start Catchphrase and Headbands with the same deck. They should respect the shared recent history. Headbands still uses each card once; Catchphrase can repeat after its bag runs out.
4. Choose differently sized decks in Prompt Picker. Both remain eligible with balanced deck selection; each remembers only its own draws.
5. Turn memory off, draw, and reopen: the setting should stay off and the count should stay unchanged. Turn on again. Cancel reset first (history stays), then confirm reset (that deck becomes fresh).
6. Check singleton/empty decks, add/delete cards, and ensure existing Flashcards/Jenga remain unchanged.
7. Repeat draws/reopening offline. On a device, file/site storage is independent from other installations.
