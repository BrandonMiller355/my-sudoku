export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";

export type Puzzle = {
  id: string;
  difficulty: Difficulty;
  source: string;
  puzzle: (number | null)[];
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
  type: "set-value" | "clear-value" | "toggle-note" | "auto-remove-notes";
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
  mistakeCount: number;
  isPaused: boolean;
  isComplete: boolean;
  selectedCellIndex: number | null;
  selectedNumber: number | null;
  inputMode: "answer" | "note";
  workflowMode: "cell-first" | "number-first" | "auto";
  undoStack: Move[];
  redoStack: Move[];
  startedAt: string;
  updatedAt: string;
};

export type Settings = {
  theme: "light" | "dark";
  autoRemoveNotes: boolean;
  inputMode: "answer" | "note";
};

export type CompletedGame = {
  id: string;
  puzzleId: string;
  difficulty: Difficulty;
  elapsedSeconds: number;
  mistakeCount: number;
  completedAt: string;
};
