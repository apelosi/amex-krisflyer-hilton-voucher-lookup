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
    const scraperApiKey = Deno.env.get('SCRAPERAPI_KEY');
    if (!scraperApiKey) {
      throw new Error('SCRAPERAPI_KEY not configured');
    }

    // Test URL for SINGI hotel with known availability
    const hiltonUrl = 'https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=SINGI&arrivalDate=2025-11-12&departureDate=2025-11-13&groupCode=ZKFA25&room1NumAdults=1&cid=OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book';

    console.log('Testing ScraperAPI with URL:', hiltonUrl);

    // Try the EXACT same configuration as check-hotel-availability
    const scraperParams = new URLSearchParams({
      'api_key': scraperApiKey,
      'url': hiltonUrl,
      'render': 'true',
      'country_code': 'sg',
      'premium': 'true',
      'wait_for_selector': '.room-card, [data-room-type], .rate-display, .room-rate, [class*="room"]',
      'wait': '10000',
      'session_number': String(Math.floor(Math.random() * 1000))
    });

    const scraperUrl = `https://api.scraperapi.com/?${scraperParams.toString()}`;

    console.log('Calling ScraperAPI with 10s wait...');
    const startTime = Date.now();

    const response = await fetch(scraperUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const duration = Date.now() - startTime;
    console.log(`Response received: ${response.status} (${duration}ms)`);

    if (!response.ok) {
      throw new Error(`ScraperAPI failed: ${response.status}`);
    }

    const html = await response.text();
    console.log(`HTML length: ${html.length} bytes`);

    // Search for key indicators
    const searchTerms = [
      'Amex Krisflyer',
      'amex krisflyer',
      'AMEX KRISFLYER',
      'voucher rate',
      'Voucher Rate',
      'VOUCHER RATE',
      'complimentary night',
      'Complimentary Night',
      'rooms found',
      'room found',
      'unavailable',
      'Unavailable',
      'No rooms available'
    ];

    const foundTerms: string[] = [];
    const termDetails: Record<string, { count: number; samples: string[] }> = {};

    searchTerms.forEach(term => {
      const lowerHtml = html.toLowerCase();
      const lowerTerm = term.toLowerCase();

      if (lowerHtml.includes(lowerTerm)) {
        foundTerms.push(term);

        // Count occurrences
        const regex = new RegExp(lowerTerm, 'gi');
        const matches = html.match(regex) || [];

        // Get surrounding context for first few matches
        const samples: string[] = [];
        let lastIndex = 0;
        for (let i = 0; i < Math.min(3, matches.length); i++) {
          const index = lowerHtml.indexOf(lowerTerm, lastIndex);
          if (index >= 0) {
            const start = Math.max(0, index - 100);
            const end = Math.min(html.length, index + 150);
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

    console.log('Found terms:', foundTerms.join(', ') || 'NONE');

    // Extract first 5000 chars of body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : html;
    const bodySample = bodyContent.substring(0, 5000);

    // Look for specific HTML structures
    const htmlStructure = {
      hasRoomCard: html.includes('room-card') || html.includes('roomCard'),
      hasRateDisplay: html.includes('rate-display') || html.includes('rateDisplay'),
      hasRoomType: html.includes('room-type') || html.includes('roomType'),
      hasDataAttributes: html.includes('data-room') || html.includes('data-rate'),
      hasReactRoot: html.includes('__NEXT_DATA__') || html.includes('reactRoot'),
      hasAngular: html.includes('ng-app') || html.includes('ng-controller'),
      hasVue: html.includes('v-app') || html.includes('vue'),
      scriptTags: (html.match(/<script/gi) || []).length,
      styleTags: (html.match(/<style/gi) || []).length,
      divCount: (html.match(/<div/gi) || []).length
    };

    return new Response(JSON.stringify({
      success: true,
      diagnostics: {
        url: hiltonUrl,
        scraperStatus: response.status,
        duration: `${duration}ms`,
        htmlLength: html.length,
        foundTerms: foundTerms.length > 0 ? foundTerms : ['NONE FOUND'],
        termDetails,
        htmlStructure,
        bodySample: bodySample.substring(0, 1000) + '...',
        // First 500 chars of full HTML for structure inspection
        htmlHead: html.substring(0, 500) + '...',
        // Check if page seems to be a redirect or error
        isLikelyError: html.includes('error') || html.includes('Error') || html.includes('404'),
        isLikelyRedirect: html.includes('redirect') || html.includes('location.href'),
        hasJavaScriptContent: html.length > 50000 // Large HTML suggests JS rendered content
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Debug error:', error);
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