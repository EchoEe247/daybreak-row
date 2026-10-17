import test from "node:test";
import assert from "node:assert/strict";
import {CITY_LIMITS,CITY_STOPS,CITY_SITES,DISTRICTS,AVENUES,CROSS_STREETS,districtAt,isInsideCity,transitFare} from "./city-layout.ts";

test("five distinct city districts and stops stay on the walkable mainland", () => {
  assert.equal(DISTRICTS.length,5);
  assert.equal(CITY_STOPS.length,5);
  assert.equal(new Set(CITY_STOPS.map(s=>s.id)).size,5);
  assert.ok(CITY_STOPS.every(s=>isInsideCity(s.x,s.z)));
  assert.ok(DISTRICTS.every((d,i)=>d.id===CITY_STOPS[i].id));
});
test("street grid has multiple intersections and wraps original neighborhood", () => {
  assert.ok(AVENUES.length>=4 && CROSS_STREETS.length>=4);
  assert.ok(AVENUES.every(x=>x>CITY_LIMITS.minX && x<CITY_LIMITS.maxX));
  assert.ok(CROSS_STREETS.every(z=>z>CITY_LIMITS.minZ && z<CITY_LIMITS.maxZ));
  assert.ok(isInsideCity(-10,4.2));
  assert.ok(isInsideCity(175,-125));
  assert.equal(isInsideCity(250,-125),false);
});
test("site interactions occupy in-bounds outdoor coordinates with unique IDs", () => {
  assert.equal(CITY_SITES.length,14);
  assert.equal(new Set(CITY_SITES.map(s=>s.id)).size,CITY_SITES.length);
  assert.ok(CITY_SITES.every(s=>isInsideCity(s.x,s.z)));
});
test("area detection differentiates original harbor, civic quarter, and new downtown", () => {
  assert.equal(districtAt(-10,4.2),"Daybreak Row");
  assert.equal(districtAt(65,-22),"Old Town");
  assert.equal(districtAt(100,-75),"Civic Quarter");
  assert.equal(districtAt(140,-84),"Downtown");
  assert.equal(districtAt(178,-115),"Arts & Station");
});
test("fixed fare never charges travel to the same stop", () => {
  assert.equal(transitFare("harbor","harbor"),0);
  assert.equal(transitFare("harbor","downtown"),5);
});