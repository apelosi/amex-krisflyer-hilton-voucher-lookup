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
    console.log('Fetching hotel data from AMEX KrisFlyer website...');
    
    const browserlessApiKey = Deno.env.get('BROWSERLESS_API_KEY');
    if (!browserlessApiKey) {
      throw new Error('BROWSERLESS_API_KEY is not set');
    }

    // Simplified approach - just get the HTML content first
    const htmlResponse = await fetch('https://chrome.browserless.io/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://apac.hilton.com/amexkrisflyer',
        token: browserlessApiKey,
        waitFor: 3000,
      }),
    });

    console.log('HTML response status:', htmlResponse.status);

    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch HTML: ${htmlResponse.status}`);
    }

    const htmlContent = await htmlResponse.text();
    console.log('HTML content length:', htmlContent.length);

    // Parse HTML to extract select options
    const destinations = extractSelectOptions(htmlContent, 'destination');
    const hotels = extractSelectOptions(htmlContent, 'hotel');

    console.log('Extracted destinations:', destinations.length);
    console.log('Extracted hotels:', hotels.length);

    // For now, assign all hotels to all destinations
    const hotelsByDestination: Record<string, string[]> = {};
    destinations.forEach(dest => {
      hotelsByDestination[dest] = hotels;
    });

    const result = {
      success: true,
      destinations,
      hotels,
      hotelsByDestination
    };

    return new Response(JSON.stringify(result), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
    });

  } catch (error) {
    console.error('Error in fetch-hotel-data function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      destinations: [],
      hotels: [],
      hotelsByDestination: {}
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
    // Find the select element by id
    const selectRegex = new RegExp(`<select[^>]*id=["']${selectId}["'][^>]*>([\\s\\S]*?)</select>`, 'i');
    const selectMatch = html.match(selectRegex);
    
    if (!selectMatch) {
      console.log(`No select element found for ${selectId}`);
      return options;
    }
    
    const selectContent = selectMatch[1];
    
    // Extract option elements
    const optionRegex = /<option[^>]*value=["']([^"']*)["'][^>]*>([^<]*)<\/option>/gi;
    let match;
    
    while ((match = optionRegex.exec(selectContent)) !== null) {
      const value = match[1].trim();
      const text = match[2].trim();
      
      // Skip empty options and the default "Select..." options
      if (value && text && !text.startsWith('Select ')) {
        options.push(text);
      }
    }
    
    console.log(`Found ${options.length} options for ${selectId}`);
    return options;
    
  } catch (error) {
    console.error(`Error extracting options for ${selectId}:`, error);
    return options;
  }
}