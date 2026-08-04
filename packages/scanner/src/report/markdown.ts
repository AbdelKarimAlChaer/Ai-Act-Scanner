import type { DatabaseSync } from "node:sqlite";
import type { Site, Evidence } from "@ai-act-scanner/shared";
import { getSiteFindings, getSitePages } from "../db/index.js";

const STATUS_TEXT: Record<string, string> = {
  no_widget: "Kein Chat-/Assistenz-Widget auf der geprüften Seite gefunden.",
  disclosed_at_interaction:
    "Chat-Widget erkannt. Ein Hinweis auf den KI-Einsatz war vor oder bei der ersten Nachricht sichtbar.",
  disclosure_buried:
    "Chat-Widget erkannt. Ein Hinweis auf KI wurde ausschliesslich an anderer Stelle im Seitentext gefunden (z.B. Datenschutzerklärung), nicht bei der ersten Interaktion mit dem Widget.",
  no_disclosure:
    "Chat-Widget erkannt. In der ersten Bot-Nachricht sowie im Seitentext kein Hinweis auf den KI-Einsatz gefunden.",
  inconclusive:
    "Prüfung konnte nicht abschliessend durchgeführt werden (technischer Fehler beim Laden oder Auswerten der Seite).",
};

function providerLabel(evidence: unknown): string | null {
  const widget = (evidence as any)?.widget;
  return widget?.provider ?? null;
}

function formatEvidence(evidence: unknown): string {
  const e = evidence as { checkedUrl?: string; disclosure?: Evidence[]; widget?: { evidence?: Evidence[] } };
  const lines: string[] = [];
  if (e.checkedUrl) lines.push(`  - Geprüfte URL: ${e.checkedUrl}`);
  for (const item of e.widget?.evidence ?? []) {
    lines.push(`  - Widget-Fundstelle: ${item.note ?? ""}${item.selector ? ` (Selektor: \`${item.selector}\`)` : ""}`);
  }
  for (const item of e.disclosure ?? []) {
    lines.push(
      `  - Disclosure-Fundstelle: ${item.note ?? ""}${item.textExcerpt ? ` — "${item.textExcerpt}"` : ""}`
    );
  }
  return lines.join("\n");
}

export function generateMarkdownReport(db: DatabaseSync, site: Site): string {
  const findings = getSiteFindings(db, site.id).filter((f) => f.checkType === "chatbot");
  const pages = getSitePages(db, site.id);
  const now = new Date().toISOString().slice(0, 10);

  const lines: string[] = [];
  lines.push(`# Befundreport: ${site.domain}`);
  lines.push("");
  lines.push(`Erstellt am ${now}.`);
  lines.push("");

  lines.push("## 1. Was geprüft wurde");
  lines.push("");
  lines.push(
    "Automatisierter Scan auf Hinweise zur Umsetzung von Art. 50 Abs. 1 EU AI Act (Transparenzpflicht bei KI-gestützten Chat-/Assistenzsystemen). " +
      `Geprüft wurden ${pages.length} Seite(n) der Domain, priorisiert nach Startseite, Kontakt, Impressum, Datenschutz, Produkt-/Leistungsseiten und Blog. ` +
      "Auf jeder Seite wurde automatisiert nach bekannten Chat-Widget-Anbietern sowie generischen Chat-Mustern gesucht; wurde ein Widget gefunden, wurde geprüft, ob ein Hinweis auf den KI-Einsatz vor oder bei der ersten Nachricht sichtbar ist."
  );
  lines.push("");

  lines.push("## 2. Befunde");
  lines.push("");
  if (findings.length === 0) {
    lines.push("Keine Befunde vorhanden — es wurde noch kein vollständiger Scan für diese Site abgeschlossen.");
  }
  for (const finding of findings) {
    const provider = providerLabel(JSON.parse(finding.evidenceJson));
    lines.push(`### ${finding.status}${provider ? ` (${provider})` : ""}`);
    lines.push("");
    lines.push(STATUS_TEXT[finding.status] ?? finding.status);
    lines.push("");
    const evidenceText = formatEvidence(JSON.parse(finding.evidenceJson));
    if (evidenceText) {
      lines.push(evidenceText);
      lines.push("");
    }
    if (finding.screenshotPath) {
      lines.push(`  - Screenshot: \`${finding.screenshotPath}\``);
      lines.push("");
    }
  }

  lines.push("## 3. Einordnung");
  lines.push("");
  lines.push(
    "Massgeblich ist Art. 50 Abs. 1 EU AI Act (Transparenzpflichten für Betreiber von KI-Systemen mit direkter Interaktion mit natürlichen Personen). " +
      "Die Pflicht gilt seit dem 2. August 2026. Ob die Vorschrift auf die geprüfte Site überhaupt anwendbar ist, hängt zusätzlich vom EU-Bezug des Anbieters ab (siehe Check B, falls durchgeführt)."
  );
  lines.push("");

  lines.push("## 4. Hinweis");
  lines.push("");
  lines.push(
    "Dies ist eine technische Analyse auf Basis automatisierter Erkennung, keine Rechtsberatung und keine abschliessende Konformitätsbewertung. " +
      "Die Befunde sind Kandidaten für eine manuelle Prüfung, keine Rechtsurteile."
  );
  lines.push("");

  lines.push("## 5. Grenzen der Analyse");
  lines.push("");
  lines.push(
    "- Chat-Widgets, die erst nach Nutzerinteraktion (z.B. Scroll, Timer) nachgeladen werden, können verpasst werden.\n" +
      "- Inhalte in Cross-Origin-iFrames sind teilweise nicht auswertbar.\n" +
      "- Die Keyword-Suche erkennt nur die konfigurierten Formulierungen; abweichende oder implizite Hinweise werden ggf. nicht erkannt.\n" +
      "- Es wurden maximal die konfigurierten Seiten pro Domain geprüft, nicht die gesamte Site.\n" +
      "- Seiten, die laut robots.txt gesperrt sind, wurden nicht geprüft."
  );

  return lines.join("\n") + "\n";
}
