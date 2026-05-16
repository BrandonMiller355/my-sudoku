## 1. Types

- [x] 1.1 Add `PuzzleExport` type to `src/types.ts` with fields: `version`, `exportedAt`, `puzzle` (id, difficulty, source, givens), and `state` (elapsedSeconds, isPaused, inputMode, grid, undoStack, redoStack)

## 2. Import/Export Service

- [x] 2.1 Create `src/importExportService.ts` with an `exportGame(game: GameState, puzzle: Puzzle): PuzzleExport` function that serializes game state into the v1 format (converting `null` givens to `0`)
- [x] 2.2 Add `downloadExport(exportData: PuzzleExport, puzzleId: string): void` function that serializes to JSON, creates a `Blob`, and triggers a browser download named `sudoku-<puzzleId>-<YYYY-MM-DD>.json`
- [x] 2.3 Add `validateAndParseImport(json: unknown): { ok: true; data: PuzzleExport } | { ok: false; error: string }` function that checks version, top-level structure, grid length (81), required cell fields, and numeric types
- [x] 2.4 Add `resolveImportedPuzzle(data: PuzzleExport): { ok: true; puzzle: Puzzle } | { ok: false; error: string }` function that looks up the puzzle by ID and cross-validates embedded givens against the local bundle

## 3. Restore Game State from Import

- [x] 3.1 Add `buildGameStateFromImport(data: PuzzleExport, puzzle: Puzzle): GameState` function in `importExportService.ts` that reconstructs a full `GameState` (resetting `selectedCellIndex`, `selectedNumber`, `workflowMode` to defaults, preserving all other imported fields)

## 4. Export UI (Game Header)

- [x] 4.1 In `App.tsx`, add a download icon button to the game header, positioned to the left of the dark-mode toggle, using the same `h-10 w-10` rounded-full style as the other header icon buttons
- [x] 4.2 Wire the button to call `exportGame` + `downloadExport` from the import/export service; button is always visible while a game is active

## 5. Import UI (Main Menu)

- [x] 5.1 In `App.tsx`, add an Import button to the main menu (alongside Continue / New Game)
- [x] 5.2 Wire the Import button to open a hidden `<input type="file" accept=".json">` and read the selected file with `FileReader`
- [x] 5.3 On file load: call `validateAndParseImport` and `resolveImportedPuzzle`; display error messages in the existing `message` state if validation fails
- [x] 5.4 On successful validation: show a confirmation dialog ("Import this puzzle? Your current game will be replaced."); on confirm, call `buildGameStateFromImport`, set it as the active game via `setGame`, persist it with `saveActiveGame`, and navigate to the game screen
- [x] 5.5 Ensure the file input is reset after each use so the same file can be re-selected if needed

## 6. Verification

- [x] 6.1 Export a mid-game puzzle, reload the page, import the file, and confirm grid, timer, notes, and undo/redo are restored exactly
- [x] 6.2 Attempt to import a file with a missing `version` field and confirm a user-visible error is shown without altering the current game
- [x] 6.3 Attempt to import a file with a puzzle ID not in the local bundle and confirm a clear error message is shown
- [x] 6.4 Attempt to import a file with a corrupted `state.grid` (wrong length) and confirm the error message is shown
- [x] 6.5 Export while timer is paused and confirm `isPaused: true` is in the file; import it and confirm the game starts paused
