# Boost Pitch

Original browser **arena car soccer**. Boost, jump, flip, and put the ball in the net.

This is an independently designed sports-car arena game for the web — not affiliated with any commercial title.

Default driver: **Brick Bruce** (brick livery). Rename and pick cyan / amber / slate if you want.

## Play

- **Solo kick off** vs Amber Bot
- **Host room** / **Join** with a 5-character code for casual P2P (friends only)
- **WASD** drive (A = left, D = right from the chase camera)
- **Space** jump, then double-jump or directional flip
- **Shift** boost — refill on the glowing pads
- **H** control help
- **M** mute album · **N** play / pause The Orbit
- Touch: left stick + Jump / Boost

3:00 regulation, sudden-death overtime. Up to 8 cars in a casual lobby.

## Soundtrack

**The Orbit** by Brick Bruce — full album masters, same order as the Unity ride:

1. Suit Up
2. Float Easy
3. Spaceage
4. Astronaut
5. Witness
6. The Shimmer
7. In the Glass

Each track plays once (no loop). Suit Up starts on kickoff or Play album. Do not swap in DistroKid 30-second previews.


## Casual multiplayer (not ranked)

Friends share a room code. The browser mesh is WebRTC P2P: game ticks go peer-to-peer, the app only brokers the handshake.

- Host (lexicographically smallest peer id) owns the ball, clock, and score
- Each peer owns their own car
- Peers learn each other's IP addresses during ICE
- **Not for ranked play, anonymous matchmaking, or cheat-sensitive competition**

## Stack

React 19 · TanStack Start · three.js · Tailwind v4 · Better Auth (optional sign-in) · WebRTC P2P

## Unity (Hub)

This repo **is** a Unity 6 project (`Assets/` + `ProjectSettings/` on `main`). In Unity Hub: **Add → Add project from repository** → `brickbruce1975-ship-it/boost-pitch` → branch `main`. Open with **6000.0.50f1** (or any Unity 6). Then **Boost Pitch → MCP → Assemble Playable Arena**.

Contract scripts live in `Assets/BoostPitch.Sim/` (same numbers as `src/game/sim.ts`):

- `SimConstants.cs` — field, `Dt = 1/120`, Pacejka + clutch LSD
- `WorldStepper.cs` — match tick
- `OrbitCoupeDriver.cs` — Rigidbody adapter (3:31 path, **A = left**, no WheelCollider)
- `OrbitMatchRunner.cs` — full match host
- `QuantumKickoff.cs` — H+CNOT, `simulation_only`

Active Input Handling = Both. Album clips are in `Assets/BoostPitch.Sim/Resources/OrbitAudio/`. MCP: [Assets/BoostPitch.Sim/MCP.md](Assets/BoostPitch.Sim/MCP.md).



## Educational kickoff sampler

Each kickoff draws a tiny 2-qubit H + CNOT sample and nudges the ball (`00` / `11`). Browser: `src/game/quantumKickoff.ts`. Python sidecar: `unity/tools/pennylane_kickoff.py` (`default.qubit`, mapping table only).

**simulation_only** — not a QPU job, not a live hardware claim.

## CAGE notes (architecture_only)

Boost Pitch is a contained educational simulation: cheap interventions (boost, jump, steer), exact replay-style reset, and measurable outcomes (goals). Suitable as a causal-sandbox sketch. Casual P2P is host-authoritative for the ball only; do not treat it as competitive netcode.

## Develop

```bash
npm install
npm run dev
```

## License

MIT
