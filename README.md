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
- Touch: left stick + Jump / Boost

3:00 regulation, sudden-death overtime. Up to 8 cars in a casual lobby.

## Casual multiplayer (not ranked)

Friends share a room code. The browser mesh is WebRTC P2P: game ticks go peer-to-peer, the app only brokers the handshake.

- Host (lexicographically smallest peer id) owns the ball, clock, and score
- Each peer owns their own car
- Peers learn each other's IP addresses during ICE
- **Not for ranked play, anonymous matchmaking, or cheat-sensitive competition**

## Stack

React 19 · TanStack Start · three.js · Tailwind v4 · Better Auth (optional sign-in) · WebRTC P2P

## Unity prep

`unity/BoostPitch.Sim/` is the C# contract that mirrors `src/game/types.ts` + `src/game/sim.ts`:

- `SimConstants.cs` — field extents, `Dt = 1/120`, Brick Bruce defaults
- `WorldState.cs` — car / ball / actions / snapshot
- `QuantumKickoff.cs` — same 2-qubit H+CNOT impulse map
- `schema/world.schema.json` — wire snapshot
- `WorldStepper.cs` — documented step order (implement physics next)

Drop the folder under `Assets/` in a URP 3D project. Keep numbers in lockstep with the browser.

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
