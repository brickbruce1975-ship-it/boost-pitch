import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const outDir = process.argv[3] || "/workspace/boost-pitch-network";
mkdirSync(outDir, { recursive: true });

const launchArgs = { headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] };
const hostBrowser = await chromium.launch(launchArgs);
const guestBrowser = await chromium.launch(launchArgs);
const host = await hostBrowser.newContext({ viewport: { width: 1280, height: 800 } });
const guest = await guestBrowser.newContext({ viewport: { width: 1280, height: 800 } });
const hostPage = await host.newPage();
const guestPage = await guest.newPage();
const errors = [];
for (const [label, page] of [["host", hostPage], ["guest", guestPage]]) {
  page.on("pageerror", (err) => errors.push(`${label}:pageerror:${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${label}:console:${msg.text()}`);
  });
}

async function text(page) {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
}

try {
  await Promise.all([
    hostPage.goto(url, { waitUntil: "domcontentloaded" }),
    guestPage.goto(url, { waitUntil: "domcontentloaded" }),
  ]);
  await Promise.all([hostPage.waitForTimeout(700), guestPage.waitForTimeout(700)]);

  await hostPage.getByRole("button", { name: /Host room/i }).click();
  await hostPage.getByText("Casual room").waitFor({ state: "visible", timeout: 8000 });
  const hostTexts = await hostPage.locator("p").allTextContents();
  const room = hostTexts.map((v) => v.trim()).find((v) => /^[A-Z0-9]{5}$/.test(v));
  if (!room) throw new Error("host room code was not rendered");

  await guestPage.locator('input[placeholder="CODE"]').fill(room);
  await guestPage.getByRole("button", { name: /^Join$/i }).click();
  await Promise.all([
    hostPage.getByText(/Signaling live|Connecting…/).waitFor({ state: "visible", timeout: 10000 }),
    guestPage.getByText(/Signaling live|Connecting…/).waitFor({ state: "visible", timeout: 10000 }),
  ]);
  await guestPage.getByText("Casual room").waitFor({ state: "visible", timeout: 10000 });
  await guestPage.waitForTimeout(2500);

  const hostRoomText = await text(hostPage);
  const guestRoomText = await text(guestPage);
  const hostSawPeer = /2\/8/.test(hostRoomText) || /Guest|Brick Bruce/.test(hostRoomText);
  const guestSawHost = /2\/8/.test(guestRoomText) || /Brick Bruce/.test(guestRoomText);

  await hostPage.screenshot({ path: `${outDir}/host-before-start.png`, fullPage: false });
  await guestPage.screenshot({ path: `${outDir}/guest-before-start.png`, fullPage: false });
  const hostBeforeStartText = await text(hostPage);
  const guestBeforeStartText = await text(guestPage);
  const electedHostPage = /You are host/i.test(hostBeforeStartText) ? hostPage : guestPage;
  const electedGuestPage = electedHostPage === hostPage ? guestPage : hostPage;
  const hostKickoff = electedHostPage.locator("button").filter({ hasText: /^Kick off$/i }).first();
  await hostKickoff.waitFor({ state: "visible", timeout: 12000 });
  await hostKickoff.click();
  await Promise.all([
    hostPage.waitForTimeout(1200),
    guestPage.waitForTimeout(1200),
  ]);
  const hostAfterStart = await text(electedHostPage);
  const guestAfterStart = await text(electedGuestPage);
  const hostStarted = /KICKOFF SAMPLE|SPEED|PAUSE/i.test(hostAfterStart);
  const guestStarted = /KICKOFF SAMPLE|SPEED|PAUSE/i.test(guestAfterStart);

  await hostPage.screenshot({ path: `${outDir}/host.png`, fullPage: false });
  await guestPage.screenshot({ path: `${outDir}/guest.png`, fullPage: false });
    const result = { ok: errors.length === 0 && hostSawPeer && guestSawHost && hostStarted && guestStarted,
    url,
    room,
    hostSawPeer,
    guestSawHost,
    hostStarted,
    guestStarted,
    hostBeforeStartText,
    guestBeforeStartText,
    errors,
    hostText: hostAfterStart.slice(0, 1200),
    guestText: guestAfterStart.slice(0, 1200),
    screenshots: { host: `${outDir}/host.png`, guest: `${outDir}/guest.png` },
  };
  writeFileSync(`${outDir}/result.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
} catch (err) {
  const result = {
    ok: false,
    url,
    error: String(err?.message || err),
    errors,
    hostText: await text(hostPage).catch(() => ""),
    guestText: await text(guestPage).catch(() => ""),
  };
  writeFileSync(`${outDir}/result.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await Promise.all([hostBrowser.close(), guestBrowser.close()]);
}
