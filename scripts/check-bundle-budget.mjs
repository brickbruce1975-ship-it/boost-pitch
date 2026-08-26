import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const budgets = JSON.parse(await readFile("config/performance-budgets.json", "utf8"));
const assetsDir = ".vercel/output/static/assets";
const assetNames = await readdir(assetsDir);
const clientAssets = assetNames.filter((name) => /\.(?:js|css)$/.test(name));

const measurements = await Promise.all(
  clientAssets.map(async (name) => {
    const bytes = await readFile(join(assetsDir, name));
    return { name, gzipBytes: gzipSync(bytes, { level: 9 }).byteLength };
  }),
);

const routeChunk = measurements.find((asset) => /^routes-.*\.js$/.test(asset.name));
if (!routeChunk) throw new Error("Unable to find the emitted routes JavaScript chunk.");

const totalClientGzipBytes = measurements.reduce((sum, asset) => sum + asset.gzipBytes, 0);
const initialRouteGzipKiB = routeChunk.gzipBytes / 1024;
const totalClientGzipKiB = totalClientGzipBytes / 1024;
const failures = [];

if (initialRouteGzipKiB > budgets.bundle.maxInitialRouteGzipKiB) {
  failures.push(`Initial route gzip ${initialRouteGzipKiB.toFixed(2)} KiB exceeds ${budgets.bundle.maxInitialRouteGzipKiB} KiB.`);
}
if (totalClientGzipKiB > budgets.bundle.maxTotalClientGzipKiB) {
  failures.push(`Total client gzip ${totalClientGzipKiB.toFixed(2)} KiB exceeds ${budgets.bundle.maxTotalClientGzipKiB} KiB.`);
}

console.log(
  JSON.stringify(
    {
      result: failures.length ? "FAIL bundle budget" : "PASS bundle budget",
      initialRoute: { chunk: routeChunk.name, gzipKiB: Number(initialRouteGzipKiB.toFixed(2)) },
      totalClientGzipKiB: Number(totalClientGzipKiB.toFixed(2)),
      budgets: budgets.bundle,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length) throw new Error(failures.join(" "));
