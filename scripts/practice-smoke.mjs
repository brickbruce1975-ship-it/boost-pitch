import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`page:${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console:${m.text()}`));
try {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /Aerial lab/i }).click();
  await page.waitForTimeout(250);
  await page.getByText("Aerial Lab").waitFor({ state: "visible", timeout: 10000 });
  await page.screenshot({ path: "/workspace/boost-pitch-practice/aerial.png" });
  const aerialText = await page.locator("body").innerText();

  await page.goto(`${url}?practice=goal`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /Goal lab/i }).click();
  await page.waitForTimeout(250);
  await page.getByText("Goal Lab").waitFor({ state: "visible", timeout: 10000 });
  await page.screenshot({ path: "/workspace/boost-pitch-practice/goals.png" });
  const goalText = await page.locator("body").innerText();
  const result = {
    ok: errors.length === 0 && /Floating target/i.test(aerialText) && /amber net/i.test(goalText),
    errors,
    aerial: /Aerial Lab/i.test(aerialText) && /Floating target/i.test(aerialText),
    goals: /Goal Lab/i.test(goalText) && /amber net/i.test(goalText),
    aerialText: aerialText.slice(0, 1000),
    goalText: goalText.slice(0, 1000),
  };
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
} finally {
  await browser.close();
}
