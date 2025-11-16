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
    const jigsawstackApiKey = Deno.env.get('JIGSAWSTACK_API_KEY');
    if (!jigsawstackApiKey) {
      throw new Error('JIGSAWSTACK_API_KEY not configured');
    }

    const { hotelCode, date, groupCode = 'ZKFA25' }: TestRequest = await req.json();
    console.log(`Testing JigsawStack for ${hotelCode} on ${date}`);

    // Construct Hilton URL
    const arrivalDate = date;
    const departureDate = new Date(date);
    departureDate.setDate(departureDate.getDate() + 1);
    const departureDateStr = departureDate.toISOString().split('T')[0];

    const hiltonUrl = `https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=${hotelCode}&arrivalDate=${arrivalDate}&departureDate=${departureDateStr}&groupCode=${groupCode}&room1NumAdults=1&cid=OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book`;

    console.log('Hilton URL:', hiltonUrl);

    // Call JigsawStack API
    const startTime = Date.now();
    const response = await fetch('https://api.jigsawstack.com/v1/ai/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': jigsawstackApiKey,
      },
      body: JSON.stringify({
        url: hiltonUrl,
        element_prompts: [
          'Extract whether hotel rooms are available (yes/no)',
          'Extract the number of rooms available if shown',
          'Extract any text mentioning Amex Krisflyer or voucher rates',
          'Extract any error messages or unavailability notices',
        ],
        proxy: true,
        wait_for: 'networkidle',
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 30000,
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`JigsawStack response: ${response.status} (${duration}ms)`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`JigsawStack failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('JigsawStack result:', JSON.stringify(result, null, 2));

    // Analyze the results
    const analysis = {
      success: result.success,
      duration_ms: duration,
      page_title: result.meta?.title || 'Unknown',
      content_length: result.context?.length || 0,
      tokens_used: result._usage?.tokens || 0,

      // Check for bot detection indicators
      is_error_page: result.meta?.title?.includes('Page Reference Code') || false,
      has_voucher_text: result.context?.toLowerCase().includes('krisflyer') ||
                        result.context?.toLowerCase().includes('voucher') || false,
      has_amex_text: result.context?.toLowerCase().includes('amex') || false,

      // Extracted data
      extracted_data: result.data || [],

      // Full context (first 1000 chars for debugging)
      context_preview: result.context?.substring(0, 1000) || '',

      // Interpretation
      likely_bypassed_bot_detection: false,
      likely_available: false,
    };

    // Determine if we bypassed bot detection
    analysis.likely_bypassed_bot_detection =
      !analysis.is_error_page &&
      analysis.content_length > 50000 &&
      (analysis.has_voucher_text || analysis.has_amex_text);

    // Try to determine availability from extracted data
    const availabilityData = result.data?.find((item: any) =>
      item.element?.includes('available')
    );

    if (availabilityData?.result) {
      const resultLower = availabilityData.result.toLowerCase();
      analysis.likely_available =
        resultLower.includes('yes') ||
        resultLower.includes('available') ||
        /\d+\s*rooms?/.test(resultLower);
    }

    // Final verdict
    const verdict = {
      test_passed: analysis.likely_bypassed_bot_detection,
      can_determine_availability: analysis.likely_available !== null,
      recommendation: analysis.likely_bypassed_bot_detection
        ? 'PROMISING - Proceed to Phase 2 testing'
        : 'FAILED - Bot detection not bypassed',
    };

    return new Response(JSON.stringify({
      service: 'JigsawStack',
      test_url: hiltonUrl,
      analysis,
      verdict,
      raw_response: result,
    }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test-jigsawstack:', error);
    return new Response(JSON.stringify({
      service: 'JigsawStack',
      error: error.message,
      recommendation: 'FAILED - Error during testing',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
