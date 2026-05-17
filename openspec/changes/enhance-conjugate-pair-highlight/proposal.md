## Why

The existing "Highlight conjugate pairs" toggle in the Advanced modal lights up every cell that participates in any conjugate pair using a single uniform color. The player can see *that* a cell is in some pair but cannot see *which* cell it is paired with, *for which digit*, or *in which unit* (row, column, or box). For a learning-oriented solver tool, this is the most important information; without it the highlight functions as a general "interesting cells" heatmap rather than a teaching aid.

## What Changes

- Promote the conjugate-pair data structure from a flat `Set<number>` of cell indices to a typed list of `{ digit, cells, unit }` tuples. Add cheap by-cell and by-digit lookups derived from that list.
- When the toggle is on and a cell is selected, dim cells that participate in unrelated pairs and emphasize the selected cell's pair partner(s) using unit-specific colors (row, column, box).
- When the toggle is on and no cell is selected, retain the current "every conjugate cell is highlighted" overview behavior, so the toggle continues to provide an at-a-glance view.
- Preserve pencil-mark semantics: pair detection continues to use the user's pencil marks when present and fall back to logical candidates otherwise.

Out of scope for this change (deferred): SVG arrows or connectors between paired cells, click-on-candidate selection inside a cell, a sidebar listing detected pairs, a digit-filter mode driven from the numpad, and any broader solver-hint engine (X-wing, naked pairs, etc.).

## Capabilities

### New Capabilities
- `conjugate-pair-highlight`: Solver-assist behavior for surfacing conjugate-pair relationships in the Sudoku grid. Covers the data model for pairs, the toggle, selection-scoped emphasis, and unit color coding.

### Modified Capabilities
<!-- None. No existing spec captures the current conjugate-pair toggle behavior; this change introduces the first spec for it. -->

## Impact

- Affected code:
  - [src/utils.ts](src/utils.ts): replace `computeConjugatePairCellIndexes` with a richer `computeConjugatePairs` producing structured pairs; keep a thin compatibility wrapper if needed by callers.
  - [src/App.tsx](src/App.tsx): adjust `solverHighlights` memo and the per-cell styling in the `board` memo to consume the new structure and render selection-scoped emphasis with unit-specific colors.
- No new dependencies, no new components, no new modals.
- No persisted state changes: the toggle is already in-memory only. Export/import payloads are unaffected.
- No changes to puzzle generation, undo/redo, timer, or notes input flows.
