export type Vec3 = { x: number; y: number; z: number };

export type Livery = "brick" | "cyan" | "amber" | "slate";

export const BRICK_BRUCE = {
  name: "Brick Bruce",
  livery: "brick" as const,
};

export type Car = {
  id: number;
  peerId: string;
  team: 0 | 1;
  isPlayer: boolean;
  remote: boolean;
  name: string;
  livery: Livery;
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  boost: number;
  onGround: boolean;
  jumpsLeft: number;
  jumpHeld: boolean;
  boosting: boolean;
  flipTimer: number;
};

export type Ball = {
  pos: Vec3;
  vel: Vec3;
};

export type BoostPad = {
  pos: Vec3;
  full: boolean;
  ready: number;
};

export type Phase = "menu" | "countdown" | "play" | "goal" | "over";

export type RosterEntry = {
  peerId: string;
  name: string;
  livery: Livery;
  team: 0 | 1;
  isLocal: boolean;
  remote: boolean;
};

export type Snapshot = {
  score: [number, number];
  clock: number;
  overtime: boolean;
  boost: number;
  speed: number;
  phase: Phase;
  lastGoal: 0 | 1 | null;
  countdown: number;
  onGround: boolean;
  yaw: number;
  localName: string;
  roster: { name: string; team: 0 | 1; livery: Livery; peerId: string }[];
  lastNudgeBits: string;
};

export type Actions = {
  throttle: number;
  steer: number;
  pitch: number;
  boost: boolean;
  jump: boolean;
};

/** Unity / C# mirror these exactly. Source of truth for BoostPitch.Sim. */
export const FIELD = {
  halfW: 40,
  halfL: 56,
  wallH: 16,
  goalHalfW: 9,
  goalH: 7.2,
  goalDepth: 5.5,
};

export const BALL_R = 1.55;
export const CAR_R = 1.12;
export const CAR_H = 0.42;
export const DT = 1 / 120;
export const MATCH_SECONDS = 180;
export const MAX_CARS = 8;
