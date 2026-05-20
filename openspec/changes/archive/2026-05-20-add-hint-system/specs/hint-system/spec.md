## ADDED Requirements

### Requirement: Hint entry point lives in the Advanced modal

The system SHALL expose a `Hint` control inside the existing Advanced modal that is the only entry point to the hint system. The control SHALL be disabled while the game is paused or complete, consistent with every other Advanced-modal control.

#### Scenario: Hint button is visible in the Advanced modal during an active game

- **WHEN** the player opens the Advanced modal while an unpaused, incomplete puzzle is shown
- **THEN** a control labeled `Hint` is visible and operable

#### Scenario: Hint button is disabled when the game is paused or complete

- **WHEN** the player opens the Advanced modal while the game is paused or after the puzzle is complete
- **THEN** the Hint control is disabled and cannot be activated

---

### Requirement: Hint modal replaces the Advanced modal

The system SHALL, when the player activates the Hint control inside the Advanced modal, close the Advanced modal and open the Hint modal in its place. Closing the Hint modal SHALL return the player directly to the game without restoring the Advanced modal.

#### Scenario: Activating Hint closes Advanced and opens the Hint modal

- **WHEN** the Advanced modal is open and the player activates the Hint control
- **THEN** the Advanced modal is closed
- **AND** the Hint modal is open

#### Scenario: Closing the Hint modal returns to the game

- **WHEN** the Hint modal is open and the player closes it (via close button, backdrop click, or Escape key)
- **THEN** the Hint modal is closed
- **AND** the Advanced modal is not reopened
- **AND** the player can interact with the game grid

---

### Requirement: Hint modal lists every supported technique grouped by tier

The system SHALL display, in the Hint modal, every supported technique grouped by tier. Tiers are: Singles, n-Tuples, Intersections, Fish, Wings, Single-Digit Patterns, Uniqueness, and Coloring. Techniques within a tier SHALL appear together and tiers SHALL be visually distinguishable from each other.

#### Scenario: Every supported technique is present in the modal

- **WHEN** the Hint modal is open
- **THEN** the following technique names are visible: Naked Single, Hidden Single, Naked Pair, Naked Triple, Naked Quad, Hidden Pair, Hidden Triple, Hidden Quad, Pointing Pair / Box-Line Reduction, X-Wing, Swordfish, Jellyfish, XY-Wing, XYZ-Wing, W-Wing, Skyscraper, 2-String Kite, Empty Rectangle, Unique Rectangle, BUG+1, Simple Coloring

#### Scenario: Techniques are grouped by tier

- **WHEN** the Hint modal is open
- **THEN** Naked Single and Hidden Single appear together under a Singles section
- **AND** Naked Pair, Naked Triple, Naked Quad, Hidden Pair, Hidden Triple, Hidden Quad appear together under an n-Tuples section
- **AND** Pointing Pair / Box-Line Reduction appears under an Intersections section
- **AND** X-Wing, Swordfish, Jellyfish appear together under a Fish section
- **AND** XY-Wing, XYZ-Wing, W-Wing appear together under a Wings section
- **AND** Skyscraper, 2-String Kite, Empty Rectangle appear together under a Single-Digit Patterns section
- **AND** Unique Rectangle, BUG+1 appear together under a Uniqueness section
- **AND** Simple Coloring appears under a Coloring section

---

### Requirement: Each technique has a three-stage progressive text reveal

The system SHALL, for each supported technique, expose three reveal stages that the player advances through one click at a time, in order: presence, count, location. Each stage SHALL be reachable only after the previous stage has been revealed for the same technique. Stages SHALL render as plain text inside the Hint modal. No stage SHALL highlight cells on the grid, place a digit, or remove pencil marks.

#### Scenario: Stage 1 reveals presence

- **WHEN** the player activates a technique row that has not yet been revealed in the current Hint modal session
- **THEN** the system reveals, as text, whether the technique is present in the current board

#### Scenario: Stage 2 reveals count

- **WHEN** the technique is present and the player activates the count control for that technique
- **THEN** the system reveals, as text, the total number of distinct instances of that technique present in the current board

#### Scenario: Stage 3 reveals location

- **WHEN** the count has been revealed for a technique and the player activates the location control for that technique
- **THEN** the system reveals, as text, the unit-level location of each instance of that technique present in the current board

#### Scenario: Count and location controls are not offered when the technique is absent

- **WHEN** the presence reveal for a technique reports that the technique is not present
- **THEN** the system does not offer count or location controls for that technique in the current modal session

#### Scenario: Reveal stages do not modify the grid

- **WHEN** the player advances any technique to any reveal stage
- **THEN** the contents of every cell (values, pencil marks, given status) are unchanged
- **AND** no cell on the grid receives any new highlight as a result of the reveal

---

### Requirement: Hint modal state resets on close, pause, completion, menu return, or new puzzle

The system SHALL auto-close the Hint modal and discard all per-technique reveal-stage state when the game is paused, when the puzzle is completed, when the player returns to the menu, or when a new puzzle is started. Each time the Hint modal is opened, every technique SHALL begin at stage 0 (presence not yet revealed).

#### Scenario: Pausing closes the Hint modal

- **WHEN** the Hint modal is open and the game becomes paused
- **THEN** the Hint modal is closed

#### Scenario: Completing the puzzle closes the Hint modal

- **WHEN** the Hint modal is open and the puzzle reaches a complete state
- **THEN** the Hint modal is closed

#### Scenario: Returning to the menu closes and resets the Hint modal

- **WHEN** the Hint modal is open and the player returns to the menu
- **THEN** the Hint modal is closed
- **AND** the next time the Hint modal is opened, every technique begins at the presence stage

#### Scenario: Reopening the Hint modal during the same puzzle resets per-technique progression

- **WHEN** the player has revealed presence, count, or location for any technique, then closes the Hint modal, then reopens it (without pause, completion, or menu return)
- **THEN** every technique begins at the presence stage in the reopened modal

---

### Requirement: Detection uses pencil marks per cell with logical fallback

The system SHALL use, for each empty non-given cell, the cell's pencil-mark notes as that cell's candidate set when the cell has one or more notes, and otherwise SHALL use the digits that remain logically possible given placed values in that cell's peers. This is the same per-cell rule used by conjugate-pair detection.

#### Scenario: Cell with pencil marks uses those marks as its candidates

- **WHEN** a hint detector is computing candidates for an empty non-given cell that has at least one pencil-mark note
- **THEN** the detector uses exactly that cell's pencil-mark notes as the cell's candidate set
- **AND** the detector does not include digits that are logically possible but not pencilled in that cell

#### Scenario: Cell without pencil marks falls back to logical candidates

- **WHEN** a hint detector is computing candidates for an empty non-given cell that has no pencil-mark notes
- **THEN** the detector uses the digits that remain logically possible given placed values in the cell's peers

#### Scenario: Given and filled cells contribute no candidates

- **WHEN** a hint detector is computing candidates
- **THEN** no given cell and no cell with a placed value contributes any candidate to any unit

---

### Requirement: Presence is structural, not effective

The system SHALL report a technique as present whenever its pattern is structurally formed on the board, even when applying its elimination rule would remove no candidates from any peer's current pencil marks. A pattern that exists but eliminates nothing in the current board still counts as present.

#### Scenario: Naked pair with no eliminating peers is still present

- **WHEN** two cells in a unit share the same exact pair of candidates, no other cell in the unit shares those candidates, and no other cell in the unit currently has either of those candidates in its pencil marks
- **THEN** Naked Pair is reported as present

#### Scenario: X-Wing with no eliminating peer rows or columns is still present

- **WHEN** a structural X-Wing exists on the board but every potentially eliminable cell in the cross rows or columns has neither of the X-Wing digits in its candidate set
- **THEN** X-Wing is reported as present

---

### Requirement: Naked Single detection

The system SHALL detect a Naked Single in any empty non-given cell whose candidate set contains exactly one digit. The location reported for a Naked Single SHALL include the 3×3 box index containing the cell.

#### Scenario: Empty cell with exactly one candidate is a Naked Single

- **WHEN** an empty non-given cell has exactly one candidate after applying the per-cell candidate rule
- **THEN** Naked Single is reported as present
- **AND** the count includes that cell
- **AND** the location output includes the 3×3 box index of that cell

---

### Requirement: Hidden Single detection

The system SHALL detect a Hidden Single whenever a digit appears as a candidate in exactly one empty non-given cell of a row, column, or 3×3 box. The location reported for each Hidden Single SHALL identify the unit type (row, column, or box) and the unit index in which the digit is confined.

#### Scenario: Digit confined to one cell of a row is a Hidden Single

- **WHEN** a digit appears as a candidate in exactly one empty non-given cell of a row, and in no other empty non-given cell of that row
- **THEN** Hidden Single is reported as present
- **AND** the location output identifies the row and the row's index

#### Scenario: Digit confined to one cell of a column is a Hidden Single

- **WHEN** a digit appears as a candidate in exactly one empty non-given cell of a column, and in no other empty non-given cell of that column
- **THEN** Hidden Single is reported as present
- **AND** the location output identifies the column and the column's index

#### Scenario: Digit confined to one cell of a box is a Hidden Single

- **WHEN** a digit appears as a candidate in exactly one empty non-given cell of a 3×3 box, and in no other empty non-given cell of that box
- **THEN** Hidden Single is reported as present
- **AND** the location output identifies the box and the box's index

#### Scenario: A digit hidden-singled in multiple units counts as multiple instances

- **WHEN** the same digit is a Hidden Single in a row, a column, and a box that all intersect at the same cell
- **THEN** the count reflects all three instances and the location output identifies all three units

---

### Requirement: Naked Subset detection (Pair, Triple, Quad)

The system SHALL detect a Naked Pair, Naked Triple, or Naked Quad whenever N empty non-given cells in a unit have candidate sets whose union is exactly N distinct digits, for N equal to 2, 3, or 4 respectively. The location reported for each Naked Subset SHALL identify the unit type (row, column, or box) and the unit index containing the subset.

#### Scenario: Two cells in a unit sharing the same two candidates form a Naked Pair

- **WHEN** two empty non-given cells in a unit have candidate sets whose union is exactly two digits, and no other cell in the unit shares both of those candidates
- **THEN** Naked Pair is reported as present
- **AND** the location output identifies the unit and its index

#### Scenario: Three cells whose candidate union is three digits form a Naked Triple

- **WHEN** three empty non-given cells in a unit have candidate sets whose union is exactly three digits (each cell's candidates being a subset of those three)
- **THEN** Naked Triple is reported as present
- **AND** the location output identifies the unit and its index

#### Scenario: Four cells whose candidate union is four digits form a Naked Quad

- **WHEN** four empty non-given cells in a unit have candidate sets whose union is exactly four digits (each cell's candidates being a subset of those four)
- **THEN** Naked Quad is reported as present
- **AND** the location output identifies the unit and its index

#### Scenario: A naked subset of size N is not also reported as a larger subset

- **WHEN** a Naked Pair exists in a unit
- **THEN** the Naked Pair count includes it
- **AND** the Naked Triple count does not include it as a triple

---

### Requirement: Hidden Subset detection (Pair, Triple, Quad)

The system SHALL detect a Hidden Pair, Hidden Triple, or Hidden Quad whenever a set of N distinct digits collectively appears as candidates in exactly N empty non-given cells of a unit (and no fewer), for N equal to 2, 3, or 4 respectively. The location reported for each Hidden Subset SHALL identify the unit type (row, column, or box) and the unit index containing the subset.

#### Scenario: Two digits confined to the same two cells form a Hidden Pair

- **WHEN** two digits each appear as candidates in exactly the same two empty non-given cells of a unit, and in no other empty non-given cell of that unit
- **THEN** Hidden Pair is reported as present
- **AND** the location output identifies the unit and its index

#### Scenario: Three digits confined to the same three cells form a Hidden Triple

- **WHEN** three digits collectively appear as candidates in exactly three empty non-given cells of a unit, and at least each of the three digits appears in only those cells within the unit
- **THEN** Hidden Triple is reported as present
- **AND** the location output identifies the unit and its index

#### Scenario: Four digits confined to the same four cells form a Hidden Quad

- **WHEN** four digits collectively appear as candidates in exactly four empty non-given cells of a unit, and each of the four digits appears in only those cells within the unit
- **THEN** Hidden Quad is reported as present
- **AND** the location output identifies the unit and its index

---

### Requirement: Pointing Pair / Box-Line Reduction detection

The system SHALL detect a Pointing Pair / Box-Line Reduction whenever a digit's candidate cells in a 3×3 box are all confined to a single row or column, or whenever a digit's candidate cells in a row or column are all confined to a single 3×3 box. The location reported for each instance SHALL identify both the box and the row or column to which the digit is confined.

#### Scenario: Digit confined to one row inside a box is a Pointing Pair

- **WHEN** within a 3×3 box, a digit's candidate cells all lie in the same row, and the box contains more than one candidate cell for that digit
- **THEN** Pointing Pair / Box-Line Reduction is reported as present
- **AND** the location output identifies the box and the row

#### Scenario: Digit confined to one column inside a box is a Pointing Pair

- **WHEN** within a 3×3 box, a digit's candidate cells all lie in the same column, and the box contains more than one candidate cell for that digit
- **THEN** Pointing Pair / Box-Line Reduction is reported as present
- **AND** the location output identifies the box and the column

#### Scenario: Digit confined to one box inside a line is a Box-Line Reduction

- **WHEN** within a row (or column), a digit's candidate cells all lie in the same 3×3 box, and the line contains more than one candidate cell for that digit
- **THEN** Pointing Pair / Box-Line Reduction is reported as present
- **AND** the location output identifies the line and the box

---

### Requirement: Basic Fish detection (X-Wing, Swordfish, Jellyfish)

The system SHALL detect a basic fish on a digit whenever the digit's candidate cells in N rows are confined to the same N columns (a row-based fish), or in N columns are confined to the same N rows (a column-based fish), for N equal to 2 (X-Wing), 3 (Swordfish), or 4 (Jellyfish). The location reported for each fish SHALL identify the digit, the N base rows or columns, and the N cover columns or rows.

#### Scenario: X-Wing is detected for a digit forming a 2×2 pattern across two rows

- **WHEN** for some digit, the candidate cells in two rows occupy exactly the same two columns, and the digit does not appear as a candidate in any other cell of those two rows
- **THEN** X-Wing is reported as present
- **AND** the location output identifies the digit, the two rows, and the two columns

#### Scenario: X-Wing is detected for a digit forming a 2×2 pattern across two columns

- **WHEN** for some digit, the candidate cells in two columns occupy exactly the same two rows, and the digit does not appear as a candidate in any other cell of those two columns
- **THEN** X-Wing is reported as present
- **AND** the location output identifies the digit, the two columns, and the two rows

#### Scenario: Swordfish is detected for a digit forming a 3×3 pattern

- **WHEN** for some digit, the candidate cells across three rows are all confined to the same three columns (each of the three rows containing two or three of the digit's candidates within those columns), and the digit does not appear in any other cell of those three rows
- **THEN** Swordfish is reported as present
- **AND** the location output identifies the digit, the three rows, and the three columns

#### Scenario: Jellyfish is detected for a digit forming a 4×4 pattern

- **WHEN** for some digit, the candidate cells across four rows are all confined to the same four columns, and the digit does not appear in any other cell of those four rows
- **THEN** Jellyfish is reported as present
- **AND** the location output identifies the digit, the four rows, and the four columns

#### Scenario: A fish of size N is not also reported as a larger fish

- **WHEN** an X-Wing exists for a digit
- **THEN** the X-Wing count includes it
- **AND** the Swordfish count does not include it as a swordfish

---

### Requirement: XY-Wing detection

The system SHALL detect an XY-Wing whenever three empty non-given cells satisfy: a pivot cell with exact candidate set `{X, Y}`, a first wing cell with exact candidate set `{X, Z}` that shares a unit with the pivot, and a second wing cell with exact candidate set `{Y, Z}` that shares a unit with the pivot. The two wing cells need not share a unit with each other. The location reported for each XY-Wing SHALL include the 3×3 box indices of the pivot and the two wing cells.

#### Scenario: Three bivalue cells in pivot-and-wings configuration form an XY-Wing

- **WHEN** the pivot has exact candidates `{X, Y}`, the first wing has exact candidates `{X, Z}` and shares a row, column, or box with the pivot, and the second wing has exact candidates `{Y, Z}` and shares a row, column, or box with the pivot, with `X`, `Y`, and `Z` all distinct
- **THEN** XY-Wing is reported as present
- **AND** the location output identifies the 3×3 box of the pivot and the 3×3 boxes of both wings

---

### Requirement: XYZ-Wing detection

The system SHALL detect an XYZ-Wing whenever three empty non-given cells satisfy: a pivot cell with exact candidate set `{X, Y, Z}`, a first wing cell with exact candidate set `{X, Z}` that shares a unit with the pivot, and a second wing cell with exact candidate set `{Y, Z}` that shares a unit with the pivot. The location reported for each XYZ-Wing SHALL include the 3×3 box indices of the pivot and the two wing cells.

#### Scenario: Trivalue pivot with two bivalue wings sharing a digit forms an XYZ-Wing

- **WHEN** the pivot has exact candidates `{X, Y, Z}`, the first wing has exact candidates `{X, Z}` and shares a row, column, or box with the pivot, and the second wing has exact candidates `{Y, Z}` and shares a row, column, or box with the pivot, with `X`, `Y`, and `Z` all distinct
- **THEN** XYZ-Wing is reported as present
- **AND** the location output identifies the 3×3 box of the pivot and the 3×3 boxes of both wings

---

### Requirement: W-Wing detection

The system SHALL detect a W-Wing whenever two empty non-given cells have the exact same bivalue candidate set `{X, Y}`, do not share a unit, and one of the two digits forms a conjugate pair in some unit connecting a peer of the first cell to a peer of the second cell. The location reported for each W-Wing SHALL include the 3×3 box indices of the two bivalue cells.

#### Scenario: Two matching bivalues connected by a strong link form a W-Wing

- **WHEN** two empty non-given cells share the same exact candidate set `{X, Y}`, lie in no common row, column, or box, and there exists a unit in which exactly two cells contain digit `X` as a candidate where one of those two cells is a peer of the first bivalue cell and the other is a peer of the second bivalue cell
- **THEN** W-Wing is reported as present
- **AND** the location output identifies the 3×3 boxes of the two bivalue cells

---

### Requirement: Skyscraper detection

The system SHALL detect a Skyscraper on a digit whenever two parallel lines (two rows, or two columns) each contain exactly two candidate cells for that digit, the two lines share exactly one perpendicular line between their candidate cells (the "base" pair lying in the same perpendicular line), and the other two candidate cells (the "roof") lie in different perpendicular lines. The location reported for each Skyscraper SHALL include the digit and the 3×3 box indices of the four candidate cells.

#### Scenario: Two rows with conjugate pairs sharing one column form a row-based Skyscraper

- **WHEN** for some digit, two rows each have exactly two candidate cells for that digit, one candidate cell from each row lies in the same column, and the other two candidate cells (one from each row) lie in different columns
- **THEN** Skyscraper is reported as present
- **AND** the location output identifies the digit and the 3×3 boxes of the four candidate cells

#### Scenario: Two columns with conjugate pairs sharing one row form a column-based Skyscraper

- **WHEN** for some digit, two columns each have exactly two candidate cells for that digit, one candidate cell from each column lies in the same row, and the other two candidate cells lie in different rows
- **THEN** Skyscraper is reported as present
- **AND** the location output identifies the digit and the 3×3 boxes of the four candidate cells

---

### Requirement: 2-String Kite detection

The system SHALL detect a 2-String Kite on a digit whenever a row contains exactly two candidate cells for the digit and a column contains exactly two candidate cells for the digit, with one candidate cell from the row and one candidate cell from the column lying in the same 3×3 box. The location reported for each 2-String Kite SHALL include the digit, the row index, the column index, and the 3×3 box where the two strings meet.

#### Scenario: A row conjugate pair and a column conjugate pair sharing a box form a 2-String Kite

- **WHEN** for some digit, a row has exactly two candidate cells for the digit, a column has exactly two candidate cells for the digit, and one candidate cell from the row shares a 3×3 box with one candidate cell from the column
- **THEN** 2-String Kite is reported as present
- **AND** the location output identifies the digit, the row, the column, and the shared 3×3 box

---

### Requirement: Empty Rectangle detection

The system SHALL detect an Empty Rectangle on a digit whenever, within a 3×3 box, every candidate cell for that digit lies in a single row of the box and a single column of the box (i.e., the candidate cells are confined to the cross of one row and one column inside the box, with at least one cell in both the row leg and the column leg), and there exists a conjugate pair on the same digit in a row or column external to the box such that the conjugate pair's strong link enables elimination on the digit through the rectangle. The location reported for each Empty Rectangle SHALL include the digit and the box index, the row index, and the column index defining the rectangle's cross.

#### Scenario: Box-internal cross with external conjugate pair forms an Empty Rectangle

- **WHEN** within a 3×3 box, all candidate cells for some digit lie in the union of one box-row and one box-column with at least one candidate cell in each leg, and a conjugate pair for the same digit exists in either the row aligned with the box-row's external extension or the column aligned with the box-column's external extension, positioned so that the strong link's far end is a peer of the box's cross intersection through the perpendicular line
- **THEN** Empty Rectangle is reported as present
- **AND** the location output identifies the digit, the box index, the row index of the box's row leg, and the column index of the box's column leg

---

### Requirement: Unique Rectangle detection

The system SHALL detect a Unique Rectangle whenever four empty non-given cells lie at the corners of a rectangle spanning exactly two rows, exactly two columns, and exactly two 3×3 boxes, with each corner cell containing the same two digits as candidates (allowing extra candidates on one or more corners). The location reported for each Unique Rectangle SHALL include the two row indices, the two column indices, and the two 3×3 box indices forming the rectangle.

#### Scenario: Four corners with shared bivalue candidates across two rows, columns, and boxes form a Unique Rectangle

- **WHEN** four empty non-given cells lie at the corners of a rectangle, those corners span exactly two rows, exactly two columns, and exactly two 3×3 boxes, and each corner cell contains both digits `X` and `Y` as candidates
- **THEN** Unique Rectangle is reported as present
- **AND** the location output identifies the two rows, the two columns, and the two 3×3 boxes

#### Scenario: A four-corner shared bivalue across four boxes is not a Unique Rectangle

- **WHEN** four empty non-given cells lie at the corners of a rectangle but span four distinct 3×3 boxes
- **THEN** Unique Rectangle is not reported as present for that quadruple

---

### Requirement: BUG+1 detection

The system SHALL detect a BUG+1 condition whenever the board's empty non-given cells consist of exactly one cell with three candidates and every other empty non-given cell with exactly two candidates, with the property that for every unit, each candidate digit appears in exactly two of the unit's cells, except for the unit(s) containing the trivalue cell where one digit appears three times. The location reported for each BUG+1 SHALL include the 3×3 box index of the trivalue cell.

#### Scenario: One trivalue cell with otherwise universal bivalues forms a BUG+1

- **WHEN** every empty non-given cell except one has exactly two candidates, the remaining cell has exactly three candidates, and every digit appears as a candidate exactly twice in every unit except where the trivalue cell makes one digit appear three times
- **THEN** BUG+1 is reported as present
- **AND** the location output identifies the 3×3 box of the trivalue cell

---

### Requirement: Simple Coloring detection

The system SHALL detect Simple Coloring on a digit whenever the digit's conjugate pairs across the board form a chain such that the cells can be two-colored consistently (cells linked by a conjugate pair on that digit receive opposite colors) and the resulting coloring permits at least one of the standard Simple Coloring contradictions: two cells of the same color appearing in the same unit, or a cell outside the chain that is a peer of cells of both colors. The location reported for each Simple Coloring instance SHALL include the digit and the 3×3 box indices of the cells participating in the chain.

#### Scenario: A two-colorable chain with a same-color same-unit conflict is a Simple Coloring instance

- **WHEN** for some digit, the digit's conjugate pairs form a connected chain of at least four cells, the chain admits a consistent two-coloring, and two cells assigned the same color lie in the same row, column, or 3×3 box
- **THEN** Simple Coloring is reported as present
- **AND** the location output identifies the digit and the 3×3 boxes of the cells in the chain

#### Scenario: A two-colorable chain with an external cell peering both colors is a Simple Coloring instance

- **WHEN** for some digit, the digit's conjugate pairs form a connected chain that admits a consistent two-coloring, and an empty non-given cell outside the chain with the digit as a candidate is a peer of at least one chain cell of each color
- **THEN** Simple Coloring is reported as present
- **AND** the location output identifies the digit and the 3×3 boxes of the cells in the chain
