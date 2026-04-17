import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Parse YYYY-MM-DD as local calendar date (not UTC). */
function parseYmdLocal(ymd: string): Date {
  const parts = ymd.split("-").map((x) => parseInt(x, 10));
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) throw new Error(`Invalid date: ${ymd}`);
  return new Date(y, m - 1, d);
}

function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const dt = parseYmdLocal(ymd);
  dt.setDate(dt.getDate() + days);
  return formatYmdLocal(dt);
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AvailabilityRequest {
  creditCard: string;
  voucherCode: string;
  destination: string;
  hotel: string;
  dateRange?: string[];
  arrivalDate?: string;
  voucherExpiry: string;
  groupCode: string;
  /** Optional: include provider diagnostics in the response. */
  includeDebug?: boolean;
}

export interface AvailabilityResult {
  date: string;
  available: boolean;
  roomCount?: number;
  bookingUrl?: string;
  debug?: unknown;
}

export function constructHiltonUrl(requestData: AvailabilityRequest, hotelCode: string): string {
  const baseUrl = "https://www.hilton.com/en/book/reservation/rooms/";
  const departureYmd = addDaysYmd(requestData.arrivalDate!, 1);

  const params = new URLSearchParams({
    ctyhocn: hotelCode,
    arrivalDate: requestData.arrivalDate!,
    departureDate: departureYmd,
    groupCode: requestData.groupCode,
    room1NumAdults: "1",
    cid: "OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book",
  });

  return `${baseUrl}?${params.toString()}`;
}

function stripExecutableHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
}

/** Specific phrases only — avoid nav/footer noise that mentions "unavailable" generically. */
const UNAVAILABLE_PHRASES = [
  "your selected rates are unavailable",
  "no rooms available for your stay",
  "no rooms available for these dates",
  "we're sold out",
  "sold out for these dates",
  "we couldn't find any rooms for this hotel",
  "we could not find any rooms for this hotel",
];

function textImpliesUnavailable(text: string): boolean {
  const n = text.toLowerCase().replace(/\s+/g, " ");
  return UNAVAILABLE_PHRASES.some((p) => n.includes(p));
}

/** Visible listings often omit "voucher rates" copy but still show bookable rooms + nightly pricing. */
function looksLikeBookableRoomListing(innerText: string, html: string): boolean {
  if (textImpliesUnavailable(innerText)) return false;
  const t = innerText.toLowerCase().replace(/\s+/g, " ");
  const h = html.toLowerCase();
  if (t.length < 400) return false;

  const roomishPhrase =
    t.includes("select a room") ||
    t.includes("choose a room") ||
    t.includes("room types") ||
    t.includes("guest room") ||
    t.includes("book now") ||
    t.includes("book this room") ||
    /\b(king|queen|twin|suite)\b/.test(t);

  const priceish =
    t.includes("per night") ||
    t.includes("avg/night") ||
    t.includes("avg per night") ||
    t.includes("nightly") ||
    t.includes("rate details") ||
    t.includes("total for stay");

  const urlish =
    h.includes("/book/reservation/rooms") ||
    h.includes("ctyhocn") ||
    h.includes("groupcode");

  return roomishPhrase && priceish && urlish;
}

export function parseAvailability(html: string): { available: boolean; roomCount?: number } {
  const scrubbed = stripExecutableHtml(html);
  const normalizedHtml = scrubbed.toLowerCase().replace(/\s+/g, " ");

  const voucherIndicators = [
    "amex krisflyer ascend voucher rates",
    "amex krisflyer ascend voucher rate",
    "krisflyer complimentary night",
    "amex krisflyer",
    "krisflyer ascend",
    "voucher rate",
    "voucher rates",
    "krisflyer complimentary",
    "complimentary night",
    "ascend voucher",
    "amex krisflyer ascend",
    "select a room",
    "choose a room",
    "room types",
    "special rate",
    "krisflyer ascend voucher",
    "average nightly rate",
    "avg/night",
    "room & rate",
    "rooms & rates",
    "rate plan",
    "rate details",
    "guest room",
    "book this room",
  ];

  const hasVoucherRates = voucherIndicators.some((indicator) =>
    normalizedHtml.includes(indicator.toLowerCase())
  );

  const roomCountPatterns = [
    /(\d+)\s+rooms?\s+found\b/i,
    /(\d+)\s+rooms?\s+available\b/i,
    /\bfound\s+(\d+)\s+rooms?\b/i,
    /\bavailable\s+(\d+)\s+rooms?\b/i,
    /\bshowing\s+(\d+)\s+rooms?\b/i,
    /\b(\d+)\s+rooms?\b(?=[\s\S]{0,80}\b(voucher|krisflyer|amex)\b)/i,
    /\bwe're\s+showing\s+(\d+)\s+rooms?\b/i,
    /\bwe\u2019re\s+showing\s+(\d+)\s+rooms?\b/i,
    /\b(\d+)\s+room\s+types?\b/i,
    /(\d+)\s+rooms?[.,]?\s*found/i,
    /found[.:]?\s*(\d+)\s+rooms?/i,
    /\b(\d+)\s+rooms?\s+match/i,
    /\b(\d+)\s+results?\b/i,
    /\b(\d+)\s+room\s+options?\b/i,
    /\bshowing\s+(\d+)\b/i,
    /\b(\d+)\s+rates?\s+available\b/i,
    /\b(\d+)\s+rooms?\s+for\s+your\s+search\b/i,
    /\b(\d+)\s+rooms?\s+match(?:es)?\s+your\s+criteria\b/i,
  ];

  const extractRoomCount = (): number | undefined => {
    for (const pattern of roomCountPatterns) {
      const match = scrubbed.match(pattern);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!Number.isNaN(n) && n > 0) return n;
      }
    }
    return undefined;
  };

  const hasUnavailable = UNAVAILABLE_PHRASES.some((indicator) =>
    normalizedHtml.includes(indicator.toLowerCase())
  );

  if (hasUnavailable) {
    const countWhenUnavailable = extractRoomCount();
    console.log("✗ Unavailability / no-rate indicator found");
    return {
      available: false,
      roomCount: countWhenUnavailable ?? 0,
    };
  }

  if (hasVoucherRates) {
    console.log("✓ Voucher rates indicator found");
    const roomCount = extractRoomCount();
    if (roomCount !== undefined) {
      console.log(`✓ Room count found: ${roomCount}`);
      return { available: true, roomCount };
    }
    console.log("✓ Voucher rates found but no specific count, assuming 1+ rooms");
    return { available: true, roomCount: 1 };
  }

  if (looksLikeBookableRoomListing(scrubbed.replace(/<[^>]+>/g, " "), scrubbed)) {
    const roomCount = extractRoomCount();
    console.log("✓ Bookable room listing detected (non-voucher heuristics)");
    return { available: true, roomCount: roomCount ?? 1 };
  }

  console.log("⚠ No clear indicators found in HTML, assuming unavailable");
  const htmlSample = scrubbed.substring(0, 500).replace(/\n/g, " ").substring(0, 200);
  console.log("HTML sample:", htmlSample + "...");

  return { available: false, roomCount: 0 };
}

async function checkWithBrowserlessFunction(
  url: string,
  token: string,
): Promise<{ available: boolean; roomCount?: number; meta?: Record<string, unknown> }> {
  const browserlessUrl = `https://production-sfo.browserless.io/function?token=${encodeURIComponent(token)}&stealth=true`;

  const escapedUrl = url.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "");

  const puppeteerScript = `
export default async ({ page }) => {
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });
  await page.goto('${escapedUrl}', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 14000));
  try {
    await page.waitForFunction(
      () => {
        const t = document.body && document.body.innerText ? document.body.innerText : '';
        const u = t.toLowerCase();
        return (
          t.length > 1200 &&
          (u.includes('krisflyer') ||
            u.includes('voucher') ||
            u.includes('room') ||
            u.includes('hilton') ||
            u.includes('singapore'))
        );
      },
      { timeout: 60000 },
    );
  } catch (_) {
    /* continue with whatever loaded */
  }
  await new Promise((r) => setTimeout(r, 5000));
  try {
    await page.evaluate(() => {
      window.scrollTo(0, Math.min(document.body.scrollHeight, 2400));
    });
    await new Promise((r) => setTimeout(r, 3000));
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 1500));
  } catch (_) {}
  const domHint = await page.evaluate(() => {
    const body = document.body;
    if (!body) return { roomish: 0, rateish: 0, headingish: 0, rateCardish: 0 };
    const roomish = body.querySelectorAll(
      '[class*="room-card"], [class*="RoomCard"], [data-testid*="room"], [data-qa*="room"], li[class*="room"], article[class*="room"], [class*="RoomType"], [class*="roomtype"], [class*="Room-type"]',
    ).length;
    const rateish = body.querySelectorAll(
      '[class*="rate"], [data-testid*="rate"], button[class*="select"], [class*="RatePlan"], [class*="pricing"], button[class*="book"], a[class*="book"]',
    ).length;
    const headingish = body.querySelectorAll('h2, h3, [role="heading"]').length;
    const rateCardish = body.querySelectorAll(
      '[class*="rate-card"], [class*="RateCard"], [class*="room-rate"], [data-testid*="rate-card"]',
    ).length;
    return { roomish, rateish, headingish, rateCardish };
  });
  const innerText = await page.evaluate(() => document.body ? document.body.innerText : '');
  const html = await page.content();
  const title = await page.title();
  return {
    data: { title, innerText, htmlLength: html.length, html, domHint },
    type: 'application/json',
  };
};
`;

  const response = await fetch(browserlessUrl, {
    method: "POST",
    headers: { "Content-Type": "application/javascript" },
    body: puppeteerScript,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browserless function failed: ${response.status} - ${errorText}`);
  }

  const payload = await response.json();
  const inner = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const html = typeof inner?.html === "string" ? inner.html : "";
  const innerText = typeof inner?.innerText === "string" ? inner.innerText : "";
  const domHint = inner?.domHint as
    | { roomish?: number; rateish?: number; headingish?: number; rateCardish?: number }
    | undefined;
  const title = typeof inner?.title === "string" ? inner.title : "";
  const htmlLength = typeof inner?.htmlLength === "number" ? inner.htmlLength : html.length;
  const combined = innerText.length > html.length / 4 ? `${innerText}\n${html}` : html;

  if (!combined || combined.length < 200) {
    throw new Error("Browserless returned empty content");
  }

  const parsed = parseAvailability(combined);
  const meta = {
    provider: "browserless",
    title,
    innerTextLength: innerText.length,
    htmlLength,
    domHint,
  };
  if (parsed.available) return { ...parsed, meta };

  const r = domHint?.roomish ?? 0;
  const rt = domHint?.rateish ?? 0;
  const hd = domHint?.headingish ?? 0;
  const rc = domHint?.rateCardish ?? 0;
  const domSuggestsRooms =
    r >= 2 ||
    rt >= 4 ||
    rc >= 2 ||
    (r >= 1 && rt >= 2 && hd >= 8) ||
    (r >= 1 && rc >= 1) ||
    (rt >= 3 && hd >= 5);

  if (domSuggestsRooms && !textImpliesUnavailable(innerText)) {
    const roomCount = r >= 2 ? r : rc >= 2 ? rc : Math.min(Math.max(rt, 1), 30);
    return { available: true, roomCount, meta };
  }

  if (looksLikeBookableRoomListing(innerText, html) && !textImpliesUnavailable(innerText)) {
    const recount = parseAvailability(combined);
    if (recount.available) return { ...recount, meta };
    return { available: true, roomCount: 1, meta };
  }

  return { ...parsed, meta };
}

async function tryScraperApiForAvailability(
  hiltonUrl: string,
  dateLabel: string,
  scraperApiKey: string,
): Promise<{ available: boolean; roomCount?: number; meta?: Record<string, unknown> } | null> {
  const ua =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  const fetchFast = (premium: boolean): Promise<Response> => {
    const fastParams = new URLSearchParams({
      api_key: scraperApiKey,
      url: hiltonUrl,
      render: "false",
      country_code: "sg",
    });
    if (premium) fastParams.set("premium", "true");
    return fetch(`https://api.scraperapi.com/?${fastParams.toString()}`, {
      method: "GET",
      headers: { "User-Agent": ua },
    });
  };

  try {
    console.log(`${dateLabel} ScraperAPI: fast pass`);
    let response = await fetchFast(true);
    if (response.status === 403) {
      console.log(`${dateLabel} ScraperAPI fast premium 403, retry without premium`);
      response = await fetchFast(false);
    }

    if (response.ok) {
      const html = await response.text();
      console.log(`${dateLabel} ScraperAPI fast HTML length: ${html.length}`);
      const fastResult = parseAvailability(html);
      if (fastResult.available) {
        console.log(`${dateLabel} ScraperAPI fast parse:`, fastResult);
        return { ...fastResult, meta: { provider: "scraperapi", mode: "fast", htmlLength: html.length } };
      }
      const strippedText = stripExecutableHtml(html).replace(/<[^>]+>/g, " ").slice(0, 80000);
      if (looksLikeBookableRoomListing(strippedText, html)) {
        const n = fastResult.roomCount && fastResult.roomCount > 0 ? fastResult.roomCount : 1;
        console.log(`${dateLabel} ScraperAPI fast: bookable listing heuristic, roomCount=${n}`);
        return {
          available: true,
          roomCount: n,
          meta: { provider: "scraperapi", mode: "fast", htmlLength: html.length, heuristic: "bookableListing" },
        };
      }
      if (html.includes("Amex Krisflyer") || html.toLowerCase().includes("voucher rates")) {
        console.log(`${dateLabel} ScraperAPI fast parse (voucher copy):`, fastResult);
        return fastResult.available
          ? { ...fastResult, meta: { provider: "scraperapi", mode: "fast", htmlLength: html.length } }
          : { available: true, roomCount: 1, meta: { provider: "scraperapi", mode: "fast", htmlLength: html.length } };
      }
    } else {
      console.log(`${dateLabel} ScraperAPI fast status: ${response.status}`);
    }

    console.log(`${dateLabel} ScraperAPI: JS render pass`);
    const jsParams = new URLSearchParams({
      api_key: scraperApiKey,
      url: hiltonUrl,
      render: "true",
      country_code: "sg",
      wait_for_selector: '.room-card, [data-room-type], .rate-display, .room-rate, [class*="room"]',
      wait: "12000",
      session_number: String(Math.floor(Math.random() * 1000)),
    });
    jsParams.set("premium", "true");

    const jsTimeoutMs = 55000;
    let jsResponse = await Promise.race([
      fetch(`https://api.scraperapi.com/?${jsParams.toString()}`, {
        method: "GET",
        headers: { "User-Agent": ua },
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error("JS scraping timeout")), jsTimeoutMs)
      ),
    ]);

    if (jsResponse.status === 403) {
      jsParams.delete("premium");
      jsResponse = await Promise.race([
        fetch(`https://api.scraperapi.com/?${jsParams.toString()}`, {
          method: "GET",
          headers: { "User-Agent": ua },
        }),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error("JS scraping timeout")), jsTimeoutMs)
        ),
      ]);
    }

    if (!jsResponse.ok) {
      console.log(`${dateLabel} ScraperAPI JS failed: ${jsResponse.status}`);
      return null;
    }

    const jsHtml = await jsResponse.text();
    console.log(`${dateLabel} ScraperAPI JS HTML length: ${jsHtml.length}`);
    const jsResult = parseAvailability(jsHtml);
    if (jsResult.available) {
      console.log(`${dateLabel} ScraperAPI JS parse:`, jsResult);
      return { ...jsResult, meta: { provider: "scraperapi", mode: "js", htmlLength: jsHtml.length } };
    }
    const jsStripped = stripExecutableHtml(jsHtml).replace(/<[^>]+>/g, " ").slice(0, 80000);
    if (looksLikeBookableRoomListing(jsStripped, jsHtml)) {
      const n = jsResult.roomCount && jsResult.roomCount > 0 ? jsResult.roomCount : 1;
      console.log(`${dateLabel} ScraperAPI JS: bookable listing heuristic, roomCount=${n}`);
      return {
        available: true,
        roomCount: n,
        meta: { provider: "scraperapi", mode: "js", htmlLength: jsHtml.length, heuristic: "bookableListing" },
      };
    }
    console.log(`${dateLabel} ScraperAPI JS parse:`, jsResult);
    return { ...jsResult, meta: { provider: "scraperapi", mode: "js", htmlLength: jsHtml.length } };
  } catch (e) {
    console.log(`${dateLabel} ScraperAPI error: ${(e as Error).message}`);
    return null;
  }
}

type ProviderOutcome = {
  source: "browserless" | "scraperapi";
  available: boolean;
  roomCount?: number;
  error?: string;
  skipped?: boolean;
  meta?: Record<string, unknown>;
};

function mergeAvailabilityOutcomes(outcomes: ProviderOutcome[]): { available: boolean; roomCount?: number } {
  const ok = outcomes.filter((o) => !o.error && !o.skipped);
  const withRooms = ok.filter((o) => o.available && (o.roomCount ?? 0) > 0);
  if (withRooms.length) {
    withRooms.sort((a, b) => (b.roomCount ?? 0) - (a.roomCount ?? 0));
    const w = withRooms[0];
    console.log(`Merged availability: using ${w.source} with roomCount=${w.roomCount}`);
    return { available: true, roomCount: w.roomCount };
  }
  const anyAvail = ok.find((o) => o.available);
  if (anyAvail) {
    console.log(`Merged availability: ${anyAvail.source} available without room count, assuming 1`);
    return { available: true, roomCount: anyAvail.roomCount ?? 1 };
  }
  return { available: false, roomCount: 0 };
}

export async function checkSingleDateAvailability(
  requestData: AvailabilityRequest,
  hotelCode: string,
): Promise<AvailabilityResult> {
  const hiltonUrl = constructHiltonUrl(requestData, hotelCode);
  console.log(`Checking ${requestData.arrivalDate}: ${hiltonUrl}`);

  const scraperApiKey = Deno.env.get("SCRAPERAPI_KEY");
  const browserlessToken = Deno.env.get("BROWSERLESS_API_KEY");

  if (!scraperApiKey && !browserlessToken) {
    return {
      date: requestData.arrivalDate!,
      available: false,
      roomCount: 0,
      bookingUrl: hiltonUrl,
    };
  }

  const label = requestData.arrivalDate!;
  const tasks: Promise<ProviderOutcome>[] = [];

  if (browserlessToken) {
    tasks.push(
      (async () => {
        try {
          const r = await checkWithBrowserlessFunction(hiltonUrl, browserlessToken);
          return { source: "browserless" as const, ...r };
        } catch (e) {
          return {
            source: "browserless" as const,
            available: false,
            roomCount: 0,
            error: (e as Error).message,
          };
        }
      })(),
    );
  }

  if (scraperApiKey) {
    tasks.push(
      (async () => {
        const r = await tryScraperApiForAvailability(hiltonUrl, label, scraperApiKey);
        if (!r) {
          console.log(`${label} ScraperAPI: no conclusive result (skipped in merge)`);
          return {
            source: "scraperapi" as const,
            available: false,
            roomCount: 0,
            skipped: true,
          };
        }
        return { source: "scraperapi" as const, ...r };
      })(),
    );
  }

  console.log(`${label} running ${tasks.length} provider(s) in parallel`);
  const settled = await Promise.all(tasks);
  for (const s of settled) {
    if (s.error) console.log(`${label} ${s.source} error: ${s.error}`);
    else console.log(`${label} ${s.source} result:`, { available: s.available, roomCount: s.roomCount });
  }

  const merged = mergeAvailabilityOutcomes(settled);

  return {
    date: requestData.arrivalDate!,
    available: merged.available,
    roomCount: merged.roomCount,
    bookingUrl: hiltonUrl,
    debug: requestData.includeDebug ? { providerOutcomes: settled, merged } : undefined,
  };
}
