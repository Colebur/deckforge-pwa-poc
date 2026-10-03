# Complete backups and friendlier Game Deck editing — 0.19.0

## Back Up Everything

Decks → Backups → Back Up Everything exports one JSON file containing:

- Regular cards, including optional backs, ordered Activities and deck organization.
- Taboo decks and forbidden words.
- Rich Game Deck questions, aliases, categories and point values.
- Saved teams/timers and persisted reading/backup preferences.

No room credentials, room history, player drafts, or transient session settings are exported. The app never uploads a backup automatically. Save the file in Files or another safe location, then confirm saving it. Copy backup text is an alternative if sharing/downloading is unavailable.

Restore validates the entire file and previews included collections before any write. Add copies is the default: it creates independent IDs and preserves current settings. Replace included content requires acknowledgment; complete files replace all included collections and settings. Older regular-library files leave Game Decks and reading preferences alone; older Game Deck files leave regular/Taboo decks and settings alone. Individual collection exports remain available.

The new complete format is `deckforge-complete-backup`, version 1, with a 20 MB limit. Earlier app versions cannot import it; update first. Existing legacy library formats and Game Deck format 1 remain supported. Neither existing database is relocated or upgraded.

A complete local checkpoint is saved before import. Because the two databases cannot share one transaction, a pending-restore journal retains the original snapshot until both saves complete. Write failure rolls back, and reopening repairs an interrupted restore before loading the library. The checkpoint can be previewed under Complete local recovery. It is on the same device and cannot survive clearing site data. Close other app windows before importing to avoid concurrent edits.

## Labeled Game Deck editor

Open Decks → Game Decks. Choose an existing deck or create Trivia/Survey. Enter a name, Add Card, fill the labeled fields, then Apply Card. Apply updates the draft; Save Deck commits it locally. Cancel Deck Changes discards the draft. Cards can be reordered or removed before saving.

Trivia fields: question, category, points, accepted answer and optional alternatives (one per line). Survey fields: prompt/category and 1–8 ranked answers, each with points and up to eight alternatives. The host can still accept close wording during game review. No grading rules changed.

Bulk Edit / Paste keeps the existing line syntax. Applying bulk text replaces the draft cards, then Save Deck commits them. If existing cards cannot roundtrip through that format without losing text or values, use labeled fields; the editor prevents lossy conversion. JSON backups always retain full content.

## iPhone tests

1. Update in Settings, close all app windows, reopen, and confirm 0.19.0/offline Ready.
2. Create a small Trivia deck with two cards using labeled fields. Add an alternative and custom points. Apply each card, reorder, Save Deck, reopen and verify every value.
3. Create a Survey card with two ranked answers/points; apply/save/reopen. Try removing one answer from the draft and Cancel to verify the saved deck remains unchanged.
4. Try bulk edit with ordinary cards; apply a small list and save. Verify invalid duplicate alternatives or invalid points show an error without saving.
5. Export Back Up Everything to Files. Confirm the file exists and choose it under Restore. Check every collection and settings in the preview; cancel without importing into your main library if you do not want duplicates.
6. On a separate test installation, Add copies. Confirm existing decks/settings remain. Reopen and check backs, Activities, Taboo cards and Game Deck fields. Test Replace only after saving a separate backup; review Complete local recovery afterward.
7. Restore an older regular-library or Game Deck backup on the test installation. Confirm collections absent from that file stay intact.
8. Once offline Ready, repeat editor saves, reopen and export offline. Link still needs internet.

Automated checks cover content roundtrip, safe defaults, legacy formats, rejected files, and interrupted-write recovery. Physical Files/share-sheet and offline cold-launch behavior must be verified on the device.
