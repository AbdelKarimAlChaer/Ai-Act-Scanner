import { z } from "zod";

export const FindingStatus = z.enum([
  "no_widget",
  "disclosed_at_interaction",
  "disclosure_buried",
  "no_disclosure",
  "inconclusive",
]);
export type FindingStatus = z.infer<typeof FindingStatus>;

export const CheckType = z.enum(["chatbot", "eu_nexus", "image"]);
export type CheckType = z.infer<typeof CheckType>;

export const Severity = z.enum(["info", "notice", "relevant"]);
export type Severity = z.infer<typeof Severity>;

export const SiteStatus = z.enum([
  "pending",
  "scanning",
  "done",
  "error",
  "inaccessible",
]);
export type SiteStatus = z.infer<typeof SiteStatus>;

export const Evidence = z.object({
  url: z.string(),
  selector: z.string().nullable().optional(),
  textExcerpt: z.string().nullable().optional(),
  requestUrl: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});
export type Evidence = z.infer<typeof Evidence>;

export const Scan = z.object({
  id: z.number(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  configJson: z.string(),
  status: z.enum(["running", "done", "error"]),
});
export type Scan = z.infer<typeof Scan>;

export const Site = z.object({
  id: z.number(),
  scanId: z.number(),
  domain: z.string(),
  status: SiteStatus,
  euNexusScore: z.number().nullable(),
  error: z.string().nullable(),
});
export type Site = z.infer<typeof Site>;

export const Page = z.object({
  id: z.number(),
  siteId: z.number(),
  url: z.string(),
  statusCode: z.number().nullable(),
  fetchedAt: z.string(),
  title: z.string().nullable(),
});
export type Page = z.infer<typeof Page>;

export const Finding = z.object({
  id: z.number(),
  siteId: z.number(),
  pageId: z.number().nullable(),
  checkType: CheckType,
  status: FindingStatus,
  severity: Severity,
  evidenceJson: z.string(),
  screenshotPath: z.string().nullable(),
  createdAt: z.string(),
});
export type Finding = z.infer<typeof Finding>;

export const SiteWithFindings = Site.extend({
  findings: z.array(Finding),
  pages: z.array(Page),
});
export type SiteWithFindings = z.infer<typeof SiteWithFindings>;

export const ChatbotProvider = z.enum([
  "intercom",
  "drift",
  "crisp",
  "tidio",
  "tawkto",
  "hubspot",
  "zendesk",
  "freshchat",
  "livechat",
  "userlike",
  "smartsupp",
  "chatra",
  "chaport",
  "olark",
  "front_chat",
  "trengo",
  "brevo",
  "landbot",
  "voiceflow",
  "botpress",
  "manychat",
  "typebot",
  "generic_heuristic",
  "custom_llm",
]);
export type ChatbotProvider = z.infer<typeof ChatbotProvider>;

export const WidgetDetection = z.object({
  found: z.boolean(),
  provider: ChatbotProvider.nullable(),
  evidence: z.array(Evidence),
});
export type WidgetDetection = z.infer<typeof WidgetDetection>;
