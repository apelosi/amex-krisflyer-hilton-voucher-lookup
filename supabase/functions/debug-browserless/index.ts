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

    // Test URL for SINGI hotel with known availability
    const hiltonUrl = 'https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=SINGI&arrivalDate=2025-11-12&departureDate=2025-11-13&groupCode=ZKFA25&room1NumAdults=1&cid=OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book';

    console.log('Testing Browserless with URL:', hiltonUrl);

    const browserlessUrl = `https://production-sfo.browserless.io/content?token=${browserlessToken}`;

    console.log('Calling Browserless with networkidle2 wait...');
    const startTime = Date.now();

    const response = await fetch(browserlessUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: hiltonUrl,
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 30000,
        },
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`Response received: ${response.status} (${duration}ms)`);

    if (!response.ok) {
      throw new Error(`Browserless failed: ${response.status} - ${await response.text()}`);
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
      'No rooms available',
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

        // Count occurrences
        const regex = new RegExp(lowerTerm, 'gi');
        const matches = html.match(regex) || [];

        // Get surrounding context for first few matches
        const samples: string[] = [];
        let lastIndex = 0;
        for (let i = 0; i < Math.min(3, matches.length); i++) {
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

    console.log('Found terms:', foundTerms.join(', ') || 'NONE');

    // Look for specific HTML patterns
    const htmlStructure = {
      hasRoomCard: html.includes('room-card') || html.includes('roomCard') || html.includes('RoomCard'),
      hasRateDisplay: html.includes('rate-display') || html.includes('rateDisplay') || html.includes('RateDisplay'),
      hasRoomType: html.includes('room-type') || html.includes('roomType') || html.includes('RoomType'),
      hasDataAttributes: html.includes('data-room') || html.includes('data-rate') || html.includes('data-availability'),
      hasReactRoot: html.includes('__NEXT_DATA__') || html.includes('reactRoot'),
      scriptTags: (html.match(/<script/gi) || []).length,
      divCount: (html.match(/<div/gi) || []).length,
      hasLoadingIndicator: html.includes('loading') || html.includes('Loading'),
      hasErrorMessage: html.includes('error') || html.includes('Error') || html.includes('ERROR')
    };

    // Extract title and meta description
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'No title found';

    // Look for JSON-LD or other data structures
    const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    const hasStructuredData = jsonLdBlocks && jsonLdBlocks.length > 0;

    return new Response(JSON.stringify({
      success: true,
      diagnostics: {
        url: hiltonUrl,
        browserlessStatus: response.status,
        duration: `${duration}ms`,
        htmlLength: html.length,
        pageTitle: title,
        foundTerms: foundTerms.length > 0 ? foundTerms : ['NONE FOUND'],
        termCount: foundTerms.length,
        termDetails,
        htmlStructure,
        hasStructuredData,
        // Sample of HTML around body tag
        bodySample: html.substring(
          Math.max(0, html.indexOf('<body')),
          Math.min(html.length, html.indexOf('<body') + 2000)
        ).replace(/\s+/g, ' ').substring(0, 1000) + '...',
        htmlHead: html.substring(0, 800) + '...'
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