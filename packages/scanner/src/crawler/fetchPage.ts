import type { BrowserContext, Page } from "playwright";
import type { ScanConfig } from "../config/index.js";
import { getHostQueue } from "./rateLimiter.js";
import type { RobotsInfo } from "./robots.js";
import { dismissConsentBanner } from "./consent.js";

export interface FetchedPage {
  page: Page;
  statusCode: number | null;
  title: string | null;
  requestUrls: string[];
  consentDismissed: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Navigates to `url` through the per-host rate limiter, honoring robots.txt
 * Crawl-delay, with retry + exponential backoff on failure. Returns an open
 * Playwright page (caller is responsible for closing it) plus the network
 * request URLs seen during load, so widget detection can inspect them.
 */
export async function fetchPage(
  context: BrowserContext,
  url: string,
  config: ScanConfig,
  robots: RobotsInfo
): Promise<FetchedPage> {
  const host = new URL(url).host;
  const crawlDelaySec = robots.crawlDelaySeconds(config.userAgent);
  const minIntervalMs = Math.max(
    1000 / config.requestsPerSecondPerHost,
    (crawlDelaySec ?? 0) * 1000
  );
  const queue = getHostQueue(host, minIntervalMs);

  return queue.add(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      const page = await context.newPage();
      const requestUrls: string[] = [];
      page.on("request", (req) => requestUrls.push(req.url()));
      try {
        const response = await page.goto(url, {
          timeout: config.requestTimeoutMs,
          waitUntil: "networkidle",
        });
        const consentDismissed = await dismissConsentBanner(page).catch(() => false);
        if (consentDismissed) {
          await page.waitForTimeout(500);
        }
        const title = await page.title().catch(() => null);
        return {
          page,
          statusCode: response?.status() ?? null,
          title,
          requestUrls,
          consentDismissed,
        };
      } catch (err) {
        lastError = err;
        await page.close().catch(() => {});
        if (attempt < config.maxRetries) {
          await sleep(config.retryBaseDelayMs * 2 ** attempt);
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }) as Promise<FetchedPage>;
}
