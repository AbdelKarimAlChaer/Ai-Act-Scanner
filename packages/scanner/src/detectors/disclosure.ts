import type { Page } from "playwright";
import type { Evidence } from "@ai-act-scanner/shared";

export interface DisclosureResult {
  foundAtWidget: boolean;
  foundBuried: boolean;
  evidence: Evidence[];
}

function buildKeywordRegex(keywords: string[]): RegExp {
  // \b-bounded, not a raw substring match: short keywords like "Bot" or "KI"
  // would otherwise fire inside unrelated words ("Bottich", "Skispringen").
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "iu");
}

function truncate(s: string, max = 200): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/**
 * Looks for a disclosure inside the chat widget itself: launcher tooltip,
 * greeting bubble, header, input placeholder — visible before or right at
 * the first message, which is what Art. 50 Abs. 1 requires. If nothing is
 * visible up front, tries to open the widget and read the first bot message.
 */
export async function checkWidgetDisclosure(
  page: Page,
  url: string,
  keywords: string[]
): Promise<DisclosureResult> {
  const regex = buildKeywordRegex(keywords);

  const preOpenText = await collectWidgetAreaText(page);
  const preMatch = preOpenText.find((t) => regex.test(t.text));
  if (preMatch) {
    return {
      foundAtWidget: true,
      foundBuried: false,
      evidence: [
        {
          url,
          selector: preMatch.selector,
          textExcerpt: truncate(preMatch.text),
          requestUrl: null,
          note: "Offenlegung im Widget-Bereich vor/bei erster Nachricht gefunden",
        },
      ],
    };
  }

  const opened = await tryOpenWidget(page);
  if (opened) {
    await page.waitForTimeout(1500);
    const postOpenText = await collectWidgetAreaText(page);
    const postMatch = postOpenText.find((t) => regex.test(t.text));
    if (postMatch) {
      return {
        foundAtWidget: true,
        foundBuried: false,
        evidence: [
          {
            url,
            selector: postMatch.selector,
            textExcerpt: truncate(postMatch.text),
            requestUrl: null,
            note: "Offenlegung nach Öffnen des Widgets in erster Bot-Nachricht gefunden",
          },
        ],
      };
    }
  }

  return { foundAtWidget: false, foundBuried: false, evidence: [] };
}

/**
 * Fallback search across page text (privacy policy, imprint, T&Cs). A match
 * here does NOT satisfy "at first interaction" — callers must record this as
 * disclosure_buried, never as compliant.
 */
export async function checkPageTextDisclosure(
  page: Page,
  url: string,
  keywords: string[]
): Promise<DisclosureResult> {
  const regex = buildKeywordRegex(keywords);
  const bodyText: string = await page.evaluate(() => document.body.innerText).catch(() => "");
  const match = bodyText.match(regex);
  if (match && match.index !== undefined) {
    const excerpt = bodyText.slice(Math.max(0, match.index - 60), match.index + 60);
    return {
      foundAtWidget: false,
      foundBuried: true,
      evidence: [
        {
          url,
          selector: "body",
          textExcerpt: truncate(excerpt),
          requestUrl: null,
          note: "Erwähnung im Seitentext (z.B. Datenschutzerklärung/Impressum), nicht bei der ersten Interaktion",
        },
      ],
    };
  }
  return { foundAtWidget: false, foundBuried: false, evidence: [] };
}

async function collectWidgetAreaText(page: Page): Promise<{ text: string; selector: string }[]> {
  return page
    .evaluate(() => {
      const results: { text: string; selector: string }[] = [];
      const selectors = [
        '[role="dialog"]',
        '[class*="chat" i]',
        '[class*="messenger" i]',
        '[class*="assistant" i]',
        '[id*="chat" i]',
      ];
      const seen = new Set<Element>();
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);
          const htmlEl = el as HTMLElement;
          const text =
            htmlEl.innerText ||
            el.getAttribute("placeholder") ||
            el.getAttribute("title") ||
            el.getAttribute("aria-label") ||
            "";
          if (text && text.trim().length > 0) {
            results.push({ text: text.trim(), selector: sel });
          }
        });
      }
      document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((el) => {
        const ph = el.getAttribute("placeholder") || "";
        if (ph.trim()) results.push({ text: ph.trim(), selector: "input[placeholder]" });
      });
      return results;
    })
    .catch(() => []);
}

async function tryOpenWidget(page: Page): Promise<boolean> {
  const launcherSelectors = [
    '[aria-label*="chat" i]',
    '[aria-label*="assistant" i]',
    'button[class*="launcher" i]',
    'button[class*="chat" i]',
    '[id*="launcher" i]',
  ];
  for (const sel of launcherSelectors) {
    const el = await page.$(sel).catch(() => null);
    if (el) {
      try {
        await el.click({ timeout: 3000 });
        return true;
      } catch {
        continue;
      }
    }
  }
  return false;
}
