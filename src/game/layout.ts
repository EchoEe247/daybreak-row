/** Shared world coordinates. +Y up, street runs along X, harbor is +Z. */

export const SPAWN = { x: -10, z: 4.2, yaw: 0.62 };

export const apt = { x0: -32, x1: -15, zFront: -8, depth: 11, door: -22, floors: 3 };
export const cafeB = { x0: -13, x1: -1, zFront: -8, depth: 10, door: -6.4, floors: 2 };
export const officeB = { x0: 2, x1: 17, zFront: -8, depth: 12, door: 8.2, floors: 3 };
export const marketB = { x0: -31, x1: -14, zFront: 8, depth: 10, door: -21, floors: 1 };

export const pier = { x0: 2.15, x1: 6.55, z0: 19.6, z1: 31.5 };

export type RoomId = "home" | "cafe" | "market" | "office" | "bakery" | "gym" | "cinema" | "bookshop" | "laundry";

export type Room = {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  spawn: { x: number; z: number; yaw: number };
  exit: { x: number; z: number; yaw: number };
  door: { x: number; z: number };
};

export const rooms: Record<RoomId, Room> = {
  home: {
    x0: -3.55,
    x1: 3.55,
    z0: 420.25,
    z1: 427.05,
    spawn: { x: 1.35, z: 425.1, yaw: 0 },
    exit: { x: apt.door, z: apt.zFront + 2.8, yaw: Math.PI },
    door: { x: 0, z: 426.35 },
  },
  cafe: {
    x0: -4.4,
    x1: 4.4,
    z0: 520.25,
    z1: 528.1,
    spawn: { x: 0, z: 524.0, yaw: 0 },
    exit: { x: cafeB.door, z: cafeB.zFront + 2.8, yaw: Math.PI },
    door: { x: 0, z: 527.35 },
  },
  market: {
    x0: -4.1,
    x1: 4.1,
    z0: 620.25,
    z1: 627.4,
    spawn: { x: -0.4, z: 624.6, yaw: 0 },
    exit: { x: marketB.door, z: marketB.zFront - 2.8, yaw: 0 },
    door: { x: -0.2, z: 626.7 },
  },
  office: {
    x0: -5.1,
    x1: 5.1,
    z0: 720.25,
    z1: 729.2,
    spawn: { x: 0, z: 725.5, yaw: 0 },
    exit: { x: officeB.door, z: officeB.zFront + 2.8, yaw: Math.PI },
    door: { x: 0.4, z: 728.4 },
  },
  bakery: {
    x0: -4.55, x1: 4.55, z0: 820.25, z1: 828.1,
    spawn: { x: 0.6, z: 824.2, yaw: 0 },
    exit: { x: 82, z: -43.5, yaw: Math.PI },
    door: { x: 0, z: 827.3 },
  },
  gym: {
    x0: -5.4, x1: 5.4, z0: 920.25, z1: 929.3,
    spawn: { x: 0.5, z: 925.4, yaw: 0 },
    exit: { x: 122, z: -43.5, yaw: Math.PI },
    door: { x: 0, z: 928.4 },
  },
  cinema: {
    x0: -5.8, x1: 5.8, z0: 1020.25, z1: 1029.25,
    spawn: { x: -0.5, z: 1025.1, yaw: 0 },
    exit: { x: 148, z: -43.5, yaw: Math.PI },
    door: { x: 0, z: 1028.5 },
  },
  bookshop: {
    x0: -5.0, x1: 5.0, z0: 1120.25, z1: 1128.35,
    spawn: { x: 0.6, z: 1124.8, yaw: 0 },
    exit: { x: 108, z: -98.4, yaw: Math.PI },
    door: { x: 0, z: 1127.55 },
  },
  laundry: {
    x0: -5.15, x1: 5.15, z0: 1220.25, z1: 1228.45,
    spawn: { x: 0.2, z: 1225.3, yaw: 0 },
    exit: { x: 82, z: -84.5, yaw: Math.PI },
    door: { x: 0, z: 1227.7 },
  },
};

export const anchors = {
  junStoop: { x: -16.4, z: -6.45, yaw: Math.PI },
  junPark: { x: 7.2, z: 13.4, yaw: 0.4 },
  maraDoor: { x: cafeB.door + 0.9, z: cafeB.zFront + 1.45, yaw: Math.PI },
  maraCounter: { x: 0.8, z: 521.35, yaw: Math.PI },
  ellis: { x: 2.55, z: 625.55, yaw: Math.PI },
  theo: { x: -2.3, z: 722.4, yaw: 0.2 },
  idris: { x: 4.35, z: 27.2, yaw: Math.PI },
  bench: { x: 1.4, z: 12.15 },
  pierLook: { x: 4.3, z: 28.4 },
  fridge: { x: 2.45, z: 423.55 },
  stove: { x: 1.35, z: 423.55 },
  shower: { x: 2.45, z: 421.55 },
  bed: { x: -2.05, z: 422.15 },
  desk: { x: -2.35, z: 424.55 },
  sofa: { x: -0.15, z: 423.7 },
  coffee: { x: -1.3, z: 522.15 },
  breakfast: { x: 0.2, z: 522.2 },
  groceries: { x: -2.2, z: 623.1 },
  snack: { x: 1.5, z: 625.2 },
  shift: { x: 3.35, z: 727.15 },
  cooler: { x: 4.15, z: 723.1 },
};