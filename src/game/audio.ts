let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* headless / autoplay policy */
  }
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.08) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + dur);
}

export function sfx(kind: "jump" | "boost" | "goal" | "whistle" | "kick") {
  unlockAudio();
  if (kind === "jump") beep(420, 0.08, "square", 0.05);
  if (kind === "boost") beep(180, 0.12, "sawtooth", 0.04);
  if (kind === "kick") beep(140, 0.07, "triangle", 0.07);
  if (kind === "whistle") {
    beep(880, 0.18, "sine", 0.06);
    setTimeout(() => beep(660, 0.18, "sine", 0.05), 160);
  }
  if (kind === "goal") {
    beep(523, 0.16, "square", 0.07);
    setTimeout(() => beep(659, 0.16, "square", 0.07), 140);
    setTimeout(() => beep(784, 0.28, "square", 0.08), 280);
  }
}
