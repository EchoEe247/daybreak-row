import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  BookOpen,
  Briefcase,
  Clock,
  Droplets,
  Home,
  MapPin,
  Pause,
  Phone,
  Smile,
  Users,
  Utensils,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { GOAL_DEFS, NPC_META } from "@/game/content";
import { gameApi, useUi } from "@/game/store";
import { input } from "@/game/input";
import { clockLabel, placeLabel, weekday } from "@/game/time";
import type { NeedId, NpcId } from "@/game/types";

const NEEDS: { id: NeedId; label: string; Icon: typeof Zap }[] = [
  { id: "energy", label: "Energy", Icon: Zap },
  { id: "hunger", label: "Hunger", Icon: Utensils },
  { id: "hygiene", label: "Hygiene", Icon: Droplets },
  { id: "social", label: "Social", Icon: Users },
  { id: "fun", label: "Fun", Icon: Smile },
];

function needTone(value: number) {
  if (value < 30) return "bg-clay";
  if (value < 60) return "bg-amber";
  return "bg-sage";
}

function advice(needs: Record<NeedId, number>) {
  if (needs.hunger < 28) return "Eat before you get sharp with people.";
  if (needs.energy < 28) return "You're running on fumes. Nap, or turn in early.";
  if (needs.hygiene < 28) return "A shower would change the temperature of the day.";
  if (needs.social < 28) return "Someone on this street would talk, if you find them.";
  if (needs.fun < 28) return "The pier is free. So is the bench in the pocket park.";
  return "Nothing's on fire. Keep the day ordinary on purpose.";
}

export function Overlay() {
  const ui = useUi();
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="lens absolute inset-0" />
      {ui.low && ui.mode === "play" ? <div className="need-vignette absolute inset-0" /> : null}
      <div
        className="absolute inset-0 bg-dusk-2 transition-opacity duration-300 motion-ok"
        style={{ opacity: ui.veil }}
      />
      {ui.mode === "title" ? <Title /> : null}
      {ui.mode !== "title" ? <TopBar /> : null}
      {ui.mode === "play" ? <PlayChrome /> : null}
      {ui.mode === "phone" ? <PhonePanel /> : null}
      {ui.mode === "pause" ? <PauseCard /> : null}
      {ui.mode === "dialogue" && ui.dialogue ? <Dialogue /> : null}
      {(ui.mode === "sleep" || ui.mode === "shift") && ui.notice ? (
        <div className="absolute inset-0 grid place-items-center bg-dusk-2/55 px-5">
          <div className="pointer-events-auto w-full max-w-sm rounded-3xl bg-paper px-6 py-6 text-ink">
            <p className="font-display text-4xl leading-none">{ui.notice}</p>
            <p className="mt-3 text-base leading-relaxed text-dusk">{ui.noticeSub}</p>
          </div>
        </div>
      ) : null}
      <Toasts />
    </div>
  );
}

function Title() {
  const hasSave = useUi((s) => s.hasSave);
  const ready = useUi((s) => s.ready);
  const [name, setName] = useState("Alex");
  const [arm, setArm] = useState(false);

  return (
    <div className="absolute inset-0 flex items-end justify-center p-3 sm:items-center sm:justify-start sm:p-10">
      <section className="sheet pointer-events-auto w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-paper/95 px-5 py-5 text-ink shadow-xl">
        <p className="text-xs font-medium tracking-[0.22em] text-clay uppercase">Coastal life sim</p>
        <h1 className="font-display mt-1 text-4xl leading-none text-ink sm:mt-2 sm:text-5xl">Daybreak Row</h1>
        <p className="mt-2 text-sm leading-relaxed text-dusk sm:mt-3 sm:text-base">
          A walk-up, a shift at nine, and a street that learns your name.
        </p>
        <label className="mt-5 block text-sm font-medium text-dusk" htmlFor="life-name">
          Your name
          <input
            id="life-name"
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-line bg-paper-2 px-3 py-3 text-base text-ink outline-none"
            autoComplete="off"
            suppressHydrationWarning
          />
        </label>
        <button
          type="button"
          className="mt-4 min-h-12 w-full rounded-2xl bg-ink px-4 py-3 text-base font-medium text-paper"
          onClick={() => {
            if (!ready) return;
            if (hasSave) gameApi.continue();
            else gameApi.startNew(name);
          }}
        >
          Start
        </button>
        {hasSave ? (
          <button
            type="button"
            className="mt-2 min-h-11 w-full rounded-2xl border border-line px-4 py-3 text-sm text-dusk"
            onClick={() => {
              if (!arm) {
                setArm(true);
                return;
              }
              gameApi.newLife();
              setArm(false);
            }}
          >
            {arm ? "Erase the saved life" : "New life"}
          </button>
        ) : null}
        <ul className="mt-4 hidden grid-cols-3 gap-2 text-center text-xs leading-snug text-dusk sm:grid">
          <li className="rounded-2xl bg-paper-2 px-2 py-3">
            <Wallet className="mx-auto mb-1 size-4 text-amber" />
            Work and rent
          </li>
          <li className="rounded-2xl bg-paper-2 px-2 py-3">
            <Utensils className="mx-auto mb-1 size-4 text-amber" />
            Eat and rest
          </li>
          <li className="rounded-2xl bg-paper-2 px-2 py-3">
            <Users className="mx-auto mb-1 size-4 text-amber" />
            The neighbors
          </li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-mist">
          Stick or WASD to walk. The round button uses whatever is in front of you. Drag empty sky to look. Time
          moves while you do.
        </p>
      </section>
    </div>
  );
}

function TopBar() {
  const day = useUi((s) => s.day);
  const minute = useUi((s) => s.minute);
  const money = useUi((s) => s.money);
  const needs = useUi((s) => s.needs);
  const place = useUi((s) => s.place);
  const mode = useUi((s) => s.mode);
  const showButtons = mode === "play" || mode === "phone" || mode === "pause";

  return (
    <div className="safe-top pointer-events-none absolute inset-x-0 top-0 px-3">
      <div className="pointer-events-auto rounded-3xl border border-white/10 bg-dusk-2/80 px-3 py-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-amber" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-paper">
              {weekday(day)} · {clockLabel(minute)}
            </p>
            <p className="truncate text-xs text-foam/80">{placeLabel(place)}</p>
          </div>
          <p className="ml-auto font-display text-xl text-amber">${Math.floor(money)}</p>
          {showButtons ? (
            <>
              <button
                type="button"
                aria-label="Phone"
                className="grid size-11 place-items-center rounded-2xl bg-white/10 text-paper"
                onClick={() => {
                  if (mode === "phone") gameApi.closePhone();
                  else {
                    if (mode === "pause") gameApi.resume();
                    gameApi.openPhone();
                  }
                }}
              >
                <Phone className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Pause"
                className="grid size-11 place-items-center rounded-2xl bg-white/10 text-paper"
                onClick={() => {
                  if (mode === "phone") gameApi.closePhone();
                  gameApi.pause();
                }}
              >
                <Pause className="size-5" />
              </button>
            </>
          ) : null}
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {NEEDS.map(({ id, label, Icon }) => (
            <div key={id} className="min-w-0" title={`${label} ${Math.round(needs[id])}`}>
              <div className="mb-1 flex items-center gap-1 text-foam/90">
                <Icon className="size-3 shrink-0" />
                <span className="sr-only">{label}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div className={`h-full ${needTone(needs[id])}`} style={{ width: `${Math.round(needs[id])}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayChrome() {
  const prompt = useUi((s) => s.prompt);
  const caption = useUi((s) => s.caption);
  return (
    <>
      <div className="absolute inset-x-0 bottom-36 flex justify-center px-20 sm:bottom-28">
        <div className="max-w-sm text-center">
          {caption ? <p className="mb-2 text-sm text-paper drop-shadow">{caption}</p> : null}
          {prompt ? (
            <p className="rounded-full bg-dusk-2/80 px-4 py-2 text-sm font-medium text-paper">{prompt}</p>
          ) : (
            <p className="hidden text-xs text-foam/80 sm:block">WASD move · E use · drag to look · P phone</p>
          )}
        </div>
      </div>
      <TouchControls prompt={!!prompt} />
    </>
  );
}

function TouchControls({ prompt }: { prompt: boolean }) {
  return (
    <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-4 pb-3">
      <Joystick />
      <div className="pointer-events-auto flex items-end gap-3">
        <button
          type="button"
          aria-label="Run"
          className="grid size-14 place-items-center rounded-full border border-white/15 bg-dusk-2/80 text-xs font-medium text-paper"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            input.runHeld = true;
          }}
          onPointerUp={() => {
            input.runHeld = false;
          }}
          onPointerCancel={() => {
            input.runHeld = false;
          }}
        >
          Run
        </button>
        <button
          type="button"
          aria-label={prompt ? "Use" : "Interact"}
          className={`grid size-16 place-items-center rounded-full text-sm font-semibold ${
            prompt ? "bg-amber text-ink" : "bg-paper/90 text-ink"
          }`}
          onPointerDown={(e) => {
            e.stopPropagation();
            gameApi.interact();
          }}
        >
          Use
        </button>
      </div>
    </div>
  );
}

function Joystick() {
  const origin = useRef({ id: -1, x: 0, y: 0 });

  const apply = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    const max = rect.width * 0.38;
    const mag = Math.hypot(dx, dy) || 1;
    const scale = mag > max ? max / mag : 1;
    const clampedX = dx * scale;
    const clampedY = dy * scale;
    const knob = e.currentTarget.querySelector("[data-knob]");
    if (knob instanceof HTMLElement) knob.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    const vx = clampedX / max;
    const vy = clampedY / max;
    const dead = 0.18;
    const mags = Math.hypot(vx, vy);
    if (mags < dead) {
      input.stickX = 0;
      input.stickY = 0;
    } else {
      const k = (mags - dead) / (1 - dead) / mags;
      input.stickX = Math.max(-1, Math.min(1, vx * k));
      input.stickY = Math.max(-1, Math.min(1, -vy * k));
    }
  };

  return (
    <div
      className="pointer-events-auto relative grid size-32 place-items-center rounded-full border border-white/15 bg-dusk-2/55"
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = e.currentTarget.getBoundingClientRect();
        origin.current.id = e.pointerId;
        origin.current.x = rect.left + rect.width / 2;
        origin.current.y = rect.top + rect.height / 2;
        apply(e);
      }}
      onPointerMove={(e) => {
        if (origin.current.id !== e.pointerId) return;
        apply(e);
      }}
      onPointerUp={(e) => {
        origin.current.id = -1;
        releaseStick(e.currentTarget);
      }}
      onPointerCancel={(e) => {
        origin.current.id = -1;
        releaseStick(e.currentTarget);
      }}
    >
      <div data-knob className="size-14 rounded-full bg-paper/90 shadow-md" />
    </div>
  );
}

function releaseStick(node: HTMLDivElement) {
  const knob = node.querySelector("[data-knob]");
  if (knob instanceof HTMLElement) knob.style.transform = "translate(0px, 0px)";
  input.stickX = 0;
  input.stickY = 0;
}

function Toasts() {
  const toasts = useUi((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="absolute inset-x-0 top-28 flex flex-col items-center gap-2 px-4 sm:top-24">
      {toasts.map((t) => (
        <p key={t.id} className="max-w-sm rounded-full bg-paper px-4 py-2 text-center text-sm text-ink shadow">
          {t.text}
        </p>
      ))}
    </div>
  );
}

function Dialogue() {
  const dialogue = useUi((s) => s.dialogue);
  if (!dialogue) return null;
  return (
    <div className="safe-bottom absolute inset-x-0 bottom-0 px-3 pb-3">
      <section className="pointer-events-auto mx-auto w-full max-w-lg rounded-3xl bg-paper px-4 py-4 text-ink">
        <p className="text-xs tracking-wide text-clay uppercase">{dialogue.role}</p>
        <h2 className="font-display text-2xl leading-tight">{dialogue.name}</h2>
        <p className="mt-2 text-base leading-relaxed text-dusk">{dialogue.text}</p>
        <div className="mt-3 flex flex-col gap-2">
          {dialogue.choices.map((choice, i) => (
            <button
              key={choice}
              type="button"
              className="min-h-11 rounded-2xl bg-ink px-3 py-2 text-left text-sm text-paper"
              onClick={() => gameApi.choose(i)}
            >
              {choice}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function PauseCard() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-dusk-2/50 px-5">
      <section className="pointer-events-auto w-full max-w-sm rounded-3xl bg-paper px-5 py-5 text-ink">
        <h2 className="font-display text-4xl leading-none">Paused</h2>
        <p className="mt-2 text-sm leading-relaxed text-dusk">
          The street holds still. WASD or the stick walks you. Use talks, eats, works, and opens doors. Drag to look
          around. Rent leaves on Monday mornings.
        </p>
        <button type="button" className="mt-4 min-h-12 w-full rounded-2xl bg-ink text-paper" onClick={() => gameApi.resume()}>
          Resume
        </button>
        <button
          type="button"
          className="mt-2 min-h-11 w-full rounded-2xl border border-line text-dusk"
          onClick={() => gameApi.quit()}
        >
          Save and return
        </button>
      </section>
    </div>
  );
}

function PhonePanel() {
  const [tab, setTab] = useState<"now" | "people" | "life" | "places" | "log">("now");
  const ui = useUi();
  const tabs = [
    ["now", "Now"],
    ["people", "People"],
    ["life", "Life"],
    ["places", "Places"],
    ["log", "Log"],
  ] as const;

  return (
    <div className="absolute inset-0 flex items-end bg-dusk-2/40 sm:items-center sm:justify-center">
      <section className="sheet pointer-events-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-paper text-ink sm:rounded-3xl">
        <header className="flex items-center gap-3 px-4 py-3">
          <Phone className="size-5 text-clay" />
          <div>
            <p className="font-display text-2xl leading-none">{ui.name}'s phone</p>
            <p className="text-xs text-mist">
              {weekday(ui.day)} · {clockLabel(ui.minute)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close phone"
            className="ml-auto grid size-11 place-items-center rounded-2xl bg-paper-2"
            onClick={() => gameApi.closePhone()}
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="flex gap-1 overflow-x-auto px-3 pb-2">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`min-h-10 shrink-0 rounded-full px-3 text-sm ${tab === id ? "bg-ink text-paper" : "bg-paper-2 text-dusk"}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {tab === "now" ? <NowTab /> : null}
          {tab === "people" ? <PeopleTab /> : null}
          {tab === "life" ? <LifeTab /> : null}
          {tab === "places" ? <PlacesTab /> : null}
          {tab === "log" ? <LogTab /> : null}
        </div>
      </section>
    </div>
  );
}

function NowTab() {
  const needs = useUi((s) => s.needs);
  const food = useUi((s) => s.food);
  const money = useUi((s) => s.money);
  return (
    <div>
      <p className="text-base leading-relaxed text-dusk">{advice(needs)}</p>
      <div className="mt-4 flex flex-col gap-3">
        {NEEDS.map(({ id, label, Icon }) => (
          <div key={id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Icon className="size-4 text-dusk" />
                {label}
              </span>
              <span className="text-mist">{Math.round(needs[id])}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-paper-2">
              <div className={`h-full ${needTone(needs[id])}`} style={{ width: `${needs[id]}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-dusk">
        <Wallet className="mr-1 inline size-4 text-amber" /> ${Math.floor(money)} on hand · {food} meal
        {food === 1 ? "" : "s"} in the fridge. Rent is $80 on Monday.
      </p>
    </div>
  );
}

function PeopleTab() {
  const rel = useUi((s) => s.rel);
  const ids = Object.keys(NPC_META) as NpcId[];
  return (
    <ul className="flex flex-col gap-3">
      {ids.map((id) => (
        <li key={id} className="rounded-2xl bg-paper-2 px-3 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium">{NPC_META[id].name}</p>
            <p className="text-xs text-mist">{Math.round(rel[id])}</p>
          </div>
          <p className="text-xs text-clay">{NPC_META[id].role}</p>
          <p className="mt-1 text-sm leading-snug text-dusk">{NPC_META[id].where}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper">
            <div className="h-full bg-sage" style={{ width: `${rel[id]}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function LifeTab() {
  const goals = useUi((s) => s.goals);
  const done = GOAL_DEFS.filter((g) => goals[g.id]).length;
  return (
    <div>
      <p className="mb-3 text-sm text-dusk">
        {done} of {GOAL_DEFS.length} kept.
      </p>
      <ul className="flex flex-col gap-2">
        {GOAL_DEFS.map((g) => (
          <li key={g.id} className="flex gap-3 rounded-2xl bg-paper-2 px-3 py-3">
            <span className={`mt-0.5 size-3 shrink-0 rounded-full ${goals[g.id] ? "bg-sage" : "bg-line"}`} />
            <div>
              <p className="text-sm font-medium">{g.title}</p>
              <p className="text-sm text-dusk">{g.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlacesTab() {
  const place = useUi((s) => s.place);
  const rows = [
    { id: "home", name: "Apartment 2B", hours: "Always yours", icon: Home },
    { id: "cafe", name: "Harbor Cafe", hours: "Every day, 7 AM – 7 PM", icon: Utensils },
    { id: "market", name: "Cho's Market", hours: "Every day, 8 AM – 8 PM", icon: Wallet },
    { id: "office", name: "Northline Office", hours: "Weekdays 8–6 · Sat 10–2 · Sun closed", icon: Briefcase },
    { id: "pier", name: "The pier", hours: "South end, past the pocket park", icon: MapPin },
    { id: "bench", name: "Pocket park", hours: "Benches, a fountain, no fee", icon: BookOpen },
  ];
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => {
        const here = (row.id === "pier" || row.id === "bench") ? place === "street" : place === row.id;
        const Icon = row.icon;
        return (
          <li key={row.id} className="flex items-start gap-3 rounded-2xl bg-paper-2 px-3 py-3">
            <Icon className="mt-0.5 size-4 text-dusk" />
            <div>
              <p className="text-sm font-medium">
                {row.name}
                {here ? <span className="ml-2 text-xs text-clay">nearby</span> : null}
              </p>
              <p className="text-sm text-dusk">{row.hours}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LogTab() {
  const log = useUi((s) => s.log);
  if (!log.length) return <p className="text-sm text-dusk">Nothing written down yet.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {log.map((line, i) => (
        <li key={`${i}-${line}`} className="rounded-2xl bg-paper-2 px-3 py-3 text-sm leading-relaxed text-dusk">
          {line}
        </li>
      ))}
    </ul>
  );
}