import type { Candidates, HintResult } from "./types";
import { boxOf, isPeer, getCombinations } from "./utils";
import { computeConjugatePairs } from "../utils";
import type { CellState } from "../types";

export function detectXYWing(candidates: Candidates): HintResult {
  const locations: Array<{ type: "box-set"; boxIndices: number[] }> = [];

  const bivalueCells: number[] = [];
  for (let i = 0; i < 81; i++) {
    if (candidates[i].length === 2) {
      bivalueCells.push(i);
    }
  }

  for (const pivotIdx of bivalueCells) {
    const [x, y] = candidates[pivotIdx];
    const pivotPeers = new Set<number>();
    for (let i = 0; i < 81; i++) {
      if (i !== pivotIdx && isPeer(i, pivotIdx)) {
        pivotPeers.add(i);
      }
    }

    for (const wing1Idx of bivalueCells.filter((i) => pivotPeers.has(i) && candidates[i].includes(x))) {
      if (candidates[wing1Idx].length !== 2) continue;
      const z1 = candidates[wing1Idx].find((d) => d !== x);
      if (!z1) continue;

      for (const wing2Idx of bivalueCells.filter((i) => pivotPeers.has(i) && candidates[i].includes(y))) {
        if (candidates[wing2Idx].length !== 2 || wing1Idx === wing2Idx) continue;
        const z2 = candidates[wing2Idx].find((d) => d !== y);
        if (!z2 || z1 !== z2) continue;

        const boxes = [boxOf(pivotIdx), boxOf(wing1Idx), boxOf(wing2Idx)].sort((a, b) => a - b);
        locations.push({ type: "box-set", boxIndices: boxes });
      }
    }
  }

  return {
    present: locations.length > 0,
    count: locations.length,
    locations: locations.filter((loc, idx, arr) => arr.findIndex((l) => JSON.stringify(l) === JSON.stringify(loc)) === idx),
  };
}

export function detectXYZWing(candidates: Candidates): HintResult {
  const locations: Array<{ type: "box-set"; boxIndices: number[] }> = [];

  const trivalueCells: number[] = [];
  const bivalueCells: number[] = [];

  for (let i = 0; i < 81; i++) {
    if (candidates[i].length === 3) {
      trivalueCells.push(i);
    } else if (candidates[i].length === 2) {
      bivalueCells.push(i);
    }
  }

  for (const pivotIdx of trivalueCells) {
    const [x, y, z] = candidates[pivotIdx];
    const pivotPeers = new Set<number>();
    for (let i = 0; i < 81; i++) {
      if (i !== pivotIdx && isPeer(i, pivotIdx)) {
        pivotPeers.add(i);
      }
    }

    for (const wing1Idx of bivalueCells.filter((i) => pivotPeers.has(i))) {
      if (!candidates[wing1Idx].includes(x) || !candidates[wing1Idx].includes(z)) continue;

      for (const wing2Idx of bivalueCells.filter((i) => pivotPeers.has(i) && i !== wing1Idx)) {
        if (!candidates[wing2Idx].includes(y) || !candidates[wing2Idx].includes(z)) continue;

        const boxes = [boxOf(pivotIdx), boxOf(wing1Idx), boxOf(wing2Idx)].sort((a, b) => a - b);
        locations.push({ type: "box-set", boxIndices: boxes });
      }
    }
  }

  return {
    present: locations.length > 0,
    count: locations.length,
    locations: locations.filter((loc, idx, arr) => arr.findIndex((l) => JSON.stringify(l) === JSON.stringify(loc)) === idx),
  };
}

export function detectWWing(candidates: Candidates, grid: CellState[]): HintResult {
  const locations: Array<{ type: "box-set"; boxIndices: number[] }> = [];

  const bivalueCells: number[] = [];
  for (let i = 0; i < 81; i++) {
    if (candidates[i].length === 2) {
      bivalueCells.push(i);
    }
  }

  const conjugatePairs = computeConjugatePairs(grid);

  for (let i = 0; i < bivalueCells.length; i++) {
    for (let j = i + 1; j < bivalueCells.length; j++) {
      const cell1 = bivalueCells[i];
      const cell2 = bivalueCells[j];

      if (isPeer(cell1, cell2)) continue;

      if (!candidates[cell1].every((d) => candidates[cell2].includes(d))) continue;
      if (!candidates[cell2].every((d) => candidates[cell1].includes(d))) continue;

      const [x, y] = candidates[cell1];

      const cell1Peers = new Set<number>();
      for (let k = 0; k < 81; k++) {
        if (k !== cell1 && isPeer(k, cell1)) {
          cell1Peers.add(k);
        }
      }

      const cell2Peers = new Set<number>();
      for (let k = 0; k < 81; k++) {
        if (k !== cell2 && isPeer(k, cell2)) {
          cell2Peers.add(k);
        }
      }

      for (const conjugatePair of conjugatePairs) {
        const [c1, c2] = conjugatePair.cells;
        const digit = conjugatePair.digit;

        if ((digit === x || digit === y) && cell1Peers.has(c1) && cell2Peers.has(c2)) {
          locations.push({ type: "box-set", boxIndices: [boxOf(cell1), boxOf(cell2)] });
          break;
        }
        if ((digit === x || digit === y) && cell1Peers.has(c2) && cell2Peers.has(c1)) {
          locations.push({ type: "box-set", boxIndices: [boxOf(cell1), boxOf(cell2)] });
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
