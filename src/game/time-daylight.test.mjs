import test from "node:test";
import assert from "node:assert/strict";
import { PERMANENT_DAYLIGHT, sampleSky, clockLabel, hourOf, absMinute } from "./time.ts";

test("the fixed visual environment is bright daytime without stars or street lamps", () => {
  const sky=PERMANENT_DAYLIGHT;
  assert.equal(sky.stars,0);
  assert.equal(sky.lamp,0);
  assert.ok(sky.elev>0.9);
  assert.ok(sky.exposure>=1);
  assert.ok(sky.sun.y>0.5);
});
test("underlying simulation still supports day and nighttime hours and multiple days",()=>{
  assert.equal(clockLabel(30),"12:30 AM");
  assert.equal(clockLabel(750),"12:30 PM");
  assert.equal(clockLabel(23*60),"11:00 PM");
  assert.equal(hourOf(0),0);
  assert.equal(hourOf(750),12.5);
  assert.equal(absMinute(2,600)-absMinute(1,600),1440);
  assert.ok(sampleSky(0).stars>0);
  assert.ok(sampleSky(1320).lamp>0);
});
test("daylight sample is stable and immutable across time changes",()=>{
  assert.ok(Object.isFrozen(PERMANENT_DAYLIGHT));
  assert.ok(Object.isFrozen(PERMANENT_DAYLIGHT.sun));
  for (let hour=0; hour<24; hour++){
    assert.equal(PERMANENT_DAYLIGHT.stars,0);
    assert.equal(PERMANENT_DAYLIGHT.lamp,0);
    assert.ok(PERMANENT_DAYLIGHT.exposure>1);
  }
});
