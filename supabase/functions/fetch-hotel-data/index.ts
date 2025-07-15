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

    // Use browser automation to properly load the page and extract data
    const response = await fetch('https://chrome.browserless.io/function', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        code: `
          export default async ({ page }) => {
            await page.goto('https://apac.hilton.com/amexkrisflyer', { 
              waitUntil: 'networkidle2',
              timeout: 30000 
            });
            
            // Wait for the form to load
            await page.waitForSelector('select#destination', { timeout: 15000 });
            await page.waitForSelector('select#hotel', { timeout: 15000 });
            
            // Extract destinations
            const destinations = await page.evaluate(() => {
              const select = document.querySelector('select#destination');
              if (!select) return [];
              
              const options = Array.from(select.querySelectorAll('option'));
              return options
                .map(option => option.textContent?.trim())
                .filter(text => text && !text.startsWith('Select'));
            });
            
            // Extract hotels by destination
            const hotelsByDestination = {};
            
            for (const destination of destinations) {
              try {
                // Select the destination
                await page.select('select#destination', destination);
                
                // Wait for hotel dropdown to update
                await page.waitForTimeout(2000);
                
                // Extract hotels for this destination
                const hotels = await page.evaluate(() => {
                  const select = document.querySelector('select#hotel');
                  if (!select) return [];
                  
                  const options = Array.from(select.querySelectorAll('option'));
                  return options
                    .map(option => option.textContent?.trim())
                    .filter(text => text && !text.startsWith('Select'));
                });
                
                hotelsByDestination[destination] = hotels;
                console.log(\`Found \${hotels.length} hotels for \${destination}\`);
              } catch (error) {
                console.error(\`Error processing \${destination}:\`, error);
                hotelsByDestination[destination] = [];
              }
            }
            
            // Get all unique hotels
            const allHotels = [...new Set(Object.values(hotelsByDestination).flat())];
            
            return {
              destinations,
              hotels: allHotels,
              hotelsByDestination
            };
          };
        `,
        token: browserlessApiKey,
      }),
    });

    console.log('Browserless response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Browserless error:', errorText);
      throw new Error(`Browserless API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Extracted data:', {
      destinations: data.destinations?.length || 0,
      hotels: data.hotels?.length || 0,
      hotelsByDestination: Object.keys(data.hotelsByDestination || {}).length
    });

    const result = {
      success: true,
      destinations: data.destinations || [],
      hotels: data.hotels || [],
      hotelsByDestination: data.hotelsByDestination || {}
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