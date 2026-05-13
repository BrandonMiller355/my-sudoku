import Dexie, { type Table } from "dexie";
import type { CompletedGame, GameState, Settings } from "./types";

type ActiveGameRecord = {
  id: "current";
  state: GameState;
};

type SettingsRecord = Settings & {
  id: "settings";
};

class SudokuDatabase extends Dexie {
  activeGame!: Table<ActiveGameRecord, string>;
  completedGames!: Table<CompletedGame, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super("my-sudoku");
    this.version(1).stores({
      activeGame: "id",
      completedGames: "id,puzzleId,difficulty,completedAt",
      settings: "id",
    });
  }
}

const db = new SudokuDatabase();

export const defaultSettings: Settings = {
  theme: "light",
  inputMode: "answer",
};

export async function loadActiveGame() {
  try {
    return (await db.activeGame.get("current"))?.state ?? null;
  } catch {
    return null;
  }
}

export async function saveActiveGame(state: GameState) {
  try {
    await db.activeGame.put({ id: "current", state: { ...state, updatedAt: new Date().toISOString() } });
  } catch {
    // The app remains playable if IndexedDB is blocked.
  }
}

export async function clearActiveGame() {
  try {
    await db.activeGame.delete("current");
  } catch {
    // Ignore unavailable storage.
  }
}

export async function loadSettings() {
  try {
    const saved = await db.settings.get("settings");
    return saved ? { theme: saved.theme, inputMode: saved.inputMode } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: Settings) {
  try {
    await db.settings.put({ id: "settings", ...settings });
  } catch {
    // Ignore unavailable storage.
  }
}

export async function loadCompletedGames() {
  try {
    return await db.completedGames.toArray();
  } catch {
    return [];
  }
}

export async function saveCompletedGame(game: CompletedGame) {
  try {
    await db.completedGames.put(game);
  } catch {
    // Ignore unavailable storage.
  }
}
