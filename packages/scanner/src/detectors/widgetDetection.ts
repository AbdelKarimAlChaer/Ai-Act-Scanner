import type { Page } from "playwright";
import type { Evidence, WidgetDetection } from "@ai-act-scanner/shared";
import {
  PROVIDER_SIGNATURES,
  CUSTOM_LLM_REQUEST_PATTERNS,
  GENERIC_CHAT_CLASS_HINTS,
} from "./providers.js";

export async function detectWidget(
  page: Page,
  url: string,
  requestUrls: string[]
): Promise<WidgetDetection> {
  for (const sig of PROVIDER_SIGNATURES) {
    const evidence: Evidence[] = [];

    const matchedRequest = requestUrls.find((r) => sig.requestPatterns.some((p) => p.test(r)));
    if (matchedRequest) {
      evidence.push({
        url,
        requestUrl: matchedRequest,
        selector: null,
        textExcerpt: null,
        note: `Netzwerk-Request passt zu ${sig.label}`,
      });
    }

    if (sig.globalObjects.length) {
      const matchedGlobal = await page
        .evaluate((names) => {
          for (const n of names) {
            if ((window as any)[n] !== undefined) return n;
          }
          return null;
        }, sig.globalObjects)
        .catch(() => null);
      if (matchedGlobal) {
        evidence.push({
          url,
          selector: null,
          requestUrl: null,
          textExcerpt: null,
          note: `Globales JS-Objekt window.${matchedGlobal} gefunden (${sig.label})`,
        });
      }
    }

    for (const selector of sig.domSelectors) {
      const found = await page.$(selector).catch(() => null);
      if (found) {
        evidence.push({
          url,
          selector,
          requestUrl: null,
          textExcerpt: null,
          note: `DOM-Element ${selector} gefunden (${sig.label})`,
        });
        break;
      }
    }

    if (evidence.length > 0) {
      return { found: true, provider: sig.id, evidence };
    }
  }

  const llmRequest = requestUrls.find((r) => CUSTOM_LLM_REQUEST_PATTERNS.some((p) => p.test(r)));
  if (llmRequest) {
    return {
      found: true,
      provider: "custom_llm",
      evidence: [
        {
          url,
          requestUrl: llmRequest,
          selector: null,
          textExcerpt: null,
          note: "Frontend-Request gegen bekannte LLM-API (Custom-LLM-Widget)",
        },
      ],
    };
  }

  const genericSelector = await findGenericChatWidget(page);
  if (genericSelector) {
    return {
      found: true,
      provider: "generic_heuristic",
      evidence: [
        {
          url,
          selector: genericSelector,
          requestUrl: null,
          textExcerpt: null,
          note: "Generische Heuristik: Dialog-Rolle/Klassenname mit Eingabefeld deutet auf Chat-Widget hin",
        },
      ],
    };
  }

  return { found: false, provider: null, evidence: [] };
}

async function findGenericChatWidget(page: Page): Promise<string | null> {
  return page
    .evaluate((classHints: string[]) => {
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
      for (const d of dialogs) {
        const hasInput = d.querySelector('input[type="text"], textarea');
        const hasButton = Array.from(d.querySelectorAll("button")).some((b) =>
          /send|senden|submit/i.test(b.textContent || "")
        );
        if (hasInput && hasButton) return '[role="dialog"]';
      }

      const candidates = Array.from(document.querySelectorAll("[class], [id], iframe"));
      for (const el of candidates) {
        const cls = (el.getAttribute("class") || "").toLowerCase();
        const id = (el.id || "").toLowerCase();
        // Word-boundary match, not substring: "bot" must not fire on
        // "footer-bottom" or "margin-bottom", only on tokens like "chat-bot".
        const matchesHint = classHints.some((hint) => {
          const re = new RegExp(`\\b${hint}\\b`, "i");
          return re.test(cls) || re.test(id);
        });
        if (!matchesHint) continue;
        // Custom-built widgets often use an icon-only launcher (a plain <a>,
        // an element with role="button", or a bare <svg>/<img>) instead of a
        // real <button>, so a strict input/textarea/button check misses them.
        const looksInteractive =
          el.tagName === "IFRAME" ||
          el.querySelector('input, textarea, button, a, [role="button"], [onclick], svg, img');
        if (looksInteractive) {
          const firstClass = el.getAttribute("class")?.split(/\s+/)[0];
          return firstClass ? `.${firstClass}` : id ? `#${id}` : el.tagName.toLowerCase();
        }
      }
      return null;
    }, GENERIC_CHAT_CLASS_HINTS)
    .catch(() => null);
}
