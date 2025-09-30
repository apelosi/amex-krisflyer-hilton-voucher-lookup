import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const browserlessToken = Deno.env.get('BROWSERLESS_API_KEY');
    if (!browserlessToken) {
      throw new Error('BROWSERLESS_API_KEY not configured');
    }

    const hiltonUrl = 'https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=SINGI&arrivalDate=2025-11-12&departureDate=2025-11-13&groupCode=ZKFA25&room1NumAdults=1&cid=OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book';

    // Use Puppeteer script endpoint for maximum control
    const browserlessUrl = `https://production-sfo.browserless.io/function?token=${browserlessToken}`;

    console.log('Testing with Puppeteer script endpoint...');
    const startTime = Date.now();

    // Custom Puppeteer script with stealth
    const puppeteerScript = `
      module.exports = async ({ page, context }) => {
        // Set realistic viewport
        await page.setViewport({ width: 1920, height: 1080 });

        // Set extra HTTP headers to look like real browser
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        });

        // Navigate with networkidle2
        await page.goto('${hiltonUrl}', {
          waitUntil: 'networkidle2',
          timeout: 45000
        });

        // Additional wait for JavaScript to execute
        await page.waitForTimeout(10000);

        // Get the HTML content
        const html = await page.content();

        // Check for key terms
        const terms = [
          'Amex Krisflyer',
          'voucher rate',
          'rooms found',
          'unavailable'
        ];

        const foundTerms = terms.filter(term =>
          html.toLowerCase().includes(term.toLowerCase())
        );

        // Get page title
        const title = await page.title();

        return {
          title,
          htmlLength: html.length,
          foundTerms,
          htmlSample: html.substring(0, 2000)
        };
      };
    `;

    const response = await fetch(browserlessUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/javascript' },
      body: puppeteerScript,
    });

    const duration = Date.now() - startTime;
    console.log(`Response: ${response.status} (${duration}ms)`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Browserless failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      duration: `${duration}ms`,
      result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});