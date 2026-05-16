import type { CellState, GameState, Move, Puzzle } from "./types";

export const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function createGame(puzzle: Puzzle, inputMode: GameState["inputMode"]): GameState {
  const now = new Date().toISOString();

  return {
    puzzleId: puzzle.id,
    grid: puzzle.puzzle.map((value, index) => ({
      index,
      given: value !== 0,
      value: value !== 0 ? value : null,
      notes: [],
    })),
    elapsedSeconds: 0,
    isPaused: false,
    isComplete: false,
    selectedCellIndex: null,
    selectedNumber: null,
    inputMode,
    workflowMode: "auto",
    undoStack: [],
    redoStack: [],
    startedAt: now,
    updatedAt: now,
  };
}

export function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function rowOf(index: number) {
  return Math.floor(index / 9);
}

export function colOf(index: number) {
  return index % 9;
}

export function boxOf(index: number) {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
}

export function isPeer(a: number, b: number) {
  return rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b);
}

export function getPeerIndexes(index: number) {
  return Array.from({ length: 81 }, (_, i) => i).filter((i) => i !== index && isPeer(i, index));
}

/** Digits still possible in an empty cell from placed values in its peers (ignores pencil marks). */
export function getCandidateDigitsFromGrid(grid: CellState[], index: number): number[] {
  const cell = grid[index];
  if (cell.given || cell.value !== null) {
    return [];
  }
  return numbers.filter((value) => !getPeerIndexes(index).some((peerIndex) => grid[peerIndex].value === value));
}

/**
 * Returns the effective candidates for a cell: user's pencil marks if any exist,
 * otherwise candidates computed from peer values.
 */
function getEffectiveCandidates(grid: CellState[], index: number): number[] {
  const cell = grid[index];
  if (cell.given || cell.value !== null) {
    return [];
  }
  if (cell.notes.length > 0) {
    return cell.notes;
  }
  return getCandidateDigitsFromGrid(grid, index);
}

function indicesInRow(row: number) {
  return Array.from({ length: 9 }, (_, col) => row * 9 + col);
}

function indicesInCol(col: number) {
  return Array.from({ length: 9 }, (_, row) => row * 9 + col);
}

function indicesInBox(box: number) {
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

/** Empty cells with exactly two candidates (uses pencil marks when present). */
export function computeBivalueCellIndexes(grid: CellState[]): Set<number> {
  const set = new Set<number>();
  for (let i = 0; i < 81; i += 1) {
    if (getEffectiveCandidates(grid, i).length === 2) {
      set.add(i);
    }
  }
  return set;
}

/**
 * Cells that belong to at least one conjugate pair: in some row, column, or box,
 * a digit appears as a candidate in exactly two empty cells (strong link).
 */
export function computeConjugatePairCellIndexes(grid: CellState[]): Set<number> {
  const candidates = Array.from({ length: 81 }, (_, i) => getEffectiveCandidates(grid, i));
  const set = new Set<number>();

  function scanUnit(indices: readonly number[]) {
    for (const value of numbers) {
      const cells = indices.filter((idx) => {
        const cell = grid[idx];
        if (cell.given || cell.value !== null) {
          return false;
        }
        return candidates[idx].includes(value);
      });
      if (cells.length === 2) {
        set.add(cells[0]);
        set.add(cells[1]);
      }
    }
  }

  for (let row = 0; row < 9; row += 1) {
    scanUnit(indicesInRow(row));
  }
  for (let col = 0; col < 9; col += 1) {
    scanUnit(indicesInCol(col));
  }
  for (let box = 0; box < 9; box += 1) {
    scanUnit(indicesInBox(box));
  }

  return set;
}

export function isComplete(grid: CellState[], solution: number[]) {
  return grid.every((cell, index) => cell.value === solution[index]);
}

export function applyMove(grid: CellState[], move: Move, direction: "undo" | "redo") {
  const nextGrid = grid.map((cell) => ({ ...cell, notes: [...cell.notes] }));
  const mainCell = direction === "undo" ? move.previousState : move.nextState;
  nextGrid[move.cellIndex] = { ...mainCell, notes: [...mainCell.notes] };

  move.affectedCells?.forEach((affected) => {
    const nextCell = direction === "undo" ? affected.previousState : affected.nextState;
    nextGrid[affected.cellIndex] = { ...nextCell, notes: [...nextCell.notes] };
  });

  return nextGrid;
}

export function cloneCell(cell: CellState): CellState {
  return { ...cell, notes: [...cell.notes] };
}

export function solveSudoku(initialGrid: number[]) {
  const grid = [...initialGrid];

  function canPlace(index: number, value: number) {
    for (let i = 0; i < 81; i += 1) {
      if (i !== index && grid[i] === value && isPeer(i, index)) {
        return false;
      }
    }
    return true;
  }

  function solve(): boolean {
    const index = grid.findIndex((value) => value === 0);
    if (index === -1) {
      return true;
    }

    for (const value of numbers) {
      if (canPlace(index, value)) {
        grid[index] = value;
        if (solve()) {
          return true;
        }
        grid[index] = 0;
      }
    }

    return false;
  }

  if (!solve()) {
    throw new Error("Bundled puzzle could not be solved.");
  }

  return grid;
}
