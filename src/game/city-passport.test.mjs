import test from "node:test";
import assert from "node:assert/strict";
import { CITY_ROUTE_REWARD, cityRoute, passportSnapshot, stampPassport, claimPassport } from "./city-passport.ts";
import { CITY_SITES, isInsideCity } from "./city-layout.ts";

/** @param {number} [day] @returns {import("./types.ts").GameState} */
function simulation(day = 1) {
  return {
    version: 1, name: "Alex", day, minute: 9*60, money: 120, food: 1,
    needs: {energy:80,hunger:70,hygiene:80,social:45,fun:40},
    rel: {mara:0,ellis:0,theo:0,jun:0,idris:0},
    goals: {shower:false,meal:false,earn:false,groceries:false,talk:false,sleep:false,cushion:false,friend:false,rhythm:false,goodHour:false},
    log: ["Arrived in the city."], place:"street",x:70,z:-8,yaw:0,
    rentMark:0,shiftDay:0,freelanceAt:0,collapseAt:-9999,welcomed:false,
  };
}
test("daily routes contain three separate real city locations and change next day", () => {
  const ids = CITY_SITES.map(site=>site.id);
  assert.equal(CITY_SITES.length,14);
  for(let d=1;d<=30;d++){
    const route=cityRoute(d);
    assert.equal(route.length,3);
    assert.equal(new Set(route.map(r=>r.id)).size,3);
    assert.ok(route.every(r=>ids.includes(r.id)&&isInsideCity(r.x,r.z)));
  }
  assert.notDeepEqual(cityRoute(1).map(r=>r.id),cityRoute(2).map(r=>r.id));
});
test("legacy v1 saves receive a fresh route without any migration or data loss",()=>{
  const state=simulation();
  assert.equal(passportSnapshot(state).completed.length,0);
  const route=cityRoute(state.day);
  const first=stampPassport(state,route[0].id);
  assert.match(first ?? "",/1\/3/);
  assert.equal(state.version,1);
  assert.equal(state.money,120);
  assert.equal(state.log.length,1);
  assert.equal(passportSnapshot(state).completed.length,1);
  assert.equal(stampPassport(state,route[0].id),null);
  assert.equal(stampPassport(state,"unknown"),null);
});
test("claim requires three unique successful visits, pays only once and logs result",()=>{
  const state=simulation();
  assert.equal(claimPassport(state),null);
  const tasks=cityRoute(state.day);
  for(const [i,task] of tasks.entries()){
    const stamp=stampPassport(state,task.id);
    assert.ok(stamp);
    if(i===2)assert.match(stamp,/complete/);
  }
  assert.equal(passportSnapshot(state).ready,true);
  assert.equal(claimPassport(state),"City route reward collected · +$65");
  assert.equal(state.money,120+CITY_ROUTE_REWARD);
  assert.equal(state.needs.fun,52);
  assert.equal(state.needs.social,51);
  assert.equal(passportSnapshot(state).claimed,true);
  assert.equal(claimPassport(state),null);
  assert.equal(state.money,120+CITY_ROUTE_REWARD);
  assert.ok(state.log[0].includes("City Hall"));
});
test("tomorrow automatically starts an independent route with a new prize",()=>{
  const state=simulation();
  for(const task of cityRoute(1))stampPassport(state,task.id);
  claimPassport(state);
  state.day=2;
  assert.equal(passportSnapshot(state).claimed,false);
  assert.equal(passportSnapshot(state).completed.length,0);
  assert.equal(claimPassport(state),null);
  assert.match(stampPassport(state,cityRoute(2)[0].id) ?? "",/1\/3/);
  assert.equal(state.cityPassportDay,2);
  assert.equal(state.cityPassportClaimed,false);
});
test("passport serializes and restores without duplicating stamps",()=>{
  const state=simulation();
  const id=cityRoute(1)[0].id;
  stampPassport(state,id);
  const copied=JSON.parse(JSON.stringify(state));
  assert.equal(passportSnapshot(copied).completed.length,1);
  assert.equal(stampPassport(copied,id),null);
  assert.equal(copied.money,120);
});