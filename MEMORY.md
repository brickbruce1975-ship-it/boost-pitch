# Boost Pitch Project Memory

## Working identity

The working orchestration name for this rebuild is **Cage**. Cage is a project workflow label, not a claim that the system is a true general intelligence or self-improving autonomous entity. Any future orchestration must remain explicit, inspectable, versioned, and human-controlled. The repository invariant `true_agi` remains `false`.

## Product

Boost Pitch is an original browser arena car-soccer game. The default driver is Brick Bruce using the black Orbit coupe with cyan accent bars. The project must not use commercial car-soccer IP, vehicle names, or audio references. Brick Bruce’s music identity is represented by the repository’s original The Orbit album metadata and seven-track order.

## Runtime pipeline

The browser build is the demo target for the next presentation. The repository root is also a Unity 6 handoff project for later migration to Unreal Engine. `src/game/sim.ts` is the browser physics source of truth; Unity mirrors its deterministic fixed-step model rather than introducing a second tire model. The contract is generated into `Assets/BoostPitch.Sim/schema/browser-contract.json` and validated by the repository scripts.

## Physics invariants

The simulation runs at `dt = 1/120`. It uses combined-slip Pacejka with two rear patches and a clutch LSD / Posi. From the chase camera, A must steer left and D right. Lift-off rotation must be stronger than continued throttle in the same powered turn. Quantum kickoff remains `simulation_only`. No WheelCollider or second Pacejka implementation is allowed.

## Demo priorities

The immediate browser demo needs a visible crowd in the stands, stronger arena atmosphere, readable presentation polish, smooth launch/steering/aerial/boost/landing feel, goal celebration and reset, and a reliable casual multiplayer room flow. The existing casual P2P path is not ranked netcode and must not be represented as such.

## Verification

Every gameplay change must be replayed in Chromium. Required checks include cold-load Kick off, W launch, W+A left, W+D right, jump, boost, landing, goal/reset, mute/radio/help, mobile-width controls, Posi engagement, lift-off rotation, TypeScript, brand, browser controls/LSD, Unity contract parity, and a clean git diff. Unity Editor Play Mode is an environment-dependent gate and must not be claimed unless actually executed.

## Recovery rule

If account history is missing, recover context from tracked repository files, generated contracts, tests, screenshots, and commit history. Do not infer wiped memory or invent prior decisions.

## Reference research: youth-friendly car-soccer UX

Official training documentation emphasizes low-friction practice: free shot navigation, saved progress, reset/restart, shuffle, mirroring, and a clear pause/end-training flow. For Boost Pitch, the original equivalents are a lightweight help overlay, immediate Kick off, clear input hints, reset/rematch affordances, and a possible future practice lane rather than a tutorial wall. These are UX patterns only; no commercial branding, assets, or names are to be copied.

Official play-menu research also highlights streamlined mode discovery, separate casual/private/training surfaces, quick joining of an existing private match, and quality-of-life continuity. Boost Pitch’s original demo equivalent should make Solo Kick Off, Host Room, Join Room, and Help immediately legible, preserve the player’s name/livery, and provide a visible connection state without adding ranked systems.

A useful reference pattern for keyboard players is an aerial-safety guard: holding throttle alone should not force an unwanted pitch-down until the player gives another aerial input, releases throttle, or air-rolls. Boost Pitch should adapt this as an original control option or default behavior if its current W/S aerial mapping creates accidental nose-down movement.

## Bright-presentation visual review

The updated desktop smoke screenshot shows the new instanced spectator layer across the far stands and the mobile screenshot retains a usable single-column menu with no horizontal overflow. The first bright pass is readable but slightly overexposed on the field and the spectator light accents are too small at demo distance. Next polish should lower tone-mapping exposure modestly, increase crowd light-stick readability, and keep the bright teal/amber broadcast palette.
