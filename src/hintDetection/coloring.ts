import type { Candidates, HintResult } from "./types";
import { computeConjugatePairs } from "../utils";
import type { CellState } from "../types";
import { boxOf, isPeer, rowOf, colOf } from "./utils";

export function detectSimpleColoring(candidates: Candidates, grid: CellState[]): HintResult {
  const locations: Array<{ type: "box-set"; boxIndices: number[] }> = [];

  const conjugatePairs = computeConjugatePairs(grid);
  const digitToGraph = new Map<number, Map<number, Set<number>>>();

  for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    digitToGraph.set(digit, new Map());
  }

  for (const pair of conjugatePairs) {
    const digit = pair.digit;
    const [cell1, cell2] = pair.cells;
    const graph = digitToGraph.get(digit)!;

    if (!graph.has(cell1)) {
      graph.set(cell1, new Set());
    }
    if (!graph.has(cell2)) {
      graph.set(cell2, new Set());
    }

    graph.get(cell1)!.add(cell2);
    graph.get(cell2)!.add(cell1);
  }

  for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const graph = digitToGraph.get(digit)!;
    const visited = new Set<number>();
    const color = new Map<number, number>();

    for (const startNode of graph.keys()) {
      if (visited.has(startNode)) continue;

      const queue: number[] = [startNode];
      color.set(startNode, 0);
      visited.add(startNode);
      const chainCells = new Set<number>([startNode]);

      let hasConflict = false;
      const colors = [new Set<number>(), new Set<number>()];
      colors[0].add(startNode);

      while (queue.length > 0) {
        const node = queue.shift()!;
        const nodeColor = color.get(node)!;
        colors[nodeColor].add(node);

        const neighbors = graph.get(node) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            const neighborColor = 1 - nodeColor;
            color.set(neighbor, neighborColor);
            queue.push(neighbor);
            chainCells.add(neighbor);
          } else {
            const neighborColor = color.get(neighbor)!;
            if (neighborColor === nodeColor) {
              hasConflict = true;
            }
          }
        }
      }

      if (hasConflict || chainCells.size === 0) continue;

      if (colors[0].size > 0 && colors[1].size > 0) {
        for (let i = 0; i < 81; i++) {
          if (!candidates[i].includes(digit)) continue;
          if (colors[0].has(i) || colors[1].has(i)) continue;

          let peersColor0 = false;
          let peersColor1 = false;

          for (const colorCell of colors[0]) {
            if (isPeer(i, colorCell)) {
              peersColor0 = true;
              break;
            }
          }

          for (const colorCell of colors[1]) {
            if (isPeer(i, colorCell)) {
              peersColor1 = true;
              break;
            }
          }

          if (peersColor0 && peersColor1) {
            const boxIndices = Array.from(chainCells).map((c) => boxOf(c));
            locations.push({
              type: "box-set",
              boxIndices: Array.from(new Set(boxIndices)).sort((a, b) => a - b),
            });
            break;
          }
        }
      }

      for (let i = 0; i < 81; i++) {
        if (!candidates[i].includes(digit)) continue;
        if (!colors[0].has(i) && !colors[1].has(i)) continue;
        if (colors[0].size === 0 || colors[1].size === 0) continue;

        let sameUnitConflict = false;
        const nodeColor = color.get(i)!;

        for (const otherCell of colors[nodeColor]) {
          if (otherCell !== i) {
            const row1 = rowOf(i);
            const col1 = colOf(i);
            const box1 = boxOf(i);
            const row2 = rowOf(otherCell);
            const col2 = colOf(otherCell);
            const box2 = boxOf(otherCell);

            if (row1 === row2 || col1 === col2 || box1 === box2) {
              sameUnitConflict = true;
              break;
            }
          }
        }

        if (sameUnitConflict) {
          const boxIndices = Array.from(chainCells).map((c) => boxOf(c));
          locations.push({
            type: "box-set",
            boxIndices: Array.from(new Set(boxIndices)).sort((a, b) => a - b),
          });
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
