import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  hotelCode: string;
  date: string;
  groupCode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    const { hotelCode, date, groupCode = 'ZKFA25' }: TestRequest = await req.json();
    console.log(`Testing Firecrawl for ${hotelCode} on ${date}`);

    // Construct Hilton URL
    const arrivalDate = date;
    const departureDate = new Date(date);
    departureDate.setDate(departureDate.getDate() + 1);
    const departureDateStr = departureDate.toISOString().split('T')[0];

    const hiltonUrl = `https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=${hotelCode}&arrivalDate=${arrivalDate}&departureDate=${departureDateStr}&groupCode=${groupCode}&room1NumAdults=1&cid=OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book`;

    console.log('Hilton URL:', hiltonUrl);

    // Call Firecrawl API with stealth proxy
    const startTime = Date.now();
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify({
        url: hiltonUrl,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        includeTags: ['div', 'span', 'p', 'h1', 'h2', 'h3'],
        proxy: 'stealth', // Use stealth proxy for anti-bot (costs 5 credits)
        mobile: false,
        skipTlsVerification: false,
        timeout: 30000,
        actions: [
          {
            type: 'wait',
            milliseconds: 5000, // Wait 5 seconds for dynamic content
          },
        ],
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`Firecrawl response: ${response.status} (${duration}ms)`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Firecrawl result keys:', Object.keys(result));

    // Analyze the results
    const markdown = result.data?.markdown || '';
    const html = result.data?.html || '';
    const metadata = result.data?.metadata || {};

    const analysis = {
      success: result.success,
      duration_ms: duration,
      page_title: metadata.title || 'Unknown',
      content_length_markdown: markdown.length,
      content_length_html: html.length,

      // Check for bot detection indicators
      is_error_page: metadata.title?.includes('Page Reference Code') || false,
      has_voucher_text: markdown.toLowerCase().includes('krisflyer') ||
                        markdown.toLowerCase().includes('voucher') ||
                        html.toLowerCase().includes('krisflyer') ||
                        html.toLowerCase().includes('voucher'),
      has_amex_text: markdown.toLowerCase().includes('amex') ||
                     html.toLowerCase().includes('amex'),

      // Search for availability indicators
      has_rooms_found: /\d+\s*rooms?\s*(found|available)/i.test(markdown) ||
                       /\d+\s*rooms?\s*(found|available)/i.test(html),
      has_unavailable_text: markdown.toLowerCase().includes('unavailable') ||
                           markdown.toLowerCase().includes('sold out') ||
                           html.toLowerCase().includes('unavailable') ||
                           html.toLowerCase().includes('sold out'),

      // Markdown preview (first 1500 chars for debugging)
      markdown_preview: markdown.substring(0, 1500),

      // Metadata
      metadata: metadata,

      // Interpretation
      likely_bypassed_bot_detection: false,
      likely_available: null as boolean | null,
    };

    // Determine if we bypassed bot detection
    analysis.likely_bypassed_bot_detection =
      !analysis.is_error_page &&
      analysis.content_length_markdown > 1000 &&
      (analysis.has_voucher_text || analysis.has_amex_text);

    // Try to determine availability
    if (analysis.likely_bypassed_bot_detection) {
      if (analysis.has_rooms_found) {
        analysis.likely_available = true;
      } else if (analysis.has_unavailable_text) {
        analysis.likely_available = false;
      }
    }

    // Final verdict
    const verdict = {
      test_passed: analysis.likely_bypassed_bot_detection,
      can_determine_availability: analysis.likely_available !== null,
      recommendation: analysis.likely_bypassed_bot_detection
        ? 'PROMISING - Proceed to Phase 2 testing'
        : 'FAILED - Bot detection not bypassed',
      credits_used: result.success ? 5 : 0, // Stealth proxy costs 5 credits
    };

    return new Response(JSON.stringify({
      service: 'Firecrawl',
      test_url: hiltonUrl,
      analysis,
      verdict,
      // Include full markdown for manual inspection
      full_markdown: markdown,
    }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test-firecrawl:', error);
    return new Response(JSON.stringify({
      service: 'Firecrawl',
      error: error.message,
      recommendation: 'FAILED - Error during testing',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
