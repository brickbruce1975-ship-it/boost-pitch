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
  type RosterEntry,
  type Snapshot,
  BRICK_BRUCE,
} from "./types";
import { sampleKickoffImpulse } from "./quantumKickoff";

const GRAVITY = 34;
const BALL_G = 30;
const ACCEL = 40;
const BRAKE = 52;
const REVERSE = 18;
const MAX_SPD = 31;
const BOOST_ACCEL = 58;
const BOOST_MAX = 43;
const BOOST_DRAIN = 34;
const TURN = 2.75;
const AIR_YAW = 2.15;
const AIR_PITCH = 2.35;
const JUMP_V = 12.2;
const DBL_JUMP_V = 11.4;
const AIR_DRAG = 0.28;
const GROUND_DRAG = 0.55;
const BALL_BOUNCE = 0.64;
const BALL_DRAG = 0.12;

export type World = {
  cars: Car[];
  ball: Ball;
  pads: BoostPad[];
  score: [number, number];
  clock: number;
  overtime: boolean;
  phase: Phase;
  lastGoal: 0 | 1 | null;
  countdown: number;
  phaseT: number;
  roster: RosterEntry[];
  lastNudgeBits: string;
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

export function createWorld(): World {
  const roster = defaultSoloRoster();
  return {
    cars: carsFromRoster(roster),
    ball: { pos: v(0, BALL_R + 0.05, 0), vel: v() },
    pads: makePads(),
    score: [0, 0],
    clock: MATCH_SECONDS,
    overtime: false,
    phase: "menu",
    lastGoal: null,
    countdown: 3,
    phaseT: 0,
    roster,
    lastNudgeBits: "00",
  };
}

export function resetKickoff(w: World, roster = w.roster) {
  w.roster = roster;
  w.cars = carsFromRoster(roster);
  const nudge = sampleKickoffImpulse((Date.now() ^ (w.score[0] * 17 + w.score[1] * 31)) >>> 0);
  w.lastNudgeBits = nudge.bits;
  w.ball = { pos: v(0, BALL_R + 0.05, 0), vel: v(nudge.vx, 0, nudge.vz) };
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

function bounce(vel: { x: number; y: number; z: number }, n: { nx: number; ny: number; nz: number }, rest: number) {
  const vn = vel.x * n.nx + vel.y * n.ny + vel.z * n.nz;
  if (vn < 0) {
    vel.x -= (1 + rest) * vn * n.nx;
    vel.y -= (1 + rest) * vn * n.ny;
    vel.z -= (1 + rest) * vn * n.nz;
  }
}

function stepCar(car: Car, a: Actions, dt: number) {
  car.flipTimer = Math.max(0, car.flipTimer - dt);
  const f = carForward(car);
  const spd = Math.hypot(car.vel.x, car.vel.z);

  if (car.onGround) {
    car.pitch *= Math.max(0, 1 - 12 * dt);
    const speedFactor = Math.min(1, Math.max(0.18, spd / 10));
    const reverse = car.vel.x * f.x + car.vel.z * f.z >= -0.4 ? 1 : -1;
    car.yaw += a.steer * TURN * speedFactor * reverse * dt;

    const along = car.vel.x * f.x + car.vel.z * f.z;
    let targetAccel = 0;
    if (a.throttle > 0.05) targetAccel = ACCEL * a.throttle;
    else if (a.throttle < -0.05) targetAccel = along > 0.6 ? -BRAKE : -REVERSE;
    if (a.boost && car.boost > 0) {
      targetAccel += BOOST_ACCEL;
      car.boost = Math.max(0, car.boost - BOOST_DRAIN * dt);
      car.boosting = true;
    } else car.boosting = false;

    car.vel.x += f.x * targetAccel * dt;
    car.vel.z += f.z * targetAccel * dt;
    car.vel.x *= 1 - GROUND_DRAG * dt;
    car.vel.z *= 1 - GROUND_DRAG * dt;

    const max = a.boost && car.boost > 0 ? BOOST_MAX : MAX_SPD;
    const hs = Math.hypot(car.vel.x, car.vel.z);
    if (hs > max) {
      car.vel.x *= max / hs;
      car.vel.z *= max / hs;
    }

    if (a.jump && !car.jumpHeld) {
      car.vel.y = JUMP_V;
      car.onGround = false;
      car.jumpsLeft = 1;
    }
  } else {
    car.yaw += a.steer * AIR_YAW * dt;
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

  if (car.pos.y <= CAR_H) {
    car.pos.y = CAR_H;
    if (car.vel.y < 0) car.vel.y = 0;
    if (!car.onGround) {
      car.onGround = true;
      car.jumpsLeft = 2;
      car.pitch *= 0.3;
    }
  }

  const hit = clampArena(car.pos, CAR_R * 0.85, false);
  if (hit) {
    bounce(car.vel, hit, 0.15);
    car.vel.x *= 0.7;
    car.vel.z *= 0.7;
  }
}

function stepBall(ball: Ball, dt: number) {
  ball.vel.y -= BALL_G * dt;
  ball.vel.x *= 1 - BALL_DRAG * dt;
  ball.vel.y *= 1 - BALL_DRAG * 0.35 * dt;
  ball.vel.z *= 1 - BALL_DRAG * dt;
  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;
  ball.pos.z += ball.vel.z * dt;

  if (ball.pos.y < BALL_R) {
    ball.pos.y = BALL_R;
    if (ball.vel.y < 0) ball.vel.y = -ball.vel.y * BALL_BOUNCE;
    ball.vel.x *= 0.985;
    ball.vel.z *= 0.985;
    if (Math.abs(ball.vel.y) < 1.2) ball.vel.y = 0;
  }
  const hit = clampArena(ball.pos, BALL_R, true);
  if (hit) bounce(ball.vel, hit, BALL_BOUNCE);
}

function collideCarBall(car: Car, ball: Ball) {
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
  const rvx = ball.vel.x - car.vel.x;
  const rvy = ball.vel.y - car.vel.y;
  const rvz = ball.vel.z - car.vel.z;
  const vn = rvx * nx + rvy * ny + rvz * nz;
  if (vn < 0) {
    const extra = (car.boosting ? 9 : 4) + (car.flipTimer > 0 ? 6 : 0);
    const j = -(1.12) * vn + extra;
    ball.vel.x += j * nx;
    ball.vel.y += j * ny * 0.85;
    ball.vel.z += j * nz;
    car.vel.x -= nx * 2.4;
    car.vel.z -= nz * 2.4;
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

function botActions(w: World, car: Car): Actions {
  const ball = w.ball;
  const ownGoalZ = car.team === 0 ? FIELD.halfL : -FIELD.halfL;
  const oppGoalZ = -ownGoalZ;
  const toBallX = ball.pos.x - car.pos.x;
  const toBallZ = ball.pos.z - car.pos.z;
  const dist = Math.hypot(toBallX, toBallZ);
  const defending = Math.sign(ball.pos.z - ownGoalZ) === Math.sign(car.pos.z - ownGoalZ) && Math.abs(ball.pos.z - ownGoalZ) < 28;
  let tx = ball.pos.x + ball.vel.x * 0.35;
  let tz = ball.pos.z + ball.vel.z * 0.35;
  if (defending && dist > 14) {
    tx = ball.pos.x * 0.45;
    tz = ownGoalZ * 0.72;
  } else {
    tz += Math.sign(oppGoalZ) * 2.4;
  }
  const wantX = tx - car.pos.x;
  const wantZ = tz - car.pos.z;
  const wantYaw = Math.atan2(-wantX, -wantZ);
  let err = wantYaw - car.yaw;
  while (err > Math.PI) err -= Math.PI * 2;
  while (err < -Math.PI) err += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, err * 2.2));
  const aligned = Math.abs(err) < 0.45;
  const throttle = aligned ? 1 : 0.55;
  const boost = aligned && dist > 16 && car.boost > 8;
  const jump = ball.pos.y > 3.2 && dist < 7 && car.onGround;
  const pitch = !car.onGround ? Math.max(-1, Math.min(1, (ball.pos.y - car.pos.y) * 0.25)) : 0;
  return { throttle, steer, pitch, boost, jump };
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

export function stepWorld(w: World, player: Actions, dt: number, opts?: { carsOnly?: boolean }) {
  if (w.phase === "menu" || w.phase === "over") return;
  if (opts?.carsOnly) {
    for (const car of w.cars) {
      if (car.remote) continue;
      const a = car.isPlayer ? player : botActions(w, car);
      stepCar(car, a, dt);
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
      if (w.overtime) {
        w.phase = "countdown";
        w.phaseT = 0;
      } else {
        w.phase = "countdown";
        w.phaseT = 0;
      }
    }
    stepBall(w.ball, dt);
    return;
  }

  if (w.phase === "play") {
    if (!w.overtime) {
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
    stepCar(car, a, dt);
  }
  stepBall(w.ball, dt);
  for (let i = 0; i < w.cars.length; i++) {
    for (let j = i + 1; j < w.cars.length; j++) collideCars(w.cars[i], w.cars[j]);
  }
  for (const car of w.cars) collideCarBall(car, w.ball);
  collectPads(w, dt);

  const scored = checkGoal(w);
  if (scored !== null) {
    w.score[scored] += 1;
    w.lastGoal = scored;
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
    lastGoal: w.lastGoal,
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
  };
}

export function startMatch(w: World, roster?: RosterEntry[]) {
  w.score = [0, 0];
  w.clock = MATCH_SECONDS;
  w.overtime = false;
  w.lastGoal = null;
  resetKickoff(w, roster ?? w.roster);
  w.phase = "countdown";
  w.phaseT = 0;
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
    lastNudgeBits: w.lastNudgeBits,
  };
}

export function assignTeams(ids: string[]): Map<string, 0 | 1> {
  const sorted = [...ids].sort();
  const map = new Map<string, 0 | 1>();
  sorted.forEach((id, i) => map.set(id, (i % 2) as 0 | 1));
  return map;
}
