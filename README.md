# Boost Pitch

Original browser **arena car soccer**. Boost, jump, flip, and put the ball in the net.

This is an independently designed sports-car arena game for the web — not affiliated with any commercial title.

## Play

- **Kick off** from the title card
- **WASD** drive (A = left, D = right from the chase camera)
- **Space** jump, then double-jump or directional flip
- **Shift** boost — refill on the glowing pads
- **H** control help
- Touch: left stick + Jump / Boost

1v1 vs an amber AI. 3:00 regulation, sudden-death overtime.

## Stack

React 19 · TanStack Start · three.js · Tailwind v4 · Better Auth (optional sign-in)

## Develop

```bash
npm install
npm run dev
```

## CAGE notes (architecture_only)

Boost Pitch is a contained educational simulation: cheap interventions (boost, jump, steer), exact replay-style reset, and measurable outcomes (goals). Suitable as a causal-sandbox sketch, not a competitive netcode clone.

## License

MIT
