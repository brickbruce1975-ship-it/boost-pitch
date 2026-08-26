import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const peerCount = Number(process.argv[3] || 8);
const outDir = process.argv[4] || "/workspace/boost-pitch-performance";
const durationMs = Number(process.argv[5] || 12000);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });
const pages = [];
const errors = [];
try {
  for (let i = 0; i < peerCount; i++) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on("pageerror", (e) => errors.push(`peer-${i}:page:${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`peer-${i}:console:${m.text()}`));
    pages.push(page);
  }
  await Promise.all(pages.map((page) => page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })));
  await Promise.all(pages.map((page) => page.locator("canvas").waitFor({ state: "attached", timeout: 30000 })));
  await pages[0].waitForTimeout(900);
  await pages[0].getByRole("button", { name: /Host room/i }).click();
  await pages[0].getByText("Casual room").waitFor({ state: "visible", timeout: 8000 });
  const hostParagraphs = await pages[0].locator("p").allTextContents();
  const room = hostParagraphs.map((v) => v.trim()).find((v) => /^[A-Z0-9]{5}$/.test(v));
  if (!room) throw new Error("room code not found");
  for (const page of pages.slice(1)) {
    await page.locator('input[placeholder="CODE"]').fill(room);
    await page.getByRole("button", { name: /^Join$/i }).click();
  }
  await pages[0].waitForTimeout(7000);
  let states = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    states = await Promise.all(pages.map(async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ").trim()));
    if (states.some((s) => /You are host/i.test(s) && /KICK OFF/i.test(s))) break;
    await pages[0].waitForTimeout(750);
  }
  const electedHost = pages.findIndex((_, i) => /You are host/i.test(states[i]));
  if (electedHost < 0) throw new Error("no elected host rendered");
  const rosterCounts = states.map((s) => (s.match(/(\d+)\/8/) || [])[1] ? Number((s.match(/(\d+)\/8/) || [])[1]) : 0);
  await pages[electedHost].getByRole("button", { name: /^Kick off$/i }).click();
  await pages[electedHost].waitForTimeout(1200);
  await pages[electedHost].bringToFront();

  const metrics = await Promise.all([pages[electedHost]].map((page) => page.evaluate(async (runDurationMs) => {
    const samples = [];
    let last = performance.now();
    const start = last;
    let longTasks = 0;
    const observer = typeof PerformanceObserver !== "undefined" ? new PerformanceObserver((list) => {
      longTasks += list.getEntries().length;
    }) : null;
    try { observer?.observe({ entryTypes: ["longtask"] }); } catch {}
    await new Promise((resolve) => {
      const tick = (now) => {
        const delta = now - last;
        if (now - start > runDurationMs) return resolve();
        if (delta > 0) samples.push(delta);
        last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    observer?.disconnect();
    samples.sort((a, b) => a - b);
    const avg = samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length);
    const p95 = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))] || 0;
    const over33 = samples.filter((v) => v > 33.34).length;
    const memory = performance.memory ? { usedJSHeapSize: performance.memory.usedJSHeapSize, jsHeapSizeLimit: performance.memory.jsHeapSizeLimit } : null;
    return {
      frames: samples.length,
      avgFrameMs: avg,
      fps: avg > 0 ? 1000 / avg : 0,
      p95FrameMs: p95,
      maxFrameMs: samples.at(-1) || 0,
      over33ms: over33,
      droppedFramePct: samples.length ? (over33 / samples.length) * 100 : 100,
      longTasks,
      memory,
    };
  }, durationMs)));
  await Promise.all(pages.map((page, i) => page.screenshot({ path: `${outDir}/peer-${i + 1}.png` })));
  const result = { ok: errors.length === 0 && rosterCounts.every((v) => v >= 2), url, peerCount, room, electedHost, rosterCounts, errors, metrics };
  writeFileSync(`${outDir}/result.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
} catch (error) {
  const result = { ok: false, url, peerCount, errors, error: String(error?.message || error) };
  writeFileSync(`${outDir}/result.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
