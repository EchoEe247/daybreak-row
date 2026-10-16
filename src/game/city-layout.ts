/** Connected city geography. Preserve the original Daybreak Row street and interior coordinates. */
export const CITY_LIMITS = { minX: -38, maxX: 190, minZ: -154, maxZ: 20.12 } as const;
export const AVENUES = [55, 95, 135, 175] as const;
export const CROSS_STREETS = [0, -42, -84, -126] as const;
export const DISTRICTS = [
  { id: "harbor", name: "Daybreak Row", subtitle: "Harbor homes, cafe, market and pier", x: 25, z: 5 },
  { id: "old-town", name: "Old Town", subtitle: "Town hall, gardens and neighborhood shops", x: 58, z: -7 },
  { id: "civic", name: "Civic Quarter", subtitle: "Library, hospital and public square", x: 97, z: -43 },
  { id: "downtown", name: "Downtown", subtitle: "High-rises, offices and food court", x: 137, z: -85 },
  { id: "arts", name: "Arts & Station", subtitle: "Gallery, amphitheater and rail station", x: 177, z: -125 },
] as const;
export type DistrictId = (typeof DISTRICTS)[number]["id"];

export type Stop = { id: DistrictId; name: string; x: number; z: number; yaw: number };
export const CITY_STOPS: Stop[] = [
  { id: "harbor", name: "Harbor Stop", x: 27, z: 5, yaw: 0.5 },
  { id: "old-town", name: "Old Town Plaza", x: 49, z: -6, yaw: 0.4 },
  { id: "civic", name: "Civic Center", x: 98, z: -36, yaw: -0.2 },
  { id: "downtown", name: "Skyline Square", x: 138, z: -78, yaw: 0.93 },
  { id: "arts", name: "Arts Station", x: 178, z: -118, yaw: 1.2 },
];

export const CITY_SITES = [
  { id: "townhall", name: "City Hall", x: 71, z: -8, detail: "Civic Square" },
  { id: "foodcart", name: "Market Food Cart", x: 84, z: -8, detail: "$9 hot lunch" },
  { id: "library", name: "Public Library", x: 111, z: -8, detail: "Free reading room" },
  { id: "busking", name: "Music Plaza", x: 128, z: -46, detail: "Open-air performance" },
  { id: "hospital", name: "Community Clinic", x: 109, z: -88, detail: "A place to recharge" },
  { id: "office", name: "Downtown Offices", x: 145, z: -48, detail: "Contract shift" },
  { id: "gallery", name: "City Gallery", x: 147, z: -88, detail: "Free exhibition" },
  { id: "station", name: "Central Station", x: 164, z: -128, detail: "Rail concourse" },
] as const;

export function districtAt(x: number, z: number): string {
  if (x < 43 && z > -23) return "Daybreak Row";
  if (x < 92 && z > -65) return "Old Town";
  if (x < 134 && z > -90) return "Civic Quarter";
  if (x < 172 && z > -100) return "Downtown";
  if (z < -95 || x >= 172) return "Arts & Station";
  return "Midtown";
}
export function isInsideCity(x: number, z: number) {
  return Number.isFinite(x) && Number.isFinite(z) && x >= CITY_LIMITS.minX && x <= CITY_LIMITS.maxX && z >= CITY_LIMITS.minZ && z <= CITY_LIMITS.maxZ;
}
export function transitFare(from: DistrictId, to: DistrictId) { return from === to ? 0 : 5; }