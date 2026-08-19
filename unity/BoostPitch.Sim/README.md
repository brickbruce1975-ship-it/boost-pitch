# Boost Pitch → Unity

This folder is the **Unity-facing contract** for the browser sim in `src/game/sim.ts`.
Keep numbers and field names in lockstep. Do not invent a second physics story.

## Port map

| Browser | Unity |
|---|---|
| `src/game/types.ts` `FIELD`, `DT`, Brick Bruce | `SimConstants.cs` |
| `src/game/sim.ts` `stepWorld` | `WorldStepper.cs` (signatures + order; implement next) |
| `src/game/quantumKickoff.ts` | `QuantumKickoff.cs` + optional PennyLane sidecar |
| `Car` / `Ball` / `Actions` | `WorldState.cs` |
| three.js +Y up, yaw 0 = −Z | Same (Unity is +Y up; convert only if you switch Z-forward) |

## Suggested Unity layout

1. Create a URP 3D project.
2. Drop this folder under `Assets/BoostPitch.Sim/`.
3. Author a `PitchArena` scene using `SimConstants` extents.
4. Drive cars with the same action struct (`Throttle`, `Steer`, `Pitch`, `Boost`, `Jump`).
5. Fixed timestep `1/120`. Arcade first — do not start with WheelCollider unless you re-tune everything.
6. Default driver is **Brick Bruce** / brick livery.
7. Multiplayer: the web build is **casual P2P**. For Unity, use Unity Netcode **only** if you add a server authority. Do not copy the P2P trust model into ranked play.

## Quantum kickoff (educational)

`QuantumKickoff.cs` mirrors the 2-qubit H + CNOT sampler used in the browser.
A PennyLane sidecar lives at `../tools/pennylane_kickoff.py` (`default.qubit` mapping table).
Tagged **simulation_only** — not a QPU job.
