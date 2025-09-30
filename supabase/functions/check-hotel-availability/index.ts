import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AvailabilityRequest {
  creditCard: string;
  voucherCode: string;
  destination: string;
  hotel: string;
  dateRange?: string[]; // Array of dates to check
  arrivalDate?: string; // Legacy single date support
  voucherExpiry: string;
  groupCode: string;
}

interface AvailabilityResult {
  date: string;
  available: boolean;
  roomCount?: number;
  bookingUrl?: string;
}

// Helper function to construct Hilton booking URL
function constructHiltonUrl(requestData: AvailabilityRequest, hotelCode: string): string {
  const baseUrl = 'https://www.hilton.com/en/book/reservation/rooms/';
  
  // Calculate departure date (day after arrival)
  const arrivalDate = new Date(requestData.arrivalDate);
  const departureDate = new Date(arrivalDate);
  departureDate.setDate(departureDate.getDate() + 1);
  
  const params = new URLSearchParams({
    'ctyhocn': hotelCode,
    'arrivalDate': requestData.arrivalDate,
    'departureDate': departureDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    'groupCode': requestData.groupCode,
    'room1NumAdults': '1',
    'cid': 'OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book'
  });
  
  return `${baseUrl}?${params.toString()}`;
}

// Helper function to parse HTML and determine availability
function parseAvailability(html: string): { available: boolean; roomCount?: number } {
  // Normalize the HTML to handle potential whitespace/encoding issues
  const normalizedHtml = html.toLowerCase().replace(/\s+/g, ' ');

  // Check for voucher rates indicator - try multiple variations
  const voucherIndicators = [
    'amex krisflyer ascend voucher rate',
    'krisflyer complimentary night',
    'amex krisflyer',
    'voucher rate'
  ];

  const hasVoucherRates = voucherIndicators.some(indicator =>
    normalizedHtml.includes(indicator.toLowerCase())
  );

  if (hasVoucherRates) {
    console.log('✓ Voucher rates indicator found');

    // Look for room count in various formats
    const roomCountPatterns = [
      /(\d+)\s+rooms?\s+found/i,
      /(\d+)\s+rooms?\s+available/i,
      /found\s+(\d+)\s+rooms?/i,
      /available\s+(\d+)\s+rooms?/i,
      /showing\s+(\d+)\s+rooms?/i
    ];

    for (const pattern of roomCountPatterns) {
      const match = html.match(pattern);
      if (match) {
        const roomCount = parseInt(match[1], 10);
        console.log(`✓ Room count found: ${roomCount}`);
        return { available: true, roomCount };
      }
    }

    // If voucher rates are shown but no specific count found, assume at least 1 room
    console.log('✓ Voucher rates found but no specific count, assuming 1+ rooms');
    return { available: true, roomCount: 1 };
  }

  // Check for unavailable rates indicators
  const unavailableIndicators = [
    'your selected rates are unavailable',
    'no rooms available',
    'unavailable',
    'sold out'
  ];

  const hasUnavailable = unavailableIndicators.some(indicator =>
    normalizedHtml.includes(indicator.toLowerCase())
  );

  if (hasUnavailable) {
    console.log('✗ Unavailability indicator found');
    return { available: false, roomCount: 0 };
  }

  // If neither indicator is found, log what we did find and assume unavailable
  console.log('⚠ No clear indicators found in HTML, assuming unavailable');

  // Log a sample of the HTML for debugging
  const sampleLength = 500;
  const htmlSample = html.substring(0, sampleLength).replace(/\n/g, ' ').substring(0, 200);
  console.log('HTML sample:', htmlSample + '...');

  return { available: false, roomCount: 0 };
}


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const scraperApiKey = Deno.env.get('SCRAPERAPI_KEY');
    if (!scraperApiKey) {
      throw new Error('SCRAPERAPI_KEY not configured. Please set your ScraperAPI key in the environment variables.');
    }

    const requestData: AvailabilityRequest = await req.json();
    console.log('Checking availability for:', requestData);
    
    // Note: Voucher validation is handled in the frontend before calling this function
    console.log('Proceeding with hotel availability check...');

    // Get hotel data to validate the hotel code
    const { data: hotelData, error: hotelError } = await supabase.functions.invoke('fetch-hotel-data');

    if (hotelError || !hotelData?.success) {
      throw new Error('Failed to fetch hotel data for hotel code validation');
    }

    // Validate that the provided hotel code exists in the hotel codes mapping
    const hotelCode = requestData.hotel; // The hotel parameter is already the hotel code

    if (!hotelData.hotelCodes || !hotelData.hotelCodes[hotelCode]) {
      throw new Error(`Hotel code "${hotelCode}" not found in available hotels`);
    }
    
    const hotelName = hotelData.hotelCodes[hotelCode];
    console.log(`Using hotelCode: ${hotelCode} for hotel: ${hotelName}`);

    // Handle multiple dates with parallel processing - check ALL dates
    const datesToCheck = requestData.dateRange || [requestData.arrivalDate];
    console.log(`Processing ALL ${datesToCheck.length} dates with parallel processing...`);

    // Process dates in parallel batches for performance
    const batchSize = 10; // Increased batch size for better performance
    const results: AvailabilityResult[] = [];
    
    for (let i = 0; i < datesToCheck.length; i += batchSize) {
      const batch = datesToCheck.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(datesToCheck.length/batchSize)}: ${batch.length} dates`);
      
      const batchPromises = batch.map(async (date) => {
        const singleDateRequest = { ...requestData, arrivalDate: date };
        return await checkSingleDateAvailability(singleDateRequest, hotelCode, scraperApiKey);
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.log(`Failed to check date ${batch[index]}: ${result.reason}`);
          // Add failed result as unavailable
          results.push({
            date: batch[index],
            available: false,
            roomCount: 0,
            bookingUrl: constructHiltonUrl({ ...requestData, arrivalDate: batch[index] }, hotelCode)
          });
        }
      });
    }

    console.log(`Completed availability check: ${results.length} results`);

    return new Response(JSON.stringify({
      success: true,
      availability: results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in check-hotel-availability function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      availability: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to check availability for a single date using FAST approach
async function checkSingleDateAvailability(
  requestData: AvailabilityRequest,
  hotelCode: string,
  scraperApiKey: string
): Promise<AvailabilityResult> {

  const hiltonUrl = constructHiltonUrl(requestData, hotelCode);
  console.log(`Checking ${requestData.arrivalDate}: ${hiltonUrl}`);

  // Check if Browserless is available - use it FIRST for better reliability
  const browserlessToken = Deno.env.get('BROWSERLESS_API_KEY');
  if (browserlessToken) {
    console.log(`${requestData.arrivalDate} using Browserless.io (primary method)`);
    try {
      const browserlessResult = await checkWithBrowserless(hiltonUrl, browserlessToken);
      return {
        date: requestData.arrivalDate!,
        available: browserlessResult.available,
        roomCount: browserlessResult.roomCount,
        bookingUrl: hiltonUrl
      };
    } catch (browserlessError) {
      console.log(`${requestData.arrivalDate} Browserless error: ${browserlessError.message}, falling back to ScraperAPI`);
    }
  }

  try {
    // Fallback to ScraperAPI
    console.log(`${requestData.arrivalDate} trying ScraperAPI`);

    // Try FAST approach first - no JavaScript rendering, just basic scraping
    const fastParams = new URLSearchParams({
      'api_key': scraperApiKey,
      'url': hiltonUrl,
      'render': 'false', // NO JavaScript rendering for speed
      'country_code': 'sg',
      'premium': 'true'
    });

    const fastScraperUrl = `https://api.scraperapi.com/?${fastParams.toString()}`;
    
    // Much shorter timeout for fast approach
    const timeoutMs = 10000; // 10 seconds only
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Fast scraping timeout')), timeoutMs);
    });

    const startTime = Date.now();
    const response = await Promise.race([
      fetch(fastScraperUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }),
      timeoutPromise
    ]) as Response;

    const duration = Date.now() - startTime;
    console.log(`${requestData.arrivalDate} fast scraping: ${response.status} (${duration}ms)`);

    if (response.ok) {
      const html = await response.text();
      console.log(`${requestData.arrivalDate} fast HTML length: ${html.length}`);

      // Try to parse the fast HTML first
      const fastResult = parseAvailability(html);
      
      // If we found voucher rates in the fast result, return it
      if (html.includes('Amex Krisflyer') || html.includes('voucher rates') || fastResult.available) {
        console.log(`${requestData.arrivalDate} FAST SUCCESS:`, fastResult);
        return {
          date: requestData.arrivalDate!,
          available: fastResult.available,
          roomCount: fastResult.roomCount,
          bookingUrl: hiltonUrl
        };
      }
      
      console.log(`${requestData.arrivalDate} fast result incomplete, falling back to JS rendering`);
    }

    // Fallback to JavaScript rendering only if fast approach didn't work
    console.log(`${requestData.arrivalDate} trying JS rendering fallback with network idle wait`);

    // Use ScraperAPI's advanced features for better reliability
    const jsParams = new URLSearchParams({
      'api_key': scraperApiKey,
      'url': hiltonUrl,
      'render': 'true',
      'country_code': 'sg',
      'premium': 'true',
      'wait_for_selector': '.room-card, [data-room-type], .rate-display, .room-rate, [class*="room"]', // Wait for room elements
      'wait': '10000', // Increased to 10 seconds as backup
      'session_number': Math.floor(Math.random() * 1000) // Randomize to avoid caching issues
    });

    const jsScraperUrl = `https://api.scraperapi.com/?${jsParams.toString()}`;
    const jsTimeoutMs = 40000; // 40 seconds to account for 10s wait + processing
    const jsTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('JS scraping timeout')), jsTimeoutMs);
    });

    const jsStartTime = Date.now();
    const jsResponse = await Promise.race([
      fetch(jsScraperUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }),
      jsTimeoutPromise
    ]) as Response;

    const jsDuration = Date.now() - jsStartTime;
    console.log(`${requestData.arrivalDate} JS scraping: ${jsResponse.status} (${jsDuration}ms)`);

    if (!jsResponse.ok) {
      throw new Error(`JS scraping failed: ${jsResponse.status}`);
    }

    const jsHtml = await jsResponse.text();
    console.log(`${requestData.arrivalDate} JS HTML length: ${jsHtml.length}`);

    // Log key search terms found
    const searchTerms = ['amex', 'krisflyer', 'voucher', 'unavailable', 'rooms found'];
    const foundTerms = searchTerms.filter(term =>
      jsHtml.toLowerCase().includes(term)
    );
    console.log(`${requestData.arrivalDate} Found terms:`, foundTerms.join(', ') || 'none');

    const jsResult = parseAvailability(jsHtml);
    console.log(`${requestData.arrivalDate} JS parsing result:`, jsResult);

    return {
      date: requestData.arrivalDate!,
      available: jsResult.available,
      roomCount: jsResult.roomCount,
      bookingUrl: hiltonUrl
    };

  } catch (error) {
    console.log(`${requestData.arrivalDate} ScraperAPI error: ${error.message}`);

    // Return unavailable result for fully failed requests
    return {
      date: requestData.arrivalDate!,
      available: false,
      roomCount: 0,
      bookingUrl: hiltonUrl
    };
  }
}

// Browserless.io with stealth mode using scrape endpoint
async function checkWithBrowserless(
  url: string,
  token: string
): Promise<{ available: boolean; roomCount?: number }> {
  // Use scrape endpoint with stealth enabled
  const browserlessUrl = `https://production-sfo.browserless.io/scrape?token=${token}&stealth=true&blockAds=true`;

  console.log('Using Browserless scrape endpoint with stealth mode');

  // Scrape configuration for maximum stealth
  const response = await fetch(browserlessUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      elements: [{
        selector: 'body',
        timeout: 60000,
      }],
      gotoOptions: {
        waitUntil: 'networkidle2',
        timeout: 60000,
      },
      waitFor: 12000, // Wait 12 seconds after networkidle for JS execution
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browserless failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('Browserless result:', JSON.stringify(result).substring(0, 200));

  // Extract HTML from scrape result
  let html = '';
  if (result.data && Array.isArray(result.data) && result.data.length > 0) {
    // Scrape endpoint returns array of elements
    html = result.data[0].results[0].html || '';
  } else if (typeof result === 'string') {
    // Fallback if it returns plain HTML
    html = result;
  }

  console.log('Browserless HTML length:', html.length);

  if (html.length === 0) {
    throw new Error('Browserless returned empty HTML');
  }

  return parseAvailability(html);
}