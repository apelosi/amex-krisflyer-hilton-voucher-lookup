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
    console.log('Starting fetch-hotel-data function with caching...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // First, try to get cached data
    console.log('Checking for cached hotel data...');
    let cachedData = null;
    let cacheError = null;
    
    try {
      const result = await supabase
        .from('hotel_data')
        .select('data, last_updated')
        .eq('id', 1)
        .single();
      cachedData = result.data;
      cacheError = result.error;
    } catch (error) {
      console.log('Table might not exist, will create it:', error.message);
      cacheError = error;
    }

    if (cachedData && !cacheError) {
      const lastUpdated = new Date(cachedData.last_updated);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      console.log(`Cached data found, last updated: ${lastUpdated.toISOString()}, hours ago: ${hoursSinceUpdate.toFixed(2)}`);
      
      // If data is less than 24 hours old, return cached data
      if (hoursSinceUpdate < 24) {
        console.log('Returning cached data (fresh)');
        return new Response(JSON.stringify({
          ...cachedData.data,
          cached: true,
          lastUpdated: cachedData.last_updated
        }), {
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
        });
      } else {
        console.log('Cached data is stale, will refresh...');
      }
    } else {
      console.log('No cached data found or error:', cacheError?.message);
    }

    // If we get here, either no cache exists or it's stale - refresh the data
    console.log('Refreshing hotel data from source...');
    
    const scraperApiKey = Deno.env.get('SCRAPERAPI_KEY');
    if (!scraperApiKey) {
      console.error('SCRAPERAPI_KEY environment variable not found');
      throw new Error('SCRAPERAPI_KEY is not configured');
    }

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

    console.log('ScraperAPI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ScraperAPI error response:', errorText);
      
      // If scraping fails but we have cached data, return stale cache
      if (cachedData) {
        console.log('Scraping failed, returning stale cached data as fallback');
        return new Response(JSON.stringify({
          ...cachedData.data,
          cached: true,
          stale: true,
          lastUpdated: cachedData.last_updated,
          warning: 'Using cached data due to scraping failure'
        }), {
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
        });
      }
      
      throw new Error(`ScraperAPI failed with status ${response.status}: ${errorText}`);
    }

    const htmlContent = await response.text();
    console.log('HTML content received, length:', htmlContent.length);
    
    if (!htmlContent || htmlContent.length < 1000) {
      console.error('HTML content appears to be empty or too short');
      
      // If parsing fails but we have cached data, return stale cache
      if (cachedData) {
        console.log('Parsing failed, returning stale cached data as fallback');
        return new Response(JSON.stringify({
          ...cachedData.data,
          cached: true,
          stale: true,
          lastUpdated: cachedData.last_updated,
          warning: 'Using cached data due to parsing failure'
        }), {
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
        });
      }
      
      throw new Error('Failed to retrieve valid HTML content from the website');
    }

    // Parse HTML to extract select options
    const destinations = extractSelectOptions(htmlContent, 'amex_dest_select');
    const hotelData = extractHotelOptions(htmlContent, 'amex_select');
    
    console.log('Extracted destinations:', destinations.length);
    console.log('Extracted hotels:', hotelData.length);
    
    if (destinations.length === 0 || hotelData.length === 0) {
      console.error('Failed to extract hotel data from HTML');
      
      // If extraction fails but we have cached data, return stale cache
      if (cachedData) {
        console.log('Extraction failed, returning stale cached data as fallback');
        return new Response(JSON.stringify({
          ...cachedData.data,
          cached: true,
          stale: true,
          lastUpdated: cachedData.last_updated,
          warning: 'Using cached data due to extraction failure'
        }), {
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
        });
      }
      
      throw new Error('No destinations or hotels found on the website');
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

    const result = {
      success: true,
      destinations,
      hotels: hotelNames,
      hotelsByDestination,
      hotelCodes: hotels
    };

    // Update the cache with fresh data
    console.log('Updating cache with fresh data...');
    try {
      const { error: upsertError } = await supabase
        .from('hotel_data')
        .upsert({
          id: 1,
          data: result,
          last_updated: new Date().toISOString()
        });

      if (upsertError) {
        console.error('Failed to update cache:', upsertError);
        // Continue anyway - we still return the fresh data
      } else {
        console.log('Cache updated successfully');
      }
    } catch (error) {
      console.log('Cache update failed, but continuing with fresh data:', error.message);
    }

    console.log('Function completed successfully, returning fresh data:', {
      destinationCount: destinations.length,
      hotelCount: hotelNames.length,
      mappingCount: Object.keys(hotelsByDestination).length
    });

    return new Response(JSON.stringify({
      ...result,
      cached: false,
      lastUpdated: new Date().toISOString()
    }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
    });

  } catch (error) {
    console.error('Error in fetch-hotel-data function:', error);
    
    // Try to return cached data as last resort
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: cachedData } = await supabase
        .from('hotel_data')
        .select('data, last_updated')
        .eq('id', 1)
        .single();
        
      if (cachedData) {
        console.log('Returning cached data as fallback due to error');
        return new Response(JSON.stringify({
          ...cachedData.data,
          cached: true,
          stale: true,
          lastUpdated: cachedData.last_updated,
          warning: 'Using cached data due to system error'
        }), {
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
        });
      }
    } catch (fallbackError) {
      console.error('Fallback to cached data also failed:', fallbackError);
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      destinations: [],
      hotels: [],
      hotelsByDestination: {},
      hotelCodes: {}
    }), {
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
    });
  }
});

function extractSelectOptions(html: string, selectId: string): string[] {
  const options: string[] = [];
  
  try {
    console.log(`Extracting options for select#${selectId}...`);
    
    // Find the select element by id with more flexible regex
    const selectRegex = new RegExp(`<select[^>]*id\\s*=\\s*["']${selectId}["'][^>]*>([\\s\\S]*?)</select>`, 'i');
    const selectMatch = html.match(selectRegex);
    
    if (!selectMatch) {
      console.log(`No select element found for ${selectId}`);
      // Try to find it with name attribute as fallback
      const nameRegex = new RegExp(`<select[^>]*name\\s*=\\s*["']${selectId}["'][^>]*>([\\s\\S]*?)</select>`, 'i');
      const nameMatch = html.match(nameRegex);
      if (!nameMatch) {
        console.log(`No select element found with name=${selectId} either`);
        return options;
      }
      console.log(`Found select element with name=${selectId}`);
    }
    
    const selectContent = selectMatch ? selectMatch[1] : '';
    console.log(`Select content length for ${selectId}:`, selectContent.length);
    
    // Extract option elements with more flexible regex
    const optionRegex = /<option[^>]*(?:value\s*=\s*["']([^"']*)["'][^>]*)?>(.*?)<\/option>/gi;
    let match;
    let optionCount = 0;
    
    while ((match = optionRegex.exec(selectContent)) !== null) {
      optionCount++;
      const value = match[1]?.trim() || '';
      const text = match[2]?.trim() || '';
      
      console.log(`Option ${optionCount}: value="${value}", text="${text}"`);
      
      // Skip empty options, default options, and placeholder options
      if (text && 
          !text.toLowerCase().startsWith('select') && 
          !text.toLowerCase().includes('choose') &&
          !text.toLowerCase().includes('please select') &&
          text !== '...' &&
          text !== '--') {
        options.push(text);
      }
    }
    
    console.log(`Found ${options.length} valid options for ${selectId}:`, options);
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
    console.log(`Extracting hotel options for select#${selectId}...`);
    
    // Find the select element by id with more flexible regex
    const selectRegex = new RegExp(`<select[^>]*id\\s*=\\s*["']${selectId}["'][^>]*>([\\s\\S]*?)</select>`, 'i');
    const selectMatch = html.match(selectRegex);
    
    if (!selectMatch) {
      console.log(`No select element found for ${selectId}`);
      // Try to find it with name attribute as fallback
      const nameRegex = new RegExp(`<select[^>]*name\\s*=\\s*["']${selectId}["'][^>]*>([\\s\\S]*?)</select>`, 'i');
      const nameMatch = html.match(nameRegex);
      if (!nameMatch) {
        console.log(`No select element found with name=${selectId} either`);
        return options;
      }
      console.log(`Found select element with name=${selectId}`);
    }
    
    const selectContent = selectMatch ? selectMatch[1] : '';
    console.log(`Select content length for ${selectId}:`, selectContent.length);
    
    // Extract option elements with value and data-dest attributes
    const optionRegex = /<option[^>]*value\s*=\s*["']([^"']*)["'][^>]*data-dest\s*=\s*["']([^"']*)["'][^>]*>(.*?)<\/option>/gi;
    let match;
    let optionCount = 0;
    
    while ((match = optionRegex.exec(selectContent)) !== null) {
      optionCount++;
      const ctyhocn = match[1]?.trim() || '';
      const destination = match[2]?.trim() || '';
      const name = match[3]?.trim() || '';
      
      console.log(`Hotel option ${optionCount}: ctyhocn="${ctyhocn}", destination="${destination}", name="${name}"`);
      
      // Skip empty options, default options, and placeholder options
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
    
    console.log(`Found ${options.length} valid hotel options for ${selectId}`);
    return options;
    
  } catch (error) {
    console.error(`Error extracting hotel options for ${selectId}:`, error);
    return options;
  }
}