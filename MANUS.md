# Manus — Boost Pitch Unity-first pipeline

Boost Pitch is developed as a Unity-first runtime with a browser parity build and automated contract checks. The repository root is the Unity project: `Assets/`, `Packages/`, and `ProjectSettings/` are intentionally at the root for Unity Hub.

## Source and runtime ownership

Browser gameplay remains the reference implementation for deterministic behavior and first-run acceptance. Unity is the primary runtime target for production and the forward path to Unreal Engine. `src/game/sim.ts` and `Assets/BoostPitch.Sim/WorldStepper.cs` must remain one physics story: combined-slip Pacejka with a two-patch clutch LSD. Do not add WheelCollider or another tire model.

The synchronization loop is explicit:

```bash
npm run unity:contract:export
npm run unity:contract:validate
npm run typecheck
node scripts/brand-check.mjs
node scripts/controls-self-test.mjs http://127.0.0.1:8080/
```

The exporter creates `Assets/BoostPitch.Sim/schema/browser-contract.json` from browser constants, album metadata, and identity rules. The validator fails on drift in dimensions, timing, model declaration, default driver/livery, A-left convention, album order, looping, quantum kickoff policy, or `true_agi`.

## Unity acceptance pass

Open the repository root in Unity 6.5 and run `Assets/BoostPitch.Sim/PitchArena.unity`. A stranger should be able to start a match without a tutorial wall. Prove cold-load kickoff; W launch; A-left and D-right from the chase camera; lift-off rotation; Space jump; Shift boost; landing; ball contact; goal, jumbotron, score, and reset; H help; M mute; N radio; mobile-width controls where applicable; and the seven-track album once in order.

The locked identity is Boost Pitch, Brick Bruce, and the black Orbit coupe with cyan bars. Quantum kickoff stays `simulation_only`. The album order is Suit Up, Float Easy, Spaceage, Astronaut, Witness, The Shimmer, In the Glass; no track loops. `true_agi` remains false.

## Quality bar and limitations

AAA quality means deterministic simulation, clear runtime ownership, reproducible contracts, authored presentation, stable input, accessible first-run controls, robust audio fallback, and validation evidence. Automated browser and contract gates can run in this repository. Unity Play Mode and platform build gates require a machine with Unity 6.5 installed; do not claim those gates pass without executing them.
