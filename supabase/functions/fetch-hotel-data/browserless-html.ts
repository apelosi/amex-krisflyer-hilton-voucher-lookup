const AMEX_LANDING = "https://apac.hilton.com/amexkrisflyer";

export { AMEX_LANDING };

export async function fetchHtmlViaBrowserless(url: string, token: string): Promise<string> {
  const browserlessUrl =
    `https://production-sfo.browserless.io/function?token=${encodeURIComponent(token)}&stealth=true`;
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "");
  const script = `
    module.exports = async ({ page }) => {
      await page.setViewport({ width: 1280, height: 900 });
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
      await page.goto('${esc(url)}', { waitUntil: 'networkidle2', timeout: 90000 });
      await new Promise((r) => setTimeout(r, 5000));
      const html = await page.content();
      return { html };
    };
  `;
  const res = await fetch(browserlessUrl, {
    method: "POST",
    headers: { "Content-Type": "application/javascript" },
    body: script,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Browserless fetch-hotel-data failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  if (typeof data === "string") return data;
  if (data && typeof (data as { html?: string }).html === "string") {
    return (data as { html: string }).html;
  }
  throw new Error("Browserless returned unexpected payload");
}
