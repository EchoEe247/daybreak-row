import { create } from "zustand";
import type { GameState, UiState } from "@/game/types";
import { SAVE_KEY,BACKUP_KEY,RECOVERY_KEY,loadSaveStatus,persistGameSave } from "@/game/save-codec";

const emptyNeeds = { energy: 70, hunger: 70, hygiene: 70, social: 50, fun: 50 };

export const useUi = create<UiState>(() => ({
  ready: false,
  saveError: null,
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
  retrySave: () => void;
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
  retrySave: () => impl?.retrySave(),
};

export { loadSaveStatus } from "@/game/save-codec";

export function loadSave():GameState|null {return loadSaveStatus(localStorage).state;}

export function writeSave(state: GameState): boolean {
  return persistGameSave(localStorage,state);
}

export function exportSave() {
  // Export raw recovery material rather than reserializing a possibly damaged life.
  const primary=localStorage.getItem(SAVE_KEY);
  const backup=localStorage.getItem(BACKUP_KEY);
  const recovery=localStorage.getItem(RECOVERY_KEY);
  const blob=new Blob([JSON.stringify({primary,backup,recovery,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="daybreak-row-save-recovery.json";a.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem(RECOVERY_KEY);
  } catch {
    /* storage inaccessible; never overwrite what remains */
  }
}