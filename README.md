# My Sudoku

A mobile-first Sudoku web app built with React, TypeScript, and Vite. Play curated puzzles across four difficulty levels with full local save/resume, corner notes, mistake detection, undo/redo, and light/dark mode.

## Features

- **Four difficulty levels** — Easy, Medium, Hard, Expert (10+ puzzles each)
- **Cell-first and number-first input** — tap a cell then a number, or tap a number then cells
- **Corner notes** — pencil in candidate numbers per cell; toggle individual candidates on/off
- **Mistake detection** — incorrect entries flash red and are rejected; mistake count tracked
- **Highlighting** — selected cell, row, column, box, and matching digits all highlighted
- **Undo/redo** — full history including note changes and auto-removed notes
- **Auto-remove notes** — optionally clears peer candidates when an answer is placed
- **Pause/resume** — tap the timer to hide the board and pause
- **Local persistence** — game state, notes, timer, and settings saved to IndexedDB via Dexie.js; survives browser refresh
- **Light/dark mode** — toggled from the menu, preference persisted locally
- **Completion screen** — shows difficulty, final time, and mistake count

## Planned Features

See [IDEAS.md](IDEAS.md) for feature ideas currently being considered.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 |
| Language | TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS 4 |
| Local storage | IndexedDB via Dexie.js |
| Puzzle data | Bundled JSON files |
| Hosting | GitHub Pages |

## Getting Started

**Install dependencies:**

```bash
npm install
```

**Run the dev server:**

```bash
npm run dev
```

**Build for production:**

```bash
npm run build
```

**Preview the production build:**

```bash
npm run preview
```

## Puzzle Format

Puzzles are stored as JSON files under `puzzles/<difficulty>/`. Each file follows this shape:

```json
{
  "id": "hard-0001",
  "difficulty": "Hard",
  "source": "initial-set",
  "puzzle": "5,3,null,...",
  "solution": "5,3,4,...",
  "createdDate": "2026-05-13"
}
```

Both `puzzle` and `solution` are comma-separated lists of 81 values (`null` for empty cells).
