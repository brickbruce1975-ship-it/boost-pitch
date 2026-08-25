# Manus — finish Boost Pitch in the browser

Paste everything below the line into Manus. Unity is **out of scope**. Browser is the product.

---

You are finishing **Boost Pitch**, an original browser arena car-soccer game. Do the work in a **real browser** against a running local (or cloned) build. Do **not** open Unity, Unity Hub, or write a second physics engine.

## CONTAIN (scope)

**In scope**
- Clone `https://github.com/brickbruce1975-ship-it/boost-pitch` branch `main`
- Run the TanStack / Vite app (`npm install` then `npm run dev` — host `0.0.0.0` port `8080`)
- Play it in Chromium: menu → Kick off → drive → aerial → goal
- Fix remaining **feel, presentation, and first-run** gaps in `src/`
- Keep `src/game/sim.ts` as the **only** physics story (Pacejka + clutch LSD / Posi already in)
- Run gates, commit, push `main`

**Out of scope**
- Unity Editor / Hub / Play Mode / MCP assemble
- WheelCollider, a second Pacejka, or renaming the car to any commercial IP
- Ranked netcode, dedicated servers
- Claiming a QPU / “true AGI”
- DistroKid 30-second album previews (full masters are in `public/orbit/music/`)

**Invariants (do not break)**
- **A = left**, **D = right** from the chase camera while holding W
- Default driver **Brick Bruce**, livery **brick** (black Orbit coupe, cyan bars — no red body)
- Name: **Boost Pitch**. Do not use Rocket League / Octane / Psyonix / Supersonic Acrobatic names, logos, or audio
- Quantum kickoff stays `simulation_only` (`src/game/quantumKickoff.ts`)
- Casual P2P is friends-only; host owns ball/clock/score
- Album: Suit Up → Float Easy → Spaceage → Astronaut → Witness → The Shimmer → In the Glass. Play once. Do not loop.

## ANALYZE (what “finished” means)

The sim already has:
- Combined-slip Pacejka rear tires
- Two-patch clutch LSD (`lsdCap`, `lock`, `wL`/`wR`) — power-on planted, lift-off rotates
- Chase cam, jumbotron, POSI chip, The Orbit radio, Amber Bot, 3:00 + OT
- QA hook `window.__controlsTest` (`stepFor`, `resetForQa`)

Finish line is a **playable, juicy, legally distinct** browser match a stranger can Kick off without a tutorial wall.

**Play in the browser (you must actually click, not just unit-test):**
1. Open `/` — title, Brick Bruce, **Kick off** visible without hunting
2. Click Kick off — countdown, Suit Up starts (or Play album if autoplay blocked)
3. Hold **W** — launch with punch, not ice
4. Hold **W+A** — coupe turns **left** on screen; POSI chip can show on throttle
5. Dump throttle mid-turn — car should rotate more (lift-off oversteer)
6. **Space** jump, **Shift** boost, land without exploding
7. Hit the ball into a goal — jumbotron + score + reset
8. **M** mute / **N** radio / **H** help
9. Mobile-width: left stick + Jump/Boost still drive

If it still “drifts too much” on power, **tune** `src/game/sim.ts` (`MU`, `LSD_*`, `I_WH`, `TURN`, `RELAX_LEN`) — do **not** delete the LSD. Locked yaw on W+A must stay **less** than `lsdCap: 0`.

## GOVERN

| Rule | Test |
|---|---|
| A = left | `scripts/controls-self-test.mjs` |
| Posi understeer on power | same file, `PASS lsd` (open yaw > locked × 1.04) |
| Brand | `node scripts/brand-check.mjs` (and repo grep: no Rocket League / Octane / Psyonix) |
| Types | `npx tsc --noEmit` |
| Quantum | no “we ran a QPU” copy |
| Audio | no 30s DistroKid loops; `loop = false` |

`true_agi` remains **false**. You are a browser playtester + patcher.

## EXECUTE (order)

1. `git clone https://github.com/brickbruce1975-ship-it/boost-pitch.git && cd boost-pitch && git checkout main && npm install`
2. `npm run dev` (Vite on 8080). Open Chromium at `http://127.0.0.1:8080/`
3. Screenshot the menu. Kick off. Drive W, A, D, Space, Shift. Screenshot a goal and an aerial.
4. Patch **only** what the playtest failed:
   - Input / camera: `src/game/input.ts`, `src/game/engine.ts`, `src/components/GameView.tsx`
   - Feel: `src/game/sim.ts` (keep two-patch LSD)
   - Look: `src/game/orbitCar.ts`, `src/game/arena.ts`, `src/game/fx.ts`, `src/styles.css`
   - HUD / first-run: `GameView.tsx`
5. After each patch, replay Kick off. Do not pile speculative features (no replay theater, no ranked ladder, no extra cars).
6. Run:

```bash
npx tsc --noEmit
node scripts/brand-check.mjs
npx playwright install chromium
node scripts/controls-self-test.mjs http://127.0.0.1:8080/
```

7. If controls-self-test fails, fix sim/input until PASS controls + PASS lsd.
8. Commit on `main` with a message that names the playtest result (e.g. `fix: power-on grip, A=left, Suit Up on kickoff`). Push to `origin/main`.
9. Return: 5 screenshots (menu, launch, W+A left, aerial, goal), test log, commit SHA, and a one-line “what still feels off” if anything.

## PRE-DELIVERY GATE (must all be true)

- [ ] Kick off from a cold load works in Chromium
- [ ] W moves forward; A turns left on screen; D turns right
- [ ] `controls-self-test.mjs` prints `PASS controls` and `PASS lsd`
- [ ] `tsc --noEmit` clean
- [ ] Brand grep clean; Orbit coupe stays black + cyan
- [ ] Suit Up can play (user-gesture fallback OK); tracks do not loop
- [ ] No Unity files required to play
- [ ] No second tire model

If a gate fails, keep iterating in the browser. Do not “finish” by writing a Unity scene or a design doc.

---
