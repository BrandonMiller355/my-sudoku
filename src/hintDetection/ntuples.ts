import type { Candidates, HintResult } from "./types";
import { indicesInRow, indicesInCol, indicesInBox, getCombinations, unionOfArrays, areArraysEqual, getEmptyCellsInUnit } from "./utils";

function detectNakedSubset(candidates: Candidates, size: number): HintResult {
  const locations: Array<{ type: "single-unit"; unitType: "row" | "col" | "box"; index: number }> = [];

  function scanUnit(indices: number[], unitType: "row" | "col" | "box", unitIndex: number) {
    const emptyCells = getEmptyCellsInUnit(candidates, indices);
    const cellCombos = getCombinations(emptyCells, size);

    for (const combo of cellCombos) {
      const candidateSets = combo.map((i) => candidates[i]);
      const union = unionOfArrays(candidateSets);

      if (union.size === size) {
        const unionArr = Array.from(union).sort();
        const supersetCombo = emptyCells.filter((i) =>
          areArraysEqual(unionArr, Array.from(unionOfArrays([candidates[i]]).values()).sort())
        );
        if (supersetCombo.length === size && areArraysEqual(supersetCombo.sort((a, b) => a - b), combo.sort((a, b) => a - b))) {
          locations.push({ type: "single-unit", unitType, index: unitIndex });
        }
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

export function detectNakedPair(candidates: Candidates): HintResult {
  return detectNakedSubset(candidates, 2);
}

export function detectNakedTriple(candidates: Candidates): HintResult {
  return detectNakedSubset(candidates, 3);
}

export function detectNakedQuad(candidates: Candidates): HintResult {
  return detectNakedSubset(candidates, 4);
}

function detectHiddenSubset(candidates: Candidates, size: number): HintResult {
  const locations: Array<{ type: "single-unit"; unitType: "row" | "col" | "box"; index: number }> = [];

  function scanUnit(indices: number[], unitType: "row" | "col" | "box", unitIndex: number) {
    const emptyCells = getEmptyCellsInUnit(candidates, indices);
    const allDigits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const digitCombos = getCombinations(allDigits, size);

    for (const digitCombo of digitCombos) {
      const cellsWithDigit = new Set<number>();
      for (const digit of digitCombo) {
        for (const cellIdx of emptyCells) {
          if (candidates[cellIdx].includes(digit)) {
            cellsWithDigit.add(cellIdx);
          }
        }
      }

      if (cellsWithDigit.size === size) {
        const cellArray = Array.from(cellsWithDigit);
        let isValid = true;
        for (const digit of digitCombo) {
          const count = cellArray.filter((i) => candidates[i].includes(digit)).length;
          if (count !== size) {
            isValid = false;
            break;
          }
        }
        if (isValid) {
          locations.push({ type: "single-unit", unitType, index: unitIndex });
        }
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

export function detectHiddenPair(candidates: Candidates): HintResult {
  return detectHiddenSubset(candidates, 2);
}

export function detectHiddenTriple(candidates: Candidates): HintResult {
  return detectHiddenSubset(candidates, 3);
}

export function detectHiddenQuad(candidates: Candidates): HintResult {
  return detectHiddenSubset(candidates, 4);
}
