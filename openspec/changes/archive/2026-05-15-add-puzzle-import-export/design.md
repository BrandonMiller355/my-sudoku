## Context

Game state is persisted to IndexedDB via Dexie (`storageService.ts`) and is device-local. Puzzles are statically bundled (`puzzleService.ts`) and identified by ID (e.g. `"easy-0001"`). The `GameState` type already captures everything needed for full session restoration: `grid` (values + notes), `elapsedSeconds`, `isPaused`, `inputMode`, `undoStack`, `redoStack`, and `puzzleId`. The solution is not stored in `GameState` — it is derived at runtime by `getPuzzleById(puzzleId)`.

## Goals / Non-Goals

**Goals:**
- Export full in-progress puzzle state to a versioned JSON file (browser download).
- Import a previously exported file, validate its shape, and restore game state exactly.
- Support future format evolution via a `version` field.
- Embed puzzle givens in the export for cross-device validation.
- Include undo/redo stacks so gameplay history is fully portable.

**Non-Goals:**
- Cloud sync, user accounts, or remote storage.
- Sharing between users who have different app versions with different puzzle sets (version mismatch yields a clear error, not silent degradation).
- Importing puzzles that don't exist in the local bundled puzzle set (the solution must be derivable locally).
- Compressing or encrypting the export file.

## Decisions

### 1. New `src/importExportService.ts` module

**Decision:** Extract all serialization, deserialization, and validation into a dedicated module rather than adding to `App.tsx` or `storageService.ts`.

**Rationale:** `storageService.ts` is scoped to IndexedDB persistence. Import/export is a distinct concern (file I/O + schema validation). Keeping it separate avoids coupling and makes both modules easier to test in isolation.

**Alternative considered:** Add helpers directly to `storageService.ts`. Rejected because that module's responsibility is already well-defined (IndexedDB) and mixing in file I/O would dilute it.

---

### 2. Export format — embed puzzle givens, require known puzzle ID on import

**Decision:** The export embeds the puzzle's givens array and metadata (id, difficulty, source). On import, the app looks up the puzzle by ID and cross-validates the embedded givens match. If the puzzle ID is not found locally, import fails with a clear error.

**Rationale:** The solution is computed from the bundled puzzle data, not stored in `GameState`. For completion-checking to work after import, the puzzle must exist in the local bundle. Embedding givens allows the validator to detect ID collisions or data corruption without trusting the ID alone.

**Alternative considered:** Embed the full solution in the export and allow importing puzzles not in the local bundle. Rejected because it would require the app to handle a "foreign" puzzle object (no difficulty, no source integration) and complicates the `getPuzzleById` dependency chain throughout `App.tsx`.

---

### 3. Export format shape (version 1)

```json
{
  "version": 1,
  "exportedAt": "<ISO timestamp>",
  "puzzle": {
    "id": "easy-0001",
    "difficulty": "Easy",
    "source": "initial-set",
    "givens": [5, 3, 0, 0, 7, 0, ...]
  },
  "state": {
    "elapsedSeconds": 120,
    "isPaused": false,
    "inputMode": "answer",
    "grid": [
      { "index": 0, "given": true, "value": 5, "notes": [] },
      ...
    ],
    "undoStack": [...],
    "redoStack": [...]
  }
}
```

`givens` uses `0` for empty cells (matches existing `puzzle.puzzle` format where `null` represents empty — the export converts `null → 0` for JSON cleanliness and converts back on import).

---

### 4. Export/Import UI — game header icon button; Import also on main menu

**Decision:** A single icon button with an upward arrow (↑) is placed in the game header immediately next to the dark-mode toggle on the right side. The timer remains centered between the menu button and the header icons. Clicking the export button triggers a download of the current puzzle state. Import is a button on the main menu screen (not in the new-game sub-menu), since importing replaces the active game and belongs in a session-start context.

**Rationale:** The header placement keeps export always accessible during play without requiring the user to open a modal. The upward-arrow icon represents uploading/exporting the file to storage. Positioning it immediately adjacent to the dark-mode toggle keeps all session-control icons grouped on the right, with the timer prominent at center. Import stays on the menu because it is a session-start action — replacing a game mid-session from within the game screen would be confusing.

**Alternative considered:** Export inside the Advanced panel modal. Rejected — too buried for an action users may want frequently.

**Header Layout:** Menu Button (left) | Timer (centered) | Export Button + Dark Mode Toggle (right, adjacent)

---

### 5. Include undo/redo stacks in the export

**Decision:** `undoStack` and `redoStack` are included verbatim.

**Rationale:** The user explicitly asked for "any other state necessary to restore the puzzle exactly." Undo history is part of that. The stacks are bounded by game length (at most 81 moves for values + notes) and their total size is negligible in a JSON file.

**Alternative considered:** Omit stacks to reduce file size. Rejected — keeping history is the right default for exact restoration, and the size concern is not material.

---

### 6. Validation strategy

The validator checks:
1. `version` is a known integer (currently: `1`).
2. `puzzle.id` exists in the local bundle and its givens match.
3. `state.grid` is a 81-element array with required fields (`index`, `given`, `value`, `notes`).
4. `state.elapsedSeconds` is a non-negative integer.
5. `state.isPaused` is present with correct type.

On failure, a human-readable error string is returned and displayed to the user. No partial application — it's all-or-nothing.

## Risks / Trade-offs

- **Puzzle ID version mismatch** — If a future app version adds puzzle `"easy-0002"` and a user imports that file into an older version without it, the import will fail with a clear error. This is acceptable; no silent corruption. → *Mitigation: clear error message explaining the file may be from a newer version.*
- **Large undo stacks on very long games** — The JSON file could reach tens of KB. → *No mitigation needed; this is not a practical concern for a Sudoku game.*
- **Import replaces unsaved in-progress game** — The user must confirm before importing. The current game state is written to IndexedDB on every move, so they can always "Continue" if they cancel. A post-import cancel path (restoring the previous game) is out of scope; the confirmation dialog is the safeguard. → *Mitigation: confirmation dialog with explicit warning.*
- **`workflowMode` and `selectedCellIndex` not exported** — These are UI-only transient state (selection resets naturally on game load). → *No mitigation; these fields reset on every game start already.*

## Migration Plan

Purely additive. No IndexedDB schema changes. Existing `GameState` storage is unchanged. Rollout: ship feature, done. No rollback concerns.

## Open Questions

_(none)_
