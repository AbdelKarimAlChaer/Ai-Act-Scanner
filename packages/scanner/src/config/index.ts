import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ScanConfig = z.object({
  userAgent: z.string(),
  requestsPerSecondPerHost: z.number().positive(),
  maxPagesPerDomain: z.number().int().positive(),
  requestTimeoutMs: z.number().int().positive(),
  maxRetries: z.number().int().nonnegative(),
  retryBaseDelayMs: z.number().int().positive(),
  pagePriorityPatterns: z.array(z.string()),
  disclosureKeywords: z.record(z.string(), z.array(z.string())),
});
export type ScanConfig = z.infer<typeof ScanConfig>;

const defaultConfigPath = join(__dirname, "default.config.json");

export function loadConfig(configPath?: string): ScanConfig {
  const path = configPath ?? defaultConfigPath;
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  return ScanConfig.parse(raw);
}

export function flattenKeywords(keywords: Record<string, string[]>): string[] {
  return Object.values(keywords).flat();
}
