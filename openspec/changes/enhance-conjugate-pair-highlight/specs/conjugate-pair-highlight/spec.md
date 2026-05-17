## ADDED Requirements

### Requirement: Conjugate pairs are computed as structured tuples
The system SHALL compute the conjugate pairs of the current grid as a list of structured tuples, where each tuple records the digit, the two participating cell indexes, and the unit (row, column, or box) in which the pair was detected. The same pair of cells MAY appear more than once in the list if it is a conjugate pair in more than one unit. Pair detection SHALL use the user's pencil marks for a cell when any are present, and otherwise fall back to the digits still logically possible from the placed values of the cell's peers.

#### Scenario: Row-based conjugate pair is detected
- **WHEN** a digit appears as a candidate in exactly two empty cells of a row, and in no other empty cell of that row
- **THEN** the computed list contains a tuple with that digit, the two cell indexes, and a unit of type `row` whose index is the shared row

#### Scenario: Column-based conjugate pair is detected
- **WHEN** a digit appears as a candidate in exactly two empty cells of a column, and in no other empty cell of that column
- **THEN** the computed list contains a tuple with that digit, the two cell indexes, and a unit of type `col` whose index is the shared column

#### Scenario: Box-based conjugate pair is detected
- **WHEN** a digit appears as a candidate in exactly two empty cells of a 3x3 box, and in no other empty cell of that box
- **THEN** the computed list contains a tuple with that digit, the two cell indexes, and a unit of type `box` whose index is the shared box

#### Scenario: The same cell pair appearing in two units produces two tuples
- **WHEN** a digit forms a conjugate pair across the same two cells in both a row and a box (for example, two cells in the same row that also share a 3x3 box, with the digit appearing nowhere else in either unit)
- **THEN** the computed list contains one tuple for the row unit and a separate tuple for the box unit, both naming the same two cells and the same digit

#### Scenario: Pencil marks take precedence over computed candidates
- **WHEN** the user has set any pencil marks on a cell
- **THEN** pair detection for that cell uses only the cell's pencil marks as its candidates, ignoring digits that are logically possible but not noted

#### Scenario: Cells without pencil marks fall back to logical candidates
- **WHEN** an empty, non-given cell has no pencil marks
- **THEN** pair detection for that cell uses the digits that remain logically possible given placed values in its peers

#### Scenario: Given and filled cells never participate in a pair
- **WHEN** a cell is a given clue or has a placed value
- **THEN** the cell index is not present in any tuple of the computed list

---

### Requirement: Highlight toggle exposes conjugate-pair information
The system SHALL provide a user-controllable toggle, accessible from the Advanced menu in the game screen, that turns on and off the conjugate-pair highlight. The toggle SHALL be disabled while the game is paused or complete and SHALL be automatically cleared when the puzzle is completed or a new puzzle is started.

#### Scenario: Toggle is available in the Advanced menu during an active game
- **WHEN** the user opens the Advanced menu while an in-progress puzzle is shown
- **THEN** a control labeled to indicate conjugate-pair highlighting is visible and operable

#### Scenario: Toggle is disabled while paused or complete
- **WHEN** the game is paused or has been completed
- **THEN** the toggle is disabled and cannot be changed

#### Scenario: Toggle clears on completion or new puzzle
- **WHEN** the player completes the active puzzle
- **THEN** the highlight toggle is turned off
- **WHEN** the player starts a new puzzle or returns to the menu
- **THEN** the highlight toggle is turned off

---

### Requirement: Overview highlight when toggle is on and no cell is selected
The system SHALL, when the toggle is on and no cell is selected, visually distinguish every cell that participates in at least one conjugate pair from cells that do not. The distinguishing styling SHALL be consistent for every conjugate-pair cell in this state (no per-unit variation) and SHALL remain legible alongside the existing selected-cell, peer, same-digit, and bivalue highlights.

#### Scenario: Every conjugate-pair cell is highlighted with no selection
- **WHEN** the toggle is on and the player has not selected any cell
- **THEN** every cell that participates in at least one conjugate pair shows the overview highlight styling
- **AND** cells that do not participate in any conjugate pair show no conjugate styling

#### Scenario: Overview highlight does not conflict with the bivalue highlight
- **WHEN** the conjugate-pair toggle and the bivalue toggle are both on with no cell selected
- **THEN** cells that satisfy both conditions remain distinguishable from cells that satisfy only one of them

---

### Requirement: Selection-scoped emphasis identifies partner cells per unit
The system SHALL, when the toggle is on and a cell is selected, emphasize each cell that forms a conjugate pair with the selected cell (the selected cell's partner cells across all units) using a styling that visually distinguishes row-based, column-based, and box-based partnerships from each other. Conjugate-pair cells that do not involve the selected cell SHALL be de-emphasized relative to the partners but MAY remain visible. A cell that has no conjugate pair involving the selected cell SHALL NOT receive partner emphasis.

#### Scenario: Partner in the same row is emphasized with row styling
- **WHEN** the toggle is on, the selected cell forms a conjugate pair with another cell in its row, and that pair is detected
- **THEN** the partner cell shows the row-pair emphasis styling
- **AND** the selected cell also shows that the relationship exists (for example, by adopting a matching emphasis style or by remaining visibly the selected cell)

#### Scenario: Partner in the same column is emphasized with column styling
- **WHEN** the toggle is on, the selected cell forms a conjugate pair with another cell in its column, and that pair is detected
- **THEN** the partner cell shows the column-pair emphasis styling, visually distinct from the row-pair styling

#### Scenario: Partner in the same box is emphasized with box styling
- **WHEN** the toggle is on, the selected cell forms a conjugate pair with another cell in their shared 3x3 box, and that pair is detected
- **THEN** the partner cell shows the box-pair emphasis styling, visually distinct from the row-pair and column-pair styling

#### Scenario: A cell that is a partner under multiple units shows that fact
- **WHEN** the selected cell and another cell are a conjugate pair in more than one unit (for example, both row and box)
- **THEN** the partner cell receives emphasis that conveys it is paired in more than one unit (for example, multiple rings, a combined style, or any styling consistent with the row, column, and box emphasis vocabulary)

#### Scenario: Selecting an unrelated cell de-emphasizes other conjugate cells
- **WHEN** the toggle is on, the selected cell participates in no conjugate pair, and other cells in the grid do participate in conjugate pairs
- **THEN** the participating cells are visibly de-emphasized compared to their appearance in overview mode
- **AND** no cell shows partner emphasis

#### Scenario: Changing selection updates the emphasis without delay
- **WHEN** the toggle is on and the user selects a different cell
- **THEN** partner emphasis updates to reflect the new selected cell on the next render

---

### Requirement: Highlight respects pause and completion states
The system SHALL suppress all conjugate-pair highlighting (overview and selection-scoped emphasis) while the game is paused or after the puzzle has been completed, consistent with the existing rule that the board is hidden when paused and that solver assists are not shown after completion.

#### Scenario: No highlighting is rendered while paused
- **WHEN** the toggle is on but the game is paused
- **THEN** no overview or partner emphasis is rendered

#### Scenario: No highlighting is rendered after completion
- **WHEN** the player has completed the puzzle
- **THEN** no overview or partner emphasis is rendered, regardless of any prior toggle state
