import type { Candidates, HintResult } from "./types";
import { indicesInRow, indicesInCol, indicesInBox, boxOf } from "./utils";

export function detectNakedSingle(candidates: Candidates): HintResult {
  const locations: Array<{ type: "single-unit"; unitType: "row" | "col" | "box"; index: number }> = [];

  for (let i = 0; i < 81; i++) {
    if (candidates[i].length === 1) {
      const box = boxOf(i);
      locations.push({ type: "single-unit", unitType: "box", index: box });
    }
  }

  return {
    present: locations.length > 0,
    count: locations.length,
    locations,
  };
}

export function detectHiddenSingle(candidates: Candidates): HintResult {
  const locations: Array<{ type: "single-unit"; unitType: "row" | "col" | "box"; index: number }> = [];

  function scanUnit(indices: number[], unitType: "row" | "col" | "box", unitIndex: number) {
    for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const cells = indices.filter((i) => candidates[i].includes(digit));
      if (cells.length === 1) {
        locations.push({ type: "single-unit", unitType, index: unitIndex });
      }
    }
  }

  for (let row = 0; row < 9; row++) {
    scanUnit(indicesInRow(row), "row", row);
  }
  for (let col = 0; col < 9; col++) {
    scanUnit(indicesInCol(col), "col", col);
  }
  for (let box = 0; box < 9; box++) {
    scanUnit(indicesInBox(box), "box", box);
  }

  return {
    present: locations.length > 0,
    count: locations.length,
    locations,
  };
}
