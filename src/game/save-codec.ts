import type { GameState, GoalId, NeedId, NpcId, PlaceId } from "./types";

const places = new Set<PlaceId>(["street","home","cafe","market","office","bakery","gym","cinema","bookshop","laundry"]);
const needs: NeedId[] = ["energy","hunger","hygiene","social","fun"];
const npcs: NpcId[] = ["mara","ellis","theo","jun","idris"];
const goals: GoalId[] = ["shower","meal","earn","groceries","talk","sleep","cushion","friend","rhythm","goodHour"];
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x==="object" && !Array.isArray(x);
const finite = (x: unknown, low = -1e9, high = 1e9): x is number =>
  typeof x==="number" && Number.isFinite(x) && x>=low && x<=high;
const integer = (x: unknown, low=0, high=1e9) => finite(x,low,high) && Number.isInteger(x);
const strings = (x: unknown, cap=100, size=512): x is string[] =>
  Array.isArray(x) && x.length<=cap && x.every(v=>typeof v==="string" && v.length<=size);

/**
 * Version 1 has required core keys. Only the documented expansion fields may
 * be defaulted for older player saves. Invalid primary data never overwrites
 * the original source while a backup recovery is attempted.
 */
export function parseGameSave(input: unknown): GameState | null {
  if (!record(input) || input.version!==1) return null;
  if(typeof input.name!=="string" || !input.name.trim() || input.name.length>32) return null;
  if (!integer(input.day,1,1000000) || !finite(input.minute,0,1439.999999)) return null;
  if (!finite(input.money,-1e9,1e9) || !integer(input.food,0,1e6)) return null;
  const needValues=input.needs;
  if (!record(needValues) || needs.some(k=>!finite(needValues[k],0,100))) return null;
  const relationValues=input.rel;
  if (!record(relationValues) || npcs.some(k=>!finite(relationValues[k],-100,100))) return null;
  const goalValues=input.goals;
  if (!record(goalValues) || goals.some(k=>typeof goalValues[k]!=="boolean")) return null;
  if (!strings(input.log,32,800) || !places.has(input.place as PlaceId)) return null;
  if (!finite(input.x,-38,190) || !finite(input.z,-154,1230) || !finite(input.yaw,-10000,10000)) return null;
  if (input.place==="street") {
    if (input.z>20.12 && !(input.x>=2.15 && input.x<=6.55 && input.z<=31.5)) return null;
  } else {
    const indoorPlaces:PlaceId[]=["home","cafe","market","office","bakery","gym","cinema","bookshop","laundry"];
    const index=indoorPlaces.indexOf(input.place as PlaceId);
    // All current dedicated interior levels use centered +/- 7m X and
    // an isolated 100m-spaced Z range. Reject void/out-of-scene coordinates.
    if(index<0 || input.x< -7 || input.x>7
      || input.z<420+index*100-1 || input.z>430+index*100) return null;
  }
  if (!integer(input.rentMark,0,1e8) || !integer(input.shiftDay,0,1e8)) return null;
  if (!finite(input.freelanceAt,-1e9,1e9) || !finite(input.collapseAt,-1e9,1e9)) return null;
  if(typeof input.welcomed!=="boolean") return null;
  for(const key of ["cityPassportDay","cityCourierNextAt"]){
    if(input[key]!==undefined && !finite(input[key],-1e9,1e9)) return null;
  }
  for(const key of ["cityPassportClaimed"]){
    if(input[key]!==undefined && typeof input[key]!=="boolean") return null;
  }
  for(const key of ["cityPassportVisits","discoveredDistricts"]){
    if(input[key]!==undefined && !strings(input[key],200,80)) return null;
  }
  return {
    ...(input as GameState),
    needs:{...needValues} as GameState["needs"],
    rel:{...relationValues} as GameState["rel"],
    goals:{...goalValues} as GameState["goals"],
    log:[...input.log] as string[],
    cityPassportDay:(input.cityPassportDay as number | undefined)??0,
    cityPassportVisits:(input.cityPassportVisits as string[] | undefined)??[],
    cityPassportClaimed:(input.cityPassportClaimed as boolean | undefined)??false,
    cityCourierNextAt:(input.cityCourierNextAt as number | undefined)??0,
    discoveredDistricts:(input.discoveredDistricts as string[] | undefined)??[],
  };
}

export const SAVE_KEY="daybreak-row-save-v1";
export const BACKUP_KEY="daybreak-row-save-v1-backup";
export const RECOVERY_KEY="daybreak-row-save-v1-recovery";

export type LoadResult={state:GameState|null; issue:string|null; rawAvailable:boolean};
export function loadSaveStatus(storage: Pick<Storage,"getItem">): LoadResult {
  try {
    const raw=storage.getItem(SAVE_KEY);
    const data=raw===null?null:safeParse(raw);
    if(data)return {state:data,issue:null,rawAvailable:true};
    const backupRaw=storage.getItem(BACKUP_KEY);
    const backup=backupRaw===null?null:safeParse(backupRaw);
    if(backup)return {state:backup,issue:"Recovered the last valid backup. Export your save before continuing.",rawAvailable:true};
    if(raw!==null || backupRaw!==null)return {state:null,issue:"The saved game is damaged. Export a copy before starting again.",rawAvailable:true};
    return {state:null,issue:null,rawAvailable:false};
  }catch{
    return {state:null,issue:"Browser storage could not be read. Your existing data was not erased.",rawAvailable:true};
  }
}
function safeParse(raw:string):GameState|null {
  try{return parseGameSave(JSON.parse(raw));}catch{return null;}
}
export function persistGameSave(storage:Pick<Storage,"getItem"|"setItem">, state:GameState):boolean {
  const valid=parseGameSave(state);
  if(!valid)return false;
  try{
    const current=storage.getItem(SAVE_KEY);
    // Never copy corrupt JSON into the last-known-good slot.
    if(current){
      if(safeParse(current))storage.setItem(BACKUP_KEY,current);
      else storage.setItem(RECOVERY_KEY,current); // retain original damaged JSON
    }
    storage.setItem(SAVE_KEY,JSON.stringify(valid));
    return true;
  }catch{return false;}
}
