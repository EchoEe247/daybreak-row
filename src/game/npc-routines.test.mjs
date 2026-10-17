import test from "node:test";
import assert from "node:assert/strict";
import { npcPublicRoutine, npcScheduleDescription } from "./npc-routines.ts";
import { rooms } from "./layout.ts";
import { doorTransitionLabel, parseDoorAction } from "./door-transition.ts";

test("named neighbors have predictable public-life schedules",()=>{
 /** @param {import("./types.ts").NpcId} id @param {number} h */
 const at=(id,h)=>npcPublicRoutine(id,Math.round(h*60));
 assert.equal(at("mara",12),null);
 assert.equal(at("ellis",12),null);
 assert.equal(at("theo",11),null);
 assert.ok(at("mara",19.5)?.location.includes("Harbor"));
 assert.ok(at("ellis",20.5)?.location.includes("Market"));
 assert.ok(at("theo",19)?.location.includes("Downtown"));
 assert.ok(at("jun",10)?.location.includes("Old Town"));
 assert.ok(at("jun",17)?.location.includes("Harbor"));
 assert.ok(at("idris",9.5)?.location.includes("pier"));
 assert.equal(at("idris",13),null);
});
test("public routes move smoothly, stay in the city and describe correct times",()=>{
 /** @type {import("./types.ts").NpcId[]} */
 const ids=["mara","ellis","theo","jun","idris"];
 for(const id of ids){
  for(let minute=0;minute<1440;minute+=5){
   const p=npcPublicRoutine(id,minute);
   if(!p)continue;
   assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.yaw));
   assert.ok(p.x>=-38&&p.x<=190&&p.z>=-154&&p.z<=31.5,`${id} out of city`);
   assert.ok(p.speed>0);
   assert.match(npcScheduleDescription(id,minute),/Out walking/);
  }
 }
});
test("new venue door targets remain safe and registered",()=>{
 /** @type {Array<"cinema"|"bookshop">} */
 const venues=["cinema","bookshop"];
 for(const venue of venues){
  const room=rooms[venue];
  assert.ok(room.door.z-room.spawn.z>2.3);
  assert.ok(Math.hypot(room.exit.x-(venue==="cinema"?148:108),room.exit.z-(venue==="cinema"?-47:-102))>2.7);
  assert.deepEqual(parseDoorAction("enter-"+venue),{direction:"enter",building:venue});
  assert.match(doorTransitionLabel("exit-"+venue)??"",/^Leaving/);
  assert.ok(room.z0>=1020);
 }
});