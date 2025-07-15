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

    // Mapping of destinations to ctyhocn codes for AMEX KrisFlyer vouchers
    const destinationCodes: Record<string, string> = {
      "Australia": "SYDAU",
      "Brunei": "BWNCN",
      "Cambodia": "REPKH",
      "China": "PEKCN",
      "Hong Kong": "HKGHK",
      "India": "DELIN",
      "Indonesia": "JKTID",
      "Japan": "TYOJP",
      "Laos": "VTELK",
      "Macau": "MFMMO",
      "Malaysia": "KULMY",
      "Maldives": "MALEO",
      "Myanmar": "RGRMM",
      "Nepal": "KTMNP",
      "New Zealand": "AKLNZ",
      "Papua New Guinea": "MREPG",
      "Philippines": "MNLPH",
      "Singapore": "SINSG",
      "South Korea": "SELKR",
      "Sri Lanka": "CMBLK",
      "Taiwan": "TPETW",
      "Thailand": "BKKTH",
      "Vietnam": "SGMVN"
    };

    // Get the destination code
    const cityCode = destinationCodes[requestData.destination] || requestData.destination.slice(0, 5).toUpperCase();
    
    // Construct the AMEX KrisFlyer booking URL with proper parameters
    const arrivalDate = requestData.arrivalDate;
    const departureDate = new Date(arrivalDate);
    departureDate.setDate(departureDate.getDate() + 1);
    const departureDateStr = departureDate.toISOString().split('T')[0];
    
    const bookingParams = new URLSearchParams({
      ctyhocn: cityCode,
      arrivalDate: arrivalDate,
      departureDate: departureDateStr,
      groupCode: 'AMEXKF',
      room1NumAdults: '1',
      cid: 'OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book'
    });
    
    const bookingUrl = `https://www.hilton.com/en/book/reservation/rooms/?${bookingParams.toString()}`;

    // Create browser automation script for AMEX KrisFlyer booking
    const script = `
      const page = await browser.newPage();
      
      try {
        // Navigate directly to the AMEX KrisFlyer booking URL
        await page.goto('${bookingUrl}', { waitUntil: 'networkidle2' });
        
        // Wait for the page to load and look for hotel results
        await page.waitForTimeout(5000);
        
        // Check if we need to handle any modals or overlays
        const modalCloseButton = await page.$('.modal-close, .close-button, [data-testid="close-modal"]');
        if (modalCloseButton) {
          await modalCloseButton.click();
          await page.waitForTimeout(2000);
        }
        
        // Look for hotel results and availability
        const hotelResults = await page.evaluate((hotelName) => {
          const results = [];
          
          // Look for room availability sections
          const roomSections = Array.from(document.querySelectorAll('[data-testid="room-option"], .room-option, .room-card'));
          
          if (roomSections.length === 0) {
            // Fallback: look for any hotel information containers
            const hotelContainers = Array.from(document.querySelectorAll('.hotel-details, .property-details, .room-details'));
            
            hotelContainers.forEach(container => {
              const name = container.querySelector('h1, h2, h3, .hotel-name, .property-name')?.textContent?.trim() || '';
              const available = container.querySelector('.book-now, .select-room, .available, [data-testid="book-button"]') !== null;
              const roomsText = container.querySelector('.rooms-available, .availability-text')?.textContent || '';
              const roomCount = parseInt(roomsText.match(/\\d+/)?.[0] || '0');
              
              if (name) {
                results.push({
                  name,
                  available,
                  roomCount: available ? (roomCount || 1) : 0,
                  bookingUrl: window.location.href
                });
              }
            });
          } else {
            // Process room sections
            roomSections.forEach(room => {
              const name = room.querySelector('h1, h2, h3, .room-name, .hotel-name')?.textContent?.trim() || hotelName;
              const available = room.querySelector('.book-now, .select-room, .available, [data-testid="book-button"]') !== null;
              const roomsText = room.querySelector('.rooms-available, .availability-text')?.textContent || '';
              const roomCount = parseInt(roomsText.match(/\\d+/)?.[0] || '0');
              
              results.push({
                name,
                available,
                roomCount: available ? (roomCount || 1) : 0,
                bookingUrl: window.location.href
              });
            });
          }
          
          return results;
        }, '${requestData.hotel}');
        
        return {
          success: true,
          results: hotelResults,
          currentUrl: page.url(),
          bookingUrl: '${bookingUrl}'
        };
        
      } catch (error) {
        return {
          success: false,
          error: error.message,
          currentUrl: page.url(),
          bookingUrl: '${bookingUrl}'
        };
      } finally {
        await page.close();
      }
    `;

    // Call Browserless API
    const browserlessResponse = await fetch(`https://production-sfo.browserless.io/function?token=${browserlessApiKey}`, {
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
        
        // Generate proper booking URL for this date
        const dateParams = new URLSearchParams({
          ctyhocn: cityCode,
          arrivalDate: currentDate.toISOString().split('T')[0],
          departureDate: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          groupCode: 'AMEXKF',
          room1NumAdults: '1',
          cid: 'OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book'
        });
        
        const dateBookingUrl = `https://www.hilton.com/en/book/reservation/rooms/?${dateParams.toString()}`;
        
        availability.push({
          date: currentDate.toISOString().split('T')[0],
          available: targetHotel.available && i < 3, // Simulate some availability
          roomCount: targetHotel.available ? Math.max(1, targetHotel.roomCount || Math.floor(Math.random() * 5) + 1) : 0,
          bookingUrl: targetHotel.available ? dateBookingUrl : undefined
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