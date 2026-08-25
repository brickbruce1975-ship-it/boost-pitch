# Boost Pitch: Unity-first repository pipeline

The repository root is the Unity 6 project. Unity Hub should open the checkout itself because `Assets/`, `Packages/`, and `ProjectSettings/` live at the root. The browser build remains a parity reference and an automated acceptance harness; it is not a separate product branch.

## Three-stage pipeline

The pipeline has three deliberate stages. First, browser source defines the public gameplay contract: dimensions and timing in `src/game/types.ts`, vehicle feel in `src/game/sim.ts`, kickoff behavior in `src/game/quantumKickoff.ts`, and album order in `public/orbit/music/album.json`. Second, `npm run unity:contract:export` materializes those values as `Assets/BoostPitch.Sim/schema/browser-contract.json`. Third, `npm run unity:contract:validate` compares the generated artifact with `SimConstants.cs`, schema assumptions, identity rules, audio order, and simulation-only kickoff policy.

Unity is the primary runtime target for production and the forward handoff to Unreal. `WorldStepper.cs` owns the deterministic tick and the combined-slip Pacejka plus two-patch clutch LSD. `OrbitMatchRunner` owns match lifecycle and presentation synchronization. `OrbitCoupeDriver`, `OrbitChaseCam`, `OrbitCoupeVisual`, `PitchArenaBuilder`, and `OrbitAlbumPlayer` are runtime adapters. None of them may introduce a second tire model or WheelCollider.

## Local workflow

```bash
npm install
npm run unity:contract:export
npm run unity:contract:validate
npm run typecheck
node scripts/brand-check.mjs
node scripts/controls-self-test.mjs http://127.0.0.1:8080/
```

Then open the repository root in Unity 6.5, open `Assets/BoostPitch.Sim/PitchArena.unity`, and run the Play Mode acceptance pass. A production-ready pass proves cold-load kickoff, W launch, A-left and D-right from the chase camera, lift-off rotation, jump, boost, landing, ball collision, goal reset, HUD presentation, and one-shot album playback.

## Engine-neutral handoff

The future Unreal path should consume the simulation boundary rather than translate Unity presentation code line by line. The portable boundary is `SimConstants.cs`, `WorldState.cs`, `WorldStepper.cs`, and `schema/world.schema.json`; Unity components are adapters, while the generated browser contract makes drift visible in code review.

## Constraints

The game remains Boost Pitch with the Brick Bruce / Orbit identity. Quantum kickoff is educational and `simulation_only`; `true_agi` remains false. Album order is Suit Up, Float Easy, Spaceage, Astronaut, Witness, The Shimmer, In the Glass. Playback is once-only and non-looping. No commercial car-soccer IP, ranked netcode, or 30-second album previews are part of this pipeline.
