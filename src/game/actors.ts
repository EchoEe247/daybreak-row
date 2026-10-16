import * as THREE from "three";
import type { NpcId } from "@/game/types";

export type Actor = {
  group: THREE.Group;
  label: THREE.Sprite | null;
  update: (dt: number, speed: number, idleTime: number) => void;
  dispose: () => void;
};

type Look = {
  skin: number;
  hair: number;
  shirt: number;
  pants: number;
  shoes: number;
  hairStyle: "short" | "bun" | "gray";
  apron?: number;
  label?: string;
};

const LOOKS: Record<"player" | NpcId, Look> = {
  player: { skin: 0xc9956c, hair: 0x2a211c, shirt: 0xd7c3a6, pants: 0x3e4a40, shoes: 0x2a2420, hairStyle: "short" },
  mara: { skin: 0x8d5a3c, hair: 0x1a1a1a, shirt: 0xf4f1ea, pants: 0x3a3030, shoes: 0x2a2420, hairStyle: "bun", apron: 0xa33b32, label: "Mara" },
  ellis: { skin: 0xe0b08a, hair: 0x4a3728, shirt: 0xf7f4ee, pants: 0x2f3d3a, shoes: 0x241e1c, hairStyle: "short", apron: 0x2f4a45, label: "Ellis" },
  theo: { skin: 0xd2a07a, hair: 0x6b4a2e, shirt: 0x3d4d66, pants: 0x2c3038, shoes: 0x1c1e24, hairStyle: "short", label: "Theo" },
  jun: { skin: 0xc48a62, hair: 0x161616, shirt: 0xded6c8, pants: 0x5c4638, shoes: 0x2a2420, hairStyle: "short", label: "Jun" },
  idris: { skin: 0x6e4634, hair: 0xb7bcc2, shirt: 0x2c3a48, pants: 0x3a342c, shoes: 0x241c18, hairStyle: "gray", label: "Idris" },
};

const geos = {
  leg: new THREE.CapsuleGeometry(0.07, 0.34, 3, 6),
  shin: new THREE.CapsuleGeometry(0.055, 0.3, 3, 6),
  torso: new THREE.CapsuleGeometry(0.16, 0.34, 4, 8),
  arm: new THREE.CapsuleGeometry(0.045, 0.28, 3, 6),
  forearm: new THREE.CapsuleGeometry(0.04, 0.24, 3, 6),
  head: new THREE.SphereGeometry(0.125, 12, 10),
  hair: new THREE.SphereGeometry(0.132, 12, 10),
  bun: new THREE.SphereGeometry(0.07, 8, 8),
  eye: new THREE.SphereGeometry(0.016, 6, 6),
  shoe: new THREE.BoxGeometry(0.09, 0.06, 0.18),
  apron: new THREE.BoxGeometry(0.26, 0.32, 0.06),
};

const disposed: THREE.Material[] = [];

function mat(color: number, roughness = 0.72) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
  disposed.push(m);
  return m;
}

function hang(geo: THREE.CapsuleGeometry | THREE.SphereGeometry | THREE.BoxGeometry, material: THREE.Material, drop: number) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = -drop;
  mesh.castShadow = true;
  return mesh;
}

export function createActor(kind: "player" | NpcId): Actor {
  const look = LOOKS[kind];
  const skin = mat(look.skin, 0.62);
  const hairM = mat(look.hair, 0.5);
  const shirt = mat(look.shirt, 0.82);
  const pants = mat(look.pants, 0.86);
  const shoes = mat(look.shoes, 0.55);
  const eye = mat(0x1a1614, 0.4);
  const apron = look.apron ? mat(look.apron, 0.8) : null;

  const group = new THREE.Group();
  const bob = new THREE.Group();
  group.add(bob);

  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-0.1, 0.9, 0);
  legR.position.set(0.1, 0.9, 0);
  const thighDrop = 0.24;
  legL.add(hang(geos.leg, pants, thighDrop));
  legR.add(hang(geos.leg, pants, thighDrop));
  const shoeL = new THREE.Mesh(geos.shoe, shoes);
  const shoeR = new THREE.Mesh(geos.shoe, shoes);
  shoeL.position.set(0, -0.62, 0.03);
  shoeR.position.set(0, -0.62, 0.03);
  shoeL.castShadow = shoeR.castShadow = true;
  legL.add(shoeL);
  legR.add(shoeR);
  bob.add(legL, legR);

  const torso = new THREE.Group();
  torso.position.y = 0.94;
  const chest = new THREE.Mesh(geos.torso, shirt);
  chest.position.y = 0.26;
  chest.castShadow = true;
  torso.add(chest);
  if (apron) {
    const ap = new THREE.Mesh(geos.apron, apron);
    ap.position.set(0, 0.18, 0.15);
    ap.castShadow = true;
    torso.add(ap);
  }

  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-0.24, 0.42, 0);
  armR.position.set(0.24, 0.42, 0);
  armL.add(hang(geos.arm, shirt, 0.2));
  armR.add(hang(geos.arm, shirt, 0.2));
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), skin);
  const handR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), skin);
  handL.position.y = -0.4;
  handR.position.y = -0.4;
  armL.add(handL);
  armR.add(handR);
  torso.add(armL, armR);

  const head = new THREE.Mesh(geos.head, skin);
  head.position.y = 0.66;
  head.castShadow = true;
  torso.add(head);
  const hair = new THREE.Mesh(geos.hair, hairM);
  hair.position.y = 0.7;
  hair.scale.set(1, look.hairStyle === "gray" ? 0.78 : 0.92, 1);
  hair.castShadow = true;
  torso.add(hair);
  if (look.hairStyle === "bun") {
    const bun = new THREE.Mesh(geos.bun, hairM);
    bun.position.set(0, 0.84, -0.02);
    torso.add(bun);
  }
  const eyeL = new THREE.Mesh(geos.eye, eye);
  const eyeR = new THREE.Mesh(geos.eye, eye);
  eyeL.position.set(-0.045, 0.67, 0.11);
  eyeR.position.set(0.045, 0.67, 0.11);
  torso.add(eyeL, eyeR);
  bob.add(torso);

  let label: THREE.Sprite | null = null;
  if (look.label) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const g = canvas.getContext("2d");
    if (g) {
      g.clearRect(0, 0, 256, 64);
      g.fillStyle = "rgba(20, 27, 40, 0.78)";
      g.beginPath();
      g.roundRect(28, 8, 200, 48, 24);
      g.fill();
      g.fillStyle = "#f3ecdf";
      g.font = "600 28px Outfit, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(look.label, 128, 33);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sm = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    disposed.push(sm);
    label = new THREE.Sprite(sm);
    label.position.y = 2.05;
    label.scale.set(1.25, 0.32, 1);
    group.add(label);
  }

  let phase = Math.random() * Math.PI * 2;
  const update = (dt: number, speed: number, idleTime: number) => {
    const moving = speed > 0.2;
    phase += dt * (moving ? 6.5 + speed * 1.4 : 1.4);
    const swing = moving ? Math.min(1, speed / 2.4) : 0;
    legL.rotation.x = Math.sin(phase) * 0.7 * swing;
    legR.rotation.x = Math.sin(phase + Math.PI) * 0.7 * swing;
    armL.rotation.x = Math.sin(phase + Math.PI) * 0.55 * swing;
    armR.rotation.x = Math.sin(phase) * 0.55 * swing;
    bob.position.y = moving ? Math.abs(Math.sin(phase)) * 0.045 * swing : Math.sin(idleTime * 1.7 + phase) * 0.012;
    torso.rotation.y = Math.sin(phase) * 0.06 * swing;
    torso.rotation.x = moving ? 0.06 : 0;
  };

  return {
    group,
    label,
    update,
    dispose: () => {
      /* materials disposed globally */
    },
  };
}

export function disposeActorMaterials() {
  for (const m of disposed) m.dispose();
  disposed.length = 0;
  for (const g of Object.values(geos)) g.dispose();
}

export function faceYaw(group: THREE.Group, yaw: number) {
  group.rotation.y = yaw + Math.PI;
}
