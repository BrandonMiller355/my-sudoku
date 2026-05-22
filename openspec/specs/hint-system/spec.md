# hint-system Specification

## Purpose
TBD - created by archiving change fix-fish-detection-false-positives. Update Purpose after archive.
## Requirements
### Requirement: Basic-fish detection uses the strict fish definition

The system SHALL detect basic fish (X-Wing, Swordfish, Jellyfish) using the strict definition: for a fish of size `N` on a digit `D` in a chosen base-unit type (rows or columns), each of the `N` selected base lines MUST contain `D` as a candidate in exactly `N` cells, and the union of cover-line indices (perpendicular to the base unit) across those candidate cells MUST equal exactly `N`. The system SHALL report only fish that satisfy both conditions.

`N` is 2 for X-Wing, 3 for Swordfish, and 4 for Jellyfish. A "candidate cell" is a cell whose computed candidates list includes `D`. Solved or given cells have an empty candidates list and therefore contain no candidates of any digit.

#### Scenario: X-Wing is reported only when both rows have exactly two candidates of the digit in the same two columns

- **WHEN** detection runs against candidates where digit D appears as a candidate in exactly two cells of row R1 at columns C1 and C2, AND in exactly two cells of row R2 at the same columns C1 and C2, AND nowhere else relevant to the pair
- **THEN** the detector includes an X-Wing location with `digit = D`, `baseLines = [R1, R2]`, `coverLines = [C1, C2]`, `baseUnitType = "row"`
- **AND** the detector reports this pair exactly once

#### Scenario: X-Wing is not reported when one base line has no candidates of the digit

- **WHEN** detection runs against candidates where digit D appears as a candidate in exactly two cells of row R1 at columns C1 and C2, AND digit D is already solved in row R2 (so no cell in row R2 has D as a candidate)
- **THEN** the detector does not include an X-Wing location for the pair (R1, R2) on digit D
- **AND** this holds regardless of which other rows also have D solved or have D candidates in other columns

#### Scenario: X-Wing is not reported when a base line has fewer than two candidates of the digit

- **WHEN** detection runs against candidates where digit D appears as a candidate in exactly one cell of row R1 at column C1, AND in exactly two cells of row R2 at columns C1 and C2
- **THEN** the detector does not include an X-Wing location for the pair (R1, R2) on digit D

#### Scenario: X-Wing is not reported when a base line has more than two candidates of the digit

- **WHEN** detection runs against candidates where digit D appears as a candidate in three or more cells of row R1, AND in exactly two cells of row R2 at columns C1 and C2
- **THEN** the detector does not include an X-Wing location for the pair (R1, R2) on digit D, even if R1's candidates for D include C1 and C2

#### Scenario: Column-based X-Wing applies the same strict rule

- **WHEN** detection runs with columns as the base unit and digit D appears as a candidate in exactly two cells of column C1 at rows R1 and R2, AND in exactly two cells of column C2 at the same rows R1 and R2
- **THEN** the detector includes an X-Wing location with `digit = D`, `baseLines = [C1, C2]`, `coverLines = [R1, R2]`, `baseUnitType = "col"`

#### Scenario: Column-based X-Wing is not reported when one base column has the digit already solved

- **WHEN** detection runs with columns as the base unit and digit D appears as a candidate in exactly two cells of column C1 at rows R1 and R2, AND digit D is already solved in column C2
- **THEN** the detector does not include an X-Wing location for the pair (C1, C2) on digit D

#### Scenario: Swordfish is reported only when all three base lines have exactly three candidates of the digit confined to the same three cover lines

- **WHEN** detection runs against candidates where digit D appears as a candidate in exactly three cells of row R1 at columns drawn from {C1, C2, C3}, AND in exactly three cells of row R2 at columns drawn from {C1, C2, C3}, AND in exactly three cells of row R3 at columns drawn from {C1, C2, C3}, AND the union of those columns across all three rows is exactly {C1, C2, C3}
- **THEN** the detector includes a Swordfish location with `digit = D`, `baseLines = [R1, R2, R3]`, `coverLines = [C1, C2, C3]`, `baseUnitType = "row"`

#### Scenario: Swordfish is not reported when any base line has a count other than three

- **WHEN** detection runs against candidates where two rows have exactly three candidates of digit D within columns {C1, C2, C3}, AND a third row has only two candidates of D within {C1, C2, C3}
- **THEN** the detector does not include a Swordfish location for that triple of rows on digit D

#### Scenario: Jellyfish is reported only when all four base lines have exactly four candidates of the digit confined to the same four cover lines

- **WHEN** detection runs against candidates where digit D appears as a candidate in exactly four cells of each of four rows R1, R2, R3, R4 with all cells lying within columns {C1, C2, C3, C4}, AND the union of those columns across all four rows is exactly {C1, C2, C3, C4}
- **THEN** the detector includes a Jellyfish location with `digit = D`, `baseLines = [R1, R2, R3, R4]`, `coverLines = [C1, C2, C3, C4]`, `baseUnitType = "row"`

#### Scenario: Jellyfish is not reported when any base line has a count other than four

- **WHEN** detection runs against candidates where three rows have exactly four candidates of digit D within columns {C1, C2, C3, C4}, AND a fourth row has only three candidates of D within {C1, C2, C3, C4}
- **THEN** the detector does not include a Jellyfish location for that quadruple of rows on digit D

