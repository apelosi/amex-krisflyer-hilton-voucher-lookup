export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VoucherValidationResult {
  valid: boolean;
  error?: string;
}

const BASE_URL = "https://apac.hilton.com/amexkrisflyer";

const USED_VOUCHER_MSG = "You've used your voucher code. Please provide another one.";
const INCORRECT_ENTRY_MSG = "You've provided an incorrect entry. Please try again.";
const GENERIC_VERIFY_FAIL =
  "We couldn't verify your voucher details. Please check your information and try again. If the problem continues, contact Vibez Ventures.";

/** Remove script/style so bundled JS cannot fake "incorrect entry" substring matches. */
function stripExecutableHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");
}

/**
 * Prefer visible text for user-facing errors; fall back to stripped HTML (e.g. ScraperAPI has no innerText).
 */
function parseVoucherOutcome(htmlNoScript: string, innerText: string): VoucherValidationResult | null {
  const visible = innerText.length > 30 ? innerText : "";
  const inVisible = (s: string) => visible.includes(s);
  const inDom = (s: string) => htmlNoScript.includes(s);

  if (inVisible(USED_VOUCHER_MSG) || (!visible && inDom(USED_VOUCHER_MSG))) {
    return { valid: false, error: USED_VOUCHER_MSG };
  }
  if (inVisible(INCORRECT_ENTRY_MSG) || (!visible && inDom(INCORRECT_ENTRY_MSG))) {
    return {
      valid: false,
      error: GENERIC_VERIFY_FAIL,
    };
  }
  if (htmlNoScript.includes('data-validation-result="INVALID"')) {
    const msgMatch = htmlNoScript.match(/data-validation-message="([^"]+)"/);
    if (msgMatch) {
      return { valid: false, error: msgMatch[1].replace(/&quot;/g, '"') };
    }
    return {
      valid: false,
      error: GENERIC_VERIFY_FAIL,
    };
  }
  if (htmlNoScript.includes('data-validation-result="VALID"')) {
    return { valid: true };
  }
  return null;
}

/** Browserless /function may return `{ data: { html, innerText, url } }` or nest under result/value. */
function extractBrowserlessFnPayload(
  raw: unknown,
): { html: string; innerText: string; url?: string } {
  const fromObj = (o: unknown): { html: string; innerText: string; url?: string } | null => {
    if (!o || typeof o !== "object") return null;
    const p = o as Record<string, unknown>;
    if (p.data !== undefined) {
      const inner = fromObj(p.data);
      if (inner) return inner;
    }
    const url = typeof p.url === "string" && p.url.length > 8 ? p.url : undefined;
    const html = typeof p.html === "string" ? p.html : "";
    const innerText =
      typeof p.innerText === "string"
        ? p.innerText
        : typeof p.text === "string"
          ? p.text
          : "";
    if (html.length > 100 || innerText.length > 50) return { html, innerText, url };
    for (const k of ["data", "result", "value", "body", "payload"]) {
      const nested = fromObj(p[k]);
      if (nested && (nested.html.length > 100 || nested.innerText.length > 50)) {
        return { ...nested, url: nested.url ?? url };
      }
    }
    return html || innerText || url ? { html, innerText, url } : null;
  };
  return fromObj(raw) ?? { html: "", innerText: "" };
}

/** After voucher submit, Hilton often navigates to a path that is not the landing URL. */
function urlSuggestsVoucherSuccess(pageUrl: string | undefined): boolean {
  if (!pageUrl) return false;
  try {
    const u = new URL(pageUrl);
    const path = u.pathname.toLowerCase();
    if (!path.includes("amexkrisflyer")) return true;
    if (path.endsWith("/amexkrisflyer")) return false;
    return true;
  } catch {
    return false;
  }
}

function looksLikeVoucherSuccess(htmlNoScript: string, innerText: string): boolean {
  const t = `${innerText}\n${htmlNoScript}`.toLowerCase().replace(/\s+/g, " ");
  const phrases = [
    "select a destination",
    "select destination",
    "select your destination",
    "choose your hotel",
    "choose a hotel",
    "where would you like to stay",
    "find your hotel",
    "search hotels",
    "book your complimentary",
    "complimentary night",
    "amex krisflyer",
    "destination & hotel",
    "pick your hotel",
  ];
  return phrases.some((p) => t.includes(p));
}

async function validateWithBrowserless(
  creditCard: string,
  voucherCode: string,
  token: string,
): Promise<VoucherValidationResult> {
  const browserlessUrl =
    `https://production-sfo.browserless.io/function?token=${encodeURIComponent(token)}&stealth=true`;

  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "");

  // Browserless /function expects ESM: export default + { data, type } (not module.exports).
  const puppeteerScript = `
export default async ({ page }) => {
  const typeInto = async (handle, value) => {
    await handle.click({ clickCount: 3 });
    for (const ch of value) {
      await page.keyboard.type(ch, { delay: 40 });
    }
    await handle.evaluate((el) => {
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
  };

  await page.setViewport({ width: 1280, height: 900 });
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  });
  await page.goto('${esc(BASE_URL)}', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 3500));

  const cardSelectors = [
    'input[name="bin_number"]',
    '#bin_number',
    'input[autocomplete="cc-number"]',
    'input[inputmode="numeric"]',
  ];
  const voucherSelectors = [
    'input[name="voucher_no"]',
    '#voucher_no',
    'input[name="voucher"]',
  ];

  let binInput = null;
  let voucherInput = null;
  for (const sel of cardSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 20000 });
      binInput = await page.$(sel);
      if (binInput) break;
    } catch (_) {}
  }
  for (const sel of voucherSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 15000 });
      voucherInput = await page.$(sel);
      if (voucherInput) break;
    } catch (_) {}
  }

  if (!binInput || !voucherInput) {
    throw new Error('Voucher form inputs not found');
  }

  await typeInto(binInput, '${esc(creditCard)}');
  await typeInto(voucherInput, '${esc(voucherCode)}');
  await new Promise((r) => setTimeout(r, 400));

  const beforeUrl = page.url();
  const submit =
    (await page.$('button[type="submit"]')) ||
    (await page.$('input[type="submit"]'));
  const btns = await page.$$('button');
  let clickTarget = submit;
  if (!clickTarget && btns.length) {
    for (const b of btns) {
      const t = await page.evaluate((el) => (el.textContent || '').trim().toLowerCase(), b);
      if (t === 'submit' || t.includes('submit') || t.includes('continue')) {
        clickTarget = b;
        break;
      }
    }
  }

  if (clickTarget) await clickTarget.click();
  else await voucherInput.press('Enter');

  await new Promise((r) => setTimeout(r, 5000));

  try {
    await page.waitForFunction(
      (start) => {
        const txtRaw = document.body ? document.body.innerText : "";
        const txt = txtRaw.toLowerCase();
        const inputs = Array.from(document.querySelectorAll('input[name="bin_number"], #bin_number, input[name="voucher_no"], #voucher_no'));
        const fieldInvalid = inputs.some((el) => el.getAttribute('aria-invalid') === 'true');
        const bad =
          txtRaw.indexOf("You've used your voucher") !== -1 ||
          txtRaw.indexOf("You've provided an incorrect entry") !== -1 ||
          fieldInvalid;
        const url = window.location.href;
        const leftLanding = url !== start && !url.split('?')[0].endsWith('/amexkrisflyer');
        const good =
          leftLanding ||
          (txt.includes("select") && txt.includes("destination")) ||
          (txt.includes("choose") && txt.includes("hotel")) ||
          txt.includes("where would you like") ||
          txt.includes("pick your hotel") ||
          txt.includes("find your hotel") ||
          txt.includes("search hotels");
        return bad || good;
      },
      { timeout: 90000 },
      beforeUrl,
    );
  } catch (_) {}

  await new Promise((r) => setTimeout(r, 2000));
  const html = await page.content();
  const innerText = await page.evaluate(() => (document.body ? document.body.innerText : ''));
  const url = page.url();
  return {
    data: { html, innerText, url },
    type: "application/json",
  };
};
`;

  const response = await fetch(browserlessUrl, {
    method: "POST",
    headers: { "Content-Type": "application/javascript" },
    body: puppeteerScript,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Browserless failed: ${response.status} ${err}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Browserless: non-JSON response");
  }
  const { html, innerText, url: pageUrl } = extractBrowserlessFnPayload(payload);
  const htmlStripped = stripExecutableHtml(html);
  const combined = `${innerText}\n${htmlStripped}`;

  if (!combined || combined.length < 400) {
    if (urlSuggestsVoucherSuccess(pageUrl)) {
      return { valid: true };
    }
    throw new Error(
      `Browserless: payload too small (html=${html.length} text=${innerText.length}) - check API response shape`,
    );
  }

  // Prefer navigation / visible success heuristics before substring scans (bundled JS can contain error strings).
  if (innerText.includes(USED_VOUCHER_MSG) || htmlStripped.includes(USED_VOUCHER_MSG)) {
    return { valid: false, error: USED_VOUCHER_MSG };
  }
  if (urlSuggestsVoucherSuccess(pageUrl) && looksLikeVoucherSuccess(htmlStripped, innerText)) {
    return { valid: true };
  }
  if (urlSuggestsVoucherSuccess(pageUrl) && !innerText.toLowerCase().includes("incorrect entry")) {
    return { valid: true };
  }
  if (looksLikeVoucherSuccess(htmlStripped, innerText) && !innerText.includes(INCORRECT_ENTRY_MSG)) {
    return { valid: true };
  }

  const fromMarkers = parseVoucherOutcome(htmlStripped, innerText);
  if (fromMarkers) return fromMarkers;

  if (innerText.includes(INCORRECT_ENTRY_MSG)) {
    return {
      valid: false,
      error: GENERIC_VERIFY_FAIL,
    };
  }

  const lowered = `${innerText}\n${htmlStripped}`.toLowerCase();
  if (
    lowered.includes("aria-invalid") &&
    (lowered.includes("true") || htmlStripped.includes('aria-invalid="true"'))
  ) {
    return {
      valid: false,
      error: GENERIC_VERIFY_FAIL,
    };
  }

  if (/select\s+a\s+destination|choose\s+your\s+hotel|amex\s+kfa/i.test(combined)) {
    return { valid: true };
  }

  if (looksLikeVoucherSuccess(htmlStripped, innerText)) {
    return { valid: true };
  }

  throw new Error("Browserless: could not determine voucher outcome");
}

function buildScraperCustomJs(creditCard: string, voucherCode: string): string {
  const escJs = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r|\n/g, "");

  return `
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const USED = "You've used your voucher code. Please provide another one.";
  const BAD = "You've provided an incorrect entry. Please try again.";
  await sleep(1200);

  const cardSelectors = ['input[name="bin_number"]', '#bin_number', 'input[autocomplete="cc-number"]', 'input[inputmode="numeric"]'];
  const voucherSelectors = ['input[name="voucher_no"]', '#voucher_no', 'input[name="voucher"]'];

  let binInput = null;
  let voucherInput = null;
  for (const sel of cardSelectors) {
    binInput = document.querySelector(sel);
    if (binInput) break;
  }
  for (const sel of voucherSelectors) {
    voucherInput = document.querySelector(sel);
    if (voucherInput) break;
  }

  if (!binInput || !voucherInput) {
    document.body.setAttribute('data-validation-result', 'INVALID');
    document.body.setAttribute('data-validation-message', 'FORM_NOT_FOUND');
    return;
  }

  const typeHuman = async (el, value) => {
    el.focus();
    el.value = '';
    for (let i = 0; i < value.length; i++) {
      el.value += value[i];
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(45);
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  await typeHuman(binInput, '${escJs(creditCard)}');
  await typeHuman(voucherInput, '${escJs(voucherCode)}');
  await sleep(300);

  const btns = Array.from(document.querySelectorAll('button'));
  const submitBtn =
    document.querySelector('button[type="submit"], input[type="submit"]') ||
    btns.find((b) => (b.textContent || '').trim().toLowerCase() === 'submit') ||
    btns.find((b) => (b.textContent || '').trim().toLowerCase().includes('submit'));

  if (submitBtn) submitBtn.click();
  else {
    document.body.setAttribute('data-validation-result', 'INVALID');
    document.body.setAttribute('data-validation-message', 'SUBMIT_NOT_FOUND');
    return;
  }

  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const vis = (document.body ? document.body.innerText : '') || '';
    if (vis.includes(USED)) {
      document.body.setAttribute('data-validation-result', 'INVALID');
      document.body.setAttribute('data-validation-message', USED);
      return;
    }
    if (vis.includes(BAD)) {
      document.body.setAttribute('data-validation-result', 'INVALID');
      document.body.setAttribute('data-validation-message', BAD);
      return;
    }
    if (binInput.getAttribute('aria-invalid') === 'true' || voucherInput.getAttribute('aria-invalid') === 'true') {
      document.body.setAttribute('data-validation-result', 'INVALID');
      document.body.setAttribute('data-validation-message', 'FIELD_INVALID');
      return;
    }
    const txt = (document.body ? document.body.innerText : '').toLowerCase();
    const ok =
      /select a destination|choose your hotel|amex kfa/i.test(txt) ||
      (txt.includes('select') && txt.includes('destination')) ||
      (txt.includes('choose') && txt.includes('hotel')) ||
      txt.includes('where would you like') ||
      txt.includes('pick your hotel') ||
      txt.includes('find your hotel');
    if (ok) {
      document.body.setAttribute('data-validation-result', 'VALID');
      return;
    }
  }

  document.body.setAttribute('data-validation-result', 'INVALID');
  document.body.setAttribute('data-validation-message', 'TIMEOUT');
})();
`;
}

async function validateWithScraperApi(
  creditCard: string,
  voucherCode: string,
  scraperApiKey: string,
): Promise<VoucherValidationResult> {
  const custom_js = buildScraperCustomJs(creditCard, voucherCode);
  const timeoutMs = 90000;

  const runOnce = (premium: boolean): Promise<Response> => {
    const params = new URLSearchParams({
      api_key: scraperApiKey,
      url: BASE_URL,
      render: "true",
      country_code: "sg",
      wait: "25000",
      custom_js,
    });
    if (premium) params.set("premium", "true");
    const reqUrl = `https://api.scraperapi.com/?${params.toString()}`;
    return Promise.race([
      fetch(reqUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error("ScraperAPI voucher request timeout")), timeoutMs)
      ),
    ]);
  };

  let response = await runOnce(true);
  if (response.status === 403) {
    response = await runOnce(false);
  }

  if (!response.ok) {
    const hint = await response.text().catch(() => "");
    throw new Error(`ScraperAPI ${response.status}${hint ? `: ${hint.slice(0, 200)}` : ""}`);
  }

  const html = await response.text();
  const htmlStripped = stripExecutableHtml(html);
  const parsed = parseVoucherOutcome(htmlStripped, "");
  if (parsed) return parsed;

  if (looksLikeVoucherSuccess(htmlStripped, "")) {
    return { valid: true };
  }

  if (htmlStripped.includes(USED_VOUCHER_MSG)) {
    return { valid: false, error: USED_VOUCHER_MSG };
  }
  if (htmlStripped.includes(INCORRECT_ENTRY_MSG)) {
    return {
      valid: false,
      error: GENERIC_VERIFY_FAIL,
    };
  }

  if (htmlStripped.includes('data-validation-message="FORM_NOT_FOUND"')) {
    throw new Error("ScraperAPI: form not found in DOM");
  }

  return {
    valid: false,
    error: "Unable to verify voucher details at this time. Please try again.",
  };
}

export async function validateVoucher(
  creditCard: string,
  voucherCode: string,
): Promise<VoucherValidationResult> {
  console.log("Voucher validation for:", { creditCard, voucherCode });

  const browserlessToken = Deno.env.get("BROWSERLESS_API_KEY");
  const scraperApiKey = Deno.env.get("SCRAPERAPI_KEY");

  if (!browserlessToken && !scraperApiKey) {
    return {
      valid: false,
      error: "No scraping provider configured (BROWSERLESS_API_KEY and/or SCRAPERAPI_KEY).",
    };
  }

  if (!creditCard || creditCard.length !== 6) {
    return { valid: false, error: "Credit card number must be 6 digits" };
  }

  if (!voucherCode || voucherCode.length !== 10) {
    return { valid: false, error: "Voucher code must be 10 characters" };
  }

  const failures: string[] = [];

  if (browserlessToken) {
    try {
      return await validateWithBrowserless(creditCard, voucherCode, browserlessToken);
    } catch (e) {
      const msg = String(e?.message ?? e);
      failures.push(`Browserless: ${msg}`);
      console.log("Browserless voucher validation failed:", msg);
    }
  }

  if (scraperApiKey) {
    try {
      return await validateWithScraperApi(creditCard, voucherCode, scraperApiKey);
    } catch (e) {
      const msg = String(e?.message ?? e);
      failures.push(`ScraperAPI: ${msg}`);
      console.log("ScraperAPI voucher validation failed:", msg);
    }
  }

  return {
    valid: false,
    error: failures.length
      ? `Unable to verify voucher (${failures.join(" | ")}). Please try again.`
      : "Unable to verify voucher details at this time. Please try again.",
  };
}
