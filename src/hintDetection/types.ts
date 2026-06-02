import type { CellState } from "../types";

export type Candidates = number[][];

export type HintLocation =
  | { type: "single-unit"; unitType: "row" | "col" | "box"; index: number }
  | { type: "box-set"; boxIndices: number[] }
  | {
      type: "fish-details";
      digit: number;
      baseLines: number[];
      coverLines: number[];
      baseUnitType: "row" | "col";
    }
  | { type: "single-digit"; digit: number; boxIndex: number }
  | { type: "wing-cells"; cells: Array<{ index: number; candidates: number[] }> };

export interface HintResult {
  present: boolean;
  count: number;
  locations: HintLocation[];
}

export type HintTechnique =
  | "naked-single"
  | "hidden-single"
  | "naked-pair"
  | "naked-triple"
  | "naked-quad"
  | "hidden-pair"
  | "hidden-triple"
  | "hidden-quad"
  | "pointing-pair-or-box-line"
  | "x-wing"
  | "swordfish"
  | "jellyfish"
  | "xy-wing"
  | "xyz-wing"
  | "w-wing"
  | "skyscraper"
  | "2-string-kite"
  | "empty-rectangle"
  | "unique-rectangle"
  | "bug-plus-one"
  | "simple-coloring";

export type HintTechniqueTier =
  | "singles"
  | "n-tuples"
  | "intersections"
  | "fish"
  | "wings"
  | "single-digit"
  | "uniqueness"
  | "coloring";

export const TECHNIQUE_TO_TIER: Record<HintTechnique, HintTechniqueTier> = {
  "naked-single": "singles",
  "hidden-single": "singles",
  "naked-pair": "n-tuples",
  "naked-triple": "n-tuples",
  "naked-quad": "n-tuples",
  "hidden-pair": "n-tuples",
  "hidden-triple": "n-tuples",
  "hidden-quad": "n-tuples",
  "pointing-pair-or-box-line": "intersections",
  "x-wing": "fish",
  swordfish: "fish",
  jellyfish: "fish",
  "xy-wing": "wings",
  "xyz-wing": "wings",
  "w-wing": "wings",
  skyscraper: "single-digit",
  "2-string-kite": "single-digit",
  "empty-rectangle": "single-digit",
  "unique-rectangle": "uniqueness",
  "bug-plus-one": "uniqueness",
  "simple-coloring": "coloring",
};

export const TECHNIQUE_DISPLAY_NAMES: Record<HintTechnique, string> = {
  "naked-single": "Naked Single",
  "hidden-single": "Hidden Single",
  "naked-pair": "Naked Pair",
  "naked-triple": "Naked Triple",
  "naked-quad": "Naked Quad",
  "hidden-pair": "Hidden Pair",
  "hidden-triple": "Hidden Triple",
  "hidden-quad": "Hidden Quad",
  "pointing-pair-or-box-line": "Pointing Pair / Box-Line Reduction",
  "x-wing": "X-Wing",
  swordfish: "Swordfish",
  jellyfish: "Jellyfish",
  "xy-wing": "XY-Wing",
  "xyz-wing": "XYZ-Wing",
  "w-wing": "W-Wing",
  skyscraper: "Skyscraper",
  "2-string-kite": "2-String Kite",
  "empty-rectangle": "Empty Rectangle",
  "unique-rectangle": "Unique Rectangle",
  "bug-plus-one": "BUG+1",
  "simple-coloring": "Simple Coloring",
};

export function computeCandidates(grid: CellState[]): Candidates {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

  function getPeerIndexes(index: number): number[] {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

    const peers = new Set<number>();
    for (let i = 0; i < 81; i++) {
      if (i === index) continue;
      const iRow = Math.floor(i / 9);
      const iCol = i % 9;
      const iBox = Math.floor(iRow / 3) * 3 + Math.floor(iCol / 3);
      if (iRow === row || iCol === col || iBox === box) {
        peers.add(i);
      }
    }
    return Array.from(peers);
  }

  const candidates: Candidates = Array(81);
  for (let i = 0; i < 81; i++) {
    const cell = grid[i];
    if (cell.given || cell.value !== null) {
      candidates[i] = [];
    } else if (cell.notes.length > 0) {
      candidates[i] = [...cell.notes];
    } else {
      const peers = getPeerIndexes(i);
      const usedDigits = new Set<number>();
      for (const peerIdx of peers) {
        if (grid[peerIdx].value !== null) {
          usedDigits.add(grid[peerIdx].value);
        }
      }
      candidates[i] = numbers.filter((digit) => !usedDigits.has(digit));
    }
  }
  return candidates;
}
