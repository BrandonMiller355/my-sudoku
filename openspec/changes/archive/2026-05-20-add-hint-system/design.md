## Context

The app already exposes solver-adjacent assists through an Advanced modal: a "Highlight bivalues" toggle, a "Highlight conjugate pairs" toggle, and "Expose all candidates." These tools share a stance — they reveal *structure* without revealing *answers*, and they respect the player's pencil marks as the source of truth when present.

A hint system is the missing safety net under that stance. Where the existing tools assume the player can see the board, the hint system assumes the player cannot see what technique applies. The design extends the same "tools, not answers" stance: hints name the *kind* of pattern present and approximately where to look, but never reveal cells or digits.

Existing helpers in [src/utils.ts](src/utils.ts) (`getCandidateDigitsFromGrid`, `getEffectiveCandidates` per-cell rule, `indicesInRow` / `indicesInCol` / `indicesInBox`, `computeConjugatePairs`) cover most primitives a detector pipeline needs.

## Goals / Non-Goals

**Goals:**
- A single Hint entry point inside the existing Advanced modal that opens a Hint modal in place of Advanced.
- A per-technique progressive text reveal: presence → count → location.
- Coverage of ~17 techniques across singles, n-tuples, intersections, basic fish, wings, single-digit patterns, uniqueness, and Simple Coloring.
- Consistency with existing pencil-mark behavior: per-cell pencil marks take precedence when present, otherwise logical candidates.
- Auto-close and reset on pause, completion, return to menu, and new puzzle.

**Non-Goals:**
- No grid highlighting from the hint flow (the existing highlight toggles already serve that role).
- No placement of digits and no automatic candidate elimination.
- No tracking, counting, throttling, or "assisted completion" marking of hint usage.
- No per-technique pedagogical content (definitions, tutorials, diagrams). Names are surfaced; explanations are not.
- No chain techniques in this change (Forcing Chains, AIC / Nice Loops, Sue de Coq, Medusa). Deferred to a future change.

## Decisions

### Decision: Per-technique buttons, not a unified "next step" pipeline

A "find the simplest available step" pipeline (the alternative considered) would name only one technique at a time and would lean toward placement / elimination actions. That model is the path most other apps take, but it pulls toward "give the player the answer," which conflicts with the existing tools-not-answers stance. Per-technique buttons let the player drive — they ask, the system answers, the player stays in control of how much information they consume.

### Decision: Text-only progression in three stages

The reveal is presence (yes/no) → count → location, surfaced as text inside the Hint modal. Cell-level highlighting was considered and rejected: highlighting collapses the count and location stages into one, and a player who wants spatial information already has the Advanced highlight toggles. Keeping hints text-only keeps the two systems clearly distinct.

### Decision: Location described in the technique's natural unit(s)

Each technique has a unit shape that makes its pattern findable:

- Naked single, hidden single, naked/hidden n-tuple, pointing pair / box-line: a single row, column, or box.
- X-Wing, Swordfish, Jellyfish: row-and-column intersections (e.g., "rows 2 & 5, columns 3 & 7").
- XY-Wing, XYZ-Wing, W-Wing: the boxes containing the pattern cells.
- Skyscraper, 2-String Kite, Empty Rectangle: the boxes containing the pattern cells.
- Unique Rectangle: the four boxes (typically two) containing the rectangle corners.
- BUG+1: the box containing the trivalue cell.
- Simple Coloring: the boxes containing the cells participating in the chain.

Always-3×3-box reporting was considered and rejected: it loses "this is a row-based hidden single" information and is harder to act on for techniques that span multiple unit types.

### Decision: "Present" means structurally present, not effectively present

A naked pair is "present" if two cells in a unit have identical bivalue candidate sets, even when no peer cell has either of those digits to eliminate. Filtering presence on "would eliminate something" was considered. Rejected because: it ties hint output to the player's pencil-mark coverage, surfaces the same false-positive issue as B1 but worse (a structurally present pattern disappears because the player hasn't pencilled in candidates yet), and is harder to explain in the spec.

### Decision: Per-cell pencil-mark fallback (B1)

Detection uses each cell's pencil marks when `cell.notes.length > 0` and logical candidates from peer values otherwise — the same `getEffectiveCandidates` rule used by conjugate-pair detection. This can produce "wrong" hints when pencil marks are incomplete on some cells but not others (e.g., a "naked pair" formed by two cells whose noted candidates happen to match, when logically one has additional candidates). This is accepted; the alternative (a uniform "all pencil marks or all logical" rule) was considered but rejected for inconsistency with the existing pattern.

### Decision: Hint modal replaces the Advanced modal

Clicking Hint inside the Advanced modal closes Advanced and opens the Hint modal at the same z-layer. Stacking (Hint over Advanced) was considered and rejected — the player has finished with the Advanced toggles by the time they're looking for a hint, so returning to Advanced on close is friction. Closing the Hint modal returns directly to the game.

### Decision: Per-technique progression resets each time the Hint modal opens

When the Hint modal opens, every technique starts at stage 0 (presence not yet asked). Closing and reopening the modal discards prior progression. Persisting per-puzzle progression was considered. Rejected because: (a) it complicates the mental model — the modal would be a stateful surface that diverges from "what does the board look like right now"; (b) the cost of re-asking is one click; (c) on pause/complete/menu the spec already requires a reset, so the only case persistence would help is "close and reopen during active play," which is rare.

### Decision: Detectors operate on a snapshot, not a live grid

Each detector takes a `CellState[]` (or a `Candidates` array derived from it) and returns a structured result (presence, count, locations). The Hint modal computes detections lazily on stage transition: presence is computed when the player clicks the technique, count when the player clicks "How many?", location when the player clicks "Where?". An alternative — compute everything upfront when the modal opens — was rejected on perf grounds (17 detectors against the full board on every open, including detectors the player will never click).

### Decision: Hint modal disabled on pause and completion

The existing Advanced button is disabled while paused or complete; the Hint button inside Advanced follows the same rule. If the modal is open when the game pauses or completes (only possible via auto-completion mid-modal), it auto-closes — matching the existing "no solver assists shown after completion" intent.

## Risks / Trade-offs

- **Detector correctness:** 17 detectors is a lot of code with subtle correctness conditions (especially Unique Rectangle, BUG+1, and Simple Coloring). → Mitigation: per-technique unit tests in the spec scenarios; start from simplest detectors and accumulate, with each detector covered by at least one positive and one negative scenario.
- **Misleading hints from incomplete pencil marks (B1):** A player with partial pencil marks can see "wrong" hints. → Mitigation: accepted by design. The user explicitly chose B1 over a uniform-candidate-source rule. The risk surfaces as inconsistency, not as a crash.
- **Modal UI complexity creep:** A modal that lists 17 techniques and shows three progression stages per technique is dense. → Mitigation: group by tier with section headers (Singles, n-Tuples, Intersections, Fish, Wings, Single-Digit Patterns, Uniqueness, Coloring). Stage controls render inline below each technique row, not as a separate panel.
- **Detector performance:** Wing and uniqueness detectors are quadratic-to-cubic over empty cells. With 81 cells the worst case is small, but the entire pipeline running on every modal open would be wasteful. → Mitigation: lazy stage-driven computation (see decisions above).
- **Tier F deferral could surprise players:** A player who expects "all techniques" might wonder why Forcing Chains is missing. → Mitigation: the proposal lists deferred techniques explicitly; no in-product disclosure needed for v1.
