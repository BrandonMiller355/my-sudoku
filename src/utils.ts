import type { CellState, GameState, Move, Puzzle } from "./types";

export const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function createGame(puzzle: Puzzle, inputMode: GameState["inputMode"]): GameState {
  const now = new Date().toISOString();

  return {
    puzzleId: puzzle.id,
    grid: puzzle.puzzle.map((value, index) => ({
      index,
      given: value !== null,
      value,
      notes: [],
    })),
    elapsedSeconds: 0,
    mistakeCount: 0,
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
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
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

export function solveSudoku(initialGrid: (number | null)[]) {
  const grid = initialGrid.map((value) => value ?? 0);

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
