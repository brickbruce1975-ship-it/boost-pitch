import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const baseUrl = process.env.BOOST_PITCH_URL || "http://127.0.0.1:8080/";

async function withProbe(run) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(`${baseUrl}?qa=${Date.now()}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.__controlsTest?.stepFor === "function", { timeout: 30000 });
    return await run(page);
  } finally {
    await browser.close();
  }
}

test("Goal Lab starts deterministically and advances after a readable successful attempt", async () => {
  const first = await withProbe(async (page) => page.evaluate(() => {
    const probe = window.__controlsTest;
    const start = probe.setupGoalLabForQa();
    const success = probe.scoreGoalLabForQa();
    probe.stepFor(1.3, { throttle: 0, steer: 0 });
    return { start, success, after: probe.getQaState() };
  }));
  const second = await withProbe(async (page) => page.evaluate(() => {
    const probe = window.__controlsTest;
    probe.setupGoalLabForQa();
    probe.scoreGoalLabForQa();
    probe.stepFor(1.3, { throttle: 0, steer: 0 });
    return probe.getQaState();
  }));

  assert.equal(first.start.practice, "goals");
  assert.equal(first.start.practiceAttempt, 0);
  assert.equal(first.start.practiceResult, "active");
  assert.equal(first.success.practiceResult, "success");
  assert.equal(first.after.practiceAttempt, 1);
  assert.equal(first.after.practiceResult, "active");
  assert.deepEqual(first.after.pos, second.pos, "next drill position should be deterministic");
  assert.deepEqual(first.after.vel, second.vel, "next drill velocity should be deterministic");
});

test("fence grade raises a grounded car smoothly before the rail", async () => {
  const samples = await withProbe(async (page) => page.evaluate(() => {
    const probe = window.__controlsTest;
    probe.setupFenceForQa();
    const rows = [];
    for (let i = 0; i < 12; i++) {
      probe.stepFor(0.1, { throttle: 1, steer: 0 });
      const state = probe.getQaState();
      rows.push({ y: state.pos.y, x: state.pos.x, grounded: state.onGround });
    }
    return rows;
  }));

  assert.ok(samples.some((row) => row.y > 0.7), "car should gain elevation on the fence approach");
  assert.ok(samples.every((row) => row.grounded), "approach must remain on the normal grounded tire path");
  for (let i = 1; i < samples.length; i++) {
    assert.ok(samples[i].y + 1e-5 >= samples[i - 1].y, "approach support height should not chatter downward while climbing");
    assert.ok(samples[i].y - samples[i - 1].y < 1.5, "support height must not vertically snap");
  }
});

test("jumping from the rail preserves forward velocity and exits to air once", async () => {
  const result = await withProbe(async (page) => page.evaluate(() => {
    const probe = window.__controlsTest;
    probe.setupFenceForQa();
    probe.stepFor(1.25, { throttle: 1, steer: 0 });
    const before = probe.getQaState();
    probe.stepFor(1 / 60, { throttle: 1, steer: 0, jump: true, boost: true });
    const exit = probe.getQaState();
    probe.stepFor(0.18, { throttle: 1, steer: 0, jump: false, boost: true });
    const air = probe.getQaState();
    return { before, exit, air };
  }));

  const beforeHorizontal = Math.hypot(result.before.vel.x, result.before.vel.z);
  const exitHorizontal = Math.hypot(result.exit.vel.x, result.exit.vel.z);
  assert.equal(result.exit.onGround, false, "rail jump must hand control to the existing airborne branch");
  assert.ok(result.exit.vel.y > 0, "rail exit must retain the normal jump impulse");
  assert.ok(exitHorizontal > beforeHorizontal * 0.3, "rail exit must conserve meaningful horizontal velocity");
  assert.equal(result.air.onGround, false, "rail exit should not re-contact the face while ascending");
});
