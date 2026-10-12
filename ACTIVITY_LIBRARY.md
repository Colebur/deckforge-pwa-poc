# Structured Activities (0.34.0)

Work → Activities is a local library of complete facilitation instructions. It is separate from deck Activities (short `{card}` templates). Decks, Wild Card and existing games remain unchanged. Surprise Me performs the random-discovery workflow on full structured activities without maintaining duplicate prompt cards.

## JSON format
Import a JSON file or paste JSON, review the preview, then Import Valid Activities. Existing entries are never overwritten. Exact normalized content duplicates are skipped, including duplicate rows in the same import; IDs, favorite state and list order do not affect duplicate detection. Matching titles with changed content are flagged for review: Skip (default), Keep both, or Update a selected existing activity. Update replaces its content while retaining its ID and favorite. Keep both creates an independent ID. Same-title variants within one file are flagged too; they can be skipped or kept. Different titles are added normally. Invalid rows are excluded and reported; malformed or newer-format files do not import.

```json
{
  "format": "deckforge-activities",
  "version": 1,
  "activities": [{
    "title": "Collaborative Tower",
    "description": "Take turns building a tower. Pause and plan together if it falls.",
    "purposes": ["cooperation", "rapport-building"],
    "audiences": ["pairs", "whole family"],
    "tags": ["STEM", "cooperative"],
    "minAge": 5,
    "maxAge": 99,
    "duration": 15,
    "materials": "Cups or blocks",
    "preparation": "minimal",
    "adaptations": "Practice a calm restart.",
    "variations": "Build together rather than taking turns."
  }]
}
```

Only title and description are required. Purpose/audience/tags are arrays of flexible strings; other text fields are strings. Ages and duration are nonnegative finite numbers; preparation is `none`, `minimal`, `substantial` or omitted. Optional `id` and `favorite` are supported by exports. Import also accepts a bare array. Files are limited to 5 MB / 5,000 rows; text fields to 12,000 characters, titles to 200, lists to 50 entries of 100 characters. Purpose, audience and tag labels normalize case and repeated spaces. Unknown fields are currently omitted. Add fields to the validator, UI and documented version before relying on them.

The bundled `public/activity-samples.json` contains ten editable examples. Preview 10 Samples loads the same examples without requiring a file or network. Import is explicit, not automatic. Repeating sample import skips unchanged examples.

## Discovery
Search checks title, description and tags. Filters combine (AND); purpose and tag support multiple selections and every selected label must match. Audience selects one value. Case/whitespace variants share a filter option. Age requires a known inclusive minimum/maximum; duration requires a known value at or below the selected maximum. Unspecified metadata is excluded by default; Include unspecified ages / duration opts those records in. No materials needed matches explicit None / No materials / No materials required / Not required values (case-insensitive); an empty materials field is unknown, not none. Clear Filters restores all. Favorites only combines with other filters. Surprise Me uses the full matching pool and avoids the last activity when alternatives exist. The list initially shows 100 results. Show 100 More expands it incrementally; changing filters resets to the first 100. Surprise Me always draws from the full matching pool.

## Storage and privacy
Stored at key `facilitation-activities` in the existing `deckforge-pwa-poc` IndexedDB `state` store. No database version change, account, network request or client profile. Saved content stays local and works offline. Store reusable instructions, never client identifying information. Loading failures do not silently reset saved content. Saving completes before the UI adopts changes.

**Back Up Everything now includes structured Activities**, favorites and metadata in complete backup version 2. Export Activities remains available for sharing just this collection. Complete restore commits Activities alongside decks/settings in the existing IndexedDB transaction and recovery journal. Older complete version 1, regular-deck and Game Deck files that omit Activities keep the current Activities library even when replacing other collections. Add restores skip exact duplicate activities; Replace explicitly replaces the included Activities collection (including an empty list), after the existing confirmation and recovery checkpoint. Old app versions reject new complete backups; update before restoring version 2. Export a file before clearing data or changing devices. Exports preserve metadata and favorites. Imports retain favorites for new entries; duplicate imports preserve existing favorites.

## Device tests
1. Work → Activities → Preview 10 Samples. Inspect preview, import; reopen and confirm ten entries.
2. Search `STEM`, age 7, maximum 15 minutes; Surprise Me should choose a matching example. Try another; no immediate repeat when alternatives exist.
3. Favorite an activity; All Activities → Filters → Favorites only. Reopen to verify persistence.
4. Create an activity with title/instructions and optional fields; edit it, verify reload, then delete via confirmation.
5. Export Activities; import the file again. Preview should skip unchanged duplicates. Change a description externally and preview a new entry.
6. Import an array with a valid row and a row missing description. Confirm the problem is listed and only the valid row imports. Malformed JSON should leave content unchanged.
7. Test unspecified age/duration behavior; Clear Filters; no-match Surprise Me should explain the empty result.
8. After the PWA reports cached offline readiness, close, enable airplane mode and reopen. Browse, filter, create, favorite and reopen again.
9. Check Work back navigation, larger text, VoiceOver labels, portrait/landscape and long instructions. Check Play/Decks and existing games still work.

Platform-neutral filtering/import/randomization lives in `activity-library.ts`; web persistence and sharing remain at their existing boundaries. `activity-library-ui.ts` is a small mounted screen with listener cleanup. No speculative Capacitor or backend layer was added. These refinements retain platform-neutral helpers and the existing persistence boundary; no new dependencies. Future optional work could add undo for activity edits or richer materials metadata, but is not included here.

## Refinement acceptance checks
- Import over 100 distinct activities; Show 100 More reveals later entries and search still finds them.
- Import case variants of audience/tags; verify each label appears once in filters.
- Select two purposes and two tags; only activities matching all selections remain. Toggle No materials needed and Include unspecified ages / duration.
- Reimport a modified same-title activity. Inspect old/new instructions and metadata; Skip should retain the old one. Update should keep its favorite and replace its content. Keep both should add a separate entry.
- Export Back Up Everything and verify structured Activities count in restore preview. Add should skip exact activity duplicates; Replace and Complete local recovery should restore their respective Activities snapshots. Test replacement using disposable data or a saved backup.
- Restore an older backup and verify Activities remain intact. Repeat browsing and editing offline after caching.
