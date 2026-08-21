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

1. Open this **repo root** in Unity Hub (it is the Unity project: `Assets/` + `ProjectSettings/`).
2. Unity **6.5 (6000.5.0f1)** — same editor as BrickBruceOrbit — + official **AI Assistant** MCP ([MCP.md](MCP.md)).
3. Menu **Boost Pitch → MCP → Assemble Playable Arena** (or paste [McpKickoffPrompt.md](McpKickoffPrompt.md)).
4. Album clips are already in `Resources/OrbitAudio/` (suit-up … in-the-glass). Play once, no loop.
5. Active Input Handling = **Both** (set in ProjectSettings).
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

This repository root **is** the Unity 6 project. Hub: Add project from repository → `boost-pitch` → `main`.


## Quantum kickoff (educational)

`QuantumKickoff.cs` mirrors the 2-qubit H + CNOT sampler used in the browser.
A PennyLane sidecar lives at `../tools/pennylane_kickoff.py` (`default.qubit` mapping table).
Tagged **simulation_only** — not a QPU job.
