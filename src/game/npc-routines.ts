import { hourOf } from "./time.ts";
import type { NpcId } from "./types.ts";

export type PublicRoutine = { x: number; z: number; yaw: number; speed: number; location: string };

type Waypoint = readonly [number,number];
function patrol(minute: number, start: number, periodMinutes: number, stops: readonly Waypoint[], location: string): PublicRoutine {
  const cursor = (((minute - start * 60) % periodMinutes) + periodMinutes) % periodMinutes;
  const q = cursor / periodMinutes * stops.length;
  const i = Math.floor(q);
  const t = q-i;
  const [x,z]=stops[i];
  const [nx,nz]=stops[(i+1)%stops.length];
  const dx=nx-x,dz=nz-z;
  return {x:x+dx*t,z:z+dz*t,yaw:Math.atan2(-dx,-dz),speed:1.1,location};
}

/** Fixed-hour outdoor routines for familiar residents; no randomized teleporting each tick. */
export function npcPublicRoutine(id: NpcId, minute: number): PublicRoutine | null {
  const h=hourOf(minute);
  switch(id) {
    case "mara":
      if(h>=7 && h<8.25) return patrol(minute,7,75,[[-5.5,-6.45],[-7.3,-6.45],[-9.2,-6.45]],"Harbor Cafe");
      if(h>=19 && h<21) return patrol(minute,19,45,[[-6.1,-5.6],[-1.2,-5.6],[1.9,-5.5]],"Harbor waterfront");
      return null;
    case "ellis":
      if(h>=7 && h<8) return patrol(minute,7,45,[[-21,6.15],[-23.0,6.15],[-23,9.8]],"Cho's Market");
      if(h>=20 && h<21.5) return patrol(minute,20,50,[[-20.8,6.2],[-17.5,6.2],[-16.0,7.2]],"Market corner");
      return null;
    case "theo":
      if(h>=18 && h<20.5) return patrol(minute,18,54,[[141,-45],[145,-45],[150,-45],[146,-49]],"Downtown after work");
      return null;
    case "jun":
      if(h>=7 && h<9.5) return patrol(minute,7,56,[[-16.4,-6.45],[-12.8,-6.45],[-11.6,-6.45]],"Apartment block");
      if(h>=9.5 && h<13) return patrol(minute,9.5,58,[[49,-6],[54,-6],[61,-6],[58,-9]],"Old Town Plaza");
      if(h>=16.5 && h<20.5) return patrol(minute,16.5,60,[[7.2,13.4],[8.0,10.9],[8.4,8.4]],"Harbor park");
      return null;
    case "idris":
      if((h>=8 && h<12)||(h>=14.5 && h<19)) {
        const start=h<12?8:14.5;
        return patrol(minute,start,42,[[4.3,27.2],[4.3,23.9],[4.3,20.9],[4.5,25.4]],"Harbor pier");
      }
      return null;
  }
}

export function npcScheduleDescription(id:NpcId,minute:number): string {
  const current=npcPublicRoutine(id,minute);
  if(current)return "Out walking · "+current.location;
  switch(id){
    case "mara": return "Working or resting near Harbor Cafe";
    case "ellis": return "At Cho's Market or off duty";
    case "theo": return "At Northline Office or off duty";
    case "jun": return "At home or traveling between neighborhoods";
    case "idris": return "Away from the pier for now";
  }
}
