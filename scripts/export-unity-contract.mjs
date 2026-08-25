import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const typesPath = path.join(root, "src/game/types.ts");
const constantsPath = path.join(root, "Assets/BoostPitch.Sim/SimConstants.cs");
const albumPath = path.join(root, "public/orbit/music/album.json");
const outputDir = path.join(root, "Assets/BoostPitch.Sim/schema");
const outputPath = path.join(outputDir, "browser-contract.json");

const types = await fs.readFile(typesPath, "utf8");
const constants = await fs.readFile(constantsPath, "utf8");
const album = JSON.parse(await fs.readFile(albumPath, "utf8"));

function numberAfter(source, pattern) {
  const match = source.match(pattern);
  if (!match) throw new Error(`Could not find ${pattern}`);
  return Number(match[1]);
}

function intAfter(source, pattern) {
  return Math.trunc(numberAfter(source, pattern));
}

function stringAfter(source, pattern) {
  const match = source.match(pattern);
  if (!match) throw new Error(`Could not find ${pattern}`);
  return match[1];
}

const field = {
  halfW: numberAfter(types, /halfW:\s*(\d+(?:\.\d+)?)/),
  halfL: numberAfter(types, /halfL:\s*(\d+(?:\.\d+)?)/),
  wallH: numberAfter(types, /wallH:\s*(\d+(?:\.\d+)?)/),
  goalHalfW: numberAfter(types, /goalHalfW:\s*(\d+(?:\.\d+)?)/),
  goalH: numberAfter(types, /goalH:\s*(\d+(?:\.\d+)?)/),
  goalDepth: numberAfter(types, /goalDepth:\s*(\d+(?:\.\d+)?)/),
};

const browser = {
  product: "Boost Pitch",
  contractVersion: 1,
  source: "src/game/types.ts + src/game/sim.ts + public/orbit/music/album.json",
  coordinateSystem: { up: "+Y", yawZeroForward: "-Z", steerPositive: "A-left" },
  field,
  physics: {
    ballRadius: numberAfter(types, /export const BALL_R\s*=\s*(\d+(?:\.\d+)?)/),
    carRadius: numberAfter(types, /export const CAR_R\s*=\s*(\d+(?:\.\d+)?)/),
    carHeight: numberAfter(types, /export const CAR_H\s*=\s*(\d+(?:\.\d+)?)/),
    dt: 1 / intAfter(types, /export const DT\s*=\s*1\s*\/\s*(\d+)/),
    matchSeconds: intAfter(types, /export const MATCH_SECONDS\s*=\s*(\d+)/),
    maxCars: intAfter(types, /export const MAX_CARS\s*=\s*(\d+)/),
    model: "combined-slip Pacejka with two-patch clutch LSD",
    wheelCollider: false,
  },
  identity: {
    defaultDriver: stringAfter(constants, /DefaultDriver\s*=\s*"([^"]+)"/),
    defaultLivery: stringAfter(constants, /DefaultLivery\s*=\s*"([^"]+)"/),
  },
  audio: {
    album: album.album,
    artist: album.artist,
    loop: Boolean(album.loop),
    fadeSec: album.fadeSec,
    tracks: album.tracks.map(({ id, title, src, durationSec }) => ({ id, title, src, durationSec })),
  },
  quantumKickoff: { mode: "simulation_only", source: "src/game/quantumKickoff.ts" },
  true_agi: false,
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(browser, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outputPath)}`);
