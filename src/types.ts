export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert" | "Test";

export type Puzzle = {
  id: string;
  difficulty: Difficulty;
  source: string;
  puzzle: number[];
  solution: number[];
  createdDate: string;
};

export type CellState = {
  index: number;
  given: boolean;
  value: number | null;
  notes: number[];
};

export type Move = {
  id: string;
  timestamp: string;
  type: "set-value" | "clear-value" | "toggle-note" | "auto-remove-notes" | "fill-candidates";
  cellIndex: number;
  previousState: CellState;
  nextState: CellState;
  affectedCells?: {
    cellIndex: number;
    previousState: CellState;
    nextState: CellState;
  }[];
};

export type GameState = {
  puzzleId: string;
  grid: CellState[];
  elapsedSeconds: number;
  isPaused: boolean;
  isComplete: boolean;
  selectedCellIndex: number | null;
  selectedNumber: number | null;
  inputMode: "answer" | "note";
  workflowMode: "cell-first" | "number-first" | "auto";
  undoStack: Move[];
  redoStack: Move[];
  puzzleNotes: string;
  startedAt: string;
  updatedAt: string;
};

export type Settings = {
  theme: "light" | "dark";
  inputMode: "answer" | "note";
};

export type CompletedGame = {
  id: string;
  puzzleId: string;
  difficulty: Difficulty;
  elapsedSeconds: number;
  completedAt: string;
};

export type SeenPuzzle = {
  id: string;
  puzzleId: string;
  difficulty: Difficulty;
  seenAt: string;
};

export type ConjugatePair = {
  digit: number;
  cells: readonly [number, number];
  unit: { type: "row" | "col" | "box"; index: number };
};

export type PuzzleExport = {
  version: number;
  exportedAt: string;
  puzzle: {
    id: string;
    difficulty: Difficulty;
    source: string;
    givens: number[];
  };
  state: {
    elapsedSeconds: number;
    isPaused: boolean;
    inputMode: "answer" | "note";
    grid: CellState[];
    undoStack: Move[];
    redoStack: Move[];
    puzzleNotes?: string;
  };
};
