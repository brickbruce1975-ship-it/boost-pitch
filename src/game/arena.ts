import * as THREE from "three";
import { FIELD } from "./types";

function pitchTexture() {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 2048;
  const g = c.getContext("2d")!;
  g.fillStyle = "#072a24";
  g.fillRect(0, 0, 2048, 2048);
  for (let i = 0; i < 32; i++) {
    g.fillStyle = i % 2 ? "#08332b" : "#06241f";
    g.fillRect(0, (i * 2048) / 32, 2048, 2048 / 32);
  }
  g.strokeStyle = "rgba(232,242,246,0.88)";
  g.lineWidth = 10;
  g.strokeRect(90, 90, 1868, 1868);
  g.beginPath();
  g.arc(1024, 1024, 210, 0, Math.PI * 2);
  g.moveTo(90, 1024);
  g.lineTo(1958, 1024);
  g.stroke();
  g.lineWidth = 8;
  g.strokeRect(90, 90, 1868, 320);
  g.strokeRect(90, 1638, 1868, 320);
  g.strokeStyle = "rgba(46,230,214,0.55)";
  g.lineWidth = 6;
  g.strokeRect(90, 90, 1868, 90);
  g.strokeStyle = "rgba(255,138,61,0.55)";
  g.strokeRect(90, 1868, 1868, 90);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 512;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, "#16334c");
  grd.addColorStop(0.45, "#2d647b");
  grd.addColorStop(0.72, "#d47c4a");
  grd.addColorStop(1, "#ffd08a");
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function netGeometry(w: number, h: number, d: number) {
  const pos: number[] = [];
  const cols = 10;
  const rows = 7;
  for (let i = 0; i <= cols; i++) {
    const x = -w / 2 + (i / cols) * w;
    pos.push(x, 0, 0, x, h, -d);
  }
  for (let j = 0; j <= rows; j++) {
    const y = (j / rows) * h;
    const z = -(j / rows) * d;
    pos.push(-w / 2, y, z, w / 2, y, z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return geo;
}

export function makeArena(scene: THREE.Scene) {
  const { halfW, halfL, wallH, goalHalfW, goalH, goalDepth } = FIELD;

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(220, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 2, halfL * 2),
    new THREE.MeshStandardMaterial({ map: pitchTexture(), roughness: 0.82, metalness: 0.04 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const apron = new THREE.Mesh(
    new THREE.RingGeometry(Math.hypot(halfW, halfL) + 2, 88, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a1210, roughness: 0.95 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.04;
  scene.add(apron);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1a3a48,
    transparent: true,
    opacity: 0.28,
    metalness: 0.45,
    roughness: 0.12,
    side: THREE.DoubleSide,
    envMapIntensity: 1.2,
  });
  const sideGeo = new THREE.PlaneGeometry(halfL * 2, wallH);
  for (const x of [-halfW, halfW]) {
    const w = new THREE.Mesh(sideGeo, wallMat);
    w.position.set(x, wallH / 2, 0);
    w.rotation.y = Math.PI / 2;
    scene.add(w);
  }

  const makeEnd = (z: number, cyanSide: boolean) => {
    const left = new THREE.Mesh(new THREE.PlaneGeometry(halfW - goalHalfW, wallH), wallMat);
    left.position.set(-(goalHalfW + (halfW - goalHalfW) / 2), wallH / 2, z);
    const right = new THREE.Mesh(new THREE.PlaneGeometry(halfW - goalHalfW, wallH), wallMat);
    right.position.set(goalHalfW + (halfW - goalHalfW) / 2, wallH / 2, z);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(goalHalfW * 2, wallH - goalH), wallMat);
    top.position.set(0, goalH + (wallH - goalH) / 2, z);
    scene.add(left, right, top);
    const accent = cyanSide ? 0x2ee6d6 : 0xff8a3d;
    const postMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.55,
      metalness: 0.7,
      roughness: 0.2,
    });
    for (const x of [-goalHalfW, goalHalfW]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, goalH, 0.32), postMat);
      post.position.set(x, goalH / 2, z);
      post.castShadow = true;
      scene.add(post);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(goalHalfW * 2, 0.32, 0.32), postMat);
    bar.position.set(0, goalH, z);
    scene.add(bar);
    const net = new THREE.LineSegments(
      netGeometry(goalHalfW * 2, goalH, goalDepth),
      new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.35 }),
    );
    net.position.set(0, 0, z + (cyanSide ? 0.05 : -0.05));
    if (!cyanSide) net.rotation.y = Math.PI;
    scene.add(net);
  };
  makeEnd(halfL, true);
  makeEnd(-halfL, false);

  const circle = new THREE.Mesh(
    new THREE.TorusGeometry(8.6, 0.08, 8, 64),
    new THREE.MeshStandardMaterial({ color: 0xe8f2f6, metalness: 0.3, roughness: 0.4 }),
  );
  circle.rotation.x = Math.PI / 2;
  circle.position.y = 0.04;
  scene.add(circle);

  const concrete = new THREE.MeshStandardMaterial({ color: 0x243b45, roughness: 0.88, metalness: 0.08 });
  const bowlR = halfW + 14;
  for (let row = 0; row < 6; row++) {
    const y = 1.2 + row * 1.55;
    const r = bowlR + row * 2.4;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r + 2.2, r, 1.4, 48, 1, true), concrete);
    ring.position.y = y;
    scene.add(ring);
  }

  const seatGeo = new THREE.BoxGeometry(0.7, 0.22, 0.7);
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x0e1a22, roughness: 0.7 });
  const seats = new THREE.InstancedMesh(seatGeo, seatMat, 2200);
  seats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  let n = 0;
  const color = new THREE.Color();
  seats.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(2200 * 3), 3);
  for (let row = 0; row < 8 && n < 2200; row++) {
    const y = 2.1 + row * 1.35;
    const r = halfW + 9 + row * 2.15;
    const count = 48 + row * 8;
    for (let i = 0; i < count && n < 2200; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r * 1.18;
      if (Math.abs(z) < halfL - 6 && Math.abs(x) < halfW + 4) continue;
      dummy.position.set(x, y, z);
      dummy.lookAt(0, y, 0);
      dummy.updateMatrix();
      seats.setMatrixAt(n, dummy.matrix);
      color.set(z > 0 ? 0x146a66 : 0x6a3a18);
      seats.setColorAt(n, color);
      n++;
    }
  }
  seats.count = n;
  scene.add(seats);

  // Dense, readable spectator layer: instanced bodies and light sticks keep the arena lively
  // without heavyweight models, and the seeded pattern stays stable for browser/Unity captures.
  const crowdCount = 520;
  const crowdBody = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.18, 0.25, 0.9, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a4550, roughness: 0.78, vertexColors: true }),
    crowdCount,
  );
  const crowdHead = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xd8b39b, roughness: 0.92, vertexColors: true }),
    crowdCount,
  );
  const crowdStick = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.11, 0.92, 0.11),
    new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false }),
    crowdCount,
  );
  crowdBody.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(crowdCount * 3), 3);
  crowdHead.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(crowdCount * 3), 3);
  crowdStick.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(crowdCount * 3), 3);
  crowdBody.castShadow = true;
  crowdHead.castShadow = true;
  const crowd = Array.from({ length: crowdCount }, (_, i) => {
    const row = i % 8;
    const count = 64 + row * 10;
    const a = ((i * 37) % count) / count * Math.PI * 2;
    const r = halfW + 10 + row * 2.0;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r * 1.16;
    const y = 2.5 + row * 1.35;
    const color = z > 0 ? 0x27d9d0 : 0xffb45f;
    return { x, y, z, phase: (i * 0.71) % (Math.PI * 2), color };
  });
  const crowdDummy = new THREE.Object3D();
  const crowdColor = new THREE.Color();
  const setCrowdInstance = (i: number, t: number) => {
    const c = crowd[i];
    const wave = 0.06 + Math.max(0, Math.sin(t * 2.4 + c.phase)) * 0.18;
    crowdDummy.position.set(c.x, c.y + wave, c.z);
    crowdDummy.rotation.set(0, Math.atan2(-c.x, -c.z), Math.sin(t * 1.7 + c.phase) * 0.08);
    crowdDummy.scale.set(1, 0.9 + wave * 0.7, 1);
    crowdDummy.updateMatrix();
    crowdBody.setMatrixAt(i, crowdDummy.matrix);
    crowdColor.setHex(c.color);
    crowdBody.setColorAt(i, crowdColor);
    crowdDummy.position.y += 0.57 + wave * 0.2;
    crowdDummy.rotation.z *= 0.45;
    crowdDummy.scale.setScalar(0.9 + wave * 0.25);
    crowdDummy.updateMatrix();
    crowdHead.setMatrixAt(i, crowdDummy.matrix);
    crowdColor.setHex(c.z > 0 ? 0xefd4c2 : 0xdcbca6);
    crowdHead.setColorAt(i, crowdColor);
    crowdDummy.position.y += 0.44 + Math.max(0, Math.sin(t * 3.2 + c.phase)) * 0.15;
    crowdDummy.scale.set(1, 1.7, 1);
    crowdDummy.updateMatrix();
    crowdStick.setMatrixAt(i, crowdDummy.matrix);
    crowdColor.setHex(c.color);
    crowdStick.setColorAt(i, crowdColor);
  };
  for (let i = 0; i < crowd.length; i++) setCrowdInstance(i, 0);
  scene.add(crowdBody, crowdHead, crowdStick);

  const towerMat = new THREE.MeshStandardMaterial({ color: 0x1c242c, metalness: 0.55, roughness: 0.35 });
  for (const [x, z] of [
    [halfW + 6, halfL + 6],
    [-halfW - 6, halfL + 6],
    [halfW + 6, -halfL - 6],
    [-halfW - 6, -halfL - 6],
  ] as const) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 22, 8), towerMat);
    pole.position.set(x, 11, z);
    pole.castShadow = true;
    scene.add(pole);
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.3, 0.9),
      new THREE.MeshStandardMaterial({
        color: 0xfff2d0,
        emissive: 0xffe8b0,
        emissiveIntensity: 2.4,
      }),
    );
    lamp.position.set(x, 21.4, z);
    lamp.lookAt(0, 8, 0);
    scene.add(lamp);
    const spot = new THREE.SpotLight(0xfff4dd, 90, 140, 0.55, 0.45, 1.1);
    spot.position.set(x, 21.2, z);
    spot.target.position.set(0, 0, z * 0.2);
    spot.castShadow = false;
    scene.add(spot, spot.target);
  }

  const truss = new THREE.MeshStandardMaterial({ color: 0x2a3340, metalness: 0.7, roughness: 0.3 });
  for (let i = -3; i <= 3; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 20, 0.35, 0.35), truss);
    beam.position.set(0, wallH + 6, (i / 3) * halfL);
    scene.add(beam);
  }

  const dune = new THREE.Mesh(
    new THREE.SphereGeometry(38, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 1 }),
  );
  dune.position.set(-90, -8, -20);
  dune.scale.set(1.6, 0.45, 1.2);
  scene.add(dune);

  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff4dd,
    transparent: true,
    opacity: 0.045,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const coneGeo = new THREE.ConeGeometry(14, 24, 18, 1, true);
  for (const [x, z] of [
    [halfW + 6, halfL + 6],
    [-halfW - 6, halfL + 6],
    [halfW + 6, -halfL - 6],
    [-halfW - 6, -halfL - 6],
  ] as const) {
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(x * 0.35, 10, z * 0.35);
    cone.lookAt(0, 0, 0);
    cone.rotateX(Math.PI);
    scene.add(cone);
  }

  const coverTex = new THREE.TextureLoader().load("/orbit/orbit-cover.jpg");
  coverTex.colorSpace = THREE.SRGBColorSpace;
  const adMat = new THREE.MeshBasicMaterial({ map: coverTex });
  const adGeo = new THREE.PlaneGeometry(10, 10);
  for (const [x, z, ry] of [
    [halfW + 11.5, 18, -Math.PI / 2],
    [halfW + 11.5, -18, -Math.PI / 2],
    [-halfW - 11.5, 18, Math.PI / 2],
    [-halfW - 11.5, -18, Math.PI / 2],
  ] as const) {
    const ad = new THREE.Mesh(adGeo, adMat);
    ad.position.set(x, 6.5, z);
    ad.rotation.y = ry;
    scene.add(ad);
  }

  const jc = document.createElement("canvas");
  jc.width = 1024;
  jc.height = 256;
  const jg = jc.getContext("2d")!;
  const jumboTex = new THREE.CanvasTexture(jc);
  jumboTex.colorSpace = THREE.SRGBColorSpace;
  const jumboMat = new THREE.MeshBasicMaterial({ map: jumboTex });
  for (const z of [halfL + 16, -halfL - 16]) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(28, 7), jumboMat);
    board.position.set(0, 18, z);
    board.lookAt(0, 14, 0);
    scene.add(board);
  }

  const dustPos = new Float32Array(80 * 3);
  for (let i = 0; i < 80; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 90;
    dustPos[i * 3 + 1] = 1.5 + Math.random() * 16;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  scene.add(
    new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xffc9a0,
        size: 0.18,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    ),
  );

  function paintJumbo(cyan: number, amber: number, clock: string, banner: string) {
    jg.fillStyle = "#071018";
    jg.fillRect(0, 0, 1024, 256);
    jg.fillStyle = "#2ee6d6";
    jg.fillRect(0, 0, 1024, 8);
    jg.fillStyle = "#ff8a3d";
    jg.fillRect(0, 248, 1024, 8);
    jg.fillStyle = "#2ee6d6";
    jg.font = "700 96px Rajdhani, Arial Narrow, sans-serif";
    jg.textAlign = "left";
    jg.fillText(String(cyan), 48, 150);
    jg.fillStyle = "#ff8a3d";
    jg.textAlign = "right";
    jg.fillText(String(amber), 976, 150);
    jg.fillStyle = "#e8f2f6";
    jg.font = "700 42px Rajdhani, Arial Narrow, sans-serif";
    jg.textAlign = "center";
    jg.fillText(clock, 512, 100);
    jg.fillStyle = "#8aa3b0";
    jg.font = "600 28px Rajdhani, Arial Narrow, sans-serif";
    jg.fillText(banner, 512, 200);
    jumboTex.needsUpdate = true;
  }
  paintJumbo(0, 0, "3:00", "BOOST PITCH  ·  THE ORBIT");

  let lastCrowdTick = -Infinity;
  function tick(time: number) {
    if (time - lastCrowdTick < 1 / 30) return;
    lastCrowdTick = time;
    for (let i = 0; i < crowd.length; i++) setCrowdInstance(i, time);
    crowdBody.instanceMatrix.needsUpdate = true;
    crowdHead.instanceMatrix.needsUpdate = true;
    crowdStick.instanceMatrix.needsUpdate = true;
    if (crowdBody.instanceColor) crowdBody.instanceColor.needsUpdate = true;
    if (crowdHead.instanceColor) crowdHead.instanceColor.needsUpdate = true;
    if (crowdStick.instanceColor) crowdStick.instanceColor.needsUpdate = true;
  }

  return { paintJumbo, tick };
}
