## Context

The Sudoku app already exposes a `Highlight conjugate pairs` toggle in the Advanced modal. The current data layer ([src/utils.ts](src/utils.ts#L116-L147)) computes a flat `Set<number>` of every cell index participating in any conjugate pair across rows, columns, and boxes. The UI ([src/App.tsx](src/App.tsx#L85-L93), [src/App.tsx:541-553](src/App.tsx#L541-L553)) draws a uniform emerald ring on every such cell. The set is correct, but it is structurally lossy: it discards the digit, the partner cell, and the unit type, which are exactly the facts a learner needs to understand *why* a pair exists.

Cell selection state (`selectedCellIndex`) and pencil-mark-aware candidate computation (`getEffectiveCandidates`) are already in place. There is no SVG overlay layer over the grid today; the board is a plain CSS grid of 81 `<button>` elements with per-cell class strings.

## Goals / Non-Goals

**Goals:**
- Turn the toggle from a heatmap into an explanation: when a cell is selected, a user can see exactly which other cell(s) form a conjugate pair with it, for which digit, in which unit.
- Make the change small, reversible, and free of new components or dependencies.
- Preserve every existing behavior of the toggle when no cell is selected, so users who liked the overview view do not lose it.
- Shape the new data structure so future solver work (chain coloring, XY-wing, X-chains) can reuse it without further refactoring.

**Non-Goals:**
- SVG arrows or connectors between paired cells. Geometry plus color is enough for v1; an overlay layer is a separable follow-up.
- Click-on-candidate selection. Candidate digits currently render as text spans inside a single cell `<button>`; making them individually clickable is a larger refactor and a mobile-tap-target problem.
- A sidebar that lists detected pairs, or a digit-filter mode driven from the numpad.
- Any general-purpose solver-hint engine (naked pairs, X-wing, swordfish, etc.).
- Persisting highlight state across sessions or including it in export/import payloads.

## Decisions

### Decision: Selection-scoped emphasis as the primary interaction

When the toggle is on and a cell is selected, the partner cell(s) for that cell across all units are emphasized; other conjugate-pair cells that do not involve the selected cell are de-emphasized but still visible. When the toggle is on and no cell is selected, every conjugate cell is highlighted (the current behavior is preserved as the overview mode).

**Alternatives considered:**
- *Click a candidate digit inside a cell* — requires turning each cell into a 3x3 sub-grid of buttons or doing hit-test math, plus shrinks tap targets on mobile. Higher build cost and worse touch ergonomics.
- *Numpad digit as a filter* — the numpad currently inserts values; reusing it as a filter would introduce a mode conflict.
- *Sidebar list of all detected pairs* — discoverable but redundant with what the grid can already show, and a meaningful UI addition.

Cell selection is already the central interaction in the grid; reusing it costs almost nothing and behaves identically on desktop and mobile.

### Decision: Color-code by unit type

Row pairs, column pairs, and box pairs use distinct ring colors so the relationship type reads at a glance. The exact palette is an implementation detail, but the three categories MUST be visually distinguishable in both light and dark themes and MUST NOT collide with the existing same-digit (amber), peer (sky), or bivalue (violet) highlights.

**Alternatives considered:**
- *Rely on geometry only* — row pairs are always horizontal in a line, column pairs vertical, box pairs constrained to a 3x3 region. Reading is possible without color, but a glance-friendly cue helps learners and is cheap to add.
- *One generic "partner" color* — simpler, but loses the teaching value of naming the unit type.

### Decision: Model a pair as `{ digit, cells, unit }` and allow the same cell-pair to appear in multiple units

A given pair of cells can be a conjugate pair in two units simultaneously — for example, two cells in the same row may also share a box, and the digit may appear nowhere else in either unit. The data model therefore treats `(cellA, cellB, digit, unit)` as the atom, not `(cellA, cellB, digit)`. Cheap by-cell and by-digit indexes are derived from the canonical list.

**Alternatives considered:**
- *Collapse duplicates and store `(cellA, cellB, digit)` with a list of units* — slightly smaller payload but complicates rendering, because the per-cell color decision needs to pick a unit anyway. Keeping one row per `(pair, unit)` keeps the rendering path linear.

### Decision: Defer the SVG connector overlay

For an MVP, ring color plus the visual coincidence of paired cells reads almost as well as an arrow on a 9x9 grid, especially on mobile. Adding an `absolute inset-0 pointer-events-none` SVG layer is a clean follow-up that does not invalidate any decision made here.

### Decision: Reuse `getEffectiveCandidates` for pair detection

Pencil-mark awareness is already correct in the existing helper. The new `computeConjugatePairs` consumes the same per-cell effective-candidate list. No new semantics around notes.

### Decision: Color-code the conjugate digit within pencil marks (selection-scoped)

When the toggle is on and a cell is selected, the rendered pencil-mark digit(s) that form conjugate pairs involving the selected cell are tinted with the appropriate partner-unit color. This applies both to the selected cell's own notes (where the color reflects the partner cell's unit type) and to each partner cell's notes (where the color matches that cell's own partner emphasis). The result: at a glance the player can see not just *where* the partner is, but *which digit* forms the pair — especially valuable in heavily-noted cells where the conjugate digit would otherwise be lost in a grid of nine pencil marks.

**Multi-partner-same-digit:** If a single digit in a cell forms conjugate pairs with more than one partner across different unit types, the digit uses the multi color (yellow) in that cell. This reuses the same "more than one unit relationship" vocabulary already established for partner-multi cell emphasis. Note that in this case, each individual partner cell still shows the digit in *its own* single-unit color — the multi color only appears in the cell where the multi-relationship actually exists.

**Alternatives considered:**
- *Split the digit visually (left half teal, right half orange)* — fragile, visually busy at small note sizes, hard to read in dark mode.
- *Pick the first detected partner arbitrarily* — surprising; players would not know why one unit "won".

**Overview mode is left alone:** When the toggle is on but no cell is selected, every conjugate cell shares the emerald overview color and there is no focal partner. Layering per-digit coloring on top would not communicate a relationship and would only add noise. Digit color-coding is selection-scoped.

**Foreground vs. background:** The coloring SHALL be applied as the digit's text color (or equivalent foreground styling) rather than a background fill, to keep the cell's existing cell-level partner background readable.

### Decision: Keep the old function name as a thin wrapper, or replace inline

`computeConjugatePairCellIndexes` is only called from one place ([src/App.tsx:85-93](src/App.tsx#L85-L93)). Replacing the call site directly is preferred over preserving a wrapper for a single caller. If a wrapper is genuinely useful for a future test or solver, it can be added then.

## Risks / Trade-offs

- **[Risk] Color collision in dark mode.** The current bivalue (violet) and same-digit (amber) highlights already coexist with the conjugate highlight; adding three new colors increases the chance of clashing rings or backgrounds. **Mitigation:** verify side-by-side in both themes during implementation; prefer ring color over background where possible to keep the cell value legible.
- **[Risk] Overlap when a cell is in many pairs.** A heavily-noted cell with three or four partners (across different digits and units) could read as a busy clump. **Mitigation:** scope emphasis to the *selected* cell's partner relationships only; other conjugate cells are dimmed. Acceptable for v1; future iterations can add per-digit filtering.
- **[Trade-off] No partner indication when nothing is selected.** With no selected cell, the overview mode falls back to the existing "every conjugate cell lit" view, which doesn't show partner structure. This is intentional — the selection-scoped emphasis is the new behavior, not the only behavior.
- **[Trade-off] Recomputing pairs on every grid change.** `solverHighlights` is already memoized on `game?.grid`; the structured pair list will follow the same memoization. Compute is O(9 × 3 × 9) units × digits per recompute, which is negligible.
