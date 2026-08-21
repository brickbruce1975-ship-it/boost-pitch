/** The Orbit — full masters. Same ids / order as Unity OrbitAudio.cs. Do not loop. */

export const ORBIT_TRACKS = [
  { id: "suit-up", title: "Suit Up" },
  { id: "float-easy", title: "Float Easy" },
  { id: "spaceage", title: "Spaceage" },
  { id: "astronaut", title: "Astronaut" },
  { id: "witness", title: "Witness" },
  { id: "the-shimmer", title: "The Shimmer" },
  { id: "in-the-glass", title: "In the Glass" },
] as const;

export type OrbitTrackId = (typeof ORBIT_TRACKS)[number]["id"];

export const ORBIT_ALBUM = "The Orbit";
export const ORBIT_ARTIST = "Brick Bruce";
const MUSIC_VOL = 0.82;
const FADE_SEC = 2.5;
const MUTE_KEY = "boost-pitch-orbit-mute";

export type MusicState = {
  id: OrbitTrackId | null;
  title: string;
  index: number;
  playing: boolean;
  muted: boolean;
  current: number;
  duration: number;
  needsGesture: boolean;
  missing: boolean;
};

const listeners = new Set<(s: MusicState) => void>();
let el: HTMLAudioElement | null = null;
let playingId: OrbitTrackId | null = null;
let muted = false;
let needsGesture = false;
let missing = false;
let fadeRaf = 0;
let tickRaf = 0;

try {
  muted = typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
} catch {
  muted = false;
}

function trackIndex(id: string | null) {
  return ORBIT_TRACKS.findIndex((t) => t.id === id);
}

function titleOf(id: string | null) {
  return ORBIT_TRACKS.find((t) => t.id === id)?.title ?? ORBIT_ALBUM;
}

export function getMusicState(): MusicState {
  const index = Math.max(0, trackIndex(playingId));
  return {
    id: playingId,
    title: titleOf(playingId),
    index,
    playing: !!el && !el.paused && !el.ended,
    muted,
    current: el?.currentTime ?? 0,
    duration: Number.isFinite(el?.duration) ? (el?.duration ?? 0) : 0,
    needsGesture,
    missing,
  };
}

function emit() {
  const s = getMusicState();
  for (const fn of listeners) fn(s);
}

export function subscribeMusic(fn: (s: MusicState) => void) {
  listeners.add(fn);
  fn(getMusicState());
  return () => {
    listeners.delete(fn);
  };
}

function ensureEl() {
  if (el) return el;
  el = new Audio();
  el.preload = "auto";
  el.loop = false;
  el.crossOrigin = "anonymous";
  el.volume = muted ? 0 : MUSIC_VOL;
  el.addEventListener("ended", onEnded);
  el.addEventListener("error", () => {
    missing = true;
    emit();
  });
  el.addEventListener("timeupdate", () => {
    if (!tickRaf) tickRaf = requestAnimationFrame(() => {
      tickRaf = 0;
      emit();
    });
  });
  el.addEventListener("play", emit);
  el.addEventListener("pause", emit);
  return el;
}

function onEnded() {
  const i = trackIndex(playingId);
  if (i < 0 || i >= ORBIT_TRACKS.length - 1) {
    playingId = null;
    emit();
    return;
  }
  void playId(ORBIT_TRACKS[i + 1].id);
}

export function unlockMusic() {
  const node = ensureEl();
  if (node.paused && playingId) void node.play().catch(() => undefined);
}

export function startAlbum() {
  if (el && !el.paused && playingId) return;
  if (el && playingId) {
    void el.play().then(() => {
      needsGesture = false;
      emit();
    }).catch(() => {
      needsGesture = true;
      emit();
    });
    return;
  }
  void playId("suit-up");
}

export async function playId(id: OrbitTrackId) {
  const node = ensureEl();
  if (fadeRaf) {
    cancelAnimationFrame(fadeRaf);
    fadeRaf = 0;
  }
  playingId = id;
  missing = false;
  node.loop = false;
  node.src = `/orbit/music/${id}.mp3`;
  node.volume = muted ? 0 : MUSIC_VOL;
  try {
    await node.play();
    needsGesture = false;
    missing = false;
  } catch {
    needsGesture = true;
  }
  emit();
}

export function toggleMusic() {
  const node = ensureEl();
  if (!playingId) {
    void playId("suit-up");
    return;
  }
  if (node.paused) {
    void node.play().then(() => {
      needsGesture = false;
      emit();
    }).catch(() => {
      needsGesture = true;
      emit();
    });
  } else {
    node.pause();
    emit();
  }
}

export function nextTrack() {
  const i = Math.max(0, trackIndex(playingId));
  const n = (i + 1) % ORBIT_TRACKS.length;
  void playId(ORBIT_TRACKS[n].id);
}

export function prevTrack() {
  const i = Math.max(0, trackIndex(playingId));
  if ((el?.currentTime ?? 0) > 2) {
    if (el) el.currentTime = 0;
    emit();
    return;
  }
  const n = (i - 1 + ORBIT_TRACKS.length) % ORBIT_TRACKS.length;
  void playId(ORBIT_TRACKS[n].id);
}

export function setMuted(next: boolean) {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    /* private mode */
  }
  if (el) el.volume = next ? 0 : MUSIC_VOL;
  emit();
}

export function toggleMute() {
  setMuted(!muted);
}

export function fadeOut(seconds = FADE_SEC) {
  const node = el;
  if (!node || node.paused) return;
  const start = node.volume;
  const t0 = performance.now();
  const dur = Math.max(50, seconds * 1000);
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / dur);
    node.volume = start * (1 - t);
    if (t < 1) {
      fadeRaf = requestAnimationFrame(step);
      return;
    }
    node.pause();
    node.volume = muted ? 0 : MUSIC_VOL;
    fadeRaf = 0;
    emit();
  };
  fadeRaf = requestAnimationFrame(step);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && el && playingId && !el.paused) {
      void el.play().catch(() => undefined);
    }
  });
}
