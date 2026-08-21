let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let rumbleOsc: OscillatorNode | null = null;
let rumbleGain: GainNode | null = null;
let rumbleFilter: BiquadFilterNode | null = null;

export function unlockAudio() {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = "lowpass";
      rumbleFilter.frequency.value = 220;
      rumbleGain = ctx.createGain();
      rumbleGain.gain.value = 0.0001;
      rumbleOsc = ctx.createOscillator();
      rumbleOsc.type = "sawtooth";
      rumbleOsc.frequency.value = 62;
      rumbleOsc.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(master);
      rumbleOsc.start();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* headless / autoplay policy */
  }
}

if (typeof document !== "undefined") {
  const resume = () => {
    if (ctx && ctx.state === "suspended") void ctx.resume();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resume();
  });
  window.addEventListener("focus", resume);
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.08) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq * (0.96 + Math.random() * 0.08);
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g);
  g.connect(master);
  o.start();
  o.stop(ctx.currentTime + dur);
}

function noiseBurst(dur: number, gain: number, hp = 400) {
  if (!ctx || !master) return;
  const n = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = n;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
}

export function sfx(kind: "jump" | "boost" | "goal" | "whistle" | "kick" | "land" | "pad") {
  unlockAudio();
  if (kind === "jump") beep(420, 0.08, "square", 0.05);
  if (kind === "boost") {
    beep(180, 0.14, "sawtooth", 0.045);
    noiseBurst(0.18, 0.06, 280);
  }
  if (kind === "kick") {
    beep(110, 0.09, "triangle", 0.08);
    beep(70, 0.12, "sine", 0.05);
  }
  if (kind === "land") beep(90, 0.06, "triangle", 0.04);
  if (kind === "pad") beep(640, 0.07, "sine", 0.04);
  if (kind === "whistle") {
    beep(880, 0.18, "sine", 0.06);
    setTimeout(() => beep(660, 0.18, "sine", 0.05), 160);
  }
  if (kind === "goal") {
    beep(523, 0.16, "square", 0.07);
    setTimeout(() => beep(659, 0.16, "square", 0.07), 140);
    setTimeout(() => beep(784, 0.28, "square", 0.08), 280);
    noiseBurst(0.55, 0.09, 180);
  }
}

export function tickEngine(speed: number, boosting: boolean) {
  if (!ctx || !rumbleOsc || !rumbleGain || !rumbleFilter) return;
  const t = ctx.currentTime;
  const sp = Math.min(1, speed / 40);
  rumbleOsc.frequency.setTargetAtTime(52 + sp * 90 + (boosting ? 40 : 0), t, 0.05);
  rumbleFilter.frequency.setTargetAtTime(180 + sp * 420, t, 0.05);
  rumbleGain.gain.setTargetAtTime(sp > 0.04 ? 0.012 + sp * 0.028 + (boosting ? 0.02 : 0) : 0.0001, t, 0.08);
}
