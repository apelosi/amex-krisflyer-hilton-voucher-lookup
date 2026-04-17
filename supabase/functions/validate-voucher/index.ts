import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, validateVoucher } from "./validate-impl.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: { creditCard: string; voucherCode: string } = await req.json();
    console.log("Validating voucher:", requestData);

    const result = await validateVoucher(requestData.creditCard, requestData.voucherCode);

    return new Response(
      JSON.stringify({
        success: true,
        valid: result.valid,
        error: result.error,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in validate-voucher function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        valid: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
