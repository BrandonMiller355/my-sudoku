import type { Candidates, HintLocation, HintResult } from "./types";
import { indicesInRow, indicesInCol, indicesInBox, rowOf, colOf, boxOf } from "./utils";

export function detectPointingPairOrBoxLine(candidates: Candidates): HintResult {
  const locations: HintLocation[] = [];

  for (let box = 0; box < 9; box++) {
    const boxIndices = indicesInBox(box);
    for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const cellsWithDigit = boxIndices.filter((i) => candidates[i].includes(digit));
      if (cellsWithDigit.length === 0) continue;

      const rows = new Set(cellsWithDigit.map((i) => rowOf(i)));
      const cols = new Set(cellsWithDigit.map((i) => colOf(i)));

      if (rows.size === 1) {
        const row = Array.from(rows)[0];
        locations.push({
          type: "single-unit",
          unitType: "row",
          index: row,
        });
      }

      if (cols.size === 1) {
        const col = Array.from(cols)[0];
        locations.push({
          type: "single-unit",
          unitType: "col",
          index: col,
        });
      }
    }
  }

  for (let row = 0; row < 9; row++) {
    const rowIndices = indicesInRow(row);
    for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const cellsWithDigit = rowIndices.filter((i) => candidates[i].includes(digit));
      if (cellsWithDigit.length === 0) continue;

      const boxes = new Set(cellsWithDigit.map((i) => boxOf(i)));
      if (boxes.size === 1) {
        const box = Array.from(boxes)[0];
        locations.push({
          type: "single-unit",
          unitType: "box",
          index: box,
        });
      }
    }
  }

  for (let col = 0; col < 9; col++) {
    const colIndices = indicesInCol(col);
    for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const cellsWithDigit = colIndices.filter((i) => candidates[i].includes(digit));
      if (cellsWithDigit.length === 0) continue;

      const boxes = new Set(cellsWithDigit.map((i) => boxOf(i)));
      if (boxes.size === 1) {
        const box = Array.from(boxes)[0];
        locations.push({
          type: "single-unit",
          unitType: "box",
          index: box,
        });
      }
    }
  }

  return {
    present: locations.length > 0,
    count: locations.length,
    locations,
  };
}
