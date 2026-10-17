import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
import { npcScheduleDescription } from "@/game/npc-routines";
import { CITY_STOPS, CITY_SITES, DISTRICTS, AVENUES, CROSS_STREETS, districtAt } from "@/game/city-layout";
import { CITY_ROUTE_REWARD, passportSnapshot } from "@/game/city-passport";
import { DISTRICT_BONUS, EXPLORER_BONUS, discoveredIds } from "@/game/discovery";
import { exportSave, gameApi, useUi } from "@/game/store";
import { input } from "@/game/input";
import { VirtualStick, type StickVector } from "@/game/virtual-stick";
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
        className={`absolute inset-0 z-30 flex items-center justify-center bg-dusk-2 transition-opacity duration-300 motion-ok ${ui.transitionLabel ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{ opacity: ui.veil }}
        aria-live="polite"
      >
        {ui.transitionLabel ? (
          <div className="max-w-[85vw] rounded-xl border border-white/20 bg-dusk-2/80 px-5 py-3 text-center text-base font-medium text-paper">
            {ui.transitionLabel}
          </div>
        ) : null}
      </div>
      {ui.mode === "title" ? <Title /> : null}
      {ui.mode !== "title" ? <TopBar /> : null}
      {ui.mode === "play" && !ui.transitionLabel ? <PlayChrome /> : null}
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

function SaveRecovery() {
  const warning=useUi(s=>s.saveError);
  const mode=useUi(s=>s.mode);
  if (!warning) return null;
  return <div role="alert" className="mt-3 rounded-xl border border-clay p-3 text-sm text-ink">
    <p>{warning}</p>
    <div className="mt-2 flex flex-wrap gap-2">
      {mode!=="title" ? <button type="button" className="rounded-lg border px-3 py-2" onClick={()=>gameApi.retrySave()}>Retry save</button> : null}
      <button type="button" className="rounded-lg border px-3 py-2" onClick={()=>{try{exportSave();}catch{useUi.setState({saveError:"Export blocked by browser permissions. Keep this tab open."});}}}>Export recovery data</button>
    </div>
  </div>;
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
        <SaveRecovery />
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
  const district = useUi((s) => s.district);
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
            <p className="truncate text-xs text-foam/80">{place === "street" ? district : placeLabel(place)}</p>
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
    <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-4 pb-3 select-none">
      <Joystick />
      <div className="pointer-events-auto flex shrink-0 items-end gap-3">
        <RunButton />
        <button
          type="button"
          aria-label={prompt ? "Use" : "Interact"}
          data-game-control="use"
          className={`grid size-16 shrink-0 touch-none select-none place-items-center rounded-full text-sm font-semibold ${
            prompt ? "bg-amber text-ink" : "bg-paper/90 text-ink"
          }`}
          onPointerDown={(e) => {
            // Activate immediately, even if the other thumb is holding the joystick.
            e.stopPropagation();
            e.preventDefault();
            gameApi.interact();
          }}
          onClick={(e) => {
            // Native keyboard and assistive-tech clicks have detail=0.
            if (e.detail === 0) gameApi.interact();
          }}
        >
          Use
        </button>
      </div>
    </div>
  );
}

function RunButton() {
  const heldId = useRef<number | null>(null);
  useEffect(() => {
    const reset = () => {
      heldId.current = null;
      input.runHeld = false;
    };
    const onHidden = () => { if (document.hidden) reset(); };
    const releasePointer = (e: PointerEvent) => { if (e.pointerId === heldId.current) reset(); };
    window.addEventListener("blur", reset);
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("blur", reset);
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
      document.removeEventListener("visibilitychange", onHidden);
      reset();
    };
  }, []);
  const release = (id: number) => {
    if (heldId.current !== id) return;
    heldId.current = null;
    input.runHeld = false;
  };
  return (
    <button
      type="button"
      aria-label="Run"
      data-game-control="run"
      className="grid size-14 shrink-0 touch-none select-none place-items-center rounded-full border border-white/15 bg-dusk-2/80 text-xs font-medium text-paper"
      onPointerDown={(e) => {
        if (heldId.current !== null) return;
        e.stopPropagation();
        e.preventDefault();
        heldId.current = e.pointerId;
        input.runHeld = true;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* window fallback handles release */ }
      }}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onLostPointerCapture={(e) => release(e.pointerId)}
    >
      Run
    </button>
  );
}

function Joystick() {
  const stick = useRef(new VirtualStick());
  const root = useRef<HTMLDivElement>(null);

  const apply = (v: StickVector) => {
    input.stickX = v.x;
    input.stickY = v.y;
    const knob = root.current?.querySelector("[data-knob]");
    if (knob instanceof HTMLElement) {
      knob.style.transform = `translate3d(${v.thumbX}px, ${v.thumbY}px, 0)`;
    }
  };

  useEffect(() => {
    const releaseAll = () => {
      stick.current.reset();
      input.stickX = 0;
      input.stickY = 0;
      const knob = root.current?.querySelector("[data-knob]");
      if (knob instanceof HTMLElement) knob.style.transform = "translate3d(0px, 0px, 0)";
    };
    const onHidden = () => { if (document.hidden) releaseAll(); };
    const onWindowMove = (e: PointerEvent) => {
      const v = stick.current.move(e.pointerId, e.clientX, e.clientY);
      if (!v) return;
      input.stickX = v.x;
      input.stickY = v.y;
      const knob = root.current?.querySelector("[data-knob]");
      if (knob instanceof HTMLElement) knob.style.transform = `translate3d(${v.thumbX}px, ${v.thumbY}px, 0)`;
    };
    const onWindowUp = (e: PointerEvent) => {
      if (stick.current.end(e.pointerId)) releaseAll();
    };
    window.addEventListener("blur", releaseAll);
    window.addEventListener("pointermove", onWindowMove);
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("blur", releaseAll);
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowUp);
      document.removeEventListener("visibilitychange", onHidden);
      releaseAll();
    };
  }, []);

  const release = (e: ReactPointerEvent<HTMLDivElement>) => {
    const vector = stick.current.end(e.pointerId);
    if (vector) apply(vector);
  };

  return (
    <div
      ref={root}
      role="application"
      aria-label="Movement joystick"
      data-game-control="joystick"
      className="pointer-events-auto relative grid size-32 shrink-0 touch-none select-none place-items-center rounded-full border border-white/15 bg-dusk-2/55"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (stick.current.pointerId !== null) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const v = stick.current.begin(
          e.pointerId, rect.left + rect.width / 2, rect.top + rect.height / 2,
          rect.width * 0.39, e.clientX, e.clientY,
        );
        if (v) apply(v);
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* window fallback continues dragging */ }
      }}
      onPointerMove={(e) => {
        const v = stick.current.move(e.pointerId, e.clientX, e.clientY);
        if (v) {
          e.preventDefault();
          apply(v);
        }
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div data-knob className="pointer-events-none size-14 rounded-full bg-paper/90 shadow-md will-change-transform" />
    </div>
  );
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
        <SaveRecovery />
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
  const [tab, setTab] = useState<"now" | "people" | "life" | "places" | "city" | "log">("now");
  const ui = useUi();
  const tabs = [
    ["now", "Now"],
    ["people", "People"],
    ["life", "Life"],
    ["places", "Places"],
    ["city", "City"],
    ["log", "Log"],
  ] as const;

  return (
    <div className="absolute inset-0 flex items-end bg-dusk-2/40 sm:items-center sm:justify-center">
      <section className="pointer-events-auto flex h-[min(78dvh,680px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-paper text-ink sm:rounded-3xl">
        <header className="flex shrink-0 items-center gap-3 px-4 py-3">
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
        <div className="flex shrink-0 gap-1 overflow-x-auto px-3 pb-2">
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
          {tab === "city" ? <CityTab /> : null}
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
  const minute=useUi((s)=>s.minute);
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
          <p className="mt-1 text-sm leading-snug text-dusk">{npcScheduleDescription(id,minute)}</p>
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
    { id: "bakery", name: "Old Town Bakery", hours: "Old Town · pastry counter and baker", icon: Utensils },
    { id: "gym", name: "Civic Fitness", hours: "Civic Quarter · workouts and trainer", icon: Briefcase },
    { id: "cinema", name: "Metro Cinema", hours: "Downtown · films, snacks and usher", icon: BookOpen },
    { id: "bookshop", name: "Corner Books", hours: "Civic Quarter · books, reading nook and bookseller", icon: BookOpen },
    { id: "laundry", name: "Fresh Spin Laundry", hours: "Old Town · wash, dry and talk to staff", icon: BookOpen },
    { id: "pier", name: "The pier", hours: "South end, past the pocket park", icon: MapPin },
    { id: "bench", name: "Pocket park", hours: "Benches, a fountain, no fee", icon: BookOpen },
  ];
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => {
        const here = (row.id === "pier" || row.id === "bench") ? place === "street" && useUi.getState().district === "Daybreak Row" : place === row.id;
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

function CityTab() {
  const day = useUi((s) => s.day);
  const cityPassportDay = useUi((s) => s.cityPassportDay);
  const cityPassportVisits = useUi((s) => s.cityPassportVisits);
  const cityPassportClaimed = useUi((s) => s.cityPassportClaimed);
  const passport = passportSnapshot({day,cityPassportDay,cityPassportVisits,cityPassportClaimed});
  const discoveries = useUi((s) => s.discoveredDistricts);
  const visited = discoveredIds({discoveredDistricts:discoveries});
  const money = useUi((s) => s.money);
  const place = useUi((s) => s.place);
  const district = useUi((s) => s.district);
  const playerX = useUi((s) => s.playerX);
  const playerZ = useUi((s) => s.playerZ);
  const canTravel = place === "street" && money >= 5;
  const plotX = (x: number) => 20 + (x + 39) * 1.1;
  const plotY = (z: number) => 15 + (z + 154) * 1.15;
  return (
    <div className="space-y-3 pb-2">
      <section className="rounded-2xl bg-paper-2 p-3 text-ink" aria-label="City explorer progress">
        <div className="flex items-center justify-between gap-2"><p className="font-display text-lg">City explorer</p><span className="text-sm font-medium">{visited.length}/{DISTRICTS.length}</span></div>
        <p className="mt-1 text-xs text-dusk">Discover each district by walking or riding transit. Earn ${DISTRICT_BONUS} per new district and ${EXPLORER_BONUS} for discovering all five.</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {DISTRICTS.map(d=><span key={d.id} className={visited.includes(d.id) ? "rounded-lg bg-emerald-100 px-2 py-1 text-xs text-emerald-900" : "rounded-lg bg-paper px-2 py-1 text-xs text-dusk"}>{visited.includes(d.id)?"✓ ":"○ "}{d.name}</span>)}
        </div>
      </section>
      <section className="rounded-2xl bg-paper-2 p-3 text-ink" aria-label="Daily city passport">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg">Today's city route</p>
          <span className="shrink-0 text-sm font-medium">{passport.completed.length}/3</span>
        </div>
        <p className="mt-1 text-xs text-dusk">Visit all three stops, then return to City Hall for a ${CITY_ROUTE_REWARD} reward.</p>
        <ul className="mt-2 space-y-1.5">
          {passport.tasks.map((task) => {
            const done = passport.visits.includes(task.id);
            return <li key={task.id} className="flex gap-2 text-sm">
              <span aria-hidden="true" className={done ? "text-emerald-700" : "text-dusk"}>{done ? "✓" : "○"}</span>
              <span className={done ? "line-through text-dusk" : ""}>{task.name} <span className="text-xs text-dusk">· {districtAt(task.x,task.z)}</span></span>
            </li>;
          })}
        </ul>
        <p className="mt-2 text-xs font-medium text-dusk">
          {passport.claimed ? "Reward collected today. A new route begins tomorrow." : passport.ready ? "Route completed! Interact with City Hall to collect your reward." : "Complete activities at the marked locations. A new route appears each day."}
        </p>
      </section>
      <div className="rounded-2xl bg-ink p-3 text-paper">
        <p className="font-display text-xl">Explore the city</p>
        <p className="mt-1 text-xs text-foam/80">Walk connected streets or ride city transit for $5 and 18 minutes.</p>
        <svg role="img" aria-label="Schematic city map showing your location, transit stops, and daily route destinations" viewBox="0 0 300 225" className="mt-3 w-full rounded-xl bg-[#263744]">
          {AVENUES.map((x) => <line key={x} x1={plotX(x)} x2={plotX(x)} y1={plotY(-150)} y2={plotY(8)} stroke="#57707c" strokeWidth="5" />)}
          {CROSS_STREETS.map((z) => <line key={z} x1={plotX(39)} x2={plotX(187)} y1={plotY(z)} y2={plotY(z)} stroke="#57707c" strokeWidth="5" />)}
          {passport.tasks.map((task,i) => {
            const done=passport.visits.includes(task.id);
            return <g key={task.id}>
              <circle cx={plotX(task.x)} cy={plotY(task.z)} r="9" fill={done ? "#456f55" : "#f0bb64"} stroke="#18242e" strokeWidth="2" />
              <text x={plotX(task.x)} y={plotY(task.z)+3.6} textAnchor="middle" fontSize="11" fontWeight="bold" fill={done ? "#ffffff" : "#18242e"}>{done ? "✓" : i+1}</text>
            </g>;
          })}
          <circle cx={plotX(playerX)} cy={plotY(playerZ)} r="8" fill="none" stroke="#ffffff" strokeWidth="2" />
          <circle cx={plotX(playerX)} cy={plotY(playerZ)} r="3" fill="#ffffff" />
          {CITY_STOPS.map((stop, i) => (
            <g key={stop.id}>
              <circle cx={plotX(stop.x)} cy={plotY(stop.z)} r="6" fill="#e7ad5e" stroke="#1c2227" strokeWidth="2" />
              <text x={plotX(stop.x)+9} y={plotY(stop.z)+(i%2?14:-8)} fill="#fff2d8" fontSize="9">{stop.name}</text>
            </g>
          ))}
        </svg>
        <p className="mt-1 text-xs text-foam/80">Gold numbered markers: today’s route · Orange dots: transit · White ring: you</p>
      </div>
      <p className="text-sm text-dusk">
        {place !== "street" ? "Step outside to use city transit." : `District: ${district}. ${canTravel ? "Choose a stop below." : "A transit ride requires $5."}`}
      </p>
      <div className="grid gap-2">
        {DISTRICTS.map((districtDef, i) => {
          const stop = CITY_STOPS[i];
          return (
            <div key={stop.id} className="flex items-center justify-between gap-3 rounded-2xl bg-paper-2 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{districtDef.name}</p>
                <p className="text-xs leading-snug text-dusk">{districtDef.subtitle}</p>
              </div>
              <button type="button" disabled={!canTravel}
                className="min-h-11 shrink-0 rounded-xl bg-ink px-3 text-sm text-paper disabled:opacity-40"
                aria-label={`Ride transit to ${districtDef.name}`}
                onClick={() => gameApi.travel(stop.id)}>Ride $5</button>
            </div>
          );
        })}
      </div>
      <p className="pt-1 text-sm font-medium text-dusk">City activities</p>
      <div className="grid grid-cols-2 gap-2">
        {CITY_SITES.map((site) => <div key={site.id} className="rounded-xl bg-paper-2 p-2">
          <p className="text-xs font-semibold">{site.name}</p><p className="text-xs text-dusk">{site.detail}</p>
        </div>)}
      </div>
    </div>
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