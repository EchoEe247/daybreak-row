const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export function weekday(day: number) {
  return DAYS[((day - 1) % 7 + 7) % 7];
}

export function clockLabel(minute: number) {
  const m = ((Math.floor(minute) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${min.toString().padStart(2, "0")} ${ap}`;
}

export function hourOf(minute: number) {
  return (((minute % 1440) + 1440) % 1440) / 60;
}

export function absMinute(day: number, minute: number) {
  return (day - 1) * 1440 + minute;
}

type SkyKey = {
  t: number;
  zenith: string;
  horizon: string;
  exposure: number;
  stars: number;
};

const SKY: SkyKey[] = [
  { t: 0, zenith: "#070b16", horizon: "#1a140f", exposure: 0.46, stars: 1 },
  { t: 5, zenith: "#10182a", horizon: "#3a241c", exposure: 0.52, stars: 0.75 },
  { t: 6.3, zenith: "#355883", horizon: "#f0a06a", exposure: 0.9, stars: 0 },
  { t: 8, zenith: "#6ea0d4", horizon: "#f3d7b8", exposure: 1.05, stars: 0 },
  { t: 12.5, zenith: "#3f8ed4", horizon: "#d7e7f6", exposure: 1.08, stars: 0 },
  { t: 16.6, zenith: "#5b7eb8", horizon: "#f2c39a", exposure: 1.02, stars: 0 },
  { t: 18.5, zenith: "#2a3358", horizon: "#e36a3a", exposure: 0.84, stars: 0.05 },
  { t: 20.2, zenith: "#12182a", horizon: "#5a2e2a", exposure: 0.52, stars: 0.65 },
  { t: 24, zenith: "#070b16", horizon: "#1a140f", exposure: 0.46, stars: 1 },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpHex(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export type SkySample = {
  zenith: string;
  horizon: string;
  exposure: number;
  stars: number;
  lamp: number;
  elev: number;
  sun: { x: number; y: number; z: number };
};

export function sampleSky(minute: number): SkySample {
  const h = hourOf(minute);
  let i = 0;
  while (i < SKY.length - 2 && h > SKY[i + 1].t) i += 1;
  const a = SKY[i];
  const b = SKY[i + 1];
  const t = Math.min(1, Math.max(0, (h - a.t) / (b.t - a.t)));
  const ang = ((h - 6.2) / 13.2) * Math.PI;
  const elev = Math.sin(ang);
  const x = Math.cos(ang);
  const z = Math.sin(ang) * 0.42;
  const y = Math.max(0.05, elev);
  const len = Math.hypot(x, y, z) || 1;
  const lamp = elev < 0.05 ? 1 : elev < 0.28 ? (0.28 - elev) / 0.23 : 0;
  return {
    zenith: lerpHex(a.zenith, b.zenith, t),
    horizon: lerpHex(a.horizon, b.horizon, t),
    exposure: a.exposure + (b.exposure - a.exposure) * t,
    stars: a.stars + (b.stars - a.stars) * t,
    lamp,
    elev,
    sun: { x: x / len, y: y / len, z: z / len },
  };
}

export function placeLabel(place: string) {
  switch (place) {
    case "home":
      return "Apartment 2B";
    case "cafe":
      return "Harbor Cafe";
    case "market":
      return "Cho's Market";
    case "office":
      return "Northline Office";
    default:
      return "Daybreak Row";
  }
}
