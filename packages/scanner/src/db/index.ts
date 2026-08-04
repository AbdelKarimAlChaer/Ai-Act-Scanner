import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, mkdirSync } from "node:fs";
import type {
  Finding,
  FindingStatus,
  CheckType,
  Severity,
  Site,
  SiteStatus,
  Page,
} from "@ai-act-scanner/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function openDb(dbPath: string): DatabaseSync {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  db.exec(schema);
  return db;
}

export function createScan(db: DatabaseSync, configJson: string): number {
  const stmt = db.prepare(
    "INSERT INTO scans (started_at, config_json, status) VALUES (?, ?, 'running')"
  );
  const info = stmt.run(new Date().toISOString(), configJson);
  return Number(info.lastInsertRowid);
}

export function finishScan(db: DatabaseSync, scanId: number, status: "done" | "error") {
  db.prepare("UPDATE scans SET finished_at = ?, status = ? WHERE id = ?").run(
    new Date().toISOString(),
    status,
    scanId
  );
}

export function createSite(db: DatabaseSync, scanId: number, domain: string): number {
  const info = db
    .prepare("INSERT INTO sites (scan_id, domain, status) VALUES (?, ?, 'pending')")
    .run(scanId, domain);
  return Number(info.lastInsertRowid);
}

export function updateSiteStatus(
  db: DatabaseSync,
  siteId: number,
  status: SiteStatus,
  error?: string | null
) {
  db.prepare("UPDATE sites SET status = ?, error = ? WHERE id = ?").run(
    status,
    error ?? null,
    siteId
  );
}

export function updateSiteEuScore(db: DatabaseSync, siteId: number, score: number) {
  db.prepare("UPDATE sites SET eu_nexus_score = ? WHERE id = ?").run(score, siteId);
}

export function createPage(
  db: DatabaseSync,
  siteId: number,
  url: string,
  statusCode: number | null,
  title: string | null
): number {
  const info = db
    .prepare(
      "INSERT INTO pages (site_id, url, status_code, fetched_at, title) VALUES (?, ?, ?, ?, ?)"
    )
    .run(siteId, url, statusCode, new Date().toISOString(), title);
  return Number(info.lastInsertRowid);
}

export function createFinding(
  db: DatabaseSync,
  args: {
    siteId: number;
    pageId: number | null;
    checkType: CheckType;
    status: FindingStatus;
    severity: Severity;
    evidence: unknown;
    screenshotPath?: string | null;
  }
): number {
  const info = db
    .prepare(
      `INSERT INTO findings (site_id, page_id, check_type, status, severity, evidence_json, screenshot_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      args.siteId,
      args.pageId,
      args.checkType,
      args.status,
      args.severity,
      JSON.stringify(args.evidence),
      args.screenshotPath ?? null,
      new Date().toISOString()
    );
  return Number(info.lastInsertRowid);
}

export function listSites(db: DatabaseSync): Site[] {
  const rows = db.prepare("SELECT * FROM sites ORDER BY id DESC").all() as any[];
  return rows.map(rowToSite);
}

export function getSite(db: DatabaseSync, siteId: number): Site | undefined {
  const row = db.prepare("SELECT * FROM sites WHERE id = ?").get(siteId) as any;
  return row ? rowToSite(row) : undefined;
}

export function getSiteFindings(db: DatabaseSync, siteId: number): Finding[] {
  const rows = db
    .prepare("SELECT * FROM findings WHERE site_id = ? ORDER BY id ASC")
    .all(siteId) as any[];
  return rows.map(rowToFinding);
}

export function getSitePages(db: DatabaseSync, siteId: number): Page[] {
  const rows = db.prepare("SELECT * FROM pages WHERE site_id = ? ORDER BY id ASC").all(siteId) as any[];
  return rows.map(rowToPage);
}

function rowToSite(row: any): Site {
  return {
    id: row.id,
    scanId: row.scan_id,
    domain: row.domain,
    status: row.status,
    euNexusScore: row.eu_nexus_score,
    error: row.error,
  };
}

function rowToPage(row: any): Page {
  return {
    id: row.id,
    siteId: row.site_id,
    url: row.url,
    statusCode: row.status_code,
    fetchedAt: row.fetched_at,
    title: row.title,
  };
}

function rowToFinding(row: any): Finding {
  return {
    id: row.id,
    siteId: row.site_id,
    pageId: row.page_id,
    checkType: row.check_type,
    status: row.status,
    severity: row.severity,
    evidenceJson: row.evidence_json,
    screenshotPath: row.screenshot_path,
    createdAt: row.created_at,
  };
}
