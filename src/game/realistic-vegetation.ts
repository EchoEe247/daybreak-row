import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** CC0 Innerscene oak, maple, and linden used in place of geometric blob trees. */
export type StreetTree = { x: number; z: number; height: number; species: 0 | 1 | 2 };
const species = ["oak-light", "maple-light", "linden-light"] as const;
const loader = new GLTFLoader();
type Packed = { parts: Array<{ geometry: THREE.BufferGeometry; material: THREE.Material }>; bounds: THREE.Box3 };
const cache = new Map<string, Promise<Packed>>();

function packedTree(name: string): Promise<Packed> {
  let existing = cache.get(name);
  if (existing) return existing;
  // Prebaked to only three materials/meshes offline, avoiding expensive GLTF
  // traversal and geometry merges on a mobile main thread.
  existing = loader.loadAsync("/environment/models/" + name + "-batched.glb").then(({scene}) => {
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene);
    const parts: Packed["parts"] = [];
    scene.traverse(node => {
      if (!(node as THREE.Mesh).isMesh) return;
      const mesh = node as THREE.Mesh;
      if (Array.isArray(mesh.material)) throw Error("Tree mesh must have one material");
      parts.push({ geometry: mesh.geometry, material: mesh.material });
    });
    if (bounds.isEmpty() || parts.length !== 3) throw Error("Invalid prebaked street tree: " + name);
    return { parts, bounds };
  }).catch(error => { cache.delete(name); throw error; });
  cache.set(name, existing);
  return existing;
}

export function installStreetTrees(scene: THREE.Scene, allPlacements: StreetTree[], onReady: () => void) {
  let disposed = false;
  const meshes: THREE.InstancedMesh[] = [];
  // The world determines planted positions and associated solid-trunk colliders.
  // Never silently skip a tree here: it would leave an invisible collision obstacle.
  const placements = allPlacements;
  let outdoor = true;
  const timer = window.setTimeout(() => {
    void Promise.all(species.map(packedTree)).then((models) => {
      if (disposed) return;
      const dummy = new THREE.Object3D();
      for (let kind = 0; kind < 3; kind++) {
        const instances = placements.filter((p) => p.species === kind);
        const model = models[kind];
        const size = model.bounds.getSize(new THREE.Vector3());
        const mid = model.bounds.getCenter(new THREE.Vector3());
        if (!instances.length || size.y <= 0) continue;
        for (const part of model.parts) {
          const mesh = new THREE.InstancedMesh(part.geometry, part.material, instances.length);
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          mesh.frustumCulled = false; // the instance grid spans several streets
          instances.forEach((p, i) => {
            const scale = p.height / size.y;
            const turn = ((i * 47 + kind * 59) % 100) * Math.PI / 50;
            // Model's own geometry contains the original transforms.
            dummy.position.set(p.x - mid.x * scale, -model.bounds.min.y * scale, p.z - mid.z * scale);
            dummy.rotation.set(0, turn, 0);
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
          mesh.visible = outdoor;
          scene.add(mesh);
          meshes.push(mesh);
        }
      }
      if (meshes.length) onReady();
    }).catch(error => console.warn("Street trees fallback to procedural canopy:", error));
  }, 1250);
  return {
    setVisible(value: boolean) { outdoor = value; for (const mesh of meshes) mesh.visible = value; },
    ready() { return meshes.length > 0; },
    dispose() {
      disposed = true;
      window.clearTimeout(timer);
      for (const mesh of meshes) {
        scene.remove(mesh);
        mesh.dispose();
      }
      // Cached source geometries live as long as the loader cache, across scene restarts.
    },
  };
}