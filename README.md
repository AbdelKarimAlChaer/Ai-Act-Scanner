# AI Act Transparency Scanner

Automatisiertes Tool, um Websites auf Hinweise zur Umsetzung von **Art. 50 Abs. 1 EU AI Act**
(Transparenzpflicht bei KI-Chat-/Assistenzsystemen) zu prüfen. Erzeugt **Befunde und Kandidaten
für manuelle Sichtung**, keine Rechtsurteile — siehe [SPEC.md](./SPEC.md) für den vollständigen
Plan.

Aktueller Stand: **Check A (Chatbot-Transparenz)** ist vollständig umgesetzt, inklusive Crawler,
Widget-/Disclosure-Erkennung, Fixture-Tests, Report-Generator und einem lokalen Dashboard. Check B
(EU-Bezug) und Check C (KI-Bilder) aus der SPEC sind noch nicht gebaut.

## Aufbau (Monorepo, npm workspaces)

```
packages/
  shared/     Zod-Schemas & TypeScript-Typen, von allen anderen Paketen genutzt
  scanner/    Crawler, Detektoren, CLI, SQLite-Persistenz, Report-Generator, Tests
  api/        Schlanker Hono-Server, der die SQLite-DB fürs Dashboard ausliefert
  dashboard/  Vite + React + Tailwind, lokal laufend, kein Deployment nötig
```

## Setup

Voraussetzung: **Node.js 22+** (getestet mit Node 24 unter Windows). Die SQLite-Anbindung nutzt
das eingebaute `node:sqlite`-Modul — es ist absichtlich **kein** `better-sqlite3` im Einsatz, weil
das eine native Kompilierung (Visual Studio Build Tools) voraussetzt, die auf vielen Rechnern nicht
vorhanden ist.

```bash
npm install
npx playwright install chromium
```

### Windows-Hinweis zu `npx tsx`

In manchen Umgebungen ist `npx tsx <script>` instabil (Speicherprobleme durch den zusätzlichen
npx-Wrapper-Prozess parallel zu Chromium). Alle npm-Skripte verwenden deshalb
`node --import tsx <script>` statt `npx tsx` — das ist der empfohlene Weg, die CLI auch manuell
aufzurufen.

## Scan ausführen

```bash
cd packages/scanner
node --import tsx src/cli/index.ts scan --domain example.ch --verbose
# oder mehrere Domains:
node --import tsx src/cli/index.ts scan --input domains.txt --config scan.config.json
```

`domains.txt`: eine Domain pro Zeile, Kommentare mit `#`. Ergebnisse landen in
`packages/scanner/data/scanner.db` (SQLite) plus Screenshots unter
`packages/scanner/data/screenshots/<siteId>/`.

## Kundenreport erzeugen

```bash
node --import tsx src/cli/index.ts report --site example.ch --format md
```

## Dashboard starten

```bash
# Terminal 1
cd packages/api && DB_PATH=<pfad-zur-scanner.db> node --import tsx src/index.ts

# Terminal 2
cd packages/dashboard && npm run dev
```

Dashboard läuft dann auf `http://localhost:5173`, API auf `http://localhost:4000`. Beides läuft
nur lokal, es gibt kein Deployment. Falls der Vite-Dev-Server in speicherknappen Umgebungen
abstürzt, alternativ `npm run build && npm run preview` verwenden (einmaliger Build statt
dauerhaftem Watch-Prozess).

## Konfiguration

`packages/scanner/src/config/default.config.json` — **nicht hardcoded**, per `--config` überschreibbar:

- `userAgent`, `requestsPerSecondPerHost`, `maxPagesPerDomain`, Timeouts/Retries
- `pagePriorityPatterns`: Reihenfolge, in der Seiten einer Domain priorisiert werden
- `disclosureKeywords`: Keyword-Liste nach Sprache (DE/EN/FR/IT) für die Disclosure-Prüfung

## Detektor-Erweiterung

Jeder Check ist ein eigenständiges Modul mit der Signatur

```ts
type Detector = (page: Page, context: DetectorContext) => Promise<DetectorFinding[]>;
```

(siehe `packages/scanner/src/detectors/types.ts`). Der bestehende Chatbot-Check
(`detectors/chatbotCheck.ts`) ist das Referenzbeispiel: Widget-Erkennung
(`widgetDetection.ts` + `providers.ts`) und Disclosure-Prüfung (`disclosure.ts`) sind als separate
Module eingebunden. Ein neuer Detektor (z.B. Check B/C aus der SPEC) wird in
`siteScanner.ts` neben `chatbotCheck` aufgerufen, ohne den Crawler anzufassen.

## Tests

```bash
cd packages/scanner
npm test
```

Fixture-basierte Tests unter `packages/scanner/test/fixtures/` decken die in der SPEC geforderten
Fälle ab: Widget mit Disclosure im Launcher, Widget ohne Disclosure, Disclosure nur im Seitentext
(`disclosure_buried`), kein Widget, Custom-LLM-Widget. Playwright läuft gegen einen lokalen
Static-Server (`test/staticServer.ts`).

## Live-Demo lokal nachvollziehen

`packages/scanner/demo/` enthält eine kleine Beispiel-Site (5 Seiten + `robots.txt`), die alle
fünf Finding-Status durchspielt:

```bash
cd packages/scanner
node demo/server.mjs &                 # Demo-Site auf http://127.0.0.1:8090
node --import tsx src/cli/index.ts scan --domain http://127.0.0.1:8090 --verbose
```

Danach Dashboard wie oben starten und `http://localhost:5173` öffnen.

## Grenzen des Tools

- Chat-Widgets, die erst nach Nutzerinteraktion (Scroll, Timer) nachgeladen werden, können
  verpasst werden.
- Inhalte in Cross-Origin-iFrames sind teilweise nicht auswertbar (Same-Origin-Policy).
- Die Keyword-Suche erkennt nur die konfigurierten Formulierungen; abweichende oder implizite
  Hinweise werden ggf. nicht erkannt.
- Es werden maximal `maxPagesPerDomain` Seiten pro Domain geprüft, nicht die gesamte Site.
- Seiten, die laut `robots.txt` gesperrt sind, werden nicht geprüft (Status `skipped_by_robots`
  auf Page-Ebene).
- Die Befunde sind automatisiert erzeugte Kandidaten, keine Rechtsberatung und keine
  abschliessende Konformitätsbewertung.
- Check B (EU-Bezug) und Check C (KI-Bilder/Deepfakes) aus der SPEC sind noch nicht implementiert;
  ohne Check B fehlt aktuell der Vorfilter auf EU-Relevanz.
