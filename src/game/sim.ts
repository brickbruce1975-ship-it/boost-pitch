import {
  BALL_R,
  CAR_H,
  CAR_R,
  DT,
  FIELD,
  MATCH_SECONDS,
  type Actions,
  type Ball,
  type BoostPad,
  type Car,
  type Livery,
  type Phase,
  type PracticeMode,
  type RosterEntry,
  type Snapshot,
  BRICK_BRUCE,
} from "./types";
import { sampleKickoffImpulse } from "./quantumKickoff";
import type { FxPulse } from "./fx";

const GRAVITY = 34;
const BALL_G = 30;
const ACCEL = 40;
const BRAKE = 52;
const REVERSE = 18;
const REVERSE_BLEND_SPEED = 2.2;
const MAX_SPD = 31;
const BOOST_ACCEL = 58;
const BOOST_MAX = 43;
const BOOST_DRAIN = 34;
const TURN = 2.75;
const AIR_YAW = 2.15;
const AIR_PITCH = 2.35;
const JUMP_V = 12.2;
const DBL_JUMP_V = 11.4;
const AIR_DRAG = 0.38;
const ROLL_DRAG = 0.85;
const COAST_DRAG = 1.45;
const MASS = 1.2;
const MU = 1.55;
const PACEJKA_B = 9.4;
const PACEJKA_C = 1.3;
const PACEJKA_E = 0.32;
const KAPPA_SCALE = 0.12;
const RELAX_LEN = 0.42;
const DOWNFORCE = 0.016;
const SLIP_REF = 2.4;
const TRACK = 1.48;
const AXLE = 0.88;
const R_WH = 0.33;
const I_WH = 0.024;
const I_ZZ = 14;
const LSD_PRELOAD = 0.28;
const LSD_GAIN = 0.55;
const LSD_VISC = 0.2;
const LSD_K = 1.6;
const W_MAX = 220;
const BALL_BOUNCE = 0.64;
const BALL_DRAG = 0.18;
const BALL_ROLL = 1.4;
/** Bounded sudden death: first goal wins; a tied cap ends the match as a draw. */
export const OVERTIME_MAX_SECONDS = 60;

export const AI_DIFFICULTIES = ["rookie", "challenger", "veteran", "orbit_elite"] as const;
export type AiDifficulty = (typeof AI_DIFFICULTIES)[number];
export type BotMode = "kickoff" | "attack" | "defend" | "recover" | "aerial";

export type BotTuning = Readonly<{
  label: string;
  reactionDelay: number;
  thinkInterval: number;
  predictionHorizon: number;
  aimNoiseRad: number;
  steerGain: number;
  alignedRad: number;
  chaseThrottle: number;
  attackOffset: number;
  defendZone: number;
  homeBuffer: number;
  recoveryConfirm: number;
  recoveryExitRad: number;
  boostReserve: number;
  minBoostToChase: number;
  maxBoostBurst: number;
  recoveryBoostBurst: number;
  aerialEnabled: boolean;
  jumpMinHeight: number;
  jumpMaxDistance: number;
  aerialAbortTime: number;
}>;

export type BotDecision = Readonly<{
  readyAt: number;
  madeAt: number;
  mode: BotMode;
  target: { x: number; y: number; z: number };
  actions: Actions;
}>;

export type BotBrain = {
  difficulty: AiDifficulty;
  mode: BotMode;
  active: Actions;
  decisionQueue: BotDecision[];
  target: { x: number; y: number; z: number };
  nextThinkAt: number;
  modeSince: number;
  recoverSince: number | null;
  boostUntil: number;
  aerialUntil: number;
  rngState: number;
};

export type AiMatchOptions = Readonly<{
  difficulty?: AiDifficulty;
  aiSeed?: number;
}>;

export const BOT_TUNING: Record<AiDifficulty, BotTuning> = {
  rookie: {
    label: "Rookie", reactionDelay: 0.42, thinkInterval: 0.18, predictionHorizon: 0.18,
    aimNoiseRad: 0.1222, steerGain: 1.35, alignedRad: 0.32, chaseThrottle: 0.6,
    attackOffset: 1.3, defendZone: 34, homeBuffer: 7, recoveryConfirm: 0.42,
    recoveryExitRad: 0.42, boostReserve: 42, minBoostToChase: 55, maxBoostBurst: 0.24,
    recoveryBoostBurst: 0, aerialEnabled: false, jumpMinHeight: Infinity, jumpMaxDistance: 0,
    aerialAbortTime: 0,
  },
  challenger: {
    label: "Challenger", reactionDelay: 0.26, thinkInterval: 0.12, predictionHorizon: 0.3,
    aimNoiseRad: 0.0698, steerGain: 1.75, alignedRad: 0.4, chaseThrottle: 0.76,
    attackOffset: 2.2, defendZone: 31, homeBuffer: 5.5, recoveryConfirm: 0.28,
    recoveryExitRad: 0.34, boostReserve: 30, minBoostToChase: 40, maxBoostBurst: 0.42,
    recoveryBoostBurst: 0.18, aerialEnabled: true, jumpMinHeight: 2.9, jumpMaxDistance: 5.5,
    aerialAbortTime: 0.65,
  },
  veteran: {
    label: "Veteran", reactionDelay: 0.14, thinkInterval: 0.08, predictionHorizon: 0.44,
    aimNoiseRad: 0.0349, steerGain: 2.2, alignedRad: 0.46, chaseThrottle: 0.9,
    attackOffset: 3, defendZone: 29, homeBuffer: 4.2, recoveryConfirm: 0.16,
    recoveryExitRad: 0.27, boostReserve: 20, minBoostToChase: 28, maxBoostBurst: 0.65,
    recoveryBoostBurst: 0.38, aerialEnabled: true, jumpMinHeight: 2.6, jumpMaxDistance: 7,
    aerialAbortTime: 0.85,
  },
  orbit_elite: {
    label: "Orbit Elite", reactionDelay: 0.07, thinkInterval: 0.05, predictionHorizon: 0.58,
    aimNoiseRad: 0.0131, steerGain: 2.45, alignedRad: 0.52, chaseThrottle: 1,
    attackOffset: 3.6, defendZone: 27, homeBuffer: 3.2, recoveryConfirm: 0.08,
    recoveryExitRad: 0.2, boostReserve: 12, minBoostToChase: 18, maxBoostBurst: 0.9,
    recoveryBoostBurst: 0.55, aerialEnabled: true, jumpMinHeight: 2.35, jumpMaxDistance: 8,
    aerialAbortTime: 1.1,
  },
};

const IDLE_ACTIONS: Actions = { throttle: 0, steer: 0, pitch: 0, boost: false, jump: false };

export type PracticeResult = "active" | "success" | "miss" | "own_goal";

type GoalLabState = {
  kind: "goals";
  attempt: number;
  startedAt: number;
  deadline: number;
  result: PracticeResult;
  resultUntil: number;
  targetGoal: 0 | 1;
  laneX: number;
};

type PracticeScenarioState = GoalLabState;

const GOAL_LAB_ATTEMPT_SECONDS = 12;
const GOAL_LAB_RESULT_HOLD_SECONDS = 1.25;
const GOAL_LAB_LANES = [-4, 0, 4] as const;

export type World = {
  cars: Car[];
  ball: Ball;
  pads: BoostPad[];
  score: [number, number];
  clock: number;
  overtime: boolean;
  phase: Phase;
  practice: PracticeMode;
  practiceState: PracticeScenarioState | null;
  lastGoal: 0 | 1 | null;
  epicSave: { name: string; team: 0 | 1 } | null;
  epicSaveUntil: number;
  countdown: number;
  phaseT: number;
  roster: RosterEntry[];
  lastNudgeBits: string;
  fx: FxPulse[];
  simTime: number;
  aiDifficulty: AiDifficulty;
  aiSeed: number;
  kickoffSeed: number;
  botBrains: Record<string, BotBrain>;
};

function v(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function kickoffCar(
  id: number,
  team: 0 | 1,
  isPlayer: boolean,
  extra?: { name?: string; livery?: Livery; peerId?: string; remote?: boolean },
): Car {
  const slot = team === 0 ? id : id;
  const lane = ((slot % 3) - 1) * 6;
  const z = team === 0 ? 24 : -24;
  return {
    id,
    peerId: extra?.peerId ?? `local-${id}`,
    team,
    isPlayer,
    remote: extra?.remote ?? false,
    name: extra?.name ?? (isPlayer ? BRICK_BRUCE.name : "Amber Bot"),
    livery: extra?.livery ?? (isPlayer ? BRICK_BRUCE.livery : "amber"),
    pos: v(lane, CAR_H, z),
    vel: v(),
    yaw: team === 0 ? 0 : Math.PI,
    pitch: 0,
    boost: 33,
    onGround: true,
    jumpsLeft: 2,
    jumpHeld: false,
    boosting: false,
    flipTimer: 0,
    slip: 0,
    kappa: 0,
    fyFilt: 0,
    yawRate: 0,
    wL: 0,
    wR: 0,
    lock: 0,
  };
}

function makePads(): BoostPad[] {
  const small = [
    [18, 18],
    [-18, 18],
    [18, -18],
    [-18, -18],
    [0, 32],
    [0, -32],
  ];
  const full = [
    [32, 48],
    [-32, 48],
    [32, -48],
    [-32, -48],
  ];
  return [
    ...small.map(([x, z]) => ({ pos: v(x, 0.05, z), full: false, ready: 0 })),
    ...full.map(([x, z]) => ({ pos: v(x, 0.05, z), full: true, ready: 0 })),
  ];
}

export function defaultSoloRoster(name = BRICK_BRUCE.name, livery: Livery = BRICK_BRUCE.livery): RosterEntry[] {
  return [
    { peerId: "local-0", name, livery, team: 0, isLocal: true, remote: false },
    { peerId: "bot-1", name: "Amber Bot", livery: "amber", team: 1, isLocal: false, remote: false },
  ];
}

export function carsFromRoster(roster: RosterEntry[]): Car[] {
  return roster.map((r, i) =>
    kickoffCar(i, r.team, r.isLocal, {
      name: r.name,
      livery: r.livery,
      peerId: r.peerId,
      remote: r.remote,
    }),
  );
}

function hashPeerId(peerId: string) {
  let h = 5381;
  for (let i = 0; i < peerId.length; i++) h = ((h * 33) ^ peerId.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

function makeBotBrain(difficulty: AiDifficulty, peerId: string, seed: number): BotBrain {
  return {
    difficulty,
    mode: "kickoff",
    active: { ...IDLE_ACTIONS },
    decisionQueue: [],
    target: v(),
    nextThinkAt: 0,
    modeSince: 0,
    recoverSince: null,
    boostUntil: 0,
    aerialUntil: 0,
    rngState: (seed ^ hashPeerId(peerId)) >>> 0,
  };
}

function localPracticeCar(w: World) {
  return w.cars.find((car) => car.isPlayer) ?? w.cars[0];
}

function resetBotBrains(w: World) {
  w.botBrains = {};
  for (const car of w.cars) {
    if (!car.isPlayer && !car.remote) {
      w.botBrains[car.peerId] = makeBotBrain(w.aiDifficulty, car.peerId, w.aiSeed ^ w.kickoffSeed);
    }
  }
}

export function createWorld(options: AiMatchOptions = {}): World {
  const roster = defaultSoloRoster();
  const aiDifficulty = options.difficulty ?? "challenger";
  const aiSeed = options.aiSeed ?? 0x0b0057;
  const world: World = {
    cars: carsFromRoster(roster),
    ball: { pos: v(0, BALL_R + 0.05, 0), vel: v() },
    pads: makePads(),
    score: [0, 0],
    clock: MATCH_SECONDS,
    overtime: false,
    phase: "menu",
    practice: "match",
    practiceState: null,
    lastGoal: null,
    epicSave: null,
    epicSaveUntil: 0,
    countdown: 3,
    phaseT: 0,
    roster,
    lastNudgeBits: "00",
    fx: [],
    simTime: 0,
    aiDifficulty,
    aiSeed: aiSeed >>> 0,
    kickoffSeed: aiSeed >>> 0,
    botBrains: {},
  };
  resetBotBrains(world);
  return world;
}

export function resetKickoff(w: World, roster = w.roster) {
  w.roster = roster;
  w.cars = carsFromRoster(roster);
  w.kickoffSeed = (w.kickoffSeed * 1664525 + 1013904223) >>> 0;
  const nudge = sampleKickoffImpulse(w.kickoffSeed);
  w.lastNudgeBits = nudge.bits;
  w.ball = { pos: v(0, BALL_R + 0.05, 0), vel: v(nudge.vx, 0, nudge.vz) };
  w.epicSave = null;
  w.epicSaveUntil = 0;
  resetBotBrains(w);
}

function resetCarForGoalLab(car: Car, laneX: number) {
  car.pos = { x: laneX * 0.35, y: CAR_H, z: 25 };
  car.vel = v();
  car.yaw = 0;
  car.pitch = 0;
  car.boost = 100;
  car.onGround = true;
  car.jumpsLeft = 2;
  car.jumpHeld = false;
  car.boosting = false;
  car.flipTimer = 0;
  car.slip = 0;
  car.kappa = 0;
  car.fyFilt = 0;
  car.yawRate = 0;
  car.wL = 0;
  car.wR = 0;
  car.lock = 0;
}

function resetGoalLabAttempt(w: World, attempt: number) {
  const player = localPracticeCar(w);
  if (!player) return;
  const laneX = GOAL_LAB_LANES[attempt % GOAL_LAB_LANES.length];
  resetCarForGoalLab(player, laneX);
  w.ball.pos = { x: laneX, y: BALL_R + 0.05, z: 5 };
  w.ball.vel = { x: 0, y: 0, z: -2 };
  for (const car of w.cars) {
    if (car === player) continue;
    car.pos = { x: car.team === 0 ? -18 : 0, y: CAR_H, z: car.team === 0 ? 30 : -34 };
    car.vel = v();
    car.onGround = true;
    car.boosting = false;
  }
  w.practiceState = {
    kind: "goals",
    attempt,
    startedAt: w.simTime,
    deadline: w.simTime + GOAL_LAB_ATTEMPT_SECONDS,
    result: "active",
    resultUntil: 0,
    targetGoal: 1,
    laneX,
  };
}

function finishGoalLab(w: World, result: Exclude<PracticeResult, "active">) {
  const state = w.practiceState;
  if (!state || state.kind !== "goals" || state.result !== "active") return;
  state.result = result;
  state.resultUntil = w.simTime + GOAL_LAB_RESULT_HOLD_SECONDS;
}

function tickGoalLab(w: World) {
  const state = w.practiceState;
  if (w.practice !== "goals" || !state || state.kind !== "goals") return false;
  if (state.result !== "active") {
    if (w.simTime >= state.resultUntil) resetGoalLabAttempt(w, state.attempt + 1);
    return true;
  }
  if (w.simTime >= state.deadline) {
    finishGoalLab(w, "miss");
    return true;
  }
  return false;
}

function resolveGoalLabGoal(w: World, scored: 0 | 1) {
  const state = w.practiceState;
  if (w.practice !== "goals" || !state || state.kind !== "goals") return false;
  finishGoalLab(w, scored === state.targetGoal ? "success" : "own_goal");
  return true;
}

function carForward(car: Car) {
  const cy = Math.cos(car.pitch);
  return {
    x: -Math.sin(car.yaw) * cy,
    y: Math.sin(car.pitch),
    z: -Math.cos(car.yaw) * cy,
  };
}

function clampArena(p: { x: number; y: number; z: number }, r: number, isBall: boolean) {
  const { halfW, halfL, wallH, goalHalfW, goalH, goalDepth } = FIELD;
  const inGoalX = Math.abs(p.x) < goalHalfW - r * 0.2;
  const inGoalY = p.y < goalH - r * 0.15;

  if (p.x > halfW - r) {
    p.x = halfW - r;
    return { nx: -1, ny: 0, nz: 0 };
  }
  if (p.x < -halfW + r) {
    p.x = -halfW + r;
    return { nx: 1, ny: 0, nz: 0 };
  }

  if (p.y > wallH - r) {
    p.y = wallH - r;
    return { nx: 0, ny: -1, nz: 0 };
  }

  const zLimit = halfL - r;
  if (p.z > zLimit) {
    if (isBall && inGoalX && inGoalY && p.z < halfL + goalDepth - r) {
      if (p.z > halfL + goalDepth - r) {
        p.z = halfL + goalDepth - r;
        return { nx: 0, ny: 0, nz: -1 };
      }
      return null;
    }
    p.z = zLimit;
    return { nx: 0, ny: 0, nz: -1 };
  }
  if (p.z < -zLimit) {
    if (isBall && inGoalX && inGoalY && p.z > -halfL - goalDepth + r) {
      if (p.z < -halfL - goalDepth + r) {
        p.z = -halfL - goalDepth + r;
        return { nx: 0, ny: 0, nz: 1 };
      }
      return null;
    }
    p.z = -zLimit;
    return { nx: 0, ny: 0, nz: 1 };
  }
  return null;
}

type FenceSurface = {
  y: number;
  active: boolean;
  dhdx: number;
  dhdz: number;
  nx: number;
  ny: number;
  nz: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** Smooth union of side/end faces so a corner crossing has no normal seam. */
function fenceSurface(x: number, z: number): FenceSurface {
  const run = FIELD.fenceClimbRun;
  const height = FIELD.fenceClimbHeight;
  const gapX = FIELD.halfW - Math.abs(x);
  const gapZ = FIELD.halfL - Math.abs(z);
  const cx = clamp01((run - gapX) / run);
  const cz = clamp01((run - gapZ) / run);
  const active = cx > 0 || cz > 0;
  if (!active) return { y: CAR_H, active: false, dhdx: 0, dhdz: 0, nx: 0, ny: 1, nz: 0 };

  const sx = x < 0 ? -1 : 1;
  const sz = z < 0 ? -1 : 1;
  const dCxdX = cx > 0 && cx < 1 ? sx / run : 0;
  const dCzdZ = cz > 0 && cz < 1 ? sz / run : 0;
  const union = 1 - (1 - cx) * (1 - cz);
  const dhdx = height * (1 - cz) * dCxdX;
  const dhdz = height * (1 - cx) * dCzdZ;
  const nLen = Math.hypot(dhdx, 1, dhdz);
  return {
    y: CAR_H + height * union,
    active: true,
    dhdx,
    dhdz,
    nx: -dhdx / nLen,
    ny: 1 / nLen,
    nz: -dhdz / nLen,
  };
}

function restoreGroundState(car: Car, landed: boolean, fx: FxPulse[]) {
  car.onGround = true;
  car.jumpsLeft = 2;
  car.pitch *= 0.3;
  const hx = -Math.sin(car.yaw);
  const hz = -Math.cos(car.yaw);
  const along = car.vel.x * hx + car.vel.z * hz;
  car.vel.x = hx * along + (car.vel.x - hx * along) * 0.35;
  car.vel.z = hz * along + (car.vel.z - hz * along) * 0.35;
  car.wL = along / R_WH;
  car.wR = along / R_WH;
  if (landed) fx.push({ kind: "land", mag: 0.4, x: car.pos.x, y: car.pos.y, z: car.pos.z });
}

/** Resolves ground contact against the field or the lower climbable fence face. */
function resolveFenceGroundContact(car: Car, dt: number, fx: FxPulse[]) {
  const surface = fenceSurface(car.pos.x, car.pos.z);
  const signedDistanceY = car.pos.y - surface.y;
  const normalSpeed = car.vel.x * surface.nx + car.vel.y * surface.ny + car.vel.z * surface.nz;
  const contactSlop = 0.035;

  if (signedDistanceY > contactSlop && normalSpeed >= -0.05) {
    if (car.onGround) car.onGround = false;
    return;
  }
  // A fresh jump/boost ascent always belongs to the existing air branch; do not
  // re-snap it to a steeper nearby fence sample until it starts descending.
  if (!car.onGround && car.vel.y > 0.05) return;

  const landed = !car.onGround && car.vel.y < -4;
  car.pos.y = surface.y;
  if (normalSpeed < 0) {
    car.vel.x -= surface.nx * normalSpeed;
    car.vel.y -= surface.ny * normalSpeed;
    car.vel.z -= surface.nz * normalSpeed;
  }
  if (surface.active) {
    // Gravity is projected onto the climb face: uphill costs speed, downhill returns it.
    car.vel.x += GRAVITY * surface.ny * surface.nx * dt;
    car.vel.z += GRAVITY * surface.ny * surface.nz * dt;
    car.vel.y = surface.dhdx * car.vel.x + surface.dhdz * car.vel.z;
  } else {
    car.vel.y = 0;
  }
  if (!car.onGround) restoreGroundState(car, landed, fx);
}

function heading(yaw: number) {
  return { nx: -Math.sin(yaw), nz: -Math.cos(yaw), rx: Math.cos(yaw), rz: -Math.sin(yaw) };
}

function magic(x: number, B: number, C: number, D: number, E: number) {
  const bx = B * x;
  return D * Math.sin(C * Math.atan(bx - E * (bx - Math.atan(bx))));
}

/** Pacejka B/C/D/E on two rear patches + clutch LSD (Posi).
 * Boost is a thruster — not in the circle.
 * CAGE Rung 2: do(lsdCap=0)|steer+throttle → more yaw than locked (open peel). */
function applyTires(car: Car, a: Actions, dt: number, pulses: FxPulse[], lsdCap = 1) {
  car.pitch *= Math.max(0, 1 - 12 * dt);

  let driveAccel = 0;
  const along0 = car.vel.x * -Math.sin(car.yaw) + car.vel.z * -Math.cos(car.yaw);
  if (a.throttle > 0.05) driveAccel = ACCEL * a.throttle;
  else if (a.throttle < -0.05) {
    // Blend braking into reverse around zero longitudinal speed. A hard sign switch here
    // repeatedly fights the two rear wheel states and shows up as a visible reverse jitter.
    const brakeBlend = Math.max(0, Math.min(1, (along0 + REVERSE_BLEND_SPEED) / (REVERSE_BLEND_SPEED * 2)));
    driveAccel = -REVERSE - (BRAKE - REVERSE) * brakeBlend;
  }

  let boostAccel = 0;
  if (a.boost && car.boost > 0) {
    boostAccel = BOOST_ACCEL;
    car.boost = Math.max(0, car.boost - BOOST_DRAIN * dt);
    car.boosting = true;
  } else car.boosting = false;

  const coasting = Math.abs(a.throttle) < 0.05 && !car.boosting;
  const longDrag = coasting ? COAST_DRAG : ROLL_DRAG;
  const shift = boostAccel > 0 || driveAccel > 6 ? 0.05 : driveAccel < -10 || coasting ? -0.14 : 0;
  const rotate = shift < -0.05 ? 1.22 : 1;

  const reverse = Math.abs(along0) < REVERSE_BLEND_SPEED ? 1 : along0 < 0 ? -1 : 1;
  const spd0 = Math.hypot(car.vel.x, car.vel.z);
  const speedFactor = Math.min(1, Math.max(0.18, spd0 / 10));
  const steerFade = 1 / (1 + 1.15 * car.slip);
  const yawSteer = a.steer * TURN * speedFactor * reverse * steerFade * rotate;
  car.yaw += yawSteer * dt;

  const { nx, nz, rx, rz } = heading(car.yaw);
  let along = car.vel.x * nx + car.vel.z * nz;
  let lat = car.vel.x * rx + car.vel.z * rz;
  const yawRate = car.yawRate;
  const halfT = TRACK * 0.5;
  const vL = along - yawRate * halfT;
  const vR = along + yawRate * halfT;
  const latRear = lat + yawRate * AXLE;

  const load = MASS * GRAVITY + DOWNFORCE * along * along;
  const latXfer = Math.max(-0.42, Math.min(0.42, 0.5 * Math.tanh(lat / 7)));
  let nL = 0.5 * load * (1 - latXfer);
  let nR = 0.5 * load * (1 + latXfer);
  nL = Math.max(0.06 * load, nL);
  nR = Math.max(0.06 * load, nR);
  const nFix = load / (nL + nR);
  nL *= nFix;
  nR *= nFix;

  const kappaL0 = (R_WH * car.wL - vL) / Math.max(Math.abs(vL), SLIP_REF);
  const kappaR0 = (R_WH * car.wR - vR) / Math.max(Math.abs(vR), SLIP_REF);
  const alphaL = Math.atan2(latRear, Math.max(Math.abs(vL), SLIP_REF));
  const alphaR = Math.atan2(latRear, Math.max(Math.abs(vR), SLIP_REF));

  const patch = (alpha: number, kappa: number, n: number) => {
    const d = Math.max(0.8, MU * n * (1 + shift));
    const fyScale = 1 / Math.hypot(1, kappa / KAPPA_SCALE);
    let fy = -magic(alpha, PACEJKA_B, PACEJKA_C, d, PACEJKA_E) * fyScale;
    let fx = magic(kappa, PACEJKA_B, PACEJKA_C, d, PACEJKA_E);
    const ell = Math.hypot(fx / d, fy / d);
    if (ell > 1) {
      fx /= ell;
      fy /= ell;
    }
    return { fx, fy };
  };

  const L = patch(alphaL, kappaL0, nL);
  const Rgt = patch(alphaR, kappaR0, nR);

  const tAxle = MASS * driveAccel * R_WH;
  const tEach = tAxle * 0.5;
  const dw = car.wL - car.wR;
  const tCap =
    (LSD_PRELOAD * MU * load * 0.5 + LSD_GAIN * Math.abs(MASS * driveAccel) + LSD_VISC * MASS * Math.abs(dw)) *
    R_WH *
    Math.max(0, Math.min(1, lsdCap));
  const tLock = Math.sign(dw || 0) * Math.min(Math.abs(tCap), Math.abs(dw) * LSD_K);
  const tL = tEach - tLock;
  const tR = tEach + tLock;
  car.lock = Math.max(
    0,
    Math.min(1, (LSD_PRELOAD + LSD_GAIN * Math.abs(a.throttle) + LSD_VISC * Math.min(1, Math.abs(dw) * 0.08)) * lsdCap),
  );

  car.wL += ((tL - L.fx * R_WH) / I_WH) * dt;
  car.wR += ((tR - Rgt.fx * R_WH) / I_WH) * dt;
  car.wL = Math.max(-W_MAX, Math.min(W_MAX, car.wL));
  car.wR = Math.max(-W_MAX, Math.min(W_MAX, car.wR));

  const kappaL = (R_WH * car.wL - vL) / Math.max(Math.abs(vL), SLIP_REF);
  const kappaR = (R_WH * car.wR - vR) / Math.max(Math.abs(vR), SLIP_REF);
  const mz = (Rgt.fx - L.fx) * halfT;
  const yawDiff = mz / I_ZZ;
  car.yaw += yawDiff * dt;
  car.yawRate = yawSteer + yawDiff;

  let fxDrive = L.fx + Rgt.fx - MASS * along * longDrag;
  let fy = L.fy + Rgt.fy;
  const rel = Math.min(1, ((Math.abs(along) + 3.5) * dt) / RELAX_LEN);
  car.fyFilt += (fy - car.fyFilt) * rel;

  along += ((fxDrive + MASS * boostAccel) / MASS) * dt;
  lat += (car.fyFilt / MASS) * dt;
  car.slip = Math.max(Math.abs(alphaL), Math.abs(alphaR));
  car.kappa = 0.5 * (kappaL + kappaR);
  car.vel.x = nx * along + rx * lat;
  car.vel.z = nz * along + rz * lat;

  const max = boostAccel > 0 ? BOOST_MAX : MAX_SPD;
  const hs = Math.hypot(car.vel.x, car.vel.z);
  if (hs > max) {
    car.vel.x *= max / hs;
    car.vel.z *= max / hs;
  }

  const skidL = Math.abs(alphaL) > 0.18 || Math.abs(kappaL) > 0.14;
  const skidR = Math.abs(alphaR) > 0.18 || Math.abs(kappaR) > 0.14;
  if ((skidL || skidR) && hs > 9 && Math.random() < dt * 14) {
    const mag = Math.min(1, car.slip * 2);
    if (skidL) {
      pulses.push({
        kind: "skid",
        mag,
        x: car.pos.x - nx * AXLE - rx * halfT,
        y: 0.06,
        z: car.pos.z - nz * AXLE - rz * halfT,
      });
    }
    if (skidR) {
      pulses.push({
        kind: "skid",
        mag,
        x: car.pos.x - nx * AXLE + rx * halfT,
        y: 0.06,
        z: car.pos.z - nz * AXLE + rz * halfT,
      });
    }
  }

  if (a.jump && !car.jumpHeld) {
    car.vel.y = JUMP_V;
    car.onGround = false;
    car.jumpsLeft = 1;
  }
}

function bounce(vel: { x: number; y: number; z: number }, n: { nx: number; ny: number; nz: number }, rest: number) {
  const vn = vel.x * n.nx + vel.y * n.ny + vel.z * n.nz;
  if (vn < 0) {
    vel.x -= (1 + rest) * vn * n.nx;
    vel.y -= (1 + rest) * vn * n.ny;
    vel.z -= (1 + rest) * vn * n.nz;
  }
}

function stepCar(car: Car, a: Actions, dt: number, fx: FxPulse[], lsdCap = 1) {
  car.flipTimer = Math.max(0, car.flipTimer - dt);

  if (car.onGround) {
    applyTires(car, a, dt, fx, lsdCap);
  } else {
    car.slip = 0;
    car.kappa = 0;
    car.lock = 0;
    car.fyFilt *= 0.5;
    car.wL *= Math.max(0, 1 - 0.9 * dt);
    car.wR *= Math.max(0, 1 - 0.9 * dt);
    car.yaw += a.steer * AIR_YAW * dt;
    car.yawRate = a.steer * AIR_YAW;
    car.pitch += a.pitch * AIR_PITCH * dt;
    car.pitch = Math.max(-1.15, Math.min(1.15, car.pitch));
    if (a.boost && car.boost > 0) {
      const ff = carForward(car);
      car.vel.x += ff.x * BOOST_ACCEL * dt;
      car.vel.y += ff.y * BOOST_ACCEL * dt;
      car.vel.z += ff.z * BOOST_ACCEL * dt;
      car.boost = Math.max(0, car.boost - BOOST_DRAIN * dt);
      car.boosting = true;
    } else car.boosting = false;
    car.vel.y -= GRAVITY * dt;
    car.vel.x *= 1 - AIR_DRAG * dt;
    car.vel.z *= 1 - AIR_DRAG * dt;
    if (a.jump && !car.jumpHeld && car.jumpsLeft > 0) {
      car.jumpsLeft = 0;
      car.flipTimer = 0.28;
      if (Math.abs(a.steer) + Math.abs(a.pitch) > 0.2) {
        const ff = carForward(car);
        car.vel.x += ff.x * 10 + a.steer * -8;
        car.vel.z += ff.z * 10;
        car.vel.y += 4.2;
      } else {
        car.vel.y = Math.max(car.vel.y, 0) + DBL_JUMP_V;
      }
    }
  }

  car.jumpHeld = a.jump;
  car.pos.x += car.vel.x * dt;
  car.pos.y += car.vel.y * dt;
  car.pos.z += car.vel.z * dt;

  resolveFenceGroundContact(car, dt, fx);

  const hit = clampArena(car.pos, CAR_R * 0.85, false);
  if (hit) {
    const spd = Math.hypot(car.vel.x, car.vel.z);
    bounce(car.vel, hit, 0.15);
    car.vel.x *= 0.7;
    car.vel.z *= 0.7;
    resolveFenceGroundContact(car, dt, fx);
    if (spd > 7) {
      fx.push({
        kind: "wall",
        mag: Math.min(1, spd / 28),
        x: car.pos.x,
        y: car.pos.y + 0.4,
        z: car.pos.z,
      });
    }
  }
}

function stepBall(ball: Ball, dt: number, fx: FxPulse[]) {
  ball.vel.y -= BALL_G * dt;
  ball.vel.y *= 1 - BALL_DRAG * 0.35 * dt;
  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;
  ball.pos.z += ball.vel.z * dt;

  if (ball.pos.y < BALL_R) {
    const impact = -ball.vel.y;
    ball.pos.y = BALL_R;
    if (ball.vel.y < 0) ball.vel.y = -ball.vel.y * BALL_BOUNCE;
    ball.vel.x *= Math.max(0, 1 - BALL_ROLL * dt);
    ball.vel.z *= Math.max(0, 1 - BALL_ROLL * dt);
    if (Math.abs(ball.vel.y) < 1.2) ball.vel.y = 0;
    if (impact > 6) {
      fx.push({
        kind: "land",
        mag: Math.min(1, impact / 18),
        x: ball.pos.x,
        y: 0.12,
        z: ball.pos.z,
      });
    }
  } else {
    ball.vel.x *= 1 - BALL_DRAG * dt;
    ball.vel.z *= 1 - BALL_DRAG * dt;
  }
  const hit = clampArena(ball.pos, BALL_R, true);
  if (hit) {
    const spd = Math.hypot(ball.vel.x, ball.vel.y, ball.vel.z);
    bounce(ball.vel, hit, BALL_BOUNCE);
    if (spd > 9) {
      fx.push({
        kind: "wall",
        mag: Math.min(1, spd / 24),
        x: ball.pos.x,
        y: ball.pos.y,
        z: ball.pos.z,
      });
    }
  }
}

function ballThreatensGoal(ball: Ball, team: 0 | 1) {
  const goalSign = team === 0 ? 1 : -1;
  return (
    goalSign * ball.vel.z > 5 &&
    goalSign * ball.pos.z > FIELD.halfL - 18 &&
    Math.abs(ball.pos.x) < FIELD.goalHalfW + BALL_R
  );
}

function collideCarBall(w: World, car: Car, ball: Ball, fx: FxPulse[]) {
  const dx = ball.pos.x - car.pos.x;
  const dy = ball.pos.y - (car.pos.y + 0.15);
  const dz = ball.pos.z - car.pos.z;
  const dist = Math.hypot(dx, dy, dz);
  const min = BALL_R + CAR_R;
  if (dist >= min || dist < 1e-5) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;
  const push = min - dist;
  ball.pos.x += nx * push;
  ball.pos.y += ny * push;
  ball.pos.z += nz * push;
  const wasGoalThreat = ballThreatensGoal(ball, car.team);
  const rvx = ball.vel.x - car.vel.x;
  const rvy = ball.vel.y - car.vel.y;
  const rvz = ball.vel.z - car.vel.z;
  const vn = rvx * nx + rvy * ny + rvz * nz;
  if (vn < 0) {
    const extra = (car.boosting ? 9 : 4) + (car.flipTimer > 0 ? 6 : 0);
    const j = -1.12 * vn + extra;
    ball.vel.x += j * nx;
    ball.vel.y += j * ny * 0.85;
    ball.vel.z += j * nz;
    car.vel.x -= nx * 2.4;
    car.vel.z -= nz * 2.4;
    if (vn < -2.2) {
      fx.push({ kind: "hit", mag: Math.min(1, -vn / 18), x: ball.pos.x, y: ball.pos.y, z: ball.pos.z });
    }
    const goalSign = car.team === 0 ? 1 : -1;
    if (wasGoalThreat && goalSign * ball.vel.z < -2.5 && w.simTime >= w.epicSaveUntil) {
      w.epicSave = { name: car.name, team: car.team };
      w.epicSaveUntil = w.simTime + 1.6;
    }
  }
}

function collideCars(a: Car, b: Car) {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dz = b.pos.z - a.pos.z;
  const dist = Math.hypot(dx, dy, dz);
  const min = CAR_R * 1.7;
  if (dist >= min || dist < 1e-5) return;
  const nx = dx / dist;
  const nz = dz / dist;
  const push = (min - dist) * 0.5;
  a.pos.x -= nx * push;
  a.pos.z -= nz * push;
  b.pos.x += nx * push;
  b.pos.z += nz * push;
  const rv = (b.vel.x - a.vel.x) * nx + (b.vel.z - a.vel.z) * nz;
  if (rv < 0) {
    a.vel.x += nx * rv;
    a.vel.z += nz * rv;
    b.vel.x -= nx * rv;
    b.vel.z -= nz * rv;
  }
}

function nextUnit(brain: BotBrain) {
  brain.rngState = (brain.rngState * 1664525 + 1013904223) >>> 0;
  return brain.rngState / 0x1_0000_0000;
}

function signedNoise(brain: BotBrain, amplitude: number) {
  return (nextUnit(brain) * 2 - 1) * amplitude;
}

function angleDiff(want: number, have: number) {
  let d = want - have;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function predictBall(ball: Ball, horizon: number) {
  return {
    x: ball.pos.x + ball.vel.x * horizon,
    y: Math.max(BALL_R, ball.pos.y + ball.vel.y * horizon - 0.5 * BALL_G * horizon * horizon),
    z: ball.pos.z + ball.vel.z * horizon,
  };
}

function recoveryComplete(car: Car, target: { x: number; y: number; z: number }, ownGoalZ: number, t: BotTuning) {
  const goalSideCorrect = Math.sign(ownGoalZ) * (car.pos.z - target.z) <= 0;
  const wantYaw = Math.atan2(-(target.x - car.pos.x), -(target.z - car.pos.z));
  return goalSideCorrect && Math.abs(angleDiff(wantYaw, car.yaw)) <= t.recoveryExitRad;
}

function chooseBotMode(w: World, car: Car, brain: BotBrain, t: BotTuning, ball: { x: number; y: number; z: number }): BotMode {
  const ownGoalZ = car.team === 0 ? FIELD.halfL : -FIELD.halfL;
  const goalSign = Math.sign(ownGoalZ);
  const ballToOwnGoal = Math.abs(ownGoalZ - ball.z);
  const goalSideWrong = goalSign * (car.pos.z - ball.z) > 0.8;
  const nearWall = Math.abs(car.pos.x) > FIELD.halfW - 2 || Math.abs(car.pos.z) > FIELD.halfL - 2;
  const recovering = !car.onGround || (nearWall && goalSideWrong);

  if (brain.mode === "recover" && !recoveryComplete(car, ball, ownGoalZ, t)) return "recover";
  if (recovering) {
    if (brain.recoverSince === null) brain.recoverSince = w.simTime;
    if (w.simTime - brain.recoverSince >= t.recoveryConfirm) return "recover";
  } else brain.recoverSince = null;

  if (ballToOwnGoal < t.defendZone || (goalSideWrong && ballToOwnGoal < t.defendZone + t.homeBuffer)) return "defend";
  const dist = Math.hypot(ball.x - car.pos.x, ball.z - car.pos.z);
  if (t.aerialEnabled && car.onGround && ball.y >= t.jumpMinHeight && dist <= t.jumpMaxDistance) return "aerial";
  if (w.phaseT < 1.2 && Math.abs(w.ball.pos.x) < 3 && Math.abs(w.ball.pos.z) < 3) return "kickoff";
  return "attack";
}

function chooseBotTarget(
  w: World,
  car: Car,
  t: BotTuning,
  mode: BotMode,
  ball: { x: number; y: number; z: number },
) {
  const ownGoalZ = car.team === 0 ? FIELD.halfL : -FIELD.halfL;
  const oppGoalZ = -ownGoalZ;
  if (mode === "recover") return { x: ball.x * 0.25, y: CAR_H, z: ownGoalZ * 0.62 };
  if (mode === "defend") return { x: ball.x * 0.55, y: CAR_H, z: ownGoalZ - Math.sign(ownGoalZ) * t.homeBuffer };
  if (mode === "kickoff") return { x: ball.x, y: CAR_H, z: ball.z };
  const towardGoal = Math.sign(oppGoalZ);
  return { x: ball.x, y: mode === "aerial" ? ball.y : CAR_H, z: ball.z - towardGoal * t.attackOffset };
}

function actionsTowardTarget(
  w: World,
  car: Car,
  brain: BotBrain,
  t: BotTuning,
  mode: BotMode,
  target: { x: number; y: number; z: number },
): Actions {
  const wanted = Math.atan2(-(target.x - car.pos.x), -(target.z - car.pos.z)) + signedNoise(brain, t.aimNoiseRad);
  const err = angleDiff(wanted, car.yaw);
  const aligned = Math.abs(err) <= t.alignedRad;
  const now = w.simTime;
  const canBudgetBurst = car.boost - BOOST_DRAIN * t.maxBoostBurst >= t.boostReserve;

  if (mode === "recover" && now >= brain.boostUntil && car.boost > t.boostReserve && t.recoveryBoostBurst > 0) {
    brain.boostUntil = now + t.recoveryBoostBurst;
  } else if (mode !== "recover" && aligned && car.boost >= t.minBoostToChase && canBudgetBurst && now >= brain.boostUntil) {
    brain.boostUntil = now + t.maxBoostBurst;
  }

  const wantsAerial = mode === "aerial" && car.onGround && now >= brain.aerialUntil;
  if (wantsAerial) brain.aerialUntil = now + t.aerialAbortTime;
  return {
    throttle: aligned ? 1 : t.chaseThrottle,
    steer: Math.max(-1, Math.min(1, err * t.steerGain)),
    pitch: mode === "aerial" && !car.onGround ? Math.max(-1, Math.min(1, (target.y - car.pos.y) * 0.25)) : 0,
    boost: now < brain.boostUntil && car.boost > t.boostReserve,
    jump: wantsAerial,
  };
}

function thinkBot(w: World, car: Car, brain: BotBrain, t: BotTuning) {
  const ball = predictBall(w.ball, t.predictionHorizon);
  const mode = chooseBotMode(w, car, brain, t, ball);
  const target = chooseBotTarget(w, car, t, mode, ball);
  const actions = actionsTowardTarget(w, car, brain, t, mode, target);
  return { mode, target, actions };
}

function botActions(w: World, car: Car): Actions {
  const brain = w.botBrains[car.peerId];
  if (!brain) return IDLE_ACTIONS;
  const t = BOT_TUNING[brain.difficulty];
  if (w.simTime >= brain.nextThinkAt) {
    const plan = thinkBot(w, car, brain, t);
    brain.mode = plan.mode;
    brain.target = plan.target;
    brain.modeSince = w.simTime;
    brain.decisionQueue.push({
      readyAt: w.simTime + t.reactionDelay,
      madeAt: w.simTime,
      mode: plan.mode,
      target: plan.target,
      actions: plan.actions,
    });
    brain.nextThinkAt = w.simTime + t.thinkInterval;
    const maxQueue = Math.ceil(t.reactionDelay / t.thinkInterval) + 2;
    if (brain.decisionQueue.length > maxQueue) brain.decisionQueue.splice(0, brain.decisionQueue.length - maxQueue);
  }
  while (brain.decisionQueue.length > 0 && brain.decisionQueue[0].readyAt <= w.simTime) {
    brain.active = brain.decisionQueue.shift()!.actions;
  }
  const active = brain.active;
  return {
    ...active,
    boost: active.boost && w.simTime < brain.boostUntil && car.boost > t.boostReserve,
  };
}

function collectPads(w: World, dt: number) {
  for (const pad of w.pads) {
    pad.ready = Math.max(0, pad.ready - dt);
    if (pad.ready > 0) continue;
    for (const car of w.cars) {
      const dx = car.pos.x - pad.pos.x;
      const dz = car.pos.z - pad.pos.z;
      if (dx * dx + dz * dz < 3.4 * 3.4 && car.onGround) {
        car.boost = Math.min(100, car.boost + (pad.full ? 100 : 12));
        pad.ready = pad.full ? 10 : 4;
        w.fx.push({ kind: "pad", mag: pad.full ? 1 : 0.4, x: pad.pos.x, y: 0.2, z: pad.pos.z });
      }
    }
  }
}

function checkGoal(w: World): 0 | 1 | null {
  const { pos } = w.ball;
  if (Math.abs(pos.x) > FIELD.goalHalfW) return null;
  if (pos.y > FIELD.goalH) return null;
  if (pos.z > FIELD.halfL + 0.8) return 0;
  if (pos.z < -FIELD.halfL - 0.8) return 1;
  return null;
}

export function stepWorld(w: World, player: Actions, dt: number, opts?: { carsOnly?: boolean; lsdCap?: number }) {
  if (w.phase === "menu" || w.phase === "over") return;
  w.simTime += dt;
  if (w.epicSave && w.simTime >= w.epicSaveUntil) w.epicSave = null;
  w.fx.length = 0;
  const lsdCap = opts?.lsdCap ?? 1;
  if (opts?.carsOnly) {
    for (const car of w.cars) {
      if (car.remote) continue;
      const a = car.isPlayer ? player : botActions(w, car);
      stepCar(car, a, dt, w.fx, lsdCap);
    }
    return;
  }
  w.phaseT += dt;

  if (w.phase === "countdown") {
    w.countdown = Math.max(0, 3 - w.phaseT);
    if (w.phaseT >= 3) {
      w.phase = "play";
      w.phaseT = 0;
    }
    return;
  }

  if (w.phase === "goal") {
    if (w.phaseT > 2.2) {
      resetKickoff(w);
      w.phase = "countdown";
      w.phaseT = 0;
    }
    stepBall(w.ball, dt, w.fx);
    return;
  }

  if (w.phase === "play") {
    if (w.practice === "goals" && tickGoalLab(w)) return;
    if (w.overtime && w.phaseT >= OVERTIME_MAX_SECONDS) {
      w.phase = "over";
      return;
    }
    if (!w.overtime && w.practice === "match") {
      w.clock = Math.max(0, w.clock - dt);
      if (w.clock <= 0) {
        if (w.score[0] !== w.score[1]) {
          w.phase = "over";
          return;
        }
        w.overtime = true;
        w.clock = 0;
        resetKickoff(w);
        w.phase = "countdown";
        w.phaseT = 0;
        return;
      }
    }
  }

  for (const car of w.cars) {
    if (car.remote) continue;
    const a = car.isPlayer ? player : botActions(w, car);
    stepCar(car, a, dt, w.fx, lsdCap);
  }
  stepBall(w.ball, dt, w.fx);
  for (let i = 0; i < w.cars.length; i++) {
    for (let j = i + 1; j < w.cars.length; j++) collideCars(w.cars[i], w.cars[j]);
  }
  for (const car of w.cars) collideCarBall(w, car, w.ball, w.fx);
  collectPads(w, dt);

  const scored = checkGoal(w);
  if (scored !== null && resolveGoalLabGoal(w, scored)) {
    w.fx.push({ kind: "goal", mag: scored === 0 ? 1 : 0, x: w.ball.pos.x, y: w.ball.pos.y, z: w.ball.pos.z });
    return;
  }
  if (scored !== null) {
    w.score[scored] += 1;
    w.lastGoal = scored;
    w.fx.push({
      kind: "goal",
      mag: scored === 0 ? 1 : 0,
      x: w.ball.pos.x,
      y: w.ball.pos.y,
      z: w.ball.pos.z,
    });
    if (w.overtime) {
      w.phase = "over";
    } else {
      w.phase = "goal";
      w.phaseT = 0;
    }
  }
}

export function snapshot(w: World): Snapshot {
  const p = w.cars.find((c) => c.isPlayer) ?? w.cars[0];
  return {
    score: [w.score[0], w.score[1]],
    clock: w.clock,
    overtime: w.overtime,
    boost: p?.boost ?? 0,
    speed: p ? Math.hypot(p.vel.x, p.vel.y, p.vel.z) : 0,
    phase: w.phase,
    practice: w.practice,
    practiceAttempt: w.practiceState?.attempt ?? null,
    practiceResult: w.practiceState?.result ?? null,
    practiceDeadline: w.practiceState?.deadline ?? null,
    practiceRemaining:
      w.practiceState?.result === "active" ? Math.max(0, w.practiceState.deadline - w.simTime) : null,
    lastGoal: w.lastGoal,
    epicSave: w.epicSave ? { ...w.epicSave } : null,
    countdown: w.countdown,
    onGround: p?.onGround ?? true,
    yaw: p?.yaw ?? 0,
    localName: p?.name ?? BRICK_BRUCE.name,
    roster: w.cars.map((c) => ({
      name: c.name,
      team: c.team,
      livery: c.livery,
      peerId: c.peerId,
    })),
    lastNudgeBits: w.lastNudgeBits,
    boosting: p?.boosting ?? false,
    aerial: p ? !p.onGround && p.pos.y > 1.05 : false,
    slip: p?.slip ?? 0,
    lock: p?.lock ?? 0,
  };
}

export function returnToMenu(w: World) {
  w.practice = "match";
  w.practiceState = null;
  w.phase = "menu";
  w.phaseT = 0;
  w.countdown = 3;
  w.overtime = false;
  w.epicSave = null;
  w.epicSaveUntil = 0;
  resetKickoff(w);
}

export function startMatch(w: World, roster?: RosterEntry[], options: AiMatchOptions = {}) {
  if (options.difficulty) w.aiDifficulty = options.difficulty;
  if (options.aiSeed !== undefined) w.aiSeed = options.aiSeed >>> 0;
  w.kickoffSeed = w.aiSeed;
  w.simTime = 0;
  w.score = [0, 0];
  w.clock = MATCH_SECONDS;
  w.overtime = false;
  w.lastGoal = null;
  w.epicSave = null;
  w.epicSaveUntil = 0;
  w.practice = "match";
  w.practiceState = null;
  resetKickoff(w, roster ?? w.roster);
  w.phase = "countdown";
  w.phaseT = 0;
}

export function startPractice(w: World, mode: Exclude<PracticeMode, "match">, roster?: RosterEntry[]) {
  const nextRoster = roster ?? defaultSoloRoster();
  w.score = [0, 0];
  w.clock = MATCH_SECONDS;
  w.overtime = false;
  w.lastGoal = null;
  w.epicSave = null;
  w.epicSaveUntil = 0;
  w.practice = mode;
  w.practiceState = null;
  w.roster = nextRoster;
  w.cars = carsFromRoster(nextRoster);
  w.simTime = 0;
  resetBotBrains(w);
  w.phase = "play";
  w.phaseT = 0;
  w.countdown = 0;
  w.lastNudgeBits = "PRACTICE";
  if (mode === "goals") {
    resetGoalLabAttempt(w, 0);
    return;
  }
  const player = localPracticeCar(w);
  if (!player) return;
  if (mode === "aerial") {
    player.pos = { x: 0, y: 4.4, z: 21 };
    player.vel = { x: 0, y: 2.8, z: -7.5 };
    player.yaw = 0;
    player.onGround = false;
    player.jumpsLeft = 1;
    player.boost = 100;
    w.ball.pos = { x: 0, y: 7.2, z: 4 };
    w.ball.vel = { x: 0, y: 0, z: -3.2 };
  }
  for (const car of w.cars) {
    if (car !== player) {
      car.pos = { x: car.team === 0 ? -18 : 0, y: CAR_H, z: car.team === 0 ? 30 : -34 };
      car.vel = v();
      car.onGround = true;
    }
  }
}

export type CarWire = {
  peerId: string;
  name: string;
  livery: Livery;
  team: 0 | 1;
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  boost: number;
  boosting: boolean;
  onGround: boolean;
};

export type HostWire = {
  ball: Ball;
  score: [number, number];
  clock: number;
  overtime: boolean;
  phase: Phase;
  countdown: number;
  lastGoal: 0 | 1 | null;
  epicSave: { name: string; team: 0 | 1 } | null;
  lastNudgeBits: string;
};

export function carToWire(car: Car): CarWire {
  return {
    peerId: car.peerId,
    name: car.name,
    livery: car.livery,
    team: car.team,
    pos: { ...car.pos },
    vel: { ...car.vel },
    yaw: car.yaw,
    pitch: car.pitch,
    boost: car.boost,
    boosting: car.boosting,
    onGround: car.onGround,
  };
}

export function applyCarWire(car: Car, wire: CarWire) {
  car.pos.x = wire.pos.x;
  car.pos.y = wire.pos.y;
  car.pos.z = wire.pos.z;
  car.vel.x = wire.vel.x;
  car.vel.y = wire.vel.y;
  car.vel.z = wire.vel.z;
  car.yaw = wire.yaw;
  car.pitch = wire.pitch;
  car.boost = wire.boost;
  car.boosting = wire.boosting;
  car.onGround = wire.onGround;
  car.name = wire.name;
  car.livery = wire.livery;
  car.team = wire.team;
}

export function applyHostWire(w: World, host: HostWire) {
  w.ball.pos = { ...host.ball.pos };
  w.ball.vel = { ...host.ball.vel };
  w.score = [host.score[0], host.score[1]];
  w.clock = host.clock;
  w.overtime = host.overtime;
  w.phase = host.phase;
  w.countdown = host.countdown;
  w.lastGoal = host.lastGoal;
  w.epicSave = host.epicSave ? { ...host.epicSave } : null;
  w.lastNudgeBits = host.lastNudgeBits;
}

export function hostWireFrom(w: World): HostWire {
  return {
    ball: { pos: { ...w.ball.pos }, vel: { ...w.ball.vel } },
    score: [w.score[0], w.score[1]],
    clock: w.clock,
    overtime: w.overtime,
    phase: w.phase,
    countdown: w.countdown,
    lastGoal: w.lastGoal,
    epicSave: w.epicSave ? { ...w.epicSave } : null,
    lastNudgeBits: w.lastNudgeBits,
  };
}

export function assignTeams(ids: string[]): Map<string, 0 | 1> {
  const sorted = [...ids].sort();
  const map = new Map<string, 0 | 1>();
  sorted.forEach((id, i) => map.set(id, (i % 2) as 0 | 1));
  return map;
}
