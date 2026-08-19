import type { Actions } from "./types";

const held = new Set<string>();
const analog = { x: 0, y: 0 };
const tap = { boost: false, jump: false };

function onKey(e: KeyboardEvent, down: boolean) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (
    e.code.startsWith("Key") ||
    e.code.startsWith("Arrow") ||
    e.code === "Space" ||
    e.code === "ShiftLeft" ||
    e.code === "ShiftRight"
  ) {
    e.preventDefault();
  }
  if (down) held.add(e.code);
  else held.delete(e.code);
}

function onBlur() {
  held.clear();
  analog.x = 0;
  analog.y = 0;
}

export function attachInput() {
  const kd = (e: KeyboardEvent) => onKey(e, true);
  const ku = (e: KeyboardEvent) => onKey(e, false);
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onBlur);
  return () => {
    window.removeEventListener("keydown", kd);
    window.removeEventListener("keyup", ku);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onBlur);
  };
}

export function setAnalog(x: number, y: number) {
  analog.x = Math.max(-1, Math.min(1, x));
  analog.y = Math.max(-1, Math.min(1, y));
}

export function setTap(kind: "boost" | "jump", down: boolean) {
  tap[kind] = down;
}

export function injectKeys(codes: string[]) {
  held.clear();
  for (const c of codes) held.add(c);
}

export function setSteerOverride(v: number | null) {
  steerOverride = v;
}

let steerOverride: number | null = null;

export function readActions(): Actions {
  let steer = 0;
  if (held.has("KeyA") || held.has("ArrowLeft")) steer += 1;
  if (held.has("KeyD") || held.has("ArrowRight")) steer -= 1;
  if (Math.abs(analog.x) > 0.12) steer += -analog.x;

  let throttle = 0;
  if (held.has("KeyW") || held.has("ArrowUp")) throttle += 1;
  if (held.has("KeyS") || held.has("ArrowDown")) throttle -= 1;
  if (Math.abs(analog.y) > 0.12) throttle += analog.y;

  if (steerOverride !== null) steer = steerOverride;

  return {
    throttle: Math.max(-1, Math.min(1, throttle)),
    steer: Math.max(-1, Math.min(1, steer)),
    pitch: Math.max(-1, Math.min(1, throttle)),
    boost: held.has("ShiftLeft") || held.has("ShiftRight") || held.has("KeyB") || tap.boost,
    jump: held.has("Space") || tap.jump,
  };
}
