import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {join,basename} from "node:path";
import {createHash} from "node:crypto";
const root=process.cwd();
const provenance=JSON.parse(readFileSync(join(root,"assets/trees-provenance.json"),"utf8"));
/** @param {string} name */
function glb(name){
 const data=readFileSync(join(root,"public/environment/models",name+".glb"));
 assert.equal(data.subarray(0,4).toString("ascii"),"glTF");
 const length=data.readUInt32LE(12);
 return JSON.parse(data.subarray(20,20+length).toString("utf8"));
}
/** @param {{meshes: Array<{primitives: Array<{indices:number}>}>; accessors: Array<{count:number}>}} j */
function triangles(j){
 return j.meshes.reduce((total,mesh)=>total+mesh.primitives.reduce((n,p)=>{
   const acc=j.accessors[p.indices];return n+Math.floor(acc.count/3);
 },0),0);
}
test("all seven new street assets have preserved CC0 provenance and checksums",()=>{
 assert.equal(provenance.assets.length,7);
 for(const a of provenance.assets){
  assert.equal(a.license,"CC0-1.0");
  assert.match(a.source_url,/^https:\/\//);
  const name=basename(a.destination);
  const file=join(root,"public/environment/models",name);
  assert.ok(existsSync(file),name);
  const data=readFileSync(file);
  assert.equal(data.length,a.bytes);
  assert.equal(createHash("sha256").update(data).digest("hex"),a.sha256);
  assert.ok(glb(name.slice(0,-4)).meshes.length>=1);
 }
});
test("offline-batched trees preserve source triangles and materials with 3 instead of 172 draw meshes",()=>{
 for(const id of ["oak-light","maple-light","linden-light"]){
  const original=glb(id),optimized=glb(id+"-batched");
  assert.equal(original.meshes.length,172);
  assert.equal(optimized.meshes.length,3);
  assert.equal(triangles(original),triangles(optimized));
  assert.equal(optimized.materials.length,original.materials.length);
 }
});