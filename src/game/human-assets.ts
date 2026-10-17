import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone as cloneSkinnedRig } from "three/addons/utils/SkeletonUtils.js";
import type { NpcId } from "./types";

export type HumanKind = "player" | NpcId | "pedestrian-a" | "pedestrian-b" | "pedestrian-c";
export type HumanMotion = "idle" | "walk" | "run";
type Gender = "m" | "f";
type ModelDef = { file: string; gender: Gender; targetHeight: number };

export const HUMAN_MODELS: Record<HumanKind, ModelDef> = {
  player: { file: "male-adult-01", gender: "m", targetHeight: 1.8 },
  mara: { file: "female-adult-01", gender: "f", targetHeight: 1.72 },
  ellis: { file: "male-adult-02", gender: "m", targetHeight: 1.77 },
  theo: { file: "business-male-01", gender: "m", targetHeight: 1.79 },
  jun: { file: "business-female-01", gender: "f", targetHeight: 1.72 },
  idris: { file: "male-adult-09", gender: "m", targetHeight: 1.77 },
  "pedestrian-a": { file: "male-adult-03", gender: "m", targetHeight: 1.78 },
  "pedestrian-b": { file: "female-adult-05", gender: "f", targetHeight: 1.72 },
  "pedestrian-c": { file: "male-adult-11", gender: "m", targetHeight: 1.79 },
};

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cachedClips = new Map<string, Promise<THREE.AnimationClip>>();
const cachedModels = new Map<string, Promise<THREE.Group>>();

function humanUrl(file: string) {
  return "/humans/" + file + ".glb";
}
function motionFile(gender: Gender, motion: HumanMotion) {
  return gender + "_" + motion + "_neutral_01";
}
function clip(gender: Gender, motion: HumanMotion): Promise<THREE.AnimationClip> {
  const file = motionFile(gender, motion);
  let pending = cachedClips.get(file);
  if (!pending) {
    pending = loader.loadAsync(humanUrl(file)).then(gltf => {
      const first = gltf.animations[0];
      if (!first || first.tracks.length === 0) throw new Error(file + " has no animation");
      const result = first.clone();
      result.name = motion;
      return result;
    }).catch(err => { cachedClips.delete(file); throw err; });
    cachedClips.set(file, pending);
  }
  return pending;
}

function model(file: string): Promise<THREE.Group> {
  let pending = cachedModels.get(file);
  if (!pending) {
    pending = loader.loadAsync(humanUrl(file)).then(gltf => {
      const rig = gltf.scene;
      if (!rig.getObjectByProperty("isSkinnedMesh", true)) {
        let skinned = false;
        rig.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true; });
        if (!skinned) throw new Error(file + " missing humanoid skin");
      }
      return rig;
    }).catch(err => { cachedModels.delete(file); throw err; });
    cachedModels.set(file, pending);
  }
  return pending;
}

export type LoadedHuman = {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<HumanMotion, THREE.AnimationAction>;
  height: number;
};

export async function loadRiggedHuman(kind: HumanKind): Promise<LoadedHuman> {
  const def = HUMAN_MODELS[kind];
  const [rig, idle, walk, run] = await Promise.all([
    model(def.file),
    clip(def.gender, "idle"),
    clip(def.gender, "walk"),
    clip(def.gender, "run"),
  ]);
  // The canonical rig includes its own skeletal bindings. All six actors use distinct files.
  // Compute bind-pose bounds from the original model BEFORE cloning; cloned
  // skinned geometry can report transient uninitialized bounds.
  const bounds = new THREE.Box3().setFromObject(rig);
  const root = cloneSkinnedRig(rig) as THREE.Group;
  const boxHeight = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(boxHeight) || boxHeight < 0.01) throw new Error(def.file + " invalid geometry bounds");
  const scale = def.targetHeight / boxHeight;
  const outer = new THREE.Group();
  root.scale.setScalar(scale);
  root.position.y = -bounds.min.y * scale;
  outer.add(root);
  root.traverse(object => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) {
      const mesh = object as THREE.SkinnedMesh;
      mesh.castShadow = kind === "player";
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
    }
  });
  const mixer = new THREE.AnimationMixer(root);
  const actions: Record<HumanMotion, THREE.AnimationAction> = {
    idle: mixer.clipAction(idle),
    walk: mixer.clipAction(walk),
    run: mixer.clipAction(run),
  };
  for (const action of Object.values(actions)) {
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
  }
  actions.idle.play();
  return { root: outer, mixer, actions, height: def.targetHeight };
}