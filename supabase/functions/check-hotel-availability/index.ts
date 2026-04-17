import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  AvailabilityRequest,
  AvailabilityResult,
  checkSingleDateAvailability,
  constructHiltonUrl,
  supabase,
} from "./availability-impl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const scraperApiKey = Deno.env.get("SCRAPERAPI_KEY");
    const browserlessToken = Deno.env.get("BROWSERLESS_API_KEY");
    if (!scraperApiKey && !browserlessToken) {
      throw new Error(
        "No scraping provider configured. Set SCRAPERAPI_KEY and/or BROWSERLESS_API_KEY in Supabase secrets.",
      );
    }

    const requestData: AvailabilityRequest = await req.json();
    console.log("Checking availability for:", requestData);

    console.log("Proceeding with hotel availability check...");

    const hotelCode = requestData.hotel;
    let hotelName: string | undefined;
    try {
      const { data: hotelData } = await supabase.functions.invoke("fetch-hotel-data");
      if (hotelData?.success && hotelData?.hotelCodes && hotelData.hotelCodes[hotelCode]) {
        hotelName = hotelData.hotelCodes[hotelCode];
      }
    } catch (_) {
      // ignore
    }

    if (hotelName) {
      console.log(`Using hotelCode: ${hotelCode} for hotel: ${hotelName}`);
    } else {
      console.log(`Using hotelCode: ${hotelCode} (name lookup unavailable)`);
    }

    const datesToCheck = requestData.dateRange || [requestData.arrivalDate];
    console.log(`Processing ALL ${datesToCheck.length} dates with parallel processing...`);

    const batchSize = 10;
    const results: AvailabilityResult[] = [];

    for (let i = 0; i < datesToCheck.length; i += batchSize) {
      const batch = datesToCheck.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(datesToCheck.length / batchSize)}: ${batch.length} dates`,
      );

      const batchPromises = batch.map(async (date) => {
        const singleDateRequest = { ...requestData, arrivalDate: date };
        return await checkSingleDateAvailability(singleDateRequest, hotelCode);
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          console.log(`Failed to check date ${batch[index]}: ${result.reason}`);
          results.push({
            date: batch[index],
            available: false,
            roomCount: 0,
            bookingUrl: constructHiltonUrl({ ...requestData, arrivalDate: batch[index] }, hotelCode),
          });
        }
      });
    }

    console.log(`Completed availability check: ${results.length} results`);

    return new Response(JSON.stringify({
      success: true,
      availability: results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in check-hotel-availability function:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      availability: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
