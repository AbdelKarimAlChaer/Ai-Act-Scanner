import type { Browser } from "playwright";
import type { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { fetchRobots } from "./crawler/robots.js";
import { extractSameOriginLinks, prioritizeUrls, filterByRobots } from "./crawler/discover.js";
import { fetchPage, type FetchedPage } from "./crawler/fetchPage.js";
import { chatbotCheck } from "./detectors/chatbotCheck.js";
import type { ScanConfig } from "./config/index.js";
import type { Logger } from "./logger.js";
import { createSite, updateSiteStatus, createPage, createFinding } from "./db/index.js";

export interface SiteScanResult {
  siteId: number;
  pagesScanned: number;
  pagesSkippedByRobots: number;
}

function toOrigin(domain: string): string {
  const withScheme = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
  return new URL(withScheme).origin;
}

async function processFetchedPage(
  db: DatabaseSync,
  siteId: number,
  fetched: FetchedPage,
  config: ScanConfig,
  screenshotDir: string,
  logger: Logger
): Promise<void> {
  const pageId = createPage(db, siteId, fetched.page.url(), fetched.statusCode, fetched.title);
  if (fetched.consentDismissed) {
    logger.info({ url: fetched.page.url() }, "Cookie-Consent-Banner automatisch geschlossen");
  }
  const findings = await chatbotCheck(fetched.page, {
    url: fetched.page.url(),
    requestUrls: fetched.requestUrls,
    config,
    screenshotDir: join(screenshotDir, String(siteId)),
    siteId,
    pageId,
  });
  for (const finding of findings) {
    createFinding(db, {
      siteId,
      pageId,
      checkType: finding.checkType,
      status: finding.status,
      severity: finding.severity,
      evidence: finding.evidence,
      screenshotPath: finding.screenshotPath ?? null,
    });
    logger.info({ url: fetched.page.url(), status: finding.status }, "Chatbot-Check abgeschlossen");
  }
}

/**
 * Scans exactly one given URL, without crawling/discovering further pages.
 * Useful when the page of interest (e.g. a support page with a chat widget)
 * is known upfront and might not surface within the domain-wide crawl budget.
 */
export async function scanSinglePage(
  browser: Browser,
  db: DatabaseSync,
  scanId: number,
  pageUrl: string,
  config: ScanConfig,
  screenshotDir: string,
  logger: Logger
): Promise<SiteScanResult> {
  const url = new URL(pageUrl);
  const siteId = createSite(db, scanId, url.hostname + url.pathname);
  logger.info({ pageUrl, siteId }, "Starte Einzelseiten-Scan");

  const robots = await fetchRobots(url.origin, config.userAgent, config.requestTimeoutMs);
  if (!robots.isAllowed(pageUrl, config.userAgent)) {
    logger.warn({ pageUrl }, "Seite laut robots.txt gesperrt, wird übersprungen");
    createPage(db, siteId, pageUrl, null, "(skipped_by_robots)");
    updateSiteStatus(db, siteId, "inaccessible", "skipped_by_robots");
    return { siteId, pagesScanned: 0, pagesSkippedByRobots: 1 };
  }

  const context = await browser.newContext({ userAgent: config.userAgent });
  try {
    updateSiteStatus(db, siteId, "scanning");
    const fetched = await fetchPage(context, pageUrl, config, robots);
    await processFetchedPage(db, siteId, fetched, config, screenshotDir, logger);
    await fetched.page.close().catch(() => {});
    updateSiteStatus(db, siteId, "done");
    logger.info({ pageUrl }, "Einzelseiten-Scan abgeschlossen");
    return { siteId, pagesScanned: 1, pagesSkippedByRobots: 0 };
  } catch (err) {
    logger.warn({ pageUrl, err }, "Seite konnte nicht geladen werden");
    updateSiteStatus(db, siteId, "inaccessible", err instanceof Error ? err.message : String(err));
    return { siteId, pagesScanned: 0, pagesSkippedByRobots: 0 };
  } finally {
    await context.close().catch(() => {});
  }
}

export async function scanSite(
  browser: Browser,
  db: DatabaseSync,
  scanId: number,
  domain: string,
  config: ScanConfig,
  screenshotDir: string,
  logger: Logger
): Promise<SiteScanResult> {
  const siteId = createSite(db, scanId, domain);
  const origin = toOrigin(domain);
  logger.info({ domain, siteId }, "Starte Site-Scan");

  const robots = await fetchRobots(origin, config.userAgent, config.requestTimeoutMs);
  const context = await browser.newContext({ userAgent: config.userAgent });

  let pagesScanned = 0;
  let pagesSkippedByRobots = 0;

  try {
    updateSiteStatus(db, siteId, "scanning");

    let homepage: FetchedPage;
    try {
      homepage = await fetchPage(context, origin + "/", config, robots);
    } catch (err) {
      logger.warn({ domain, err }, "Startseite nicht erreichbar");
      updateSiteStatus(db, siteId, "inaccessible", err instanceof Error ? err.message : String(err));
      return { siteId, pagesScanned: 0, pagesSkippedByRobots: 0 };
    }

    const links = await extractSameOriginLinks(homepage.page, origin);
    const candidateUrls = prioritizeUrls(origin + "/", links, config);
    const { allowed, skipped } = filterByRobots(candidateUrls, robots, config.userAgent);
    pagesSkippedByRobots = skipped.length;
    for (const url of skipped) {
      createPage(db, siteId, url, null, "(skipped_by_robots)");
      logger.info({ url }, "Übersprungen wegen robots.txt");
    }

    // Homepage was already fetched to discover links; run the check on it too.
    await processFetchedPage(db, siteId, homepage, config, screenshotDir, logger);
    pagesScanned++;
    await homepage.page.close().catch(() => {});

    const remaining = allowed.filter((u) => u !== origin + "/");
    for (const url of remaining) {
      try {
        const fetched = await fetchPage(context, url, config, robots);
        await processFetchedPage(db, siteId, fetched, config, screenshotDir, logger);
        await fetched.page.close().catch(() => {});
        pagesScanned++;
      } catch (err) {
        logger.warn({ url, err }, "Seite konnte nicht geladen werden, wird übersprungen");
      }
    }

    updateSiteStatus(db, siteId, "done");
    logger.info({ domain, pagesScanned, pagesSkippedByRobots }, "Site-Scan abgeschlossen");
    return { siteId, pagesScanned, pagesSkippedByRobots };
  } finally {
    await context.close().catch(() => {});
  }
}
