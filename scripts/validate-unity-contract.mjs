import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = path.join(root, "Assets/BoostPitch.Sim/schema/browser-contract.json");
const simPath = path.join(root, "Assets/BoostPitch.Sim/SimConstants.cs");
const quantumPath = path.join(root, "src/game/quantumKickoff.ts");
const albumPath = path.join(root, "public/orbit/music/album.json");

const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
const sim = await fs.readFile(simPath, "utf8");
const quantum = await fs.readFile(quantumPath, "utf8");
const album = JSON.parse(await fs.readFile(albumPath, "utf8"));

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const csharp = (name) => {
  const match = sim.match(new RegExp(`${name}\\s*=\\s*([0-9.]+)`));
  return match ? Number(match[1]) : NaN;
};

expect(contract.product === "Boost Pitch", "product must remain Boost Pitch");
expect(contract.identity.defaultDriver === "Brick Bruce", "default driver must remain Brick Bruce");
expect(contract.identity.defaultLivery === "brick", "default livery must remain brick / black Orbit coupe");
expect(contract.coordinateSystem.steerPositive === "A-left", "A-left control invariant is missing");
expect(contract.physics.model.includes("Pacejka") && contract.physics.model.includes("LSD"), "physics contract must name Pacejka and clutch LSD");
expect(contract.physics.wheelCollider === false, "WheelCollider must remain disabled");
expect(contract.audio.loop === false && album.loop === false, "album playback must not loop");
expect(contract.quantumKickoff.mode === "simulation_only", "quantum kickoff must remain simulation_only");
expect(quantum.includes("simulation_only"), "browser quantum kickoff source must retain simulation_only marker");

for (const [key, csName] of [["halfW", "HalfW"], ["halfL", "HalfL"], ["wallH", "WallH"], ["goalHalfW", "GoalHalfW"], ["goalH", "GoalH"], ["goalDepth", "GoalDepth"]]) {
  expect(contract.field[key] === csharp(csName), `${key} differs between browser contract and SimConstants.cs`);
}
for (const [key, csName] of [["ballRadius", "BallRadius"], ["carRadius", "CarRadius"], ["carHeight", "CarHeight"], ["matchSeconds", "MatchSeconds"], ["maxCars", "MaxCars"]]) {
  expect(contract.physics[key] === csharp(csName), `${key} differs between browser contract and SimConstants.cs`);
}
const dtMatch = sim.match(/Dt\s*=\s*1f\s*\/\s*(\d+)/);
expect(Boolean(dtMatch) && Math.abs(contract.physics.dt - 1 / Number(dtMatch[1])) < 1e-9, "dt differs between browser contract and SimConstants.cs");

const expectedTracks = ["suit-up", "float-easy", "spaceage", "astronaut", "witness", "the-shimmer", "in-the-glass"];
expect(JSON.stringify(contract.audio.tracks.map((track) => track.id)) === JSON.stringify(expectedTracks), "album order differs from the locked seven-track order");
expect(JSON.stringify(contract.audio.tracks.map((track) => track.id)) === JSON.stringify(album.tracks.map((track) => track.id)), "generated album metadata differs from browser album metadata");

if (failures.length) {
  console.error(`FAIL unity-contract (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PASS unity-contract");
console.log(JSON.stringify({ contractVersion: contract.contractVersion, tracks: contract.audio.tracks.length, dt: contract.physics.dt, model: contract.physics.model }));
