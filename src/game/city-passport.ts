import { CITY_SITES } from "./city-layout.ts";
import type { GameState } from "./types.ts";

const ROUTE_POOL = ["library", "gallery", "station", "foodcart", "busking", "hospital", "office", "bakery", "gym", "cinema", "laundry", "bookshop", "courier"] as const;
export const CITY_ROUTE_REWARD = 65;

export type CityPassport = Pick<GameState, "day" | "cityPassportDay" | "cityPassportVisits" | "cityPassportClaimed">;

/** Deterministic three-stop route that changes daily and is safe across saves/reloads. */
export function cityRoute(day: number) {
  const offset = (Math.max(1, Math.floor(day)) - 1) % ROUTE_POOL.length;
  return [0, 2, 4].map(step => {
    const id = ROUTE_POOL[(offset + step) % ROUTE_POOL.length];
    const site = CITY_SITES.find(item => item.id === id);
    if (!site) throw new Error("City route has no site: " + id);
    return site;
  });
}

export function passportSnapshot(state: CityPassport) {
  const tasks = cityRoute(state.day);
  const visits = state.cityPassportDay === state.day && Array.isArray(state.cityPassportVisits)
    ? state.cityPassportVisits.filter(v => tasks.some(task => task.id === v))
    : [];
  const completed = tasks.filter(task => visits.includes(task.id));
  const claimed = state.cityPassportDay === state.day && state.cityPassportClaimed === true;
  return { tasks, visits, completed, claimed, ready: completed.length === tasks.length && !claimed };
}

function ensureToday(state: CityPassport) {
  if (state.cityPassportDay === state.day && Array.isArray(state.cityPassportVisits)) return;
  state.cityPassportDay = state.day;
  state.cityPassportVisits = [];
  state.cityPassportClaimed = false;
}

/** Record only successful interactions, never a failed purchase/job attempt. */
export function stampPassport(state: CityPassport, siteId: string): string | null {
  if (!cityRoute(state.day).some(site => site.id === siteId)) return null;
  ensureToday(state);
  if (state.cityPassportVisits!.includes(siteId)) return null;
  state.cityPassportVisits!.push(siteId);
  const { completed, tasks } = passportSnapshot(state);
  return completed.length === tasks.length
    ? "City route complete! Collect $65 at City Hall."
    : "City passport stamped · " + completed.length + "/" + tasks.length + " stops";
}

/** Hall is the only place to collect; prevents repeating the same daily payout. */
export function claimPassport(state: GameState): string | null {
  if (!passportSnapshot(state).ready) return null;
  ensureToday(state);
  state.cityPassportClaimed = true;
  state.money += CITY_ROUTE_REWARD;
  state.needs.fun = Math.min(100, state.needs.fun + 12);
  state.needs.social = Math.min(100, state.needs.social + 6);
  state.log = ["Completed the city route. +$65 from City Hall.", ...state.log].slice(0, 16);
  return "City route reward collected · +$65";
}