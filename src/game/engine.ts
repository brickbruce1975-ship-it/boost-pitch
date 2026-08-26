import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
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
  startPractice,
  stepWorld,
  type CarWire,
  type HostWire,
  type World,
} from "./sim";
import { sfx, tickEngine, unlockAudio } from "./audio";
import { makeArena } from "./arena";
import { createFx, type FxPulse } from "./fx";
import { attachNameplate, disposeCar, makeCar, pulseCarLights, spinWheels, squashCar } from "./orbitCar";
import { startAlbum } from "./orbitMusic";

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
  practice: (mode: "aerial" | "goals") => void;
  setIdentity: (peerId: string, name: string, livery: Livery) => void;
  getSnapshot: () => Snapshot;
  subscribe: (fn: (s: Snapshot) => void) => () => void;
  getLocalWire: () => CarWire | null;
  getHostWire: () => HostWire;
};

function ballTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 512, 512);
  grd.addColorStop(0, "#f4f7fb");
  grd.addColorStop(0.5, "#cfd8e0");
  grd.addColorStop(1, "#e8eef3");
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#15181c";
  g.lineWidth = 18;
  g.beginPath();
  g.arc(256, 256, 170, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 14;
  g.beginPath();
  g.moveTo(256, 40);
  g.lineTo(256, 472);
  g.moveTo(40, 256);
  g.lineTo(472, 256);
  g.stroke();
  g.strokeStyle = "#2ee6d6";
  g.lineWidth = 6;
  g.beginPath();
  g.arc(256, 256, 88, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = "#ff8a3d";
  g.beginPath();
  g.arc(256, 256, 210, 0.2, 1.4);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function fmtJumboClock(w: World) {
  if (w.overtime) return "OT";
  const t = Math.max(0, Math.ceil(w.clock));
  return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;
}

function jumboBanner(w: World) {
  if (w.phase === "goal") return w.lastGoal === 0 ? "CYAN GOAL" : "AMBER GOAL";
  if (w.phase === "countdown") return "KICKOFF";
  if (w.phase === "over") return "FINAL";
  if (w.phase === "menu") return "BOOST PITCH  ·  THE ORBIT";
  return "LIVE";
}

export function createEngine(canvas: HTMLCanvasElement, netRef?: { current: NetBridge }): Engine {
  const world: World = createWorld();
  const listeners = new Set<(s: Snapshot) => void>();
  let running = false;
  let qaHold = false;
  let raf = 0;
  let acc = 0;
  let last = 0;
  let prevPhase = world.phase;
  let prevBoost = false;
  let prevJump = false;
  let lastJumbo = "";
  let lastUiEmit = -Infinity;
  const reduced =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const constrained = typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !constrained, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, constrained ? 1.15 : 1.5));
  renderer.setSize(canvas.clientWidth || 1280, canvas.clientHeight || 720, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x496d78, 125, 260);

  const camera = new THREE.PerspectiveCamera(66, 16 / 9, 0.12, 420);
  camera.position.set(0, 18, 42);
  scene.add(camera);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xffe6cf, 0x35616a, 1.05));
  const sun = new THREE.DirectionalLight(0xffe7c9, 1.9);
  sun.position.set(22, 48, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -58;
  sun.shadow.camera.right = 58;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 140;
  sun.shadow.bias = -0.00025;
  scene.add(sun);
  const cyan = new THREE.PointLight(0x2ee6d6, 55, 90);
  cyan.position.set(0, 12, FIELD.halfL);
  const amber = new THREE.PointLight(0xff8a3d, 55, 90);
  amber.position.set(0, 12, -FIELD.halfL);
  scene.add(cyan, amber);

  const arena = makeArena(scene);
  const fx = createFx(scene);
  const carMeshes = Array.from({ length: MAX_CARS }, () => makeCar("cyan"));
  carMeshes.forEach((m) => {
    m.visible = false;
    scene.add(m);
  });

  const ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 48, 32),
    new THREE.MeshPhysicalMaterial({
      map: ballTexture(),
      roughness: 0.28,
      metalness: 0.08,
      clearcoat: 0.55,
      clearcoatRoughness: 0.2,
    }),
  );
  ballMesh.castShadow = true;
  scene.add(ballMesh);

  const blobGeo = new THREE.CircleGeometry(1.1, 20);
  const blobMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const ballBlob = new THREE.Mesh(blobGeo, blobMat);
  ballBlob.rotation.x = -Math.PI / 2;
  ballBlob.position.y = 0.03;
  scene.add(ballBlob);

  const padMeshes = world.pads.map((p) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(p.full ? 1.7 : 1.15, p.full ? 1.7 : 1.15, 0.08, 24),
      new THREE.MeshStandardMaterial({
        color: p.full ? 0xffc14d : 0x5ee6ff,
        emissive: p.full ? 0xaa6a00 : 0x146a72,
        emissiveIntensity: 0.9,
      }),
    );
    m.position.set(p.pos.x, 0.04, p.pos.z);
    scene.add(m);
    return m;
  });

  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });
  const flashMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), flashMat);
  flashMesh.position.z = -0.75;
  flashMesh.frustumCulled = false;
  camera.add(flashMesh);

  const size = new THREE.Vector2();
  renderer.getSize(size);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(size, reduced || constrained ? 0.12 : 0.3, 0.52, 0.72);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const shake = new THREE.Vector3();
  const accentColor = new THREE.Color();
  const detachInput = attachInput();

  function emit(force = true, now = performance.now() / 1000) {
    if (!force && now - lastUiEmit < 1 / 30) return;
    lastUiEmit = now;
    const s = snapshot(world);
    for (const fn of listeners) fn(s);
  }

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 1280;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 720;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
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
          slip: 0,
          kappa: 0,
          fyFilt: 0,
          yawRate: 0,
          wL: 0,
          wR: 0,
          lock: 0,
        });
        car = world.cars[id];
      }
      applyCarWire(car, wire);
      car.remote = true;
      car.isPlayer = false;
    }
    if (net.role === "client" && net.hostWorld) applyHostWire(world, net.hostWorld);
  }

  function consumeFx(pulses: FxPulse[]) {
    for (const p of pulses) {
      fx.burst(p.kind, p.mag, p.x, p.y, p.z);
      if (p.kind === "hit") sfx("kick");
      if (p.kind === "land" && p.mag > 0.35) sfx("land");
      if (p.kind === "pad") sfx("pad");
    }
  }

  function syncVisuals(dt: number, now: number, pulses: FxPulse[]) {
    consumeFx(pulses);
    fx.tick(dt);
    arena.tick(now);

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
        disposeCar(m);
        scene.add(fresh);
        carMeshes[i] = fresh;
      }
      const mesh = carMeshes[i];
      mesh.visible = true;
      mesh.position.set(car.pos.x, car.pos.y, car.pos.z);
      const cy = Math.cos(car.pitch);
      const fxw = -Math.sin(car.yaw) * cy;
      const fy = Math.sin(car.pitch);
      const fzw = -Math.cos(car.yaw) * cy;
      mesh.lookAt(car.pos.x + fxw, car.pos.y + fy, car.pos.z + fzw);
      const prevYaw = Number(mesh.userData.prevYaw) || car.yaw;
      let yawRate = car.yaw - prevYaw;
      while (yawRate > Math.PI) yawRate -= Math.PI * 2;
      while (yawRate < -Math.PI) yawRate += Math.PI * 2;
      mesh.userData.prevYaw = car.yaw;
      const bank = THREE.MathUtils.clamp((-yawRate / Math.max(dt, 1 / 120)) * 0.12, -0.38, 0.38);
      mesh.rotateZ(bank);
      const along = car.vel.x * fxw + car.vel.z * fzw;
      spinWheels(mesh, along, dt);
      const landed = pulses.some(
        (p) => p.kind === "land" && Math.hypot(p.x - car.pos.x, p.z - car.pos.z) < 2.2,
      );
      squashCar(mesh, dt, landed);
      pulseCarLights(mesh, car.boosting);
      if (mesh.userData.plateName !== car.name) {
        attachNameplate(mesh, car.name, car.team === 0 ? 0x2ee6d6 : 0xff8a3d);
      }
      accentColor.setHex(Number(mesh.userData.accent) || 0x2ee6d6);
      fx.boostTrail(car, accentColor);
      fx.skidTrail(car);
    });
    ballMesh.position.set(world.ball.pos.x, world.ball.pos.y, world.ball.pos.z);
    ballMesh.rotation.x += world.ball.vel.z * 0.012;
    ballMesh.rotation.z -= world.ball.vel.x * 0.012;
    const bspd = Math.hypot(world.ball.vel.x, world.ball.vel.y, world.ball.vel.z);
    fx.ballTrail(world.ball.pos.x, world.ball.pos.y, world.ball.pos.z, bspd);
    ballBlob.position.set(world.ball.pos.x, 0.03, world.ball.pos.z);
    ballBlob.scale.setScalar(1.4 + world.ball.pos.y * 0.12);
    blobMat.opacity = THREE.MathUtils.clamp(0.32 - world.ball.pos.y * 0.02, 0.06, 0.32);

    world.pads.forEach((p, i) => {
      padMeshes[i].visible = p.ready <= 0;
      const mat = padMeshes[i].material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.75 + Math.sin(now * 4 + i) * 0.35;
    });

    flashMat.opacity = fx.getFlash() * (reduced ? 0.08 : 0.28);
    flashMat.color.setHex(world.lastGoal === 1 ? 0xff8a3d : 0x2ee6d6);

    const key = `${world.score[0]}:${world.score[1]}:${fmtJumboClock(world)}:${world.phase}`;
    if (key !== lastJumbo) {
      lastJumbo = key;
      arena.paintJumbo(world.score[0], world.score[1], fmtJumboClock(world), jumboBanner(world));
    }

    const p = localCar();
    if (!p) return;

    if (world.phase === "menu") {
      const t = now * 0.11;
      camPos.set(Math.sin(t) * 30, 13, Math.cos(t) * 40);
      look.set(6, 2.2, 0);
    } else if (world.phase === "goal" || world.phase === "over") {
      const t = world.phaseT;
      const ang = t * 0.85;
      camPos.set(world.ball.pos.x + Math.sin(ang) * 13, world.ball.pos.y + 5.2, world.ball.pos.z + Math.cos(ang) * 13);
      look.set(world.ball.pos.x, world.ball.pos.y + 0.4, world.ball.pos.z);
    } else {
      const spd = Math.hypot(p.vel.x, p.vel.z);
      const ff = { x: -Math.sin(p.yaw), z: -Math.cos(p.yaw) };
      const back = 6.35 + Math.min(1.8, spd * 0.045);
      const height = 2.55 + (p.onGround ? 0 : 0.5);
      camPos.set(p.pos.x - ff.x * back, p.pos.y + height, p.pos.z - ff.z * back);
      look.set(p.pos.x + ff.x * (2.4 + spd * 0.04), p.pos.y + 0.72, p.pos.z + ff.z * (2.4 + spd * 0.04));
    }

    const k = world.phase === "menu" ? 2.4 : 7.2;
    const a = 1 - Math.exp(-k * dt);
    camera.position.lerp(camPos, a);
    const roll = fx.shakeOffset(shake, now);
    camera.position.add(shake);
    camera.lookAt(look);
    if (roll) camera.rotateZ(roll);

    const targetFov =
      world.phase === "goal" ? 54 : world.phase === "menu" ? 58 : p.boosting ? 76 : p.onGround ? 66 : 70;
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-8 * dt));
    camera.updateProjectionMatrix();

    tickEngine(Math.hypot(p.vel.x, p.vel.y, p.vel.z), p.boosting);
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
    const gathered: FxPulse[] = [];
    while (acc >= DT) {
      if (qaHold) {
        acc = 0;
        break;
      }
      applyNet();
      const beforeY = me?.vel.y ?? 0;
      const role = netRef?.current?.role ?? "solo";
      if (role === "client") stepWorld(world, actions, DT, { carsOnly: true });
      else stepWorld(world, actions, DT);
      for (const p of world.fx) gathered.push(p);
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
    syncVisuals(dt, now, gathered);
    composer.render();
    emit(false, now);
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
    startAlbum();
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
    const p = localCar();
    if (p) {
      const ff = { x: -Math.sin(p.yaw), z: -Math.cos(p.yaw) };
      camera.position.set(p.pos.x - ff.x * 8.1, p.pos.y + 3.35, p.pos.z - ff.z * 8.1);
      camera.lookAt(p.pos.x + ff.x * 2.6, p.pos.y + 0.85, p.pos.z + ff.z * 2.6);
    }
    emit();
    return world.roster;
  }

  function practice(mode: "aerial" | "goals") {
    unlockAudio();
    const net = netRef?.current;
    const roster = defaultSoloRoster(net?.localName ?? "Brick Bruce", net?.localLivery ?? "brick");
    startPractice(world, mode, roster);
    const p = localCar();
    if (p) {
      const ff = { x: -Math.sin(p.yaw), z: -Math.cos(p.yaw) };
      camera.position.set(p.pos.x - ff.x * 8.1, p.pos.y + 3.35, p.pos.z - ff.z * 8.1);
      camera.lookAt(p.pos.x + ff.x * 2.6, p.pos.y + 0.85, p.pos.z + ff.z * 2.6);
    }
    emit();
  }

  const probe = {
    getYaw: () => world.cars[0].yaw,
    getSpeed: () => Math.hypot(world.cars[0].vel.x, world.cars[0].vel.z),
    getLock: () => world.cars[0].lock,
    getKappa: () => world.cars[0].kappa,
    getWheelDelta: () => world.cars[0].wL - world.cars[0].wR,
    setSteer: (v: number) => setSteerOverride(v),
    setKeys: (codes: string[]) => injectKeys(codes),
    resetForQa: () => {
      acc = 0;
      last = 0;
      const car = world.cars[0];
      car.pos = { x: 0, y: 0.42, z: 30 };
      car.vel = { x: 0, y: 0, z: 0 };
      car.yaw = 0;
      car.pitch = 0;
      car.onGround = true;
      car.boost = 100;
      car.slip = 0;
      car.kappa = 0;
      car.fyFilt = 0;
      car.yawRate = 0;
      car.wL = 0;
      car.wR = 0;
      car.lock = 0;
      world.ball.pos = { x: 20, y: 1.55, z: -20 };
      world.ball.vel = { x: 0, y: 0, z: 0 };
      if (world.cars[1]) {
        world.cars[1].pos = { x: -20, y: 0.42, z: -30 };
        world.cars[1].vel = { x: 0, y: 0, z: 0 };
      }
      world.phase = "play";
    },
    stepFor: (seconds: number, extra?: Partial<Actions> & { lsdCap?: number }) => {
      qaHold = true;
      acc = 0;
      try {
        let t = 0;
        let first: Actions | null = null;
        const lsdCap = extra?.lsdCap;
        const acts = extra ? { ...extra } : {};
        delete (acts as { lsdCap?: number }).lsdCap;
        while (t < seconds) {
          const a = { ...readActions(), ...acts };
          if (!first) first = { ...a };
          stepWorld(world, a, DT, lsdCap === undefined ? undefined : { lsdCap });
          t += DT;
        }
        const result = {
          extra: extra ?? null,
          first,
          yaw: world.cars[0].yaw,
          vel: { ...world.cars[0].vel },
          lock: world.cars[0].lock,
          kappa: world.cars[0].kappa,
          wL: world.cars[0].wL,
          wR: world.cars[0].wR,
          speed: Math.hypot(world.cars[0].vel.x, world.cars[0].vel.z),
          phase: world.phase,
        };
        (window as Window & { __stepDebug?: unknown }).__stepDebug = result;
        return result;
      } finally {
        qaHold = false;
        acc = 0;
        last = 0;
      }
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
      fx.dispose();
      composer.dispose();
      env.dispose();
      renderer.dispose();
      if (window.__controlsTest === probe) delete window.__controlsTest;
    },
    play,
    practice,
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
        extra?: {
          throttle?: number;
          steer?: number;
          pitch?: number;
          boost?: boolean;
          jump?: boolean;
          lsdCap?: number;
        },
      ) => {
        yaw: number;
        speed: number;
        lock: number;
        kappa: number;
        wL: number;
        wR: number;
        phase: string;
      };
      getLock?: () => number;
      getKappa?: () => number;
      getWheelDelta?: () => number;
    };
  }
}
