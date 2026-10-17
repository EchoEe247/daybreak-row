import * as THREE from "three";
import { doorTransitionLabel, parseDoorAction, reconcileIndoorArrival } from "@/game/door-transition";
import { CITY_LIMITS, CITY_STOPS, districtAt } from "@/game/city-layout";
import { discoverAt } from "@/game/discovery";
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
  type Action,
} from "@/game/logic";
import { bindGame, clearSave, loadSaveStatus, useUi, writeSave } from "@/game/store";
import { absMinute, PERMANENT_DAYLIGHT } from "@/game/time";
import type { GameState, Mode, NpcId, PlaceId } from "@/game/types";
import { buildWorld, type Collider } from "@/game/world";

const NPCS: NpcId[] = ["mara", "ellis", "theo", "jun", "idris"];
const RADIUS = 0.34;

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getCameraYaw: () => number;
      getFun: () => number;
      setPositionForQA: ((x: number, z: number) => void) | undefined;
      setTimeForQA: ((minute: number) => void) | undefined;
      restoreVitalsForQA: (() => void) | undefined;
      setSceneForQA: ((place: PlaceId, x: number, z: number) => void) | undefined;
      getSpeed: () => number;
      getPosition: () => { x: number; z: number };
      getHumanQA: () => Record<string, { status: string; motion: string; visible: boolean }>;
      getRenderQA: () => { draws: number; triangles: number; textures: number; geometries: number; sceneNodes: number };
      getSceneCostsQA: () => Array<{ name: string; tris: number; instances: number }>;
      getAssetsQA: (() => Array<{kind:string;x:number;y:number;z:number;loaded:boolean; bounds?:{minX:number;minY:number;minZ:number;maxX:number;maxY:number;maxZ:number}}>) | undefined;
      getCollidersQA: (() => Record<PlaceId, Collider[]>) | undefined;
      getActionsQA: (() => Array<{id:string;place:PlaceId;x:number;z:number;r:number}>) | undefined;
      getRoomsQA: (() => typeof rooms) | undefined;
      getPlace: () => PlaceId;
      getCameraPosition: () => { x: number; y: number; z: number };
      getTransition: () => { label: string | null; veil: number };
      getInteractionQA: () => { promptId: string | null; promptKind: string | null; busyUntil: number; elapsed: number; mode: Mode; doorPhase: string | null };
      getTouchInput: () => { x: number; y: number; run: boolean; looking: boolean };
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
    x: THREE.MathUtils.clamp(x, CITY_LIMITS.minX, CITY_LIMITS.maxX),
    z: THREE.MathUtils.clamp(z, CITY_LIMITS.minZ, CITY_LIMITS.maxZ),
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
  const coarse = window.matchMedia("(pointer: coarse)").matches || new URLSearchParams(window.location.search).has("mobile-qa");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: "high-performance" });
  const perfEnabled=new URLSearchParams(window.location.search).has("perfqa");
  const perfHud=perfEnabled ? document.createElement("div") : null;
  if(perfHud){
    perfHud.setAttribute("aria-label","Performance measurements");
    perfHud.style.cssText="position:fixed;right:8px;bottom:155px;background:#15202bd9;color:white;padding:6px 9px;border-radius:7px;font:12px monospace;z-index:9999;pointer-events:none";
    perfHud.textContent="FPS: collecting";
    document.body.appendChild(perfHud);
  }
  let fpsFrames=0, fpsTime=0, fpsWorst=0;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const mapSize = coarse ? 512 : 2048;

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

  const loadedSave = loadSaveStatus(localStorage);
  let saved = loadedSave.state;
  let saveIssue: string | null = loadedSave.issue;
  let play: GameState | null = null;
  const preview = freshState("Alex");
  let mode: Mode = "title";
  let speed = 0;
  let camYaw = preview.yaw;
  let camPitch = 0.32;
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
  let doorTransition: { action: Action; phase: "closing" | "opening"; deadline: number } | null = null;
  let lastSaveAttempt = -999;
  const camPos = new THREE.Vector3();
  const camDest = new THREE.Vector3();
  const look = new THREE.Vector3();
  const focus = new THREE.Vector3();

  // A scene switch must never interpolate the camera hundreds of metres across world space.
  function snapCam(s: GameState) {
    const indoor = s.place !== "street";
    const dist = indoor ? 4.15 : 4.55;
    const pitch = indoor ? 0.75 : camPitch;
    const horiz = Math.cos(pitch) * dist;
    const dx = Math.sin(camYaw) * horiz;
    const dz = Math.cos(camYaw) * horiz;
    const clip = camClip(s.x, s.z, s.x + dx, s.z + dz, world.colliders[s.place]);
    camPos.set(s.x + dx * clip, indoor ? 5.3 : 1.15 + Math.sin(pitch) * dist * clip, s.z + dz * clip);
    if (s.place !== "street") {
      const room = rooms[s.place];
      camPos.x = THREE.MathUtils.clamp(camPos.x, room.x0 + 0.32, room.x1 - 0.32);
      camPos.z = THREE.MathUtils.clamp(camPos.z, room.z0 + 0.32, room.z1 - 0.32);
      camPos.y = 5.3;
    }
    camDest.copy(camPos);
    camera.position.copy(camPos);
    camera.fov = indoor ? 68 : 52;
    camera.updateProjectionMatrix();
    camera.lookAt(s.x, 1.25, s.z);
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
      saveError:saveIssue,
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
      district: s.place === "street" ? districtAt(s.x,s.z) : "",
      playerX: s.place === "street" ? s.x : 27,
      playerZ: s.place === "street" ? s.z : 5,
      cityPassportDay: s.cityPassportDay,
      cityPassportVisits: s.cityPassportVisits?.slice(),
      cityPassportClaimed: s.cityPassportClaimed,
      discoveredDistricts: s.discoveredDistricts?.slice(),
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
    lastSaveAttempt=absMinute(play.day,play.minute);
    if (writeSave(play)){
      saved = structuredClone(play);
      saveIssue=null;
    } else {
      saveIssue="Progress could not be saved. Retry or export your recovery data before closing.";
      pushToast("Save failed — storage may be full or blocked.");
      sync(true);
    }
  }

  function begin(state: GameState) {
    play = reconcileIndoorArrival(state);
    if (play.place === "street") discoverAt(play,play.x,play.z);
    doorTransition = null;
    useUi.setState({ veil: 0, transitionLabel: null, prompt: null });
    mode = "play";
    camYaw = play.yaw;
    camPitch = 0.32;
    speed = 0;
    seq = null;
    dialogueNpc = null;
    snapCam(play);
    audio.unlock();
    audio.chime();
    remember();
    sync(true);
  }

  function setMenu(next: "play" | "pause" | "phone") {
    if (!play || (mode!=="play" && mode!=="pause" && mode!=="phone")) return;
    mode=next;
    input.keys.clear();
    input.stickX=0;input.stickY=0;input.runHeld=false;
    input.interactQueued=false;input.phoneQueued=false;input.pauseQueued=false;
    input.lookDx=0;input.lookDy=0;input.pointerLooking=false;
    speed=0;
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
      saveIssue=null;
      saved = null;
      play = null;
      mode = "title";
      sync(true);
    },
    interact: () => triggerInteract(),
    travel: (id) => {
      if (!play || play.place !== "street" || mode !== "phone") return;
      const stop = CITY_STOPS.find((x) => x.id === id);
      if (!stop) return;
      const at = CITY_STOPS.find((p) => Math.hypot(p.x - play!.x,p.z - play!.z) < 5);
      if (at?.id === stop.id) { pushToast("You are already at this stop."); return; }
      if (play.money < 5) { pushToast("Bus fare is $5. Earn some money first."); return; }
      play.money -= 5;
      const notes = advance(play, 18, 0.65);
      showNotes(notes);
      play.x = stop.x; play.z = stop.z; play.yaw = stop.yaw;
      const discovery = discoverAt(play,play.x,play.z);
      if (discovery) pushToast(discovery);
      camYaw = stop.yaw; camPitch = 0.32; speed = 0; busyUntil = elapsed + 0.35;
      snapCam(play);
      useUi.setState({ veil: 1, prompt: null });
      window.setTimeout(() => useUi.setState({ veil: 0 }), 350);
      mode = "play";
      pushToast("Transit to " + stop.name + " · -$5");
      remember();sync(true);
    },
    openPhone: () => setMenu(mode==="phone"?"play":"phone"),
    closePhone: () => setMenu("play"),
    pause: () => setMenu(mode==="pause"?"play":"pause"),
    resume: () => setMenu("play"),
    quit: () => {
      remember();
      play = null;
      mode = "title";
      speed = 0;
      sync(true);
    },
    retrySave: () => { remember(); sync(true); },
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
    if (!play || mode !== "play" || elapsed < busyUntil || doorTransition) return;
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
    if (parseDoorAction(action.id)) {
      // Fade OUT on the old scene before changing the world, then snap the camera.
      doorTransition = { action, phase: "closing", deadline: performance.now() + 280 };
      speed = 0;
      input.interactQueued = false;
      input.lookDx = 0;
      input.lookDy = 0;
      promptId = null;
      promptKind = null;
      useUi.setState({ veil: 1, prompt: null, transitionLabel: doorTransitionLabel(action.id) });
      return;
    }
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
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.75);
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
    getCameraYaw: () => camYaw,
    getFun: () => sim().needs.fun,
    // Deterministic QA setup only; never enabled in the regular gameplay URL.
    setPositionForQA: new URLSearchParams(window.location.search).has("touchqa") ? (x, z) => { if (play) { play.x = x; play.z = z; } } : undefined,
    setSceneForQA: new URLSearchParams(window.location.search).has("touchqa") ? (place, x, z) => {
      if (!play) return;
      play.place = place;
      play.x = x;
      play.z = z;
      play.yaw = 0;
      camYaw = 0;
      speed = 0;
      busyUntil = 0;
      doorTransition = null;
      promptId = null;
      promptKind = null;
      useUi.setState({ veil: 0, transitionLabel: null, prompt: null });
      snapCam(play);
      sync(true);
    } : undefined,
    setTimeForQA: new URLSearchParams(window.location.search).has("touchqa") ? (minute) => {
      if (!play || !Number.isFinite(minute)) return;
      play.minute = Math.min(1439, Math.max(0, Math.floor(minute)));
      sync(true);
    } : undefined,
    restoreVitalsForQA: new URLSearchParams(window.location.search).has("touchqa") ? () => {
      if (!play) return;
      for (const k of ["energy","hunger","hygiene","social","fun"] as const) play.needs[k] = 95;
      play.collapseAt = -9999;
      sync(true);
    } : undefined,
    getSpeed: () => speed,
    getPosition: () => ({ x: sim().x, z: sim().z }),
    getHumanQA: () => {
      const stats: Record<string, { status: string; motion: string; visible: boolean }> = {};
      for (const [key, actor] of [["player", player] as const, ...NPCS.map(id => [id, npcs[id]] as const)]) {
        stats[key] = { status: actor.humanStatus(), motion: actor.humanAnimation(), visible: actor.group.visible };
      }
      return stats;
    },
    getRenderQA: () => ({ draws: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, sceneNodes: scene.children.length }),
    getSceneCostsQA: () => {
      const items: Array<{ name: string; tris: number; instances: number }> = [];
      if (!new URLSearchParams(window.location.search).has("touchqa")) return items;
      scene.traverse(node => {
        if (!(node as THREE.Mesh).isMesh || !node.visible) return;
        const mesh = node as THREE.Mesh;
        const geometry = mesh.geometry;
        if (!geometry) return;
        const tris = (geometry.index ? geometry.index.count : geometry.getAttribute("position")?.count ?? 0) / 3;
        const instances = (mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh).count : 1;
        items.push({name: mesh.name || mesh.parent?.name || "(unnamed)", tris: Math.round(tris * instances), instances});
      });
      return items.sort((a,b)=>b.tris-a.tris).slice(0,32);
    },
    getAssetsQA: new URLSearchParams(window.location.search).has("touchqa") ? () => {
      const items: Array<{kind:string;x:number;y:number;z:number;loaded:boolean;bounds?:{minX:number;minY:number;minZ:number;maxX:number;maxY:number;maxZ:number}}>=[];
      scene.updateMatrixWorld(true);
      scene.traverse(node=>{
        const p=node.userData.placement as {kind:string;x:number;y:number;z:number} | undefined;
        if(!p)return;
        const meshes: THREE.Mesh[]=[];
        node.traverse(desc=>{if((desc as THREE.Mesh).isMesh)meshes.push(desc as THREE.Mesh);});
        const loaded=meshes.length>0;
        const item: typeof items[number]={...p,loaded};
        if(loaded){
          const b=new THREE.Box3().setFromObject(node);
          item.bounds={minX:b.min.x,minY:b.min.y,minZ:b.min.z,maxX:b.max.x,maxY:b.max.y,maxZ:b.max.z};
        }
        items.push(item);
      });
      return items;
    } : undefined,
    getCollidersQA: new URLSearchParams(window.location.search).has("touchqa") ? () => world.colliders : undefined,
    getActionsQA: new URLSearchParams(window.location.search).has("touchqa")
      ? () => actions.map(a=>({id:a.id,place:a.place,x:a.x,z:a.z,r:a.r})) : undefined,
    getRoomsQA: new URLSearchParams(window.location.search).has("touchqa") ? () => rooms : undefined,
    getPlace: () => sim().place,
    getCameraPosition: () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z }),
    getTransition: () => ({ label: useUi.getState().transitionLabel, veil: useUi.getState().veil }),
    getInteractionQA: () => ({ promptId, promptKind, busyUntil, elapsed, mode, doorPhase: doorTransition?.phase ?? null }),
    getTouchInput: () => ({ x: input.stickX, y: input.stickY, run: input.runHeld, looking: input.pointerLooking }),
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

    if (doorTransition && play && performance.now() >= doorTransition.deadline) {
      if (doorTransition.phase === "closing") {
        const result = doorTransition.action.run(play);
        showNotes(result.notes);
        camYaw = play.yaw;
        camPitch = play.place === "street" ? 0.32 : 0.35;
        speed = 0;
        input.keys.clear();
        input.stickX = 0;
        input.stickY = 0;
        input.runHeld = false;
        input.interactQueued = false;
        input.pointerLooking = false;
        input.lookDx = 0;
        input.lookDy = 0;
        promptId = null;
        promptKind = null;
        useUi.setState({ prompt: null });
        snapCam(play);
        remember();
        busyUntil = elapsed + 0.16;
        doorTransition = { ...doorTransition, phase: "opening", deadline: performance.now() + 370 };
        useUi.setState({ veil: 0 });
        sync(true);
      } else {
        doorTransition = null;
        busyUntil = elapsed; // exit is outside the entrance radius, so no artificial input dead time
        useUi.setState({ transitionLabel: null });
      }
    }
    const title = mode === "title" || !play;

    if (!title && play && (mode==="play" || mode==="pause" || mode==="phone")) {
      if (input.phoneQueued) setMenu(mode==="phone"?"play":"phone");
      else if (input.pauseQueued) setMenu(mode==="play"?"pause":"play");
    }
    input.phoneQueued=false;
    input.pauseQueued=false;

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

    const canMove = !!play && mode === "play" && elapsed >= busyUntil && !seq && !doorTransition;
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
        if (play.place === "street") {
          const discovery = discoverAt(play,play.x,play.z);
          if (discovery) { pushToast(discovery); remember(); }
        }
        if (move.run) play.needs.energy = Math.max(0, play.needs.energy - 6 * dt * (2.2 / 60));
        audio.foot(elapsed * 1000);
      } else if (speed < 0.05) speed = 0;

      const flow = 2.15 * dt;
      const notes = advance(play, flow, 1);
      if (notes.length) showNotes(notes);
      const nowAbs = absMinute(play.day, play.minute);
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

      if (Math.floor(nowAbs) - Math.floor(lastSaveAttempt) > 12) remember();
    } else {
      input.interactQueued = false;
      speed += (0 - speed) * Math.min(1, dt * 6);
      if (!title && play && mode === "play") {
        /* paused by busy */
      }
    }

    if (play && mode === "play" && !doorTransition) {
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
      actor.update(dt, post.speed ?? 0, elapsed);
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
      const dist = indoor ? 4.15 : 4.55;
      const pitchUse = indoor ? 0.75 : camPitch;
      const horiz = Math.cos(pitchUse) * dist;
      const yLift = Math.sin(pitchUse) * dist;
      const wantX = play.x + Math.sin(camYaw) * horiz;
      const wantZ = play.z + Math.cos(camYaw) * horiz;
      const clip = camClip(play.x, play.z, wantX, wantZ, world.colliders[play.place]);
      const destX = play.x + (wantX - play.x) * clip;
      const destZ = play.z + (wantZ - play.z) * clip;
      const destY = indoor ? 5.3 : 1.15 + yLift * clip;
      camDest.set(destX, destY, destZ);
      if (indoor) {
        const room = rooms[play.place as Exclude<PlaceId, "street">];
        camDest.x = THREE.MathUtils.clamp(camDest.x, room.x0 + 0.32, room.x1 - 0.32);
        camDest.z = THREE.MathUtils.clamp(camDest.z, room.z0 + 0.32, room.z1 - 0.32);
      }
      const wantedFov = indoor ? 68 : 52;
      if (camera.fov !== wantedFov) {
        camera.fov = wantedFov;
        camera.updateProjectionMatrix();
      }
      if (camPos.lengthSq() < 0.01) camPos.copy(camDest);
      camPos.lerp(camDest, 1 - Math.exp(-6 * dt));
      camera.position.copy(camPos);
      look.set(play.x, 1.25, play.z);
      camera.lookAt(look);
      focus.set(play.x, 1, play.z);
    }

    // The clock and daily simulation continue, but the scene never becomes night.
    const sky = PERMANENT_DAYLIGHT;
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
    if(perfHud){
      fpsFrames++;fpsTime+=dt;fpsWorst=Math.max(fpsWorst,dt);
      if(fpsTime>=2){
        const fps=Math.round(fpsFrames/fpsTime);
        perfHud.textContent=`FPS ~${fps} | worst ${(fpsWorst*1000).toFixed(0)}ms | draws ${renderer.info.render.calls} | tris ${renderer.info.render.triangles} | textures ${renderer.info.memory.textures}`;
        fpsFrames=0;fpsTime=0;fpsWorst=0;
      }
    }
  });

  useUi.setState({ ready: true, hasSave: !!saved, saveError:saveIssue, mode: "title" });

  return () => {
    renderer.setAnimationLoop(null);
    timer.dispose();
    ro.disconnect();
    window.removeEventListener("pagehide", onPageHide);
    detachInput();
    audio.dispose();
    player.dispose();
    for (const id of NPCS) npcs[id].dispose();
    world.dispose();
    disposeActorMaterials();
    renderer.dispose();
    perfHud?.remove();
    bindGame({
      startNew: () => {},
      continue: () => {},
      newLife: () => {},
      interact: () => {},
      travel: () => {},
      openPhone: () => {},
      closePhone: () => {},
      pause: () => {},
      resume: () => {},
      quit: () => {},
      choose: () => {},
      retrySave: () => {},
    });
    delete window.__controlsTest;
  };
}