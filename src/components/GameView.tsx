import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { createEngine, type Engine } from "@/game/engine";
import { setAnalog, setTap } from "@/game/input";
import type { Snapshot } from "@/game/types";
import { MATCH_SECONDS } from "@/game/types";

function fmtClock(s: Snapshot) {
  if (s.overtime) return "OT";
  const t = Math.ceil(s.clock);
  const m = Math.floor(t / 60);
  const sec = t % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const pendingPlay = useRef(false);
  const [snap, setSnap] = useState<Snapshot>({
    score: [0, 0],
    clock: MATCH_SECONDS,
    overtime: false,
    boost: 33,
    speed: 0,
    phase: "menu",
    lastGoal: null,
    countdown: 3,
    onGround: true,
    yaw: 0,
  });
  const [help, setHelp] = useState(false);
  const { user, isPending } = useCurrentUserState();
  const stickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createEngine(canvas);
    engineRef.current = engine;
    const off = engine.subscribe(setSnap);
    engine.start();
    if (pendingPlay.current) {
      pendingPlay.current = false;
      engine.play();
    }
    return () => {
      off();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  function kickOff() {
    if (engineRef.current) engineRef.current.play();
    else pendingPlay.current = true;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyH") setHelp((v) => !v);
      if (e.code === "Enter" && (snap.phase === "menu" || snap.phase === "over")) {
        kickOff();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [snap.phase]);

  function onStick(e: React.PointerEvent<HTMLDivElement>) {
    const el = stickRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 2 - 1;
    const y = -((e.clientY - r.top) / r.height * 2 - 1);
    setAnalog(x, y);
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-ink text-fg" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-3 sm:px-6">
        <div className="rounded-md bg-ink/55 px-3 py-1.5 backdrop-blur-sm">
          <p className="font-display text-[11px] tracking-[0.28em] text-cyan uppercase">Boost Pitch</p>
        </div>
        <div className="flex items-center gap-3 rounded-md bg-ink/60 px-3 py-2 backdrop-blur-sm">
          <span className="font-display text-3xl font-bold tabular-nums text-cyan">{snap.score[0]}</span>
          <span className="font-display text-xl text-muted">–</span>
          <span className="font-display text-3xl font-bold tabular-nums text-amber">{snap.score[1]}</span>
          <span className="ml-2 font-display text-lg tracking-widest text-line">{fmtClock(snap)}</span>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {isPending ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-raised" />
          ) : user ? (
            <SignedIn>
              <UserButton />
            </SignedIn>
          ) : (
            <SignedOut>
              <Link
                to="/login"
                className="rounded-md border border-line/15 bg-ink/55 px-3 py-2 font-display text-xs tracking-widest text-muted uppercase backdrop-blur-sm hover:text-cyan"
              >
                Sign in
              </Link>
            </SignedOut>
          )}
        </div>
      </header>

      {snap.phase === "play" && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 w-56 -translate-x-1/2 sm:bottom-8">
          <div className="mb-1 flex justify-between font-display text-[11px] tracking-widest text-muted uppercase">
            <span>Boost</span>
            <span>{Math.round(snap.boost)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-cyan"
              style={{ width: `${Math.max(0, Math.min(100, snap.boost))}%` }}
            />
          </div>
        </div>
      )}

      {snap.phase === "countdown" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="font-display text-8xl font-bold text-fg drop-shadow-[0_0_24px_rgba(46,230,214,0.45)]">
            {snap.countdown > 0.15 ? Math.ceil(snap.countdown) : "GO"}
          </p>
        </div>
      )}

      {snap.phase === "goal" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="font-display text-6xl font-bold tracking-wide text-fg">
            {snap.lastGoal === 0 ? <span className="text-cyan">CYAN GOAL</span> : <span className="text-amber">AMBER GOAL</span>}
          </p>
        </div>
      )}

      {(snap.phase === "menu" || snap.phase === "over") && (
        <div className="absolute inset-0 grid place-items-center bg-ink/55 px-5 backdrop-blur-[2px]">
          <div className="max-w-md text-center">
            <p className="font-display text-sm tracking-[0.4em] text-cyan uppercase">Arena car soccer</p>
            <h1 className="mt-2 font-display text-6xl font-bold tracking-wide sm:text-7xl">BOOST PITCH</h1>
            {snap.phase === "over" ? (
              <p className="mt-4 font-display text-2xl">
                {snap.score[0] === snap.score[1]
                  ? "Draw"
                  : snap.score[0] > snap.score[1]
                    ? "Cyan wins"
                    : "Amber wins"}{" "}
                <span className="text-muted">
                  {snap.score[0]}–{snap.score[1]}
                </span>
              </p>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Drive a rocket-boosted car. Hit the ball into the amber net. Jump, aerial, and drain pads to keep boost flowing. One AI rival. {Math.floor(MATCH_SECONDS / 60)}:00 plus sudden-death OT.
              </p>
            )}
            <button
              type="button"
              onClick={kickOff}
              className="mt-7 rounded-md bg-cyan px-8 py-3 font-display text-xl font-bold tracking-widest text-ink uppercase"
            >
              {snap.phase === "over" ? "Rematch" : "Kick off"}
            </button>
            <p className="mt-5 font-display text-xs tracking-widest text-muted uppercase">
              WASD drive · Space jump · Shift boost · H help
            </p>
          </div>
        </div>
      )}

      {help && (
        <div className="pointer-events-none absolute bottom-28 left-4 max-w-xs rounded-md bg-ink/70 p-4 text-left text-sm text-fg backdrop-blur-sm sm:left-6">
          <p className="font-display tracking-widest text-cyan uppercase">Controls</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>W / S — throttle / reverse (pitch in air)</li>
            <li>A / D — steer left / right</li>
            <li>Space — jump, then flip / double jump</li>
            <li>Shift — boost (pads refill)</li>
          </ul>
        </div>
      )}

      <div className="absolute right-4 bottom-6 flex flex-col gap-3 sm:hidden">
        <button
          type="button"
          className="h-16 w-16 rounded-full border border-cyan/40 bg-cyan/20 font-display text-xs tracking-widest text-cyan uppercase"
          onPointerDown={() => setTap("boost", true)}
          onPointerUp={() => setTap("boost", false)}
          onPointerCancel={() => setTap("boost", false)}
        >
          Boost
        </button>
        <button
          type="button"
          className="h-16 w-16 rounded-full border border-line/30 bg-raised/80 font-display text-xs tracking-widest text-fg uppercase"
          onPointerDown={() => setTap("jump", true)}
          onPointerUp={() => setTap("jump", false)}
          onPointerCancel={() => setTap("jump", false)}
        >
          Jump
        </button>
      </div>
      <div
        ref={stickRef}
        className="absolute bottom-6 left-4 h-28 w-28 rounded-full border border-line/20 bg-raised/50 sm:hidden"
        onPointerDown={onStick}
        onPointerMove={(e) => e.buttons && onStick(e)}
        onPointerUp={() => setAnalog(0, 0)}
        onPointerCancel={() => setAnalog(0, 0)}
      />
    </div>
  );
}
