import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const scraperApiKey = Deno.env.get('SCRAPERAPI_KEY');

    if (!scraperApiKey) {
      throw new Error('SCRAPERAPI_KEY not configured');
    }

    console.log('Starting daily hotel data refresh...');

    // Scrape fresh data from Hilton website
    const verificationUrl = 'https://apac.hilton.com/amexkrisflyer';
    const params = new URLSearchParams({
      'api_key': scraperApiKey,
      'url': verificationUrl,
      'render': 'true',
      'country_code': 'sg',
      'session_number': '1',
      'wait': '3000',
      'premium': 'true'
    });

    const scraperUrl = `https://api.scraperapi.com/?${params.toString()}`;
    const response = await fetch(scraperUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`ScraperAPI failed with status ${response.status}`);
    }

    const htmlContent = await response.text();
    console.log('Scraped HTML content, length:', htmlContent.length);

    // Parse the HTML to extract hotel data (reuse existing logic)
    const destinations = extractSelectOptions(htmlContent, 'amex_dest_select');
    const hotelData = extractHotelOptions(htmlContent, 'amex_select');
    
    console.log('Extracted destinations:', destinations.length);
    console.log('Extracted hotels:', hotelData.length);

    if (destinations.length === 0 || hotelData.length === 0) {
      throw new Error('Failed to extract hotel data from HTML');
    }

    // Build data structures
    const hotelNames = hotelData.map(hotel => hotel.name);
    const hotels: Record<string, string> = {};
    const hotelsByDestination: Record<string, string[]> = {};
    
    // Initialize destination arrays
    destinations.forEach(destination => {
      hotelsByDestination[destination] = [];
    });
    
    // Process hotel data
    hotelData.forEach(hotel => {
      hotels[hotel.ctyhocn] = hotel.name;
      if (hotel.destination && hotelsByDestination[hotel.destination]) {
        hotelsByDestination[hotel.destination].push(hotel.name);
      }
    });

    const hotelDataCache = {
      success: true,
      destinations,
      hotels: hotelNames,
      hotelsByDestination,
      hotelCodes: hotels
    };

    // Update the database cache
    const { error: upsertError } = await supabase
      .from('hotel_data')
      .upsert({
        id: 1,
        data: hotelDataCache,
        last_updated: new Date().toISOString()
      });

    if (upsertError) {
      throw new Error(`Failed to update database cache: ${upsertError.message}`);
    }

    console.log('Hotel data cache updated successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Hotel data refreshed successfully',
      stats: {
        destinations: destinations.length,
        hotels: hotelData.length,
        lastUpdated: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in refresh-hotel-data function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions (reused from fetch-hotel-data)
function extractSelectOptions(html: string, selectId: string): string[] {
  const options: string[] = [];
  
  try {
    const selectRegex = new RegExp(`<select[^>]*id\\s*=\\s*["']${selectId}["'][^>]*>([\\s\\S]*?)</select>`, 'i');
    const selectMatch = html.match(selectRegex);
    
    if (!selectMatch) {
      const nameRegex = new RegExp(`<select[^>]*name\\s*=\\s*["']${selectId}["'][^>]*>([\\s\\S]*?)</select>`, 'i');
      const nameMatch = html.match(nameRegex);
      if (!nameMatch) {
        return options;
      }
    }
    
    const selectContent = selectMatch ? selectMatch[1] : '';
    const optionRegex = /<option[^>]*(?:value\s*=\s*["']([^"']*)["'][^>]*)?>(.*?)<\/option>/gi;
    let match;
    
    while ((match = optionRegex.exec(selectContent)) !== null) {
      const value = match[1]?.trim() || '';
      const text = match[2]?.trim() || '';
      
      if (text && 
          !text.toLowerCase().startsWith('select') && 
          !text.toLowerCase().includes('choose') &&
          !text.toLowerCase().includes('please select') &&
          text !== '...' &&
          text !== '--') {
        options.push(text);
      }
    }
    
    return options;
    
  } catch (error) {
    console.error(`Error extracting options for ${selectId}:`, error);
    return options;
  }
}

interface HotelOption {
  name: string;
  ctyhocn: string;
  destination: string;
}

function extractHotelOptions(html: string, selectId: string): HotelOption[] {
  const options: HotelOption[] = [];
  
  try {
    const selectRegex = new RegExp(`<select[^>]*id\\s*=\\s*["']${selectId}["'][^>]*>([\\s\\S]*?)</select>`, 'i');
    const selectMatch = html.match(selectRegex);
    
    if (!selectMatch) {
      const nameRegex = new RegExp(`<select[^>]*name\\s*=\\s*["']${selectId}["'][^>]*>([\\s\\S]*?)</select>`, 'i');
      const nameMatch = html.match(nameRegex);
      if (!nameMatch) {
        return options;
      }
    }
    
    const selectContent = selectMatch ? selectMatch[1] : '';
    const optionRegex = /<option[^>]*value\s*=\s*["']([^"']*)["'][^>]*data-dest\s*=\s*["']([^"']*)["'][^>]*>(.*?)<\/option>/gi;
    let match;
    
    while ((match = optionRegex.exec(selectContent)) !== null) {
      const ctyhocn = match[1]?.trim() || '';
      const destination = match[2]?.trim() || '';
      const name = match[3]?.trim() || '';
      
      if (ctyhocn && destination && name && 
          !name.toLowerCase().startsWith('select') && 
          !name.toLowerCase().includes('choose') &&
          !name.toLowerCase().includes('please select') &&
          name !== '...' &&
          name !== '--') {
        options.push({
          name,
          ctyhocn,
          destination
        });
      }
    }
    
    return options;
    
  } catch (error) {
    console.error(`Error extracting hotel options for ${selectId}:`, error);
    return options;
  }
}
