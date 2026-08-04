import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser } from "playwright";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { startStaticServer } from "./staticServer.js";
import { dismissConsentBanner } from "../src/crawler/consent.js";
import { detectWidget } from "../src/detectors/widgetDetection.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let browser: Browser;
let baseUrl: string;
let stopServer: () => void;

beforeAll(async () => {
  const { server, baseUrl: url } = await startStaticServer(join(__dirname, "fixtures"));
  baseUrl = url;
  stopServer = () => server.close();
  browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
  await browser.close();
  stopServer();
});

describe("dismissConsentBanner", () => {
  it("erkennt kein Widget, solange die Cookie-Consent-Fläche das Skript blockiert", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const url = `${baseUrl}/consent-gated-widget.html`;
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const widget = await detectWidget(page, url, []);
    expect(widget.found).toBe(false);

    await context.close();
  });

  it("klickt die Consent-Fläche weg, wodurch das dahinterliegende Widget erkennbar wird", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const url = `${baseUrl}/consent-gated-widget.html`;
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const dismissed = await dismissConsentBanner(page);
    expect(dismissed).toBe(true);

    const widget = await detectWidget(page, url, []);
    expect(widget.found).toBe(true);
    expect(widget.provider).toBe("intercom");

    await context.close();
  });

  it("meldet false, wenn keine Consent-Fläche vorhanden ist", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseUrl}/no-widget.html`, { waitUntil: "domcontentloaded" });

    const dismissed = await dismissConsentBanner(page);
    expect(dismissed).toBe(false);

    await context.close();
  });
});
