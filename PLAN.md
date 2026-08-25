# Boost Pitch Execution Plan

## Goal

Deliver a polished browser demo tomorrow while preserving a Unity-first handoff contract and a future Unreal migration path.

## Workstreams

1. **Presentation:** Add a convincing procedural crowd, spectator light motion, ribbon-board energy, stronger stadium composition, readable arena signage, and restrained goal/boost glamour.
2. **Feel:** Replay launch, steering, lift-off rotation, jump, boost, aerial control, landing, ball impact, and goal reset in Chromium. Tune only the existing simulation in `src/game/sim.ts`; preserve the two-patch Pacejka + clutch LSD story.
3. **Multiplayer:** Harden the existing casual P2P room lifecycle, peer roster updates, host-authoritative match state, reconnect/leave handling, and clear user-facing connection status. Do not add ranked netcode.
4. **Pipeline:** Regenerate and validate the browser-to-Unity contract after source changes. Keep Unity as the primary handoff runtime and keep browser physics as the parity source until an actual Unity Play Mode gate is available.

## Demo gates

A stranger must cold-load the root page, see Kick off, enter a countdown, drive with W, steer left with A and right with D, jump with Space, boost with Shift, land cleanly, score and observe a reset, use M/N/H, and understand the multiplayer room path without a tutorial wall. Mobile-width controls must remain usable.

## Quality gates

Run `npx tsc --noEmit`, `node scripts/brand-check.mjs`, `node scripts/controls-self-test.mjs http://127.0.0.1:8080/`, `npm run unity:contract:validate`, `npm test`, `git diff --check`, and a Chromium visual smoke sequence. Any failure is fixed before commit. The repository must remain clean apart from intentional changes and be pushed to `origin/main`.
