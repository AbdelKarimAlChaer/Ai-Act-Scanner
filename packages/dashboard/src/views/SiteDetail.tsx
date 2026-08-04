import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchSite, screenshotUrl, type SiteDetail as SiteDetailData } from "../api";
import { statusBadgeClass, statusLabel } from "../statusMeta";
import type { Finding, Evidence } from "@ai-act-scanner/shared";

interface ChatbotEvidence {
  checkedUrl?: string;
  widget?: { found: boolean; provider: string | null; evidence: Evidence[] };
  disclosure?: Evidence[];
  error?: string;
}

export function SiteDetail() {
  const { id } = useParams();
  const [site, setSite] = useState<SiteDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchSite(Number(id))
      .then(setSite)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return <p className="text-red-400 mono text-sm">{error}</p>;
  }
  if (!site) {
    return <p className="text-muted">Lade Site…</p>;
  }

  const chatbotFindings = site.findings.filter((f) => f.checkType === "chatbot");

  return (
    <div>
      <Link to="/" className="text-sm text-muted hover:underline">
        ← Übersicht
      </Link>
      <h1 className="text-lg font-semibold mt-2 mono">{site.domain}</h1>
      <p className="text-xs text-muted mono mt-1">
        Site-Status: {site.status} · {site.pages.length} Seite(n) geprüft
      </p>

      <div className="mt-6 space-y-4">
        {chatbotFindings.length === 0 && (
          <p className="text-muted">Noch keine Chatbot-Findings für diese Site.</p>
        )}
        {chatbotFindings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} />
        ))}
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const evidence: ChatbotEvidence = JSON.parse(finding.evidenceJson);
  return (
    <div className="border border-border rounded p-4 bg-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded border ${statusBadgeClass(finding.status)}`}>
            {statusLabel(finding.status)}
          </span>
          {evidence.widget?.provider && (
            <span className="text-xs text-muted mono">{evidence.widget.provider}</span>
          )}
        </div>
        <span className="text-xs text-muted mono">
          {new Date(finding.createdAt).toLocaleString("de-CH")}
        </span>
      </div>

      {evidence.checkedUrl && (
        <p className="text-xs text-muted mono mt-2 break-all">{evidence.checkedUrl}</p>
      )}

      {evidence.error && <p className="text-xs text-red-400 mono mt-2">{evidence.error}</p>}

      {(evidence.widget?.evidence?.length ?? 0) > 0 && (
        <EvidenceList title="Widget-Fundstelle" items={evidence.widget!.evidence} />
      )}
      {(evidence.disclosure?.length ?? 0) > 0 && (
        <EvidenceList title="Disclosure-Fundstelle" items={evidence.disclosure!} />
      )}

      {finding.screenshotPath && (
        <div className="mt-3">
          <img
            src={screenshotUrl(finding.screenshotPath)}
            alt={`Screenshot ${finding.status}`}
            className="max-w-full rounded border border-border"
          />
        </div>
      )}
    </div>
  );
}

function EvidenceList({ title, items }: { title: string; items: Evidence[] }) {
  return (
    <div className="mt-3">
      <p className="text-xs text-muted uppercase tracking-wide">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs mono text-gray-300">
            {item.note}
            {item.selector && <span className="text-muted"> · Selektor: {item.selector}</span>}
            {item.textExcerpt && <span className="text-muted"> — "{item.textExcerpt}"</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
