import type { Page } from "playwright";

// Selectors for the handful of consent-management platforms most German-
// speaking/EU sites run. Checked before the generic text fallback because
// they're exact and don't risk clicking the wrong button.
const KNOWN_SELECTORS = [
  "#onetrust-accept-btn-handler",
  "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
  "#CybotCookiebotDialogBodyButtonAccept",
  'button[data-testid="uc-accept-all-button"]',
  "#didomi-notice-agree-button",
  ".qc-cmp2-summary-buttons button[mode='primary']",
  ".cm-btn-accept-all",
  "#truste-consent-button",
  ".cc-btn.cc-allow",
];

const ACCEPT_TEXT_PATTERN =
  /^(alle( cookies)? akzeptieren|akzeptieren|zustimmen|einverstanden|ich stimme zu|accept all( cookies)?|accept|i agree|agree|tout accepter|accepter|accetta tutto|accetta|schliessen|schließen|ok)$/i;

/**
 * Best-effort dismissal of a cookie/consent overlay, so it doesn't block the
 * chat widget underneath from being detected. Only ever clicks something
 * that looks like an "accept" control — never a settings/reject/customize
 * button — since the goal is just to reach the page content, not to record
 * a consent decision on the visitor's behalf.
 */
export async function dismissConsentBanner(page: Page, perAttemptTimeoutMs = 250): Promise<boolean> {
  for (const selector of KNOWN_SELECTORS) {
    const el = page.locator(selector).first();
    try {
      await el.waitFor({ state: "visible", timeout: perAttemptTimeoutMs });
      await el.click({ timeout: perAttemptTimeoutMs * 2 });
      return true;
    } catch {
      continue;
    }
  }

  const genericButton = page.getByRole("button", { name: ACCEPT_TEXT_PATTERN }).first();
  try {
    await genericButton.waitFor({ state: "visible", timeout: perAttemptTimeoutMs });
    await genericButton.click({ timeout: perAttemptTimeoutMs * 2 });
    return true;
  } catch {
    return false;
  }
}
