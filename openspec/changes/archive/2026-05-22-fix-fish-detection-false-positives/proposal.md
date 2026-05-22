## Why

The hint system's X-Wing, Swordfish, and Jellyfish detectors report large numbers of bogus matches (94 X-Wings in one Expert puzzle, including pairs like "Digit 1: Rows 1, 3 / Columns 1, 9" where digit 1 is already solved in row 3). The shared `detectBasicFish` routine validates only the **union** of cover-line candidates across base lines, so any base line that contributes zero candidates — because the digit is already placed in that row/column — passes vacuously. Players who rely on the count and location stages cannot trust the output.

## What Changes

- Tighten `detectBasicFish` in `src/hintDetection/fish.ts` to require that **each** base line in a candidate combination contains the digit as a candidate in **exactly `size` cells** (2 for X-Wing, 3 for Swordfish, 4 for Jellyfish).
- Keep the existing union check: the candidates from all base lines must lie within exactly `size` cover lines.
- The fix is shared across X-Wing, Swordfish, and Jellyfish detectors via `detectBasicFish`.
- No public API or hint-result shape changes; only the set of `locations` returned by the three fish detectors changes.

## Capabilities

### New Capabilities

- `hint-system`: Establishes a correctness rule for basic-fish detection (X-Wing, Swordfish, Jellyfish). The live `openspec/specs/hint-system/spec.md` does not yet exist; this change introduces it with the requirements scoped to fish-detection correctness so the rule is captured authoritatively.

### Modified Capabilities

_None._

## Impact

- **Code**: `src/hintDetection/fish.ts` (only file modified).
- **Behavior**: X-Wing, Swordfish, and Jellyfish counts and location lists will shrink to true matches. The Hint modal's Stage 1 / Stage 2 / Stage 3 reveals will reflect the corrected results.
- **APIs / dependencies**: None.
- **Out of scope**: The adjacent stale-notes issue at `src/hintDetection/types.ts:130-131` (user notes used as candidates without filtering against solved peers) is a separate concern and not addressed here.
