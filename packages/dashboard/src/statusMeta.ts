import type { FindingStatus } from "@ai-act-scanner/shared";

export const STATUS_LABEL: Record<FindingStatus, string> = {
  no_widget: "kein Widget",
  disclosed_at_interaction: "Disclosure ok",
  disclosure_buried: "Disclosure versteckt",
  no_disclosure: "keine Disclosure",
  inconclusive: "unklar",
};

export const STATUS_CLASS: Record<FindingStatus, string> = {
  no_widget: "text-muted bg-white/5 border-border",
  disclosed_at_interaction: "text-emerald-400 bg-emerald-500/10 border-emerald-800",
  disclosure_buried: "text-amber-400 bg-amber-500/10 border-amber-800",
  no_disclosure: "text-red-400 bg-red-500/10 border-red-800",
  inconclusive: "text-sky-400 bg-sky-500/10 border-sky-800",
};

export function statusBadgeClass(status: FindingStatus | null): string {
  if (!status) return STATUS_CLASS.no_widget;
  return STATUS_CLASS[status];
}

export function statusLabel(status: FindingStatus | null): string {
  if (!status) return "—";
  return STATUS_LABEL[status];
}
