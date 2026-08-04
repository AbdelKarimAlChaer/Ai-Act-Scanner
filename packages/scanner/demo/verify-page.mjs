import { chromium } from "playwright";

const url = process.argv[2];
const outPath = process.argv[3];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: outPath, fullPage: false });
await browser.close();
console.log("saved", outPath);
