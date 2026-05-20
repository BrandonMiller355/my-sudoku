import type { Candidates, HintLocation, HintResult } from "./types";
import { indicesInRow, indicesInCol, colOf, rowOf, getCombinations } from "./utils";

function detectBasicFish(
  candidates: Candidates,
  baseUnit: "row" | "col",
  size: number
): HintResult {
  const locations: HintLocation[] = [];

  function getBaseLines(baseUnit: "row" | "col"): number[] {
    return Array.from({ length: 9 }, (_, i) => i);
  }

  function getIndicesInBaseLine(lineIndex: number): number[] {
    return baseUnit === "row" ? indicesInRow(lineIndex) : indicesInCol(lineIndex);
  }

  function getCoverLine(index: number): number {
    return baseUnit === "row" ? colOf(index) : rowOf(index);
  }

  const baseLines = getBaseLines(baseUnit);
  const digitCombos = getCombinations([1, 2, 3, 4, 5, 6, 7, 8, 9], 1);

  for (const digitArray of digitCombos) {
    const digit = digitArray[0];
    const baseLineCombos = getCombinations(baseLines, size);

    for (const baseLinesCombo of baseLineCombos) {
      const coverLinesSet = new Set<number>();
      for (const baseLineIdx of baseLinesCombo) {
        const indices = getIndicesInBaseLine(baseLineIdx);
        for (const idx of indices) {
          if (candidates[idx].includes(digit)) {
            coverLinesSet.add(getCoverLine(idx));
          }
        }
      }

      if (coverLinesSet.size === size) {
        const coverLinesArray = Array.from(coverLinesSet).sort((a, b) => a - b);
        const baseIndices = baseLinesCombo.sort((a, b) => a - b);

        locations.push({
          type: "fish-details",
          digit,
          baseLines: baseIndices,
          coverLines: coverLinesArray,
          baseUnitType: baseUnit,
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

export function detectXWing(candidates: Candidates): HintResult {
  const rowFish = detectBasicFish(candidates, "row", 2);
  const colFish = detectBasicFish(candidates, "col", 2);

  return {
    present: rowFish.present || colFish.present,
    count: rowFish.count + colFish.count,
    locations: [...rowFish.locations, ...colFish.locations],
  };
}

export function detectSwordfish(candidates: Candidates): HintResult {
  const rowFish = detectBasicFish(candidates, "row", 3);
  const colFish = detectBasicFish(candidates, "col", 3);

  return {
    present: rowFish.present || colFish.present,
    count: rowFish.count + colFish.count,
    locations: [...rowFish.locations, ...colFish.locations],
  };
}

export function detectJellyfish(candidates: Candidates): HintResult {
  const rowFish = detectBasicFish(candidates, "row", 4);
  const colFish = detectBasicFish(candidates, "col", 4);

  return {
    present: rowFish.present || colFish.present,
    count: rowFish.count + colFish.count,
    locations: [...rowFish.locations, ...colFish.locations],
  };
}
