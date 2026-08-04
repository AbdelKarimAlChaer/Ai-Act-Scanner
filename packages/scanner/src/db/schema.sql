CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  config_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
);

CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER NOT NULL REFERENCES scans(id),
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  eu_nexus_score REAL,
  error TEXT
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id),
  url TEXT NOT NULL,
  status_code INTEGER,
  fetched_at TEXT NOT NULL,
  title TEXT
);

CREATE TABLE IF NOT EXISTS findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id),
  page_id INTEGER REFERENCES pages(id),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL,
  severity TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  screenshot_path TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id),
  page_id INTEGER REFERENCES pages(id),
  src TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt TEXT,
  status TEXT,
  signals_json TEXT,
  thumbnail_path TEXT
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sites_scan ON sites(scan_id);
CREATE INDEX IF NOT EXISTS idx_pages_site ON pages(site_id);
CREATE INDEX IF NOT EXISTS idx_findings_site ON findings(site_id);
CREATE INDEX IF NOT EXISTS idx_images_site ON images(site_id);
