export type NeedId = "energy" | "hunger" | "hygiene" | "social" | "fun";
export type Needs = Record<NeedId, number>;

export type NpcId = "mara" | "ellis" | "theo" | "jun" | "idris";
export type PlaceId = "street" | "home" | "cafe" | "market" | "office";

export type GoalId =
  | "shower"
  | "meal"
  | "earn"
  | "groceries"
  | "talk"
  | "sleep"
  | "cushion"
  | "friend"
  | "rhythm"
  | "goodHour";

export type Goals = Record<GoalId, boolean>;
export type Rel = Record<NpcId, number>;

export type GameState = {
  version: 1;
  name: string;
  day: number;
  minute: number;
  money: number;
  food: number;
  needs: Needs;
  rel: Rel;
  goals: Goals;
  log: string[];
  place: PlaceId;
  x: number;
  z: number;
  yaw: number;
  rentMark: number;
  shiftDay: number;
  freelanceAt: number;
  collapseAt: number;
  welcomed: boolean;
  /** Optional for v1 saves created before city routes existed. */
  cityPassportDay?: number;
  cityPassportVisits?: string[];
  cityPassportClaimed?: boolean;
  /** Optional cooldown, keeps older v1 saves compatible. */
  cityCourierNextAt?: number;
};

export type Mode = "title" | "play" | "phone" | "pause" | "dialogue" | "sleep" | "shift";

export type DialogueView = {
  npc: NpcId;
  name: string;
  role: string;
  text: string;
  choices: string[];
};

export type Toast = { id: number; text: string };

export type UiState = {
  ready: boolean;
  mode: Mode;
  hasSave: boolean;
  name: string;
  day: number;
  minute: number;
  money: number;
  food: number;
  needs: Needs;
  rel: Rel;
  goals: Goals;
  log: string[];
  place: PlaceId;
  district: string;
  playerX: number;
  playerZ: number;
  cityPassportDay?: number;
  cityPassportVisits?: string[];
  cityPassportClaimed?: boolean;
  prompt: string | null;
  dialogue: DialogueView | null;
  toasts: Toast[];
  notice: string | null;
  noticeSub: string | null;
  caption: string | null;
  low: boolean;
  veil: number;
  transitionLabel: string | null;
};