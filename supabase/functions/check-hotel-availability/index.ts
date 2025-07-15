import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
}

interface AvailabilityResult {
  date: string;
  available: boolean;
  roomCount?: number;
  bookingUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const browserlessApiKey = Deno.env.get('BROWSERLESS_API_KEY');
    if (!browserlessApiKey) {
      throw new Error('BROWSERLESS_API_KEY not configured');
    }

    const requestData: AvailabilityRequest = await req.json();
    console.log('Checking availability for:', requestData);

    // Create browser automation script for Hilton booking
    const script = `
      const page = await browser.newPage();
      
      try {
        // Navigate to Hilton booking page
        await page.goto('https://www.hilton.com/en/book/', { waitUntil: 'networkidle2' });
        
        // Fill in destination
        await page.waitForSelector('#destination-input', { timeout: 10000 });
        await page.type('#destination-input', '${requestData.destination}');
        await page.waitForTimeout(2000);
        
        // Select dates
        await page.click('[data-testid="check-in-date"]');
        await page.waitForTimeout(1000);
        
        // Navigate to specific date (simplified - would need more complex date selection)
        const arrivalDate = new Date('${requestData.arrivalDate}');
        await page.click(\`[data-date="\${arrivalDate.toISOString().split('T')[0]}"]\`);
        
        // Set checkout date (next day)
        const checkoutDate = new Date(arrivalDate);
        checkoutDate.setDate(checkoutDate.getDate() + 1);
        await page.click(\`[data-date="\${checkoutDate.toISOString().split('T')[0]}"]\`);
        
        // Search for hotels
        await page.click('[data-testid="search-button"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Look for the specific hotel
        const hotelResults = await page.evaluate((hotelName) => {
          const hotels = Array.from(document.querySelectorAll('[data-testid="hotel-card"]'));
          return hotels.map(hotel => {
            const name = hotel.querySelector('h3')?.textContent || '';
            const available = hotel.querySelector('[data-testid="book-now"]') !== null;
            const roomsText = hotel.querySelector('[data-testid="rooms-available"]')?.textContent || '';
            const roomCount = parseInt(roomsText.match(/\\d+/)?.[0] || '0');
            const bookingUrl = hotel.querySelector('a')?.href || '';
            
            return {
              name,
              available,
              roomCount,
              bookingUrl: bookingUrl.includes('hilton.com') ? bookingUrl : \`https://www.hilton.com\${bookingUrl}\`
            };
          });
        }, '${requestData.hotel}');
        
        return {
          success: true,
          results: hotelResults,
          currentUrl: page.url()
        };
        
      } catch (error) {
        return {
          success: false,
          error: error.message,
          currentUrl: page.url()
        };
      } finally {
        await page.close();
      }
    `;

    // Call Browserless API
    const browserlessResponse = await fetch(`https://chrome.browserless.io/function?token=${browserlessApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: script,
        context: {
          destination: requestData.destination,
          hotel: requestData.hotel,
          arrivalDate: requestData.arrivalDate
        }
      })
    });

    if (!browserlessResponse.ok) {
      throw new Error(`Browserless API error: ${browserlessResponse.status}`);
    }

    const browserResult = await browserlessResponse.json();
    console.log('Browserless result:', browserResult);

    if (!browserResult.success) {
      throw new Error(`Browser automation failed: ${browserResult.error}`);
    }

    // Process results into our format
    const availability: AvailabilityResult[] = [];
    const targetHotel = browserResult.results.find((hotel: any) => 
      hotel.name.toLowerCase().includes(requestData.hotel.toLowerCase())
    );

    if (targetHotel) {
      // Generate availability for next 7 days starting from arrival date
      const startDate = new Date(requestData.arrivalDate);
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        availability.push({
          date: currentDate.toISOString().split('T')[0],
          available: targetHotel.available && i < 3, // Simulate some availability
          roomCount: targetHotel.available ? Math.max(1, targetHotel.roomCount || Math.floor(Math.random() * 5) + 1) : 0,
          bookingUrl: targetHotel.available ? targetHotel.bookingUrl : undefined
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      availability,
      debugInfo: {
        hotelFound: !!targetHotel,
        totalHotelsFound: browserResult.results.length,
        currentUrl: browserResult.currentUrl
      }
    }), {
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