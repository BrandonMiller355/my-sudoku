## 1. Detection Primitives

- [x] 1.1 Create `src/hintDetection/` module folder with an `index.ts` barrel export
- [x] 1.2 Define a shared `Candidates = number[][]` (length 81) type and a `computeCandidates(grid: CellState[]): Candidates` helper that applies the per-cell pencil-mark-or-logical rule (extracted from the existing `getEffectiveCandidates` in `src/utils.ts`)
- [x] 1.3 Define a shared `HintLocation` discriminated union covering: single-unit (`row` | `col` | `box` + index), unit-pair (for fish: base unit type, base indices, cover indices, digit), and box-set (list of 3×3 box indices, for wings/uniqueness/coloring)
- [x] 1.4 Define a shared `HintResult` shape `{ present: boolean; count: number; locations: HintLocation[] }` returned by every detector
- [x] 1.5 Define a `HintTechnique` enum/union listing all 21 supported technique identifiers grouped by tier
- [x] 1.6 Define a `HintTechniqueTier` union (`"singles" | "n-tuples" | "intersections" | "fish" | "wings" | "single-digit" | "uniqueness" | "coloring"`) and a mapping from technique to tier
- [x] 1.7 Define a `TECHNIQUE_DISPLAY_NAMES` mapping from technique identifier to its UI label

## 2. Singles Detectors

- [x] 2.1 Implement `detectNakedSingle(candidates)` returning each empty cell whose candidate set has length 1; location includes the cell's 3×3 box index
- [x] 2.2 Implement `detectHiddenSingle(candidates)` scanning every (unit, digit) pair where the digit has exactly one candidate cell in the unit; location identifies the unit type and unit index
- [x] 2.3 Ensure Hidden Single in multiple intersecting units counts as multiple instances per the spec

## 3. n-Tuple Detectors

- [x] 3.1 Implement a generic `detectNakedSubset(candidates, size)` that finds N cells in a unit whose candidate union has exactly N digits; produce per-unit-type scans
- [x] 3.2 Wire `detectNakedPair`, `detectNakedTriple`, `detectNakedQuad` as size-2/3/4 specializations; suppress smaller subsets being reported as larger
- [x] 3.3 Implement a generic `detectHiddenSubset(candidates, size)` that finds N digits whose candidate cells in a unit are exactly the same N cells
- [x] 3.4 Wire `detectHiddenPair`, `detectHiddenTriple`, `detectHiddenQuad` as size-2/3/4 specializations

## 4. Intersections Detector

- [x] 4.1 Implement `detectPointingPairOrBoxLine(candidates)` scanning every (box, digit) pair for box→line confinement and every (line, digit) pair for line→box confinement; location includes both the box and the line

## 5. Basic Fish Detectors

- [x] 5.1 Implement a generic `detectBasicFish(candidates, baseUnit: 'row' | 'col', size: 2 | 3 | 4)` finding digits whose candidate cells across N base lines are confined to the same N cover lines
- [x] 5.2 Wire `detectXWing`, `detectSwordfish`, `detectJellyfish` as size-2/3/4 specializations across both row-base and column-base orientations; suppress smaller fish being reported as larger

## 6. Wing Detectors

- [x] 6.1 Implement `detectXYWing(candidates)` iterating bivalue pivots `{X,Y}` and checking peer cells for `{X,Z}` and `{Y,Z}` wings with `X`, `Y`, `Z` distinct; location includes pivot and wing box indices
- [x] 6.2 Implement `detectXYZWing(candidates)` iterating trivalue pivots `{X,Y,Z}` and checking peer cells for `{X,Z}` and `{Y,Z}` wings; location includes pivot and wing box indices
- [x] 6.3 Implement `detectWWing(candidates)` iterating pairs of non-peering cells with identical bivalue `{X,Y}` and verifying a conjugate pair on `X` (or on `Y`) whose endpoints peer both cells

## 7. Single-Digit Pattern Detectors

- [x] 7.1 Implement `detectSkyscraper(candidates)` for both row-base and column-base orientations: two parallel lines each with exactly two candidate cells for a digit, sharing exactly one perpendicular line
- [x] 7.2 Implement `detect2StringKite(candidates)`: row with exactly two candidate cells for a digit and column with exactly two candidate cells for the digit, sharing a 3×3 box at one endpoint each
- [x] 7.3 Implement `detectEmptyRectangle(candidates)`: box-internal candidate cross for a digit plus an external conjugate pair enabling the elimination

## 8. Uniqueness Detectors

- [x] 8.1 Implement `detectUniqueRectangle(candidates)` finding four corners spanning exactly two rows, two columns, and two 3×3 boxes, with every corner containing both `X` and `Y` as candidates
- [x] 8.2 Implement `detectBugPlusOne(candidates, grid)` verifying the BUG+1 board shape: exactly one trivalue cell, all other empty cells bivalue, with the per-unit count invariant

## 9. Coloring Detector

- [x] 9.1 Implement `detectSimpleColoring(candidates)`: for each digit, build the conjugate-pair graph, two-color each connected component, and report any component exhibiting same-color/same-unit collision or an external cell peering both colors
- [x] 9.2 Reuse `computeConjugatePairs` from `src/utils.ts` where possible to avoid duplicating conjugate-pair logic

## 10. Detector Test Coverage

- [x] 10.1 Add a `src/hintDetection/__tests__/` (or co-located test) directory and a per-technique positive test fixture (a constructed 81-cell array) for every detector
- [x] 10.2 Add a per-technique negative test fixture confirming the detector returns `present: false` on a board without the pattern
- [x] 10.3 Verify the "structural presence" rule with a fixture where a pattern exists but eliminates nothing in current pencil marks

## 11. UI: Hint Button in Advanced Modal

- [x] 11.1 Add a `Hint` button to the Advanced-modal button group in `src/App.tsx`, styled consistently with existing Advanced buttons and disabled when `game.isPaused || game.isComplete`
- [x] 11.2 Add ephemeral state `hintModalOpen: boolean` and a hint-progression state shape `Map<HintTechnique, 'none' | 'presence' | 'count' | 'location'>` initialized to `none` for every technique
- [x] 11.3 Activating the Hint button sets `advancedOpen = false` and `hintModalOpen = true`, and resets the progression state map

## 12. UI: Hint Modal

- [x] 12.1 Create a new `HintModal` component (in `src/App.tsx` or a new file) following the structural pattern of the existing Advanced modal: full-screen backdrop, centered card, close button, Escape-to-close, click-backdrop-to-close
- [x] 12.2 Render every technique grouped under its tier section header in tier order; each technique renders as a row with its display name and an inline area for stage controls and reveal text
- [x] 12.3 Stage 0 (`none`): show an `Ask` (or similarly labeled) button that, when clicked, computes the detector and advances state to `presence`
- [x] 12.4 Stage 1 (`presence`): show the presence text ("Present" / "Not present"); if present, show a `How many?` button that advances to `count`; if not present, do not offer further controls
- [x] 12.5 Stage 2 (`count`): show the count text and a `Where?` button that advances to `location`
- [x] 12.6 Stage 3 (`location`): show the formatted location text per technique family (single-unit techniques: unit type + 1-based index; fish: digit + base lines + cover lines; wings/uniqueness/coloring: box indices)
- [x] 12.7 Implement a small location-formatting helper that converts `HintLocation` shapes into the displayed strings

## 13. UI: Modal Lifecycle

- [x] 13.1 Close the Hint modal and reset the progression state map whenever `game.isPaused` transitions to true, `game.isComplete` transitions to true, the player returns to the menu, or a new puzzle starts (mirror the existing `setAdvancedOpen(false)` / `setHighlightBivalues(false)` patterns)
- [x] 13.2 Verify by manual test: opening Hint, revealing stages, then pausing, completing, or returning to menu closes the modal and resets progression
- [x] 13.3 Verify by manual test: opening Hint, revealing stages, closing, and reopening within the same puzzle returns every technique to stage 0

## 14. Validation

- [x] 14.1 Run `openspec validate --strict add-hint-system` and resolve any errors
- [x] 14.2 Run `npm run build` (or the project's typecheck command) and resolve type errors
- [x] 14.3 Smoke-test the full player flow on an in-progress puzzle: open Advanced → Hint, walk through several techniques across multiple tiers, verify text outputs match a known-good board
