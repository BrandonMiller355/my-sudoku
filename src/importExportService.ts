import type { GameState, Puzzle, PuzzleExport } from "./types";
import { getPuzzleById } from "./puzzleService";

export function exportGame(game: GameState, puzzle: Puzzle): PuzzleExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    puzzle: {
      id: puzzle.id,
      difficulty: puzzle.difficulty,
      source: puzzle.source,
      givens: puzzle.puzzle.map((value) => (value === null ? 0 : value)),
    },
    state: {
      elapsedSeconds: game.elapsedSeconds,
      isPaused: game.isPaused,
      inputMode: game.inputMode,
      grid: game.grid,
      undoStack: game.undoStack,
      redoStack: game.redoStack,
      puzzleNotes: game.puzzleNotes,
    },
  };
}

export function downloadExport(exportData: PuzzleExport, puzzleId: string): void {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `sudoku-${puzzleId}-${timestamp}.json`;

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function validateAndParseImport(
  json: unknown
): { ok: true; data: PuzzleExport } | { ok: false; error: string } {
  if (typeof json !== "object" || json === null) {
    return { ok: false, error: "Invalid JSON: expected an object" };
  }

  const obj = json as Record<string, unknown>;

  if (typeof obj.version !== "number" || !Number.isInteger(obj.version)) {
    return { ok: false, error: "Missing or invalid 'version' field" };
  }

  if (obj.version !== 1) {
    return {
      ok: false,
      error: `Unsupported version ${obj.version}. This file may be from a newer version of the app.`,
    };
  }

  if (!obj.puzzle || typeof obj.puzzle !== "object") {
    return { ok: false, error: "Missing or invalid 'puzzle' field" };
  }

  const puzzle = obj.puzzle as Record<string, unknown>;
  if (typeof puzzle.id !== "string") {
    return { ok: false, error: "Missing or invalid 'puzzle.id' field" };
  }

  if (!Array.isArray(puzzle.givens) || puzzle.givens.length !== 81) {
    return { ok: false, error: "Invalid 'puzzle.givens': must be an array of 81 elements" };
  }

  if (!obj.state || typeof obj.state !== "object") {
    return { ok: false, error: "Missing or invalid 'state' field" };
  }

  const state = obj.state as Record<string, unknown>;
  if (typeof state.elapsedSeconds !== "number" || !Number.isInteger(state.elapsedSeconds) || state.elapsedSeconds < 0) {
    return { ok: false, error: "Invalid 'state.elapsedSeconds': must be a non-negative integer" };
  }

  if (typeof state.isPaused !== "boolean") {
    return { ok: false, error: "Missing or invalid 'state.isPaused' field" };
  }

  if (!Array.isArray(state.grid) || state.grid.length !== 81) {
    return { ok: false, error: "Invalid 'state.grid': must be an array of 81 elements" };
  }

  for (let i = 0; i < state.grid.length; i++) {
    const cell = state.grid[i];
    if (!cell || typeof cell !== "object") {
      return { ok: false, error: `Invalid 'state.grid[${i}]': expected an object` };
    }
    const cellObj = cell as Record<string, unknown>;
    if (
      typeof cellObj.index !== "number" ||
      typeof cellObj.given !== "boolean" ||
      (cellObj.value !== null && typeof cellObj.value !== "number") ||
      !Array.isArray(cellObj.notes)
    ) {
      return {
        ok: false,
        error: `Invalid cell at state.grid[${i}]: missing required fields or invalid types`,
      };
    }
  }

  if (!Array.isArray(state.undoStack) || !Array.isArray(state.redoStack)) {
    return { ok: false, error: "Invalid 'state.undoStack' or 'state.redoStack'" };
  }

  if (state.inputMode !== "answer" && state.inputMode !== "note") {
    return { ok: false, error: "Invalid 'state.inputMode': must be 'answer' or 'note'" };
  }

  return {
    ok: true,
    data: json as PuzzleExport,
  };
}

export function resolveImportedPuzzle(
  data: PuzzleExport
): { ok: true; puzzle: Puzzle } | { ok: false; error: string } {
  const puzzle = getPuzzleById(data.puzzle.id);
  if (!puzzle) {
    return {
      ok: false,
      error: `Puzzle '${data.puzzle.id}' not found on this device. The file may be from a newer version of the app.`,
    };
  }

  const localGivens = puzzle.puzzle.map((value) => (value === null ? 0 : value));
  if (JSON.stringify(localGivens) !== JSON.stringify(data.puzzle.givens)) {
    return {
      ok: false,
      error: `Puzzle '${data.puzzle.id}' data mismatch. The file may be corrupt or from a different version.`,
    };
  }

  return { ok: true, puzzle };
}

export function buildGameStateFromImport(data: PuzzleExport, puzzle: Puzzle): GameState {
  const isComplete = puzzle.solution ? data.state.grid.every((cell, index) => cell.value === puzzle.solution[index]) : false;
  return {
    puzzleId: data.puzzle.id,
    grid: data.state.grid,
    elapsedSeconds: data.state.elapsedSeconds,
    isPaused: data.state.isPaused,
    isComplete,
    selectedCellIndex: null,
    selectedNumber: null,
    inputMode: data.state.inputMode,
    workflowMode: "auto",
    undoStack: data.state.undoStack,
    redoStack: data.state.redoStack,
    puzzleNotes: data.state.puzzleNotes ?? "",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
