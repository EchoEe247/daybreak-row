import { DIALOGUE, greetingNode, NPC_META, type Fx } from "@/game/content";
import { CITY_SITES } from "@/game/city-layout";
import { npcPublicRoutine } from "@/game/npc-routines";
import { CITY_ROUTE_REWARD, claimPassport, passportSnapshot, stampPassport } from "@/game/city-passport";
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
  speed?: number;
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
  const posts = { mara, ellis, theo, jun, idris };
  if (s.place === "street") {
    for(const id of ["mara","ellis","theo","jun","idris"] as const) {
      const publicPost = npcPublicRoutine(id,s.minute);
      if (publicPost) posts[id]={...publicPost,place:"street",visible:true};
    }
  }
  return posts;
}

function pay(s: GameState, cost: number, notes: Note[]) {
  if (s.money < cost) {
    notes.push({ toast: `You need $${cost}. You're holding $${Math.floor(s.money)}.` });
    return false;
  }
  s.money -= cost;
  return true;
}

function enter(s: GameState, id: keyof typeof rooms) {
  const room = rooms[id];
  s.place = id;
  s.x = room.spawn.x;
  s.z = room.spawn.z;
  s.yaw = room.spawn.yaw;
}

function exit(s: GameState, id: keyof typeof rooms) {
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
  const bakery = rooms.bakery;
  const gym = rooms.gym;
  const cinema = rooms.cinema;
  const bookshop = rooms.bookshop;
  const laundry = rooms.laundry;
  const base: Action[] = [
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
    // New connected-city venues reuse the same collision-safe, faded doorway pipeline.
    {
      id: "enter-bakery",
      place: "street",
      x: 82, z: -47, r: 2.3,
      label: () => "Enter Old Town Bakery",
      run: (s) => { enter(s,"bakery"); return done([{caption:"Warm ovens, shelves of bread and the smell of something just baked."}],true); },
    },
    {
      id: "exit-bakery",
      place: "bakery",
      x: bakery.door.x, z: bakery.door.z, r: 1.3,
      label: () => "Leave Old Town Bakery",
      run: (s) => { exit(s,"bakery"); return done([],true); },
    },
    {
      id: "bakery-pastry",
      place: "bakery",
      x: -1.3, z: 822.55, r: 1.5,
      label: () => "Fresh pastry · $7",
      run: (s) => {
        const notes:Note[]=[];
        if (!pay(s,7,notes)) return done(notes);
        const day=s.day;
        s.needs.hunger=clamp(s.needs.hunger+27);
        s.needs.fun=clamp(s.needs.fun+5);
        notes.push(...advance(s,16,0.65));
        notes.push({toast:"Fresh pastry · -$7",caption:"The paper bag is warm in your hands."});
        if(s.day===day){const stamp=stampPassport(s,"bakery");if(stamp)notes.push({toast:stamp});}
        return done(notes);
      },
    },
    {
      id: "bakery-attendant",
      place: "bakery",
      x: 0.1, z: 823.4, r: 1.1,
      label: () => "Chat with the baker",
      run: (s) => {
        s.needs.social=clamp(s.needs.social+7);
        s.needs.fun=clamp(s.needs.fun+3);
        const notes=advance(s,9,0.6);
        notes.push({caption:"Fresh dough takes time. So do good neighbors.",toast:"The baker recommends tomorrow's cinnamon rolls."});
        return done(notes);
      },
    },
    {
      id: "bakery-coffee",
      place: "bakery",
      x: 2.2, z: 823.3, r: 1.3,
      label: () => "Bakery coffee · $3",
      run: (s) => {
        const notes:Note[]=[];
        if(!pay(s,3,notes))return done(notes);
        s.needs.energy=clamp(s.needs.energy+10);
        s.needs.social=clamp(s.needs.social+3);
        notes.push(...advance(s,9,0.65));
        notes.push({toast:"Bakery coffee · -$3",caption:"A quiet minute beside the window."});
        return done(notes);
      },
    },
    {
      id: "enter-gym",
      place: "street",
      x: 122, z: -47, r: 2.3,
      label: () => "Enter Civic Fitness",
      run: (s) => { enter(s,"gym");return done([{caption:"Rubber floors, steel equipment and bright daylight."}],true); },
    },
    {
      id: "exit-gym",
      place: "gym",
      x: gym.door.x,z: gym.door.z,r:1.3,
      label: () => "Leave Civic Fitness",
      run: (s) => { exit(s,"gym");return done([],true); },
    },
    {
      id: "gym-workout",
      place: "gym",
      x: -2.25, z: 922.5, r: 1.6,
      label: () => "Strength workout · $12",
      run: (s) => {
        if(s.needs.energy<19)return done([{toast:"Too exhausted to train. Rest first."}]);
        const notes:Note[]=[];
        if(!pay(s,12,notes))return done(notes);
        const day=s.day;
        s.needs.energy=clamp(s.needs.energy-17);
        s.needs.hygiene=clamp(s.needs.hygiene-11);
        s.needs.fun=clamp(s.needs.fun+24);
        notes.push(...advance(s,65,0.9));
        notes.push({toast:"Civic Fitness strength workout · -$12",caption:"One more rep, then a proper rest."});
        if(s.day===day){const stamp=stampPassport(s,"gym");if(stamp)notes.push({toast:stamp});}
        return done(notes);
      },
    },
    {
      id: "gym-trainer",
      place: "gym",
      x: 3.75, z: 925.4, r: 1.2,
      label: () => "Ask the trainer",
      run: (s) => {
        s.needs.social=clamp(s.needs.social+6);
        s.needs.fun=clamp(s.needs.fun+4);
        const notes=advance(s,7,0.65);
        notes.push({caption:"Form before weight. Consistency before speed.",toast:"Trainer: small sessions beat one heroic workout."});
        return done(notes);
      },
    },
    {
      id: "gym-stretch",
      place: "gym",
      x: 2.45,z:925.0,r:1.6,
      label: () => "Stretch & hydrate · free",
      run: (s) => {
        s.needs.energy=clamp(s.needs.energy+6);
        s.needs.fun=clamp(s.needs.fun+5);
        const notes=advance(s,12,0.6);
        notes.push({toast:"Stretch complete",caption:"The tension in your shoulders finally eases."});
        return done(notes);
      },
    },
    // Two more fully enterable connected-city venues with physical gameplay.
    {
      id: "enter-cinema",
      place: "street",
      x: 148, z: -47, r: 2.3,
      label: () => "Enter Metro Cinema",
      run: (state) => {
        enter(state,"cinema");
        return done([{caption:"Low lobby lights, film posters and the distant murmur of the next showing."}],true);
      },
    },
    {
      id: "exit-cinema",
      place: "cinema",
      x: cinema.door.x, z: cinema.door.z, r: 1.3,
      label: () => "Leave Metro Cinema",
      run: (state) => { exit(state,"cinema");return done([],true); },
    },
    {
      id: "cinema-ticket",
      place: "cinema",
      x: 1.45, z: 1023.7, r: 1.75,
      label: () => "Watch a movie · $16",
      run: (state) => {
        const notes: Note[]=[];
        if(!pay(state,16,notes))return done(notes);
        const before=state.day;
        state.needs.fun=clamp(state.needs.fun+38);
        state.needs.social=clamp(state.needs.social+5);
        notes.push(...advance(state,98,0.58));
        notes.push({toast:"Metro Cinema showing · -$16",caption:"The screen fades to black. For a while, the city can wait."});
        if(state.day===before){const stamp=stampPassport(state,"cinema");if(stamp)notes.push({toast:stamp});}
        return done(notes);
      },
    },
    {
      id: "cinema-snack",
      place: "cinema",
      x: -3.1, z: 1023.5, r: 1.5,
      label: () => "Popcorn & drink · $4",
      run: (state) => {
        const notes:Note[]=[];
        if(!pay(state,4,notes))return done(notes);
        state.needs.hunger=clamp(state.needs.hunger+14);
        state.needs.fun=clamp(state.needs.fun+5);
        notes.push(...advance(state,7,0.7));
        notes.push({toast:"Popcorn & drink · -$4",caption:"The popcorn smells better than you remember."});
        return done(notes);
      },
    },
    {
      id: "cinema-usher",
      place: "cinema",
      x: 3.9,z:1025.4,r:1.4,
      label: () => "Ask the usher",
      run: (state) => {
        state.needs.social=clamp(state.needs.social+6);
        state.needs.fun=clamp(state.needs.fun+2);
        const notes=advance(state,8,0.6);
        notes.push({toast:"Usher: The next film starts soon.",caption:"They know every seat, every story and every late arrival."});
        return done(notes);
      },
    },
    {
      id: "enter-bookshop",
      place: "street",
      x: 108, z: -102, r: 2.3,
      label: () => "Enter Corner Books",
      run: (state) => {
        enter(state,"bookshop");
        return done([{caption:"Quiet shelves, old wood, paper and the promise of a different afternoon."}],true);
      },
    },
    {
      id: "exit-bookshop",
      place: "bookshop",
      x: bookshop.door.x,z:bookshop.door.z,r:1.3,
      label: () => "Leave Corner Books",
      run: (state) => {exit(state,"bookshop");return done([],true);},
    },
    {
      id: "bookshop-buy",
      place: "bookshop",
      x: -2.35,z:1123.0,r:1.55,
      label: () => "Choose a book · $8",
      run: (state) => {
        const notes:Note[]=[];
        if(!pay(state,8,notes))return done(notes);
        const before=state.day;
        state.needs.fun=clamp(state.needs.fun+21);
        state.needs.social=clamp(state.needs.social+6);
        notes.push(...advance(state,30,0.68));
        notes.push({toast:"A good book · -$8",caption:"You leave with more stories than you arrived with."});
        if(state.day===before){const stamp=stampPassport(state,"bookshop");if(stamp)notes.push({toast:stamp});}
        return done(notes);
      },
    },
    {
      id: "bookshop-read",
      place: "bookshop",
      x: 2.1,z:1123.0,r:1.6,
      label: () => "Read in the nook · free",
      run: (state) => {
        state.needs.fun=clamp(state.needs.fun+13);
        state.needs.energy=clamp(state.needs.energy+4);
        const notes=advance(state,25,0.48);
        notes.push({toast:"A quiet chapter",caption:"Between the shelves, the city feels far away."});
        return done(notes);
      },
    },
    {
      id: "bookshop-owner",
      place: "bookshop",
      x: 0.9,z:1125.15,r:1.2,
      label: () => "Talk to the bookseller",
      run: (state) => {
        state.needs.social=clamp(state.needs.social+8);
        state.needs.fun=clamp(state.needs.fun+3);
        const notes=advance(state,10,0.5);
        notes.push({toast:"Bookseller: Every book finds its reader.",caption:"They point you toward a favorite on the bottom shelf."});
        return done(notes);
      },
    },
    {
      id: "enter-laundry",
      place: "street",
      x: 82, z: -88, r: 2.3,
      label: () => "Enter Fresh Spin Laundry",
      run: (state) => {
        enter(state,"laundry");
        return done([{caption:"Fresh Spin: real washers, dryers and the low hum of the machines."}],true);
      },
    },
    {
      id: "exit-laundry",
      place: "laundry",
      x: laundry.door.x, z: laundry.door.z, r: 1.3,
      label: () => "Leave Fresh Spin Laundry",
      run: (state) => {exit(state,"laundry");return done([],true);},
    },
    {
      id: "laundry-wash",
      place: "laundry",
      x: -1.0, z: 1223.0, r: 1.55,
      label: () => "Wash & dry clothes · $6",
      run: (state) => {
        const notes:Note[]=[];
        if(!pay(state,6,notes))return done(notes);
        const before=state.day;
        state.needs.hygiene=clamp(state.needs.hygiene+36);
        state.needs.fun=clamp(state.needs.fun+3);
        notes.push(...advance(state,42,0.8));
        notes.push({toast:"Fresh Spin laundry complete · -$6",caption:"The drums finish their cycle. Everything feels cleaner."});
        if(state.day===before){const stamp=stampPassport(state,"laundry");if(stamp)notes.push({toast:stamp});}
        return done(notes);
      },
    },
    {
      id: "laundry-attendant",
      place: "laundry",
      x: 2.0, z: 1224.8, r: 1.3,
      label: () => "Ask the attendant",
      run: (state) => {
        state.needs.social=clamp(state.needs.social+6);
        const notes=advance(state,7,0.5);
        notes.push({caption:"Someone has to keep the city clean, even on a bright afternoon.",toast:"Fresh Spin attendant: We close when the last load is done."});
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
  const city: Action[] = CITY_SITES.filter(site=>!["bakery","gym","cinema","bookshop","laundry"].includes(site.id)).map((site) => ({
    id: "city-" + site.id,
    place: "street" as const,
    x: site.x,
    z: site.z,
    r: 2.35,
    label: (s) => site.id === "townhall" && passportSnapshot(s).ready ? `Claim city route · ${CITY_ROUTE_REWARD}` : site.name + " · " + site.detail,
    run: (state: GameState) => {
      const notes: Note[] = [];
      const activity = site.id;
      const arrivedDay = state.day;
      let successfulVisit = false;
      if (activity === "townhall" && passportSnapshot(state).ready) {
        const reward = claimPassport(state);
        if (reward) {
          notes.push({ toast: reward, caption: "You made the rounds. The clerk signs your city passport.", log: reward });
          notes.push(...advance(state, 8, 0.4));
          return done(notes);
        }
      }
      if (activity === "foodcart") {
        if (state.money < 9) return done([{toast:"You'll need $9 for lunch."}]);
        state.money -= 9;
        successfulVisit = true;
        state.needs.hunger = clamp(state.needs.hunger + 34);
        notes.push({toast:"Lunch from the food cart. -$9",caption:"Steam rises from the busy sidewalk."});
        notes.push(...advance(state,17,0.6));
      } else if (activity === "office") {
        if (state.needs.energy < 25) return done([{toast:"Too tired for an office contract. Rest first."}]);
        if (absMinute(state.day,state.minute) - state.freelanceAt < 120) {
          return done([{toast:"Your contract shift is on cooldown. Explore the city first."}]);
        }
        state.freelanceAt = absMinute(state.day,state.minute);
        successfulVisit = true;
        state.money += 46;
        state.needs.energy = clamp(state.needs.energy - 19);
        state.needs.hunger = clamp(state.needs.hunger - 9);
        state.goals.earn = true;
        notes.push({toast:"Downtown contract complete. +$46",caption:"City work pays, but the afternoon belongs to someone else."});
        notes.push(...advance(state,125,1));
      } else if (activity === "hospital") {
        if (state.money < 14) return done([{toast:"The clinic visit is $14. Try the free library or plaza."}]);
        state.money -= 14;
        successfulVisit = true;
        state.needs.energy = clamp(state.needs.energy + 26);
        state.needs.hygiene = clamp(state.needs.hygiene + 12);
        notes.push({toast:"Community clinic visit. -$14",caption:"The city takes care of its people."});
        notes.push(...advance(state,32,0.5));
      } else if (activity === "cinema") {
        if (!pay(state,16,notes)) return done(notes);
        successfulVisit = true;
        state.needs.fun = clamp(state.needs.fun + 38);
        state.needs.social = clamp(state.needs.social + 5);
        notes.push(...advance(state,98,0.58));
        notes.push({toast:"Metro Cinema ticket · -$16",caption:"The city disappears for the length of a movie."});
      } else if (activity === "laundry") {
        if (!pay(state,6,notes)) return done(notes);
        successfulVisit = true;
        state.needs.hygiene = clamp(state.needs.hygiene + 36);
        state.needs.fun = clamp(state.needs.fun + 3);
        notes.push(...advance(state,42,0.8));
        notes.push({toast:"Fresh Spin laundry complete · -$6",caption:"Fresh clothes and a little less chaos."});
      } else if (activity === "bookshop") {
        if (!pay(state,8,notes)) return done(notes);
        successfulVisit = true;
        state.needs.fun = clamp(state.needs.fun + 21);
        state.needs.social = clamp(state.needs.social + 6);
        notes.push(...advance(state,30,0.68));
        notes.push({toast:"Corner Books visit · -$8",caption:"A new story in the middle of the city."});
      } else if (activity === "courier") {
        const now = absMinute(state.day,state.minute);
        if (now < (state.cityCourierNextAt ?? 0)) return done([{toast:"Parcel Dispatch has no new route yet. Return later."}]);
        if (state.needs.energy < 23) return done([{toast:"You need more energy before taking a parcel route."}]);
        successfulVisit = true;
        state.cityCourierNextAt = now + 230;
        state.money += 38;
        state.needs.energy = clamp(state.needs.energy - 20);
        state.needs.hunger = clamp(state.needs.hunger - 9);
        state.goals.earn = true;
        notes.push(...advance(state,86,0.85));
        notes.push({toast:"Parcels delivered · +$38",caption:"The dispatch board clears your route."});
      } else {
        successfulVisit = true;
        const extra = activity === "gallery" ? 24 : activity === "library" ? 17 : activity === "busking" ? 13 : activity === "station" ? 9 : 8;
        state.needs.fun = clamp(state.needs.fun + extra);
        state.needs.social = clamp(state.needs.social + (activity === "busking" ? 10 : 4));
        notes.push(...advance(state,activity === "gallery" ? 35 : 20,0.5));
        const lines:Record<string,string> = {
          townhall:"You wander the steps of City Hall. The square has its own rhythm.",
          library:"An hour among books makes the city feel less impossible.",
          busking:"You catch a sidewalk performance in the music plaza.",
          gallery:"Inside the city gallery, you find something worth remembering.",
          station:"The platforms rumble as trains thread through the city."
        };
        notes.push({toast:site.name + " visited",caption:lines[activity] ?? "Another corner of the city."});
      }
      if (successfulVisit && state.day === arrivedDay) {
        const stamp = stampPassport(state, activity);
        if (stamp) notes.push({ toast: stamp, log: stamp });
      }
      state.log.unshift("Visited " + site.name + ".");
      state.log = state.log.slice(0,16);
      return done(notes);
    }
  }));
  return [...base, ...city];
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