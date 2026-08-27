import { useEffect, useState } from "react";
import {
  ORBIT_ALBUM,
  ORBIT_ARTIST,
  ORBIT_SPOTIFY_URL,
  ORBIT_TRACKS,
  getMusicState,
  nextTrack,
  playId,
  prevTrack,
  subscribeMusic,
  toggleMute,
  toggleMusic,
  type MusicState,
} from "@/game/orbitMusic";

function fmt(t: number) {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const s = Math.floor(t);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function useOrbitMusic() {
  const [state, setState] = useState<MusicState>(getMusicState);
  useEffect(() => subscribeMusic(setState), []);
  return state;
}

export function OrbitRadio({ compact = false }: { compact?: boolean }) {
  const music = useOrbitMusic();
  const progress = music.duration > 0 ? Math.min(1, music.current / music.duration) : 0;

  if (compact) {
    return (
      <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-line/10 bg-ink/70 px-2 py-1.5 backdrop-blur-sm">
        <button
          type="button"
          onClick={toggleMusic}
          className="font-display text-[11px] tracking-widest text-cyan uppercase"
        >
          {music.playing ? "Pause" : "Play"}
        </button>
        <p className="max-w-[9rem] truncate font-display text-[11px] tracking-wide text-fg">
          {music.id ? music.title : ORBIT_ALBUM}
        </p>
        <button
          type="button"
          onClick={toggleMute}
          className="font-display text-[10px] tracking-widest text-muted uppercase hover:text-cyan"
        >
          {music.muted ? "Unmute" : "Mute"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-md border border-line/10 bg-raised/70 p-3 text-left">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-[11px] tracking-[0.28em] text-cyan uppercase">{ORBIT_ALBUM}</p>
        <p className="font-display text-[10px] tracking-widest text-muted uppercase">{ORBIT_ARTIST}</p>
      </div>
      <p className="mt-2 font-display text-lg tracking-wide text-fg">
        {music.id ? music.title : "Full album masters"}
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink">
        <div className="h-full bg-cyan" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between font-display text-[10px] tracking-widest text-muted">
        <span>{fmt(music.current)}</span>
        <span>{fmt(music.duration)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleMusic}
          className="rounded-md bg-cyan px-3 py-2 font-display text-xs font-bold tracking-widest text-ink uppercase"
        >
          {music.playing ? "Pause" : music.id ? "Resume" : "Play album"}
        </button>
        <button
          type="button"
          onClick={prevTrack}
          className="rounded-md border border-line/15 px-3 py-2 font-display text-xs tracking-widest text-muted uppercase hover:text-fg"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={nextTrack}
          className="rounded-md border border-line/15 px-3 py-2 font-display text-xs tracking-widest text-muted uppercase hover:text-fg"
        >
          Next
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="rounded-md border border-line/15 px-3 py-2 font-display text-xs tracking-widest text-muted uppercase hover:text-fg"
        >
          {music.muted ? "Unmute" : "Mute"}
        </button>
      </div>
      <div className="mt-2 min-h-8" aria-live="polite">
        {music.missing ? <p className="text-[11px] text-muted">Local masters unavailable — open the official album to listen.</p> : null}
        {music.needsGesture && !music.playing ? <p className="text-[11px] text-muted">Tap Play album to unlock sound.</p> : null}
      </div>
      <a
        href={ORBIT_SPOTIFY_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex rounded-md border border-[#1ed760]/40 px-3 py-2 font-display text-xs tracking-widest text-[#1ed760] uppercase hover:bg-[#1ed760]/10"
      >
        Open Brick Bruce on Spotify
      </a>
      <ol className="mt-3 space-y-0.5">
        {ORBIT_TRACKS.map((t, i) => {
          const active = music.id === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => playId(t.id)}
                className={`flex w-full items-center gap-2 rounded px-1 py-1 text-left font-display text-xs tracking-wide ${
                  active ? "text-cyan" : "text-muted hover:text-fg"
                }`}
              >
                <span className="w-4 tabular-nums text-muted">{i + 1}</span>
                <span>{t.title}</span>
                {active && music.playing ? <span className="ml-auto text-[10px] tracking-widest uppercase">Now</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        Plays each song once, album order. No 30-second loops.
      </p>
    </div>
  );
}
