import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req: Request) => {
  try {
    const scraperApiKey = Deno.env.get('SCRAPERAPI_KEY');
    
    return new Response(
      JSON.stringify({
        scraperapi_key: scraperApiKey
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})
