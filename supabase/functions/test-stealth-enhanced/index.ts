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

    console.log('Testing enhanced stealth mode with residential proxy support');

    // Use Chrome endpoint with stealth mode
    const browserlessUrl = `https://production-sfo.browserless.io/chrome/content?token=${browserlessToken}&stealth&blockAds`;

    const startTime = Date.now();

    const response = await fetch(browserlessUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        url: hiltonUrl,
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 60000,
        },
        addScriptTag: [{
          content: `
            // Anti-detection measures
            Object.defineProperty(navigator, 'webdriver', {
              get: () => undefined
            });

            window.chrome = {
              runtime: {}
            };

            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
              parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
            );
          `
        }],
        setViewport: {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false,
        },
        setExtraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        setCookie: [{
          name: 'hilton_session',
          value: 'user_' + Date.now(),
          domain: '.hilton.com',
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'Lax'
        }],
        waitFor: 12000,
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`Response: ${response.status} (${duration}ms)`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Browserless failed: ${response.status} - ${errorText}`);
    }

    const html = await response.text();
    console.log(`HTML length: ${html.length} bytes`);

    // Search for key indicators
    const searchTerms = [
      'Amex Krisflyer',
      'amex krisflyer',
      'voucher rate',
      'Voucher Rate',
      'complimentary night',
      'rooms found',
      'room found',
      'unavailable',
      'Unavailable',
      'showing',
      'average price'
    ];

    const foundTerms: string[] = [];
    const termDetails: Record<string, { count: number; samples: string[] }> = {};

    searchTerms.forEach(term => {
      const lowerHtml = html.toLowerCase();
      const lowerTerm = term.toLowerCase();

      if (lowerHtml.includes(lowerTerm)) {
        foundTerms.push(term);

        const regex = new RegExp(lowerTerm, 'gi');
        const matches = html.match(regex) || [];

        const samples: string[] = [];
        let lastIndex = 0;
        for (let i = 0; i < Math.min(2, matches.length); i++) {
          const index = lowerHtml.indexOf(lowerTerm, lastIndex);
          if (index >= 0) {
            const start = Math.max(0, index - 150);
            const end = Math.min(html.length, index + 200);
            samples.push(html.substring(start, end).replace(/\n/g, ' ').replace(/\s+/g, ' '));
            lastIndex = index + 1;
          }
        }

        termDetails[term] = {
          count: matches.length,
          samples
        };
      }
    });

    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'No title found';

    const htmlStructure = {
      hasRoomCard: html.includes('room-card') || html.includes('roomCard'),
      hasRateDisplay: html.includes('rate-display') || html.includes('rateDisplay'),
      hasDataAttributes: html.includes('data-room') || html.includes('data-rate'),
      scriptTags: (html.match(/<script/gi) || []).length,
      divCount: (html.match(/<div/gi) || []).length,
      hasErrorMessage: html.includes('error') || html.includes('Error'),
      hasLoadingIndicator: html.includes('loading') || html.includes('Loading'),
    };

    return new Response(JSON.stringify({
      success: true,
      duration: `${duration}ms`,
      diagnostics: {
        pageTitle: title,
        htmlLength: html.length,
        foundTerms: foundTerms.length > 0 ? foundTerms : ['NONE FOUND'],
        termCount: foundTerms.length,
        termDetails,
        htmlStructure,
        bodySample: html.substring(
          Math.max(0, html.indexOf('<body')),
          Math.min(html.length, html.indexOf('<body') + 1500)
        ).replace(/\s+/g, ' ').substring(0, 1000) + '...',
      }
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