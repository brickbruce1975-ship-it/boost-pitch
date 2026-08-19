import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:8080/?v=" + Date.now(), { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => typeof window.__controlsTest?.stepFor === "function");
await page.getByRole("button", { name: /kick off/i }).click();
const out = await page.evaluate(() => {
  window.__controlsTest.stepFor(3.05, { throttle: 0, steer: 0 });
  window.__controlsTest.stepFor(0.55, { throttle: 1, steer: 0 });
  const mid = { speed: window.__controlsTest.getSpeed(), yaw: window.__controlsTest.getYaw() };
  window.__controlsTest.stepFor(0.5, { throttle: 1, steer: 1 });
  return { mid, after: window.__stepDebug, yaw: window.__controlsTest.getYaw() };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
