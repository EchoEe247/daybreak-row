import { rooms, type RoomId } from "./layout.ts";

export const DOOR_NAMES: Record<RoomId, string> = {
  home: "Apartment 2B",
  cafe: "Harbor Cafe",
  market: "Cho's Market",
  office: "Northline Office",
  bakery: "Old Town Bakery",
  gym: "Civic Fitness",
  cinema: "Metro Cinema",
  bookshop: "Corner Books",
};

export type DoorAction = { building: RoomId; direction: "enter" | "exit" };

export function parseDoorAction(id: string): DoorAction | null {
  const match = /^(enter|exit)-(home|cafe|market|office|bakery|gym|cinema|bookshop)$/.exec(id);
  if (!match) return null;
  return { direction: match[1] as DoorAction["direction"], building: match[2] as RoomId };
}

export function doorTransitionLabel(id: string) {
  const action = parseDoorAction(id);
  if (!action) return null;
  return action.direction === "enter" ? `Entering ${DOOR_NAMES[action.building]}` : `Leaving ${DOOR_NAMES[action.building]}`;
}

/** Legacy saves spawned immediately beside the exit. Move only those positions to the room's safe arrival area. */
export function reconcileIndoorArrival<T extends { place: string; x: number; z: number }>(state: T): T {
  if (!(state.place in rooms)) return state;
  const room = rooms[state.place as RoomId];
  if (Math.hypot(state.x - room.door.x, state.z - room.door.z) >= 1.25) return state;
  return { ...state, x: room.spawn.x, z: room.spawn.z };
}