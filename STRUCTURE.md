# Boost Pitch Structure

## Browser demo

`src/components/GameView.tsx` is the React shell for menu, HUD, help, mobile controls, and casual-room UI. `src/game/engine.ts` owns the Three.js renderer, camera, visual synchronization, audio triggers, and the QA probe. `src/game/sim.ts` owns the only browser physics story: world state, fixed-step integration, Pacejka tire patches, clutch LSD / Posi, ball, goals, kickoff, pads, and match phases. `src/game/input.ts` translates keyboard, touch, and mobile stick input into actions. `src/game/arena.ts`, `src/game/orbitCar.ts`, and `src/game/fx.ts` own the visual arena, vehicle mesh, and effects.

## Multiplayer

`src/lib/multiplayer.ts` owns the casual peer room/signaling abstraction. `GameView.tsx` builds rosters and bridges local/remote car wires and host world wires into the engine. The current model is casual P2P with a host-authoritative match/ball state; it is not ranked netcode.

## Unity handoff

The repository root contains the Unity 6 project. `Assets/BoostPitch.Sim/WorldStepper.cs` mirrors the browser fixed-step simulation, `OrbitMatchRunner.cs` owns Unity lifecycle and view synchronization, `PitchArenaBuilder.cs` assembles the arena, and `schema/browser-contract.json` locks the cross-runtime dimensions, identity, physics model, album, kickoff, and governance invariants. `scripts/export-unity-contract.mjs` regenerates the schema and `scripts/validate-unity-contract.mjs` verifies parity.

## Future Unreal migration

The contract and engine-neutral world schema are the migration boundary. Browser and Unity presentation layers may change, but gameplay state should remain representable as fixed-step world snapshots, action inputs, car wires, host wires, and portable arena asset descriptions. Unreal work should consume the contract rather than fork the physics story.

## Orchestration boundary

Cage work is represented by tracked plans, memory, structure, assets, tests, and commits. It may propose and implement bounded repository changes, run deterministic validation, and record evidence. It must not silently rewrite invariants, claim unexecuted engine gates, or treat `true_agi` as true.
