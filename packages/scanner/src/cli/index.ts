#!/usr/bin/env node
import { Command } from "commander";
import { chromium } from "playwright";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { openDb, createScan, finishScan, listSites, getSite } from "../db/index.js";
import { loadConfig } from "../config/index.js";
import { createLogger } from "../logger.js";
import { scanSite, scanSinglePage } from "../siteScanner.js";
import { generateMarkdownReport } from "../report/markdown.js";

const DATA_DIR = join(process.cwd(), "data");
const DB_PATH = join(DATA_DIR, "scanner.db");
const SCREENSHOT_DIR = join(DATA_DIR, "screenshots");

function readDomainsFile(path: string): string[] {
  const raw = readFileSync(path, "utf-8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

const program = new Command();
program.name("scanner").description("AI Act Transparency Scanner CLI");

program
  .command("scan")
  .description("Scan one or more domains for Art. 50 chatbot transparency (Check A)")
  .option("--domain <domain>", "single domain to crawl (up to maxPagesPerDomain), e.g. example.ch")
  .option("--input <file>", "path to a domains.txt file (one domain per line, # comments)")
  .option("--page <url>", "check exactly this one URL, no crawling (e.g. a known support page)")
  .option("--config <file>", "path to a scan config JSON (defaults to built-in config)")
  .option("--verbose", "debug-level logging", false)
  .action(async (opts) => {
    const logger = createLogger(opts.verbose ? "debug" : "info");
    if (!opts.domain && !opts.input && !opts.page) {
      logger.error("Bitte --domain <domain>, --page <url> oder --input <domains.txt> angeben");
      process.exitCode = 1;
      return;
    }

    const domains = opts.domain ? [opts.domain] : opts.input ? readDomainsFile(opts.input) : [];
    if (!opts.page && domains.length === 0) {
      logger.error("Keine Domains gefunden");
      process.exitCode = 1;
      return;
    }

    const config = loadConfig(opts.config);
    const db = openDb(DB_PATH);
    const scanId = createScan(db, JSON.stringify(config));
    logger.info({ scanId, domains, page: opts.page }, "Scan gestartet");

    const browser = await chromium.launch({ headless: true });
    try {
      if (opts.page) {
        try {
          await scanSinglePage(browser, db, scanId, opts.page, config, SCREENSHOT_DIR, logger);
        } catch (err) {
          logger.error({ page: opts.page, err }, "Seiten-Scan fehlgeschlagen");
        }
      }
      for (const domain of domains) {
        try {
          await scanSite(browser, db, scanId, domain, config, SCREENSHOT_DIR, logger);
        } catch (err) {
          logger.error({ domain, err }, "Site-Scan fehlgeschlagen");
        }
      }
      finishScan(db, scanId, "done");
      logger.info({ scanId }, "Scan abgeschlossen");
    } catch (err) {
      finishScan(db, scanId, "error");
      throw err;
    } finally {
      await browser.close();
      db.close();
    }
  });

program
  .command("report")
  .description("Generate a customer-facing findings report for one scanned site")
  .requiredOption("--site <domainOrId>", "domain or numeric site id")
  .option("--format <format>", "md | json | pdf", "md")
  .action(async (opts) => {
    const logger = createLogger("info");
    if (opts.format !== "md") {
      logger.error(`Format '${opts.format}' wird noch nicht unterstützt, nur 'md'`);
      process.exitCode = 1;
      return;
    }
    if (!existsSync(DB_PATH)) {
      logger.error("Keine Scan-Datenbank gefunden, führe zuerst 'scanner scan' aus");
      process.exitCode = 1;
      return;
    }
    const db = openDb(DB_PATH);
    const sites = listSites(db);
    const site =
      sites.find((s) => s.domain === opts.site) ??
      (Number.isNaN(Number(opts.site)) ? undefined : getSite(db, Number(opts.site)));
    if (!site) {
      logger.error({ site: opts.site }, "Site nicht gefunden");
      process.exitCode = 1;
      db.close();
      return;
    }
    const markdown = generateMarkdownReport(db, site);
    process.stdout.write(markdown);
    db.close();
  });

program
  .command("serve")
  .description("Start the API server and the local dashboard")
  .option("--api-port <port>", "API port", "4000")
  .option("--dashboard-port <port>", "Dashboard dev server port", "5173")
  .action(async (opts) => {
    const logger = createLogger("info");
    const apiProc = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
      cwd: join(process.cwd(), "..", "api"),
      env: { ...process.env, PORT: opts.apiPort, DB_PATH, SCREENSHOT_DIR },
      stdio: "inherit",
      shell: false,
    });
    const dashboardProc = spawn(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "dev", "--", "--port", opts.dashboardPort],
      {
        cwd: join(process.cwd(), "..", "dashboard"),
        env: { ...process.env, VITE_API_URL: `http://localhost:${opts.apiPort}` },
        stdio: "inherit",
        shell: false,
      }
    );

    logger.info(
      { api: `http://localhost:${opts.apiPort}`, dashboard: `http://localhost:${opts.dashboardPort}` },
      "API und Dashboard gestartet"
    );

    const shutdown = () => {
      apiProc.kill();
      dashboardProc.kill();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });

program.parseAsync(process.argv);
