# Boost Pitch Unity Runtime Contract

This folder is the **Unity-primary runtime** for Boost Pitch. The browser implementation remains the reference implementation for deterministic gameplay parity, presentation intent, and first-run acceptance tests; Unity is the shippable runtime target for production builds and the forward path to Unreal Engine.

> The repository root is a Unity 6 project. Open the root in Unity Hub, then use `Assets/BoostPitch.Sim/PitchArena.unity` for the runtime scene. Do not create a second tire model: `WorldStepper` is the only vehicle physics story and mirrors `src/game/sim.ts`.

## Pipeline contract

| Concern | Browser reference | Unity runtime | Synchronization gate |
|---|---|---|---|
| Shared dimensions and timing | `src/game/types.ts` | `SimConstants.cs` | `npm run unity:contract:validate` |
| Vehicle physics | `src/game/sim.ts` | `WorldStepper.cs` | Pacejka + two-patch clutch LSD parity |
| Match state | `World` / `Snapshot` | `WorldSnapshot` | `schema/world.schema.json` |
| Kickoff sampler | `src/game/quantumKickoff.ts` | `QuantumKickoff.cs` | `simulation_only`; never a QPU claim |
| Album order and playback | `src/game/orbitMusic.ts` + `public/orbit/music/album.json` | `OrbitAlbumPlayer.cs` | seven tracks, play once, `loop=false` |
| Look and controls | three.js chase camera and input | `OrbitCoupeVisual`, `OrbitChaseCam`, `OrbitMatchRunner` | A = left, D = right, W = forward |

The generated file `Assets/BoostPitch.Sim/schema/browser-contract.json` is produced from browser sources by `npm run unity:contract:export`. It is a reviewable, machine-readable handoff artifact; it is not hand-edited. Validation compares it against Unity constants and locked invariants.

## Runtime assembly

The playable path is `PitchArena` with `PitchArenaBuilder`, `OrbitMatchRunner`, a player coupe using `OrbitCoupeDriver` and `OrbitCoupeVisual`, `OrbitChaseCam`, and `OrbitAlbumPlayer`. `OrbitMatchRunner` owns the fixed simulation tick, match lifecycle, score, ball, bot, and transform synchronization. `OrbitCoupeDriver` is an adapter for the shared sim and does not use WheelCollider or a competing physics model.

Unity uses the same coordinate convention as the browser: +Y is up, yaw 0 faces world −Z, and positive steer is A / left from the chase camera. The default player is Brick Bruce in the black Orbit coupe with cyan bars. The album is Suit Up, Float Easy, Spaceage, Astronaut, Witness, The Shimmer, In the Glass; clips never loop and the final track stops.

## Build and handoff workflow

Run `npm install`, then `npm run unity:contract:export`, `npm run unity:contract:validate`, `npm run typecheck`, `node scripts/brand-check.mjs`, and the browser controls test. Open the repository root in Unity 6.5, allow the Asset Database to import, open `Assets/BoostPitch.Sim/PitchArena.unity`, and enter Play Mode. The Unity acceptance pass must prove cold-load kickoff, W launch, A-left / D-right, jump, boost, landing, ball contact, goal reset, and album playback without looping.

For Unreal preparation, treat `WorldState.cs`, `WorldStepper.cs`, `SimConstants.cs`, and `schema/world.schema.json` as the engine-neutral simulation boundary. Unity presentation components are adapters around that boundary. Future Unreal work should consume the same serialized state and contract rather than fork gameplay tuning.

## Validation status

The repository can validate contract parity and browser behavior in the sandbox. Unity Editor / Play Mode validation requires a machine with Unity 6.5 installed; no claim of Unity runtime execution is made when that editor is unavailable.
