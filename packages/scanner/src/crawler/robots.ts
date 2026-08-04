import robotsParser from "robots-parser";

export interface RobotsInfo {
  isAllowed(url: string, userAgent: string): boolean;
  crawlDelaySeconds(userAgent: string): number | undefined;
}

function allowAllRobots(): RobotsInfo {
  return {
    isAllowed: () => true,
    crawlDelaySeconds: () => undefined,
  };
}

export async function fetchRobots(
  origin: string,
  userAgent: string,
  timeoutMs: number
): Promise<RobotsInfo> {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { "User-Agent": userAgent },
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      return allowAllRobots();
    }
    const body = await res.text();
    const parser = robotsParser(robotsUrl, body);
    return {
      isAllowed(url, ua) {
        return parser.isAllowed(url, ua) !== false;
      },
      crawlDelaySeconds(ua) {
        return parser.getCrawlDelay(ua) ?? undefined;
      },
    };
  } catch {
    // No robots.txt reachable -> treat as allow-all, per common crawler convention.
    return allowAllRobots();
  }
}
