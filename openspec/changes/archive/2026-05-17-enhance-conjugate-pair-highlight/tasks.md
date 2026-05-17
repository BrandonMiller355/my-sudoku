## 1. Data layer: structured conjugate pairs

- [x] 1.1 Add a `ConjugatePair` type in [src/types.ts](src/types.ts) with `digit: number`, `cells: readonly [number, number]` (sorted ascending), and `unit: { type: "row" | "col" | "box"; index: number }`.
- [x] 1.2 In [src/utils.ts](src/utils.ts), implement `computeConjugatePairs(grid: CellState[]): ConjugatePair[]` that scans rows, columns, and boxes and emits one tuple per `(unit, digit)` that has exactly two candidate cells. Reuse the existing `getEffectiveCandidates` helper so pencil-mark precedence is preserved.
- [x] 1.3 Ensure the same cell pair appears more than once when it is conjugate in more than one unit (one tuple per unit). Sort `cells` ascending within each tuple for deterministic output.
- [x] 1.4 Replace `computeConjugatePairCellIndexes` with either a thin wrapper that derives the flat `Set<number>` from `computeConjugatePairs`, or remove it after updating the single caller in `App.tsx`.

## 2. Selection-derived lookups

- [x] 2.1 In [src/App.tsx](src/App.tsx), update the `solverHighlights` memo to also expose the structured pair list (memoized on `game?.grid` and `game?.isComplete`).
- [x] 2.2 Add a second memo that, given `solverHighlights.pairs` and `selectedCellIndex`, derives a per-cell highlight descriptor: `{ kind: "none" | "overview" | "partner-row" | "partner-col" | "partner-box" | "partner-multi" }`. A cell becomes a partner of the selected cell if at least one pair tuple lists the selected cell and that cell together; the unit type comes from the tuple. If multiple tuples qualify with different unit types, use `"partner-multi"`.
- [x] 2.3 When no cell is selected, the descriptor for every conjugate-pair cell is `"overview"`; cells with no pairs are `"none"`.

## 3. Rendering: unit-coded emphasis

- [x] 3.1 In the `board` memo, replace the existing `inConjugate` boolean and its single emerald style with a switch on the per-cell descriptor. Map each `kind` to a Tailwind class string:
  - `overview` → keep the current emerald ring/background as today's behavior.
  - `partner-row` → distinct row color (suggest: sky/teal family).
  - `partner-col` → distinct column color (suggest: amber/orange family — verify no clash with same-digit amber; adjust if needed).
  - `partner-box` → distinct box color (suggest: fuchsia/purple family — verify no clash with bivalue violet; adjust if needed).
  - `partner-multi` → combined/gradient style or stacked rings that read as "more than one unit".
- [x] 3.2 When a cell is selected and the toggle is on, dim other conjugate-pair cells that are not partners of the selected cell. Implement by giving non-partner conjugate cells a reduced-opacity variant of the `overview` style (e.g., `opacity-50` or a paler ring), rather than removing the highlight entirely.
- [x] 3.3 Verify the selected cell itself still reads as the selected cell (existing sky-200 / sky-500/40 styling) and is not visually overwritten by partner emphasis.

## 4. Pencil-mark digit coloring (selection-scoped)

- [x] 4.1 In [src/App.tsx](src/App.tsx), add a memo that — given `solverHighlights.conjugatePairs`, `selectedCellIndex`, and the toggle — returns `Map<cellIndex, Map<digit, "partner-row" | "partner-col" | "partner-box" | "partner-multi">>`. The map is empty when the toggle is off or no cell is selected. For each pair whose `cells` includes the selected cell, record the digit in both the selected cell's inner map (color = unit of the pair) and the partner cell's inner map (color = unit of the pair). When the same `(cell, digit)` combination receives a second entry under a different unit type, promote that entry to `partner-multi`.
- [x] 4.2 In the `board` memo's notes rendering, look up the per-cell digit map and apply a text-color class per note digit:
  - `partner-row` → `text-teal-700 dark:text-teal-300`
  - `partner-col` → `text-orange-700 dark:text-orange-300`
  - `partner-box` → `text-fuchsia-700 dark:text-fuchsia-300`
  - `partner-multi` → `text-yellow-600 dark:text-yellow-300`
  - default → keep the existing `text-slate-500 dark:text-slate-400`
- [x] 4.3 Confirm the digit coloring applies to both the selected cell's notes and partner cells' notes (the same map covers both).
- [x] 4.4 Confirm digit coloring is suppressed when the toggle is off or no cell is selected (overview mode keeps default note colors).
- [x] 4.5 Verify text contrast against each cell-level background (sky selection, teal/orange/fuchsia/yellow partner backgrounds, overview-dim emerald) in both light and dark themes; adjust shades only if a combination becomes unreadable.

## 5. Interaction and lifecycle integration

- [x] 5.1 Confirm the toggle continues to be reset on puzzle completion, new puzzle, and back-to-menu (these resets already exist in `App.tsx`; verify nothing regresses).
- [x] 5.2 Confirm pause hides the board and therefore hides all highlighting (already covered by the existing pause overlay; verify by toggling pause with the highlight on).
- [x] 5.3 Make `selectCell` in [src/App.tsx](src/App.tsx) toggle off when the clicked cell is already selected (set `selectedCellIndex` to `null` in that case). The conjugate-pair overview mode then re-appears automatically via the existing `selectedCell === null` branch in `conjugateHighlights`.

## 6. Manual verification

- [x] 6.1 Start the dev server (`npm run dev`) and load an in-progress puzzle.
- [x] 6.2 Verify overview mode: toggle on, no selection — every conjugate cell shows the overview highlight; pencil-mark digits remain in their default color.
- [x] 6.3 Verify row partners: select a cell known to be in a row-only conjugate pair — only the row partner is emphasized in the row color; other conjugate cells are dimmed.
- [x] 6.4 Verify column partners: same check with a column-only pair.
- [x] 6.5 Verify box partners: same check with a box-only pair.
- [x] 6.6 Verify multi-unit partners: find or construct a pair that is conjugate in both row and box (or column and box) and confirm the partner shows the `partner-multi` styling.
- [x] 6.7 Verify pencil-mark digit coloring: with the toggle on and a cell selected, the conjugate digit(s) in both the selected cell's and partner cells' pencil marks are colored to match the relevant partner unit (teal / orange / fuchsia). Verify a digit with two different partners in two unit types shows yellow in the selected cell while each partner shows its own unit color.
- [x] 6.8 Verify pencil-mark precedence in detection: set pencil marks on a cell that reduces its candidates so a previously-detected pair disappears; confirm the cell-level highlight and the digit color both update immediately.
- [x] 6.9 Verify dark mode: repeat 6.2 through 6.7 in dark theme, checking that row/column/box/multi colors remain distinct from each other and from the bivalue (violet) and same-digit (amber) highlights, and that digit colors remain readable on every cell-level background.
- [x] 6.10 Verify pause and completion: pause the game and confirm no highlights bleed through the pause overlay; complete the puzzle and confirm the toggle clears.
- [x] 6.11 Verify mobile layout at a narrow viewport: emphasis colors and digit colors remain readable, no tap-target regressions.

## 7. Validation

- [x] 7.1 Re-run `npm run build` after the digit-coloring code lands and confirm the TypeScript build passes.
- [x] 7.2 Re-run `openspec validate enhance-conjugate-pair-highlight` and confirm the change validates cleanly.
