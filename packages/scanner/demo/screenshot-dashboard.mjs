import { chromium } from "playwright";

const outDir = process.argv[2];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/dashboard-overview.png` });

const firstRow = await page.$("tbody tr td a");
if (firstRow) {
  await firstRow.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/dashboard-site-detail.png`, fullPage: true });
}

await browser.close();
console.log("done");
