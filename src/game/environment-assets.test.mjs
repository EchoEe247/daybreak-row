import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root,"public/environment/manifest.json"),"utf8"));
const vehicles = JSON.parse(readFileSync(join(root,"assets/environment-car-provenance.json"),"utf8"));
test("all Poly Haven 1K files retain CC0 provenance and pass recorded SHA-256 hashes",()=>{
  assert.equal(manifest.license,"CC0-1.0");
  assert.ok(manifest.assets.length>=12,"At least 7 models and 5 materials");
  assert.ok(manifest.files.length>=53,"Full model dependencies and material maps");
  for(const rec of manifest.files){
    const absolute=resolve(root,rec.path);
    assert.ok(absolute.startsWith(resolve(root,"public/environment")),"Asset confined to public tree: "+rec.path);
    assert.ok(existsSync(absolute),rec.path);
    const data=readFileSync(absolute);
    assert.equal(data.byteLength,rec.bytes,rec.path);
    assert.equal(createHash("sha256").update(data).digest("hex"),rec.sha256,rec.path);
  }
  for(const asset of manifest.assets){
    assert.equal(asset.license,"CC0-1.0");
    assert.match(asset.page,/^https:\/\/polyhaven\.com\/a\//);
  }
});
test("every photographed furniture GLTF references locally shipped binaries and textures",()=>{
  for(const item of manifest.assets){
    if(item.kind!=="model")continue;
    const full=resolve(root,item.gltf);
    const gltf=JSON.parse(readFileSync(full,"utf8"));
    for(const section of ["buffers","images"]){
      for(const dependency of gltf[section]||[]){
        if(!dependency.uri||dependency.uri.startsWith("data:"))continue;
        assert.ok(!dependency.uri.includes(".."),item.id+": unsafe relative URI");
        assert.ok(existsSync(resolve(dirname(full),decodeURIComponent(dependency.uri))),item.id+":"+dependency.uri);
      }
    }
    assert.ok(gltf.meshes?.length,item.id+" mesh missing");
  }
});
test("both vehicle GLBs have recorded free license and verifiable geometry",()=>{
  assert.equal(vehicles.assets.length,2);
  for(const item of vehicles.assets){
    assert.equal(item.license,"CC0-1.0");
    const filename=item.destination.split("/").at(-1);
    const buffer=readFileSync(join(root,"public/environment/models",filename));
    assert.equal(buffer.toString("ascii",0,4),"glTF");
    const jsonLength=buffer.readUInt32LE(12);
    const gltf=JSON.parse(buffer.subarray(20,20+jsonLength).toString("utf8"));
    assert.ok(gltf.meshes?.length > 0,filename);
    assert.equal(buffer.length,item.bytes);
    assert.equal(createHash("sha256").update(buffer).digest("hex"),item.sha256);
  }
});