import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, sep } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { openDb, listSites, getSite, getSiteFindings, getSitePages } from "@ai-act-scanner/scanner/db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scannerDataDir = resolve(__dirname, "..", "..", "scanner", "data");

const DB_PATH = process.env.DB_PATH ?? join(scannerDataDir, "scanner.db");
const SCREENSHOT_DIR = resolve(process.env.SCREENSHOT_DIR ?? join(scannerDataDir, "screenshots"));
const PORT = Number(process.env.PORT ?? 4000);

const app = new Hono();
app.use("*", cors());

function withDb<T>(fn: (db: DatabaseSync) => T): T {
  if (!existsSync(DB_PATH)) {
    throw new Error(`Keine Scan-Datenbank unter ${DB_PATH} gefunden. Erst 'scanner scan' ausführen.`);
  }
  const db = openDb(DB_PATH);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

const STATUS_SEVERITY_RANK: Record<string, number> = {
  no_disclosure: 4,
  disclosure_buried: 3,
  inconclusive: 2,
  disclosed_at_interaction: 1,
  no_widget: 0,
};

app.get("/api/sites", (c) => {
  try {
    const sites = withDb((db) => {
      return listSites(db).map((site) => {
        const findings = getSiteFindings(db, site.id).filter((f) => f.checkType === "chatbot");
        const worst = findings.reduce<(typeof findings)[number] | null>((acc, f) => {
          if (!acc) return f;
          return (STATUS_SEVERITY_RANK[f.status] ?? -1) > (STATUS_SEVERITY_RANK[acc.status] ?? -1)
            ? f
            : acc;
        }, null);
        const lastCheckedAt = findings.length
          ? findings.map((f) => f.createdAt).sort().at(-1)
          : null;
        return {
          ...site,
          chatbotStatus: worst?.status ?? null,
          findingCount: findings.length,
          lastCheckedAt,
        };
      });
    });
    return c.json({ sites });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 503);
  }
});

app.get("/api/sites/:id", (c) => {
  const id = Number(c.req.param("id"));
  try {
    const result = withDb((db) => {
      const site = getSite(db, id);
      if (!site) return null;
      return {
        ...site,
        findings: getSiteFindings(db, id),
        pages: getSitePages(db, id),
      };
    });
    if (!result) return c.json({ error: "Site nicht gefunden" }, 404);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 503);
  }
});

// Screenshots are stored as absolute paths on disk; only ever serve files
// that resolve inside SCREENSHOT_DIR to avoid path traversal.
app.get("/api/screenshot", (c) => {
  const rawPath = c.req.query("path");
  if (!rawPath) return c.json({ error: "path fehlt" }, 400);
  const resolved = resolve(rawPath);
  if (!resolved.startsWith(SCREENSHOT_DIR + sep) && resolved !== SCREENSHOT_DIR) {
    return c.json({ error: "Ungültiger Pfad" }, 403);
  }
  if (!existsSync(resolved)) return c.json({ error: "Nicht gefunden" }, 404);
  const body = readFileSync(resolved);
  return new Response(body, { headers: { "Content-Type": "image/png" } });
});

app.get("/api/health", (c) => c.json({ ok: true, dbPath: DB_PATH }));

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`AI Act Scanner API läuft auf http://localhost:${info.port}`);
});
