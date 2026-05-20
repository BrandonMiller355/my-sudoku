import type { Candidates, HintResult } from "./types";
import { boxOf, rowOf, colOf, getCombinations } from "./utils";
import type { CellState } from "../types";

export function detectUniqueRectangle(candidates: Candidates): HintResult {
  const locations: Array<{ type: "box-set"; boxIndices: number[] }> = [];

  const bivalueCells: number[] = [];
  for (let i = 0; i < 81; i++) {
    if (candidates[i].length === 2) {
      bivalueCells.push(i);
    }
  }

  const combos = getCombinations(bivalueCells, 4);

  for (const combo of combos) {
    const rows = new Set(combo.map((i) => rowOf(i)));
    const cols = new Set(combo.map((i) => colOf(i)));
    const boxes = new Set(combo.map((i) => boxOf(i)));

    if (rows.size !== 2 || cols.size !== 2 || boxes.size !== 2) continue;

    const rowsArr = Array.from(rows).sort((a, b) => a - b);
    const colsArr = Array.from(cols).sort((a, b) => a - b);

    const corners = combo.filter(
      (i) =>
        (rowOf(i) === rowsArr[0] || rowOf(i) === rowsArr[1]) &&
        (colOf(i) === colsArr[0] || colOf(i) === colsArr[1])
    );

    if (corners.length !== 4) continue;

    const digit1 = candidates[corners[0]][0];
    const digit2 = candidates[corners[0]][1];

    const allMatch = corners.every(
      (i) =>
        (candidates[i].includes(digit1) && candidates[i].includes(digit2)) ||
        candidates[i].length > 2
    );

    if (allMatch) {
      const boxesArr = Array.from(boxes).sort((a, b) => a - b);
      locations.push({ type: "box-set", boxIndices: boxesArr });
    }
  }

  return {
    present: locations.length > 0,
    count: locations.length,
    locations: locations.filter((loc, idx, arr) => arr.findIndex((l) => JSON.stringify(l) === JSON.stringify(loc)) === idx),
  };
}

export function detectBugPlusOne(candidates: Candidates, grid: CellState[]): HintResult {
  const locations: Array<{ type: "single-unit"; unitType: "box"; index: number }> = [];

  let trivValueCellIdx = -1;
  let trivValueCellCount = 0;

  for (let i = 0; i < 81; i++) {
    if (candidates[i].length === 3) {
      trivValueCellIdx = i;
      trivValueCellCount++;
    } else if (candidates[i].length !== 2 && candidates[i].length > 0) {
      return { present: false, count: 0, locations: [] };
    }
  }

  if (trivValueCellCount !== 1) {
    return { present: false, count: 0, locations: [] };
  }

  function checkUnitsHaveCorrectCount(unitIndices: number[], expectedCount: (digit: number) => number): boolean {
    for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      let count = 0;
      for (const idx of unitIndices) {
        if (candidates[idx].includes(digit)) {
          count++;
        }
      }
      if (count !== expectedCount(digit)) {
        return false;
      }
    }
    return true;
  }

  const trivValueDigits = candidates[trivValueCellIdx];
  const expectedCountFunc = (digit: number) =>
    trivValueDigits.includes(digit) && (rowOf(trivValueCellIdx) === Math.floor(trivValueCellIdx / 9) || colOf(trivValueCellIdx) === trivValueCellIdx % 9 || boxOf(trivValueCellIdx) === boxOf(trivValueCellIdx)) ? 3 : 2;

  function rowOf(index: number): number {
    return Math.floor(index / 9);
  }

  function colOf(index: number): number {
    return index % 9;
  }

  function boxOf(index: number): number {
    const row = Math.floor(index / 9);
    const col = index % 9;
    return Math.floor(row / 3) * 3 + Math.floor(col / 3);
  }

  function indicesInRow(row: number): number[] {
    return Array.from({ length: 9 }, (_, col) => row * 9 + col);
  }

  function indicesInCol(col: number): number[] {
    return Array.from({ length: 9 }, (_, row) => row * 9 + col);
  }

  function indicesInBox(box: number): number[] {
    const row0 = Math.floor(box / 3) * 3;
    const col0 = (box % 3) * 3;
    const out: number[] = [];
    for (let dr = 0; dr < 3; dr += 1) {
      for (let dc = 0; dc < 3; dc += 1) {
        out.push((row0 + dr) * 9 + (col0 + dc));
      }
    }
    return out;
  }

  const row = rowOf(trivValueCellIdx);
  const col = colOf(trivValueCellIdx);
  const box = boxOf(trivValueCellIdx);

  const rowIndices = indicesInRow(row);
  const colIndices = indicesInCol(col);
  const boxIndices = indicesInBox(box);

  let isValidBug = true;

  for (let i = 0; i < 9; i++) {
    if (i !== row) {
      const indices = indicesInRow(i);
      for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        let count = 0;
        for (const idx of indices) {
          if (candidates[idx].includes(digit)) {
            count++;
          }
        }
        if (count !== 2) {
          isValidBug = false;
          break;
        }
      }
    } else {
      const indices = indicesInRow(i);
      for (const digit of trivValueDigits) {
        let count = 0;
        for (const idx of indices) {
          if (candidates[idx].includes(digit)) {
            count++;
          }
        }
        if (count !== 3) {
          isValidBug = false;
          break;
        }
      }
      for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !trivValueDigits.includes(d))) {
        let count = 0;
        for (const idx of indices) {
          if (candidates[idx].includes(digit)) {
            count++;
          }
        }
        if (count !== 2) {
          isValidBug = false;
          break;
        }
      }
    }
  }

  if (!isValidBug) {
    return { present: false, count: 0, locations: [] };
  }

  locations.push({ type: "single-unit", unitType: "box", index: box });

  return {
    present: true,
    count: 1,
    locations,
  };
}
