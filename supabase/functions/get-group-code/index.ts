import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const browserlessApiKey = Deno.env.get('BROWSERLESS_API_KEY')
    if (!browserlessApiKey) {
      throw new Error('BROWSERLESS_API_KEY is not configured')
    }

    const { creditCard, voucherCode, destination, hotel, arrivalDate } = await req.json()

    console.log('Getting groupCode for:', { creditCard, voucherCode, destination, hotel, arrivalDate })

    // Submit form to AMEX KrisFlyer page to get the groupCode
    const browserlessResponse = await fetch('https://chrome.browserless.io/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization': `Bearer ${browserlessApiKey}`,
      },
      body: JSON.stringify({
        url: 'https://apac.hilton.com/amexkrisflyer',
        waitForSelector: '#amex_select',
        actions: [
          // Fill in the credit card field
          {
            type: 'type',
            selector: 'input[name="CCNumber"]',
            text: creditCard
          },
          // Fill in the voucher code field
          {
            type: 'type',
            selector: 'input[name="VoucherCode"]',
            text: voucherCode
          },
          // Select destination
          {
            type: 'select',
            selector: 'select[name="amex_dest_select"]',
            value: destination
          },
          // Wait for hotels to load
          {
            type: 'wait',
            timeout: 2000
          },
          // Select hotel
          {
            type: 'select',
            selector: 'select[name="amex_select"]',
            value: hotel
          },
          // Set arrival date to today
          {
            type: 'type',
            selector: 'input[name="arrivalDate"]',
            text: arrivalDate
          },
          // Check the "Go" checkbox
          {
            type: 'click',
            selector: 'input[name="Go"]'
          },
          // Submit the form
          {
            type: 'click',
            selector: 'input[type="submit"]'
          },
          // Wait for redirect to Hilton booking page
          {
            type: 'wait',
            timeout: 5000
          }
        ]
      })
    })

    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text()
      console.error('Browserless API error:', errorText)
      throw new Error(`Browserless API error: ${browserlessResponse.status}`)
    }

    const browserlessData = await browserlessResponse.json()
    console.log('Browserless response URL:', browserlessData.url)

    // Extract groupCode from the final URL
    let groupCode = 'AMEXKF' // fallback
    if (browserlessData.url && browserlessData.url.includes('hilton.com')) {
      const url = new URL(browserlessData.url)
      const urlGroupCode = url.searchParams.get('groupCode')
      if (urlGroupCode) {
        groupCode = urlGroupCode
        console.log('Extracted groupCode:', groupCode)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        groupCode,
        finalUrl: browserlessData.url 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error getting groupCode:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        groupCode: 'AMEXKF' // fallback
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    )
  }
})