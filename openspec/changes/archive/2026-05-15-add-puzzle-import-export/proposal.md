## Why

Players sometimes want to continue a puzzle on a different device, share a puzzle-in-progress with someone else, or keep a backup of a tricky position — none of which are possible today because game state is locked in `localStorage`. Adding JSON-based import/export gives users a lightweight, portable escape hatch without requiring accounts or cloud sync.

## What Changes

- **New Export action** as an upward-arrow icon button in the game header, positioned immediately next to the dark mode toggle on the right side, with the timer remaining centered: serializes the full current puzzle state (givens, filled values, pencil marks, timer, pause state, difficulty, puzzle ID/source, undo/redo stacks) to a versioned JSON file and triggers a browser download.
- **New Import action** on the main menu: accepts a `.json` file, validates its shape and version, and replaces the current game state after user confirmation.
- **New `PuzzleExport` type** describing the JSON schema, including a `version` field for forward compatibility.
- **Validation logic** that checks required fields and structural integrity before applying an import, surfacing clear error messages for malformed or unsupported files.

## Capabilities

### New Capabilities

- `puzzle-import-export`: Export current puzzle state to a versioned JSON file and import it back to restore an exact game session (grid values, notes, timer, pause state, difficulty, puzzle metadata, undo/redo history).

### Modified Capabilities

_(none — no existing spec-level behavior changes)_

## Impact

- **`src/types.ts`** — add `PuzzleExport` type.
- **`src/App.tsx`** — add export icon button to the game header; add import handler and file-picker UI on the menu screen.
- **`src/storageService.ts`** or a new `src/importExportService.ts` — serialization, deserialization, and validation helpers.
- No new dependencies required (browser `Blob`/`URL.createObjectURL` for download; `FileReader` or `<input type="file">` for upload).
- No breaking changes to existing storage format or puzzle data.
