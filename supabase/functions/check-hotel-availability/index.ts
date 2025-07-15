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

    // For now, let's create a simpler implementation that generates mock data
    // while we test the basic functionality
    
    const startDate = new Date(requestData.arrivalDate);
    const expiryDate = new Date(requestData.voucherExpiry);
    const currentDate = new Date(startDate);
    
    const availability: AvailabilityResult[] = [];
    
    while (currentDate <= expiryDate && availability.length < 30) { // Limit to 30 dates
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Generate booking URL using static parameters for now
      const bookingParams = new URLSearchParams({
        ctyhocn: 'SINSG', // Singapore default
        arrivalDate: dateStr,
        departureDate: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        groupCode: 'AMEXKF',
        room1NumAdults: '1',
        cid: 'OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book'
      });
      
      const bookingUrl = `https://www.hilton.com/en/book/reservation/rooms/?${bookingParams.toString()}`;
      
      // For testing, randomly assign availability (this would be replaced with real data)
      const isAvailable = Math.random() > 0.3; // 70% chance of availability
      const roomCount = isAvailable ? Math.floor(Math.random() * 5) + 1 : 0;
      
      availability.push({
        date: dateStr,
        available: isAvailable,
        roomCount: roomCount,
        bookingUrl: isAvailable ? bookingUrl : undefined
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`Generated ${availability.length} availability results`);

    return new Response(JSON.stringify({ 
      success: true,
      availability,
      debugInfo: {
        hotelFound: true,
        totalHotelsFound: 1,
        currentUrl: 'https://www.hilton.com/en/book/reservation/rooms/',
        message: 'Using simplified mock data for testing'
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