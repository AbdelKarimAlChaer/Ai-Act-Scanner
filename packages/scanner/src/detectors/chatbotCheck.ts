import type { Page } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { detectWidget } from "./widgetDetection.js";
import { checkWidgetDisclosure, checkPageTextDisclosure } from "./disclosure.js";
import { flattenKeywords } from "../config/index.js";
import type { Detector, DetectorContext } from "./types.js";

/**
 * Check A (Art. 50 Abs. 1): detect a chat/assistant widget, then check
 * whether an AI disclosure is visible at or before the first interaction.
 */
export const chatbotCheck: Detector = async (page, ctx) => {
  try {
    const widget = await detectWidget(page, ctx.url, ctx.requestUrls);

    if (!widget.found) {
      return [
        {
          checkType: "chatbot",
          status: "no_widget",
          severity: "info",
          evidence: { widget, checkedUrl: ctx.url },
        },
      ];
    }

    const keywords = flattenKeywords(ctx.config.disclosureKeywords);

    const widgetDisclosure = await checkWidgetDisclosure(page, ctx.url, keywords);
    if (widgetDisclosure.foundAtWidget) {
      return [
        {
          checkType: "chatbot",
          status: "disclosed_at_interaction",
          severity: "info",
          evidence: { widget, disclosure: widgetDisclosure.evidence, checkedUrl: ctx.url },
          screenshotPath: await captureScreenshot(page, ctx, "disclosed_at_interaction"),
        },
      ];
    }

    const pageDisclosure = await checkPageTextDisclosure(page, ctx.url, keywords);
    if (pageDisclosure.foundBuried) {
      return [
        {
          checkType: "chatbot",
          status: "disclosure_buried",
          severity: "notice",
          evidence: { widget, disclosure: pageDisclosure.evidence, checkedUrl: ctx.url },
          screenshotPath: await captureScreenshot(page, ctx, "disclosure_buried"),
        },
      ];
    }

    return [
      {
        checkType: "chatbot",
        status: "no_disclosure",
        severity: "relevant",
        evidence: { widget, checkedUrl: ctx.url },
        screenshotPath: await captureScreenshot(page, ctx, "no_disclosure"),
      },
    ];
  } catch (err) {
    return [
      {
        checkType: "chatbot",
        status: "inconclusive",
        severity: "info",
        evidence: {
          checkedUrl: ctx.url,
          error: err instanceof Error ? err.message : String(err),
        },
      },
    ];
  }
};

async function captureScreenshot(
  page: Page,
  ctx: DetectorContext,
  label: string
): Promise<string | null> {
  try {
    mkdirSync(ctx.screenshotDir, { recursive: true });
    const filename = `site-${ctx.siteId}-page-${ctx.pageId ?? 0}-${label}-${Date.now()}.png`;
    const path = join(ctx.screenshotDir, filename);
    await page.screenshot({ path });
    return path;
  } catch {
    return null;
  }
}
