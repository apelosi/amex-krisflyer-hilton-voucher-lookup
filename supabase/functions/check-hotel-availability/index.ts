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
  arrivalDate: string;
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
  // Check for voucher rates indicator
  const voucherRatesIndicator = html.includes('We\'re showing Amex Krisflyer Ascend Voucher rates.');

  if (voucherRatesIndicator) {
    // Look for room count in the specific element
    const roomCountMatch = html.match(/(\d+)\s+rooms found\.\s+We're showing the average price per night\./);
    if (roomCountMatch) {
      const roomCount = parseInt(roomCountMatch[1], 10);
      return { available: true, roomCount };
    }
    // If voucher rates are shown but no specific count, assume at least 1 room
    return { available: true, roomCount: 1 };
  }

  // Check for unavailable rates indicator
  const unavailableIndicator = html.includes('We\'re showing the lowest rate first. Your selected rates are unavailable.');

  if (unavailableIndicator) {
    return { available: false, roomCount: 0 };
  }

  // If neither indicator is found, assume unavailable
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
    
    // Construct the Hilton booking URL
    const hiltonUrl = constructHiltonUrl(requestData, hotelCode);
    console.log(`Scraping URL: ${hiltonUrl}`);
    
    // Use ScraperAPI to scrape the Hilton booking page
    const scraperApiUrl = 'https://api.scraperapi.com/';
    const scraperParams = new URLSearchParams({
      'api_key': scraperApiKey,
      'url': hiltonUrl,
      'render': 'true', // Enable JavaScript rendering
      'country_code': 'gb', // Use UK proxies
      'session_number': '1' // Use session for consistency
    });
    
    const fullScraperUrl = `${scraperApiUrl}?${scraperParams.toString()}`;
    console.log(`Full ScraperAPI URL: ${fullScraperUrl}`);
    
    // Retry logic for ScraperAPI
    let scrapeResponse;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`ScraperAPI attempt ${attempt}/${maxRetries}`);
      
      try {
        scrapeResponse = await fetch(fullScraperUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        console.log(`ScraperAPI response status: ${scrapeResponse.status}`);
        
        if (scrapeResponse.ok) {
          break; // Success, exit retry loop
        }
        
        const errorText = await scrapeResponse.text();
        console.log(`ScraperAPI error response (attempt ${attempt}): ${errorText}`);
        lastError = `ScraperAPI request failed with status: ${scrapeResponse.status} - ${errorText}`;
        
        if (attempt < maxRetries) {
          console.log(`Retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000)); // Wait before retry
        }
      } catch (error) {
        console.log(`ScraperAPI request error (attempt ${attempt}): ${error.message}`);
        lastError = error.message;
        
        if (attempt < maxRetries) {
          console.log(`Retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000)); // Wait before retry
        }
      }
    }
    
    if (!scrapeResponse || !scrapeResponse.ok) {
      throw new Error(lastError || 'ScraperAPI request failed after all retries');
    }
    
    const html = await scrapeResponse.text();
    console.log('Scraped HTML length:', html.length);
    
    // Parse the HTML to determine availability
    const availabilityResult = parseAvailability(html);
    
    const result: AvailabilityResult = {
      date: requestData.arrivalDate,
      available: availabilityResult.available,
      roomCount: availabilityResult.roomCount,
      bookingUrl: hiltonUrl
    };
    
    console.log('Availability result:', result);
    
    return new Response(JSON.stringify({ 
      success: true, 
      availability: [result]
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