import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticServer } from "./staticServer.js";
import { chatbotCheck } from "../src/detectors/chatbotCheck.js";
import { loadConfig } from "../src/config/index.js";
import type { DetectorContext } from "../src/detectors/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let browser: Browser;
let baseUrl: string;
let stopServer: () => void;
const config = loadConfig();
const screenshotDir = mkdtempSync(join(tmpdir(), "ai-act-scanner-test-"));

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

async function runCheck(fixture: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requestUrls: string[] = [];
  page.on("request", (req) => requestUrls.push(req.url()));

  const url = `${baseUrl}/${fixture}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);

  const ctx: DetectorContext = {
    url,
    requestUrls,
    config,
    screenshotDir,
    siteId: 1,
    pageId: 1,
  };
  const findings = await chatbotCheck(page, ctx);
  await context.close();
  return findings;
}

describe("chatbotCheck (Check A)", () => {
  it("erkennt Widget mit Disclosure vor/bei erster Nachricht", async () => {
    const findings = await runCheck("widget-disclosed.html");
    expect(findings).toHaveLength(1);
    expect(findings[0].status).toBe("disclosed_at_interaction");
    expect(findings[0].severity).toBe("info");
    expect(findings[0].screenshotPath).toBeTruthy();
  });

  it("erkennt Widget ohne jede Disclosure", async () => {
    const findings = await runCheck("widget-no-disclosure.html");
    expect(findings).toHaveLength(1);
    expect(findings[0].status).toBe("no_disclosure");
    expect(findings[0].severity).toBe("relevant");
  });

  it("erkennt Disclosure, die nur im Seitentext (Datenschutz) steht, als disclosure_buried", async () => {
    const findings = await runCheck("disclosure-buried.html");
    expect(findings).toHaveLength(1);
    expect(findings[0].status).toBe("disclosure_buried");
    expect(findings[0].severity).toBe("notice");
  });

  it("erkennt Seiten ohne jedes Widget als no_widget", async () => {
    const findings = await runCheck("no-widget.html");
    expect(findings).toHaveLength(1);
    expect(findings[0].status).toBe("no_widget");
    expect(findings[0].severity).toBe("info");
  });

  it("erkennt Custom-LLM-Widgets über bekannte LLM-API-Requests", async () => {
    const findings = await runCheck("custom-llm-widget.html");
    expect(findings).toHaveLength(1);
    const evidence = findings[0].evidence as any;
    expect(evidence.widget.provider).toBe("custom_llm");
  });

  it("erkennt einen selbstgebauten Icon-only-Launcher ohne semantisches Button-Element", async () => {
    const findings = await runCheck("icon-only-widget.html");
    expect(findings).toHaveLength(1);
    const evidence = findings[0].evidence as any;
    expect(evidence.widget.provider).toBe("generic_heuristic");
    expect(findings[0].status).toBe("no_disclosure");
  });
});
