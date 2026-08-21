import * as THREE from "three";
import type { Livery } from "./types";

/** The Orbit poster lock: black 70s muscle coupe, cyan bars, cyan underglow. No red body. */
const PAINT: Record<Livery, number> = {
  brick: 0x141210,
  cyan: 0x0c3d3a,
  amber: 0x2a1a10,
  slate: 0x8e969c,
};

const ACCENT: Record<Livery, number> = {
  brick: 0x2ee6d6,
  cyan: 0x2ee6d6,
  amber: 0xff8a3d,
  slate: 0xd5dde2,
};

let bruceTex: THREE.Texture | null = null;

function coverDriverTexture() {
  if (bruceTex) return bruceTex;
  const loader = new THREE.TextureLoader();
  bruceTex = loader.load("/orbit/orbit-cover-bruce.jpg");
  bruceTex.colorSpace = THREE.SRGBColorSpace;
  return bruceTex;
}

function chromeMat() {
  return new THREE.MeshStandardMaterial({
    color: 0xc5cdd3,
    metalness: 0.96,
    roughness: 0.14,
  });
}

function paintMat(livery: Livery) {
  return new THREE.MeshStandardMaterial({
    color: PAINT[livery],
    metalness: livery === "slate" ? 0.88 : 0.72,
    roughness: livery === "slate" ? 0.18 : 0.32,
  });
}

function box(
  parent: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/**
 * 70s muscle coupe from The Orbit cover + orbit-muscle still.
 * Local +Z is the nose so lookAt(forward) aims the grille the way we drive.
 */
export function makeCar(livery: Livery) {
  const g = new THREE.Group();
  const paint = paintMat(livery);
  const chrome = chromeMat();
  const accent = ACCENT[livery];
  const black = new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.55, metalness: 0.25 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x081018,
    metalness: 0.92,
    roughness: 0.06,
    transparent: true,
    opacity: 0.52,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.92, metalness: 0.05 });
  const mag = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, metalness: 0.7, roughness: 0.38 });

  // Tub + coke-bottle hips
  box(g, new THREE.BoxGeometry(1.16, 0.28, 2.28), paint, 0, 0.2, 0.02);
  box(g, new THREE.BoxGeometry(1.28, 0.18, 0.78), paint, 0, 0.21, 0.58);
  box(g, new THREE.BoxGeometry(1.3, 0.2, 0.78), paint, 0, 0.22, -0.72);

  // Long hood, slight drop toward the grille
  box(g, new THREE.BoxGeometry(1.1, 0.07, 1.12), paint, 0, 0.35, 0.62, -0.09);
  // Fastback — Charger slope, not a roof box
  box(g, new THREE.BoxGeometry(0.9, 0.14, 1.05), paint, 0, 0.46, -0.22, 0.32);
  box(g, new THREE.BoxGeometry(0.84, 0.12, 0.92), glass, 0, 0.48, -0.18, 0.32);
  // Short rear deck + ducktail
  box(g, new THREE.BoxGeometry(1.18, 0.07, 0.42), paint, 0, 0.32, -0.98);
  box(g, new THREE.BoxGeometry(1.12, 0.04, 0.18), paint, 0, 0.38, -1.16, 0.22);

  // Chrome bumpers + rubber strip
  box(g, new THREE.BoxGeometry(1.28, 0.13, 0.16), chrome, 0, 0.12, 1.2);
  box(g, new THREE.BoxGeometry(1.22, 0.03, 0.17), black, 0, 0.12, 1.21);
  box(g, new THREE.BoxGeometry(1.28, 0.13, 0.16), chrome, 0, 0.12, -1.2);
  box(g, new THREE.BoxGeometry(1.22, 0.03, 0.17), black, 0, 0.12, -1.21);

  // Split grille
  box(g, new THREE.BoxGeometry(1.02, 0.18, 0.06), black, 0, 0.24, 1.15);
  box(g, new THREE.BoxGeometry(0.04, 0.16, 0.07), chrome, 0, 0.24, 1.16);

  // Cyan (or livery) light bars — DeLorean energy on a Charger body
  const barMat = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 1.55,
    metalness: 0.2,
    roughness: 0.25,
  });
  const barL = box(g, new THREE.BoxGeometry(0.4, 0.055, 0.05), barMat, -0.28, 0.24, 1.175);
  const barR = box(g, new THREE.BoxGeometry(0.4, 0.055, 0.05), barMat, 0.28, 0.24, 1.175);
  barL.name = "lightBar";
  barR.name = "lightBar";

  // Full-width tail
  const tail = new THREE.MeshStandardMaterial({
    color: 0xff2a2a,
    emissive: 0x7a0808,
    emissiveIntensity: 0.7,
  });
  box(g, new THREE.BoxGeometry(1.08, 0.055, 0.04), tail, 0, 0.26, -1.175);

  // Side chrome spear
  box(g, new THREE.BoxGeometry(0.03, 0.025, 1.7), chrome, -0.62, 0.22, 0);
  box(g, new THREE.BoxGeometry(0.03, 0.025, 1.7), chrome, 0.62, 0.22, 0);

  // Dual exhaust
  const tip = new THREE.CylinderGeometry(0.035, 0.035, 0.14, 10);
  tip.rotateX(Math.PI / 2);
  box(g, tip, chrome, -0.22, 0.08, -1.28);
  box(g, tip.clone(), chrome, 0.22, 0.08, -1.28);

  // Dark mag wheels + chrome lip
  const tireGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.2, 14);
  tireGeo.rotateZ(Math.PI / 2);
  const lipGeo = new THREE.CylinderGeometry(0.175, 0.175, 0.22, 14);
  lipGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.23, 10);
  hubGeo.rotateZ(Math.PI / 2);
  const spots: [number, number, number][] = [
    [-0.58, 0.0, 0.7],
    [0.58, 0.0, 0.7],
    [-0.58, 0.0, -0.72],
    [0.58, 0.0, -0.72],
  ];
  for (const [x, y, z] of spots) {
    const wheel = new THREE.Group();
    wheel.name = "wheel";
    wheel.position.set(x, y, z);
    const tire = new THREE.Mesh(tireGeo, rubber);
    tire.castShadow = true;
    wheel.add(tire, new THREE.Mesh(lipGeo, mag), new THREE.Mesh(hubGeo, chrome));
    g.add(wheel);
  }

  // Cyan underglow — poster lock
  const under = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.03, 2.0),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.34 }),
  );
  under.position.set(0, 0.02, 0);
  under.name = "underGlow";
  g.add(under);

  // Boost plume out the back (local −Z)
  const glow = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.72, 10),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0 }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, 0.16, -1.45);
  glow.name = "boostGlow";
  g.add(glow);

  // Cover crop in the left seat — no generated face
  if (livery === "brick") {
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.46),
      new THREE.MeshBasicMaterial({
        map: coverDriverTexture(),
        transparent: true,
        side: THREE.DoubleSide,
      }),
    );
    card.position.set(-0.2, 0.42, 0.02);
    card.rotation.y = 0.18;
    card.name = "bruceDriver";
    g.add(card);
  }

  g.userData.livery = livery;
  g.userData.accent = accent;
  g.userData.squash = 0;
  g.userData.prevYaw = 0;
  return g;
}

export function disposeCar(group: THREE.Group) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Sprite) {
      obj.material.map?.dispose();
      obj.material.dispose();
      return;
    }
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (m.map && m.map !== bruceTex) m.map.dispose();
      m.dispose();
    }
  });
}

export function pulseCarLights(mesh: THREE.Group, boosting: boolean) {
  const glow = mesh.getObjectByName("boostGlow") as THREE.Mesh | undefined;
  if (glow) {
    (glow.material as THREE.MeshBasicMaterial).opacity = boosting ? 0.88 : 0;
  }
  const under = mesh.getObjectByName("underGlow") as THREE.Mesh | undefined;
  if (under) {
    (under.material as THREE.MeshBasicMaterial).opacity = boosting ? 0.82 : 0.34;
  }
  mesh.traverse((obj) => {
    if (obj.name !== "lightBar" || !(obj instanceof THREE.Mesh)) return;
    const mat = obj.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = boosting ? 2.4 : 1.55;
  });
}

export function spinWheels(mesh: THREE.Group, along: number, dt: number) {
  const d = along * dt * 1.25;
  if (Math.abs(d) < 1e-4) return;
  for (const child of mesh.children) {
    if (child.name === "wheel") child.rotateX(d);
  }
}

export function squashCar(mesh: THREE.Group, dt: number, landed: boolean) {
  if (landed) mesh.userData.squash = 0.26;
  const s = Number(mesh.userData.squash) || 0;
  const next = s * Math.exp(-14 * dt);
  mesh.userData.squash = next;
  mesh.scale.set(1 + next * 0.65, Math.max(0.72, 1 - next * 1.2), 1 + next * 0.65);
}

export function attachNameplate(mesh: THREE.Group, name: string, color: number) {
  const old = mesh.getObjectByName("nameplate");
  if (old) {
    mesh.remove(old);
    const spr = old as THREE.Sprite;
    spr.material.map?.dispose();
    spr.material.dispose();
  }
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, 256, 64);
  g.fillStyle = "rgba(7,16,24,0.55)";
  g.fillRect(16, 12, 224, 40);
  g.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  g.font = "700 28px Rajdhani, Arial Narrow, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(name.slice(0, 18).toUpperCase(), 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
  );
  sprite.name = "nameplate";
  sprite.position.set(0, 1.28, 0);
  sprite.scale.set(2.2, 0.55, 1);
  mesh.add(sprite);
  mesh.userData.plateName = name;
}
