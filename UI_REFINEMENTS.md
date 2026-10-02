# Navigation and layout refinements — 0.18.0

- Deck Library has no root back arrow. Individual editors retain their back navigation.
- Regular and Taboo editors put duplicate checking inside Deck options.
- Link has its own green accent in light and dark appearance.
- A shared full-height shell uses the dynamic viewport and existing safe-area padding. Short screens fill the display; content can still scroll when needed.
- Flashcards physically rotate out, switch sides edge-on, then rotate in. Repeated study actions are ignored during the brief flip; leaving the screen cancels it. Reduce Motion switches sides immediately.
- Short landscape Flashcards screens place the card beside controls. Tablet layouts use a wider content column; TV View retains its 16:9 canvas. No fixed phone aspect ratio is enforced on ordinary screens.
- Game Decks now live under Decks → More Deck Tools, alongside Taboo Decks. Link setup retains Create / Edit Game Decks as a shortcut. Return to Link and Resume a Room to continue setup after using that shortcut.

Game Deck storage and its separate export/import format remain unchanged. Regular library backups still do not include Game Decks; use Export Game Decks for those. No migration, server change, new mode or native project change is required.

## Device checks

1. In Settings, check for an update. Close all app windows and reopen; confirm 0.18.0.
2. Open Decks. Confirm no back arrow. Open a regular deck and expand Deck options, then Check duplicate prompts. Repeat with a Taboo deck if available.
3. Open Game Decks from Decks. Confirm saved decks appear, editing/saving works, and both back controls return to Deck Library. Test its separate backup if needed.
4. Open Link. Confirm green controls and no standalone Game Decks button on the landing screen. Create a room; verify the setup shortcut opens Decks and the saved room can be resumed afterward.
5. In Work → Flashcards, tap the card and Flip. Try Next/Previous/Shuffle after flipping. Enable your device's Reduce Motion and confirm the side changes without rotation.
6. Check Play, Work, Link, and Flashcards in portrait and landscape. Run Headbands from both Play and Work and confirm the prompt and bottom controls fill the play area.
7. On a tablet or other phone, check readable text, reachable controls and no horizontal overflow. Very short screens and long content intentionally scroll rather than clipping controls.
8. Confirm local decks and Flashcards remain available offline. Link still requires internet.

Browser viewport checks are useful but do not reproduce every iOS/Android browser toolbar, notch, accessibility setting or motion sensor. Verify those on physical devices.
