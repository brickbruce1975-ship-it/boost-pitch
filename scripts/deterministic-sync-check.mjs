import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:8080/";
const url = `${base}${base.includes("?") ? "&" : "?"}sync=${Date.now()}`;
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const scenarios = [
  ["forward", 0.55, { throttle: 1, steer: 0 }],
  ["posi-locked", 0.5, { throttle: 1, steer: 1, lsdCap: 1 }],
  ["posi-open", 0.5, { throttle: 1, steer: 1, lsdCap: 0 }],
  ["lift-off", 0.55, { throttle: 0, steer: 1 }],
];
try {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.__controlsTest?.stepFor === "function");
  const results = await page.evaluate((cases) => {
    const qa = window.__controlsTest;
    return cases.map(([name, seconds, actions]) => {
      qa.resetForQa();
      const first = qa.stepFor(seconds, actions);
      qa.resetForQa();
      const second = qa.stepFor(seconds, actions);
      return { name, identical: JSON.stringify(first) === JSON.stringify(second), first };
    });
  }, scenarios);
  const pass = results.every((r) => r.identical);
  console.log(JSON.stringify({ url, fixedDt: 1 / 120, pass, scenarios: results }, null, 2));
  process.exitCode = pass ? 0 : 1;
} finally {
  await browser.close();
}
