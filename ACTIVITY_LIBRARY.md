# Structured Activities (0.33.0)

Work → Activities is a local library of complete facilitation instructions. It is separate from deck Activities (short `{card}` templates). Decks, Wild Card and existing games remain unchanged. Surprise Me performs the random-discovery workflow on full structured activities without maintaining duplicate prompt cards.

## JSON format
Import a JSON file or paste JSON, review the preview, then Import Valid Activities. Existing entries are never overwritten. Exact normalized content duplicates are skipped, including duplicate rows in the same import; IDs and favorite state do not affect duplicate detection. Changed instructions are treated as a new activity. Every added entry receives an independent ID. Invalid rows are excluded and reported; malformed or newer-format files do not import.

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

Only title and description are required. Purpose/audience/tags are arrays of flexible strings; other text fields are strings. Ages and duration are nonnegative finite numbers; preparation is `none`, `minimal`, `substantial` or omitted. Optional `id` and `favorite` are supported by exports. Import also accepts a bare array. Files are limited to 5 MB / 5,000 rows; text fields to 12,000 characters, titles to 200, lists to 50 entries of 100 characters. Unknown fields are currently omitted. Add fields to the validator, UI and documented version before relying on them.

The bundled `public/activity-samples.json` contains ten editable examples. Preview 10 Samples loads the same examples without requiring a file or network. Import is explicit, not automatic. Repeating sample import skips unchanged examples.

## Discovery
Search checks title, description and tags. Filters combine (AND); purpose, audience and tag each select one matching value from the flexible lists. Age requires a known inclusive minimum/maximum; duration requires a known value at or below the selected maximum. Unspecified metadata is excluded by those filters. Clear Filters restores all. Favorites only combines with other filters. Surprise Me uses the full matching pool and avoids the last activity when alternatives exist. The list shows at most 100 results to keep large collections responsive; narrow a search to find later entries.

## Storage and privacy
Stored at key `facilitation-activities` in the existing `deckforge-pwa-poc` IndexedDB `state` store. No database version change, account, network request or client profile. Saved content stays local and works offline. Store reusable instructions, never client identifying information. Loading failures do not silently reset saved content. Saving completes before the UI adopts changes.

**Export Activities is a separate backup. Back Up Everything currently covers existing deck/settings collections and does not include this library.** Export activities separately before deleting site data or changing devices. Exports preserve metadata and favorites. Imports retain favorites for new entries; duplicate imports preserve existing favorites.

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

Platform-neutral filtering/import/randomization lives in `activity-library.ts`; web persistence and sharing remain at their existing boundaries. `activity-library-ui.ts` is a small mounted screen with listener cleanup. No speculative Capacitor or backend layer was added. A future cleanup could add Activities to complete backups transactionally and paginate beyond 100 results; neither is implemented by this milestone.
