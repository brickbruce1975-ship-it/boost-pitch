# Assets

**Art direction:** Premium original arena car-soccer presentation for a browser demo: low third-person chase camera behind the black Orbit coupe, cyan and amber team lighting, dark teal spaceport-night environment, crisp luminous field lines, dramatic floodlights, tiered stands full of small cheering spectator silhouettes with cyan/teal/amber light sticks, animated ribbon boards, restrained bloom, and clean high-contrast HUD.

## Visual target

- Reference: `art-direction/boost-pitch-reference.png`
- Composition: player coupe in the lower third, ball at midfield, both goals and the far stands visible, score/HUD legible.
- Must-build elements: tiered stands, clustered crowd silhouettes/light sticks, floodlight towers, ribbon signage, Boost Pitch and Brick Bruce arena identity, speed/boost/Posi HUD, cyan/amber goal accents.
- Constraints: original Boost Pitch identity only; no commercial car-soccer IP, logos, or named vehicle brands. Keep procedural Three.js geometry and generated/Canvas textures so the Unity and future Unreal handoff remains asset-portable.

## Asset implementation strategy

The crowd is intended to be procedural and lightweight: instanced spectator silhouettes, per-instance team-colored emissive accents, deterministic idle wave offsets, and a few larger banner/light clusters. The visual reference is a target for composition and density, not a request to import a heavyweight photorealistic stadium package.
