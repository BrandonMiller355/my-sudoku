import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { choosePuzzle, difficulties, getPuzzleById } from "./puzzleService";
import {
  clearActiveGame,
  defaultSettings,
  loadActiveGame,
  loadCompletedGames,
  loadSettings,
  loadSeenPuzzles,
  saveActiveGame,
  saveCompletedGame,
  saveSeenPuzzle,
  saveSettings,
} from "./storageService";
import type { CellState, CompletedGame, ConjugatePair, Difficulty, GameState, Move, Settings } from "./types";
import {
  applyMove,
  boxOf,
  cloneCell,
  colOf,
  computeBivalueCellIndexes,
  computeConjugatePairs,
  createGame,
  formatTime,
  getPeerIndexes,
  isComplete,
  isPeer,
  numbers,
  rowOf,
} from "./utils";
import { buildGameStateFromImport, downloadExport, exportGame, resolveImportedPuzzle, validateAndParseImport } from "./importExportService";
import { HintModal } from "./HintModal";
import { WinCelebration, pickCorgiImage } from "./WinCelebration";

type IconButtonProps = {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
};

function IconButton({ active = false, disabled = false, icon, label, onClick, pressed }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-35",
        active
          ? "border-sky-600 bg-sky-600 text-white shadow-lg shadow-sky-200 dark:shadow-none"
          : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200",
      ].join(" ")}
      aria-pressed={pressed}
      aria-label={label}
    >
      <span className="h-6 w-6">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [completedGames, setCompletedGames] = useState<CompletedGame[]>([]);
  const [seenPuzzleIds, setSeenPuzzleIds] = useState<string[]>([]);
  const [screen, setScreen] = useState<"loading" | "menu" | "game">("loading");
  const [menuMode, setMenuMode] = useState<"main" | "new-game">("main");
  const [message, setMessage] = useState("");
  const [mistakeAttempt, setMistakeAttempt] = useState<{ cellIndex: number; value: number; id: number } | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [highlightBivalues, setHighlightBivalues] = useState(false);
  const [highlightConjugatePairs, setHighlightConjugatePairs] = useState(false);
  const [celebration, setCelebration] = useState<"none" | "playing" | "done">("none");
  const [celebrationImage, setCelebrationImage] = useState(pickCorgiImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCelebrationRef = useRef(false);
  const boardGridRef = useRef<HTMLDivElement>(null);

  const puzzle = game ? getPuzzleById(game.puzzleId) : null;
  const selectedCell = game?.selectedCellIndex ?? null;
  const selectedCellState = selectedCell !== null ? game?.grid[selectedCell] : null;
  const selectedValue = selectedCellState?.value ?? null;
  const selectedNotes = selectedCellState?.notes ?? [];
  const canEraseSelected = Boolean(selectedCellState && !selectedCellState.given && (selectedCellState.value !== null || selectedCellState.notes.length > 0));
  const completedDigits = game ? numbers.filter((value) => game.grid.filter((cell) => cell.value === value).length >= 9) : [];

  const solvedCellsSnapshot = useMemo(
    () =>
      (game?.grid ?? [])
        .map((cell, index) => ({ index, value: cell.value ?? 0, given: cell.given }))
        .filter((cell) => cell.value > 0),
    [game?.grid],
  );

  const solverHighlights = useMemo(() => {
    if (!game || game.isComplete) {
      return { bivalueCells: new Set<number>(), conjugatePairs: [] as ConjugatePair[], conjugateCells: new Set<number>() };
    }
    const conjugatePairs = computeConjugatePairs(game.grid);
    const conjugateCells = new Set<number>();
    for (const pair of conjugatePairs) {
      conjugateCells.add(pair.cells[0]);
      conjugateCells.add(pair.cells[1]);
    }
    return {
      bivalueCells: computeBivalueCellIndexes(game.grid),
      conjugatePairs,
      conjugateCells,
    };
  }, [game?.grid, game?.isComplete]);

  type ConjugateHighlight = "none" | "overview" | "overview-dim" | "partner-row" | "partner-col" | "partner-box" | "partner-multi";

  const conjugateHighlights = useMemo<Map<number, ConjugateHighlight>>(() => {
    const map = new Map<number, ConjugateHighlight>();
    if (!highlightConjugatePairs) {
      return map;
    }

    if (selectedCell === null) {
      for (const idx of solverHighlights.conjugateCells) {
        map.set(idx, "overview");
      }
      return map;
    }

    const partnerUnitTypes = new Map<number, Set<"row" | "col" | "box">>();
    for (const pair of solverHighlights.conjugatePairs) {
      const [a, b] = pair.cells;
      if (a !== selectedCell && b !== selectedCell) {
        continue;
      }
      const partner = a === selectedCell ? b : a;
      const set = partnerUnitTypes.get(partner) ?? new Set<"row" | "col" | "box">();
      set.add(pair.unit.type);
      partnerUnitTypes.set(partner, set);
    }

    for (const idx of solverHighlights.conjugateCells) {
      if (idx === selectedCell) {
        continue;
      }
      const units = partnerUnitTypes.get(idx);
      if (!units) {
        map.set(idx, "overview-dim");
        continue;
      }
      if (units.size > 1) {
        map.set(idx, "partner-multi");
      } else if (units.has("row")) {
        map.set(idx, "partner-row");
      } else if (units.has("col")) {
        map.set(idx, "partner-col");
      } else {
        map.set(idx, "partner-box");
      }
    }

    return map;
  }, [highlightConjugatePairs, selectedCell, solverHighlights]);

  type ConjugateDigitKind = "partner-row" | "partner-col" | "partner-box" | "partner-multi";

  const conjugateDigitColors = useMemo<Map<number, Map<number, ConjugateDigitKind>>>(() => {
    const map = new Map<number, Map<number, ConjugateDigitKind>>();
    if (!highlightConjugatePairs || selectedCell === null) {
      return map;
    }

    for (const pair of solverHighlights.conjugatePairs) {
      const [a, b] = pair.cells;
      if (a !== selectedCell && b !== selectedCell) {
        continue;
      }
      const unitKind: ConjugateDigitKind =
        pair.unit.type === "row" ? "partner-row" : pair.unit.type === "col" ? "partner-col" : "partner-box";
      for (const idx of [a, b]) {
        const inner = map.get(idx) ?? new Map<number, ConjugateDigitKind>();
        const existing = inner.get(pair.digit);
        inner.set(pair.digit, existing && existing !== unitKind ? "partner-multi" : unitKind);
        map.set(idx, inner);
      }
    }

    return map;
  }, [highlightConjugatePairs, selectedCell, solverHighlights]);

  useEffect(() => {
    async function restore() {
      const [savedSettings, savedGame, history, seenPuzzles] = await Promise.all([loadSettings(), loadActiveGame(), loadCompletedGames(), loadSeenPuzzles()]);
      const nextSeenPuzzleIds = new Set(seenPuzzles.map((seenPuzzle) => seenPuzzle.puzzleId));
      const savedPuzzle = savedGame ? getPuzzleById(savedGame.puzzleId) : null;

      if (savedGame && savedPuzzle) {
        nextSeenPuzzleIds.add(savedPuzzle.id);
        void saveSeenPuzzle({ id: savedPuzzle.id, puzzleId: savedPuzzle.id, difficulty: savedPuzzle.difficulty, seenAt: savedGame.startedAt });
      }

      setSettings(savedSettings);
      setCompletedGames(history);
      setSeenPuzzleIds([...nextSeenPuzzleIds]);
      setGame(savedGame);
      setScreen("menu");
    }

    restore();
  }, []);

  useEffect(() => {
    if (!advancedOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAdvancedOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advancedOpen]);

  useEffect(() => {
    if (game?.isComplete) {
      setHighlightBivalues(false);
      setHighlightConjugatePairs(false);
      setHintModalOpen(false);
    }
  }, [game?.isComplete]);

  useEffect(() => {
    if (game?.isPaused) {
      setHintModalOpen(false);
    }
  }, [game?.isPaused]);

  useEffect(() => {
    if (screen !== "game") {
      setHintModalOpen(false);
    }
  }, [screen]);

  useEffect(() => {
    if (game?.isComplete && pendingCelebrationRef.current) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setCelebrationImage(pickCorgiImage()); // fix once per win, so it stays the same through playing -> done
      if (prefersReducedMotion) {
        setCelebration("done");
      } else {
        setCelebration("playing");
      }
      pendingCelebrationRef.current = false;
    }
  }, [game?.isComplete]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    void saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!game || screen !== "game" || game.isComplete || game.isPaused) {
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
  }, [game?.isComplete, game?.isPaused, game?.puzzleId, screen]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setGame((current) =>
          current && !current.isPaused && !current.isComplete
            ? { ...current, isPaused: true, updatedAt: new Date().toISOString() }
            : current,
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

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
    const unavailablePuzzleIds = [
      ...new Set([
        ...seenPuzzleIds,
        ...completedGames.map((completed) => completed.puzzleId),
        ...(game && !game.isComplete ? [game.puzzleId] : []),
      ]),
    ];
    const currentGameId = game && !game.isComplete ? [game.puzzleId] : [];
    const nextPuzzle = choosePuzzle(difficulty, unavailablePuzzleIds) ?? choosePuzzle(difficulty, currentGameId);

    if (!nextPuzzle) {
      setMessage(`No new ${difficulty} puzzles are available yet.`);
      return;
    }

    setMessage("");
    setCelebration("none");
    setGame(createGame(nextPuzzle, settings.inputMode));
    setSeenPuzzleIds((current) => [...new Set([...current, nextPuzzle.id])]);
    void saveSeenPuzzle({ id: nextPuzzle.id, puzzleId: nextPuzzle.id, difficulty: nextPuzzle.difficulty, seenAt: new Date().toISOString() });
    setMenuMode("main");
    setHighlightBivalues(false);
    setHighlightConjugatePairs(false);
    setScreen("game");
  }

  function openNewGameMenu() {
    if (game && !game.isComplete && !window.confirm("Start a new game? Your current puzzle will be replaced.")) {
      return;
    }

    setMessage("");
    setMenuMode("new-game");
  }

  function continueGame() {
    if (!game || !getPuzzleById(game.puzzleId)) {
      setMessage("The saved puzzle could not be restored. Start a new puzzle to continue.");
      setGame(null);
      void clearActiveGame();
      return;
    }

    setMessage("");
    setCelebration("none");
    setGame((current) => (current && current.isPaused ? { ...current, isPaused: false, updatedAt: new Date().toISOString() } : current));
    setScreen("game");
  }

  function handleExport() {
    if (!game || !puzzle) {
      return;
    }
    const exportData = exportGame(game, puzzle);
    downloadExport(exportData, game.puzzleId);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const parseResult = validateAndParseImport(json);

        if (!parseResult.ok) {
          setMessage(parseResult.error);
          return;
        }

        const puzzleResult = resolveImportedPuzzle(parseResult.data);
        if (!puzzleResult.ok) {
          setMessage(puzzleResult.error);
          return;
        }

        if (!window.confirm("Import this puzzle? Your current game will be replaced.")) {
          return;
        }

        const importedGame = buildGameStateFromImport(parseResult.data, puzzleResult.puzzle);
        setCelebration("none");
        setGame(importedGame);
        void saveActiveGame(importedGame);
        setMessage("");
        setScreen("game");
      } catch {
        setMessage("Invalid JSON file. Please select a valid export file.");
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      completedAt: new Date().toISOString(),
    };

    void saveCompletedGame(completed);
    setCompletedGames((current) => [completed, ...current]);
    pendingCelebrationRef.current = true;
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

    setGame((current) => {
      if (!current) {
        return current;
      }
      const nextSelected = current.selectedCellIndex === index ? null : index;
      return { ...current, selectedCellIndex: nextSelected, selectedNumber: null, updatedAt: new Date().toISOString() };
    });
  }

  function enterNumber(value: number, targetIndex = game?.selectedCellIndex ?? null) {
    if (targetIndex === null || !puzzle) {
      return;
    }

    setGame((current) => {
      if (!current || current.isPaused || current.isComplete) {
        return current;
      }

      const cell = current.grid[targetIndex];
      if (cell.given) {
        return { ...current, selectedCellIndex: targetIndex, selectedNumber: null };
      }

      if (current.inputMode === "note") {
        return toggleNote(current, targetIndex, value);
      }

      if (puzzle.solution[targetIndex] !== value) {
        const attemptId = Date.now();
        setMistakeAttempt({ cellIndex: targetIndex, value, id: attemptId });
        window.setTimeout(() => {
          setMistakeAttempt((attempt) => (attempt?.id === attemptId ? null : attempt));
        }, 1450);
        return {
          ...current,
          selectedCellIndex: targetIndex,
          selectedNumber: null,
          updatedAt: new Date().toISOString(),
        };
      }

      setMistakeAttempt(null);

      if (cell.value === value) {
        return { ...current, selectedCellIndex: targetIndex, selectedNumber: null };
      }

      const previousState = cloneCell(cell);
      const nextState = { ...cell, value, notes: [] };
      const nextGrid = current.grid.map((gridCell, index) => (index === targetIndex ? nextState : cloneCell(gridCell)));
      const affectedCells = getPeerIndexes(targetIndex)
        .filter((index) => nextGrid[index].notes.includes(value))
        .map((index) => {
          const previous = cloneCell(nextGrid[index]);
          const next = { ...previous, notes: previous.notes.filter((note) => note !== value) };
          nextGrid[index] = next;
          return { cellIndex: index, previousState: previous, nextState: cloneCell(next) };
        });
      const move: Move = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: "set-value",
        cellIndex: targetIndex,
        previousState,
        nextState: cloneCell(nextState),
        affectedCells,
      };

      return { ...pushMove(current, move, nextGrid), selectedNumber: null };
    });
  }

  function toggleNote(current: GameState, targetIndex: number, value: number) {
    const cell = current.grid[targetIndex];
    if (cell.given || cell.value !== null) {
      return { ...current, selectedCellIndex: targetIndex, selectedNumber: null };
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

    return { ...pushMove(current, move, nextGrid), selectedNumber: null };
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

  function openHintModal() {
    setAdvancedOpen(false);
    setHintModalOpen(true);
  }

  function fillAllCandidates() {
    if (!window.confirm("Fill all empty cells with candidates? This will replace existing notes.")) {
      return;
    }

    setGame((current) => {
      if (!current || current.isPaused || current.isComplete) {
        return current;
      }

      const nextGrid = current.grid.map((cell) => cloneCell(cell));
      const changedCells = nextGrid
        .filter((cell) => !cell.given && cell.value === null)
        .map((cell) => {
          const candidateNotes = numbers.filter((value) => !getPeerIndexes(cell.index).some((peerIndex) => nextGrid[peerIndex].value === value));
          const notesChanged = cell.notes.length !== candidateNotes.length || cell.notes.some((note, index) => note !== candidateNotes[index]);

          if (!notesChanged) {
            return null;
          }

          const previousState = cloneCell(cell);
          const nextState = { ...cell, notes: candidateNotes };
          nextGrid[cell.index] = nextState;
          return { cellIndex: cell.index, previousState, nextState: cloneCell(nextState) };
        })
        .filter((change): change is { cellIndex: number; previousState: CellState; nextState: CellState } => change !== null);

      if (changedCells.length === 0) {
        return current;
      }

      const [primaryChange, ...affectedCells] = changedCells;
      const move: Move = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: "fill-candidates",
        cellIndex: primaryChange.cellIndex,
        previousState: primaryChange.previousState,
        nextState: primaryChange.nextState,
        affectedCells,
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
      const attemptedValue = mistakeAttempt?.cellIndex === cell.index ? mistakeAttempt.value : null;
      const isMistakeAttempt = attemptedValue !== null;
      const displayedValue = attemptedValue ?? cell.value;
      const boxStart = boxOf(cell.index);
      const inBivalue = highlightBivalues && solverHighlights.bivalueCells.has(cell.index) && !isMistakeAttempt;
      const conjugateKind = !isMistakeAttempt && !selected ? (conjugateHighlights.get(cell.index) ?? "none") : "none";
      const inConjugateOverview = conjugateKind === "overview";
      const inBoth = inBivalue && inConjugateOverview;

      let highlightClasses = "";
      if (inBoth) {
        highlightClasses =
          "bg-gradient-to-br from-violet-200/95 to-emerald-200/95 ring-2 ring-inset ring-amber-500 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.65)] dark:from-violet-600/45 dark:to-emerald-600/45 dark:ring-amber-400 dark:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.45)]";
      } else if (inBivalue) {
        highlightClasses = "ring-2 ring-inset ring-violet-500 bg-violet-100/85 dark:bg-violet-500/25";
      } else if (conjugateKind === "overview") {
        highlightClasses = "ring-2 ring-inset ring-emerald-600 bg-emerald-100/85 dark:bg-emerald-500/25";
      } else if (conjugateKind === "overview-dim") {
        highlightClasses = "ring-1 ring-inset ring-emerald-500/40 bg-emerald-100/25 dark:bg-emerald-500/10";
      } else if (conjugateKind === "partner-row") {
        highlightClasses = "ring-2 ring-inset ring-teal-500 bg-teal-100/85 dark:bg-teal-500/30";
      } else if (conjugateKind === "partner-col") {
        highlightClasses = "ring-2 ring-inset ring-orange-500 bg-orange-100/85 dark:bg-orange-500/30";
      } else if (conjugateKind === "partner-box") {
        highlightClasses = "ring-2 ring-inset ring-fuchsia-500 bg-fuchsia-100/85 dark:bg-fuchsia-500/30";
      } else if (conjugateKind === "partner-multi") {
        highlightClasses = "ring-4 ring-inset ring-yellow-500 bg-yellow-100/85 dark:bg-yellow-500/30";
      }

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
            !isMistakeAttempt && selected ? "bg-sky-200 text-sky-950 dark:bg-sky-500/40 dark:text-white" : "",
            !isMistakeAttempt && !selected && peer && conjugateKind === "none" ? "bg-sky-50 dark:bg-slate-800" : "",
            !isMistakeAttempt && !selected && sameDigit ? "bg-amber-100 text-amber-900 dark:bg-amber-400/30 dark:text-amber-100" : "",
            highlightClasses,
            cell.given ? "text-slate-950 dark:text-white" : "text-sky-700 dark:text-sky-300",
            isMistakeAttempt ? "animate-pulse bg-red-200! text-red-700! dark:bg-red-500/40! dark:text-red-100!" : "",
          ].join(" ")}
          aria-label={`Cell ${cell.index + 1}`}
        >
          {displayedValue ? (
            displayedValue
          ) : (
            <span className="grid h-full grid-cols-3 grid-rows-3 p-1 text-[0.55rem] font-medium leading-none text-slate-500 dark:text-slate-400 sm:text-xs">
              {numbers.map((note) => {
                const digitKind = conjugateDigitColors.get(cell.index)?.get(note);
                const noteColor =
                  digitKind === "partner-row"
                    ? "text-teal-700 dark:text-teal-300"
                    : digitKind === "partner-col"
                      ? "text-orange-700 dark:text-orange-300"
                      : digitKind === "partner-box"
                        ? "text-fuchsia-700 dark:text-fuchsia-300"
                        : digitKind === "partner-multi"
                          ? "text-yellow-600 dark:text-yellow-300"
                          : "";
                return (
                  <span key={note} className={`flex items-center justify-center ${noteColor}`}>
                    {cell.notes.includes(note) ? note : ""}
                  </span>
                );
              })}
            </span>
          )}
        </button>
      );
    });
  }, [game, mistakeAttempt, selectedCell, selectedValue, highlightBivalues, highlightConjugatePairs, solverHighlights, conjugateHighlights, conjugateDigitColors]);

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
                <h1 className="text-4xl font-bold">My Sudoku</h1>
              </div>
              <button
                type="button"
                onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
                aria-label={`Switch to ${settings.theme === "dark" ? "light" : "dark"} mode`}
              >
                {settings.theme === "dark" ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 7 7 0 1 0 20.5 14.5Z" />
                  </svg>
                )}
              </button>
            </div>

            {message ? <p className="mb-4 rounded-2xl bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">{message}</p> : null}

            {menuMode === "main" ? (
              <div className="grid gap-3">
                {game && !game.isComplete ? (
                  <button type="button" onClick={continueGame} className="w-full rounded-2xl bg-sky-600 px-5 py-4 text-lg font-bold text-white shadow-lg shadow-sky-200 dark:shadow-none">
                    Continue {getPuzzleById(game.puzzleId)?.difficulty ?? "Puzzle"} - {formatTime(game.elapsedSeconds)}
                  </button>
                ) : null}
                <button type="button" onClick={openNewGameMenu} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-lg font-bold transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
                  New Game
                </button>
                <button type="button" onClick={handleImportClick} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-lg font-bold transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
                  Import Puzzle
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">Choose Difficulty</h2>
                  <button type="button" onClick={() => setMenuMode("main")} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                    Back
                  </button>
                </div>
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
              </>
            )}

          </section>
        ) : (
          <section className="flex flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
            <div className="mx-auto w-full max-w-[min(92vw,70vh)] lg:max-w-2xl">
              <header className="mb-4 flex items-center justify-center">
                <div className="absolute left-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuMode("main");
                      setAdvancedOpen(false);
                      setHighlightBivalues(false);
                      setHighlightConjugatePairs(false);
                      setScreen("menu");
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
                    aria-label="Open menu"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setGame((current) => (current ? { ...current, isPaused: !current.isPaused, updatedAt: new Date().toISOString() } : current))}
                  className="rounded-full bg-white px-4 py-2 font-mono text-lg font-bold shadow dark:bg-slate-900"
                >
                  {formatTime(game.elapsedSeconds)}
                </button>
                <div className="absolute right-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
                    aria-label="Export puzzle"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
                    aria-label={`Switch to ${settings.theme === "dark" ? "light" : "dark"} mode`}
                  >
                    {settings.theme === "dark" ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 7 7 0 1 0 20.5 14.5Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </header>

              <div className="mb-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{puzzle?.difficulty ?? "Puzzle"}</span>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-white p-2 shadow-2xl shadow-slate-200 dark:bg-slate-900 dark:shadow-black/30">
                <div ref={boardGridRef} className={game.isPaused ? "pointer-events-none opacity-0" : "grid grid-cols-9 border-2 border-slate-800 dark:border-slate-200"}>{board}</div>

                {game.isPaused ? (
                  <div className="absolute inset-2 flex flex-col items-center justify-center rounded-xl bg-white/95 p-4 text-center dark:bg-slate-900/95">
                    <h2 className="text-3xl font-bold">Paused</h2>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">The board is hidden while the timer is paused.</p>
                    <div className="mt-4 w-full max-w-xs text-left">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Notes
                      </label>
                      <textarea
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                        rows={4}
                        placeholder="Jot down your strategy…"
                        value={game.puzzleNotes}
                        onChange={(e) =>
                          setGame((current) =>
                            current ? { ...current, puzzleNotes: e.target.value, updatedAt: new Date().toISOString() } : current
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setGame((current) => (current ? { ...current, isPaused: false, updatedAt: new Date().toISOString() } : current))}
                      className="mt-4 rounded-2xl bg-sky-600 px-6 py-3 font-bold text-white"
                    >
                      Resume
                    </button>
                  </div>
                ) : null}

                {celebration === "playing" ? (
                  <WinCelebration
                    solvedCells={solvedCellsSnapshot}
                    boardRect={boardGridRef.current?.getBoundingClientRect() ?? null}
                    phase="playing"
                    onFinish={() => setCelebration("done")}
                    isDarkMode={settings.theme === "dark"}
                    imageSrc={celebrationImage}
                  />
                ) : null}

                {game.isComplete && celebration !== "playing" ? (
                  <>
                    {celebration === "done" ? (
                      <WinCelebration solvedCells={solvedCellsSnapshot} boardRect={null} phase="done" onFinish={() => {}} isDarkMode={settings.theme === "dark"} imageSrc={celebrationImage} />
                    ) : null}
                    <div className="absolute inset-2 z-10 flex items-center justify-center p-3">
                      <div className="flex max-w-xs flex-col items-center rounded-2xl bg-white/20 p-6 text-center shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:bg-slate-900/20 dark:ring-white/10">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-200 [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_0_10px_rgba(0,0,0,0.6)]">Complete</p>
                        <h2 className="mt-2 text-4xl font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_0_12px_rgba(0,0,0,0.6)]">Nice solve!</h2>
                        <p className="mt-3 font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_0_10px_rgba(0,0,0,0.6)]">
                          {puzzle?.difficulty} in {formatTime(game.elapsedSeconds)}.
                        </p>
                        <div className="mt-6 grid w-full gap-3">
                          <button type="button" onClick={() => startNewPuzzle(puzzle?.difficulty ?? "Easy")} className="rounded-2xl bg-sky-600 px-5 py-3 font-bold text-white">
                            New Puzzle
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCelebration("none");
                              setMenuMode("main");
                              setAdvancedOpen(false);
                              setHighlightBivalues(false);
                              setHighlightConjugatePairs(false);
                              setScreen("menu");
                            }}
                            className="rounded-2xl border border-slate-200 bg-white/70 px-5 py-3 font-bold dark:border-slate-700 dark:bg-slate-800/70"
                          >
                            Back to Menu
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <aside className={`mx-auto flex w-full max-w-md flex-col gap-3 rounded-3xl bg-white p-4 shadow-xl shadow-slate-200 dark:bg-slate-900 dark:shadow-black/30${game.isPaused ? " hidden" : ""}`}>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                <IconButton
                  active
                  label={game.inputMode === "answer" ? "Answer" : "Notes"}
                  onClick={() => updateSettings({ inputMode: game.inputMode === "answer" ? "note" : "answer" })}
                  pressed
                  icon={
                    game.inputMode === "answer" ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" fill="currentColor" className="opacity-20" />
                        <path d="M6 12.5 10 16l8-9" className="fill-none" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 5h14v14H5z" fill="currentColor" className="opacity-20" />
                        <path d="M8 9h8M8 13h8M8 17h5" />
                      </svg>
                    )
                  }
                />
                <IconButton
                  disabled={!canEraseSelected}
                  label="Erase"
                  onClick={eraseSelected}
                  icon={
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m7 15 8-8 4 4-8 8H7l-4-4 4-4" />
                      <path d="M11 19h9" />
                    </svg>
                  }
                />
                <IconButton
                  disabled={game.isPaused || game.isComplete}
                  active={advancedOpen}
                  label="Advanced"
                  pressed={advancedOpen}
                  onClick={() => setAdvancedOpen((open) => !open)}
                  icon={
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 21v-7M4 10V3" />
                      <path d="M12 21v-9M12 8V3" />
                      <path d="M20 21v-5M20 12V3" />
                      <path d="M2 14h4M10 8h4M18 16h4" />
                      <circle cx="4" cy="14" r="2" fill="currentColor" className="opacity-30" />
                      <circle cx="12" cy="8" r="2" fill="currentColor" className="opacity-30" />
                      <circle cx="20" cy="16" r="2" fill="currentColor" className="opacity-30" />
                    </svg>
                  }
                />
                <IconButton
                  disabled={game.undoStack.length === 0}
                  label="Undo"
                  onClick={undo}
                  icon={
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 14 4 9l5-5" />
                      <path d="M4 9h11a5 5 0 0 1 0 10h-4" />
                    </svg>
                  }
                />
                <IconButton
                  disabled={game.redoStack.length === 0}
                  label="Redo"
                  onClick={redo}
                  icon={
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 14 5-5-5-5" />
                      <path d="M20 9H9a5 5 0 0 0 0 10h4" />
                    </svg>
                  }
                />
              </div>

              <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
                {numbers.map((value) => {
                  if (completedDigits.includes(value)) {
                    return <span key={value} aria-hidden="true" className="aspect-square" />;
                  }

                  const isNoted = selectedNotes.includes(value);

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => enterNumber(value)}
                      className={`aspect-square rounded-xl text-lg font-black transition hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-slate-700 dark:hover:text-sky-200 sm:text-2xl ${
                        isNoted ? "bg-amber-100 text-amber-900 ring-2 ring-amber-300/70 dark:bg-amber-400/20 dark:text-amber-100 dark:ring-amber-300/40" : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>

            </aside>
          </section>
        )}

        {hintModalOpen && screen === "game" && game ? (
          <HintModal grid={game.grid} onClose={() => setHintModalOpen(false)} />
        ) : null}

        {advancedOpen && screen === "game" && game ? (
          <div
            className="fixed inset-0 z-100 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="advanced-modal-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]"
              aria-label="Close advanced tools"
              onClick={() => setAdvancedOpen(false)}
            />
            <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-5 flex items-start justify-between gap-3">
                <h2 id="advanced-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
                  Advanced
                </h2>
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(false)}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={game.isPaused || game.isComplete}
                  onClick={() => fillAllCandidates()}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-sky-500 dark:hover:bg-slate-700"
                >
                  Expose all candidates
                </button>
                <button
                  type="button"
                  disabled={game.isPaused || game.isComplete}
                  onClick={() => setHighlightBivalues((current) => !current)}
                  aria-pressed={highlightBivalues}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    highlightBivalues
                      ? "border-violet-500 bg-violet-100 text-violet-950 dark:border-violet-400 dark:bg-violet-500/30 dark:text-violet-50"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:border-violet-300 hover:bg-violet-50/80 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-violet-500 dark:hover:bg-slate-700"
                  }`}
                >
                  Highlight bivalues
                </button>
                <button
                  type="button"
                  disabled={game.isPaused || game.isComplete}
                  onClick={() => setHighlightConjugatePairs((current) => !current)}
                  aria-pressed={highlightConjugatePairs}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    highlightConjugatePairs
                      ? "border-emerald-600 bg-emerald-100 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-500/30 dark:text-emerald-50"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:border-emerald-400 hover:bg-emerald-50/80 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-emerald-500 dark:hover:bg-slate-700"
                  }`}
                >
                  Highlight conjugate pairs
                </button>
                <button
                  type="button"
                  disabled={game.isPaused || game.isComplete}
                  onClick={openHintModal}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-sky-500 dark:hover:bg-slate-700"
                >
                  Hint
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          style={{ display: "none" }}
          aria-hidden="true"
        />
      </div>
    </main>
  );
}

export default App;
