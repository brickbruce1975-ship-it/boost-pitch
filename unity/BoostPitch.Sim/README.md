# Boost Pitch → Unity

This folder is the **Unity-facing contract** for the browser sim in `src/game/sim.ts`.
Keep numbers and field names in lockstep. Do not invent a second physics story.

**Status:** `architecture_only` for a live Editor / Play Mode pass (no Unity process in the sandbox). C# below is the drop-in an MCP agent should assemble. `true_agi` remains false. Browser remains the runtime-verified source of truth.

## Port map

| Browser | Unity |
|---|---|
| `src/game/types.ts` `FIELD`, `DT`, Brick Bruce | `SimConstants.cs` |
| `src/game/sim.ts` `stepWorld` | `WorldStepper.cs` (ported; call at `Dt = 1/120`) |
| `src/game/sim.ts` Pacejka + clutch LSD (two rear patches, A = left) | `WorldStepper.ApplyTires` — `OrbitCoupeDriver` is a Rigidbody adapter, not a second model |
| Match host | `OrbitMatchRunner.cs` |
| `src/game/quantumKickoff.ts` | `QuantumKickoff.cs` + optional PennyLane sidecar |
| `src/game/orbitMusic.ts` | `OrbitAlbumPlayer.cs` (same 7 ids, no loop) |
| `Car` / `Ball` / `Actions` | `WorldState.cs` |
| three.js +Y up, yaw 0 = −Z | Same (Unity is +Y up) |

## Before you hit Play (checklist)

1. Unity **6** + official **AI Assistant** MCP ([MCP.md](MCP.md)). No third-party MCP packages.
2. Drop this folder under `Assets/BoostPitch.Sim/`.
3. Menu **Boost Pitch → MCP → Assemble Playable Arena** (or paste [McpKickoffPrompt.md](McpKickoffPrompt.md)).
4. Full album masters in `Resources/OrbitAudio/` (`suit-up` … `in-the-glass`). No DistroKid 30s loops.
5. Active Input Handling = **Both**.
6. Prove **A = left** from the chase camera while holding W.
7. Only then attach `OrbitMatchRunner` for ball / bot / goals.

## Unity MCP (official, Unity 6)

Follow [MCP.md](MCP.md). Pattern from Unity’s own video at 3:31: empty object → agent attaches script + Rigidbody → Play Mode.

Playable pieces:

- `OrbitCoupeDriver` — Rigidbody adapter, **A = left**, tires from `WorldStepper`
- `OrbitCoupeVisual` — black coupe, cyan bars
- `OrbitChaseCam`
- `OrbitAlbumPlayer` — The Orbit, Suit Up first
- `PitchArenaBuilder` — field from `SimConstants`
- `WorldStepper` — match tick (cars, ball, pads, score)
- `OrbitMatchRunner` — MonoBehaviour host for that tick

## Suggested Unity layout

1. Create a **Unity 6** URP (or HDRP) 3D project.
2. Install **AI Assistant** so Unity MCP is present.
3. Drop this folder under `Assets/BoostPitch.Sim/`.
4. Assemble the arena (menu or MCP prompt).
5. Drop full album masters in `Assets/Resources/OrbitAudio/` (`suit-up.wav` …).
6. Fixed timestep `1/120`. Arcade first — **no WheelCollider**.
7. Default driver is **Brick Bruce** / Orbit livery.
8. Multiplayer: the web build is **casual P2P**. Unity Netcode **only** with a server. Do not copy the P2P trust model into ranked play.

## Quantum kickoff (educational)

`QuantumKickoff.cs` mirrors the 2-qubit H + CNOT sampler used in the browser.
A PennyLane sidecar lives at `../tools/pennylane_kickoff.py` (`default.qubit` mapping table).
Tagged **simulation_only** — not a QPU job.
