import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('Starting fetch-hotel-data function...');

    const scraperApiKey = Deno.env.get('SCRAPERAPI_KEY');
    if (!scraperApiKey) {
      console.error('SCRAPERAPI_KEY environment variable not found');
      throw new Error('SCRAPERAPI_KEY is not configured');
    }

    console.log('Making request to ScraperAPI...');

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
      throw new Error(`ScraperAPI failed with status ${response.status}: ${errorText}`);
    }

    const htmlContent = await response.text();
    console.log('HTML content received, length:', htmlContent.length);
    
    if (!htmlContent || htmlContent.length < 1000) {
      console.error('HTML content appears to be empty or too short');
      throw new Error('Failed to retrieve valid HTML content from the website');
    }

    // Parse HTML to extract select options
    const destinations = extractSelectOptions(htmlContent, 'amex_dest_select');
    const hotelData = extractHotelOptions(htmlContent, 'amex_select');
    
    console.log('Extracted destinations:', destinations);
    console.log('Extracted hotel data:', hotelData);
    
    if (destinations.length === 0) {
      console.error('No destinations found in HTML');
      throw new Error('No destinations found on the website');
    }
    
    if (hotelData.length === 0) {
      console.error('No hotels found in HTML');
      throw new Error('No hotels found on the website');
    }

    // Build data structures
    const hotelNames = hotelData.map(hotel => hotel.name);
    const hotels: Record<string, string> = {}; // hotel code -> hotel name mapping
    const hotelsByDestination: Record<string, string[]> = {};
    
    // Initialize destination arrays
    destinations.forEach(destination => {
      hotelsByDestination[destination] = [];
    });
    
    // Process hotel data
    hotelData.forEach(hotel => {
      hotels[hotel.ctyhocn] = hotel.name; // hotel code as key, hotel name as value
      if (hotel.destination && hotelsByDestination[hotel.destination]) {
        hotelsByDestination[hotel.destination].push(hotel.name);
      }
    });

    const result = {
      success: true,
      destinations,
      hotels: hotelNames, // Array of hotel names for backward compatibility
      hotelsByDestination,
      hotelCodes: hotels // The mapping object (hotel code -> hotel name)
    };

    console.log('Function completed successfully, returning:', {
      destinationCount: destinations.length,
      hotelCount: hotelNames.length,
      mappingCount: Object.keys(hotelsByDestination).length
    });

    return new Response(JSON.stringify(result), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
    });

  } catch (error) {
    console.error('Error in fetch-hotel-data function:', error);
    console.error('Error stack:', error.stack);
    
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