import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VoucherValidationRequest {
  creditCard: string;
  voucherCode: string;
}

interface VoucherValidationResult {
  valid: boolean;
  error?: string;
}

const BASE_URL = "https://apac.hilton.com/amexkrisflyer";

const USED_VOUCHER_MSG = "You've used your voucher code. Please provide another one.";
const INCORRECT_ENTRY_MSG = "You've provided an incorrect entry. Please try again.";

function parseVoucherOutcome(html: string): VoucherValidationResult | null {
  if (html.includes(USED_VOUCHER_MSG)) {
    return { valid: false, error: USED_VOUCHER_MSG };
  }
  if (html.includes(INCORRECT_ENTRY_MSG)) {
    return {
      valid: false,
      error:
        "We couldn't verify your voucher details. Please check your information and try again. If the problem continues, contact Vibez Ventures.",
    };
  }
  if (html.includes('data-validation-result="INVALID"')) {
    const msgMatch = html.match(/data-validation-message="([^"]+)"/);
    if (msgMatch) {
      return { valid: false, error: msgMatch[1].replace(/&quot;/g, '"') };
    }
    return {
      valid: false,
      error:
        "We couldn't verify your voucher details. Please check your information and try again. If the problem continues, contact Vibez Ventures.",
    };
  }
  if (html.includes('data-validation-result="VALID"')) {
    return { valid: true };
  }
  return null;
}

async function validateWithBrowserless(
  creditCard: string,
  voucherCode: string,
  token: string,
): Promise<VoucherValidationResult> {
  const browserlessUrl =
    `https://production-sfo.browserless.io/function?token=${encodeURIComponent(token)}&stealth=true`;

  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "");

  const puppeteerScript = `
    module.exports = async ({ page }) => {
      await page.setViewport({ width: 1280, height: 900 });
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });
      await page.goto('${esc(BASE_URL)}', { waitUntil: 'networkidle2', timeout: 90000 });
      await new Promise((r) => setTimeout(r, 2000));

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
        binInput = await page.$(sel);
        if (binInput) break;
      }
      for (const sel of voucherSelectors) {
        voucherInput = await page.$(sel);
        if (voucherInput) break;
      }

      if (!binInput || !voucherInput) {
        throw new Error('Voucher form inputs not found');
      }

      await binInput.click({ clickCount: 3 });
      await binInput.type('${esc(creditCard)}', { delay: 45 });

      await voucherInput.click({ clickCount: 3 });
      await voucherInput.type('${esc(voucherCode)}', { delay: 45 });

      const submit =
        (await page.$('button[type="submit"]')) ||
        (await page.$('input[type="submit"]'));
      const btns = await page.$$('button');
      let clickTarget = submit;
      if (!clickTarget && btns.length) {
        for (const b of btns) {
          const t = await page.evaluate((el) => (el.textContent || '').trim().toLowerCase(), b);
          if (t === 'submit' || t.includes('submit')) {
            clickTarget = b;
            break;
          }
        }
      }
      if (clickTarget) await clickTarget.click();

      try {
        await page.waitForFunction(
          () => {
            const h = document.body ? document.body.innerHTML : '';
            const txt = document.body ? document.body.innerText : '';
            return (
              h.indexOf("You've used your voucher") !== -1 ||
              h.indexOf("You've provided an incorrect entry") !== -1 ||
              h.indexOf('aria-invalid="true"') !== -1 ||
              /select a destination|choose your hotel|amex kfa/i.test(txt)
            );
          },
          { timeout: 35000 },
        );
      } catch (_) {
        /* use whatever loaded */
      }

      await new Promise((r) => setTimeout(r, 1500));
      const html = await page.content();
      const innerText = await page.evaluate(() => (document.body ? document.body.innerText : ''));
      return { html, innerText };
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

  const payload = await response.json();
  const html = typeof payload?.html === "string" ? payload.html : "";
  const innerText = typeof payload?.innerText === "string" ? payload.innerText : "";
  const combined = innerText.length > html.length / 5 ? `${innerText}\n${html}` : html;

  const fromMarkers = parseVoucherOutcome(combined);
  if (fromMarkers) return fromMarkers;

  if (combined.includes(USED_VOUCHER_MSG)) {
    return { valid: false, error: USED_VOUCHER_MSG };
  }
  if (combined.includes(INCORRECT_ENTRY_MSG)) {
    return {
      valid: false,
      error:
        "We couldn't verify your voucher details. Please check your information and try again. If the problem continues, contact Vibez Ventures.",
    };
  }

  const lowered = combined.toLowerCase();
  if (
    lowered.includes("aria-invalid") &&
    (lowered.includes("true") || combined.includes('aria-invalid="true"'))
  ) {
    return {
      valid: false,
      error:
        "We couldn't verify your voucher details. Please check your information and try again. If the problem continues, contact Vibez Ventures.",
    };
  }

  if (/select\s+a\s+destination|choose\s+your\s+hotel|amex\s+kfa/i.test(combined)) {
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
    const html = document.body ? document.body.innerHTML : '';
    if (html.includes(USED)) {
      document.body.setAttribute('data-validation-result', 'INVALID');
      document.body.setAttribute('data-validation-message', USED);
      return;
    }
    if (html.includes(BAD)) {
      document.body.setAttribute('data-validation-result', 'INVALID');
      document.body.setAttribute('data-validation-message', BAD);
      return;
    }
    if (binInput.getAttribute('aria-invalid') === 'true' || voucherInput.getAttribute('aria-invalid') === 'true') {
      document.body.setAttribute('data-validation-result', 'INVALID');
      document.body.setAttribute('data-validation-message', 'FIELD_INVALID');
      return;
    }
    const txt = document.body ? document.body.innerText : '';
    if (/select a destination|choose your hotel|amex kfa/i.test(txt)) {
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
  const params = new URLSearchParams({
    api_key: scraperApiKey,
    url: BASE_URL,
    render: "true",
    country_code: "sg",
    premium: "true",
    wait: "25000",
    custom_js,
  });

  const url = `https://api.scraperapi.com/?${params.toString()}`;
  const timeoutMs = 90000;
  const response = await Promise.race([
    fetch(url, {
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

  if (!response.ok) {
    throw new Error(`ScraperAPI ${response.status}`);
  }

  const html = await response.text();
  const parsed = parseVoucherOutcome(html);
  if (parsed) return parsed;

  if (html.includes(USED_VOUCHER_MSG)) {
    return { valid: false, error: USED_VOUCHER_MSG };
  }
  if (html.includes(INCORRECT_ENTRY_MSG)) {
    return {
      valid: false,
      error:
        "We couldn't verify your voucher details. Please check your information and try again. If the problem continues, contact Vibez Ventures.",
    };
  }

  if (html.includes('data-validation-message="FORM_NOT_FOUND"')) {
    throw new Error("ScraperAPI: form not found in DOM");
  }

  return {
    valid: false,
    error: "Unable to verify voucher details at this time. Please try again.",
  };
}

async function validateVoucher(
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

  if (browserlessToken) {
    try {
      return await validateWithBrowserless(creditCard, voucherCode, browserlessToken);
    } catch (e) {
      console.log("Browserless voucher validation failed:", e?.message ?? e);
    }
  }

  if (scraperApiKey) {
    try {
      return await validateWithScraperApi(creditCard, voucherCode, scraperApiKey);
    } catch (e) {
      console.log("ScraperAPI voucher validation failed:", e?.message ?? e);
    }
  }

  return {
    valid: false,
    error: "Unable to verify voucher details at this time. Please try again.",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: VoucherValidationRequest = await req.json();
    console.log("Validating voucher:", requestData);

    const result = await validateVoucher(requestData.creditCard, requestData.voucherCode);

    return new Response(
      JSON.stringify({
        success: true,
        valid: result.valid,
        error: result.error,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in validate-voucher function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        valid: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
