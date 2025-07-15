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

    // Use browser automation to extract form data
    const script = `
      const page = await browser.newPage();
      
      try {
        // Navigate to AMEX KrisFlyer portal
        await page.goto('https://apac.hilton.com/amexkrisflyer', { waitUntil: 'networkidle2' });
        
        // Wait for form elements to load
        await page.waitForSelector('select#destination', { timeout: 10000 });
        await page.waitForSelector('select#hotel', { timeout: 10000 });
        
        // Extract destination options
        const destinations = await page.evaluate(() => {
          const select = document.querySelector('select#destination');
          if (!select) return [];
          
          const options = Array.from(select.querySelectorAll('option'))
            .map(option => option.textContent?.trim())
            .filter(text => text && text !== 'Select Destination');
          
          return options;
        });
        
        // Extract hotel options
        const hotels = await page.evaluate(() => {
          const select = document.querySelector('select#hotel');
          if (!select) return [];
          
          const options = Array.from(select.querySelectorAll('option'))
            .map(option => option.textContent?.trim())
            .filter(text => text && text !== 'Select Hotel');
          
          return options;
        });
        
        // Try to map hotels to destinations by testing each destination
        const hotelsByDestination = {};
        
        for (const destination of destinations) {
          try {
            // Select the destination
            await page.select('select#destination', destination);
            
            // Wait a bit for the hotel dropdown to update
            await page.waitForTimeout(1000);
            
            // Get updated hotel options for this destination
            const destinationHotels = await page.evaluate(() => {
              const select = document.querySelector('select#hotel');
              if (!select) return [];
              
              const options = Array.from(select.querySelectorAll('option'))
                .map(option => option.textContent?.trim())
                .filter(text => text && text !== 'Select Hotel');
              
              return options;
            });
            
            hotelsByDestination[destination] = destinationHotels;
          } catch (error) {
            console.log('Error processing destination:', destination, error);
            // Fallback to all hotels for this destination
            hotelsByDestination[destination] = hotels;
          }
        }
        
        return {
          success: true,
          destinations,
          hotels,
          hotelsByDestination,
          pageUrl: page.url()
        };
        
      } catch (error) {
        return {
          success: false,
          error: error.message,
          pageUrl: page.url()
        };
      } finally {
        await page.close();
      }
    `;

    console.log('Calling Browserless API...');
    
    const browserlessResponse = await fetch(`https://production-sfo.browserless.io/function?token=${browserlessApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: script
      })
    });

    if (!browserlessResponse.ok) {
      throw new Error(`Browserless API failed: ${browserlessResponse.status}`);
    }

    const result = await browserlessResponse.json();
    console.log('Browserless result:', result);

    if (!result.success) {
      throw new Error(`Browser automation failed: ${result.error}`);
    }

    const { destinations, hotels, hotelsByDestination } = result;

    console.log(`Successfully extracted ${destinations.length} destinations and ${hotels.length} hotels`);

    return new Response(JSON.stringify({
      success: true,
      destinations,
      hotels,
      hotelsByDestination
    }), {
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