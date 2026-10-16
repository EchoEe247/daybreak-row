import { DIALOGUE, greetingNode, NPC_META, type Fx } from "@/game/content";
import { anchors, cafeB, marketB, officeB, rooms, SPAWN } from "@/game/layout";
import { absMinute, hourOf, weekday } from "@/game/time";
import type { GameState, GoalId, NeedId, NpcId, PlaceId } from "@/game/types";

export const NEED_IDS: NeedId[] = ["energy", "hunger", "hygiene", "social", "fun"];
const FIRST: GoalId[] = ["shower", "meal", "earn", "groceries", "talk", "sleep"];

export type Note = { toast?: string; caption?: string; log?: string };

export function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

export function freshState(name: string): GameState {
  const cleaned = name.trim().slice(0, 16) || "Alex";
  return {
    version: 1,
    name: cleaned,
    day: 1,
    minute: 7 * 60 + 12,
    money: 186,
    food: 1,
    needs: { energy: 76, hunger: 64, hygiene: 58, social: 46, fun: 57 },
    rel: { mara: 6, ellis: 4, theo: 3, jun: 10, idris: 0 },
    goals: {
      shower: false,
      meal: false,
      earn: false,
      groceries: false,
      talk: false,
      sleep: false,
      cushion: false,
      friend: false,
      rhythm: false,
      goodHour: false,
    },
    log: ["You unlocked 2B with a key that still feels borrowed."],
    place: "street",
    x: SPAWN.x,
    z: SPAWN.z,
    yaw: SPAWN.yaw,
    rentMark: 0,
    shiftDay: 0,
    freelanceAt: 0,
    collapseAt: -9999,
    welcomed: false,
  };
}

function pushLog(s: GameState, line: string) {
  s.log = [line, ...s.log].slice(0, 16);
}

export function evaluate(s: GameState): string | null {
  const n = s.needs;
  if (NEED_IDS.every((k) => n[k] >= 55)) s.goals.goodHour = true;
  if (s.money >= 400) s.goals.cushion = true;
  if ((Object.values(s.rel) as number[]).some((v) => v >= 60)) s.goals.friend = true;
  if (s.day >= 3) s.goals.rhythm = true;
  if (!s.welcomed && FIRST.every((id) => s.goals[id])) {
    s.welcomed = true;
    pushLog(s, "First week, done. The row knows your step.");
    return "The row fits. First week, done.";
  }
  return null;
}

function decay(s: GameState, minutes: number) {
  const h = minutes / 60;
  const extra = s.needs.hunger < 12 ? 2.4 : 0;
  s.needs.hunger -= 7.6 * h;
  s.needs.energy -= (3.5 + extra) * h;
  s.needs.hygiene -= 2.55 * h;
  s.needs.social -= 1.85 * h;
  s.needs.fun -= 2.75 * h;
  for (const k of NEED_IDS) s.needs[k] = clamp(s.needs[k]);
}

function onNewDay(s: GameState, notes: Note[]) {
  if (s.day >= 3) s.goals.rhythm = true;
  const week = Math.floor((s.day - 1) / 7);
  if (weekday(s.day) === "Monday" && s.day > 1 && s.rentMark < week) {
    s.money -= 80;
    s.rentMark = week;
    const line =
      s.money >= 0
        ? "Monday. Rent took $80. You're still housed."
        : "Monday. Rent took $80 and left you short.";
    pushLog(s, line);
    notes.push({ toast: line, log: line });
    if (s.money < 0) s.needs.fun = clamp(s.needs.fun - 10);
  }
}

export function advance(s: GameState, minutes: number, decayScale = 1): Note[] {
  const notes: Note[] = [];
  let left = Math.max(0, minutes);
  while (left > 0.0001) {
    const room = Math.max(0.0001, 1440 - s.minute);
    const step = Math.min(left, room);
    decay(s, step * decayScale);
    s.minute += step;
    left -= step;
    if (s.minute >= 1439.999) {
      s.minute = 0;
      s.day += 1;
      onNewDay(s, notes);
    }
  }
  const welcome = evaluate(s);
  if (welcome) notes.push({ toast: welcome });
  return notes;
}

export function cafeOpen(s: GameState) {
  const h = hourOf(s.minute);
  return h >= 7 && h < 19;
}

export function marketOpen(s: GameState) {
  const h = hourOf(s.minute);
  return h >= 8 && h < 20;
}

export function officeOpen(s: GameState) {
  const d = weekday(s.day);
  const h = hourOf(s.minute);
  if (d === "Sunday") return false;
  if (d === "Saturday") return h >= 10 && h < 14;
  return h >= 8 && h < 18;
}

export type NpcPost = {
  x: number;
  z: number;
  yaw: number;
  place: PlaceId;
  visible: boolean;
};

export function npcWhere(s: GameState): Record<NpcId, NpcPost> {
  const h = hourOf(s.minute);
  const maraOpen = cafeOpen(s);
  const market = marketOpen(s);
  const office = officeOpen(s);
  const mara: NpcPost =
    s.place === "cafe" && maraOpen
      ? { ...anchors.maraCounter, place: "cafe", visible: true }
      : s.place === "street" && h >= 7 && h < 8.25
        ? { ...anchors.maraDoor, place: "street", visible: true }
        : { ...anchors.maraCounter, place: "cafe", visible: false };
  const ellis: NpcPost = {
    ...anchors.ellis,
    place: "market",
    visible: s.place === "market" && market,
  };
  const theo: NpcPost = {
    ...anchors.theo,
    place: "office",
    visible: s.place === "office" && office,
  };
  let jun: NpcPost = { ...anchors.junStoop, place: "street", visible: false };
  if (s.place === "street" && h >= 7 && h < 9.5) jun = { ...anchors.junStoop, place: "street", visible: true };
  else if (s.place === "street" && h >= 16.5 && h < 20.5) jun = { ...anchors.junPark, place: "street", visible: true };
  const idris: NpcPost = {
    ...anchors.idris,
    place: "street",
    visible: s.place === "street" && ((h >= 8 && h < 12) || (h >= 14.5 && h < 19)),
  };
  return { mara, ellis, theo, jun, idris };
}

function pay(s: GameState, cost: number, notes: Note[]) {
  if (s.money < cost) {
    notes.push({ toast: `You need $${cost}. You're holding $${Math.floor(s.money)}.` });
    return false;
  }
  s.money -= cost;
  return true;
}

function enter(s: GameState, id: "home" | "cafe" | "market" | "office") {
  const room = rooms[id];
  s.place = id;
  s.x = room.spawn.x;
  s.z = room.spawn.z;
  s.yaw = room.spawn.yaw;
}

function exit(s: GameState, id: "home" | "cafe" | "market" | "office") {
  const room = rooms[id];
  s.place = "street";
  s.x = room.exit.x;
  s.z = room.exit.z;
  s.yaw = room.exit.yaw;
}

export type Action = {
  id: string;
  place: PlaceId;
  x: number;
  z: number;
  r: number;
  label: (s: GameState) => string;
  run: (s: GameState) => { notes: Note[]; teleport: boolean; seq: null | "sleep" | "nap" | "shift" };
};

function done(notes: Note[], teleport = false, seq: "sleep" | "nap" | "shift" | null = null) {
  return { notes, teleport, seq };
}

export function buildActions(): Action[] {
  const home = rooms.home;
  const cafe = rooms.cafe;
  const market = rooms.market;
  const office = rooms.office;
  return [
    {
      id: "enter-home",
      place: "street",
      x: aptDoorX(),
      z: -8 + 1.25,
      r: 1.35,
      label: () => "Apartment 2B",
      run: (s) => {
        enter(s, "home");
        return done([{ caption: "The radiator ticks. You're home." }], true);
      },
    },
    {
      id: "exit-home",
      place: "home",
      x: home.door.x,
      z: home.door.z,
      r: 1.2,
      label: () => "Step outside",
      run: (s) => {
        exit(s, "home");
        return done([], true);
      },
    },
    {
      id: "bed",
      place: "home",
      x: anchors.bed.x,
      z: anchors.bed.z,
      r: 1.35,
      label: (s) => (s.needs.energy > 55 && hourOf(s.minute) < 21 && hourOf(s.minute) > 6 ? "Nap" : "Sleep"),
      run: (s) => {
        const nap = s.needs.energy > 50 && hourOf(s.minute) < 21 && hourOf(s.minute) > 6;
        return done([], false, nap ? "nap" : "sleep");
      },
    },
    {
      id: "shower",
      place: "home",
      x: anchors.shower.x,
      z: anchors.shower.z,
      r: 1.15,
      label: () => "Shower",
      run: (s) => {
        s.needs.hygiene = clamp(s.needs.hygiene + 48);
        s.needs.fun = clamp(s.needs.fun + 4);
        s.goals.shower = true;
        const notes = advance(s, 18, 0.8);
        notes.push({ caption: "Hot water, finally.", toast: "Showered. You feel like a person." });
        return done(notes);
      },
    },
    {
      id: "fridge",
      place: "home",
      x: anchors.fridge.x,
      z: anchors.fridge.z,
      r: 1.15,
      label: (s) => (s.food > 0 ? `Fridge · ${s.food} meal${s.food === 1 ? "" : "s"}` : "Fridge · empty"),
      run: (s) => {
        if (s.food <= 0) return done([{ toast: "The fridge is down to a light and a dare. Cho's is across the street." }]);
        s.food -= 1;
        s.needs.hunger = clamp(s.needs.hunger + 36);
        s.goals.meal = true;
        const notes = advance(s, 12);
        notes.push({ toast: "Leftovers. Not glamorous. Enough.", caption: "You eat standing up, which is a choice." });
        return done(notes);
      },
    },
    {
      id: "stove",
      place: "home",
      x: anchors.stove.x,
      z: anchors.stove.z,
      r: 1.15,
      label: () => "Cook",
      run: (s) => {
        if (s.food <= 0) return done([{ toast: "Nothing to cook. The market has bread, eggs, and judgment." }]);
        s.food -= 1;
        s.needs.hunger = clamp(s.needs.hunger + 52);
        s.needs.fun = clamp(s.needs.fun + 8);
        s.goals.meal = true;
        const notes = advance(s, 36);
        notes.push({ toast: "A real meal. The kitchen smells like you live here.", caption: "You cook like someone learning the stove." });
        return done(notes);
      },
    },
    {
      id: "desk",
      place: "home",
      x: anchors.desk.x,
      z: anchors.desk.z,
      r: 1.2,
      label: () => "Freelance · +$26",
      run: (s) => {
        const now = absMinute(s.day, s.minute);
        if (now < s.freelanceAt) return done([{ toast: "The inbox can wait a little. You just invoiced." }]);
        if (s.needs.energy < 18) return done([{ toast: "Your eyes won't focus. Rest first." }]);
        s.money += 26;
        s.needs.energy = clamp(s.needs.energy - 16);
        s.needs.fun = clamp(s.needs.fun - 4);
        s.needs.hunger = clamp(s.needs.hunger - 6);
        s.goals.earn = true;
        s.freelanceAt = now + 70;
        const notes = advance(s, 80);
        notes.push({ toast: "Freelance paid $26.", caption: "You invoice a small thing before it becomes a big one.", log: "Invoiced a small job. +$26." });
        if (notes[notes.length - 1].log) pushLog(s, notes[notes.length - 1].log!);
        return done(notes);
      },
    },
    {
      id: "sofa",
      place: "home",
      x: anchors.sofa.x,
      z: anchors.sofa.z,
      r: 1.2,
      label: () => "Sit a while",
      run: (s) => {
        s.needs.energy = clamp(s.needs.energy + 10);
        s.needs.fun = clamp(s.needs.fun + 8);
        const notes = advance(s, 22, 0.7);
        notes.push({ caption: "The sofa knows more than the chair at work." });
        return done(notes);
      },
    },
    {
      id: "enter-cafe",
      place: "street",
      x: cafeB.door,
      z: cafeB.zFront + 1.25,
      r: 1.35,
      label: (s) => (cafeOpen(s) ? "Harbor Cafe" : "Harbor Cafe · closed"),
      run: (s) => {
        if (!cafeOpen(s)) return done([{ toast: "Harbor Cafe is dark. Mara opens at 7." }]);
        enter(s, "cafe");
        return done([{ caption: "Coffee, plates, and the low sound of people not hurrying." }], true);
      },
    },
    {
      id: "exit-cafe",
      place: "cafe",
      x: cafe.door.x,
      z: cafe.door.z,
      r: 1.2,
      label: () => "Step outside",
      run: (s) => {
        exit(s, "cafe");
        return done([], true);
      },
    },
    {
      id: "coffee",
      place: "cafe",
      x: anchors.coffee.x,
      z: anchors.coffee.z,
      r: 1.25,
      label: () => "Coffee · $4",
      run: (s) => {
        const notes: Note[] = [];
        if (!pay(s, 4, notes)) return done(notes);
        s.needs.energy = clamp(s.needs.energy + 12);
        s.needs.hunger = clamp(s.needs.hunger + 6);
        s.needs.fun = clamp(s.needs.fun + 5);
        s.needs.social = clamp(s.needs.social + 3);
        notes.push(...advance(s, 8));
        notes.push({ toast: "Coffee, $4. Bitter in a useful way.", caption: "The cup warms both hands." });
        return done(notes);
      },
    },
    {
      id: "breakfast",
      place: "cafe",
      x: anchors.breakfast.x,
      z: anchors.breakfast.z,
      r: 1.25,
      label: () => "Breakfast · $11",
      run: (s) => {
        const notes: Note[] = [];
        if (!pay(s, 11, notes)) return done(notes);
        s.needs.hunger = clamp(s.needs.hunger + 40);
        s.needs.energy = clamp(s.needs.energy + 6);
        s.needs.fun = clamp(s.needs.fun + 7);
        s.needs.social = clamp(s.needs.social + 4);
        s.goals.meal = true;
        notes.push(...advance(s, 22));
        notes.push({ toast: "Breakfast, $11. You needed that.", caption: "Eggs, toast, and a table by the window." });
        return done(notes);
      },
    },
    {
      id: "enter-market",
      place: "street",
      x: marketB.door,
      z: marketB.zFront - 1.3,
      r: 1.35,
      label: (s) => (marketOpen(s) ? "Cho's Market" : "Cho's Market · closed"),
      run: (s) => {
        if (!marketOpen(s)) return done([{ toast: "Cho's is shuttered. Ellis opens at 8." }]);
        enter(s, "market");
        return done([{ caption: "Oranges, bread, and a radio turned low." }], true);
      },
    },
    {
      id: "exit-market",
      place: "market",
      x: market.door.x,
      z: market.door.z,
      r: 1.2,
      label: () => "Step outside",
      run: (s) => {
        exit(s, "market");
        return done([], true);
      },
    },
    {
      id: "groceries",
      place: "market",
      x: anchors.groceries.x,
      z: anchors.groceries.z,
      r: 1.3,
      label: () => "Groceries · $14",
      run: (s) => {
        const notes: Note[] = [];
        if (!pay(s, 14, notes)) return done(notes);
        s.food += 3;
        s.goals.groceries = true;
        notes.push(...advance(s, 16));
        notes.push({
          toast: "Groceries, $14. Three meals in the bag.",
          caption: "The bag is heavier than your doubts.",
          log: "Stocked the fridge from Cho's.",
        });
        pushLog(s, "Stocked the fridge from Cho's.");
        return done(notes);
      },
    },
    {
      id: "snack",
      place: "market",
      x: anchors.snack.x,
      z: anchors.snack.z,
      r: 1.2,
      label: () => "Snack · $3",
      run: (s) => {
        const notes: Note[] = [];
        if (!pay(s, 3, notes)) return done(notes);
        s.needs.hunger = clamp(s.needs.hunger + 16);
        s.needs.fun = clamp(s.needs.fun + 3);
        notes.push(...advance(s, 6));
        notes.push({ toast: "A snack. It'll hold you.", caption: "You eat it before you're fully outside." });
        return done(notes);
      },
    },
    {
      id: "enter-office",
      place: "street",
      x: officeB.door,
      z: officeB.zFront + 1.25,
      r: 1.35,
      label: (s) => (officeOpen(s) ? "Northline Office" : "Northline · closed"),
      run: (s) => {
        if (!officeOpen(s)) {
          const why = weekday(s.day) === "Sunday" ? "Northline is dark on Sundays." : "The office is locked. Weekdays 8 to 6.";
          return done([{ toast: why }]);
        }
        enter(s, "office");
        return done([{ caption: "Carpet, monitors, and the particular quiet of people typing." }], true);
      },
    },
    {
      id: "exit-office",
      place: "office",
      x: office.door.x,
      z: office.door.z,
      r: 1.2,
      label: () => "Step outside",
      run: (s) => {
        exit(s, "office");
        return done([], true);
      },
    },
    {
      id: "shift",
      place: "office",
      x: anchors.shift.x,
      z: anchors.shift.z,
      r: 1.3,
      label: (s) => (weekday(s.day) === "Saturday" ? "Half shift · +$52" : "Work a shift · +$78"),
      run: (s) => {
        if (!officeOpen(s)) return done([{ toast: "Nobody here to hand you a badge." }]);
        if (s.shiftDay === s.day) return done([{ toast: "You've already put a shift in today." }]);
        if (s.needs.energy < 22) return done([{ toast: "You'd fall asleep on the keyboard. Rest first." }]);
        return done([], false, "shift");
      },
    },
    {
      id: "cooler",
      place: "office",
      x: anchors.cooler.x,
      z: anchors.cooler.z,
      r: 1.1,
      label: () => "Water cooler",
      run: (s) => {
        s.needs.energy = clamp(s.needs.energy + 4);
        s.needs.fun = clamp(s.needs.fun + 2);
        const notes = advance(s, 5);
        notes.push({ caption: "The cooler gurgles like it's in on the joke." });
        return done(notes);
      },
    },
    {
      id: "bench",
      place: "street",
      x: anchors.bench.x,
      z: anchors.bench.z,
      r: 1.45,
      label: () => "Park bench",
      run: (s) => {
        s.needs.fun = clamp(s.needs.fun + 16);
        s.needs.energy = clamp(s.needs.energy + 7);
        s.needs.social = clamp(s.needs.social + 2);
        const notes = advance(s, 25, 0.75);
        notes.push({ caption: "You sit until your thoughts get bored and leave.", toast: "The bench helps." });
        return done(notes);
      },
    },
    {
      id: "pier",
      place: "street",
      x: anchors.pierLook.x,
      z: anchors.pierLook.z,
      r: 1.6,
      label: () => "Watch the water",
      run: (s) => {
        s.needs.fun = clamp(s.needs.fun + 15);
        s.needs.energy = clamp(s.needs.energy + 4);
        const notes = advance(s, 20, 0.7);
        notes.push({ caption: "The tide doesn't know your name. That's the relief.", toast: "You give the harbor a while." });
        return done(notes);
      },
    },
  ];
}

function aptDoorX() {
  return -22;
}

export function resolveSleep(s: GameState, nap: boolean): Note[] {
  const notes: Note[] = [];
  if (nap) {
    notes.push(...advance(s, 90, 0.45));
    s.needs.energy = clamp(s.needs.energy + 30);
    s.needs.fun = clamp(s.needs.fun + 4);
    notes.push({ toast: "A nap. Ninety minutes you won't get back, and didn't need to.", log: "Napped on the bed." });
    pushLog(s, "Napped on the bed.");
    return notes;
  }
  const toMorning = s.minute <= 7 * 60 + 5 ? 7 * 60 + 5 - s.minute : 1440 - s.minute + 7 * 60 + 5;
  notes.push(...advance(s, toMorning, 0.42));
  s.minute = 7 * 60 + 5;
  s.needs.energy = 100;
  s.needs.hygiene = clamp(s.needs.hygiene - 14);
  s.needs.hunger = clamp(s.needs.hunger - 16);
  s.needs.fun = clamp(s.needs.fun + 6);
  s.goals.sleep = true;
  s.place = "home";
  s.x = rooms.home.spawn.x;
  s.z = rooms.home.spawn.z;
  s.yaw = rooms.home.spawn.yaw;
  const line = `${weekday(s.day)}, ${"morning"}. Light on the ceiling.`;
  pushLog(s, `Slept. Woke ${weekday(s.day)} morning.`);
  notes.push({ toast: line, caption: "You wake in 2B." });
  const welcome = evaluate(s);
  if (welcome) notes.push({ toast: welcome });
  return notes;
}

export function resolveShift(s: GameState): Note[] {
  const saturday = weekday(s.day) === "Saturday";
  const pay = saturday ? 52 : 78;
  const minutes = saturday ? 180 : 240;
  const notes = advance(s, minutes, 1.15);
  s.money += pay;
  s.needs.energy = clamp(s.needs.energy - (saturday ? 20 : 32));
  s.needs.hunger = clamp(s.needs.hunger - (saturday ? 8 : 14));
  s.needs.fun = clamp(s.needs.fun - 6);
  s.needs.social = clamp(s.needs.social + 4);
  s.shiftDay = s.day;
  s.goals.earn = true;
  pushLog(s, `Worked a ${saturday ? "half " : ""}shift at Northline. +$${pay}.`);
  notes.push({ toast: `Shift complete. +$${pay}.`, caption: "You badge out before the building can ask for more." });
  const welcome = evaluate(s);
  if (welcome) notes.push({ toast: welcome });
  return notes;
}

export const SHIFT_LINES = [
  "You badge in. The carpet already knows you.",
  "Inbox, then a meeting about the inbox.",
  "The good pen disappears. You use a worse pen.",
  "Someone says “quick question” and sits down.",
  "You ship the thing. It is not glamorous. It pays.",
];

export function applyChoice(s: GameState, npc: NpcId, nodeId: string, index: number): { notes: Note[]; next: string | null } {
  const node = DIALOGUE[npc][nodeId] ?? DIALOGUE[npc].hi;
  const choice = node.choices[index];
  if (!choice) return { notes: [], next: null };
  const notes: Note[] = [];
  if (choice.fx?.money && choice.fx.money < 0 && s.money < Math.abs(choice.fx.money)) {
    notes.push({ toast: `That'll be $${Math.abs(choice.fx.money)}. You're short.` });
    return { notes, next: nodeId };
  }
  applyFx(s, npc, choice.fx);
  s.goals.talk = true;
  if (choice.fx?.hunger && choice.fx.hunger >= 20) s.goals.meal = true;
  const welcome = evaluate(s);
  if (welcome) notes.push({ toast: welcome });
  if (choice.fx?.money && choice.fx.money < 0) {
    notes.push({ toast: `${NPC_META[npc].name.split(" ")[0]} takes $${Math.abs(choice.fx.money)}.` });
  }
  return { notes, next: choice.next };
}

function applyFx(s: GameState, npc: NpcId, fx?: Fx) {
  if (!fx) return;
  if (fx.money) s.money += fx.money;
  if (fx.rel) s.rel[npc] = clamp(s.rel[npc] + fx.rel);
  if (fx.social) s.needs.social = clamp(s.needs.social + fx.social);
  if (fx.fun) s.needs.fun = clamp(s.needs.fun + fx.fun);
  if (fx.energy) s.needs.energy = clamp(s.needs.energy + fx.energy);
  if (fx.hunger) s.needs.hunger = clamp(s.needs.hunger + fx.hunger);
}

export function openNode(npc: NpcId, s: GameState) {
  const id = greetingNode(npc, s.rel[npc], s.minute);
  return DIALOGUE[npc][id] ? id : "hi";
}

export function collapse(s: GameState): Note[] {
  const notes: Note[] = [];
  notes.push(...advance(s, 140, 0.6));
  s.place = "home";
  s.x = rooms.home.spawn.x;
  s.z = rooms.home.spawn.z;
  s.yaw = 0;
  s.needs.energy = 36;
  s.needs.fun = clamp(s.needs.fun - 12);
  s.money = Math.max(-40, s.money - 6);
  s.collapseAt = absMinute(s.day, s.minute);
  pushLog(s, "You folded. Woke up in 2B missing a few bills and a few hours.");
  notes.push({
    toast: "You dropped. Home now, a little poorer, a little more awake.",
    caption: "The row carried on without asking.",
    log: "Collapsed from exhaustion.",
  });
  return notes;
}

export function nodeView(npc: NpcId, nodeId: string) {
  const meta = NPC_META[npc];
  const node = DIALOGUE[npc][nodeId] ?? DIALOGUE[npc].hi;
  return {
    npc,
    name: meta.name,
    role: meta.role,
    text: node.text,
    choices: node.choices.map((c) => c.label),
  };
}
