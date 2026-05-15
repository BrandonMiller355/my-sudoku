import easy0001 from "../puzzles/easy/easy-0001.json";
import expert0001 from "../puzzles/expert/expert-0001.json";
import expert0002 from "../puzzles/expert/expert-0002.json";
import hard0001 from "../puzzles/hard/hard-0001.json";
import medium0001 from "../puzzles/medium/medium-0001.json";
import type { Difficulty, Puzzle } from "./types";
import { solveSudoku } from "./utils";

const rawPuzzles: Record<Difficulty, { id: string; grid: (number | null)[] }[]> = {
  Easy: [{ id: "easy-0001", grid: easy0001 }],
  Medium: [{ id: "medium-0001", grid: medium0001 }],
  Hard: [{ id: "hard-0001", grid: hard0001 }],
  Expert: [
    { id: "expert-0001", grid: expert0001 },
    { id: "expert-0002", grid: expert0002 },
  ],
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

export const difficulties: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];
