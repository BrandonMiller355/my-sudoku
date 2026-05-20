import type { Candidates, HintResult } from "./types";
import { indicesInRow, indicesInCol, rowOf, colOf, boxOf } from "./utils";
import { computeConjugatePairs } from "../utils";
import type { CellState } from "../types";

export function detectSkyscraper(candidates: Candidates): HintResult {
  const locations: Array<{ type: "single-digit"; digit: number; boxIndex: number }> = [];

  for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    for (let row1 = 0; row1 < 9; row1++) {
      const cells1 = indicesInRow(row1).filter((i) => candidates[i].includes(digit));
      if (cells1.length !== 2) continue;

      for (let row2 = row1 + 1; row2 < 9; row2++) {
        const cells2 = indicesInRow(row2).filter((i) => candidates[i].includes(digit));
        if (cells2.length !== 2) continue;

        const cols1 = [colOf(cells1[0]), colOf(cells1[1])];
        const cols2 = [colOf(cells2[0]), colOf(cells2[1])];

        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            if (cols1[i] === cols2[j]) {
              const otherCol1 = cols1[1 - i];
              const otherCol2 = cols2[1 - j];
              if (otherCol1 !== otherCol2) {
                locations.push({ type: "single-digit", digit, boxIndex: boxOf(cells1[0]) });
                locations.push({ type: "single-digit", digit, boxIndex: boxOf(cells1[1]) });
                locations.push({ type: "single-digit", digit, boxIndex: boxOf(cells2[0]) });
                locations.push({ type: "single-digit", digit, boxIndex: boxOf(cells2[1]) });
              }
            }
          }
        }
      }
    }

    for (let col1 = 0; col1 < 9; col1++) {
      const cells1 = indicesInCol(col1).filter((i) => candidates[i].includes(digit));
      if (cells1.length !== 2) continue;

      for (let col2 = col1 + 1; col2 < 9; col2++) {
        const cells2 = indicesInCol(col2).filter((i) => candidates[i].includes(digit));
        if (cells2.length !== 2) continue;

        const rows1 = [rowOf(cells1[0]), rowOf(cells1[1])];
        const rows2 = [rowOf(cells2[0]), rowOf(cells2[1])];

        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            if (rows1[i] === rows2[j]) {
              const otherRow1 = rows1[1 - i];
              const otherRow2 = rows2[1 - j];
              if (otherRow1 !== otherRow2) {
                locations.push({ type: "single-digit", digit, boxIndex: boxOf(cells1[0]) });
                locations.push({ type: "single-digit", digit, boxIndex: boxOf(cells1[1]) });
                locations.push({ type: "single-digit", digit, boxIndex: boxOf(cells2[0]) });
                locations.push({ type: "single-digit", digit, boxIndex: boxOf(cells2[1]) });
              }
            }
          }
        }
      }
    }
  }

  return {
    present: locations.length > 0,
    count: locations.length,
    locations: locations.filter((loc, idx, arr) => arr.findIndex((l) => JSON.stringify(l) === JSON.stringify(loc)) === idx),
  };
}

export function detect2StringKite(candidates: Candidates): HintResult {
  const locations: Array<{ type: "single-digit"; digit: number; boxIndex: number }> = [];

  for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    for (let row = 0; row < 9; row++) {
      const cellsInRow = indicesInRow(row).filter((i) => candidates[i].includes(digit));
      if (cellsInRow.length !== 2) continue;

      for (let col = 0; col < 9; col++) {
        const cellsInCol = indicesInCol(col).filter((i) => candidates[i].includes(digit));
        if (cellsInCol.length !== 2) continue;

        for (const rowCell of cellsInRow) {
          for (const colCell of cellsInCol) {
            if (boxOf(rowCell) === boxOf(colCell)) {
              locations.push({ type: "single-digit", digit, boxIndex: boxOf(rowCell) });
            }
          }
        }
      }
    }
  }

  return {
    present: locations.length > 0,
    count: locations.length,
    locations: locations.filter((loc, idx, arr) => arr.findIndex((l) => JSON.stringify(l) === JSON.stringify(loc)) === idx),
  };
}

export function detectEmptyRectangle(candidates: Candidates, grid: CellState[]): HintResult {
  const locations: Array<{ type: "single-digit"; digit: number; boxIndex: number }> = [];

  const conjugatePairs = computeConjugatePairs(grid);

  for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    for (let box = 0; box < 9; box++) {
      const boxRow = Math.floor(box / 3);
      const boxCol = box % 3;
      const boxIndices = Array.from({ length: 81 }, (_, i) => i).filter(
        (i) =>
          Math.floor(Math.floor(i / 9) / 3) === boxRow &&
          Math.floor((i % 9) / 3) === boxCol
      );

      const cellsWithDigit = boxIndices.filter((i) => candidates[i].includes(digit));
      if (cellsWithDigit.length === 0) continue;

      const rows = new Set(cellsWithDigit.map((i) => Math.floor(i / 9)));
      const cols = new Set(cellsWithDigit.map((i) => i % 9));

      if (rows.size === 1 && cols.size > 1 && rows.size * cols.size === cellsWithDigit.length) {
        const row = Array.from(rows)[0];
        for (const conjugatePair of conjugatePairs) {
          if (conjugatePair.digit !== digit) continue;
          if (conjugatePair.unit.type !== "row") continue;
          if (conjugatePair.unit.index !== row) continue;

          locations.push({ type: "single-digit", digit, boxIndex: box });
          break;
        }
      }

      if (cols.size === 1 && rows.size > 1 && rows.size * cols.size === cellsWithDigit.length) {
        const col = Array.from(cols)[0];
        for (const conjugatePair of conjugatePairs) {
          if (conjugatePair.digit !== digit) continue;
          if (conjugatePair.unit.type !== "col") continue;
          if (conjugatePair.unit.index !== col) continue;

          locations.push({ type: "single-digit", digit, boxIndex: box });
          break;
        }
      }
    }
  }

  return {
    present: locations.length > 0,
    count: locations.length,
    locations: locations.filter((loc, idx, arr) => arr.findIndex((l) => JSON.stringify(l) === JSON.stringify(loc)) === idx),
  };
}
