import { useEffect, useMemo, useState } from "react";
import { choosePuzzle, difficulties, getPuzzleById } from "./puzzleService";
import {
  clearActiveGame,
  defaultSettings,
  loadActiveGame,
  loadCompletedGames,
  loadSettings,
  saveActiveGame,
  saveCompletedGame,
  saveSettings,
} from "./storageService";
import type { CellState, CompletedGame, Difficulty, GameState, Move, Settings } from "./types";
import { applyMove, boxOf, cloneCell, colOf, createGame, formatTime, getPeerIndexes, isComplete, isPeer, numbers, rowOf } from "./utils";

function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [completedGames, setCompletedGames] = useState<CompletedGame[]>([]);
  const [screen, setScreen] = useState<"loading" | "menu" | "game">("loading");
  const [message, setMessage] = useState("");
  const [mistakeCell, setMistakeCell] = useState<number | null>(null);

  const puzzle = game ? getPuzzleById(game.puzzleId) : null;
  const selectedCell = game?.selectedCellIndex ?? null;
  const selectedValue = selectedCell !== null ? game?.grid[selectedCell]?.value : null;

  useEffect(() => {
    async function restore() {
      const [savedSettings, savedGame, history] = await Promise.all([loadSettings(), loadActiveGame(), loadCompletedGames()]);
      setSettings(savedSettings);
      setCompletedGames(history);
      setGame(savedGame);
      setScreen("menu");
    }

    restore();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    void saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!game || game.isComplete || game.isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setGame((current) =>
        current && !current.isPaused && !current.isComplete
          ? { ...current, elapsedSeconds: current.elapsedSeconds + 1, updatedAt: new Date().toISOString() }
          : current,
      );
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [game?.isComplete, game?.isPaused, game?.puzzleId]);

  useEffect(() => {
    if (game) {
      void saveActiveGame(game);
    }
  }, [game]);

  function updateSettings(next: Partial<Settings>) {
    setSettings((current) => ({ ...current, ...next }));
    if (next.inputMode && game) {
      setGame((current) => (current ? { ...current, inputMode: next.inputMode!, updatedAt: new Date().toISOString() } : current));
    }
  }

  function startNewPuzzle(difficulty: Difficulty) {
    const nextPuzzle = choosePuzzle(
      difficulty,
      completedGames.map((completed) => completed.puzzleId),
    );

    if (!nextPuzzle) {
      setMessage(`No ${difficulty} puzzles are available yet.`);
      return;
    }

    setMessage("");
    setGame(createGame(nextPuzzle, settings.inputMode));
    setScreen("game");
  }

  function continueGame() {
    if (!game || !getPuzzleById(game.puzzleId)) {
      setMessage("The saved puzzle could not be restored. Start a new puzzle to continue.");
      setGame(null);
      void clearActiveGame();
      return;
    }

    setMessage("");
    setScreen("game");
  }

  function completePuzzle(nextGame: GameState) {
    const completedPuzzle = getPuzzleById(nextGame.puzzleId);
    if (!completedPuzzle || nextGame.isComplete) {
      return nextGame;
    }

    const completed: CompletedGame = {
      id: `${nextGame.puzzleId}-${Date.now()}`,
      puzzleId: nextGame.puzzleId,
      difficulty: completedPuzzle.difficulty,
      elapsedSeconds: nextGame.elapsedSeconds,
      mistakeCount: nextGame.mistakeCount,
      completedAt: new Date().toISOString(),
    };

    void saveCompletedGame(completed);
    setCompletedGames((current) => [completed, ...current]);
    return { ...nextGame, isComplete: true, isPaused: false, updatedAt: new Date().toISOString() };
  }

  function pushMove(current: GameState, move: Move, nextGrid: CellState[]) {
    const maybeComplete = puzzle && isComplete(nextGrid, puzzle.solution);
    const nextGame: GameState = {
      ...current,
      grid: nextGrid,
      undoStack: [...current.undoStack, move],
      redoStack: [],
      selectedCellIndex: move.cellIndex,
      updatedAt: new Date().toISOString(),
    };

    return maybeComplete ? completePuzzle(nextGame) : nextGame;
  }

  function selectCell(index: number) {
    if (!game || game.isPaused || game.isComplete) {
      return;
    }

    if (game.selectedNumber && !game.grid[index].given) {
      enterNumber(game.selectedNumber, index);
      return;
    }

    setGame((current) => (current ? { ...current, selectedCellIndex: index, updatedAt: new Date().toISOString() } : current));
  }

  function enterNumber(value: number, targetIndex = game?.selectedCellIndex ?? null) {
    if (targetIndex === null || !puzzle) {
      setGame((current) => (current ? { ...current, selectedNumber: value, updatedAt: new Date().toISOString() } : current));
      return;
    }

    setGame((current) => {
      if (!current || current.isPaused || current.isComplete) {
        return current;
      }

      const cell = current.grid[targetIndex];
      if (cell.given) {
        return { ...current, selectedCellIndex: targetIndex, selectedNumber: value };
      }

      if (current.inputMode === "note") {
        return toggleNote(current, targetIndex, value);
      }

      if (puzzle.solution[targetIndex] !== value) {
        setMistakeCell(targetIndex);
        window.setTimeout(() => setMistakeCell(null), 450);
        return {
          ...current,
          selectedCellIndex: targetIndex,
          selectedNumber: value,
          mistakeCount: current.mistakeCount + 1,
          updatedAt: new Date().toISOString(),
        };
      }

      if (cell.value === value) {
        return { ...current, selectedCellIndex: targetIndex, selectedNumber: value };
      }

      const previousState = cloneCell(cell);
      const nextState = { ...cell, value, notes: [] };
      const nextGrid = current.grid.map((gridCell, index) => (index === targetIndex ? nextState : cloneCell(gridCell)));
      const affectedCells = settings.autoRemoveNotes
        ? getPeerIndexes(targetIndex)
            .filter((index) => nextGrid[index].notes.includes(value))
            .map((index) => {
              const previous = cloneCell(nextGrid[index]);
              const next = { ...previous, notes: previous.notes.filter((note) => note !== value) };
              nextGrid[index] = next;
              return { cellIndex: index, previousState: previous, nextState: cloneCell(next) };
            })
        : [];
      const move: Move = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: "set-value",
        cellIndex: targetIndex,
        previousState,
        nextState: cloneCell(nextState),
        affectedCells,
      };

      return { ...pushMove(current, move, nextGrid), selectedNumber: value };
    });
  }

  function toggleNote(current: GameState, targetIndex: number, value: number) {
    const cell = current.grid[targetIndex];
    if (cell.given || cell.value !== null) {
      return { ...current, selectedCellIndex: targetIndex, selectedNumber: value };
    }

    const previousState = cloneCell(cell);
    const notes = cell.notes.includes(value) ? cell.notes.filter((note) => note !== value) : [...cell.notes, value].sort();
    const nextState = { ...cell, notes };
    const nextGrid = current.grid.map((gridCell, index) => (index === targetIndex ? nextState : cloneCell(gridCell)));
    const move: Move = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: "toggle-note",
      cellIndex: targetIndex,
      previousState,
      nextState: cloneCell(nextState),
    };

    return { ...pushMove(current, move, nextGrid), selectedNumber: value };
  }

  function eraseSelected() {
    setGame((current) => {
      if (!current || current.selectedCellIndex === null || current.isPaused || current.isComplete) {
        return current;
      }

      const cell = current.grid[current.selectedCellIndex];
      if (cell.given || (cell.value === null && cell.notes.length === 0)) {
        return current;
      }

      const previousState = cloneCell(cell);
      const nextState = { ...cell, value: null, notes: [] };
      const nextGrid = current.grid.map((gridCell, index) => (index === cell.index ? nextState : cloneCell(gridCell)));
      const move: Move = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: "clear-value",
        cellIndex: cell.index,
        previousState,
        nextState: cloneCell(nextState),
      };

      return pushMove(current, move, nextGrid);
    });
  }

  function undo() {
    setGame((current) => {
      if (!current || current.undoStack.length === 0 || current.isPaused) {
        return current;
      }

      const move = current.undoStack[current.undoStack.length - 1];
      return {
        ...current,
        grid: applyMove(current.grid, move, "undo"),
        undoStack: current.undoStack.slice(0, -1),
        redoStack: [...current.redoStack, move],
        selectedCellIndex: move.cellIndex,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function redo() {
    setGame((current) => {
      if (!current || current.redoStack.length === 0 || current.isPaused) {
        return current;
      }

      const move = current.redoStack[current.redoStack.length - 1];
      const nextGrid = applyMove(current.grid, move, "redo");
      const nextGame = {
        ...current,
        grid: nextGrid,
        undoStack: [...current.undoStack, move],
        redoStack: current.redoStack.slice(0, -1),
        selectedCellIndex: move.cellIndex,
        updatedAt: new Date().toISOString(),
      };

      return puzzle && isComplete(nextGrid, puzzle.solution) ? completePuzzle(nextGame) : nextGame;
    });
  }

  const board = useMemo(() => {
    if (!game) {
      return null;
    }

    return game.grid.map((cell) => {
      const selected = selectedCell === cell.index;
      const peer = selectedCell !== null && isPeer(cell.index, selectedCell);
      const sameDigit = Boolean(selectedValue && cell.value === selectedValue);
      const boxStart = boxOf(cell.index);

      return (
        <button
          key={cell.index}
          type="button"
          onClick={() => selectCell(cell.index)}
          className={[
            "relative aspect-square border-slate-300 text-center text-xl font-semibold transition dark:border-slate-700 sm:text-2xl",
            "border-r border-b",
            colOf(cell.index) % 3 === 0 ? "border-l-2" : "",
            rowOf(cell.index) % 3 === 0 ? "border-t-2" : "",
            colOf(cell.index) === 8 ? "border-r-2" : "",
            rowOf(cell.index) === 8 ? "border-b-2" : "",
            boxStart % 2 === 0 ? "" : "",
            selected ? "bg-sky-200 text-sky-950 dark:bg-sky-500 dark:text-white" : "",
            !selected && peer ? "bg-sky-50 dark:bg-slate-800" : "",
            !selected && sameDigit ? "bg-amber-100 text-amber-900 dark:bg-amber-400/30 dark:text-amber-100" : "",
            mistakeCell === cell.index ? "animate-pulse bg-red-200 text-red-700 dark:bg-red-500/40" : "",
            cell.given ? "text-slate-950 dark:text-white" : "text-sky-700 dark:text-sky-300",
          ].join(" ")}
          aria-label={`Cell ${cell.index + 1}`}
        >
          {cell.value ? (
            cell.value
          ) : (
            <span className="grid h-full grid-cols-3 grid-rows-3 p-1 text-[0.55rem] font-medium leading-none text-slate-500 dark:text-slate-400 sm:text-xs">
              {numbers.map((note) => (
                <span key={note} className="flex items-center justify-center">
                  {cell.notes.includes(note) ? note : ""}
                </span>
              ))}
            </span>
          )}
        </button>
      );
    });
  }, [game, mistakeCell, selectedCell, selectedValue]);

  if (screen === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">Loading Sudoku...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col">
        {screen === "menu" || !game ? (
          <section className="m-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-xl shadow-slate-200 dark:bg-slate-900 dark:shadow-black/30">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600 dark:text-sky-300">MVP</p>
                <h1 className="mt-2 text-4xl font-bold">My Sudoku</h1>
                <p className="mt-3 text-slate-600 dark:text-slate-300">A clean, mobile-first Sudoku board with notes, undo, persistence, and dark mode.</p>
              </div>
              <button
                type="button"
                onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700"
              >
                {settings.theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>

            {message ? <p className="mb-4 rounded-2xl bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">{message}</p> : null}

            {game && !game.isComplete ? (
              <button type="button" onClick={continueGame} className="mb-4 w-full rounded-2xl bg-sky-600 px-5 py-4 text-lg font-bold text-white shadow-lg shadow-sky-200 dark:shadow-none">
                Continue {getPuzzleById(game.puzzleId)?.difficulty ?? "Puzzle"} - {formatTime(game.elapsedSeconds)}
              </button>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              {difficulties.map((difficulty) => (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => startNewPuzzle(difficulty)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-lg font-bold transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  {difficulty}
                </button>
              ))}
            </div>

            <label className="mt-6 flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold dark:bg-slate-800">
              Auto-remove notes
              <input type="checkbox" checked={settings.autoRemoveNotes} onChange={(event) => updateSettings({ autoRemoveNotes: event.target.checked })} className="h-5 w-5 accent-sky-600" />
            </label>
          </section>
        ) : (
          <section className="flex flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
            <div className="mx-auto w-full max-w-[min(92vw,70vh)] lg:max-w-2xl">
              <header className="mb-4 flex items-center justify-between gap-3">
                <button type="button" onClick={() => setScreen("menu")} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                  Menu
                </button>
                <button
                  type="button"
                  onClick={() => setGame((current) => (current ? { ...current, isPaused: !current.isPaused, updatedAt: new Date().toISOString() } : current))}
                  className="rounded-full bg-white px-4 py-2 font-mono text-lg font-bold shadow dark:bg-slate-900"
                >
                  {formatTime(game.elapsedSeconds)}
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700"
                >
                  {settings.theme === "dark" ? "Light" : "Dark"}
                </button>
              </header>

              <div className="mb-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{puzzle?.difficulty ?? "Puzzle"}</span>
                <span>Mistakes: {game.mistakeCount}</span>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-white p-2 shadow-2xl shadow-slate-200 dark:bg-slate-900 dark:shadow-black/30">
                <div className={game.isPaused ? "pointer-events-none opacity-0" : "grid grid-cols-9 border-2 border-slate-800 dark:border-slate-200"}>{board}</div>

                {game.isPaused ? (
                  <div className="absolute inset-2 flex flex-col items-center justify-center rounded-xl bg-white/95 text-center dark:bg-slate-900/95">
                    <h2 className="text-3xl font-bold">Paused</h2>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">The board is hidden while the timer is paused.</p>
                    <button
                      type="button"
                      onClick={() => setGame((current) => (current ? { ...current, isPaused: false, updatedAt: new Date().toISOString() } : current))}
                      className="mt-6 rounded-2xl bg-sky-600 px-6 py-3 font-bold text-white"
                    >
                      Resume
                    </button>
                  </div>
                ) : null}

                {game.isComplete ? (
                  <div className="absolute inset-2 flex flex-col items-center justify-center rounded-xl bg-white/95 p-6 text-center dark:bg-slate-900/95">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Complete</p>
                    <h2 className="mt-2 text-4xl font-bold">Nice solve!</h2>
                    <p className="mt-3 text-slate-600 dark:text-slate-300">
                      {puzzle?.difficulty} in {formatTime(game.elapsedSeconds)} with {game.mistakeCount} mistakes.
                    </p>
                    <div className="mt-6 grid w-full max-w-xs gap-3">
                      <button type="button" onClick={() => startNewPuzzle(puzzle?.difficulty ?? "Easy")} className="rounded-2xl bg-sky-600 px-5 py-3 font-bold text-white">
                        New Puzzle
                      </button>
                      <button type="button" onClick={() => setScreen("menu")} className="rounded-2xl border border-slate-200 px-5 py-3 font-bold dark:border-slate-700">
                        Back to Menu
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-3xl bg-white p-4 shadow-xl shadow-slate-200 dark:bg-slate-900 dark:shadow-black/30">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateSettings({ inputMode: game.inputMode === "answer" ? "note" : "answer" })}
                  className={`rounded-2xl px-4 py-3 font-bold ${game.inputMode === "note" ? "bg-amber-400 text-amber-950" : "bg-slate-100 dark:bg-slate-800"}`}
                >
                  {game.inputMode === "note" ? "Notes On" : "Answer"}
                </button>
                <button type="button" onClick={eraseSelected} className="rounded-2xl bg-slate-100 px-4 py-3 font-bold dark:bg-slate-800">
                  Erase
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {numbers.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => enterNumber(value)}
                    className={`aspect-square rounded-2xl text-2xl font-black transition ${
                      game.selectedNumber === value ? "bg-sky-600 text-white shadow-lg shadow-sky-200 dark:shadow-none" : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={undo} disabled={game.undoStack.length === 0} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold disabled:opacity-40 dark:border-slate-700">
                  Undo
                </button>
                <button type="button" onClick={redo} disabled={game.redoStack.length === 0} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold disabled:opacity-40 dark:border-slate-700">
                  Redo
                </button>
              </div>

              <label className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold dark:bg-slate-800">
                Auto-remove notes
                <input type="checkbox" checked={settings.autoRemoveNotes} onChange={(event) => updateSettings({ autoRemoveNotes: event.target.checked })} className="h-5 w-5 accent-sky-600" />
              </label>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Start over from the menu? Your current puzzle remains saved until a new one starts.")) {
                    setScreen("menu");
                  }
                }}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400"
              >
                New puzzle from menu
              </button>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}

export default App;
