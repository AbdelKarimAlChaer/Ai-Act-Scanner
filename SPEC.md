# Claude Code Prompt: AI Act Transparency Scanner

> Alles ab hier in Claude Code einfügen.

---

## Kontext

Ich baue ein Tool, mit dem ich Websites auf Verstösse gegen die Transparenzpflichten von Art. 50 EU AI Act prüfen kann. Die Pflichten gelten seit dem 2. August 2026. Das Tool ist Grundlage für einen Akquise- und Audit-Service: Ich scanne Firmenwebsites, erzeuge einen sachlichen Befundreport und nutze diesen als Gesprächseinstieg.

Zielgruppe der Scans: Schweizer und deutsche KMU, primär Sites mit Chat-Widget und/oder generativen Bildinhalten.

Wichtig: Das Tool erzeugt **Befunde und Kandidaten**, keine Rechtsurteile. Formulierungen im Output müssen entsprechend zurückhaltend sein (siehe Abschnitt "Tonalität").

---

## Was geprüft wird

### Check A: Chatbot-Transparenz (Art. 50 Abs. 1) — Hauptfeature, höchste Priorität

Betreiber von KI-Systemen, die direkt mit Menschen interagieren, müssen die Person darüber informieren, dass sie mit einer KI interagiert, und zwar spätestens bei der ersten Interaktion. Ausnahme: Es ist für eine verständige Person aus dem Kontext offensichtlich.

Der Check läuft zweistufig:

1. **Widget-Erkennung.** Erkenne, ob überhaupt ein Chat-/Assistenz-Widget vorhanden ist. Mindestens diese Anbieter über Netzwerk-Requests, Script-Sources, DOM-Selektoren und globale JS-Objekte erkennen:
   - Intercom, Drift, Crisp, Tidio, Tawk.to, HubSpot Conversations, Zendesk / Zopim, Freshchat, LiveChat, Userlike, Smartsupp, Chatra, Chaport, Olark, Front Chat, Trengo, Brevo Conversations, Landbot, Voiceflow, Botpress, ManyChat, Typebot
   - Zusätzlich generische Heuristik: iframe oder div mit Rollen/Attributen/Klassen, die auf Chat hindeuten (`role="dialog"` plus Textinput plus Send-Button, Klassennamen mit `chat`, `messenger`, `assistant`, `bot`)
   - Custom-LLM-Widgets: Netzwerk-Requests gegen `api.openai.com`, `api.anthropic.com`, `generativelanguage.googleapis.com`, `*.azure.com/openai` aus dem Frontend heraus

2. **Disclosure-Prüfung.** Wenn ein Widget gefunden wurde, prüfe ob eine KI-Offenlegung existiert. Suchorte, in dieser Reihenfolge:
   - Sichtbarer Text im Widget selbst vor oder bei der ersten Nachricht (Launcher-Tooltip, Begrüssungsblase, Header, Platzhaltertext im Eingabefeld)
   - Öffne das Widget, falls möglich (Klick auf Launcher), warte auf die erste Bot-Nachricht, lies den Text
   - Fallback: Seitentext, Datenschutzerklärung, Impressum, AGB

   Matching gegen eine konfigurierbare Keyword-Liste (DE/EN/FR/IT), z.B. `KI`, `künstliche Intelligenz`, `KI-Assistent`, `automatisiert`, `Bot`, `virtueller Assistent`, `AI`, `artificial intelligence`, `chatbot`, `intelligence artificielle`, `assistente virtuale`. Liste muss in einer Config-Datei liegen, nicht hardcodiert.

   **Wichtig für die Bewertung:** Eine Erwähnung ausschliesslich in der Datenschutzerklärung erfüllt "bei der ersten Interaktion" nicht. Das muss im Ergebnis als eigener Status auftauchen (`disclosure_buried`), nicht als "konform".

Ergebnis-Status pro Site: `no_widget`, `disclosed_at_interaction`, `disclosure_buried`, `no_disclosure`, `inconclusive`.

### Check B: EU-Bezug (Vorfilter, hohe Priorität)

Der AI Act wirkt extraterritorial über das Marktortprinzip. Für ein Schweizer KMU ohne EU-Bezug greift Art. 50 nicht. Ohne diesen Filter produziere ich Fehlansprachen. Signale sammeln und zu einem Score aggregieren:

- `hreflang`-Tags mit EU-Locales, vorhandene Sprachversionen (de-DE, fr-FR, it-IT, en-GB ist kein EU-Signal mehr)
- Preisangaben in EUR im Seitentext oder in strukturierten Daten (schema.org `offers.priceCurrency`)
- Versand-/Lieferhinweise in EU-Länder, Länderauswahl im Checkout
- TLDs im Besitz der Firma (.de, .fr, .it, .at, .eu) und Verlinkungen darauf
- Adressen in Impressum/Kontakt/Footer mit EU-Ländern, EU-USt-IdNr.
- Karriereseite mit Standorten in der EU

Output: `eu_nexus_score` 0 bis 100 plus Liste der gefundenen Signale mit Fundstelle. Sites unter einem konfigurierbaren Schwellenwert werden im Dashboard klar als "kein EU-Bezug erkennbar" markiert und standardmässig ausgeblendet.

### Check C: KI-Bilder und Deepfake-Kandidaten (Phase 2, niedrigere Priorität)

Hier ist eine automatische Klassifikation nicht zuverlässig möglich. Das Tool liefert deshalb **Kandidaten für manuelle Sichtung**, nicht Urteile. Bewusst konservativ bauen.

Signale pro Bild:
- **C2PA / Content Credentials**: Manifest im Dateicontainer parsen. Nutze `c2patool` als Subprozess, falls installiert, sonst graceful degradation mit klarem Hinweis im Report. Manifest-Inhalt (erzeugendes Tool, Zeitstempel, Aktionen wie `c2pa.created` vs `c2pa.edited`) extrahieren.
- **XMP / IPTC / EXIF**: Felder wie `Software`, `CreatorTool`, `DigitalSourceType` (IPTC `trainedAlgorithmicMedia` ist das relevante Vokabular), `xmp:CreatorTool`
- **Heuristiken**: Dateinamen-Muster typischer Generatoren, Bildmasse die exakt typischen Generator-Outputs entsprechen (1024x1024, 1792x1024, 1024x1536 etc.), Alt-Texte mit Generator-Namen
- **Deepfake-Relevanz-Vorfilter**: Nur Bilder, die überhaupt in Frage kommen, also fotorealistisch wirkend und mit Personen oder erkennbaren realen Orten. Nutze dafür ein lokales, leichtgewichtiges Verfahren (z.B. Gesichtsdetektion) und markiere klar, dass dies nur ein Vorfilter ist.
- **Sichtbare Kennzeichnung**: Prüfe Alt-Text, `figcaption`, umgebenden Text und Overlay-Text auf Hinweise wie "KI-generiert", "mit KI erstellt", "AI-generated"

Jedes Bild bekommt einen Status: `no_signal`, `ai_signal_no_label`, `ai_signal_labeled`, `metadata_stripped` (Bild wurde offensichtlich durch eine Optimierungspipeline geschickt, Metadaten fehlen, keine Aussage möglich).

**Explizit nicht bauen:** Keine nachträgliche Erzeugung oder Signierung von C2PA-Manifesten. Das ist kryptografisch nur dem erzeugenden Tool möglich und wäre eine Falschaussage über die Provenienz.

---

## Nicht-Ziele

- Keine automatische Reparatur oder Bildersetzung auf fremden Sites
- Keine Aussage "Sie verstossen gegen den AI Act" irgendwo im Code oder Output
- Keine Hochrisiko-Klassifikation nach Annex III (das ist ein anderer Pflichtenkreis und ohnehin auf Dezember 2027 verschoben)
- Kein Login-, Paywall- oder Captcha-Bypass. Wenn eine Site nicht ohne Auth erreichbar ist, Status `inaccessible`.

---

## Tech-Stack

- TypeScript, Node.js 22, ESM
- **Playwright** (Chromium) für das Rendering. Statisches Fetching reicht nicht, weil Chat-Widgets per JS injiziert werden. Netzwerk-Requests über `page.on('request')` mitschneiden.
- **SQLite** via `better-sqlite3` für Persistenz
- **Vite + React + TypeScript** für das Dashboard, Tailwind für Styling
- **Hono** oder Express als schlanker API-Layer zwischen SQLite und Dashboard
- `commander` für die CLI
- `vitest` für Tests
- `sharp` und `exifr` für Bildmetadaten
- `p-queue` für Concurrency-Kontrolle

Monorepo mit npm workspaces: `packages/scanner`, `packages/api`, `packages/dashboard`, `packages/shared` (Typen und Zod-Schemas).

---

## Verhalten beim Crawlen

Das Tool greift auf fremde Server zu. Das muss von Anfang an sauber sein, nicht nachgerüstet:

- `robots.txt` respektieren, inkl. `Crawl-delay`. Bei Disallow: Seite überspringen und im Report als `skipped_by_robots` vermerken.
- Eigener, ehrlicher User-Agent mit Kontakt-URL, konfigurierbar
- Standardmässig maximal 1 Request pro Sekunde pro Host, global konfigurierbare Parallelität über verschiedene Hosts
- Maximal 25 Seiten pro Domain (konfigurierbar), Priorisierung: Startseite, Kontakt, Impressum, Datenschutz, Produkt-/Leistungsseiten, Blog-Übersicht
- Vollständiges Timeout- und Retry-Handling mit exponential backoff
- Kein Formular-Absenden, keine Interaktion ausser dem Öffnen des Chat-Widgets

---

## Datenmodell (SQLite)

```
scans          id, started_at, finished_at, config_json, status
sites          id, scan_id, domain, status, eu_nexus_score, error
pages          id, site_id, url, status_code, fetched_at, title
findings       id, site_id, page_id, check_type, status, severity,
               evidence_json, screenshot_path, created_at
images         id, site_id, page_id, src, width, height, alt,
               status, signals_json, thumbnail_path
notes          id, site_id, body, created_at   (manuelle Notizen aus dem Dashboard)
```

`evidence_json` enthält immer die konkrete Fundstelle: URL, Selektor, gefundener Textausschnitt, Request-URL. Ohne Evidenz kein Finding. Das ist die Grundlage dafür, dass ich einem Kunden gegenüber sagen kann, worauf sich der Befund stützt.

Bei jedem Finding einen **Screenshot** ablegen (Viewport-Ausschnitt des Widgets bzw. des Bildes). Das ist im Kundengespräch mehr wert als jede Tabelle.

---

## CLI

```bash
scanner scan --input domains.txt --config scan.config.json
scanner scan --domain example.ch --verbose
scanner report --site example.ch --format md|json|pdf
scanner serve            # startet API + Dashboard
scanner export --scan <id> --format csv
```

`domains.txt`: eine Domain pro Zeile, Kommentare mit `#`.

---

## Dashboard

Lokal laufend, kein Deployment nötig. Vier Views:

1. **Übersicht.** Tabelle aller gescannten Sites. Spalten: Domain, EU-Bezug, Chatbot-Status, Bild-Kandidaten, letzte Prüfung. Sortierbar, filterbar. Zeilenfarbe nach Priorität: Sites mit EU-Bezug **und** `no_disclosure` zuoberst, das sind meine besten Leads.
2. **Site-Detail.** Alle Findings mit Evidenz und Screenshot, EU-Signale mit Fundstelle, Bildergalerie mit Statusfilter, Notizfeld, Statusfeld für den Vertriebsprozess (`neu`, `angeschrieben`, `Gespräch`, `Kunde`, `kein Bedarf`).
3. **Bild-Review.** Kandidaten aus Check C, gross dargestellt, mit den erkannten Signalen daneben und zwei Buttons: "Deepfake-relevant" / "nicht relevant". Meine Einstufung wird gespeichert. Damit sammle ich gleichzeitig Trainingsdaten für spätere Heuristik-Verbesserung.
4. **Statistik.** Über alle Scans: Anteil Sites mit Widget, davon Anteil ohne Disclosure, Verteilung der EU-Scores, Anteil Sites mit KI-Bildsignalen. Das ist meine Marktvalidierung: Wenn die Quote zu tief ist, weiss ich, dass sich der Service nicht lohnt.

Design: nüchtern, dicht, funktional. Kein Marketing-Look. Dunkler Hintergrund, monospace für technische Werte, klare Statusfarben.

---

## Report-Generierung

`scanner report --site X --format md` erzeugt einen Kundenreport. Struktur:

1. Was geprüft wurde und wann, mit Methodenbeschreibung
2. Befunde, sachlich formuliert, jeweils mit Screenshot und Fundstelle
3. Einordnung: welche Norm ist einschlägig, seit wann anwendbar
4. Ausdrücklicher Hinweis: technische Analyse, keine Rechtsberatung, keine abschliessende Konformitätsbewertung
5. Grenzen der Analyse: was das Tool nicht erkennen kann

---

## Tonalität im gesamten Output

Verwende durchgehend Befundsprache, nie Vorwurfssprache.

- Gut: "Chat-Widget (Intercom) erkannt. In der ersten Bot-Nachricht kein Hinweis auf KI-Einsatz gefunden."
- Schlecht: "Verstoss gegen Art. 50. Bussgeld bis 15 Mio. EUR droht."

Keine Bussgeldbeträge, keine Fristen-Drohungen, keine Formulierung, die eine Rechtsbehauptung enthält. Das gilt für Dashboard, CLI-Output und generierte Reports gleichermassen.

---

## Qualität

- Fixture-basierte Tests: Lege unter `packages/scanner/test/fixtures/` mehrere statische HTML-Seiten an, die die Fälle abdecken (Widget mit Disclosure im Launcher, Widget ohne Disclosure, Disclosure nur in der Datenschutzerklärung, kein Widget, Custom-LLM-Widget, EU-Signale vorhanden/fehlend). Playwright gegen einen lokalen Static-Server laufen lassen.
- Jeder Detektor als eigenes Modul mit klarer Schnittstelle `(page, context) => Finding[]`, damit ich neue Detektoren ergänzen kann ohne den Crawler anzufassen.
- Strukturiertes Logging (pino), Log-Level über CLI-Flag
- `README.md` mit Setup, Konfiguration, Detektor-Erweiterung und einem Abschnitt zu den Grenzen des Tools

---

## Reihenfolge der Umsetzung

Bau in dieser Reihenfolge und committe nach jedem Schritt. Wenn der Kontext knapp wird, priorisiere Phase 1 und 2 vollständig statt alles halb.

1. Monorepo-Setup, Schema, Crawler mit robots.txt und Rate-Limiting, CLI-Grundgerüst
2. Check A (Chatbot) vollständig inkl. Widget-Öffnen und Tests
3. Check B (EU-Bezug)
4. API + Dashboard Views 1 und 2
5. Report-Generator (Markdown)
6. Check C (Bilder) und Dashboard Views 3 und 4

Starte damit, mir einen kurzen Umsetzungsplan mit den geplanten Dateien zu zeigen, bevor du schreibst. Wenn eine Anforderung technisch nicht sinnvoll umsetzbar ist, sag es mir statt eine Scheinlösung zu bauen.
