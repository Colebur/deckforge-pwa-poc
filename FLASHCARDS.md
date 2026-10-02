# Flashcards

Flashcards is a manual study mode under Work. It uses the universal deck library and Work blue styling.

## Make a study deck

1. Open Decks and create a deck, or open an existing deck.
2. Expand Deck organization. Under Available in, check Flashcards and tap Save Organization. Best suited for Work is optional; context affects recommendations only.
3. Add or edit a card. Front is the existing word/prompt field. Back is an optional answer/definition.
4. Save the card. Assigned Flashcards decks show a back preview in their card list. Bulk Paste continues importing front text, one card per line; add backs through the card editor.

## Study

1. Open Work → Flashcards.
2. Choose a compatible deck. Show All Decks also allows trying unassigned, nonempty regular decks.
3. Choose Front → Back or Back → Front, then Start Studying.
4. Tap the card or Flip to reveal the opposite side. Previous and Next navigate without wrapping and reset each card to the chosen first side. Progress is the current position in the review order.
5. Shuffle resets review to position one with a shuffled session order; it never changes the stored deck/card order.
6. Change Deck or Direction returns to setup for a new session. Leaving the mode/reloading ends the review session. Deck content remains saved.

A missing/blank back displays “No back added”; the front remains available by flipping. No answers are generated. Flip animation respects reduced-motion preferences. Card and Flip controls support native keyboard/button activation.

## Data and architecture

Card remains `{id, text, back?}`: `text` is Front and `back` is optional. Other games continue consuming `text`. Cards and Activities retain their existing IDs and order. No separate database is introduced.

State/backups advance from format 6 to 7 so an older app will refuse newer data rather than discard backs. Formats 1–6 still load, and existing mode assignments remain unchanged. Flashcards is opt-in for both new and existing decks. Saving, backup export/import, deck copying, and local recovery preserve backs. IndexedDB database/store names stay unchanged; there is no destructive migration.

The small session class is independent of browser APIs. UI, animation and persistence adapters stay separate. The service worker precaches both new modules through the existing build process.

## iPhone acceptance test

1. Settings → Check for Update. Close every DeckForge window (Safari and Home Screen), then reopen. Confirm version 0.16.0. Existing decks should remain present.
2. Confirm Flashcards appears under Work and is absent from Play.
3. Create a test deck. Assign Flashcards under Deck organization → Available in and save.
4. Add three cards: two with fronts/backs, one with only a front. Close/reopen the app; open the editor and verify both saved sides and the compatibility checkbox.
5. Work → Flashcards → choose that deck → Front → Back → Start Studying. Verify the front appears first; tap the card to show the back; use Flip to return.
6. Next should show the next front and progress 2 / 3. Previous returns to the prior front. The first Previous and final Next are disabled.
7. Flip the one-sided card: verify “No back added.” Shuffle and review all three positions; every card remains available. Check the editor afterward to confirm original deck order.
8. Change Deck or Direction → Back → Front → Start Studying. Verify backs appear first and Flip shows fronts. A missing back should still allow flipping to its front.
9. Try Show All Decks with an old one-sided deck. Confirm safe review without changing its assignments.
10. Open a previously working game (Prompt Picker or Catchphrase) with the test deck or an existing deck. Verify it displays only the normal front prompt.
11. Export a library backup, then import using Add copies. Verify the copied backs; do not use Replace for this test.
12. After loading online, enable Airplane Mode and reopen the Home Screen app. Test flipping, navigation and reopening the editor. Rotate portrait/landscape and check readable text and reachable controls.

Browser/automated checks cannot confirm physical iPhone Home Screen, Airplane Mode or VoiceOver behavior; those checks remain device acceptance tests. This version adds no grading, mastery tracking or spaced repetition.
