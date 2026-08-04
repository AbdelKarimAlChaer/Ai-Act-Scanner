import type { Page } from "playwright";
import type { ScanConfig } from "../config/index.js";
import type { RobotsInfo } from "./robots.js";

export async function extractSameOriginLinks(page: Page, origin: string): Promise<string[]> {
  const hrefs: string[] = await page.$$eval("a[href]", (as) =>
    as.map((a) => (a as HTMLAnchorElement).href)
  );
  const seen = new Set<string>();
  const links: string[] = [];
  for (const href of hrefs) {
    try {
      const url = new URL(href);
      url.hash = "";
      if (url.origin !== origin) continue;
      if (/\.(pdf|jpg|jpeg|png|gif|svg|zip|css|js|webp|ico|xml)$/i.test(url.pathname)) continue;
      const normalized = url.toString();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        links.push(normalized);
      }
    } catch {
      // ignore malformed hrefs (mailto:, tel:, javascript:, ...)
    }
  }
  return links;
}

function priorityScore(url: string, patterns: string[]): number {
  const lower = url.toLowerCase();
  for (let i = 0; i < patterns.length; i++) {
    const re = new RegExp(patterns[i], "i");
    if (re.test(lower)) return i;
  }
  return patterns.length;
}

export function prioritizeUrls(homepage: string, links: string[], config: ScanConfig): string[] {
  const unique = Array.from(new Set([homepage, ...links]));
  const scored = unique.map((url, idx) => ({
    url,
    score: url === homepage ? -1 : priorityScore(url, config.pagePriorityPatterns),
    idx,
  }));
  scored.sort((a, b) => a.score - b.score || a.idx - b.idx);
  return scored.slice(0, config.maxPagesPerDomain).map((s) => s.url);
}

export function filterByRobots(urls: string[], robots: RobotsInfo, userAgent: string) {
  const allowed: string[] = [];
  const skipped: string[] = [];
  for (const url of urls) {
    if (robots.isAllowed(url, userAgent)) {
      allowed.push(url);
    } else {
      skipped.push(url);
    }
  }
  return { allowed, skipped };
}
