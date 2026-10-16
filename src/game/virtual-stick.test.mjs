import test from "node:test";
import assert from "node:assert/strict";
import { stickFromDelta, VirtualStick } from "./virtual-stick.ts";

test("screen touch maps left/right and forward/back correctly", () => {
  const right = stickFromDelta(48, 0, 48);
  const left = stickFromDelta(-48, 0, 48);
  const up = stickFromDelta(0, -48, 48);
  const down = stickFromDelta(0, 48, 48);
  assert.deepEqual([right.x, right.y], [1, 0]);
  assert.deepEqual([left.x, left.y], [-1, 0]);
  assert.deepEqual([up.x, up.y], [0, 1]);
  assert.deepEqual([down.x, down.y], [0, -1]);
});

test("deadzone prevents drift and thumb snaps to center", () => {
  const v = stickFromDelta(1, 2, 50);
  assert.equal(v.x, 0);
  assert.equal(v.y, 0);
  assert.deepEqual(stickFromDelta(0, 0, 50), { x:0, y:0, thumbX:0, thumbY:0 });
});

test("diagonal input clamps to unit circle, thumb stays in radius", () => {
  const v = stickFromDelta(200, -200, 48);
  assert.ok(Math.abs(Math.hypot(v.x, v.y) - 1) < 1e-8);
  assert.ok(Math.abs(Math.hypot(v.thumbX, v.thumbY) - 48) < 1e-8);
});

test("partial drag produces analog motion", () => {
  const v = stickFromDelta(0, -30, 50);
  assert.ok(v.y > 0 && v.y < 1);
  assert.equal(v.x, 0);
});

test("pointer ownership survives simultaneous touch and ignores stray releases", () => {
  const stick = new VirtualStick();
  const initial = stick.begin(11, 80, 200, 48, 80, 180);
  assert.ok(initial && initial.y > 0);
  assert.equal(stick.begin(22, 80, 200, 48, 80, 240), null);
  assert.equal(stick.move(22, 80, 0), null);
  assert.equal(stick.end(22), null);
  assert.equal(stick.pointerId, 11);
  assert.ok(stick.move(11, 80, 148)?.y === 1);
  assert.deepEqual(stick.end(11), { x:0, y:0, thumbX:0, thumbY:0 });
  assert.equal(stick.pointerId, null);
});

test("touch can begin again immediately after cancel, blur or unmount reset", () => {
  const stick = new VirtualStick();
  stick.begin(1, 10, 10, 48, 58, 10);
  assert.deepEqual(stick.reset(), { x:0, y:0, thumbX:0, thumbY:0 });
  assert.ok(stick.begin(2, 10, 10, 48, 10, -38)?.y === 1);
});

test("invalid data never turns game input into NaN", () => {
  assert.deepEqual(stickFromDelta(NaN, 0, 50), { x:0, y:0, thumbX:0, thumbY:0 });
  assert.deepEqual(stickFromDelta(4, 5, 0), { x:0, y:0, thumbX:0, thumbY:0 });
});