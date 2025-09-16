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

    const { testUrl } = await req.json();
    const targetUrl = testUrl || 'https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=SINGI&arrivalDate=2025-10-15&departureDate=2025-10-16&groupCode=ZKFA25&room1NumAdults=1&cid=OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book';

    console.log('Testing ScraperAPI with URL:', targetUrl);

    // Test different configs one by one
    const configs = [
      {
        name: "Basic",
        params: {
          'api_key': scraperApiKey,
          'url': targetUrl,
          'render': 'false',
          'country_code': 'sg'
        }
      },
      {
        name: "Premium",
        params: {
          'api_key': scraperApiKey,
          'url': targetUrl,
          'render': 'false',
          'country_code': 'sg',
          'premium': 'true'
        }
      },
      {
        name: "JS Rendering",
        params: {
          'api_key': scraperApiKey,
          'url': targetUrl,
          'render': 'true',
          'country_code': 'sg',
          'premium': 'true',
          'wait': '2000'
        }
      }
    ];

    const results = [];

    for (const config of configs) {
      console.log(`Testing ${config.name}...`);
      const startTime = Date.now();
      
      try {
        const scraperParams = new URLSearchParams(config.params);
        const scraperUrl = `https://api.scraperapi.com/?${scraperParams.toString()}`;
        
        const response = await fetch(scraperUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        const duration = Date.now() - startTime;
        
        if (response.ok) {
          const html = await response.text();
          const hasVoucherRates = html.includes('Amex Krisflyer Ascend Voucher rates');
          const hasRoomCount = html.match(/(\d+)\s+rooms found/);
          const hasUnavailable = html.includes('Your selected rates are unavailable');
          
          results.push({
            config: config.name,
            success: true,
            duration: `${duration}ms`,
            htmlLength: html.length,
            hasVoucherRates,
            hasRoomCount: hasRoomCount ? hasRoomCount[1] : null,
            hasUnavailable,
            // Include first 500 chars for debugging
            htmlPreview: html.substring(0, 500)
          });
          
          console.log(`${config.name} SUCCESS: ${duration}ms, HTML: ${html.length} chars`);
        } else {
          const errorText = await response.text();
          results.push({
            config: config.name,
            success: false,
            duration: `${duration}ms`,
            error: `${response.status}: ${errorText}`
          });
          console.log(`${config.name} FAILED: ${response.status}`);
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          config: config.name,
          success: false,
          duration: `${duration}ms`,
          error: error.message
        });
        console.log(`${config.name} ERROR: ${error.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      targetUrl,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
