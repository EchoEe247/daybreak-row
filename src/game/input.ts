const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyE",
  "KeyP",
  "Escape",
  "ShiftLeft",
  "ShiftRight",
  "KeyF",
]);

export const input = {
  keys: new Set<string>(),
  stickX: 0,
  stickY: 0,
  runHeld: false,
  interactQueued: false,
  phoneQueued: false,
  pauseQueued: false,
  lookDx: 0,
  lookDy: 0,
  pointerLooking: false,
};

function radialDeadzone(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0, mag: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale, mag: Math.min(1, (m - dz) / (1 - dz)) };
}

let prevPadA = false;

export function readMove() {
  let x = input.stickX;
  let y = input.stickY;
  let kx = 0;
  let ky = 0;
  if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) kx -= 1;
  if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) kx += 1;
  if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) ky += 1;
  if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) ky -= 1;
  if (Math.hypot(x, y) < 0.12) {
    x = kx;
    y = ky;
  } else {
    x += kx;
    y += ky;
  }
  const pads = navigator.getGamepads?.();
  const gp = pads ? pads[0] : null;
  let run = input.runHeld || input.keys.has("ShiftLeft") || input.keys.has("ShiftRight");
  if (!gp || gp.mapping !== "standard") prevPadA = false;
  if (gp && gp.mapping === "standard") {
    const stick = radialDeadzone(gp.axes[0] ?? 0, -(gp.axes[1] ?? 0));
    if (stick.mag > 0.12) {
      x += stick.x;
      y += stick.y;
    }
    if (gp.buttons[7]?.pressed || (gp.buttons[7]?.value ?? 0) > 0.4) run = true;
    const pressed = !!gp.buttons[0]?.pressed;
    if (pressed && !prevPadA) input.interactQueued = true;
    prevPadA = pressed;
  }
  const m = Math.hypot(x, y);
  if (m > 1) {
    x /= m;
    y /= m;
  }
  return { x, y, run, mag: Math.min(1, m) };
}

export function attachInput(canvas: HTMLCanvasElement) {
  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    input.keys.add(e.code);
    if (e.code === "KeyE" || e.code === "Space" || e.code === "KeyF") input.interactQueued = true;
    if (e.code === "KeyP") input.phoneQueued = true;
    if (e.code === "Escape") input.pauseQueued = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    input.keys.delete(e.code);
  };
  const clear = () => {
    input.keys.clear();
    input.runHeld = false;
    input.phoneQueued = false;
    input.pauseQueued = false;
    input.interactQueued = false;
    input.pointerLooking = false;
    input.stickX = 0;
    input.stickY = 0;
    input.lookDx = 0;
    input.lookDy = 0;
    lookId = null;
  };

  let lookId: number | null = null;
  let lastX = 0;
  let lastY = 0;

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (lookId !== null) return; // second finger must not steal camera drag
    e.preventDefault();
    lookId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    input.pointerLooking = true;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointer or unsupported capture */ }
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== lookId) return;
    e.preventDefault();
    input.lookDx += e.clientX - lastX;
    input.lookDy += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== lookId) return;
    lookId = null;
    input.pointerLooking = false;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clear);
  const onVisibilityChange = () => {
    if (document.hidden) clear();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("lostpointercapture", onUp);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", clear);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    canvas.removeEventListener("lostpointercapture", onUp);
    clear();
  };
}