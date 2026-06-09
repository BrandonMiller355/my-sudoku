import easy0001 from "../puzzles/easy/easy-0001.json";
import easy0002 from "../puzzles/easy/easy-0002.json";
import easy0003 from "../puzzles/easy/easy-0003.json";
import easy0004 from "../puzzles/easy/easy-0004.json";
import easy0005 from "../puzzles/easy/easy-0005.json";
import easy0006 from "../puzzles/easy/easy-0006.json";
import easy0007 from "../puzzles/easy/easy-0007.json";
import easy0008 from "../puzzles/easy/easy-0008.json";
import easy0009 from "../puzzles/easy/easy-0009.json";
import easy0010 from "../puzzles/easy/easy-0010.json";
import easy0011 from "../puzzles/easy/easy-0011.json";
// One-move puzzle backing the temporary "Test" difficulty (used to exercise the win animation; remove once no longer needed).
import easyTest from "../puzzles/easy/easy-test.json";
import medium0001 from "../puzzles/medium/medium-0001.json";
import medium0002 from "../puzzles/medium/medium-0002.json";
import medium0003 from "../puzzles/medium/medium-0003.json";
import medium0004 from "../puzzles/medium/medium-0004.json";
import medium0005 from "../puzzles/medium/medium-0005.json";
import medium0006 from "../puzzles/medium/medium-0006.json";
import medium0007 from "../puzzles/medium/medium-0007.json";
import medium0008 from "../puzzles/medium/medium-0008.json";
import medium0009 from "../puzzles/medium/medium-0009.json";
import medium0010 from "../puzzles/medium/medium-0010.json";
import medium0011 from "../puzzles/medium/medium-0011.json";
import hard0001 from "../puzzles/hard/hard-0001.json";
import hard0002 from "../puzzles/hard/hard-0002.json";
import hard0003 from "../puzzles/hard/hard-0003.json";
import hard0004 from "../puzzles/hard/hard-0004.json";
import hard0005 from "../puzzles/hard/hard-0005.json";
import hard0006 from "../puzzles/hard/hard-0006.json";
import hard0007 from "../puzzles/hard/hard-0007.json";
import hard0008 from "../puzzles/hard/hard-0008.json";
import hard0009 from "../puzzles/hard/hard-0009.json";
import hard0010 from "../puzzles/hard/hard-0010.json";
import hard0011 from "../puzzles/hard/hard-0011.json";
import expert0001 from "../puzzles/expert/expert-0001.json";
import expert0002 from "../puzzles/expert/expert-0002.json";
import expert0003 from "../puzzles/expert/expert-0003.json";
import expert0004 from "../puzzles/expert/expert-0004.json";
import expert0005 from "../puzzles/expert/expert-0005.json";
import expert0006 from "../puzzles/expert/expert-0006.json";
import expert0007 from "../puzzles/expert/expert-0007.json";
import expert0008 from "../puzzles/expert/expert-0008.json";
import expert0009 from "../puzzles/expert/expert-0009.json";
import expert0010 from "../puzzles/expert/expert-0010.json";
import expert0011 from "../puzzles/expert/expert-0011.json";
import expert0012 from "../puzzles/expert/expert-0012.json";
import type { Difficulty, Puzzle } from "./types";
import { solveSudoku } from "./utils";

const rawPuzzles: Record<Difficulty, { id: string; grid: number[] }[]> = {
  Easy: [
    { id: "easy-0001", grid: easy0001 },
    { id: "easy-0002", grid: easy0002 },
    { id: "easy-0003", grid: easy0003 },
    { id: "easy-0004", grid: easy0004 },
    { id: "easy-0005", grid: easy0005 },
    { id: "easy-0006", grid: easy0006 },
    { id: "easy-0007", grid: easy0007 },
    { id: "easy-0008", grid: easy0008 },
    { id: "easy-0009", grid: easy0009 },
    { id: "easy-0010", grid: easy0010 },
    { id: "easy-0011", grid: easy0011 },
  ],
  Medium: [
    { id: "medium-0001", grid: medium0001 },
    { id: "medium-0002", grid: medium0002 },
    { id: "medium-0003", grid: medium0003 },
    { id: "medium-0004", grid: medium0004 },
    { id: "medium-0005", grid: medium0005 },
    { id: "medium-0006", grid: medium0006 },
    { id: "medium-0007", grid: medium0007 },
    { id: "medium-0008", grid: medium0008 },
    { id: "medium-0009", grid: medium0009 },
    { id: "medium-0010", grid: medium0010 },
    { id: "medium-0011", grid: medium0011 },
  ],
  Hard: [
    { id: "hard-0001", grid: hard0001 },
    { id: "hard-0002", grid: hard0002 },
    { id: "hard-0003", grid: hard0003 },
    { id: "hard-0004", grid: hard0004 },
    { id: "hard-0005", grid: hard0005 },
    { id: "hard-0006", grid: hard0006 },
    { id: "hard-0007", grid: hard0007 },
    { id: "hard-0008", grid: hard0008 },
    { id: "hard-0009", grid: hard0009 },
    { id: "hard-0010", grid: hard0010 },
    { id: "hard-0011", grid: hard0011 },
  ],
  Expert: [
    { id: "expert-0001", grid: expert0001 },
    { id: "expert-0002", grid: expert0002 },
    { id: "expert-0003", grid: expert0003 },
    { id: "expert-0004", grid: expert0004 },
    { id: "expert-0005", grid: expert0005 },
    { id: "expert-0006", grid: expert0006 },
    { id: "expert-0007", grid: expert0007 },
    { id: "expert-0008", grid: expert0008 },
    { id: "expert-0009", grid: expert0009 },
    { id: "expert-0010", grid: expert0010 },
    { id: "expert-0011", grid: expert0011 },
    { id: "expert-0012", grid: expert0012 },
  ],
  // Temporary difficulty: a single one-move puzzle for quickly exercising the win animation. Remove when no longer needed.
  Test: [{ id: "easy-test", grid: easyTest }],
};

const puzzles = Object.entries(rawPuzzles).flatMap(([difficulty, entries]) =>
  entries.map(({ id, grid }) => ({
    id,
    difficulty: difficulty as Difficulty,
    source: "initial-set",
    puzzle: grid,
    solution: solveSudoku(grid),
    createdDate: "2026-05-13",
  })),
);

export function getPuzzles(difficulty: Difficulty) {
  return puzzles.filter((puzzle) => puzzle.difficulty === difficulty);
}

export function getPuzzleById(id: string) {
  return puzzles.find((puzzle) => puzzle.id === id) ?? null;
}

export function choosePuzzle(difficulty: Difficulty, unavailablePuzzleIds: string[] = []): Puzzle | null {
  const matching = getPuzzles(difficulty);
  return matching.find((puzzle) => !unavailablePuzzleIds.includes(puzzle.id)) ?? null;
}

export const difficulties: Difficulty[] = ["Easy", "Medium", "Hard", "Expert", "Test"];
