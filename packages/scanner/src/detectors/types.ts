import type { Page } from "playwright";
import type { CheckType, FindingStatus, Severity } from "@ai-act-scanner/shared";
import type { ScanConfig } from "../config/index.js";

export interface DetectorContext {
  url: string;
  requestUrls: string[];
  config: ScanConfig;
  screenshotDir: string;
  siteId: number;
  pageId: number | null;
}

export interface DetectorFinding {
  checkType: CheckType;
  status: FindingStatus;
  severity: Severity;
  evidence: unknown;
  screenshotPath?: string | null;
}

// Every check is a module with this signature, so new detectors (e.g. Check
// B/C) plug in without the crawler orchestration having to know about them.
export type Detector = (page: Page, context: DetectorContext) => Promise<DetectorFinding[]>;
