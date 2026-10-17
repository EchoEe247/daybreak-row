import test from "node:test";
import assert from "node:assert/strict";
import { discoverAt, discoveredIds, DISTRICT_BONUS, EXPLORER_BONUS } from "./discovery.ts";


/** @returns {import("./types.ts").GameState} */
function simulation(){
 return {
  version:1,name:"Alex",day:1,minute:7*60+12,money:186,food:1,
  needs:{energy:76,hunger:64,hygiene:58,social:46,fun:57},
  rel:{mara:6,ellis:4,theo:3,jun:10,idris:0},
  goals:{shower:false,meal:false,earn:false,groceries:false,talk:false,sleep:false,cushion:false,friend:false,rhythm:false,goodHour:false},
  log:[],place:"street",x:-10,z:4.2,yaw:0.62,
  rentMark:0,shiftDay:0,freelanceAt:0,collapseAt:-9999,welcomed:false
 };
}
test("each of five neighborhoods rewards only its first visit",()=>{
 const state=simulation();
 const places=[[-10,4],[65,-22],[100,-75],[140,-84],[178,-115]];
 for(const [i,[x,z]] of places.entries()){
  const message=discoverAt(state,x,z);
  assert.ok(message);
  assert.equal(discoveredIds(state).length,i+1);
  assert.equal(discoverAt(state,x,z),null);
 }
 assert.equal(state.money,186+5*DISTRICT_BONUS+EXPLORER_BONUS);
 assert.equal(discoveredIds(state).length,5);
});
test("old saves, duplicate IDs, invalid coordinates and unknown districts are safe",()=>{
 const s=simulation();
 assert.deepEqual(discoveredIds(s),[]);
 assert.equal(discoverAt(s,NaN,NaN),null);
 s.discoveredDistricts=["harbor","harbor","fake"];
 assert.deepEqual(discoveredIds(s),["harbor"]);
 assert.equal(discoverAt(s,-10,4),null);
 assert.equal(s.money,186);
});
test("exploration survives JSON roundtrip and payout cannot repeat",()=>{
 const s=simulation();
 discoverAt(s,140,-84);
 const loaded=JSON.parse(JSON.stringify(s));
 assert.equal(discoverAt(loaded,140,-84),null);
 assert.equal(loaded.money,204);
 assert.equal(discoveredIds(loaded).length,1);
});