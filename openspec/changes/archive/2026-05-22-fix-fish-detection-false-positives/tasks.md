## 1. Update detectBasicFish for strict fish definition

- [x] 1.1 In `src/hintDetection/fish.ts`, inside `detectBasicFish`, build a per-digit list of base lines whose candidate count for that digit equals exactly `size` (count cells in the base line where `candidates[idx].includes(digit)` is true).
- [x] 1.2 Replace the existing combination loop so that combinations of size `size` are drawn from the filtered base-line list rather than from all nine base lines.
- [x] 1.3 Retain the existing cover-line union check (`coverLinesSet.size === size`) as the second condition, so combinations whose candidates do not align in the same `size` cover lines are rejected.
- [x] 1.4 Confirm `detectXWing`, `detectSwordfish`, and `detectJellyfish` still call `detectBasicFish` with sizes 2, 3, 4 respectively — no changes expected to these wrappers.

## 2. Manual verification against the bug-report puzzle

- [x] 2.1 Load the Expert puzzle from the bug report into the app.
- [x] 2.2 Open the Hint modal, reveal the X-Wing count, and confirm the count reflects only true X-Wings (combinations where both base lines have exactly two candidates of the digit in the same two cover lines).
- [x] 2.3 Confirm that no reported X-Wing names a base line in which the target digit is already solved (e.g., the previously-reported "Digit 1: Rows 1, 3 / Columns 1, 9" no longer appears, since digit 1 is solved in row 3).
- [x] 2.4 Repeat the count/location reveal for Swordfish and Jellyfish on the same puzzle and confirm the counts are similarly reduced to true matches.

## 3. Spec validation

- [x] 3.1 Run `openspec validate fix-fish-detection-false-positives --strict` and resolve any reported issues.
