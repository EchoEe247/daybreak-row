import type { GoalId, NpcId } from "@/game/types";

export const NPC_META: Record<NpcId, { name: string; role: string; where: string }> = {
  mara: { name: "Mara Voss", role: "Harbor Cafe", where: "Cafe, 7 AM – 7 PM. Sometimes sweeping the walk just after open." },
  ellis: { name: "Ellis Cho", role: "Cho's Market", where: "Market, 8 AM – 8 PM, usually at the register." },
  theo: { name: "Theo Lang", role: "Northline", where: "Office weekdays 8–6, Saturdays late morning." },
  jun: { name: "Jun Park", role: "Neighbor, 2A", where: "Stoop in the morning, pocket park around dusk." },
  idris: { name: "Idris Bell", role: "Retired ferry", where: "The pier, mid-morning and again late afternoon." },
};

export const GOAL_DEFS: { id: GoalId; title: string; detail: string }[] = [
  { id: "shower", title: "Wash the travel off", detail: "Use the shower in 2B." },
  { id: "meal", title: "Eat something real", detail: "Cook, or order a meal. Coffee doesn't count." },
  { id: "earn", title: "Get paid", detail: "Take a shift at Northline, or freelance at your desk." },
  { id: "groceries", title: "Stock the fridge", detail: "Buy groceries at Cho's." },
  { id: "talk", title: "Meet the street", detail: "Have a real conversation with someone." },
  { id: "sleep", title: "Sleep in your own bed", detail: "Turn in at home for the night." },
  { id: "cushion", title: "A little cushion", detail: "Hold $400 at once." },
  { id: "friend", title: "A real friend", detail: "Get any relationship to 60." },
  { id: "rhythm", title: "Finding a rhythm", detail: "Make it to day three." },
  { id: "goodHour", title: "A good hour", detail: "Have every need at 55 or better at the same time." },
];

export type Fx = {
  rel?: number;
  social?: number;
  fun?: number;
  energy?: number;
  hunger?: number;
  money?: number;
};

export type Choice = { label: string; next: string | null; fx?: Fx };
export type DNode = { text: string; choices: Choice[] };

export const DIALOGUE: Record<NpcId, Record<string, DNode>> = {
  mara: {
    early: {
      text: "We open at seven. You're early, which I respect and also don't. The machine is loud enough for both of us.",
      choices: [
        { label: "I'll wait it out.", next: "early2" },
        { label: "Leave her to it.", next: null },
      ],
    },
    early2: {
      text: "Fine. Stand there and look like a customer so the street thinks I'm busy.",
      choices: [{ label: "Can do.", next: null, fx: { rel: 4, social: 6, fun: 3 } }],
    },
    hi: {
      text: "You the new tenant in 2B? Sit if you're buying. Lingering in the doorway makes the place look closed.",
      choices: [
        { label: "Coffee, black · $4", next: "coffee", fx: { money: -4, energy: 10, hunger: 6, fun: 4, social: 4, rel: 3 } },
        { label: "Just saying hello.", next: "hello", fx: { rel: 5, social: 8 } },
        { label: "What's worth it before a shift?", next: "advice" },
      ],
    },
    hello: {
      text: "Hello back. I'm Mara. If you take the window seat, don't camp on it with a laptop and no cup.",
      choices: [{ label: "Noted.", next: null, fx: { rel: 2, fun: 2 } }],
    },
    advice: {
      text: "Eggs, not the sweet thing. The sweet thing is for people who already regret their morning.",
      choices: [
        { label: "Eggs, then. · $11", next: null, fx: { money: -11, hunger: 36, energy: 5, fun: 6, rel: 4, social: 4 } },
        { label: "I'll risk the regret.", next: null, fx: { rel: 2, fun: 4 } },
      ],
    },
    coffee: {
      text: "There. Hot, bitter, honest. The cup is the only thing in here that doesn't have an opinion.",
      choices: [{ label: "Thanks, Mara.", next: null, fx: { rel: 2 } }],
    },
    known: {
      text: "Window seat's free. Theo already took the one by the outlet, and the outlet.",
      choices: [
        { label: "Coffee · $4", next: "coffee", fx: { money: -4, energy: 10, hunger: 6, fun: 5, social: 5, rel: 3 } },
        { label: "How's the street treating you?", next: "street" },
        { label: "I'll get out of the way.", next: null, fx: { social: 4 } },
      ],
    },
    street: {
      text: "Same as ever. People want the day to be interesting and the coffee to be boring. I can only promise one.",
      choices: [{ label: "Boring coffee it is.", next: null, fx: { rel: 6, social: 8, fun: 5 } }],
    },
    warm: {
      text: "I saved you the end of the cinnamon thing. Don't make it a habit I'll have to keep.",
      choices: [
        { label: "I'll take it. · $6", next: null, fx: { money: -6, hunger: 22, fun: 12, rel: 6, social: 8 } },
        { label: "Save it for someone else.", next: "save" },
      ],
    },
    save: {
      text: "Look at you, civic-minded. Sit anyway. Standing makes the regulars nervous.",
      choices: [{ label: "I'll sit a minute.", next: null, fx: { rel: 5, social: 10, fun: 8, energy: 4 } }],
    },
  },
  ellis: {
    hi: {
      text: "Basket's by the door. If you came in for one lemon, that's still a purchase. I'm Ellis.",
      choices: [
        { label: "I'm in 2B. Just moved.", next: "moved", fx: { rel: 5, social: 8 } },
        { label: "What's a sensible shop?", next: "sensible" },
        { label: "Just looking.", next: null },
      ],
    },
    moved: {
      text: "2B. The radiator ticks. That's not a defect, that's the building talking. Groceries are cheaper than the cafe if you can wait twenty minutes to eat.",
      choices: [{ label: "Good to know.", next: null, fx: { rel: 3, fun: 3 } }],
    },
    sensible: {
      text: "Bread, eggs, something green you won't abandon. The green thing is where people lie to themselves.",
      choices: [{ label: "I'll try not to lie.", next: null, fx: { rel: 4, social: 6 } }],
    },
    known: {
      text: "Your fridge has a reputation already. Hotel mini-bar energy. People talk, which is my polite way of saying I talk.",
      choices: [
        { label: "Fair. What's fresh?", next: "fresh", fx: { rel: 4, social: 8 } },
        { label: "Any news on the row?", next: "news" },
      ],
    },
    fresh: {
      text: "The bread from this morning, and oranges that still smell like somewhere else. That's as fresh as this block gets.",
      choices: [{ label: "I'll take the hint.", next: null, fx: { rel: 3, fun: 4 } }],
    },
    news: {
      text: "Idris swears the ferry bell still rings when the fog sits a certain way. I have not heard it. I have heard Jun pacing at 1 AM, which is less mystical.",
      choices: [{ label: "I'll listen tonight.", next: null, fx: { rel: 5, fun: 6, social: 6 } }],
    },
    warm: {
      text: "I put the good bread aside. Neighborhood rate, which is the same rate, but the intention is doing a lot of work.",
      choices: [
        { label: "I'll take it. · $4", next: null, fx: { money: -4, hunger: 16, rel: 6, social: 8, fun: 6 } },
        { label: "Keep it. Tell me how you are.", next: "how" },
      ],
    },
    how: {
      text: "Tired in the ordinary way. The good kind. You showing up with a list helps more than the small talk, but the small talk is allowed.",
      choices: [{ label: "Both, then.", next: null, fx: { rel: 7, social: 12, fun: 6 } }],
    },
  },
  theo: {
    hi: {
      text: "New on the floor? Theo. If anyone says the printer is easy, they're selling something. Possibly toner.",
      choices: [
        { label: "What does a shift actually look like?", next: "shift" },
        { label: "Nice to meet you.", next: "meet", fx: { rel: 5, social: 8 } },
        { label: "I'll find my desk.", next: null },
      ],
    },
    shift: {
      text: "You badge in, you answer things that could have been a sentence, you leave before the building convinces you to stay. The pay is real. The glamour is theoretical.",
      choices: [{ label: "Theoretical glamour. Got it.", next: null, fx: { rel: 4, fun: 5, social: 4 } }],
    },
    meet: {
      text: "Likewise. Don't drink the office coffee unless you enjoy a dare. Mara's is a four-minute walk and a better personality.",
      choices: [{ label: "I'll remember.", next: null, fx: { rel: 3 } }],
    },
    known: {
      text: "Half day or a full one, the carpet feels the same. You keep showing up, which is more than the last temp managed.",
      choices: [
        { label: "Any advice before I clock in?", next: "advice" },
        { label: "How do you stand it?", next: "stand", fx: { rel: 4, social: 8 } },
      ],
    },
    advice: {
      text: "Eat first. Management can smell a skipped breakfast and they will schedule a meeting on top of it.",
      choices: [{ label: "Grim. Useful.", next: null, fx: { rel: 5, fun: 4, social: 4 } }],
    },
    stand: {
      text: "I leave at six even when the screen is still glowing. The screen will glow tomorrow. That's the whole trick.",
      choices: [{ label: "I'll steal that.", next: null, fx: { rel: 6, fun: 6, social: 6 } }],
    },
    warm: {
      text: "You keep showing up. That's the job, honestly. Don't tell management I boiled it down.",
      choices: [
        { label: "Your secret's safe.", next: null, fx: { rel: 6, social: 10, fun: 8 } },
        { label: "Want to get coffee after?", next: "after" },
      ],
    },
    after: {
      text: "If 'after' means Mara's and not the diner with the sad pie, yes. I'll be the one pretending not to check the time.",
      choices: [{ label: "Mara's it is.", next: null, fx: { rel: 8, social: 12, fun: 10 } }],
    },
  },
  jun: {
    hi: {
      text: "Oh — 2B. I heard the door. I'm Jun, 2A. I draw, and I pace, usually at the same time. Sorry in advance about the pacing.",
      choices: [
        { label: "I don't mind the pacing.", next: "pace", fx: { rel: 6, social: 10, fun: 4 } },
        { label: "What are you drawing?", next: "draw" },
        { label: "I'll let you get back to it.", next: null, fx: { social: 3 } },
      ],
    },
    pace: {
      text: "Good, because the hallway is the only studio I can afford. If you hear three steps and a stop, that's me deciding a line was wrong.",
      choices: [{ label: "I'll learn the rhythm.", next: null, fx: { rel: 4, fun: 5 } }],
    },
    draw: {
      text: "The pier, badly, then better. Idris keeps walking through the frame like he pays rent on the horizon.",
      choices: [{ label: "I'd like to see it sometime.", next: null, fx: { rel: 7, social: 8, fun: 6 } }],
    },
    known: {
      text: "The light on this street at four is unfair. I'm wasting it talking, which is also nice, so the math is unclear.",
      choices: [
        { label: "Waste a little more.", next: "waste", fx: { rel: 5, social: 10, fun: 8 } },
        { label: "How's 2A treating you?", next: "flat" },
      ],
    },
    waste: {
      text: "Dangerous offer. I'll take ten minutes and no advice about getting a real job. Theo already filed that paperwork.",
      choices: [{ label: "No advice. Promise.", next: null, fx: { rel: 6, fun: 6 } }],
    },
    flat: {
      text: "The radiator ticks in Morse and the window sticks. I wouldn't trade the window. You can see the water if you lean and lie a little.",
      choices: [{ label: "Leaning and lying. My skill set.", next: null, fx: { rel: 5, fun: 7, social: 6 } }],
    },
    warm: {
      text: "I left a sketch of the pier under your door, got shy, and took it back. Next time I won't do the taking-back part.",
      choices: [
        { label: "Next time I'll pretend I already saw it.", next: null, fx: { rel: 8, social: 12, fun: 10 } },
        { label: "Walk down to the pier with me?", next: "walk" },
      ],
    },
    walk: {
      text: "Yeah. If Idris is there he'll tell us a story with no ending. That's the good kind.",
      choices: [{ label: "Let's go sometime.", next: null, fx: { rel: 7, social: 10, fun: 8 } }],
    },
  },
  idris: {
    hi: {
      text: "Tide's lazy today. Name's Idris. I ran the ferry until the ferry ran out of reasons. Now I supervise the water for free.",
      choices: [
        { label: "What happened to the ferry?", next: "ferry" },
        { label: "Mind if I stand here?", next: "stand", fx: { rel: 4, social: 8, fun: 4 } },
        { label: "I'll leave you the view.", next: null },
      ],
    },
    ferry: {
      text: "A bridge, a budget, a meeting. The usual assassins. The bell is in a crate in my hallway. It doesn't know the route is gone.",
      choices: [{ label: "That's a good sentence. A sad one.", next: null, fx: { rel: 7, social: 8, fun: 6 } }],
    },
    stand: {
      text: "The pier isn't mine. It just thinks it is. Stay. You walk like someone counting rent.",
      choices: [{ label: "That obvious?", next: "rent", fx: { rel: 3 } }],
    },
    rent: {
      text: "Everybody on this row has the same walk until Friday. Then it changes shape for about six hours.",
      choices: [{ label: "I'll watch for Friday.", next: null, fx: { rel: 5, fun: 6, social: 6 } }],
    },
    known: {
      text: "You again. Good. The water doesn't invoice, which makes it the most reasonable neighbor I've had.",
      choices: [
        { label: "Tell me something about the row.", next: "row" },
        { label: "Quiet is fine too.", next: null, fx: { rel: 4, fun: 8, energy: 4, social: 4 } },
      ],
    },
    row: {
      text: "Mara remembers orders people haven't placed yet. Ellis pretends not to extend credit and then does. Jun draws the pier better than the pier deserves. You're the new variable.",
      choices: [{ label: "I'll try to be a kind one.", next: null, fx: { rel: 7, social: 10, fun: 6 } }],
    },
    warm: {
      text: "There's a bell from the old boat in my pocket today. I'm not giving it to you. I'm telling you it exists, which is a kind of trust.",
      choices: [
        { label: "I won't ask to hold it.", next: null, fx: { rel: 6, social: 10, fun: 8 } },
        { label: "Did it ever ring for you?", next: "ring" },
      ],
    },
    dusk: {
      text: "This light makes everybody look like they kept a promise. Don't trust it. Do enjoy it.",
      choices: [
        { label: "I'll take the light and leave the lesson.", next: null, fx: { rel: 5, fun: 10, social: 6 } },
        { label: "What did you promise?", next: "ring" },
      ],
    },
    ring: {
      text: "Once, in fog, when I shouldn't have been out. It wasn't the bell. It was enough like the bell that I turned the boat around. Still here, so. Something worked.",
      choices: [{ label: "I'm glad you turned around.", next: null, fx: { rel: 8, social: 12, fun: 8 } }],
    },
  },
};

export function greetingNode(id: NpcId, rel: number, minute: number) {
  const h = minute / 60;
  if (id === "mara" && h < 7.15) return "early";
  if (id === "idris" && h >= 17 && rel >= 22) return "dusk";
  if (rel >= 55 && DIALOGUE[id].warm) return "warm";
  if (rel >= 22 && DIALOGUE[id].known) return "known";
  return "hi";
}
