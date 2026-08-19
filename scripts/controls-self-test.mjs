import { chromium } from "playwright";

const url = (process.argv[2] || "http://127.0.0.1:8080/") + (process.argv[2]?.includes("?") ? "&" : "?") + "qa=" + Date.now();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => typeof window.__controlsTest?.stepFor === "function" && typeof window.__controlsTest?.resetForQa === "function");
await page.getByRole("button", { name: /kick off/i }).click();

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

await page.evaluate(() => {
  window.__controlsTest.resetForQa();
  window.__controlsTest.stepFor(0.55, { throttle: 1, steer: 0 });
});
const speed = await page.evaluate(() => window.__controlsTest.getSpeed());
if (speed < 4) {
  console.error("FAIL: not moving forward, speed=", speed);
  process.exit(1);
}

const y0 = await page.evaluate(() => window.__controlsTest.getYaw());
await page.evaluate(() => {
  window.__controlsTest.stepFor(0.5, { throttle: 1, steer: 1 });
});
const yA = await page.evaluate(() => window.__controlsTest.getYaw());
const dA = wrap(yA - y0);
if (!(dA > 0.05)) {
  console.error("FAIL: A/left did not increase yaw", { y0, yA, dA, speed });
  process.exit(1);
}

await page.evaluate(() => window.__controlsTest.resetForQa());
await page.evaluate(() => window.__controlsTest.stepFor(0.55, { throttle: 1, steer: 0 }));
const y1 = await page.evaluate(() => window.__controlsTest.getYaw());
await page.evaluate(() => {
  window.__controlsTest.stepFor(0.5, { throttle: 1, steer: -1 });
});
const yD = await page.evaluate(() => window.__controlsTest.getYaw());
const dD = wrap(yD - y1);
if (!(dD < -0.05)) {
  console.error("FAIL: D/right did not decrease yaw", { y1, yD, dD });
  process.exit(1);
}

console.log("PASS controls", { speed: Number(speed.toFixed(2)), dA: Number(dA.toFixed(3)), dD: Number(dD.toFixed(3)) });
await browser.close();
