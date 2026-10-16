import * as THREE from "three";
import { buildCity } from "@/game/city-world";
import { apt, cafeB, marketB, officeB, pier, rooms } from "@/game/layout";
import type { PlaceId } from "@/game/types";
import type { SkySample } from "@/game/time";

export type Collider = { minX: number; maxX: number; minZ: number; maxZ: number };

type Bucket = {
  mesh: THREE.InstancedMesh;
  add: (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, rotY?: number) => void;
  addCenter: (x: number, y: number, z: number, sx: number, sy: number, sz: number, rotY?: number) => void;
  finish: () => void;
};

function bucket(geo: THREE.BufferGeometry, material: THREE.Material, max: number, shadows = true): Bucket {
  const mesh = new THREE.InstancedMesh(geo, material, max);
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let n = 0;
  const addCenter = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rotY = 0) => {
    if (n >= max) return;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.set(Math.max(0.001, sx), Math.max(0.001, sy), Math.max(0.001, sz));
    dummy.updateMatrix();
    mesh.setMatrixAt(n++, dummy.matrix);
  };
  return {
    mesh,
    addCenter,
    add: (x0, y0, z0, x1, y1, z1, rotY = 0) => {
      addCenter((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, rotY);
    },
    finish: () => {
      mesh.count = Math.max(1, n);
      mesh.instanceMatrix.needsUpdate = true;
      if (n === 0) mesh.visible = false;
    },
  };
}

function canvasTex(size: number, paint: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no 2d");
  paint(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function standard(color: number, roughness = 0.86, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export type World = {
  colliders: Record<PlaceId, Collider[]>;
  update: (dt: number, sky: SkySample, focus: THREE.Vector3, place: PlaceId, elapsed: number) => void;
  dispose: () => void;
};

export function buildWorld(scene: THREE.Scene): World {
  const colliders: Record<PlaceId, Collider[]> = {
    street: [],
    home: [],
    cafe: [],
    market: [],
    office: [],
  };
  const disposables: { dispose: () => void }[] = [];

  const grassTex = canvasTex(256, (ctx, s) => {
    ctx.fillStyle = "#5d7a4e";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = i % 3 ? "#6e8f5c" : "#4e6a42";
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 3);
    }
  });
  grassTex.repeat.set(18, 16);
  const roadTex = canvasTex(256, (ctx, s) => {
    ctx.fillStyle = "#3a3e44";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#32363c" : "#454b52";
      ctx.fillRect(Math.random() * s, Math.random() * s, 3, 2);
    }
  });
  roadTex.repeat.set(12, 2);
  const walkTex = canvasTex(256, (ctx, s) => {
    ctx.fillStyle = "#c9c1b4";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#b3aa9c";
    for (let y = 0; y < s; y += 64) {
      for (let x = 0; x < s; x += 64) {
        ctx.strokeRect(x + 2, y + 2, 60, 60);
        ctx.fillStyle = "#d4cdc0";
        ctx.fillRect(x + 6, y + 6, 52, 52);
      }
    }
  });
  walkTex.repeat.set(10, 2);
  const woodTex = canvasTex(256, (ctx, s) => {
    ctx.fillStyle = "#8b6244";
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 18) {
      ctx.fillStyle = y % 36 ? "#7a553a" : "#9a704e";
      ctx.fillRect(0, y, s, 16);
      ctx.fillStyle = "rgba(60,30,10,0.15)";
      ctx.fillRect(0, y + 14, s, 2);
    }
  });
  const plasterTex = canvasTex(128, (ctx, s) => {
    ctx.fillStyle = "#efe6d8";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = "rgba(80,60,40,0.05)";
      ctx.fillRect(Math.random() * s, Math.random() * s, 4, 2);
    }
  });
  disposables.push(grassTex, roadTex, walkTex, woodTex, plasterTex);

  const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, color: 0xffffff, roughness: 1 });
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, color: 0xffffff, roughness: 0.95 });
  const walkMat = new THREE.MeshStandardMaterial({ map: walkTex, color: 0xffffff, roughness: 0.92 });
  const floorMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xffffff, roughness: 0.8 });
  const plasterMat = new THREE.MeshStandardMaterial({ map: plasterTex, color: 0xffffff, roughness: 0.9 });
  woodTex.repeat.set(3, 3);
  plasterTex.repeat.set(2, 2);

  const brick = standard(0x8a463c, 0.9);
  const stucco = standard(0xe6d5c0, 0.92);
  const stuccoCool = standard(0xd5d8de, 0.78, 0.05);
  const wood = standard(0x7a5438, 0.84);
  const roof = standard(0x4a403c, 0.7, 0.08);
  const concrete = standard(0xb7b1a6, 0.95);
  const metal = standard(0x2a3038, 0.45, 0.4);
  const leaf = standard(0x3f6a3c, 0.95);
  const leaf2 = standard(0x4e7d48, 0.95);
  const trunk = standard(0x5a4030, 0.9);
  const fabricCafe = standard(0xc4623a, 0.8);
  const fabricMarket = standard(0x2f5c52, 0.8);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xb7d4e4,
    roughness: 0.12,
    metalness: 0.18,
    emissive: 0xffb36a,
    emissiveIntensity: 0,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x17697a,
    roughness: 0.18,
    metalness: 0.42,
    transparent: true,
    opacity: 0.94,
  });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xf3d2b0 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffe2b8,
    emissive: 0xffb15a,
    emissiveIntensity: 0,
    roughness: 0.35,
  });

  const mats = [
    grassMat, roadMat, walkMat, floorMat, plasterMat, brick, stucco, stuccoCool, wood, roof,
    concrete, metal, leaf, leaf2, trunk, fabricCafe, fabricMarket, glassMat, waterMat, glowMat, lampMat,
  ];
  disposables.push(...mats);

  const unit = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 7);
  const sphere = new THREE.SphereGeometry(1, 8, 6);
  disposables.push(unit, cyl, sphere);

  const boxes = bucket(unit, brick, 80);
  const stuccos = bucket(unit, stucco, 40);
  const cools = bucket(unit, stuccoCool, 20);
  const woods = bucket(unit, wood, 80);
  const roofs = bucket(unit, roof, 20);
  const concretes = bucket(unit, concrete, 40);
  const metals = bucket(unit, metal, 40);
  const leaves = bucket(sphere, leaf, 40, true);
  const leaves2 = bucket(sphere, leaf2, 20, true);
  const trunks = bucket(cyl, trunk, 30);
  const awnings = bucket(unit, fabricCafe, 6, false);
  const awnings2 = bucket(unit, fabricMarket, 4, false);
  const glasses = bucket(unit, glassMat, 220, false);
  const glows = bucket(unit, glowMat, 12, false);

  function wallBucket(kind: "brick" | "stucco" | "cool") {
    if (kind === "brick") return boxes;
    if (kind === "cool") return cools;
    return stuccos;
  }

  function addWindows(x0: number, x1: number, z: number, floors: number, face: 1 | -1, yBase = 1.45) {
    const span = x1 - x0;
    const count = Math.max(2, Math.floor(span / 2.3));
    for (let f = 0; f < floors; f++) {
      for (let i = 0; i < count; i++) {
        const x = x0 + ((i + 0.5) * span) / count;
        const y = yBase + f * 3.05;
        glasses.add(x - 0.32, y - 0.42, z - 0.04 * face, x + 0.32, y + 0.42, z + 0.05 * face);
      }
    }
  }

  function northBuilding(
    x0: number,
    x1: number,
    zFront: number,
    depth: number,
    floors: number,
    kind: "brick" | "stucco" | "cool",
    door: number,
  ) {
    const zBack = zFront - depth;
    const h = floors * 3.05;
    const b = wallBucket(kind);
    b.add(x0, 0, zBack, x1, h, zFront);
    roofs.add(x0 - 0.25, h, zBack - 0.25, x1 + 0.25, h + 0.42, zFront + 0.35);
    colliders.street.push({ minX: x0, maxX: x1, minZ: zBack, maxZ: zFront });
    addWindows(x0 + 0.4, x1 - 0.4, zFront + 0.02, floors, 1);
    woods.add(door - 0.5, 0.02, zFront - 0.02, door + 0.5, 2.2, zFront + 0.08);
    concretes.add(door - 1.05, 0.0, zFront, door + 1.05, 0.08, zFront + 0.85);
    metals.add(x0 + 0.4, h + 0.42, zBack + 1, x0 + 0.9, h + 1.3, zBack + 1.5);
  }

  function southBuilding(x0: number, x1: number, zFront: number, depth: number, floors: number, door: number) {
    const zBack = zFront + depth;
    const h = floors * 3.05;
    stuccos.add(x0, 0, zFront, x1, h, zBack);
    roofs.add(x0 - 0.2, h, zFront - 0.2, x1 + 0.2, h + 0.38, zBack + 0.2);
    colliders.street.push({ minX: x0, maxX: x1, minZ: zFront, maxZ: zBack });
    addWindows(x0 + 0.5, x1 - 0.5, zFront - 0.02, floors, -1);
    woods.add(door - 0.55, 0.02, zFront - 0.08, door + 0.55, 2.2, zFront + 0.02);
    concretes.add(door - 1.1, 0, zFront - 0.9, door + 1.1, 0.08, zFront);
  }

  northBuilding(apt.x0, apt.x1, apt.zFront, apt.depth, apt.floors, "brick", apt.door);
  northBuilding(cafeB.x0, cafeB.x1, cafeB.zFront, cafeB.depth, cafeB.floors, "stucco", cafeB.door);
  northBuilding(officeB.x0, officeB.x1, officeB.zFront, officeB.depth, officeB.floors, "cool", officeB.door);
  northBuilding(19, 36, -8, 11, 2, "brick", 27);
  southBuilding(marketB.x0, marketB.x1, marketB.zFront, marketB.depth, marketB.floors, marketB.door);
  woods.add(20, 0, 9, 33, 3.4, 17.5);
  roofs.add(19.6, 3.4, 8.7, 33.4, 4.3, 17.8);
  colliders.street.push({ minX: 20, maxX: 33, minZ: 9, maxZ: 17.5 });

  awnings.add(cafeB.door - 2.4, 2.35, cafeB.zFront, cafeB.door + 2.4, 2.55, cafeB.zFront + 1.6);
  awnings2.add(marketB.door - 2.6, 2.25, marketB.zFront - 1.55, marketB.door + 2.6, 2.42, marketB.zFront);

  function sign(text: string, x: number, y: number, z: number, rotY = 0) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d");
    if (!g) return;
    g.fillStyle = "#1c1612";
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = "#f3ecdf";
    g.font = "600 64px Fraunces, Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 68);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    disposables.push(tex);
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
    disposables.push(m);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), m);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    scene.add(mesh);
  }
  sign("HARBOR CAFE", cafeB.door, 3.15, cafeB.zFront + 0.2);
  sign("CHO'S MARKET", marketB.door, 3.05, marketB.zFront - 0.2, Math.PI);
  sign("NORTHLINE", officeB.door, 3.3, officeB.zFront + 0.16);

  const lampLights: THREE.PointLight[] = [];
  const lampPositions = [-28, -16, -6, 6, 18, 30];
  for (const x of lampPositions) {
    for (const z of [-5.6, 5.7]) {
      metals.addCenter(x, 1.7, z, 0.07, 3.4, 0.07);
      glasses.addCenter(x, 3.5, z, 0.28, 0.16, 0.28);
      const light = new THREE.PointLight(0xffb15a, 0, 11, 2);
      light.position.set(x, 3.35, z);
      scene.add(light);
      lampLights.push(light);
    }
  }

  function tree(x: number, z: number, s = 1, alt = false) {
    trunks.addCenter(x, 1.1 * s, z, 0.16 * s, 2.2 * s, 0.16 * s);
    const bucketLeaves = alt ? leaves2 : leaves;
    bucketLeaves.addCenter(x, 2.5 * s, z, 0.95 * s, 0.8 * s, 0.95 * s);
    bucketLeaves.addCenter(x + 0.1, 3.15 * s, z, 0.72 * s, 0.62 * s, 0.72 * s);
    colliders.street.push({ minX: x - 0.28, maxX: x + 0.28, minZ: z - 0.28, maxZ: z + 0.28 });
  }
  tree(-8.5, 11.5, 1.15);
  tree(12.5, 11.2, 1.3, true);
  tree(15.2, 16.4, 1.05);
  tree(-2.2, 16.2, 1.2, true);
  tree(9.4, 17.5, 0.9);
  tree(-34, -5.4, 0.85);
  tree(16.5, -5.5, 0.8, true);
  tree(38, 2, 1.4);

  const grassBlades = bucket(new THREE.PlaneGeometry(1, 1), leaf, 180, false);
  for (let i = 0; i < 70; i++) {
    const x = -4 + Math.random() * 20;
    const z = 9 + Math.random() * 9;
    const rot = Math.random() * Math.PI;
    grassBlades.addCenter(x, 0.22, z, 0.28, 0.45, 0.28, rot);
  }

  concretes.add(4.2, 0.35, 13.2, 6.6, 0.85, 15.4);
  const fountainWater = new THREE.Mesh(new THREE.CircleGeometry(0.85, 16), waterMat);
  fountainWater.rotation.x = -Math.PI / 2;
  fountainWater.position.set(5.4, 0.88, 14.3);
  scene.add(fountainWater);
  colliders.street.push({ minX: 4.2, maxX: 6.6, minZ: 13.2, maxZ: 15.4 });

  woods.add(0.5, 0.42, 12.3, 2.4, 0.55, 12.7);
  metals.add(0.7, 0.2, 12.15, 0.82, 0.45, 12.28);
  metals.add(2.05, 0.2, 12.15, 2.18, 0.45, 12.28);
  woods.add(10.6, 0.42, 15.5, 12.6, 0.55, 15.95);

  colliders.street.push({ minX: -40, maxX: 2.05, minZ: 20.35, maxZ: 21.15 });
  colliders.street.push({ minX: 6.7, maxX: 42, minZ: 20.35, maxZ: 21.15 });
  concretes.add(-36, 0.15, 20.35, 2.05, 0.55, 21.05);
  concretes.add(6.7, 0.15, 20.35, 38, 0.55, 21.05);

  const parkedA = makeCar(0xc4553a);
  parkedA.position.set(-8.5, 0, 1.55);
  parkedA.rotation.y = Math.PI / 2;
  scene.add(parkedA);
  colliders.street.push({ minX: -10.7, maxX: -6.3, minZ: 0.7, maxZ: 2.5 });
  const parkedB = makeCar(0x2c3f55);
  parkedB.position.set(14.2, 0, -1.45);
  parkedB.rotation.y = -Math.PI / 2;
  scene.add(parkedB);
  colliders.street.push({ minX: 12, maxX: 16.4, minZ: -2.35, maxZ: -0.55 });

  const driver = makeCar(0xe6d3a8);
  driver.rotation.y = Math.PI / 2;
  scene.add(driver);
  const headL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), lampMat);
  const headR = headL.clone();
  headL.position.set(0.55, 0.55, 1.95);
  headR.position.set(-0.55, 0.55, 1.95);
  driver.add(headL, headR);

  const waterGeo = new THREE.PlaneGeometry(96, 42, 36, 16);
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(6, -0.15, 42);
  water.receiveShadow = true;
  scene.add(water);
  const baseZ = waterGeo.attributes.position.array.slice();

  woods.add(pier.x0, 0.02, pier.z0, pier.x1, 0.16, pier.z1);
  for (let z = pier.z0 + 0.4; z < pier.z1; z += 2.4) {
    woods.add(pier.x0 + 0.15, -0.8, z, pier.x0 + 0.4, 0.16, z + 0.28);
    woods.add(pier.x1 - 0.4, -0.8, z, pier.x1 - 0.15, 0.16, z + 0.28);
  }
  metals.add(pier.x0 + 0.15, 0.16, pier.z1 - 1.2, pier.x0 + 0.4, 0.7, pier.z1 - 0.85);
  metals.add(pier.x1 - 0.4, 0.16, pier.z1 - 1.2, pier.x1 - 0.15, 0.7, pier.z1 - 0.85);

  const boat = new THREE.Group();
  const hullMat = standard(0xf4efe6, 0.55);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.38, 3.4), hullMat);
  hull.position.y = 0.15;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 1.2), wood);
  cabin.position.set(0, 0.48, -0.3);
  boat.add(hull, cabin);
  boat.position.set(10.5, 0, 27);
  scene.add(boat);
  disposables.push(hullMat);

  const birds: { g: THREE.Group; left: THREE.Mesh; right: THREE.Mesh; phase: number; radius: number }[] = [];
  const wing = new THREE.PlaneGeometry(0.42, 0.14);
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xf4efe6, side: THREE.DoubleSide });
  disposables.push(wing, wingMat);
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const left = new THREE.Mesh(wing, wingMat);
    const right = new THREE.Mesh(wing, wingMat);
    left.position.x = -0.2;
    right.position.x = 0.2;
    g.add(left, right);
    scene.add(g);
    birds.push({ g, left, right, phase: i * 2.1, radius: 6 + i * 2.2 });
  }

  const citizen = makeCitizen();
  scene.add(citizen.group);

  const roomCeilings: { id: PlaceId; mesh: THREE.Mesh }[] = [];
  function furnishRoom(id: PlaceId, ox: number, oz: number, x0: number, x1: number, z0: number, z1: number) {
    const wall = plasterMat;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 0.8, z1 - z0 + 0.8), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2);
    floor.receiveShadow = true;
    scene.add(floor);
    const shell = new THREE.Mesh(unit, wall);
    const addShell = (ax: number, ay: number, az: number, sx: number, sy: number, sz: number) => {
      const m = shell.clone();
      m.position.set(ax, ay, az);
      m.scale.set(sx, sy, sz);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };
    const t = 0.22;
    const h = 2.75;
    addShell((x0 + x1) / 2, h / 2, z0 - t / 2, x1 - x0 + t * 2, h, t);
    addShell((x0 + x1) / 2, h / 2, z1 + t / 2, x1 - x0 + t * 2, h, t);
    addShell(x0 - t / 2, h / 2, (z0 + z1) / 2, t, h, z1 - z0);
    addShell(x1 + t / 2, h / 2, (z0 + z1) / 2, t, h, z1 - z0);
    const ceiling = addShell((x0 + x1) / 2, h, (z0 + z1) / 2, x1 - x0, t, z1 - z0);
    roomCeilings.push({ id, mesh: ceiling });
    colliders[id].push({ minX: x0 - t, maxX: x0, minZ: z0, maxZ: z1 });
    colliders[id].push({ minX: x1, maxX: x1 + t, minZ: z0, maxZ: z1 });
    colliders[id].push({ minX: x0, maxX: x1, minZ: z0 - t, maxZ: z0 });
    colliders[id].push({ minX: x0, maxX: x1, minZ: z1, maxZ: z1 + t });
    glows.add((x0 + x1) / 2 - 0.7, 1.15, z0 - 0.05, (x0 + x1) / 2 + 0.7, 2.15, z0 + 0.08);
    const light = new THREE.PointLight(0xffe1c4, 80, 18, 2);
    light.position.set((x0 + x1) / 2, 2.45, (z0 + z1) / 2);
    scene.add(light);
    disposables.push(floor.geometry);
    return { ox, oz };
  }

  const home = rooms.home;
  furnishRoom("home", 0, 420, home.x0, home.x1, home.z0, home.z1);
  woods.add(-2.9, 0.28, 421.15, -1.15, 0.55, 423.15);
  concretes.add(1.7, 0, 420.7, 3.3, 2.1, 422.5);
  glasses.add(1.85, 0.4, 420.85, 3.15, 2.0, 422.35);
  woods.add(1.7, 0.9, 423.1, 3.25, 1.05, 424.15);
  metals.add(2.55, 0.2, 423.2, 3.15, 1.5, 424.0);
  woods.add(-3.15, 0.72, 424.1, -1.55, 0.78, 425.15);
  woods.add(-1.1, 0.32, 423.15, 0.85, 0.62, 424.45);
  fabricsSoft(home);

  const cafe = rooms.cafe;
  furnishRoom("cafe", 0, 520, cafe.x0, cafe.x1, cafe.z0, cafe.z1);
  woods.add(-2.4, 0.9, 520.7, 2.6, 1.15, 521.7);
  woods.add(-3.1, 0.42, 523.4, -1.5, 0.5, 524.7);
  woods.add(1.5, 0.42, 523.6, 3.2, 0.5, 525);
  woods.add(-0.8, 0.42, 524.8, 0.9, 0.5, 526);
  colliders.cafe.push({ minX: -2.4, maxX: 2.6, minZ: 520.7, maxZ: 521.7 });

  const market = rooms.market;
  furnishRoom("market", 0, 620, market.x0, market.x1, market.z0, market.z1);
  woods.add(-3.4, 0.2, 621.6, -1.2, 1.5, 624.4);
  woods.add(0.2, 0.2, 621.8, 1.5, 1.45, 623.6);
  woods.add(1.7, 0.85, 624.9, 3.4, 1.15, 626.2);
  colliders.market.push({ minX: -3.4, maxX: -1.2, minZ: 621.6, maxZ: 624.4 });
  colliders.market.push({ minX: 1.7, maxX: 3.4, minZ: 624.9, maxZ: 626.2 });

  const office = rooms.office;
  furnishRoom("office", 0, 720, office.x0, office.x1, office.z0, office.z1);
  woods.add(-3.4, 0.72, 721.6, -1.1, 0.8, 723.3);
  metals.add(-2.6, 0.82, 722.2, -1.5, 1.15, 722.35);
  woods.add(2.5, 0.3, 726.5, 4.2, 1.7, 727.7);
  metals.add(3.6, 0.4, 722.6, 4.5, 1.15, 723.6);
  colliders.office.push({ minX: -3.4, maxX: -1.1, minZ: 721.6, maxZ: 723.3 });
  colliders.office.push({ minX: 2.5, maxX: 4.2, minZ: 726.5, maxZ: 727.7 });

  function fabricsSoft(r: typeof home) {
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshStandardMaterial({ color: 0x8d4a3c, roughness: 0.95 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-0.2, 0.04, 423.5);
    rug.receiveShadow = true;
    scene.add(rug);
    void r;
  }

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 90), grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 8);
  ground.receiveShadow = true;
  scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(86, 6.6), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.015, 0);
  road.receiveShadow = true;
  scene.add(road);
  const walkN = new THREE.Mesh(new THREE.PlaneGeometry(86, 4.6), walkMat);
  walkN.rotation.x = -Math.PI / 2;
  walkN.position.set(0, 0.02, -5.65);
  walkN.receiveShadow = true;
  scene.add(walkN);
  const walkS = new THREE.Mesh(new THREE.PlaneGeometry(78, 4.8), walkMat);
  walkS.rotation.x = -Math.PI / 2;
  walkS.position.set(-2, 0.02, 5.7);
  walkS.receiveShadow = true;
  scene.add(walkS);
  for (let i = -2; i <= 2; i++) {
    concretes.add(i * 0.7 - 0.2, 0.03, -0.35, i * 0.7 + 0.2, 0.05, 0.35);
  }

  const city = buildCity(scene, colliders.street);

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color("#6ea0d4") },
      uHorizon: { value: new THREE.Color("#f3d2b0") },
      uSun: { value: new THREE.Vector3(0.2, 0.4, -0.4) },
      uStars: { value: 0 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uSun;
      uniform float uStars;
      void main() {
        vec3 dir = normalize(vDir);
        float h = clamp(dir.y * 0.55 + 0.45, 0.0, 1.0);
        vec3 col = mix(uHorizon, uZenith, pow(h, 0.72));
        vec3 sunDir = normalize(uSun);
        float sun = pow(max(dot(dir, sunDir), 0.0), 1200.0);
        float glow = pow(max(dot(dir, sunDir), 0.0), 6.0);
        col += vec3(1.0, 0.93, 0.82) * sun;
        col += vec3(1.0, 0.68, 0.38) * glow * 0.28;
        float n = fract(sin(dot(floor(dir * 220.0), vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        float star = step(0.997, n) * uStars * smoothstep(0.12, 0.4, dir.y);
        col += vec3(star);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 24, 16), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);
  disposables.push(skyMat, sky.geometry);

  const hemi = new THREE.HemisphereLight(0xc5d7ee, 0x3a3328, 0.72);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0xfff4e8, 0.28);
  scene.add(amb);
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 70;
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  const fog = new THREE.FogExp2(0xd7e4f2, 0.015);
  scene.fog = fog;

  for (const b of [boxes, stuccos, cools, woods, roofs, concretes, metals, leaves, leaves2, trunks, awnings, awnings2, glasses, glows, grassBlades]) {
    b.finish();
    scene.add(b.mesh);
  }

  let carT = 0;
  let walkDist = 0;
  const path = [
    [-34, -5.15],
    [34, -5.15],
    [34, 5.55],
    [-34, 5.55],
  ];

  function update(dt: number, skySample: SkySample, focus: THREE.Vector3, place: PlaceId, elapsed: number) {
    sky.position.copy(focus);
    (skyMat.uniforms.uZenith.value as THREE.Color).set(skySample.zenith);
    (skyMat.uniforms.uHorizon.value as THREE.Color).set(skySample.horizon);
    (skyMat.uniforms.uSun.value as THREE.Vector3).set(skySample.sun.x, skySample.sun.y, skySample.sun.z);
    skyMat.uniforms.uStars.value = skySample.stars;
    // Hide only the active interior ceiling for a clear room-aware, elevated camera.
    for (const entry of roomCeilings) entry.mesh.visible = entry.id !== place;
    const elev = skySample.elev;
    const day = THREE.MathUtils.clamp(elev, 0, 1);
    sun.intensity = 0.15 + day * 3.1;
    sun.color.set(elev > 0.35 ? "#fff4e2" : "#ffc39a");
    hemi.intensity = 0.18 + day * 0.62;
    hemi.color.set(skySample.zenith);
    amb.intensity = 0.08 + day * 0.26 + skySample.lamp * 0.05;
    sun.position.set(focus.x + skySample.sun.x * 28, focus.y + skySample.sun.y * 28, focus.z + skySample.sun.z * 28);
    sun.target.position.set(focus.x, 0, focus.z);
    fog.color.set(skySample.horizon);
    fog.density = place === "street" ? 0.009 + (1 - day) * 0.004 : 0.012;
    glassMat.emissiveIntensity = skySample.lamp * 1.15;
    lampMat.emissiveIntensity = 0.2 + skySample.lamp * 1.8;
    for (const light of lampLights) light.intensity = skySample.lamp * 36;
    glowMat.color.set(skySample.horizon);

    const pos = waterGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = baseZ[i * 3];
      const y = baseZ[i * 3 + 1];
      const wave = Math.sin(x * 0.35 + elapsed * 1.3) * 0.07 + Math.cos(y * 0.28 - elapsed * 0.9) * 0.05;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
    boat.position.y = Math.sin(elapsed * 0.8) * 0.06;
    boat.rotation.z = Math.sin(elapsed * 0.6) * 0.03;

    carT += dt * 6.5;
    const span = 80;
    const along = ((carT % (span * 2)) + span * 2) % (span * 2);
    const going = along < span;
    driver.position.set(going ? -40 + along : 40 - (along - span), 0, going ? -1.7 : 1.7);
    driver.rotation.y = going ? Math.PI / 2 : -Math.PI / 2;

    walkDist += dt * 1.15;
    let walked = walkDist;
    let seg = 0;
    for (let i = 0; i < path.length; i++) {
      const p0 = path[i];
      const p1 = path[(i + 1) % path.length];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (walked <= len) {
        seg = i;
        const t = len > 0 ? walked / len : 0;
        citizen.group.position.set(p0[0] + (p1[0] - p0[0]) * t, 0, p0[1] + (p1[1] - p0[1]) * t);
        const cyaw = Math.atan2(-(p1[0] - p0[0]), -(p1[1] - p0[1]));
        citizen.group.rotation.y = cyaw + Math.PI;
        break;
      }
      walked -= len;
      if (i === path.length - 1) walkDist = walked;
    }
    void seg;
    citizen.update(dt, 1.1, elapsed);

    for (const bird of birds) {
      bird.phase += dt * 0.45;
      bird.g.position.set(8 + Math.cos(bird.phase) * bird.radius, 7.5 + Math.sin(bird.phase * 2) * 0.8, 26 + Math.sin(bird.phase) * bird.radius * 0.55);
      const flap = Math.sin(elapsed * 9 + bird.phase) * 0.7;
      bird.left.rotation.z = flap;
      bird.right.rotation.z = -flap;
    }
    fountainWater.position.y = 0.88 + Math.sin(elapsed * 2) * 0.015;
    city.update(dt, elapsed, skySample.lamp, focus, place === "street");
  }

  return {
    colliders,
    update,
    dispose: () => {
      city.dispose();
      for (const d of disposables) d.dispose();
    },
  };
}

function makeCar(color: number) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.45, metalness: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9bb8c9, roughness: 0.08, metalness: 0.45 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.48, 3.9), paint);
  body.position.y = 0.55;
  body.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.42, 1.9), glass);
  cabin.position.set(0, 0.95, -0.15);
  cabin.castShadow = true;
  const wgeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
  wgeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [
    [-0.78, 1.15],
    [0.78, 1.15],
    [-0.78, -1.15],
    [0.78, -1.15],
  ] as const) {
    const w = new THREE.Mesh(wgeo, dark);
    w.position.set(x, 0.3, z);
    g.add(w);
  }
  g.add(body, cabin);
  return g;
}

function makeCitizen() {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: 0x243044, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 4, 8), coat);
  body.position.y = 1.05;
  body.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xc9956c, roughness: 0.6 }),
  );
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(body, head);
  let phase = 0;
  return {
    group: g,
    update: (dt: number, speed: number, _t: number) => {
      phase += dt * speed * 6;
      g.position.y = Math.abs(Math.sin(phase)) * 0.04;
    },
  };
}