import type { Candidates, HintLocation } from "./types";

export function indicesInRow(row: number): number[] {
  return Array.from({ length: 9 }, (_, col) => row * 9 + col);
}

export function indicesInCol(col: number): number[] {
  return Array.from({ length: 9 }, (_, row) => row * 9 + col);
}

export function indicesInBox(box: number): number[] {
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

export function rowOf(index: number): number {
  return Math.floor(index / 9);
}

export function colOf(index: number): number {
  return index % 9;
}

export function boxOf(index: number): number {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
}

export function isPeer(a: number, b: number): boolean {
  return rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b);
}

export function getPeerIndexes(index: number): Set<number> {
  const peers = new Set<number>();
  for (let i = 0; i < 81; i++) {
    if (i !== index && isPeer(i, index)) {
      peers.add(i);
    }
  }
  return peers;
}

export function getCandidateDigitsInUnit(
  candidates: Candidates,
  indices: number[],
  digit: number
): number[] {
  return indices.filter((i) => candidates[i].includes(digit));
}

export function getCandidateDigitsInCell(candidates: Candidates, index: number): number[] {
  return [...candidates[index]];
}

export function unionOfArrays<T>(arrays: T[][]): Set<T> {
  const result = new Set<T>();
  for (const arr of arrays) {
    for (const item of arr) {
      result.add(item);
    }
  }
  return result;
}

export function intersectionOfArrays<T>(arrays: T[][]): Set<T> {
  if (arrays.length === 0) return new Set();
  const result = new Set(arrays[0]);
  for (let i = 1; i < arrays.length; i++) {
    const current = new Set(arrays[i]);
    for (const item of result) {
      if (!current.has(item)) {
        result.delete(item);
      }
    }
  }
  return result;
}

export function areArraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  const setB = new Set(b);
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  for (const item of setB) {
    if (!setA.has(item)) return false;
  }
  return true;
}

export function getCombinations<T>(arr: T[], size: number): T[][] {
  if (size === 1) return arr.map((item) => [item]);
  if (size > arr.length) return [];

  const result: T[][] = [];
  const helper = (start: number, current: T[]) => {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      helper(i + 1, current);
      current.pop();
    }
  };
  helper(0, []);
  return result;
}

export function getSumOfDigitCounts(cellIndices: number[], candidates: Candidates): number {
  let count = 0;
  for (const idx of cellIndices) {
    count += candidates[idx].length;
  }
  return count;
}

export function getEmptyCellsInUnit(
  candidates: Candidates,
  indices: number[]
): number[] {
  return indices.filter((i) => candidates[i].length > 0);
}
