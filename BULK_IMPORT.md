# Bulk Add · 0.20.0

Open Decks → a regular deck → Bulk Add. Paste text or choose a TXT/CSV file. Files are read locally using File.text(); this feature makes no upload or network request. Imports append to the selected deck only after confirmation.

- Plain paste and TXT: each non-empty line becomes one card. Existing numbered/bulleted prefix cleanup remains.
- Tab-separated paste: Front followed by a tab and optional Back. Mixed one-sided rows are supported. More than two columns is flagged; use a CSV file for column mapping.
- CSV: comma-separated columns, optional quoted values, quoted commas, escaped double quotes, multiline fields and Unicode. Obvious Front/Back, Term/Definition and Question/Answer headers are recognized, including reversed columns.
- CSV columns: choose Front, optional Back (None makes one-sided cards), and whether the first row is a header. Only selected columns are imported; other columns are ignored. Unrecognized headers need manual mapping.

Whitespace is trimmed, completely empty rows are ignored, and empty backs remain optional. A non-empty row without a Front is an error. Parsing/validation problems block the entire batch; nothing is partially saved. The preview shows counts, sidedness, duplicates and up to eight examples. Cancel saves nothing. Editing text invalidates the preview and resets column mapping; use Review Import again. Use Pasted Text Instead to switch from file mode back to normal paste detection.

Optional Skip duplicates compares both Front and Back for regular cards, ignoring case and outer whitespace. Different definitions for the same Front remain distinct. IDs are created by the existing save path, and card order is preserved. Activities and Taboo retain their existing paste formats. This adds no new deck type, database or migration.

Files should be UTF-8, with .txt or .csv extension, and smaller than 20 MB. Semicolon-delimited spreadsheets must be exported as comma-separated CSV. No XLSX, PDF, DOCX or additional JSON import is provided here; existing backup tools are unchanged.

## Device checks

1. Update to 0.20.0, fully close/reopen, then create a test deck.
2. Bulk Add: paste numbered/bulleted words with blank lines. Review the count; Cancel and verify no cards were added. Repeat and Import Cards.
3. Paste two spreadsheet columns separated by tabs. Confirm Front/Back examples, import, and open a card to verify its Back. Include one row with no Back.
4. Choose a TXT file from Files with several words and empty lines. Verify one-sided counts and prefix cleanup.
5. Choose CSV with Term,Definition (or Front,Back / Question,Answer). Check the header was skipped. Include a quoted comma, quote and multiline field.
6. Choose a CSV with unfamiliar headers/extra columns. Check First row is a header, map Front and Back explicitly, and verify the preview. Try Back → None.
7. Try a missing Front or an unclosed quote: Import Cards should be disabled and no cards should be added.
8. Import the same content with Skip duplicates. A card with a different Back should remain distinct.
9. Close/reopen: both sides and old cards should persist. Assign Flashcards and flip imported cards; use a regular mode and confirm it shows only Front.
10. After offline caching is ready, repeat local paste and a TXT/CSV file stored on the device in Airplane Mode. Cloud-only files may need downloading first.

Validation: 122 automated tests pass, including a 2,000-card persistence round trip. Browser checks cover CSV header detection, custom mapping, TSV, TXT, missing-front blocking, Cancel, existing card editing and reload. Physical iPhone Files picker and offline cold launch require device checks.
