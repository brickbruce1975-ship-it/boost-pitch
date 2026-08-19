/**
 * Educational 2-qubit kickoff sampler (PennyLane-shaped, browser runtime).
 * Circuit: H on q0, CNOT(0→1), computational-basis sample.
 * Maps bits → a small ball impulse. Not a QPU. simulation_only.
 *
 * PennyLane equivalent (python, architecture_only):
 *   qml.Hadamard(0); qml.CNOT([0, 1]); return qml.sample(wires=[0, 1])
 */
export type KickoffNudge = {
  vx: number;
  vz: number;
  bits: string;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** |00> after H⊗I then CNOT → Bell-like: 00 and 11 equally likely. */
export function sampleKickoffImpulse(seed = Date.now()): KickoffNudge {
  const rnd = mulberry32(seed);
  const bit0 = rnd() < 0.5 ? 0 : 1;
  const bit1 = bit0;
  const bits = `${bit0}${bit1}`;
  const signZ = bit0 === 0 ? -1 : 1;
  const signX = bit1 === 0 ? -1 : 1;
  return {
    bits,
    vx: signX * 2.4,
    vz: signZ * 6.2,
  };
}
