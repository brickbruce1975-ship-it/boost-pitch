import { readFile } from "node:fs/promises";

const reportPath = process.argv[2];
if (!reportPath) throw new Error("Usage: node scripts/check-lighthouse-budget.mjs <lighthouse-report.json>");

const [budgets, report] = await Promise.all([
  readFile("config/performance-budgets.json", "utf8").then(JSON.parse),
  readFile(reportPath, "utf8").then(JSON.parse),
]);

const readMetric = (auditId) => {
  const value = report.audits?.[auditId]?.numericValue;
  if (!Number.isFinite(value)) throw new Error(`Lighthouse report is missing numeric audit ${auditId}.`);
  return value;
};

const metrics = {
  performanceScore: report.categories?.performance?.score,
  firstContentfulPaintMs: readMetric("first-contentful-paint"),
  largestContentfulPaintMs: readMetric("largest-contentful-paint"),
  cumulativeLayoutShift: readMetric("cumulative-layout-shift"),
  totalByteWeightKiB: readMetric("total-byte-weight") / 1024,
};
if (!Number.isFinite(metrics.performanceScore)) throw new Error("Lighthouse report is missing the performance category score.");

const failures = [];
if (metrics.performanceScore < budgets.lighthouse.minPerformanceScore) {
  failures.push(`Performance score ${metrics.performanceScore.toFixed(2)} is below ${budgets.lighthouse.minPerformanceScore}.`);
}
if (metrics.firstContentfulPaintMs > budgets.lighthouse.maxFirstContentfulPaintMs) {
  failures.push(`FCP ${metrics.firstContentfulPaintMs.toFixed(0)} ms exceeds ${budgets.lighthouse.maxFirstContentfulPaintMs} ms.`);
}
if (metrics.largestContentfulPaintMs > budgets.lighthouse.maxLargestContentfulPaintMs) {
  failures.push(`LCP ${metrics.largestContentfulPaintMs.toFixed(0)} ms exceeds ${budgets.lighthouse.maxLargestContentfulPaintMs} ms.`);
}
if (metrics.cumulativeLayoutShift > budgets.lighthouse.maxCumulativeLayoutShift) {
  failures.push(`CLS ${metrics.cumulativeLayoutShift.toFixed(3)} exceeds ${budgets.lighthouse.maxCumulativeLayoutShift}.`);
}
if (metrics.totalByteWeightKiB > budgets.lighthouse.maxTotalByteWeightKiB) {
  failures.push(`Total transfer ${metrics.totalByteWeightKiB.toFixed(2)} KiB exceeds ${budgets.lighthouse.maxTotalByteWeightKiB} KiB.`);
}

console.log(
  JSON.stringify(
    {
      result: failures.length ? "FAIL Lighthouse budget" : "PASS Lighthouse budget",
      metrics: {
        performanceScore: Number(metrics.performanceScore.toFixed(2)),
        firstContentfulPaintMs: Number(metrics.firstContentfulPaintMs.toFixed(0)),
        largestContentfulPaintMs: Number(metrics.largestContentfulPaintMs.toFixed(0)),
        cumulativeLayoutShift: Number(metrics.cumulativeLayoutShift.toFixed(3)),
        totalByteWeightKiB: Number(metrics.totalByteWeightKiB.toFixed(2)),
      },
      budgets: budgets.lighthouse,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length) throw new Error(failures.join(" "));
