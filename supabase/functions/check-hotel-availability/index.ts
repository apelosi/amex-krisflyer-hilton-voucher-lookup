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

    // First, extract the correct ctyhocn and groupCode by navigating through the AMEX KrisFlyer portal
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const extractParametersScript = `
      const page = await browser.newPage();
      
      try {
        // Navigate to AMEX KrisFlyer portal
        await page.goto('https://apac.hilton.com/amexkrisflyer', { waitUntil: 'networkidle2' });
        
        // Fill in the form fields
        await page.waitForSelector('input[name="creditCardNumber"], #creditCardNumber', { timeout: 10000 });
        await page.type('input[name="creditCardNumber"], #creditCardNumber', '${requestData.creditCard}');
        
        await page.waitForSelector('input[name="voucherCode"], #voucherCode', { timeout: 5000 });
        await page.type('input[name="voucherCode"], #voucherCode', '${requestData.voucherCode}');
        
        await page.waitForSelector('input[name="voucherExpiry"], #voucherExpiry', { timeout: 5000 });
        await page.evaluate((expiry) => {
          const expiryInput = document.querySelector('input[name="voucherExpiry"], #voucherExpiry');
          if (expiryInput) expiryInput.value = expiry;
        }, '${requestData.voucherExpiry}');
        
        await page.waitForSelector('select[name="destination"], #destination', { timeout: 5000 });
        await page.select('select[name="destination"], #destination', '${requestData.destination}');
        
        await page.waitForSelector('select[name="hotel"], #hotel', { timeout: 5000 });
        await page.select('select[name="hotel"], #hotel', '${requestData.hotel}');
        
        // Set arrival date to today
        await page.waitForSelector('input[name="arrivalDate"], #arrivalDate', { timeout: 5000 });
        await page.evaluate((date) => {
          const dateInput = document.querySelector('input[name="arrivalDate"], #arrivalDate');
          if (dateInput) dateInput.value = date;
        }, '${today}');
        
        // Enable and click Go button
        const checkbox = await page.$('input[type="checkbox"]');
        if (checkbox) {
          await checkbox.click();
        }
        
        await page.waitForTimeout(1000);
        
        const goButton = await page.$('button:contains("Go"), input[type="submit"], .go-button');
        if (goButton) {
          await goButton.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        }
        
        // Extract parameters from the resulting URL
        const currentUrl = page.url();
        const urlParams = new URLSearchParams(currentUrl.split('?')[1] || '');
        
        return {
          success: true,
          ctyhocn: urlParams.get('ctyhocn') || '',
          groupCode: urlParams.get('groupCode') || urlParams.get('couponCode') || '',
          extractedUrl: currentUrl
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

    // Extract the parameters first
    const paramExtractionResponse = await fetch(`https://production-sfo.browserless.io/function?token=${browserlessApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: extractParametersScript
      })
    });

    if (!paramExtractionResponse.ok) {
      throw new Error(`Parameter extraction failed: ${paramExtractionResponse.status}`);
    }

    const paramResult = await paramExtractionResponse.json();
    console.log('Parameter extraction result:', paramResult);

    if (!paramResult.success || !paramResult.ctyhocn) {
      throw new Error(`Failed to extract booking parameters: ${paramResult.error || 'Missing ctyhocn'}`);
    }

    const { ctyhocn, groupCode } = paramResult;

    // Now use the extracted parameters to build the booking URL for the requested arrival date
    const arrivalDate = requestData.arrivalDate;
    const departureDate = new Date(arrivalDate);
    departureDate.setDate(departureDate.getDate() + 1);
    const departureDateStr = departureDate.toISOString().split('T')[0];
    
    const bookingParams = new URLSearchParams({
      ctyhocn: ctyhocn,
      arrivalDate: arrivalDate,
      departureDate: departureDateStr,
      groupCode: groupCode,
      room1NumAdults: '1',
      cid: 'OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book'
    });
    
    const bookingUrl = `https://www.hilton.com/en/book/reservation/rooms/?${bookingParams.toString()}`;

    // Create browser automation script for AMEX KrisFlyer booking
    const script = `
      const page = await browser.newPage();
      
      try {
        // Navigate directly to the booking URL with extracted parameters
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
      // Generate availability until voucher expiry date
      const startDate = new Date(requestData.arrivalDate);
      const expiryDate = new Date(requestData.voucherExpiry);
      const currentDate = new Date(startDate);
      
      while (currentDate <= expiryDate) {
        // Generate proper booking URL for this date using extracted parameters
        const dateParams = new URLSearchParams({
          ctyhocn: ctyhocn,
          arrivalDate: currentDate.toISOString().split('T')[0],
          departureDate: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          groupCode: groupCode,
          room1NumAdults: '1',
          cid: 'OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book'
        });
        
        const dateBookingUrl = `https://www.hilton.com/en/book/reservation/rooms/?${dateParams.toString()}`;
        
        availability.push({
          date: currentDate.toISOString().split('T')[0],
          available: targetHotel.available,
          roomCount: targetHotel.available ? Math.max(1, targetHotel.roomCount || 1) : 0,
          bookingUrl: targetHotel.available ? dateBookingUrl : undefined
        });
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
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