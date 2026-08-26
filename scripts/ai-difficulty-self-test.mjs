import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const base = process.argv[2] || "http://127.0.0.1:8080/";
const url = `${base}${base.includes("?") ? "&" : "?"}aiqa=${Date.now()}`;
const out = "/home/ubuntu/boost-pitch-ai-balance/ai-difficulty-self-test.json";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const report = await page.evaluate(async () => {
    const sim = await import("/src/game/sim.ts");
    const types = await import("/src/game/types.ts");
    const DT = 1 / 120;
    const idle = { throttle: 0, steer: 0, pitch: 0, boost: false, jump: false };
    const tiers = sim.AI_DIFFICULTIES;
    const key = (w) => {
      const bot = w.cars.find((car) => !car.isPlayer && !car.remote);
      const brain = bot ? w.botBrains[bot.peerId] : null;
      return JSON.stringify({
        t: Number(w.simTime.toFixed(5)), phase: w.phase, score: w.score,
        ball: [w.ball.pos.x, w.ball.pos.y, w.ball.pos.z, w.ball.vel.x, w.ball.vel.y, w.ball.vel.z].map((v) => Number(v.toFixed(5))),
        bot: bot && [bot.pos.x, bot.pos.y, bot.pos.z, bot.yaw, bot.boost, bot.onGround].map((v) => typeof v === "number" ? Number(v.toFixed(5)) : v),
        brain: brain && { mode: brain.mode, active: brain.active, queue: brain.decisionQueue.length, rng: brain.rngState },
      });
    };
    const setupPlay = (tier, seed) => {
      const w = sim.createWorld({ difficulty: tier, aiSeed: seed });
      sim.startMatch(w, undefined, { difficulty: tier, aiSeed: seed });
      w.phase = "play";
      w.phaseT = 4;
      return w;
    };
    const step = (w, seconds, before) => {
      const frames = Math.round(seconds / DT);
      const trace = [];
      for (let i = 0; i < frames; i++) {
        before?.(w, i * DT);
        sim.stepWorld(w, idle, DT);
        trace.push(key(w));
      }
      return trace;
    };
    const angle = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

    const tierReports = [];
    for (const tier of tiers) {
      const t = sim.BOT_TUNING[tier];
      const seed = 0xabc000 + tiers.indexOf(tier) * 97;

      const detA = setupPlay(tier, seed);
      const detB = setupPlay(tier, seed);
      const traceA = step(detA, 3);
      const traceB = step(detB, 3);
      const deterministic = JSON.stringify(traceA) === JSON.stringify(traceB);

      const reaction = setupPlay(tier, seed + 1);
      const rBot = reaction.cars.find((car) => !car.isPlayer && !car.remote);
      reaction.ball.pos = { x: rBot.pos.x + 10, y: 1.55, z: rBot.pos.z - 14 };
      reaction.ball.vel = { x: 0, y: 0, z: 0 };
      let firstAction = null;
      let maxQueue = 0;
      for (let i = 0; i < Math.ceil((t.reactionDelay + t.thinkInterval + 0.6) / DT); i++) {
        sim.stepWorld(reaction, idle, DT);
        const brain = reaction.botBrains[rBot.peerId];
        maxQueue = Math.max(maxQueue, brain.decisionQueue.length);
        const a = brain.active;
        if (firstAction === null && (Math.abs(a.throttle) > 0.01 || Math.abs(a.steer) > 0.01 || a.boost || a.jump)) firstAction = reaction.simTime;
      }
      const reactionLower = t.reactionDelay - 2 * DT;
      const reactionUpper = t.reactionDelay + t.thinkInterval + 4 * DT;
      const reactionPass = firstAction !== null && firstAction >= reactionLower && firstAction <= reactionUpper;
      const queueCap = Math.ceil(t.reactionDelay / t.thinkInterval) + 2;
      const queuePass = maxQueue <= queueCap;

      const budget = setupPlay(tier, seed + 2);
      const bBot = budget.cars.find((car) => !car.isPlayer && !car.remote);
      bBot.boost = 100;
      budget.ball.pos = { x: bBot.pos.x, y: 1.55, z: bBot.pos.z - 38 };
      budget.ball.vel = { x: 0, y: 0, z: 0 };
      let minBoostWhileActive = 100;
      let boostFrames = 0;
      for (let i = 0; i < Math.round(8 / DT); i++) {
        sim.stepWorld(budget, idle, DT);
        const brain = budget.botBrains[bBot.peerId];
        if (brain.active.boost) {
          boostFrames++;
          minBoostWhileActive = Math.min(minBoostWhileActive, bBot.boost);
        }
      }
      const budgetPass = minBoostWhileActive >= t.boostReserve - 0.5;

      const recovery = setupPlay(tier, seed + 3);
      const recBot = recovery.cars.find((car) => !car.isPlayer && !car.remote);
      recBot.pos.x = types.FIELD.halfW - 1.1;
      recBot.pos.z = -types.FIELD.halfL + 3;
      recBot.yaw = 0;
      recovery.ball.pos = { x: 0, y: 1.55, z: -12 };
      recovery.ball.vel = { x: 0, y: 0, z: 0 };
      let recoverAt = null;
      for (let i = 0; i < Math.round(2 / DT); i++) {
        sim.stepWorld(recovery, idle, DT);
        if (recovery.botBrains[recBot.peerId].mode === "recover") { recoverAt = recovery.simTime; break; }
      }
      const recoveryPass = recoverAt !== null && recoverAt <= t.recoveryConfirm + t.thinkInterval + t.reactionDelay + 4 * DT;

      const aerial = setupPlay(tier, seed + 4);
      const aBot = aerial.cars.find((car) => !car.isPlayer && !car.remote);
      const attackSign = aBot.team === 0 ? -1 : 1;
      aerial.ball.pos = { x: aBot.pos.x, y: 4.2, z: aBot.pos.z + attackSign * 4 };
      aerial.ball.vel = { x: 0, y: 0, z: 0 };
      let sawJump = false;
      for (let i = 0; i < Math.round(2 / DT); i++) {
        sim.stepWorld(aerial, idle, DT);
        sawJump ||= aerial.botBrains[aBot.peerId].active.jump;
      }
      const aerialPass = t.aerialEnabled ? sawJump : !sawJump;

      const match = setupPlay(tier, seed + 5);
      const matchTrace = step(match, 30);
      const matchFinite = matchTrace.every((line) => !line.includes("null") && !line.includes("NaN"));
      tierReports.push({
        tier,
        deterministic,
        firstAction,
        reactionWindow: [reactionLower, reactionUpper],
        reactionPass,
        maxQueue,
        queueCap,
        queuePass,
        boostFrames,
        minBoostWhileActive: boostFrames ? minBoostWhileActive : null,
        boostReserve: t.boostReserve,
        budgetPass,
        recoverAt,
        recoveryPass,
        aerialEnabled: t.aerialEnabled,
        sawJump,
        aerialPass,
        matchFinite,
        matchScore: [...match.score],
        matchClock: Number(match.clock.toFixed(3)),
      });
    }

    const monotonic = {
      reaction: tierReports.every((r, i) => i === 0 || r.firstAction <= tierReports[i - 1].firstAction + DT),
      recovery: tierReports.every((r, i) => i === 0 || r.recoverAt <= tierReports[i - 1].recoverAt + DT),
    };
    return {
      generatedAt: new Date().toISOString(),
      engine: "authoritative sim.ts fixed-step scenario runner",
      scenariosPerTier: ["determinism", "reaction_delay", "boost_budget", "wall_recovery", "aerial_eligibility", "30s_match_health"],
      tiers: tierReports,
      monotonic,
      pass: tierReports.every((r) => r.deterministic && r.reactionPass && r.queuePass && r.budgetPass && r.recoveryPass && r.aerialPass && r.matchFinite) && monotonic.reaction && monotonic.recovery,
    };
  });
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  for (const tier of report.tiers) {
    console.log(`${tier.deterministic && tier.reactionPass && tier.queuePass && tier.budgetPass && tier.recoveryPass && tier.aerialPass && tier.matchFinite ? "PASS" : "FAIL"} ai ${tier.tier}`, {
      firstAction: tier.firstAction,
      queue: `${tier.maxQueue}/${tier.queueCap}`,
      recovery: tier.recoverAt,
      jump: tier.sawJump,
      score: tier.matchScore,
    });
  }
  console.log(`${report.pass ? "PASS" : "FAIL"} ai-difficulty`, report.monotonic);
  if (!report.pass) process.exitCode = 1;
} finally {
  await browser.close();
}
