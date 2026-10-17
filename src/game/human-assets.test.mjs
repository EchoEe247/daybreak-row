// @ts-nocheck — direct JSON inspection of dynamic GLB chunks
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "public/humans");
const characters = ["male-adult-01","male-adult-02","male-adult-03","male-adult-09","male-adult-11","female-adult-01","female-adult-05","business-female-01","business-male-01"];
const clips = ["m_idle_neutral_01","m_walk_neutral_01","m_run_neutral_01","f_idle_neutral_01","f_walk_neutral_01","f_run_neutral_01"];
function metadata(name) {
  const bytes = readFileSync(join(root, name + ".glb"));
  assert.equal(bytes.toString("ascii",0,4),"glTF");
  const len=bytes.readUInt32LE(12);
  const data=JSON.parse(bytes.subarray(20,20+len).toString("utf8"));
  assert.match(data.asset?.extras?.licenseText ?? "", /Copyright \(c\) 2020 Microsoft/);
  assert.equal(data.asset?.extras?.license, "MIT");
  return data;
}
test("all nine human models are real licensed skinned GLBs", () => {
  for(const file of characters) {
    const d=metadata(file);
    assert.ok(d.skins?.length >= 1,file);
    assert.ok(d.nodes?.some(n=>n.name==="Bip01"),file);
    assert.ok(statSync(join(root,file+".glb")).size>300000,file);
    assert.ok(d.extensionsRequired?.includes("EXT_meshopt_compression"),file);
  }
});
test("male and female idle, walking and running clips all target the human Biped", () => {
  for(const file of clips) {
    const d=metadata(file);
    assert.ok(d.animations?.[0]?.channels?.length>=20,file);
    const targets=d.animations[0].channels.map(c=>d.nodes[c.target.node]?.name);
    assert.ok(targets.includes("Bip01"),file);
  }
});
test("shipped MIT copyright notice is preserved", () => {
  assert.match(readFileSync(join(root,"LICENSE-Microsoft-MIT.txt"),"utf8"),/Permission is hereby granted/);
});