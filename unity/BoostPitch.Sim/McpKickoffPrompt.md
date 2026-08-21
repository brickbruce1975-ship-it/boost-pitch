# Paste into Cursor / Copilot after Unity MCP is Accepted

There is an empty Unity scene. This is Boost Pitch, not a spaceship.

Do the official Unity MCP 3:31 workflow **first** (driveable coupe), then optionally the match runner.

## A. 3:31 coupe (required)

1. Read the scene hierarchy and console.
2. Create GameObject `PitchArena` and add `BoostPitch.Sim.PitchArenaBuilder`, then call Build (or use menu **Boost Pitch / MCP / Assemble Playable Arena**).
3. Create GameObject `OrbitCoupe` at `(0, 0.42, 24)`.
4. Add `Rigidbody` (mass 1.2, interpolate, freeze rotation X and Z). Do **not** add WheelCollider.
5. Add a capsule collider along Z, radius 1.12.
6. Attach `BoostPitch.Sim.OrbitCoupeDriver`. DriverName = `Brick Bruce`. Yaw = 0 (faces world −Z).
7. Call `BoostPitch.Sim.OrbitCoupeVisual.Attach` so the body is the black Orbit coupe with cyan bars. No red brick box.
8. Add `AudioSource` + `BoostPitch.Sim.OrbitAlbumPlayer`. Play **suit-up** once. `loop = false`. Volume 0.82. Full masters only — never DistroKid 30s previews.
9. Create `ChaseCamera` with Camera + AudioListener + `OrbitChaseCam` targeting the coupe.
10. Confirm Active Input Handling is Both / Input Manager so KeyCode.A works.
11. Enter Play Mode. Drive W. Press A — the coupe must turn **left** from the chase camera. Shift boosts. Space jumps. On-power turns should feel planted (clutch LSD / Posi). Dump throttle mid-turn to rotate.
12. Read the console. Fix missing scripts / missing `Resources/OrbitAudio/suit-up` only by pointing at full masters.

`OrbitCoupeDriver` **must call** `WorldStepper.ApplyTires` / `StepAir`. Do not invent a second Pacejka or a WheelCollider driveline.

## B. Full match (after A works)

1. Empty GameObject `Match` + `BoostPitch.Sim.OrbitMatchRunner`.
2. Assign car/ball Transforms if you have them; otherwise it still ticks the sim.
3. `KickOff()` → countdown → play. Ball, pads, bot, goals come from `WorldStepper.Step` (same order as `src/game/sim.ts`).
4. Quantum kickoff is `QuantumKickoff.Sample` — `simulation_only`, not a QPU.

If anything fails, inspect hierarchy + inspector + console, then patch. Do not invent a second physics model.
