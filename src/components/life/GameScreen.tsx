import { useEffect, useRef, useState } from "react";
import { Overlay } from "@/components/life/Overlay";

export function GameScreen() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let dead = false;
    let stop = () => {
      dead = true;
    };
    void import("@/game/engine")
      .then((mod) => {
        if (dead) return;
        const dispose = mod.mountGame(canvas);
        stop = () => {
          dead = true;
          dispose();
        };
      })
      .catch((err: unknown) => {
        if (dead) return;
        console.error("Daybreak Row could not start:", err);
        setError("The 3D game could not start. Use a WebGL-capable browser such as Chrome, then retry." + (new URLSearchParams(window.location.search).has("cityqa") ? " QA: " + String(err) : ""));
      });
    return () => stop();
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-dusk-2 text-paper">
      <canvas ref={ref} className="absolute inset-0 h-full w-full touch-none" aria-label="Daybreak Row" />
      <Overlay />
      {error ? (
        <div role="alert" className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-dusk-2/95 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-paper p-6 text-center text-ink">
            <h1 className="font-display text-3xl">Graphics unavailable</h1>
            <p className="mt-3 text-base">{error}</p>
            <button type="button" className="mt-5 rounded-2xl bg-ink px-6 py-3 text-paper" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}