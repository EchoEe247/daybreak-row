/** Screen-space virtual thumbstick used by touch controls. No DOM dependencies. */
export type StickVector = { x: number; y: number; thumbX: number; thumbY: number };
const ZERO: StickVector = { x: 0, y: 0, thumbX: 0, thumbY: 0 };
export function stickFromDelta(dx: number, dy: number, radius: number, deadzone = 0.14): StickVector {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(radius) || radius <= 0) return { ...ZERO };
  const d = Math.hypot(dx, dy);
  const capped = Math.min(d, radius);
  const thumbScale = d > radius ? radius / d : 1;
  const mag = Math.max(0, (capped / radius - deadzone) / (1 - deadzone));
  const scale = d > 0 ? mag / d : 0;
  return {
    x: mag > 0 && dx !== 0 ? dx * scale : 0,
    y: mag > 0 && dy !== 0 ? -dy * scale : 0,
    thumbX: dx * thumbScale,
    thumbY: dy * thumbScale,
  };
}

export class VirtualStick {
  private id: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private radius = 1;
  get pointerId() { return this.id; }
  begin(id: number, centerX: number, centerY: number, radius: number, x: number, y: number): StickVector | null {
    if (this.id !== null) return null;
    this.id = id;
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;
    return this.move(id, x, y);
  }
  move(id: number, x: number, y: number): StickVector | null {
    if (this.id !== id) return null;
    return stickFromDelta(x - this.centerX, y - this.centerY, this.radius);
  }
  end(id: number): StickVector | null {
    if (this.id !== id) return null;
    this.id = null;
    return { ...ZERO };
  }
  reset(): StickVector {
    this.id = null;
    return { ...ZERO };
  }
}