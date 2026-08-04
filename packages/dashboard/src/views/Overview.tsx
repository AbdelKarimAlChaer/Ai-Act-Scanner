import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { fetchSites, type SiteListItem } from "../api";
import { statusBadgeClass, statusLabel } from "../statusMeta";
import type { FindingStatus } from "@ai-act-scanner/shared";

const SEVERITY_RANK: Record<string, number> = {
  no_disclosure: 4,
  disclosure_buried: 3,
  inconclusive: 2,
  disclosed_at_interaction: 1,
  no_widget: 0,
};

type SortKey = "priority" | "domain" | "lastCheckedAt";

export function Overview() {
  const [sites, setSites] = useState<SiteListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FindingStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");

  useEffect(() => {
    fetchSites()
      .then((res) => setSites(res.sites))
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!sites) return [];
    let rows = sites;
    if (statusFilter !== "all") {
      rows = rows.filter((s) => s.chatbotStatus === statusFilter);
    }
    const sorted = [...rows].sort((a, b) => {
      if (sortKey === "domain") return a.domain.localeCompare(b.domain);
      if (sortKey === "lastCheckedAt") {
        return (b.lastCheckedAt ?? "").localeCompare(a.lastCheckedAt ?? "");
      }
      const rankA = SEVERITY_RANK[a.chatbotStatus ?? ""] ?? -1;
      const rankB = SEVERITY_RANK[b.chatbotStatus ?? ""] ?? -1;
      return rankB - rankA;
    });
    return sorted;
  }, [sites, statusFilter, sortKey]);

  if (error) {
    return (
      <div className="border border-red-800 bg-red-500/10 text-red-300 rounded p-4 max-w-xl">
        <p className="mono text-sm">{error}</p>
        <p className="text-sm text-muted mt-2">
          Führe zuerst einen Scan aus: <code className="mono">npm run scan -- scan --domain example.ch</code>
        </p>
      </div>
    );
  }

  if (!sites) {
    return <p className="text-muted">Lade Sites…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Übersicht</h1>
        <select
          className="bg-panel border border-border rounded px-2 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FindingStatus | "all")}
        >
          <option value="all">alle Status</option>
          <option value="no_disclosure">keine Disclosure</option>
          <option value="disclosure_buried">Disclosure versteckt</option>
          <option value="disclosed_at_interaction">Disclosure ok</option>
          <option value="no_widget">kein Widget</option>
          <option value="inconclusive">unklar</option>
        </select>
      </div>

      <div className="border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel text-muted text-xs uppercase tracking-wide">
            <tr>
              <Th onClick={() => setSortKey("domain")}>Domain</Th>
              <Th onClick={() => setSortKey("priority")}>Chatbot-Status</Th>
              <th className="text-left px-3 py-2">Site-Status</th>
              <Th onClick={() => setSortKey("lastCheckedAt")}>Letzte Prüfung</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((site) => (
              <tr
                key={site.id}
                className="border-t border-border hover:bg-white/5 cursor-pointer"
              >
                <td className="px-3 py-2">
                  <Link to={`/sites/${site.id}`} className="mono text-gray-100 hover:underline">
                    {site.domain}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded border ${statusBadgeClass(
                      site.chatbotStatus
                    )}`}
                  >
                    {statusLabel(site.chatbotStatus)}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted mono text-xs">{site.status}</td>
                <td className="px-3 py-2 text-muted mono text-xs">
                  {site.lastCheckedAt ? new Date(site.lastCheckedAt).toLocaleString("de-CH") : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted">
                  Keine Sites für diesen Filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <th className="text-left px-3 py-2 cursor-pointer select-none" onClick={onClick}>
      {children}
    </th>
  );
}
