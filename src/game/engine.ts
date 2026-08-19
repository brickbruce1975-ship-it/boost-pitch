import * as THREE from "three";
import { DT, FIELD, MAX_CARS, type Livery, type RosterEntry, type Snapshot } from "./types";
import { attachInput, injectKeys, readActions, setSteerOverride } from "./input";
import type { Actions } from "./types";
import {
  applyCarWire,
  applyHostWire,
  assignTeams,
  carToWire,
  createWorld,
  defaultSoloRoster,
  hostWireFrom,
  snapshot,
  startMatch,
  stepWorld,
  type CarWire,
  type HostWire,
  type World,
} from "./sim";
import { sfx, unlockAudio } from "./audio";

export type NetBridge = {
  role: "solo" | "host" | "client";
  localPeerId: string;
  localName: string;
  localLivery: Livery;
  remotes: Record<string, CarWire>;
  hostWorld: HostWire | null;
};

export type Engine = {
  start: () => void;
  stop: () => void;
  dispose: () => void;
  play: (roster?: RosterEntry[]) => RosterEntry[];
  setIdentity: (peerId: string, name: string, livery: Livery) => void;
  getSnapshot: () => Snapshot;
  subscribe: (fn: (s: Snapshot) => void) => () => void;
  getLocalWire: () => CarWire | null;
  getHostWire: () => HostWire;
};

function pitchTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0a3a32";
  g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = "#0c443a";
  for (let i = 0; i < 16; i++) {
    if (i % 2) g.fillRect(0, (i * 1024) / 16, 1024, 1024 / 16);
  }
  g.strokeStyle = "rgba(230,240,245,0.82)";
  g.lineWidth = 6;
  g.strokeRect(48, 48, 928, 928);
  g.beginPath();
  g.arc(512, 512, 110, 0, Math.PI * 2);
  g.moveTo(48, 512);
  g.lineTo(976, 512);
  g.stroke();
  g.strokeRect(48, 48, 928, 170);
  g.strokeRect(48, 806, 928, 170);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ballTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f4f7fb";
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#15181c";
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.arc(40 + (i % 3) * 80, 50 + Math.floor(i / 3) * 110, 22, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function brickTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#8b3a2a";
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = "#c4b4a4";
  for (let row = 0; row < 8; row++) {
    const y = row * 16;
    g.fillRect(0, y + 14, 256, 2);
    const off = row % 2 ? 16 : 0;
    for (let x = off; x < 256; x += 32) g.fillRect(x, y, 2, 16);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const LIVERY_COLOR: Record<Livery, number> = {
  brick: 0x8b3a2a,
  cyan: 0x2ee6d6,
  amber: 0xff8a3d,
  slate: 0x8aa3b0,
};

function makeCar(livery: Livery) {
  const g = new THREE.Group();
  const color = LIVERY_COLOR[livery];
  const bodyMat =
    livery === "brick"
      ? new THREE.MeshStandardMaterial({ map: brickTexture(), metalness: 0.15, roughness: 0.7 })
      : new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.38, 2.15), bodyMat);
  body.position.y = 0.12;
  body.castShadow = true;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.28, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x0b1520, metalness: 0.2, roughness: 0.2 }),
  );
  cabin.position.set(0, 0.38, -0.15);
  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.08, 0.28),
    new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.3 }),
  );
  spoiler.position.set(0, 0.42, 0.95);
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.16, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x11181f, roughness: 0.5 }),
  );
  nose.position.set(0, 0.08, -1.15);
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
  const spots: [number, number, number][] = [
    [-0.58, 0.0, -0.7],
    [0.58, 0.0, -0.7],
    [-0.58, 0.0, 0.72],
    [0.58, 0.0, 0.72],
  ];
  for (const [x, y, z] of spots) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, y, z);
    g.add(w);
  }
  const glow = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.7, 10),
    new THREE.MeshBasicMaterial({ color: 0x7ef6ff, transparent: true, opacity: 0 }),
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.set(0, 0.12, 1.35);
  glow.name = "boostGlow";
  g.add(body, cabin, spoiler, nose, glow);
  g.userData.livery = livery;
  return g;
}

function makeArena(scene: THREE.Scene) {
  const { halfW, halfL, wallH, goalHalfW, goalH } = FIELD;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 2, halfL * 2),
    new THREE.MeshStandardMaterial({ map: pitchTexture(), roughness: 0.85 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x163040,
    transparent: true,
    opacity: 0.38,
    metalness: 0.2,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });
  const sideGeo = new THREE.PlaneGeometry(halfL * 2, wallH);
  for (const x of [-halfW, halfW]) {
    const w = new THREE.Mesh(sideGeo, wallMat);
    w.position.set(x, wallH / 2, 0);
    w.rotation.y = Math.PI / 2;
    scene.add(w);
  }
  const makeEnd = (z: number, sign: number) => {
    const left = new THREE.Mesh(new THREE.PlaneGeometry(halfW - goalHalfW, wallH), wallMat);
    left.position.set(-(goalHalfW + (halfW - goalHalfW) / 2), wallH / 2, z);
    const right = new THREE.Mesh(new THREE.PlaneGeometry(halfW - goalHalfW, wallH), wallMat);
    right.position.set(goalHalfW + (halfW - goalHalfW) / 2, wallH / 2, z);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(goalHalfW * 2, wallH - goalH), wallMat);
    top.position.set(0, goalH + (wallH - goalH) / 2, z);
    scene.add(left, right, top);
    const postMat = new THREE.MeshStandardMaterial({
      color: sign > 0 ? 0x2ee6d6 : 0xff8a3d,
      metalness: 0.6,
      roughness: 0.25,
    });
    for (const x of [-goalHalfW, goalHalfW]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, goalH, 0.28), postMat);
      post.position.set(x, goalH / 2, z);
      post.castShadow = true;
      scene.add(post);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(goalHalfW * 2, 0.28, 0.28), postMat);
    bar.position.set(0, goalH, z);
    scene.add(bar);
  };
  makeEnd(halfL, 1);
  makeEnd(-halfL, -1);

  const standMat = new THREE.MeshStandardMaterial({ color: 0x0a141c, roughness: 0.9 });
  for (const z of [-halfL - 8, halfL + 8]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 16, 10, 10), standMat);
    stand.position.set(0, 4, z + Math.sign(z) * 2);
    scene.add(stand);
  }
}

export function createEngine(canvas: HTMLCanvasElement, netRef?: { current: NetBridge }): Engine {
  const world: World = createWorld();
  const listeners = new Set<(s: Snapshot) => void>();
  let running = false;
  let raf = 0;
  let acc = 0;
  let last = 0;
  let prevPhase = world.phase;
  let prevBoost = false;
  let prevJump = false;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth || 1280, canvas.clientHeight || 720, false);
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071018);
  scene.fog = new THREE.Fog(0x071018, 70, 160);

  const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 300);
  camera.position.set(0, 8, 18);

  scene.add(new THREE.HemisphereLight(0x9ad4ff, 0x1a2a22, 0.55));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.05);
  sun.position.set(18, 42, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const cyan = new THREE.PointLight(0x2ee6d6, 40, 80);
  cyan.position.set(0, 14, FIELD.halfL);
  const amber = new THREE.PointLight(0xff8a3d, 40, 80);
  amber.position.set(0, 14, -FIELD.halfL);
  scene.add(cyan, amber);

  makeArena(scene);
  const carMeshes = Array.from({ length: MAX_CARS }, () => makeCar("cyan"));
  carMeshes.forEach((m) => {
    m.visible = false;
    scene.add(m);
  });

  const ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 32, 24),
    new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.35, metalness: 0.05 }),
  );
  ballMesh.castShadow = true;
  scene.add(ballMesh);

  const padMeshes = world.pads.map((p) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(p.full ? 1.7 : 1.15, p.full ? 1.7 : 1.15, 0.08, 20),
      new THREE.MeshStandardMaterial({
        color: p.full ? 0xffc14d : 0x5ee6ff,
        emissive: p.full ? 0xaa6a00 : 0x146a72,
        emissiveIntensity: 0.8,
      }),
    );
    m.position.set(p.pos.x, 0.04, p.pos.z);
    scene.add(m);
    return m;
  });

  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const detachInput = attachInput();

  function emit() {
    const s = snapshot(world);
    for (const fn of listeners) fn(s);
  }

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 1280;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 720;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement || canvas);

  function localCar() {
    return world.cars.find((c) => c.isPlayer) ?? world.cars[0];
  }

  function applyNet() {
    const net = netRef?.current;
    if (!net || net.role === "solo") return;
    for (const wire of Object.values(net.remotes)) {
      if (wire.peerId === net.localPeerId) continue;
      let car = world.cars.find((c) => c.peerId === wire.peerId);
      if (!car) {
        if (world.cars.length >= MAX_CARS) continue;
        const id = world.cars.length;
        world.cars.push({
          id,
          peerId: wire.peerId,
          team: wire.team,
          isPlayer: false,
          remote: true,
          name: wire.name,
          livery: wire.livery,
          pos: { ...wire.pos },
          vel: { ...wire.vel },
          yaw: wire.yaw,
          pitch: wire.pitch,
          boost: wire.boost,
          onGround: wire.onGround,
          jumpsLeft: 2,
          jumpHeld: false,
          boosting: wire.boosting,
          flipTimer: 0,
        });
        car = world.cars[id];
      }
      applyCarWire(car, wire);
      car.remote = true;
      car.isPlayer = false;
    }
    if (net.role === "client" && net.hostWorld) applyHostWire(world, net.hostWorld);
  }

  function syncVisuals() {
    carMeshes.forEach((m, i) => {
      const car = world.cars[i];
      if (!car) {
        m.visible = false;
        return;
      }
      if (m.userData.livery !== car.livery) {
        const fresh = makeCar(car.livery);
        fresh.position.copy(m.position);
        scene.remove(m);
        scene.add(fresh);
        carMeshes[i] = fresh;
      }
      const mesh = carMeshes[i];
      mesh.visible = true;
      mesh.position.set(car.pos.x, car.pos.y, car.pos.z);
      const cy = Math.cos(car.pitch);
      const fx = -Math.sin(car.yaw) * cy;
      const fy = Math.sin(car.pitch);
      const fz = -Math.cos(car.yaw) * cy;
      mesh.lookAt(car.pos.x + fx, car.pos.y + fy, car.pos.z + fz);
      const glow = mesh.getObjectByName("boostGlow") as THREE.Mesh;
      const mat = glow.material as THREE.MeshBasicMaterial;
      mat.opacity = car.boosting ? 0.85 : 0;
    });
    ballMesh.position.set(world.ball.pos.x, world.ball.pos.y, world.ball.pos.z);
    ballMesh.rotation.x += world.ball.vel.z * 0.01;
    ballMesh.rotation.z -= world.ball.vel.x * 0.01;
    world.pads.forEach((p, i) => {
      padMeshes[i].visible = p.ready <= 0;
    });

    const p = localCar();
    if (!p) return;
    const ff = { x: -Math.sin(p.yaw), z: -Math.cos(p.yaw) };
    camPos.set(p.pos.x - ff.x * 9.4, p.pos.y + 4.1, p.pos.z - ff.z * 9.4);
    camera.position.lerp(camPos, 0.12);
    look.set(p.pos.x + ff.x * 3.2, p.pos.y + 1.15, p.pos.z + ff.z * 3.2);
    camera.lookAt(look);
  }

  function frame(t: number) {
    if (!running) return;
    const now = t / 1000;
    if (!last) last = now;
    let dt = Math.min(0.08, now - last);
    last = now;
    acc += dt;
    const actions = readActions();
    const me = localCar();
    while (acc >= DT) {
      applyNet();
      const beforeY = me?.vel.y ?? 0;
      const role = netRef?.current?.role ?? "solo";
      if (role === "client") stepWorld(world, actions, DT, { carsOnly: true });
      else stepWorld(world, actions, DT);
      acc -= DT;
      if (world.phase === "play" && me) {
        if (actions.jump && !prevJump && me.vel.y > beforeY + 2) sfx("jump");
        if (actions.boost && !prevBoost && me.boost > 1) sfx("boost");
      }
      prevBoost = actions.boost;
      prevJump = actions.jump;
    }
    if (world.phase !== prevPhase) {
      if (world.phase === "countdown") sfx("whistle");
      if (world.phase === "goal" || (world.phase === "over" && world.lastGoal !== null)) sfx("goal");
      prevPhase = world.phase;
    }
    syncVisuals();
    renderer.render(scene, camera);
    emit();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    resize();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function setIdentity(peerId: string, name: string, livery: Livery) {
    const car = localCar();
    if (!car) return;
    car.peerId = peerId;
    car.name = name;
    car.livery = livery;
    emit();
  }

  function play(roster?: RosterEntry[]): RosterEntry[] {
    unlockAudio();
    const net = netRef?.current;
    if (roster) startMatch(world, roster);
    else if (net && net.role !== "solo") {
      const ids = [net.localPeerId, ...Object.keys(net.remotes)].slice(0, MAX_CARS);
      const teams = assignTeams(ids);
      const built: RosterEntry[] = [
        {
          peerId: net.localPeerId,
          name: net.localName,
          livery: net.localLivery,
          team: teams.get(net.localPeerId) ?? 0,
          isLocal: true,
          remote: false,
        },
        ...Object.values(net.remotes)
          .filter((r) => r.peerId !== net.localPeerId)
          .slice(0, MAX_CARS - 1)
          .map((r) => ({
            peerId: r.peerId,
            name: r.name,
            livery: r.livery,
            team: teams.get(r.peerId) ?? r.team,
            isLocal: false,
            remote: true,
          })),
      ];
      startMatch(world, built);
    } else {
      const n = net?.localName ?? "Brick Bruce";
      const lv = net?.localLivery ?? "brick";
      startMatch(world, defaultSoloRoster(n, lv));
    }
    emit();
    return world.roster;
  }

  const probe = {
    getYaw: () => world.cars[0].yaw,
    getSpeed: () => Math.hypot(world.cars[0].vel.x, world.cars[0].vel.z),
    setSteer: (v: number) => setSteerOverride(v),
    setKeys: (codes: string[]) => injectKeys(codes),
    resetForQa: () => {
      const car = world.cars[0];
      car.pos = { x: 0, y: 0.42, z: 30 };
      car.vel = { x: 0, y: 0, z: 0 };
      car.yaw = 0;
      car.pitch = 0;
      car.onGround = true;
      car.boost = 100;
      world.ball.pos = { x: 20, y: 1.55, z: -20 };
      world.ball.vel = { x: 0, y: 0, z: 0 };
      if (world.cars[1]) {
        world.cars[1].pos = { x: -20, y: 0.42, z: -30 };
        world.cars[1].vel = { x: 0, y: 0, z: 0 };
      }
      world.phase = "play";
    },
    stepFor: (seconds: number, extra?: Partial<Actions>) => {
      let t = 0;
      let first: Actions | null = null;
      while (t < seconds) {
        const a = { ...readActions(), ...extra };
        if (!first) first = { ...a };
        stepWorld(world, a, DT);
        t += DT;
      }
      (window as Window & { __stepDebug?: unknown }).__stepDebug = {
        extra: extra ?? null,
        first,
        yaw: world.cars[0].yaw,
        vel: { ...world.cars[0].vel },
        phase: world.phase,
      };
    },
  };
  window.__controlsTest = probe;

  emit();

  return {
    start,
    stop,
    dispose() {
      stop();
      detachInput();
      ro.disconnect();
      renderer.dispose();
      if (window.__controlsTest === probe) delete window.__controlsTest;
    },
    play,
    setIdentity,
    getSnapshot: () => snapshot(world),
    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot(world));
      return () => listeners.delete(fn);
    },
    getLocalWire: () => {
      const c = localCar();
      return c ? carToWire(c) : null;
    },
    getHostWire: () => hostWireFrom(world),
  };
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setSteer?: (v: number) => void;
      setKeys?: (codes: string[]) => void;
      resetForQa?: () => void;
      stepFor?: (
        seconds: number,
        extra?: { throttle?: number; steer?: number; pitch?: number; boost?: boolean; jump?: boolean },
      ) => void;
    };
  }
}
