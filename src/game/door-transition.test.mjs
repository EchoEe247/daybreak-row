import test from "node:test";
import assert from "node:assert/strict";
import { rooms, apt, cafeB, officeB, marketB } from "./layout.ts";
import { parseDoorAction, doorTransitionLabel, reconcileIndoorArrival } from "./door-transition.ts";

/** @type {readonly ["home","cafe","market","office"]} */
const all=["home","cafe","market","office"];
const exteriors={home:apt,cafe:cafeB,market:marketB,office:officeB};
test("each building has recognized entry/exit, understandable labels and non-retriggering indoor spawn",()=>{
 for(const id of all){
  assert.deepEqual(parseDoorAction("enter-"+id),{direction:"enter",building:id});
  assert.deepEqual(parseDoorAction("exit-"+id),{direction:"exit",building:id});
  assert.match(doorTransitionLabel("enter-"+id) ?? "",/^Entering /);
  assert.match(doorTransitionLabel("exit-"+id) ?? "",/^Leaving /);
  const room=rooms[id];
  const gap=Math.hypot(room.spawn.x-room.door.x,room.spawn.z-room.door.z);
  assert.ok(gap>1.55,`${id}: arrival too near exit: ${gap}`);
  assert.ok(room.spawn.x>room.x0+0.34 && room.spawn.x<room.x1-0.34);
  assert.ok(room.spawn.z>room.z0+0.34 && room.spawn.z<room.z1-0.34);
  assert.equal(room.exit.x, exteriors[id].door);
  const exteriorDoorZ = exteriors[id].zFront + (id === "market" ? -1.3 : 1.25);
  assert.ok(Math.abs(room.exit.z - exteriorDoorZ) >= 1.45, `${id}: leaving can re-trigger entrance`);
  assert.ok(Math.abs(room.exit.z-exteriors[id].zFront)>=2.5);
 }
});
test("unknown interactions never get door transition",()=>{
 for(const x of ["city-library","bench","enter-gallery","exit-pier","enter-","enter-HOME"]) assert.equal(parseDoorAction(x),null);
});
test("old saves next to a room exit are moved off the activation range without discarding other state",()=>{
 for(const id of all){
  const original={place:id,x:rooms[id].door.x,z:rooms[id].door.z,money:186,day:3,inventory:"one"};
  const fixed=reconcileIndoorArrival(original);
  assert.deepEqual({x:fixed.x,z:fixed.z}, {x:rooms[id].spawn.x,z:rooms[id].spawn.z});
  assert.equal(fixed.money,186);assert.equal(fixed.day,3);assert.equal(fixed.inventory,"one");
 }
});
test("existing safe position and outdoor progress are preserved",()=>{
 const city={place:"street",x:145,z:-78,money:12};
 assert.equal(reconcileIndoorArrival(city),city);
 const inside={place:"office",x:2,z:724,money:83};
 assert.equal(reconcileIndoorArrival(inside),inside);
});