# Visual polish v1 — 0.31.0
Optional regular-deck color tokens (13 colors plus Default) accompany the existing emoji editor. Absence stays absent. Unknown tokens safely fall back; loading old decks does not assign colors. Current state and regular/complete backups preserve recognized tokens, including duplicates/restores. The IndexedDB database, card IDs and recent memory are unchanged.

`src/rich-visuals.ts` centralizes the palette, badge helpers, mode SVGs and `ENABLE_RICH_VISUALS`. Set that constant to false and rebuild to restore baseline decoration/card plans and stop idle motion; stored colors remain. `public/rich-visuals.css` is isolated and gated by `.rich-visuals`. `src/idle-motion.ts` runs one replaceable timer only on visible Play/Work landing pages, with reduced-motion and interaction resets. It animates one visible icon every 8–15 seconds, with no continuous loop.

Deck badges use generic local stack/circle shapes. Context washes remain faint and retain red/blue/green/purple. Native select menus retain their compact emoji/name presentation. Regular deck colors influence editor decoration and game edges/indicators, not whole screens. Taboo emoji badges get the richer fallback treatment but no new saved color field. Link icons/game engines remain unchanged.

The existing MotionSystem owns all card and result effects; new input cancels old effects rather than queuing. Heads Up Correct/Pass move in opposite directions, including sensor actions. Catchphrase/Taboo changes use 170ms transitions; Taboo Pass reverses direction and violations settle without a flick. Jenga lifts in 200ms. Wild Card keeps the stack draw; Flashcards keeps its original two-part Y flip. Existing result/counter pulses are reused, with added correct/award feedback. No new sounds or confetti.

Reduced motion removes new card plans and idle motion and retains the prior accessibility behavior. Color never replaces names, selection checkmarks, points or outcome text.

Manual device trial:
- Update, close all windows, reopen; check 0.31.0 and offline readiness.
- Inspect Play/Work, Decks and a deck in light/dark mode and larger text.
- Choose a color and save; reopen, duplicate, export and restore to verify it. Default clears it.
- Use Wild Card, Catchphrase, manual/tilt Heads Up, Taboo, 54-card Jenga and Flashcards. Advance rapidly, pause, end and replay; controls/scoring must stay immediate.
- Check landscape safe areas and long prompts/forbidden words.
- Leave a landing page idle for 15 seconds; one visible icon moves subtly. Navigate away/background; no idle effects should continue.
- Enable Reduce Motion and repeat. Verify no new flips/translations/idle effects.
- Repeat cached editing/draws offline. Browser testing cannot replace physical iPhone/Android sensor and performance trials.

Revert: six ordered visual-polish commits on `visual-polish-v1` can be reverted in reverse order, preserving prior unrelated work. A full code revert may drop visual metadata on later saves through old explicit validators, so use the feature flag when retaining saved colors matters. Back up first.

Validation: 159 automated tests pass. Browser checks covered color saving, existing libraries, Work/Play icons, Jenga, Wild Card, Flashcards and Heads Up/Taboo outcomes. Catchphrase rapid-advance check was interrupted by browser-control timeouts; repeat on device. Desktop and portrait layouts were inspected; physical iPhone/Android safe-area, reduced-motion feel, idle timing and landscape performance remain device acceptance checks.


## Expressive v2 — 0.32.0
Separate branch visual-polish-v2 starts from the 0.31.0 checkpoint e72169c. EXPRESSIVE_VISUALS=false restores the restrained v1 profile; ENABLE_RICH_VISUALS=false disables both passes. Color data remains unchanged.
V2 strengthens washes (23% light / 20% dark), mode-card accent rails and tint, 56px library emoji badges, patterned depth and visible card surfaces/edges. Navigation lasts 420ms, cards 440–560ms, flips 520ms, result pulses 560ms and occasional idle movement 700ms. Press feedback remains 180ms. Card input still cancels/replaces animation; no game-state waiting was added. Reduced-motion guards and the single idle timer remain.
Revert this v2 branch's commits to e72169c to restore v1 without reverting unrelated development; a profile switch is simpler.
