## Context

The hint system exposes X-Wing, Swordfish, and Jellyfish as separate techniques in the Fish tier of the Hint modal. All three are implemented by one shared routine, `detectBasicFish(candidates, baseUnit, size)`, in `src/hintDetection/fish.ts`. The routine iterates over all `C(9, size)` combinations of base lines (rows or columns), collects the cover-line indices where the target digit appears as a candidate, and reports a fish whenever the union of those cover-lines has exactly `size` elements.

The union-only check is the root cause of the false positives. A base line where the digit has zero candidates — because the digit is already solved somewhere in that line — contributes nothing to the union, so any pair of "row with two real candidate columns" + "row where digit is already placed" passes the check vacuously. The same defect inflates Swordfish (`size=3`) and Jellyfish (`size=4`) counts.

Candidates are computed in `computeCandidates` (`src/hintDetection/types.ts:104-144`). Solved/given cells receive `candidates[i] = []`, which is what makes the vacuous union possible.

## Goals / Non-Goals

**Goals:**

- Eliminate the entire class of false-positive fish caused by base lines that contribute zero candidates.
- Apply the fix uniformly to X-Wing, Swordfish, and Jellyfish via the shared `detectBasicFish` routine.
- Preserve the existing `HintResult` shape (`present`, `count`, `locations`) and `fish-details` location type so the UI and tests downstream do not need to change.

**Non-Goals:**

- Generalize to finned, sashimi, or franken fish. Strict basic fish only.
- Fix the stale-notes issue in `computeCandidates` where user notes are used verbatim without filtering against solved peers.
- Add new UI affordances or change the Hint modal's reveal stages.
- Add larger fish sizes (squirmbag, etc.).

## Decisions

### Decision 1: Strict definition — each base line must have exactly `size` candidates

Adopt the textbook strict fish definition: for a fish of size `N`, each of the `N` base lines must contain the digit as a candidate in **exactly `N`** cells, and those cells must lie within the same `N` cover lines.

**Why this over the alternatives:**

| Option | Per-base-line rule | Verdict |
|---|---|---|
| Strict (chosen) | exactly `size` candidates | Matches how X-Wing / Swordfish / Jellyfish are taught; cleanest UI explanation |
| Standard fish | ≥ 2 and ≤ `size`, all within cover set | Permits "two real candidates in one row, only one in the other", which is really one X-Wing degenerating into a hidden single — confusing to present |
| Minimum filter only | drop base lines with 0 candidates | Smallest patch but still admits 1-candidate base lines that are hidden singles, not fish |

The hint system is pedagogical (three-stage reveal, technique-by-technique). The strict definition gives the user a description that exactly matches the rule they would learn from a sudoku tutorial.

### Decision 2: Filter base lines before forming combinations

Pre-compute, per digit, the set of base lines whose candidate count for that digit equals `size`. Form combinations only from that filtered set.

**Why:** It is both the most direct expression of the strict rule and avoids the `C(9, size)` blow-up on combinations that cannot possibly be fish. With `size=4` (Jellyfish), this is a meaningful saving.

The union check (`coverLinesSet.size === size`) is retained as the second condition — once each base line has exactly `size` candidates, the union still has to equal `size` for the candidates to align in the same cover lines.

### Decision 3: Keep the shared `detectBasicFish` routine

Do not split into per-technique routines. The strict rule is `size`-parameterized; one routine remains the cleanest expression.

## Risks / Trade-offs

- **Risk:** Strict mode rejects "asymmetric" basic fish that are technically valid eliminators (one base line has 2 candidates, the other has 3 within the same cover set, etc.).
  → **Mitigation:** Out of scope; the user prefers pedagogical clarity over completeness. If finned/sashimi/standard fish are desired later, add a separate detector rather than weakening the strict rule.

- **Risk:** Existing tests (if any) that assert specific counts on test puzzles may need updating.
  → **Mitigation:** Update the affected expectations as part of this change; the new counts are the correct ones.

- **Risk:** A puzzle where the user previously saw a high X-Wing count will now see far fewer (often zero). Players might mistake the fix for a regression.
  → **Mitigation:** None needed in code; this is the desired behavior. No user-facing release notes are part of this project's workflow.

## Migration Plan

- Single-file edit (`src/hintDetection/fish.ts`); no data migration, no config changes, no API consumers outside the hint detection module.
- Rollback strategy: revert the commit; the change is fully self-contained.

## Open Questions

_None._
