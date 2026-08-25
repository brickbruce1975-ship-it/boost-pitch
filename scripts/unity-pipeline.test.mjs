import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contract = JSON.parse(await fs.readFile(path.join(root, "Assets/BoostPitch.Sim/schema/browser-contract.json"), "utf8"));

test("Unity handoff contract is production-safe", () => {
  assert.equal(contract.product, "Boost Pitch");
  assert.equal(contract.identity.defaultDriver, "Brick Bruce");
  assert.equal(contract.identity.defaultLivery, "brick");
  assert.equal(contract.coordinateSystem.steerPositive, "A-left");
  assert.match(contract.physics.model, /Pacejka/);
  assert.match(contract.physics.model, /LSD/);
  assert.equal(contract.physics.wheelCollider, false);
  assert.equal(contract.audio.loop, false);
  assert.deepEqual(contract.audio.tracks.map((track) => track.id), [
    "suit-up",
    "float-easy",
    "spaceage",
    "astronaut",
    "witness",
    "the-shimmer",
    "in-the-glass",
  ]);
  assert.equal(contract.quantumKickoff.mode, "simulation_only");
  assert.equal(contract.true_agi, false);
});
