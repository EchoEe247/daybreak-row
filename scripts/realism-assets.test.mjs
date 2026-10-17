import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const manifest=JSON.parse(readFileSync(new URL("../assets/realism-provenance.json",import.meta.url),"utf8"));
const base=new URL("../",import.meta.url);
const known=new Set(manifest.assets.map(a=>a.id));
test("23 new CC0 geometry files are self-contained GLBs with verified hashes",()=>{
 assert.equal(manifest.assets.length,23);
 assert.equal(known.size,manifest.assets.length);
 let total=0;
 for(const asset of manifest.assets){
  const data=readFileSync(new URL(asset.shipped_file,base));
  assert.equal(data.toString("utf8",0,4),"glTF",asset.id);
  assert.equal(data.readUInt32LE(4),2,asset.id);
  assert.equal(data.readUInt32LE(8),data.length,asset.id);
  const sha=createHash("sha256").update(data).digest("hex");
  assert.equal(sha,asset.sha256,asset.id);
  assert.equal(asset.license,"CC0-1.0",asset.id);
  assert.ok(asset.source_page.startsWith("https://"),asset.id);
  const jsonlen=data.readUInt32LE(12);
  assert.equal(data.toString("utf8",16,20),"JSON");
  const json=JSON.parse(data.toString("utf8",20,20+jsonlen));
  assert.ok(json.meshes?.length>0 && json.accessors?.length>0,asset.id);
  assert.equal(json.scene,0,asset.id);
  const triangleCount=json.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>{
    assert.ok(json.accessors[p.attributes.POSITION],asset.id);
    return sum+(json.accessors[p.indices??p.attributes.POSITION].count/3);
  },0);
  assert.ok(triangleCount>0,asset.id);
  for(const bv of json.bufferViews??[])assert.ok(bv.byteLength>0,asset.id);
  total+=data.length;
 }
 assert.ok(total<11*1024*1024,"mobile asset pack exceeds 11MiB: "+total);
});
test("facade kits are small extracted pieces rather than full model collections",()=>{
 for(const id of ["urban-window","urban-door","urban-wall","factory-window","factory-door","factory-wall"]){
  const a=manifest.assets.find(x=>x.id===id);
  assert.ok(a?.optimized,id);
  assert.ok(a.bytes<650000,id);
  assert.ok(a.mesh_count<=2,id);
 }
});
test("ninth interior has matching door actions and retains city passport key",()=>{
 const load=f=>readFileSync(new URL("../src/game/"+f,import.meta.url),"utf8");
 const actions=load("logic.ts");
 const transitions=load("door-transition.ts");
 const types=load("types.ts");
 assert.match(actions,/id: "enter-laundry"/);
 assert.match(actions,/id: "exit-laundry"/);
 assert.match(actions,/id: "laundry-wash"/);
 assert.match(actions,/stampPassport\(state,"laundry"\)/);
 assert.match(actions,/"bookshop","laundry"\]\.includes\(site.id\)/);
 assert.match(transitions,/enter\|exit.*laundry/);
 assert.match(types,/\| "laundry"/);
});
