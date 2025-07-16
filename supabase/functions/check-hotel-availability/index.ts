import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  groupCode: string;
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

    // Get hotel data to find the correct hotelCode for the selected hotel
    const { data: hotelData, error: hotelError } = await supabase.functions.invoke('fetch-hotel-data');
    
    if (hotelError || !hotelData?.success) {
      throw new Error('Failed to fetch hotel data for hotel code lookup');
    }
    
    // Find the selected hotel to get its hotelCode
    const selectedHotel = hotelData.hotels.find(h => h.name === requestData.hotel);
    if (!selectedHotel) {
      throw new Error(`Hotel "${requestData.hotel}" not found in available hotels`);
    }
    
    const hotelCode = selectedHotel.hotelCode;
    console.log(`Using hotelCode: ${hotelCode} for hotel: ${requestData.hotel}`);
    
    const startDate = new Date(requestData.arrivalDate);
    const expiryDate = new Date(requestData.voucherExpiry);
    const currentDate = new Date(startDate);
    
    const availability: AvailabilityResult[] = [];
    
    // Real availability checking would be implemented here
    // For now, return error since we don't have real availability data
    throw new Error('Real-time availability checking is not yet implemented. Please check availability directly on the Hilton website.');

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