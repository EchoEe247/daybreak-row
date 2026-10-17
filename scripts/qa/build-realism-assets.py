#!/usr/bin/env python3
"""Build small local GLBs from publisher-verified Poly Haven 1K glTF sources.
Source originals remain in ignored work/ for reproducibility, NOT the shipped build.
"""
from __future__ import annotations
import copy,hashlib,io,json,struct,sys,urllib.request,os
from pathlib import Path
from PIL import Image

ROOT=Path(os.getenv("DAYBREAK_ASSET_CACHE","work/local-qa/daybreak/asset-scout/polyhaven"))
DEST=Path(os.getenv("DAYBREAK_ASSET_OUTPUT","work/rebuilt-realism"))
UA={"User-Agent":"DaybreakRowAssetProduction/1.0 (https://github.com/EchoEe247/daybreak-row)","Accept":"application/json"}
# id -> source, source mesh node (or * for all), texture longest side
SPECS={
 "urban-window":("modular_urban_apartments_facade","wall_window_centered_large_01",768),
 "urban-door":("modular_urban_apartments_facade","wall_door_centered_small_01",768),
 "urban-wall":("modular_urban_apartments_facade","wall_standard_standard_01",768),
 "urban-cornice":("modular_urban_apartments_facade","cornice_standard_standard_01",512),
 "factory-window":("modular_factory_facade","wall_window_centered_medium_01",768),
 "factory-door":("modular_factory_facade","wall_door_garage_door_01",768),
 "factory-wall":("modular_factory_facade","wall_standard_standard_01",768),
 "factory-cornice":("modular_factory_facade","cornice01_standard_standard_01",512),
 "real-shutter":("rollershutter_window_01","rollershutter_window_01",768),
 "real-shelf":("Shelf_01","*",512),
 "real-steel-shelves":("steel_frame_shelves_01","*",512),
 "real-wood-shelves":("wooden_display_shelves_01","*",512),
 "real-croissant":("croissant","*",512),
 "real-register":("CashRegister_01","*",512),
 "real-chalkboard":("standing_chalkboard_01","*",512),
 "real-trashbag":("trashbag","*",512),
 "real-aircon":("exterior_aircon_unit","exterior_aircon_unit",512),
 "real-coffee-cart":("CoffeeCart_01","*",512),
 "real-chainlink":("modular_chainlink_fence","modular_chainlink_fence_double",512),
}
def get(url):
 req=urllib.request.Request(url,headers=UA)
 return urllib.request.urlopen(req,timeout=22).read()
def load_metadata(slug):
 p=ROOT/slug/"api.json"
 if p.exists():return json.loads(p.read_text())
 obj=json.loads(get("https://api.polyhaven.com/files/"+slug))
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(obj))
 return obj
def cached_download(slug,key,details):
 p=ROOT/slug/"deps"/key
 if not p.exists():
  p.parent.mkdir(parents=True,exist_ok=True)
  b=get(details["url"])
  if "md5" in details and hashlib.md5(b).hexdigest()!=details["md5"]:raise ValueError(f"MD5 mismatch {slug} {key}")
  p.write_bytes(b)
 else:
  b=p.read_bytes()
  if "md5" in details and hashlib.md5(b).hexdigest()!=details["md5"]:raise ValueError(f"cached MD5 mismatch {slug} {key}")
 return b

def build(name,slug,selector,maxtex):
 meta=load_metadata(slug)["gltf"]["1k"]["gltf"]
 j=json.loads(cached_download(slug,f"{slug}_1k.gltf",meta))
 inc=meta["include"]
 buffers=[x for x in inc if x.lower().endswith(".bin")]
 if len(buffers)!=1:raise ValueError((name,buffers))
 origbin=cached_download(slug,buffers[0],inc[buffers[0]])
 nodes=[n for n in j["nodes"] if "mesh" in n and (selector=="*" or n.get("name")==selector)]
 if not nodes:raise ValueError("Missing named source node: "+name+" "+selector)
 # all original nodes are mesh leaves. Leave source positions out for selected facade/shutter modules.
 out={"asset":{"version":"2.0","generator":"Daybreak Row/Poly Haven selective 1K GLB repacker"},
      "scene":0,"scenes":[{"nodes":list(range(len(nodes)))}],"nodes":[],
      "meshes":[],"materials":[],"textures":[],"images":[],"samplers":copy.deepcopy(j.get("samplers",[])),
      "accessors":[],"bufferViews":[],"buffers":[]}
 raw=bytearray()
 def append(data,extras=None):
  while len(raw)%4:raw.append(0)
  index=len(out["bufferViews"])
  v={"buffer":0,"byteOffset":len(raw),"byteLength":len(data)}
  if extras:v.update(extras)
  out["bufferViews"].append(v)
  raw.extend(data)
  return index
 viewcache={};acccache={};matcache={};texcache={};imagecache={};meshcache={}
 def view(idx):
  if idx in viewcache:return viewcache[idx]
  old=j["bufferViews"][idx]
  b=origbin[old.get("byteOffset",0):old.get("byteOffset",0)+old["byteLength"]]
  if len(b)!=old["byteLength"]:raise ValueError("Truncated source view")
  new=append(b,{k:old[k] for k in ["byteStride","target"] if k in old})
  viewcache[idx]=new
  return new
 def accessor(idx):
  if idx in acccache:return acccache[idx]
  a=copy.deepcopy(j["accessors"][idx])
  if "sparse" in a:raise ValueError("Sparse accessor not handled "+name)
  if "bufferView" in a:a["bufferView"]=view(a["bufferView"])
  new=len(out["accessors"]);out["accessors"].append(a);acccache[idx]=new
  return new
 def img(idx):
  if idx in imagecache:return imagecache[idx]
  item=j["images"][idx]
  path=item.get("uri")
  if not path or path not in inc:raise ValueError("Missing Poly Haven source texture "+str(path))
  b=cached_download(slug,path,inc[path])
  pic=Image.open(io.BytesIO(b)).convert("RGB")
  pic.thumbnail((maxtex,maxtex),Image.Resampling.LANCZOS)
  f=io.BytesIO();pic.save(f,format="JPEG",quality=83,optimize=True)
  idxnew=len(out["images"])
  out["images"].append({"name":path.rsplit("/",1)[-1],"bufferView":append(f.getvalue()),"mimeType":"image/jpeg"})
  imagecache[idx]=idxnew
  return idxnew
 def tex(idx):
  if idx in texcache:return texcache[idx]
  old=copy.deepcopy(j["textures"][idx])
  old["source"]=img(old["source"])
  n=len(out["textures"]);out["textures"].append(old);texcache[idx]=n
  return n
 def material(idx):
  if idx in matcache:return matcache[idx]
  m=copy.deepcopy(j["materials"][idx])
  # Rely on actual Poly Haven PBR materials; all 1K maps are reencoded to 512-768 JPEG.
  pbr=m.get("pbrMetallicRoughness",{})
  for key in ["baseColorTexture","metallicRoughnessTexture"]:
   if key in pbr:pbr[key]["index"]=tex(pbr[key]["index"])
  for key in ["normalTexture","occlusionTexture","emissiveTexture"]:
   if key in m:m[key]["index"]=tex(m[key]["index"])
  if "extensions" in m:raise ValueError("Unexpected extended material "+name)
  new=len(out["materials"]);out["materials"].append(m);matcache[idx]=new
  return new
 tris=0
 def mesh(idx):
  nonlocal tris
  if idx in meshcache:return meshcache[idx]
  m=copy.deepcopy(j["meshes"][idx])
  for p in m["primitives"]:
   if "extensions" in p:raise ValueError("Unexpected extension primitive")
   for attr,v in list(p["attributes"].items()):p["attributes"][attr]=accessor(v)
   if "indices" in p:p["indices"]=accessor(p["indices"])
   if "material" in p:p["material"]=material(p["material"])
   if "targets" in p:
    for t in p["targets"]:
     for k,v in list(t.items()):t[k]=accessor(v)
   ai=p.get("indices",p["attributes"]["POSITION"])
   tris+=out["accessors"][ai]["count"]//3 if p.get("mode",4)==4 else 0
  new=len(out["meshes"]);out["meshes"].append(m);meshcache[idx]=new
  return new
 for n in nodes:
  nd={"name":n.get("name",""),"mesh":mesh(n["mesh"])}
  if selector=="*":
   for key in ("rotation","scale","translation","matrix"):
    if key in n:nd[key]=copy.deepcopy(n[key])
  # extracted single facade/shutter part is recentered; preserve only local geometry.
  out["nodes"].append(nd)
 out["buffers"]=[{"byteLength":len(raw)}]
 payload=json.dumps(out,separators=(",",":"),ensure_ascii=False).encode()
 while len(payload)%4:payload+=b" "
 while len(raw)%4:raw.append(0)
 blob=struct.pack("<4sII",b"glTF",2,12+8+len(payload)+8+len(raw))+struct.pack("<I4s",len(payload),b"JSON")+payload+struct.pack("<I4s",len(raw),b"BIN\x00")+raw
 DEST.mkdir(parents=True,exist_ok=True)
 path=DEST/(name+".glb");path.write_bytes(blob)
 return {"id":name,"source_id":slug,"selected_node":selector,"source_page":"https://polyhaven.com/a/"+slug,"license":"CC0-1.0",
   "api_url":"https://api.polyhaven.com/files/"+slug,"sha256":hashlib.sha256(blob).hexdigest(),
   "bytes":len(blob),"triangles":tris,"mesh_count":len(out["meshes"]),"primitives":sum(len(m["primitives"]) for m in out["meshes"]),
   "materials":len(out["materials"]),"texture_count":len(out["images"]),"texture_max_dimension":maxtex}
if __name__=="__main__":
 ids=sys.argv[1:] or list(SPECS)
 for name in ids:
  if name not in SPECS:raise ValueError("Unknown id: "+name)
  try:
   result=build(name,*SPECS[name])
   (ROOT/(name+".result.json")).write_text(json.dumps(result,indent=2))
   print(json.dumps(result),flush=True)
  except Exception as e:
   print(json.dumps({"id":name,"error":str(e)}),flush=True)
   raise