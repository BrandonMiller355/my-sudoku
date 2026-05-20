## Why

The app already gives players tools to discover board structure (bivalue and conjugate-pair highlights, candidate exposure), but provides no safety net when the player is stuck and cannot see what technique applies. A hint system that names available techniques — without revealing cells or digits — extends the existing "tools, not answers" stance and gives players a graduated way to unstick themselves without skipping the deductive work.

## What Changes

- Add a new `Hint` button inside the existing Advanced modal that opens a dedicated Hint modal in place of Advanced.
- Hint modal lists ~17 Sudoku techniques grouped by tier (singles, pairs/triples/quads, intersections, fish, wings, single-digit patterns, uniqueness, simple coloring).
- For each technique, a three-stage text-only progression: presence (yes/no), then count, then location described in the technique's natural unit(s) (row, column, box, or combinations for fish/wings).
- Detection uses each cell's pencil marks when present and falls back to logically possible candidates otherwise, matching the existing `getEffectiveCandidates` rule. Hints may be unsound when pencil marks are incomplete; this is accepted.
- "Present" means the pattern is structurally on the board, even when it eliminates no candidates from current pencil marks.
- Hint modal auto-closes and resets all per-technique progression state on pause, completion, return to menu, or new puzzle.
- No grid highlighting, no placement, no candidate elimination actions, no hint counting.

## Capabilities

### New Capabilities
- `hint-system`: Per-technique availability hints surfaced through a progressive text-only dialog, covering singles, n-tuples, intersections, basic and finned fish (X-Wing, Swordfish, Jellyfish), wings (XY-Wing, XYZ-Wing, W-Wing), single-digit patterns (Skyscraper, 2-String Kite, Empty Rectangle), uniqueness techniques (Unique Rectangle, BUG+1), and Simple Coloring.

### Modified Capabilities
<!-- No existing capabilities have requirement changes. The Advanced modal gains a new entry point but its existing requirements are unchanged. -->

## Impact

- New module(s) for technique detectors (no shared state with `computeConjugatePairs` / `computeBivalueCellIndexes`, but reuses unit-index helpers in [src/utils.ts](src/utils.ts)).
- New UI component for the Hint modal; new `Hint` button wired into the Advanced modal block in [src/App.tsx](src/App.tsx).
- New ephemeral state in `App` for hint-modal open status and per-technique progression stage. No persisted state changes; `GameState`, `Settings`, `CompletedGame`, and storage are untouched.
- No breaking changes. No dependency additions expected.
- Tier F chain techniques (Forcing Chains, AIC/Nice Loops, Sue de Coq, Medusa) are explicitly deferred to a future change.
