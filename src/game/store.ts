import { create } from "zustand";
import type { GameState, UiState } from "@/game/types";

const emptyNeeds = { energy: 70, hunger: 70, hygiene: 70, social: 50, fun: 50 };

export const useUi = create<UiState>(() => ({
  ready: false,
  mode: "title",
  hasSave: false,
  name: "Alex",
  day: 1,
  minute: 7 * 60 + 12,
  money: 186,
  food: 1,
  needs: emptyNeeds,
  rel: { mara: 0, ellis: 0, theo: 0, jun: 0, idris: 0 },
  goals: {
    shower: false,
    meal: false,
    earn: false,
    groceries: false,
    talk: false,
    sleep: false,
    cushion: false,
    friend: false,
    rhythm: false,
    goodHour: false,
  },
  log: [],
  place: "street",
  district: "Daybreak Row",
  playerX: -10,
  playerZ: 4.2,
  cityPassportDay: 0,
  cityPassportVisits: [],
  cityPassportClaimed: false,
  discoveredDistricts: [],
  prompt: null,
  dialogue: null,
  toasts: [],
  notice: null,
  noticeSub: null,
  caption: null,
  low: false,
  veil: 0,
  transitionLabel: null,
}));

export type GameImpl = {
  startNew: (name: string) => void;
  continue: () => void;
  newLife: () => void;
  interact: () => void;
  travel: (id: string) => void;
  openPhone: () => void;
  closePhone: () => void;
  pause: () => void;
  resume: () => void;
  quit: () => void;
  choose: (index: number) => void;
};

let impl: GameImpl | null = null;

export function bindGame(next: GameImpl) {
  impl = next;
}

export const gameApi: GameImpl = {
  startNew: (name) => impl?.startNew(name),
  continue: () => impl?.continue(),
  newLife: () => impl?.newLife(),
  interact: () => impl?.interact(),
  travel: (id) => impl?.travel(id),
  openPhone: () => impl?.openPhone(),
  closePhone: () => impl?.closePhone(),
  pause: () => impl?.pause(),
  resume: () => impl?.resume(),
  quit: () => impl?.quit(),
  choose: (index) => impl?.choose(index),
};

const SAVE_KEY = "daybreak-row-save-v1";

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameState;
    if (!data || data.version !== 1 || typeof data.money !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / full storage */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}