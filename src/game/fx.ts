import * as THREE from "three";
import type { Car } from "./types";

export type FxPulse = {
  kind: "hit" | "land" | "pad" | "goal" | "wall" | "skid";
  mag: number;
  x: number;
  y: number;
  z: number;
};

const MAX = 420;

export function createFx(scene: THREE.Scene) {
  const pos = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.28,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const life = new Float32Array(MAX);
  const vx = new Float32Array(MAX);
  const vy = new Float32Array(MAX);
  const vz = new Float32Array(MAX);
  let cursor = 0;
  let trauma = 0;
  let flash = 0;
  const reduced =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function spawn(n: number, x: number, y: number, z: number, r: number, g: number, b: number, speed: number) {
    for (let i = 0; i < n; i++) {
      const k = cursor++ % MAX;
      pos[k * 3] = x;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = z;
      col[k * 3] = r;
      col[k * 3 + 1] = g;
      col[k * 3 + 2] = b;
      life[k] = 0.35 + Math.random() * 0.45;
      const a = Math.random() * Math.PI * 2;
      const p = Math.random() * speed;
      vx[k] = Math.cos(a) * p;
      vy[k] = Math.random() * speed * 0.8;
      vz[k] = Math.sin(a) * p;
    }
  }

  function addTrauma(v: number) {
    if (reduced) return;
    trauma = Math.min(1, trauma + v);
  }

  function burst(kind: FxPulse["kind"], mag: number, x: number, y: number, z: number) {
    if (kind === "hit") {
      spawn(18, x, y, z, 0.95, 0.97, 1, 8 + mag * 4);
      addTrauma(0.22 + mag * 0.08);
    } else if (kind === "land") {
      spawn(10, x, 0.08, z, 0.45, 0.55, 0.5, 3);
      addTrauma(0.08);
    } else if (kind === "pad") {
      spawn(12, x, 0.2, z, 0.2, 0.95, 0.9, 4);
    } else if (kind === "goal") {
      spawn(110, x, y, z, mag > 0.5 ? 0.18 : 1, mag > 0.5 ? 0.9 : 0.54, mag > 0.5 ? 0.84 : 0.24, 18);
      addTrauma(0.7);
      flash = 1;
    } else if (kind === "wall") {
      spawn(8, x, y, z, 0.6, 0.8, 0.9, 5);
      addTrauma(0.12);
    } else if (kind === "skid") {
      spawn(6, x, 0.05, z, 0.62, 0.58, 0.5, 1.6 + mag);
    }
  }

  function skidTrail(car: Car) {
    if (!car.onGround) return;
    const nx = -Math.sin(car.yaw);
    const nz = -Math.cos(car.yaw);
    const rx = Math.cos(car.yaw);
    const rz = -Math.sin(car.yaw);
    const along = car.vel.x * nx + car.vel.z * nz;
    const lat = car.vel.x * rx + car.vel.z * rz;
    const slip = car.slip || Math.abs(Math.atan2(lat, Math.max(Math.abs(along), 2.4)));
    if (slip < 0.16 && Math.abs(car.kappa) < 0.12) return;
    const axle = 0.88;
    const halfT = 0.74;
    spawn(1, car.pos.x - nx * axle - rx * halfT, 0.05, car.pos.z - nz * axle - rz * halfT, 0.58, 0.54, 0.48, 1.3 + slip);
    spawn(1, car.pos.x - nx * axle + rx * halfT, 0.05, car.pos.z - nz * axle + rz * halfT, 0.58, 0.54, 0.48, 1.3 + slip);
  }

  function boostTrail(car: Car, accent: THREE.Color) {
    if (!car.boosting) return;
    const bx = -Math.sin(car.yaw);
    const bz = -Math.cos(car.yaw);
    spawn(
      4,
      car.pos.x - bx * 1.5,
      car.pos.y + 0.2,
      car.pos.z - bz * 1.5,
      accent.r,
      accent.g,
      accent.b,
      2.8,
    );
  }

  function ballTrail(x: number, y: number, z: number, spd: number) {
    if (spd < 12) return;
    spawn(1, x, y, z, 0.95, 0.97, 1, 0.6);
  }

  function tick(dt: number) {
    trauma = Math.max(0, trauma - dt * 1.6);
    flash = Math.max(0, flash - dt * 2.4);
    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) {
        pos[i * 3 + 1] = -40;
        continue;
      }
      life[i] -= dt;
      pos[i * 3] += vx[i] * dt;
      pos[i * 3 + 1] += vy[i] * dt;
      pos[i * 3 + 2] += vz[i] * dt;
      vy[i] -= 18 * dt;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  function shakeOffset(out: THREE.Vector3, t: number) {
    const s = trauma * trauma;
    if (s < 0.001) {
      out.set(0, 0, 0);
      return 0;
    }
    out.set(Math.sin(t * 47.1) * s * 0.55, Math.cos(t * 39.3) * s * 0.38, Math.sin(t * 31.7) * s * 0.4);
    return s * 0.018;
  }

  function dispose() {
    scene.remove(points);
    geo.dispose();
    mat.dispose();
  }

  return { burst, boostTrail, skidTrail, ballTrail, tick, shakeOffset, addTrauma, getFlash: () => flash, dispose };
}

export type FxSystem = ReturnType<typeof createFx>;
