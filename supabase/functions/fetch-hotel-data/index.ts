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
    console.log('API key available:', !!browserlessApiKey);
    console.log('API key length:', browserlessApiKey?.length || 0);
    
    if (!browserlessApiKey) {
      throw new Error('BROWSERLESS_API_KEY is not set');
    }

    // Try simpler approach first - just get the HTML content
    const response = await fetch('https://chrome.browserless.io/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        url: 'https://apac.hilton.com/amexkrisflyer',
        token: browserlessApiKey,
        waitFor: 3000,
      }),
    });

    console.log('Browserless response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Browserless error:', errorText);
      throw new Error(`Browserless API error: ${response.status} - ${errorText}`);
    }

    const htmlContent = await response.text();
    console.log('HTML content length:', htmlContent.length);
    
    // Parse HTML to extract select options
    const destinations = extractSelectOptions(htmlContent, 'destination');
    const hotels = extractSelectOptions(htmlContent, 'hotel');
    
    console.log('Extracted destinations:', destinations.length);
    console.log('Extracted hotels:', hotels.length);
    
    // For now, create a simple mapping - all hotels available for all destinations
    // In a real implementation, we'd need to interact with the page to get destination-specific hotels
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
      if (value && text && !text.startsWith('Select') && value !== 'Select') {
        options.push(text);
      }
    }
    
    console.log(`Found ${options.length} options for ${selectId}:`, options);
    return options;
    
  } catch (error) {
    console.error(`Error extracting options for ${selectId}:`, error);
    return options;
  }
}