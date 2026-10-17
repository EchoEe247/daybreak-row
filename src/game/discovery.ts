import { DISTRICTS, districtAt } from "./city-layout.ts";
import type { GameState } from "./types.ts";

export const EXPLORER_BONUS = 120;
export const DISTRICT_BONUS = 18;

export function discoveredIds(state: Pick<GameState,"discoveredDistricts">): string[] {
  return [...new Set((state.discoveredDistricts ?? []).filter(id=>DISTRICTS.some(d=>d.id===id)))];
}

export function discoverAt(state: GameState, x: number, z: number): string | null {
  const name=districtAt(x,z);
  const district=DISTRICTS.find(d=>d.name===name);
  if(!district) return null;
  const seen=discoveredIds(state);
  if(seen.includes(district.id))return null;
  state.discoveredDistricts=[...seen,district.id];
  state.money+=DISTRICT_BONUS;
  state.needs.fun=Math.min(100,state.needs.fun+3);
  const finished=state.discoveredDistricts.length===DISTRICTS.length;
  if(finished)state.money+=EXPLORER_BONUS;
  const message=finished
    ? "City explorer complete! +$"+(DISTRICT_BONUS+EXPLORER_BONUS)
    : "Discovered "+district.name+" · +$"+DISTRICT_BONUS;
  state.log=[message,...state.log].slice(0,16);
  return message;
}
