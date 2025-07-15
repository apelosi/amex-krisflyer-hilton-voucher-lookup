import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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

    const browserlessResponse = await fetch('https://chrome.browserless.io/content', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${browserlessApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://apac.hilton.com/amexkrisflyer',
        waitFor: 2000,
      }),
    });

    if (!browserlessResponse.ok) {
      throw new Error(`Browserless API failed: ${browserlessResponse.status}`);
    }

    const htmlContent = await browserlessResponse.text();
    console.log('Successfully fetched HTML content');

    // Extract destinations and hotels using regex patterns
    const destinationMatch = htmlContent.match(/Select Destination([^<]+)Select Destination/);
    const hotelMatch = htmlContent.match(/Select Hotel([^<]+)Select Hotel/);

    if (!destinationMatch || !hotelMatch) {
      throw new Error('Could not find destination or hotel data in HTML');
    }

    // Parse destinations
    const destinationText = destinationMatch[1];
    const destinations = destinationText.split(/(?=[A-Z][a-z])/).filter(d => d.trim().length > 0);
    console.log('Extracted destinations:', destinations);

    // Parse hotels
    const hotelText = hotelMatch[1];
    const hotels = hotelText.split(/(?=[A-Z][a-z])/).filter(h => h.trim().length > 0);
    console.log('Extracted hotels count:', hotels.length);

    // For now, we'll return all hotels for all destinations
    // In a real implementation, we'd need to map hotels to specific destinations
    const hotelsByDestination: Record<string, string[]> = {};
    
    destinations.forEach(destination => {
      hotelsByDestination[destination] = hotels;
    });

    const result = {
      destinations,
      hotels,
      hotelsByDestination,
      success: true
    };

    console.log('Successfully processed hotel data');

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