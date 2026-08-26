import { useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { createEngine, type Engine, type NetBridge } from "@/game/engine";
import { setAnalog, setTap } from "@/game/input";
import { BRICK_BRUCE, MATCH_SECONDS, MAX_CARS, type Livery, type RosterEntry, type Snapshot } from "@/game/types";
import { assignTeams, type CarWire, type HostWire } from "@/game/sim";
import { useP2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { OrbitSkyline } from "@/components/OrbitSkyline";
import { OrbitRadio } from "@/components/OrbitRadio";
import { startAlbum, toggleMute, toggleMusic } from "@/game/orbitMusic";

function fmtClock(s: Snapshot) {
  if (s.overtime) return "OT";
  const t = Math.ceil(s.clock);
  const m = Math.floor(t / 60);
  const sec = t % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function roomCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

function buildOnlineRoster(
  selfId: string,
  name: string,
  livery: Livery,
  peers: PeerInfo[],
  remotes: Record<string, CarWire>,
): RosterEntry[] {
  const ids = [selfId, ...peers.map((p) => p.id)].slice(0, MAX_CARS);
  const teams = assignTeams(ids);
  return ids.map((id) => {
    const isLocal = id === selfId;
    const remote = remotes[id];
    const peer = peers.find((p) => p.id === id);
    return {
      peerId: id,
      name: isLocal ? name : remote?.name || peer?.name || id,
      livery: isLocal ? livery : remote?.livery || "slate",
      team: teams.get(id) ?? 0,
      isLocal,
      remote: !isLocal,
    };
  });
}

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const pendingPlay = useRef(false);
  const netRef = useRef<NetBridge>({
    role: "solo",
    localPeerId: "local-0",
    localName: BRICK_BRUCE.name,
    localLivery: BRICK_BRUCE.livery,
    remotes: {},
    hostWorld: null,
  });
  const [snap, setSnap] = useState<Snapshot>({
    score: [0, 0],
    clock: MATCH_SECONDS,
    overtime: false,
    boost: 33,
    speed: 0,
    phase: "menu",
    practice: "match",
    lastGoal: null,
    countdown: 3,
    onGround: true,
    yaw: 0,
    localName: BRICK_BRUCE.name,
    roster: [],
    lastNudgeBits: "00",
    boosting: false,
    aerial: false,
    slip: 0,
    lock: 0,
  });
  const [help, setHelp] = useState(false);
  const [name, setName] = useState(BRICK_BRUCE.name);
  const [livery, setLivery] = useState<Livery>(BRICK_BRUCE.livery);
  const [joinCode, setJoinCode] = useState("");
  const [session, setSession] = useState<{ room: string; name: string; livery: Livery } | null>(null);
  const { user, isPending } = useCurrentUserState();
  const stickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createEngine(canvas, netRef);
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
    netRef.current.role = "solo";
    netRef.current.localName = name.trim() || BRICK_BRUCE.name;
    netRef.current.localLivery = livery;
    startAlbum();
    if (engineRef.current) engineRef.current.play();
    else pendingPlay.current = true;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyH") setHelp((v) => !v);
      if (e.code === "KeyM") toggleMute();
      if (e.code === "KeyN") toggleMusic();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onStick(e: React.PointerEvent<HTMLDivElement>) {
    const el = stickRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    setAnalog(x, y);
  }

  const displayName = name.trim() || BRICK_BRUCE.name;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-ink text-fg" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="bp-vignette" />

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-3 sm:px-6">
        <div className="rounded-md bg-ink/55 px-3 py-1.5 backdrop-blur-sm">
          <p className="font-display text-[11px] tracking-[0.28em] text-cyan uppercase">Boost Pitch</p>
          <p className="font-display text-[10px] tracking-widest text-amber uppercase">{snap.localName}</p>
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

      {snap.phase !== "menu" && snap.roster.length > 0 && (
        <ul className="pointer-events-none absolute top-20 left-4 space-y-1 rounded-md bg-ink/50 px-3 py-2 text-left backdrop-blur-sm">
          {snap.roster.map((r) => (
            <li key={r.peerId} className="font-display text-[11px] tracking-wide">
              <span className={r.team === 0 ? "text-cyan" : "text-amber"}>{r.name}</span>
            </li>
          ))}
        </ul>
      )}

      {snap.phase === "play" && snap.practice !== "match" && (
        <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 rounded-full border border-cyan/30 bg-ink/65 px-4 py-2 text-center backdrop-blur-sm">
          <p className="font-display text-xs font-bold tracking-[0.28em] text-cyan uppercase">
            {snap.practice === "aerial" ? "Aerial Lab" : "Goal Lab"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {snap.practice === "aerial" ? "Use Space + Shift to meet the floating target" : "Drive through the ball and finish in the amber net"}
          </p>
        </div>
      )}

      {snap.phase === "play" && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 w-56 -translate-x-1/2 sm:bottom-8 sm:w-72">
          <div className="mb-2 flex items-end justify-between">
            <div className="text-left">
              <p className="font-display text-3xl font-bold leading-none tabular-nums text-fg">
                {Math.round(snap.speed * 4)}
              </p>
              <p className="font-display text-[10px] tracking-[0.28em] text-muted uppercase">Speed</p>
            </div>
            <div className="flex gap-1">
              {snap.aerial ? (
                <span className="rounded-sm border border-line/20 bg-ink/70 px-2 py-0.5 font-display text-[10px] tracking-[0.22em] text-cyan uppercase">
                  Aerial
                </span>
              ) : null}
              {snap.boosting ? (
                <span className="rounded-sm border border-cyan/40 bg-cyan/15 px-2 py-0.5 font-display text-[10px] tracking-[0.22em] text-cyan uppercase">
                  Boost
                </span>
              ) : null}
              {snap.slip > 0.22 && snap.onGround ? (
                <span className="rounded-sm border border-amber/35 bg-amber/10 px-2 py-0.5 font-display text-[10px] tracking-[0.22em] text-amber uppercase">
                  Slide
                </span>
              ) : null}
              {snap.lock > 0.55 && snap.onGround && !snap.aerial ? (
                <span className="rounded-sm border border-cyan/30 bg-cyan/10 px-2 py-0.5 font-display text-[10px] tracking-[0.22em] text-cyan uppercase">
                  Posi
                </span>
              ) : null}
              {snap.speed > 32 ? (
                <span className="rounded-sm border border-amber/40 bg-amber/15 px-2 py-0.5 font-display text-[10px] tracking-[0.22em] text-amber uppercase">
                  Breakaway
                </span>
              ) : null}
            </div>
          </div>
          <div className="mb-1 flex justify-between font-display text-[11px] tracking-widest text-muted uppercase">
            <span>Boost</span>
            <span>{Math.round(snap.boost)}</span>
          </div>
          <div className="flex h-3 gap-1">
            {Array.from({ length: 5 }, (_, i) => {
              const fill = Math.max(0, Math.min(1, (snap.boost - i * 20) / 20));
              return (
                <div key={i} className="h-full flex-1 overflow-hidden rounded-sm bg-raised">
                  <div
                    className={`h-full ${snap.boosting ? "bg-cyan" : "bg-cyan/80"}`}
                    style={{ width: `${fill * 100}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {snap.phase !== "menu" && (
        <div className="absolute bottom-36 left-1/2 z-10 -translate-x-1/2 sm:bottom-8 sm:left-4 sm:translate-x-0">
          <OrbitRadio compact />
        </div>
      )}

      {snap.phase === "countdown" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="bp-pop font-display text-8xl font-bold text-fg drop-shadow-[0_0_24px_rgba(46,230,214,0.45)]">
              {snap.countdown > 0.15 ? Math.ceil(snap.countdown) : "GO"}
            </p>
            <p className="mt-2 font-display text-[11px] tracking-[0.3em] text-muted uppercase">
              Kickoff sample {snap.lastNudgeBits}
            </p>
          </div>
        </div>
      )}

      {snap.phase === "goal" && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-14 bg-ink/80 sm:h-16" />
          <div className="absolute inset-x-0 bottom-0 h-14 bg-ink/80 sm:h-16" />
          <div className="grid h-full place-items-center">
            <p className="bp-pop font-display text-6xl font-bold tracking-wide text-fg">
              {snap.lastGoal === 0 ? <span className="text-cyan">CYAN GOAL</span> : <span className="text-amber">AMBER GOAL</span>}
            </p>
          </div>
        </div>
      )}

      {(snap.phase === "menu" || snap.phase === "over") && !session && (
        <div className="absolute inset-0 flex items-end justify-center overflow-y-auto px-4 py-5 sm:items-center sm:justify-start sm:px-10 lg:px-16">
          <div className="w-full max-w-md rounded-lg border border-line/15 bg-ink/80 p-5 text-center shadow-[0_24px_80px_rgba(7,16,24,0.55)] backdrop-blur-sm sm:p-6">
            <p className="font-display text-sm tracking-[0.4em] text-cyan uppercase">The Orbit coupe</p>
            <h1 className="mt-1 font-display text-5xl font-bold tracking-wide sm:mt-2 sm:text-7xl">BOOST PITCH</h1>
            {snap.phase === "over" ? (
              <p className="mt-4 font-display text-2xl">
                {snap.score[0] === snap.score[1] ? "Draw" : snap.score[0] > snap.score[1] ? "Cyan wins" : "Amber wins"}{" "}
                <span className="text-muted">
                  {snap.score[0]}–{snap.score[1]}
                </span>
              </p>
            ) : (
              <p className="mt-4 hidden text-sm leading-relaxed text-muted sm:block">
                Drive the black 70s muscle from <span className="text-amber">The Orbit</span> — cyan bars, cover
                driver, no red brick. Solo vs AI, or casual P2P with friends.
              </p>
            )}

            <div className="mt-4 overflow-hidden rounded-md border border-line/10">
              <img
                src="/orbit/orbit-cover.jpg"
                alt="The Orbit — Brick Bruce album cover"
                className="h-20 w-full object-cover object-[48%_70%] sm:h-32"
              />
            </div>

            <label className="mt-4 block text-left">
              <span className="font-display text-[11px] tracking-widest text-muted uppercase">Driver</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 24))}
                className="mt-1 w-full rounded-md border border-line/15 bg-raised px-3 py-2 font-display text-lg text-fg outline-none focus:border-cyan/50"
              />
            </label>
            <div className="mt-3 flex gap-2">
              {(["brick", "cyan", "amber", "slate"] as Livery[]).map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setLivery(lv)}
                  className={`flex-1 rounded-md border px-2 py-2 font-display text-xs tracking-widest uppercase ${
                    livery === lv ? "border-cyan bg-cyan/15 text-cyan" : "border-line/15 text-muted"
                  }`}
                >
                  {lv === "brick" ? "Orbit" : lv}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={kickOff}
              className="mt-4 w-full rounded-md bg-cyan px-8 py-3 font-display text-xl font-bold tracking-widest text-ink uppercase sm:mt-6"
            >
              {snap.phase === "over" ? "Rematch vs AI" : "Solo kick off"}
            </button>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  startAlbum();
                  setSession({ room: roomCode(), name: displayName, livery });
                }}
                className="rounded-md border border-amber/40 bg-amber/10 px-3 py-3 font-display text-sm font-bold tracking-widest text-amber uppercase"
              >
                Host room
              </button>
              <div className="flex gap-1">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                  placeholder="CODE"
                  className="w-full rounded-md border border-line/15 bg-raised px-2 py-2 text-center font-display tracking-[0.3em] text-fg outline-none"
                />
                <button
                  type="button"
                  disabled={joinCode.length < 4}
                  onClick={() => setSession({ room: joinCode, name: displayName, livery })}
                  className="rounded-md border border-cyan/40 px-3 font-display text-xs tracking-widest text-cyan uppercase disabled:opacity-40"
                >
                  Join
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => engineRef.current?.practice("aerial")}
                className="rounded-md border border-cyan/35 bg-cyan/10 px-3 py-2 text-left font-display text-xs font-bold tracking-widest text-cyan uppercase hover:bg-cyan/20"
              >
                Aerial lab
                <span className="mt-1 block font-sans text-[10px] font-normal normal-case tracking-normal text-muted">Floating target + full boost</span>
              </button>
              <button
                type="button"
                onClick={() => engineRef.current?.practice("goals")}
                className="rounded-md border border-amber/35 bg-amber/10 px-3 py-2 text-left font-display text-xs font-bold tracking-widest text-amber uppercase hover:bg-amber/20"
              >
                Goal lab
                <span className="mt-1 block font-sans text-[10px] font-normal normal-case tracking-normal text-muted">Fast reset + target net</span>
              </button>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              Casual lobby only — friends you invite. Peers learn each other's IPs. Not for ranked play.
            </p>
            <OrbitRadio />
            <p className="mt-2 font-display text-xs tracking-widest text-muted uppercase">
              WASD drive · Space jump · Shift boost · H help · M mute · N play
            </p>
            <p className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <a
                className="hover:text-cyan"
                href="https://distrokid.com/hyperfollow/brickbruce/the-orbit?ref=release"
                target="_blank"
                rel="noreferrer"
              >
                Stream The Orbit
              </a>
              <a
                className="hover:text-cyan"
                href="https://open.spotify.com/album/5BoIJ736xwpMsNJTaWpwVT"
                target="_blank"
                rel="noreferrer"
              >
                Spotify
              </a>
              <a
                className="hover:text-cyan"
                href="https://www.youtube.com/playlist?list=OLAK5uy_nvrml4ucCtBOtycB_zF-fD8t77Dzcj-tU"
                target="_blank"
                rel="noreferrer"
              >
                Watch
              </a>
            </p>
            <div className="hidden sm:block">
              <OrbitSkyline />
            </div>
          </div>
        </div>
      )}

      {session && (
        <OnlineLobby
          room={session.room}
          name={session.name}
          livery={session.livery}
          engineRef={engineRef}
          netRef={netRef}
          phase={snap.phase}
          onLeave={() => {
            netRef.current = {
              role: "solo",
              localPeerId: "local-0",
              localName: displayName,
              localLivery: livery,
              remotes: {},
              hostWorld: null,
            };
            setSession(null);
          }}
        />
      )}

      {help && (
        <div className="pointer-events-none absolute bottom-28 left-4 max-w-xs rounded-md bg-ink/70 p-4 text-left text-sm text-fg backdrop-blur-sm sm:left-6">
          <p className="font-display tracking-widest text-cyan uppercase">Controls</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>W / S — throttle / reverse (pitch in air)</li>
            <li>A / D — steer left / right</li>
            <li>Rear clutch LSD (Posi) — planted on power, rotates off throttle</li>
            <li>Space — jump, then flip / double jump</li>
            <li>Shift — boost (pads refill)</li>
            <li>M — mute album · N — play / pause</li>
          </ul>
        </div>
      )}

      {snap.phase === "play" && (
        <>
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
        </>
      )}
    </div>
  );
}

function OnlineLobby({
  room,
  name,
  livery,
  engineRef,
  netRef,
  phase,
  onLeave,
}: {
  room: string;
  name: string;
  livery: Livery;
  engineRef: RefObject<Engine | null>;
  netRef: MutableRefObject<NetBridge>;
  phase: Snapshot["phase"];
  onLeave: () => void;
}) {
  const p2p = useP2PRoom({ room, name });
  const remotes = useRef<Record<string, CarWire>>({});
  const hostWorld = useRef<HostWire | null>(null);
  const joinedMatch = useRef(false);
  const [ready, setReady] = useState(false);
  const [readyIds, setReadyIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const hostId = useMemo(() => {
    const ids = [p2p.selfId, ...p2p.peers.map((p) => p.id)].sort();
    return ids[0] ?? p2p.selfId;
  }, [p2p.selfId, p2p.peers]);
  const isHost = p2p.selfId === hostId;

  useEffect(() => {
    netRef.current.localPeerId = p2p.selfId;
    netRef.current.localName = name;
    netRef.current.localLivery = livery;
    netRef.current.role = isHost ? "host" : "client";
    netRef.current.remotes = remotes.current;
    netRef.current.hostWorld = hostWorld.current;
    engineRef.current?.setIdentity(p2p.selfId, name, livery);
  }, [p2p.selfId, name, livery, isHost, netRef, engineRef]);

  useEffect(
    () =>
      p2p.onMessage((from, data) => {
        const msg = data as { t?: string; car?: CarWire; host?: HostWire; roster?: RosterEntry[] };
        if (msg?.t === "car" && msg.car) {
          remotes.current[from] = msg.car;
          netRef.current.remotes = remotes.current;
        }
        if (msg?.t === "host" && msg.host) {
          hostWorld.current = msg.host;
          netRef.current.hostWorld = msg.host;
          if (!joinedMatch.current && msg.host.phase !== "menu" && msg.host.phase !== "over") {
            joinedMatch.current = true;
            const roster = buildOnlineRoster(p2p.selfId, name, livery, p2p.peers, remotes.current).map((r) => ({
              ...r,
              isLocal: r.peerId === p2p.selfId,
              remote: r.peerId !== p2p.selfId,
            }));
            engineRef.current?.play(roster);
          }
        }
        if (msg?.t === "go") {
          joinedMatch.current = true;
          const incoming = msg.roster ?? [];
          const roster =
            incoming.length > 0
              ? incoming.map((r) => ({
                  ...r,
                  isLocal: r.peerId === p2p.selfId,
                  remote: r.peerId !== p2p.selfId,
                }))
              : buildOnlineRoster(p2p.selfId, name, livery, p2p.peers, remotes.current);
          engineRef.current?.play(roster);
        }
        if (msg?.t === "ready") {
          setReadyIds((prev) => (prev.includes(from) ? prev : [...prev, from]));
        }
      }),
    [p2p, engineRef, netRef, name, livery],
  );

  useEffect(() => {
    const alive = new Set(p2p.peers.map((p) => p.id));
    for (const id of Object.keys(remotes.current)) {
      if (!alive.has(id)) delete remotes.current[id];
    }
    netRef.current.remotes = remotes.current;
    setReadyIds((prev) => prev.filter((id) => alive.has(id)));
  }, [p2p.peers, netRef]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last > 50) {
        last = now;
        const car = engineRef.current?.getLocalWire();
        if (car) p2p.broadcast({ t: "car", car });
        if (isHost && engineRef.current) {
          p2p.broadcast({ t: "host", host: engineRef.current.getHostWire() });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [p2p, engineRef, isHost]);

  function startOnline() {
    const roster = buildOnlineRoster(p2p.selfId, name, livery, p2p.peers, remotes.current);
    p2p.send({ t: "go", roster });
    joinedMatch.current = true;
    engineRef.current?.play(roster);
  }

  function toggleReady(next: boolean) {
    setReady(next);
    if (next) p2p.send({ t: "ready" });
  }

  return (
    <div
      className={`absolute ${phase === "menu" || phase === "over" ? "inset-0 grid place-items-center bg-ink/60" : "top-16 right-4"} z-10 px-4`}
    >
      <div className="w-full max-w-sm rounded-lg border border-amber/30 bg-surface p-5 text-left shadow-[0_0_40px_rgba(255,138,61,0.08)]">
        <p className="font-display text-[11px] tracking-[0.3em] text-amber uppercase">Casual room</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="font-display text-3xl font-bold tracking-[0.25em] text-fg">{room}</p>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard?.writeText(room);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1400);
              } catch {
                setCopied(false);
              }
            }}
            className="rounded border border-line/20 px-2 py-1 font-display text-[10px] tracking-widest text-muted uppercase hover:border-cyan/50 hover:text-cyan"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          {p2p.joined ? "Signaling live" : "Connecting…"} · {isHost ? "You are host" : "Host is another peer"} · {p2p.peers.length + 1}/{MAX_CARS}
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li className="text-amber">
            {name} <span className="text-muted">(you{ready ? " · ready" : ""})</span>
          </li>
          {p2p.peers.map((p) => (
            <li key={p.id} className="flex justify-between text-fg">
              <span>
                {p.name || p.id}
                {readyIds.includes(p.id) ? <span className="text-muted"> · ready</span> : null}
              </span>
              <span className="text-muted">{p.connectionState}</span>
            </li>
          ))}
        </ul>
        {(phase === "menu" || phase === "over") && (
          <div className="mt-4 flex gap-2">
            {isHost ? (
              <button
                type="button"
                onClick={startOnline}
                className="flex-1 rounded-md bg-amber px-3 py-2 font-display text-sm font-bold tracking-widest text-ink uppercase"
              >
                Kick off
              </button>
            ) : (
              <p className="flex-1 py-2 text-sm text-muted">Waiting for host…</p>
            )}
            <button
              type="button"
              onClick={onLeave}
              className="rounded-md border border-line/20 px-3 py-2 font-display text-xs tracking-widest text-muted uppercase"
            >
              Leave
            </button>
          </div>
        )}
        {phase !== "menu" && phase !== "over" && (
          <button type="button" onClick={onLeave} className="mt-3 text-xs text-muted underline">
            Leave room
          </button>
        )}
        <label className="mt-3 flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={ready} onChange={(e) => toggleReady(e.target.checked)} />
          Ready (honor system — not ranked)
        </label>
      </div>
    </div>
  );
}
