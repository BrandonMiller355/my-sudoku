## ADDED Requirements

### Requirement: Export current puzzle state to a file
The system SHALL allow the user to export the current in-progress puzzle state as a JSON file download. The exported file SHALL contain all information necessary to restore the session exactly: puzzle metadata (id, difficulty, source, givens), filled-in cell values, pencil marks (notes), elapsed timer, pause state, input mode, and undo/redo history. The export file SHALL include a `version` field set to `1` and an `exportedAt` ISO timestamp.

#### Scenario: Export produces a downloadable JSON file
- **WHEN** the user clicks the Export icon button in the game header
- **THEN** the browser downloads a `.json` file named `sudoku-<puzzleId>-<date>.json`
- **THEN** the file contains `version`, `exportedAt`, `puzzle`, and `state` fields at the top level

#### Scenario: Exported file includes full grid state
- **WHEN** the user exports a puzzle with some cells filled and some pencil marks set
- **THEN** the exported `state.grid` array contains 81 entries, each with `index`, `given`, `value`, and `notes` fields
- **THEN** filled-in values and notes match the current board exactly

#### Scenario: Exported file includes timer and pause state
- **WHEN** the user exports while the timer is running at 3 minutes 42 seconds
- **THEN** `state.elapsedSeconds` is `222`
- **THEN** `state.isPaused` is `false`

#### Scenario: Exported file includes undo and redo history
- **WHEN** the user exports after making several moves and undoing some
- **THEN** `state.undoStack` and `state.redoStack` are present and match the current undo/redo queues

#### Scenario: Exported file includes puzzle metadata
- **WHEN** the user exports a Hard puzzle with id "hard-0001"
- **THEN** `puzzle.id` is `"hard-0001"`, `puzzle.difficulty` is `"Hard"`, and `puzzle.givens` is the 81-element array of the original puzzle (0 for empty cells)

#### Scenario: Export button positioning and icon
- **WHEN** the game screen is displayed with an active puzzle
- **THEN** the Export button is positioned immediately next to (to the left of) the dark-mode toggle on the right side of the header
- **THEN** the Export button displays an upward-arrow (↑) icon representing the export/upload action
- **THEN** the timer remains centered in the header between the menu button and the header icons

#### Scenario: Export button is only shown during an active game
- **WHEN** there is no active in-progress puzzle (e.g. the menu screen is shown)
- **THEN** the Export icon button is not visible in the header

---

### Requirement: Import puzzle state from a file
The system SHALL allow the user to import a previously exported `.json` file from the main menu. Before replacing any game state, the system SHALL validate the file's structure and version. On successful import, the current active game SHALL be replaced with the imported state and the user SHALL be taken to the game screen.

#### Scenario: Import replaces active game after confirmation
- **WHEN** the user selects a valid export file on the main menu
- **THEN** the system shows a confirmation dialog warning that the current game will be replaced
- **WHEN** the user confirms
- **THEN** the imported game state is loaded and the game screen is shown

#### Scenario: Import is cancelled
- **WHEN** the user selects a valid export file but dismisses the confirmation dialog
- **THEN** the current game state is unchanged

#### Scenario: Import restores grid, timer, and notes exactly
- **WHEN** the user imports a valid export file
- **THEN** the board shows the same filled values, pencil marks, elapsed time, and pause state as when the file was exported

#### Scenario: Import restores undo and redo history
- **WHEN** the user imports a valid export file containing undo/redo stacks
- **THEN** Undo and Redo buttons are enabled/disabled to match the imported history

---

### Requirement: Validate import file before applying
The system SHALL validate an imported file before applying it to the game state. Validation SHALL reject files that fail any of the following checks, and SHALL display a human-readable error message to the user without altering the current game state.

#### Scenario: Reject file with unknown or missing version
- **WHEN** the user imports a file where `version` is missing or not a recognized integer
- **THEN** import is rejected with an error message indicating the file is unsupported or may be from a newer version of the app

#### Scenario: Reject file with unrecognized puzzle ID
- **WHEN** the user imports a file where `puzzle.id` does not match any puzzle in the local bundle
- **THEN** import is rejected with an error message indicating the puzzle is not available on this device

#### Scenario: Reject file with mismatched givens
- **WHEN** the user imports a file where `puzzle.givens` does not match the givens of the locally known puzzle with that ID
- **THEN** import is rejected with an error indicating the file may be corrupt or from a different version

#### Scenario: Reject file with malformed grid
- **WHEN** the user imports a file where `state.grid` does not contain exactly 81 entries or is missing required fields
- **THEN** import is rejected with an error message indicating the file is invalid

#### Scenario: Reject non-JSON file
- **WHEN** the user selects a file that cannot be parsed as JSON
- **THEN** import is rejected with an error message indicating the file is not a valid export

#### Scenario: Reject file with invalid elapsedSeconds
- **WHEN** the user imports a file where `state.elapsedSeconds` is not a non-negative integer
- **THEN** import is rejected with an error describing the invalid field

---

### Requirement: Export format is versioned for future evolution
The export format SHALL include a top-level integer `version` field. The current version SHALL be `1`. Future format changes SHALL increment this version. The importer SHALL explicitly check the version and reject unknown versions rather than attempting silent parsing.

#### Scenario: Version 1 file imports successfully
- **WHEN** the user imports a file with `"version": 1` and otherwise valid content
- **THEN** the import succeeds

#### Scenario: Future version file is rejected gracefully
- **WHEN** the user imports a file with `"version": 2` and no version-2 handler exists
- **THEN** import is rejected with a message indicating the file requires a newer version of the app
