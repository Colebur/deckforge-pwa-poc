# Trivia from two-sided library decks

Version 0.17.0 lets individual Link Trivia use regular library cards: Front is the question and Back is the accepted answer. This is a session adapter, not a separate deck library. Flashcards compatibility does not need to be enabled.

## Try it

1. Open Settings, check for an update, then close every app window and reopen when the update is ready. Confirm version 0.17.0.
2. In Decks, create or open a regular deck. Add at least two cards with Front and Back. Leave another card without a Back.
3. In Link, create a Trivia room. Under Game deck, choose the deck in Two-sided library decks. Check the usable/skipped counts.
4. Choose whether the host is playing, the answer method, and the answer time. Have another device join, then start.
5. Confirm only the Front is shown during answering when the host is playing. Submit an answer, reveal, and confirm the Back appears as the accepted answer.
6. Try close wording. It may receive zero automatically; the host can award 1 point with Save Ruling, then Finalize Scores.
7. Finish the questions. Check that the original deck and its Flashcards review still work unchanged.
8. Create another Trivia room using an existing richer Game deck; its answer aliases and point values should still work.

## Rules and limits

- Each usable library card is worth 1 point. Up to 25 are chosen randomly for a session.
- Blank backs, questions over 300 characters, answers over 120 characters, empty questions, and answers without letters or numbers are skipped. Text is never truncated or invented.
- Back is one literal accepted answer. Case/punctuation normalization is automatic; semantic synonyms require host review. For aliases or custom point values, use a richer Game deck.
- One-sided decks remain visible but disabled if they have no usable questions.
- Team Trivia and other Link modes retain their existing sources.
- Only selected question/answer pairs are uploaded to the temporary room. The original local deck is unchanged. Link requires internet; local Flashcards and the rest of the offline app retain their existing behavior.

## Architecture

`src/library-quiz.ts` is a platform-independent adapter to the existing validated Trivia question format. `src/party-ui.ts` groups the source picker; `src/multiplayer.ts` chooses the source and uses the existing room API. `src/app.ts` passes the universal deck library into Link.

There is no storage migration, new database, new backend endpoint, or native project change. The existing answer-key privacy, host review, reconnection, and Trivia TV View apply to these questions too.
