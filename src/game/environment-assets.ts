import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** CC0 Poly Haven photogrammetry assets + CC0 Innerscene vehicles, all served locally. */
export type EnvironmentSurface =
  | "asphalt_03" | "aerial_asphalt_01" | "concrete_floor_02" | "red_brick_03" | "wood_planks" | "grass_path_2";

export type EnvironmentProp =
  | "painted_wooden_bench" | "sofa_02" | "Sofa_01" | "WoodenTable_01"
  | "metal_trash_can" | "street_lamp_01" | "painted_wooden_nightstand"
  | "bus-shelter" | "information-board" | "recycling-station" | "wayfinding-totem";
export type VehicleType = "realistic-sedan" | "red-sedan";

// QA overrides isolate any heavy asset category without changing player/save data.
const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
const disableAll = params.has("environment-off");
const skipTextures = disableAll || params.has("textures-off");
const skipProps = disableAll || params.has("props-off");
const skipCars = disableAll || params.has("cars-off");
// Lower texture sampler pressure on touchscreens. Diffuse map retains visual realism.
const lightPBR = typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || params.has("mobile-qa"));

const textureLoader = new THREE.TextureLoader();
const modelLoader = new GLTFLoader();
const textureCache = new Map<string, Promise<THREE.Texture>>();
const modelCache = new Map<string, Promise<THREE.Group>>();

function getTexture(id: EnvironmentSurface, channel: "color" | "normal" | "roughness", u: number, v: number) {
  const key = [id,channel,u,v].join("/");
  let waiting = textureCache.get(key);
  if(!waiting){
    waiting = textureLoader.loadAsync(`/environment/textures/${id}_${channel}.jpg`).then(tex=>{
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(u,v);
      tex.anisotropy = 2;
      tex.colorSpace = channel === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.needsUpdate = true;
      return tex;
    }).catch(err=>{textureCache.delete(key);throw err;});
    textureCache.set(key,waiting);
  }
  return waiting;
}

/** Loads PBR maps in place; original procedural surface is the network-failure fallback. */
export function applyRealisticSurface(
  mat: THREE.MeshStandardMaterial,
  surface: EnvironmentSurface,
  repeatX = 2,
  repeatY = 2,
  options?: { tint?: number; normals?: boolean },
) {
  if(skipTextures) return () => {};
  let disposed = false;
  const job = lightPBR
    ? Promise.all([getTexture(surface,"color",repeatX,repeatY)])
    : Promise.all([getTexture(surface,"color",repeatX,repeatY),getTexture(surface,"normal",repeatX,repeatY),getTexture(surface,"roughness",repeatX,repeatY)]);
  void job.then(([color,normal,roughness])=>{
    if(disposed) return;
    mat.map = color;
    if(normal && options?.normals !== false) {
      mat.normalMap = normal;
      mat.normalScale.set(0.48,0.48);
    }
    if (roughness) mat.roughnessMap = roughness;
    mat.roughness = 0.92;
    mat.color.setHex(options?.tint ?? 0xffffff);
    mat.needsUpdate=true;
  }).catch(err=>console.warn("PBR material fallback",surface,err));
  return () => { disposed=true; };
}

/**
 * Merge static car parts sharing one material into one mesh; keeps detailed wheels,
 * glass and body, but cuts drawcalls from ~72/304 to under 15 per vehicle.
 * The model transform is baked into vertices once and then reused by all cars.
 */
function batchStaticCar(root: THREE.Group): THREE.Group {
  root.updateMatrixWorld(true);
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  let meshes=0;
  let unsupported=false;
  root.traverse(obj=>{
    if(!(obj as THREE.Mesh).isMesh)return;
    const mesh=obj as THREE.Mesh;
    if(Array.isArray(mesh.material) || (mesh as THREE.SkinnedMesh).isSkinnedMesh){unsupported=true;return;}
    const geom=mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    const normals=geom.getAttribute("normal");
    if(!normals)geom.computeVertexNormals();
    const uv=geom.getAttribute("uv");
    if(!uv)geom.setAttribute("uv",new THREE.Float32BufferAttribute(new Float32Array(geom.getAttribute("position").count*2),2));
    for(const name of Object.keys(geom.attributes)){
      if(!["position","normal","uv"].includes(name))geom.deleteAttribute(name);
    }
    geom.applyMatrix4(mesh.matrixWorld);
    const material=mesh.material as THREE.Material;
    const out=groups.get(material)||[];
    out.push(geom);
    groups.set(material,out);
    meshes++;
  });
  if(unsupported||meshes<8)return root;
  const batched=new THREE.Group();
  for(const [material,geos] of groups){
    const combined=mergeGeometries(geos,false);
    if(!combined){return root;}
    const mesh=new THREE.Mesh(combined,material);
    // Cull individual CC0 props/cars when outside the camera view. All geometry
    // is pretransformed into this mesh, so its static bounds are valid.
    mesh.frustumCulled=true;
    batched.add(mesh);
    geos.forEach(geo=>geo.dispose());
  }
  if(batched.children.length===0)return root;
  return batched;
}

const glbProps = new Set<EnvironmentProp>(["bus-shelter","information-board","recycling-station","wayfinding-totem"]);
function modelUrl(kind: EnvironmentProp | VehicleType) {
  return kind === "realistic-sedan" || kind === "red-sedan" || glbProps.has(kind as EnvironmentProp)
    ? `/environment/models/${kind}.glb`
    : `/environment/models/${kind}/${kind}.gltf`;
}
async function template(kind: EnvironmentProp | VehicleType) {
  let task = modelCache.get(kind);
  if(!task){
    task = modelLoader.loadAsync(modelUrl(kind)).then(g=>kind === "realistic-sedan" || kind === "red-sedan" || glbProps.has(kind as EnvironmentProp) ? batchStaticCar(g.scene) : g.scene).catch(err=>{
      modelCache.delete(kind);
      throw err;
    });
    modelCache.set(kind,task);
  }
  return task;
}
type ModelPlacement = {
  height?: number;
  length?: number;
  yaw?: number;
  /** Default aligns the natural model floor to 0 and centres the footprint. */
  x?: number; z?: number;
  shadows?: boolean;
};
function normalizeModel(source: THREE.Group, cfg: ModelPlacement) {
  const model = source.clone(true);
  const box = new THREE.Box3().setFromObject(model);
  const dim = box.getSize(new THREE.Vector3());
  const length = Math.max(dim.x,dim.z);
  if (!Number.isFinite(length) || length < 0.00001 || dim.y < 0.00001) {
    throw Error("Invalid CC0 asset bounds");
  }
  const target = cfg.length ? cfg.length / length : (cfg.height ?? 1) / dim.y;
  model.scale.setScalar(target);
  const pos = new THREE.Vector3();
  box.getCenter(pos);
  model.position.set(-pos.x*target, -box.min.y*target, -pos.z*target);
  const orientation = new THREE.Group();
  orientation.rotation.y=cfg.yaw??0;
  orientation.add(model);
  model.traverse(node=>{
    if((node as THREE.Mesh).isMesh) {
      const mesh=node as THREE.Mesh;
      mesh.castShadow=cfg.shadows??false;
      mesh.receiveShadow=false;
    }
  });
  return orientation;
}

/** Adds one visible high-detail prop without altering the original collision mesh. */
export function placeRealisticProp(scene: THREE.Scene, kind: EnvironmentProp, x: number, z: number, cfg: ModelPlacement = {}) {
  if(skipProps) return () => {};
  let alive=true;
  const anchor = new THREE.Group();
  anchor.position.set(x,0,z);
  scene.add(anchor);
  // Defer detailed GLTF parsing until after the first playable frame.
  const handle = window.setTimeout(()=>{
    void template(kind).then(sceneRoot=>{
    if(!alive) return;
    anchor.add(normalizeModel(sceneRoot,cfg));
    }).catch(err=>console.warn("Prop fallback",kind,err));
  },550);
  return ()=>{alive=false;window.clearTimeout(handle);scene.remove(anchor);};
}

/** Keeps original placeholder visible until the CC0 realistic vehicle is loaded. */
export function replaceVisualVehicle(original: THREE.Group, kind: VehicleType, length=4.2, yaw=0) {
  if(skipCars) return {ready:()=>false,dispose:()=>{}};
  let alive=true;
  const old=original.children.slice();
  // Preserve visual quality while avoiding a 132K-triangle show car on touch devices.
  const selectedKind = lightPBR && kind === "red-sedan" ? "realistic-sedan" : kind;
  let updated=false;
  const handle=window.setTimeout(()=>{
    void template(selectedKind).then(source=>{
    if(!alive)return;
    const realism=normalizeModel(source,{length,yaw,shadows:false});
    original.add(realism);
    old.forEach(child=>child.visible=false);
    updated=true;
    }).catch(err=>console.warn("Car fallback",kind,err));
  },950);
  return { ready:()=>updated, dispose:()=>{alive=false;window.clearTimeout(handle);old.forEach(child=>child.visible=true);} };
}

/** Cheap clones of a single sedan shared by the ten moving traffic cars. */
export async function createRealisticTraffic(scene:THREE.Scene, count=10) {
  if(skipCars) throw Error("Realistic traffic disabled for QA");
  const source=await template("realistic-sedan");
  const cars: THREE.Group[]=[];
  for(let i=0;i<count;i++){
    const pivot=new THREE.Group();
    pivot.add(normalizeModel(source,{length:4.15,shadows:false}));
    pivot.visible=false;
    scene.add(pivot);
    cars.push(pivot);
  }
  return {cars,dispose:()=>cars.forEach(c=>scene.remove(c))};
}