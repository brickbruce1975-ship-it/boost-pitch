import { chromium } from "playwright";

const url = (process.argv[2] || "http://127.0.0.1:8080/") + (process.argv[2]?.includes("?") ? "&" : "?") + "qa=" + Date.now();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /kick off/i }).click();
await page.waitForFunction(
  () => typeof window.__controlsTest?.stepFor === "function" && typeof window.__controlsTest?.resetForQa === "function",
  { timeout: 30000 },
);

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

const fwd = await page.evaluate(() => {
  window.__controlsTest.resetForQa();
  return window.__controlsTest.stepFor(0.55, { throttle: 1, steer: 0 });
});
if (fwd.speed < 4) {
  console.error("FAIL: not moving forward, speed=", fwd.speed);
  process.exit(1);
}

const left = await page.evaluate(() => {
  window.__controlsTest.resetForQa();
  const y0 = window.__controlsTest.stepFor(0.45, { throttle: 1, steer: 0 }).yaw;
  const yA = window.__controlsTest.stepFor(0.5, { throttle: 1, steer: 1 }).yaw;
  return { y0, yA };
});
const dA = wrap(left.yA - left.y0);
if (!(dA > 0.05)) {
  console.error("FAIL: A/left did not increase yaw", { ...left, dA, speed: fwd.speed });
  process.exit(1);
}

const right = await page.evaluate(() => {
  window.__controlsTest.resetForQa();
  const y1 = window.__controlsTest.stepFor(0.45, { throttle: 1, steer: 0 }).yaw;
  const yD = window.__controlsTest.stepFor(0.5, { throttle: 1, steer: -1 }).yaw;
  return { y1, yD };
});
const dD = wrap(right.yD - right.y1);
if (!(dD < -0.05)) {
  console.error("FAIL: D/right did not decrease yaw", { ...right, dD });
  process.exit(1);
}

console.log("PASS controls", { speed: Number(fwd.speed.toFixed(2)), dA: Number(dA.toFixed(3)), dD: Number(dD.toFixed(3)) });

// CAGE Rung 2: clutch LSD vs open — locked should yaw less on power (Posi understeer).
const locked = await page.evaluate(() => {
  window.__controlsTest.resetForQa();
  const r = window.__controlsTest.stepFor(0.5, { throttle: 1, steer: 1, lsdCap: 1 });
  return { yaw: r.yaw, lock: r.lock, speed: r.speed, dW: r.wL - r.wR };
});
const opened = await page.evaluate(() => {
  window.__controlsTest.resetForQa();
  const r = window.__controlsTest.stepFor(0.5, { throttle: 1, steer: 1, lsdCap: 0 });
  return { yaw: r.yaw, lock: r.lock, speed: r.speed, dW: r.wL - r.wR };
});

if (!(locked.lock > 0.5)) {
  console.error("FAIL: Posi did not engage on throttle", locked);
  process.exit(1);
}
if (!(opened.lock < 0.05)) {
  console.error("FAIL: do(lsdCap=0) did not open the clutch", opened);
  process.exit(1);
}
if (!(opened.yaw > locked.yaw * 1.04)) {
  console.error("FAIL: open diff should yaw more than locked on power", { locked, opened });
  process.exit(1);
}
if (!(Math.abs(opened.dW) > Math.abs(locked.dW))) {
  console.error("FAIL: open should allow larger rear Δω", { locked, opened });
  process.exit(1);
}

console.log("PASS lsd", {
  lockedYaw: Number(locked.yaw.toFixed(3)),
  openYaw: Number(opened.yaw.toFixed(3)),
  lock: Number(locked.lock.toFixed(3)),
  dWlock: Number(locked.dW.toFixed(3)),
  dWopen: Number(opened.dW.toFixed(3)),
});
await browser.close();
