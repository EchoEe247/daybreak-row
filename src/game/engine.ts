import * as THREE from "three";
import { createActor, disposeActorMaterials, faceYaw, type Actor } from "@/game/actors";
import { createAudio } from "@/game/audio";
import { NPC_META } from "@/game/content";
import { attachInput, input, readMove } from "@/game/input";
import { pier, rooms } from "@/game/layout";
import {
  advance,
  applyChoice,
  buildActions,
  collapse,
  freshState,
  nodeView,
  npcWhere,
  openNode,
  resolveShift,
  resolveSleep,
  SHIFT_LINES,
  type Note,
} from "@/game/logic";
import { bindGame, clearSave, loadSave, useUi, writeSave } from "@/game/store";
import { hourOf, sampleSky } from "@/game/time";
import type { GameState, Mode, NpcId, PlaceId } from "@/game/types";
import { buildWorld, type Collider } from "@/game/world";

const NPCS: NpcId[] = ["mara", "ellis", "theo", "jun", "idris"];
const RADIUS = 0.34;

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
      setSteer?: (v: number) => void;
    };
  }
}

function resolveCircle(x: number, z: number, boxes: Collider[]) {
  let px = x;
  let pz = z;
  for (let iter = 0; iter < 3; iter++) {
    for (const b of boxes) {
      const cx = Math.min(Math.max(px, b.minX), b.maxX);
      const cz = Math.min(Math.max(pz, b.minZ), b.maxZ);
      const dx = px - cx;
      const dz = pz - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 < 1e-8) {
        const left = px - b.minX;
        const right = b.maxX - px;
        const near = pz - b.minZ;
        const far = b.maxZ - pz;
        const m = Math.min(left, right, near, far);
        if (m === left) px = b.minX - RADIUS;
        else if (m === right) px = b.maxX + RADIUS;
        else if (m === near) pz = b.minZ - RADIUS;
        else pz = b.maxZ + RADIUS;
      } else {
        const d = Math.sqrt(d2);
        const push = (RADIUS - d) / d;
        px += dx * push;
        pz += dz * push;
      }
    }
  }
  return { x: px, z: pz };
}

function clampPos(place: PlaceId, x: number, z: number) {
  if (place !== "street") {
    const r = rooms[place];
    return {
      x: THREE.MathUtils.clamp(x, r.x0 + 0.36, r.x1 - 0.36),
      z: THREE.MathUtils.clamp(z, r.z0 + 0.36, r.z1 - 0.36),
    };
  }
  if (z > 20.05 && x > pier.x0 + 0.3 && x < pier.x1 - 0.3) {
    return {
      x: THREE.MathUtils.clamp(x, pier.x0 + 0.4, pier.x1 - 0.4),
      z: THREE.MathUtils.clamp(z, 19.7, pier.z1 - 0.4),
    };
  }
  return {
    x: THREE.MathUtils.clamp(x, -36, 36),
    z: THREE.MathUtils.clamp(z, -7.55, 20.12),
  };
}

function camClip(px: number, pz: number, tx: number, tz: number, boxes: Collider[]) {
  const dx = tx - px;
  const dz = tz - pz;
  let best = 1;
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = px + dx * t;
    const z = pz + dz * t;
    const hit = boxes.some((b) => x > b.minX - 0.25 && x < b.maxX + 0.25 && z > b.minZ - 0.25 && z < b.maxZ + 0.25);
    if (hit) {
      best = (i - 1) / steps;
      break;
    }
  }
  return Math.max(0.18, best);
}

export function mountGame(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const mapSize = coarse ? 1024 : 2048;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
  const world = buildWorld(scene);
  const sunShadow = scene.children.find((c) => c instanceof THREE.DirectionalLight) as THREE.DirectionalLight | undefined;
  if (sunShadow) sunShadow.shadow.mapSize.set(mapSize, mapSize);

  const player = createActor("player");
  scene.add(player.group);
  const npcs = {} as Record<NpcId, Actor>;
  for (const id of NPCS) {
    npcs[id] = createActor(id);
    scene.add(npcs[id].group);
  }

  const actions = buildActions();
  const audio = createAudio();
  const detachInput = attachInput(canvas);
  const timer = new THREE.Timer();
  timer.connect(document);

  let saved = loadSave();
  let play: GameState | null = null;
  const preview = freshState("Alex");
  let mode: Mode = "title";
  let speed = 0;
  let camYaw = preview.yaw;
  let camPitch = 0.46;
  let sinceLook = 2;
  let attract = 0;
  let toastSerial = 1;
  let syncAcc = 0;
  let captionUntil = 0;
  let elapsed = 0;
  let seq: null | { kind: "sleep" | "nap" | "shift"; t: number } = null;
  let dialogueNpc: NpcId | null = null;
  let dialogueNode = "hi";
  let promptId: string | null = null;
  let promptKind: "act" | "npc" | null = null;
  let busyUntil = 0;
  let saveMinute = -999;
  const camPos = new THREE.Vector3();
  const camDest = new THREE.Vector3();
  const look = new THREE.Vector3();
  const focus = new THREE.Vector3();

  function snapCam(s: GameState) {
    const dist = 4.55;
    const horiz = Math.cos(camPitch) * dist;
    const y = Math.sin(camPitch) * dist;
    camPos.set(s.x + Math.sin(camYaw) * horiz, 1.2 + y, s.z + Math.cos(camYaw) * horiz);
  }

  function sim(): GameState {
    return play ?? preview;
  }

  function pushToast(text: string) {
    const id = toastSerial++;
    const cur = useUi.getState().toasts;
    useUi.setState({ toasts: [...cur, { id, text }].slice(-3) });
    window.setTimeout(() => {
      useUi.setState({ toasts: useUi.getState().toasts.filter((t) => t.id !== id) });
    }, 3400);
  }

  function showNotes(notes: Note[]) {
    for (const n of notes) {
      if (n.toast) pushToast(n.toast);
      if (n.caption) {
        captionUntil = elapsed + 2.4;
        useUi.setState({ caption: n.caption });
      }
    }
  }

  function sync(force = false) {
    const s = sim();
    const low = !!play && (s.needs.energy < 28 || s.needs.hunger < 22);
    const dialogue =
      mode === "dialogue" && dialogueNpc
        ? nodeView(dialogueNpc, dialogueNode)
        : null;
    useUi.setState({
      ready: true,
      mode,
      hasSave: !!saved || !!play,
      name: play?.name ?? s.name,
      day: s.day,
      minute: s.minute,
      money: s.money,
      food: s.food,
      needs: { ...s.needs },
      rel: { ...s.rel },
      goals: { ...s.goals },
      log: s.log.slice(0, 12),
      place: s.place,
      prompt: mode === "play" ? useUi.getState().prompt : null,
      dialogue,
      notice: mode === "sleep" ? (seq?.kind === "nap" ? "A short nap" : "Lights out") : mode === "shift" ? "On the clock" : null,
      noticeSub:
        mode === "shift"
          ? SHIFT_LINES[Math.min(SHIFT_LINES.length - 1, Math.floor((seq?.t ?? 0) / 1.05))]
          : mode === "sleep"
            ? seq?.kind === "nap"
              ? "Ninety minutes. The street keeps its noise."
              : "The row goes quiet. Morning will be blunt about it."
            : null,
      caption: elapsed < captionUntil ? useUi.getState().caption : null,
      low,
      veil: useUi.getState().veil,
    });
    void force;
  }

  function remember() {
    if (!play) return;
    writeSave(play);
    saved = play;
    saveMinute = play.day * 1440 + play.minute;
  }

  function begin(state: GameState) {
    play = state;
    mode = "play";
    camYaw = state.yaw;
    camPitch = 0.48;
    speed = 0;
    seq = null;
    dialogueNpc = null;
    snapCam(state);
    audio.unlock();
    audio.chime();
    remember();
    sync(true);
  }

  bindGame({
    startNew: (name) => begin(freshState(name)),
    continue: () => {
      if (saved) begin(structuredClone(saved));
      else begin(freshState(useUi.getState().name));
    },
    newLife: () => {
      clearSave();
      saved = null;
      play = null;
      mode = "title";
      sync(true);
    },
    interact: () => triggerInteract(),
    openPhone: () => {
      if (mode === "play") {
        mode = "phone";
        sync(true);
      }
    },
    closePhone: () => {
      if (mode === "phone") {
        mode = "play";
        sync(true);
      }
    },
    pause: () => {
      if (mode === "play") {
        mode = "pause";
        sync(true);
      } else if (mode === "pause") {
        mode = "play";
        sync(true);
      }
    },
    resume: () => {
      if (mode === "pause" || mode === "phone") {
        mode = "play";
        sync(true);
      }
    },
    quit: () => {
      remember();
      play = null;
      mode = "title";
      speed = 0;
      sync(true);
    },
    choose: (index) => {
      if (!play || mode !== "dialogue" || !dialogueNpc) return;
      const result = applyChoice(play, dialogueNpc, dialogueNode, index);
      showNotes(result.notes);
      if (result.next && result.next !== dialogueNode) {
        dialogueNode = result.next;
        audio.blip(480);
      } else if (result.next === null) {
        const notes = advance(play, 8, 0.5);
        showNotes(notes);
        mode = "play";
        dialogueNpc = null;
        audio.blip(420);
      }
      sync(true);
    },
  });

  function triggerInteract() {
    if (!play || mode !== "play" || elapsed < busyUntil) return;
    if (!promptId || !promptKind) return;
    if (promptKind === "npc") {
      const npc = promptId as NpcId;
      dialogueNpc = npc;
      dialogueNode = openNode(npc, play);
      mode = "dialogue";
      play.goals.talk = true;
      play.needs.social = Math.min(100, play.needs.social + 6);
      audio.blip(540);
      sync(true);
      return;
    }
    const action = actions.find((a) => a.id === promptId);
    if (!action) return;
    const result = action.run(play);
    showNotes(result.notes);
    audio.blip(result.seq ? 300 : 610);
    if (result.seq) {
      seq = { kind: result.seq, t: 0 };
      mode = result.seq === "shift" ? "shift" : "sleep";
    }
    if (result.teleport) {
      useUi.setState({ veil: 1 });
      camYaw = play.yaw;
      window.setTimeout(() => useUi.setState({ veil: 0 }), 320);
    } else {
      busyUntil = elapsed + 0.45;
    }
    sync(true);
  }

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.35 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);

  window.__controlsTest = {
    getYaw: () => sim().yaw,
    getSpeed: () => speed,
    setKeys: (codes) => {
      input.keys.clear();
      for (const code of codes) input.keys.add(code);
    },
    setSteer: (v) => {
      input.stickX = THREE.MathUtils.clamp(-v, -1, 1);
      input.stickY = Math.abs(v) > 0.05 ? 1 : input.stickY;
    },
  };

  function tick(dt: number) {
    elapsed += dt;
    const title = mode === "title" || !play;

    if (!title && play && (mode === "play" || mode === "sleep" || mode === "shift")) {
      if (input.phoneQueued && mode === "play") {
        mode = "phone";
        input.phoneQueued = false;
      } else input.phoneQueued = false;
      if (input.pauseQueued && mode === "play") {
        mode = "pause";
        input.pauseQueued = false;
      } else input.pauseQueued = false;
    } else {
      input.phoneQueued = false;
      input.pauseQueued = false;
    }

    if (seq && play && (mode === "sleep" || mode === "shift")) {
      seq.t += dt;
      const dur = seq.kind === "nap" ? 1.7 : seq.kind === "sleep" ? 2.5 : 5.4;
      if (seq.t >= dur) {
        const notes = seq.kind === "shift" ? resolveShift(play) : resolveSleep(play, seq.kind === "nap");
        showNotes(notes);
        if (seq.kind !== "shift") {
          camYaw = play.yaw;
        }
        seq = null;
        mode = "play";
        remember();
        audio.chime();
      }
    }

    const canMove = !!play && mode === "play" && elapsed >= busyUntil && !seq;
    if (canMove && play) {
      const move = readMove();
      const fwdX = -Math.sin(camYaw);
      const fwdZ = -Math.cos(camYaw);
      const rightX = Math.cos(camYaw);
      const rightZ = -Math.sin(camYaw);
      const wishX = fwdX * move.y + rightX * move.x;
      const wishZ = fwdZ * move.y + rightZ * move.x;
      const wish = Math.hypot(wishX, wishZ);
      let slow = 1;
      if (play.needs.energy < 25) slow *= 0.84;
      if (play.needs.hunger < 15) slow *= 0.78;
      const target = wish > 0.08 ? (move.run ? 4.45 : 2.5) * slow * Math.min(1, wish) : 0;
      speed += (target - speed) * Math.min(1, dt * 8);
      if (wish > 0.08 && speed > 0.05) {
        const nx = wishX / wish;
        const nz = wishZ / wish;
        const targetYaw = Math.atan2(-nx, -nz);
        const diff = Math.atan2(Math.sin(targetYaw - play.yaw), Math.cos(targetYaw - play.yaw));
        const step = THREE.MathUtils.clamp(diff, -7.5 * dt, 7.5 * dt);
        play.yaw += step;
        play.x += nx * speed * dt;
        play.z += nz * speed * dt;
        const hit = resolveCircle(play.x, play.z, world.colliders[play.place]);
        const clamped = clampPos(play.place, hit.x, hit.z);
        play.x = clamped.x;
        play.z = clamped.z;
        if (move.run) play.needs.energy = Math.max(0, play.needs.energy - 6 * dt * (2.2 / 60));
        audio.foot(elapsed * 1000);
      } else if (speed < 0.05) speed = 0;

      const flow = 2.15 * dt;
      const notes = advance(play, flow, 1);
      if (notes.length) showNotes(notes);
      const nowAbs = play.day * 1440 + play.minute;
      if (play.needs.energy <= 0 && nowAbs > play.collapseAt + 20) {
        const dropped = collapse(play);
        showNotes(dropped);
        camYaw = play.yaw;
        useUi.setState({ veil: 1 });
        window.setTimeout(() => useUi.setState({ veil: 0 }), 400);
        speed = 0;
      }
      if (input.interactQueued) triggerInteract();
      input.interactQueued = false;

      if (Math.floor(nowAbs) - Math.floor(saveMinute) > 12) remember();
    } else {
      input.interactQueued = false;
      speed += (0 - speed) * Math.min(1, dt * 6);
      if (!title && play && mode === "play") {
        /* paused by busy */
      }
    }

    if (play && mode === "play") {
      let bestD = 1e9;
      let label: string | null = null;
      promptId = null;
      promptKind = null;
      for (const a of actions) {
        if (a.place !== play.place) continue;
        const d = Math.hypot(a.x - play.x, a.z - play.z);
        if (d <= a.r && d < bestD) {
          bestD = d;
          label = a.label(play);
          promptId = a.id;
          promptKind = "act";
        }
      }
      const posts = npcWhere(play);
      for (const id of NPCS) {
        const p = posts[id];
        if (!p.visible) continue;
        const d = Math.hypot(p.x - play.x, p.z - play.z);
        if (d < 1.65 && d < bestD) {
          bestD = d;
          label = `Talk to ${NPC_META[id].name.split(" ")[0]}`;
          promptId = id;
          promptKind = "npc";
        }
      }
      if (useUi.getState().prompt !== label) useUi.setState({ prompt: label });
    }

    const shown = sim();
    const posts = npcWhere(shown);
    player.group.visible = true;
    player.group.position.set(shown.x, 0, shown.z);
    faceYaw(player.group, shown.yaw);
    player.update(dt, title ? 0 : speed, elapsed);
    for (const id of NPCS) {
      const post = posts[id];
      const actor = npcs[id];
      actor.group.visible = post.visible;
      actor.group.position.set(post.x, 0, post.z);
      faceYaw(actor.group, post.yaw);
      actor.update(dt, 0, elapsed);
      if (actor.label) {
        const d = Math.hypot(post.x - shown.x, post.z - shown.z);
        actor.label.visible = post.visible && d < 16;
      }
    }

    if (title) {
      attract += dt;
      camera.position.set(6 + Math.sin(attract * 0.13) * 2.4, 4.2, 16);
      camera.lookAt(-6 + Math.sin(attract * 0.1) * 1.2, 1.35, -1);
      focus.copy(camera.position);
    } else if (play) {
      sinceLook += dt;
      if (input.pointerLooking) sinceLook = 0;
      camYaw -= input.lookDx * 0.0055;
      camPitch = THREE.MathUtils.clamp(camPitch + input.lookDy * 0.004, 0.28, 1.02);
      input.lookDx = 0;
      input.lookDy = 0;
      const moving = speed > 0.4;
      if (!input.pointerLooking && sinceLook > 0.7 && moving) {
        const diff = Math.atan2(Math.sin(play.yaw - camYaw), Math.cos(play.yaw - camYaw));
        camYaw += diff * (1 - Math.exp(-2 * dt));
      }
      const indoor = play.place !== "street";
      const dist = indoor ? 2.65 : 4.55;
      const pitchUse = indoor ? Math.min(camPitch, 0.36) : camPitch;
      const horiz = Math.cos(pitchUse) * dist;
      const yLift = Math.sin(pitchUse) * dist;
      const wantX = play.x + Math.sin(camYaw) * horiz;
      const wantZ = play.z + Math.cos(camYaw) * horiz;
      const clip = camClip(play.x, play.z, wantX, wantZ, world.colliders[play.place]);
      const destX = play.x + (wantX - play.x) * clip;
      const destZ = play.z + (wantZ - play.z) * clip;
      let destY = 1.15 + yLift * clip;
      if (indoor) destY = Math.min(destY, 2.15);
      camDest.set(destX, destY, destZ);
      if (camPos.lengthSq() < 0.01) camPos.copy(camDest);
      camPos.lerp(camDest, 1 - Math.exp(-6 * dt));
      camera.position.copy(camPos);
      look.set(play.x, 1.25, play.z);
      camera.lookAt(look);
      focus.set(play.x, 1, play.z);
    }

    const minute = title ? preview.minute : (play?.minute ?? preview.minute);
    const sky = sampleSky(minute);
    renderer.toneMappingExposure = sky.exposure * (title ? 1.02 : 1);
    world.update(dt, sky, focus, shown.place, elapsed);
    audio.setAmbience(shown.place === "street", sky.lamp > 0.4);
  }

  const onPageHide = () => remember();
  window.addEventListener("pagehide", onPageHide);

  renderer.setAnimationLoop((stamp) => {
    timer.update(stamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    let acc = dt;
    const step = 1 / 60;
    if (acc > 0.2) acc = 0.2;
    while (acc >= step) {
      tick(step);
      acc -= step;
    }
    if (acc > 0) tick(acc);
    syncAcc += dt;
    if (syncAcc > 0.15) {
      syncAcc = 0;
      if (mode === "play" || mode === "shift" || mode === "sleep") sync(false);
    }
    renderer.render(scene, camera);
  });

  useUi.setState({ ready: true, hasSave: !!saved, mode: "title" });

  return () => {
    renderer.setAnimationLoop(null);
    timer.dispose();
    ro.disconnect();
    window.removeEventListener("pagehide", onPageHide);
    detachInput();
    audio.dispose();
    world.dispose();
    disposeActorMaterials();
    renderer.dispose();
    bindGame({
      startNew: () => {},
      continue: () => {},
      newLife: () => {},
      interact: () => {},
      openPhone: () => {},
      closePhone: () => {},
      pause: () => {},
      resume: () => {},
      quit: () => {},
      choose: () => {},
    });
    delete window.__controlsTest;
  };
}