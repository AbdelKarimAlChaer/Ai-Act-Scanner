import type { Site, Finding, Page, FindingStatus } from "@ai-act-scanner/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface SiteListItem extends Site {
  chatbotStatus: FindingStatus | null;
  findingCount: number;
  lastCheckedAt: string | null;
}

export interface SiteDetail extends Site {
  findings: Finding[];
  pages: Page[];
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request fehlgeschlagen: ${res.status}`);
  }
  return res.json();
}

export function fetchSites(): Promise<{ sites: SiteListItem[] }> {
  return getJson("/api/sites");
}

export function fetchSite(id: number): Promise<SiteDetail> {
  return getJson(`/api/sites/${id}`);
}

export function screenshotUrl(path: string): string {
  return `${API_URL}/api/screenshot?path=${encodeURIComponent(path)}`;
}
