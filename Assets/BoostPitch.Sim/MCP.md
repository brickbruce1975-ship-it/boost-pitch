# Unity MCP → Boost Pitch

Source: official Unity video [Get started with Unity MCP](https://www.youtube.com/watch?v=2sswkdV1y3c&t=211s) (Unity, 11 May 2026) + [docs](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.0/manual/unity-mcp-overview.html).

**Status:** C# and Hub project files are in-repo (`runtime_verified` path). Live Editor Play Mode is `architecture_only` until you open this repo in Unity 6. `true_agi` remains false.

**Unity Hub:** The Unity project is the **repo root** (`Assets/` + `ProjectSettings/`). Editor **6000.5.0f1** (same as BrickBruceOrbit). If Hub says Missing Editor version, use the Editor version dropdown → **6000.5.0f1**. Then **Boost Pitch → MCP → Assemble Playable Arena**.


## What 3:31 actually shows

Chapter **Control Unity from an AI agent** (211s):

> Tools are actions which the connected client can run to complete tasks in Unity.

The demo: empty **spaceship** GameObject → Cursor enables more tools (8 → 16) → writes a flight script → **attaches it** → adds **Rigidbody** → checks Input System → **Play Mode** works.

That is the integration pattern. Not “generate a second C# physics story and hope someone pastes it.” The agent must see hierarchy, components, console, then mutate the live scene.

## Map onto Boost Pitch

| Video (3:31) | Boost Pitch |
|---|---|
| Empty spaceship | Empty `OrbitCoupe` at `(0, 0.42, 24)` |
| Flight script + space/mouse | `OrbitCoupeDriver` — WASD, **A = left**, Space jump, Shift boost |
| Add Rigidbody | Arcade Rigidbody, freeze rot X/Z. **No WheelCollider** |
| Input System check | KeyCode path (works if Active Input Handling = Both) |
| Play Mode prove it | Chase cam, coupe rolls, Suit Up plays once |
| Console inspect | `[BoostPitch] music_play id=suit-up … loop=false` |

Do **not** use third-party MCP packages (Coplay / CoderGamester) unless Unity’s official bridge is unavailable. Official server ships in **AI Assistant** (`com.unity.ai.assistant`) on **Unity 6+**.

## Enable the official bridge

1. Unity **6 (6000.0)+**. Install **AI Assistant**.
2. **Edit → Project Settings → AI → Unity MCP**.
3. Bridge status **Running**. If Stopped, Start.
4. Integrations → Cursor / Claude Code / VS Code Copilot / Windsurf → **Configure**.
5. First connect: **Accept** the pending client. Direct connections need approval; Unity AI Gateway is auto-approved.
6. Enable the extra tools (scene, scripts, console, GameObject inspect) — the video’s 8 → 16 step.
7. Editor must stay open. The relay is `~/.unity/relay/` with `--mcp`.

Custom project tools (when you add them later) belong in Editor C# via Unity’s MCP registration API. Do not invent attributes. Until that API is pinned in-project, use **Boost Pitch → MCP → Assemble Playable Arena**.

## Prompt to paste into the connected agent

See [McpKickoffPrompt.md](McpKickoffPrompt.md).

## Containment

- MCP can edit the scene and scripts. It is **not** a ranked netcode path.
- Casual P2P stays in the browser. Unity Netcode only if you add a dedicated server.
- Album files: full masters in `Resources/OrbitAudio/` (same ids as the web player). No DistroKid 30s loops.
- Quantum kickoff stays `simulation_only`.
- Outbound Bluesky stays gated.

## Verify (Play Mode)

1. A turns the coupe **left** from the chase camera while holding W.
2. On-power turns plant (Posi); dump throttle to rotate. No WheelCollider.
3. Suit Up starts, `loop = false`, then Float Easy.
4. Console has no missing-script errors.
5. Numbers still match `SimConstants` / `src/game/types.ts`. `OrbitCoupeDriver` calls `WorldStepper.ApplyTires`.
