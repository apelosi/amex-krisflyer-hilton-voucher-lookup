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

    // Enhanced parameter validation
    console.log('Raw input parameters:', { creditCard, voucherCode, destination, hotel, arrivalDate })
    
    if (!creditCard || typeof creditCard !== 'string' || creditCard.trim().length === 0) {
      throw new Error('Credit card number is required and must be a valid string')
    }
    
    if (!voucherCode || typeof voucherCode !== 'string' || voucherCode.trim().length === 0) {
      throw new Error('Voucher code is required and must be a valid string')
    }
    
    if (!destination || typeof destination !== 'string' || destination.trim().length === 0) {
      throw new Error('Destination is required and must be a valid string')
    }
    
    if (!hotel || typeof hotel !== 'string' || hotel.trim().length === 0) {
      throw new Error('Hotel is required and must be a valid string')
    }
    
    if (!arrivalDate || typeof arrivalDate !== 'string' || arrivalDate.trim().length === 0) {
      throw new Error('Arrival date is required and must be a valid string')
    }

    // Clean the input parameters
    const cleanedParams = {
      creditCard: creditCard.trim(),
      voucherCode: voucherCode.trim(),
      destination: destination.trim(),
      hotel: hotel.trim(),
      arrivalDate: arrivalDate.trim()
    }

    console.log('Validated parameters:', cleanedParams)

    console.log('Starting Browserless automation...')
    
    // Submit form to AMEX KrisFlyer page to get the groupCode with improved automation
    const browserlessResponse = await fetch('https://chrome.browserless.io/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization': `Bearer ${browserlessApiKey}`,
      },
      body: JSON.stringify({
        url: 'https://apac.hilton.com/amexkrisflyer',
        waitForSelector: 'form',
        timeout: 30000,
        actions: [
          // Wait for page to fully load
          {
            type: 'wait',
            timeout: 3000
          },
          // Fill in the credit card field with more specific selector
          {
            type: 'type',
            selector: 'input[name="CCNumber"]',
            text: cleanedParams.creditCard
          },
          // Fill in the voucher code field
          {
            type: 'type',
            selector: 'input[name="VoucherCode"]',
            text: cleanedParams.voucherCode
          },
          // Wait for form elements to be ready
          {
            type: 'wait',
            timeout: 1000
          },
          // Select destination with fallback selectors
          {
            type: 'select',
            selector: 'select[name="amex_dest_select"]',
            value: cleanedParams.destination
          },
          // Wait longer for hotels to load based on destination
          {
            type: 'wait',
            timeout: 4000
          },
          // Verify hotel dropdown is loaded before selecting
          {
            type: 'waitForSelector',
            selector: 'select[name="amex_select"] option[value="' + cleanedParams.hotel + '"]',
            timeout: 5000
          },
          // Select hotel
          {
            type: 'select',
            selector: 'select[name="amex_select"]',
            value: cleanedParams.hotel
          },
          // Clear and set arrival date
          {
            type: 'click',
            selector: 'input[name="arrivalDate"]'
          },
          {
            type: 'key',
            key: 'Control+a'
          },
          {
            type: 'type',
            selector: 'input[name="arrivalDate"]',
            text: cleanedParams.arrivalDate
          },
          // Wait before checking the Go checkbox
          {
            type: 'wait',
            timeout: 1000
          },
          // Check the "Go" checkbox
          {
            type: 'click',
            selector: 'input[name="Go"]'
          },
          // Wait before submitting
          {
            type: 'wait',
            timeout: 1000
          },
          // Submit the form
          {
            type: 'click',
            selector: 'input[type="submit"]'
          },
          // Wait longer for redirect to complete
          {
            type: 'wait',
            timeout: 8000
          }
        ]
      })
    })
    
    console.log('Browserless request completed, status:', browserlessResponse.status)

    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text()
      console.error('Browserless API error status:', browserlessResponse.status)
      console.error('Browserless API error response:', errorText)
      console.error('Browserless API headers:', Object.fromEntries(browserlessResponse.headers.entries()))
      
      // Check if it's an authentication issue
      if (browserlessResponse.status === 401) {
        throw new Error('Browserless API authentication failed - check API key')
      } else if (browserlessResponse.status === 403) {
        throw new Error('Browserless API access forbidden - check API key permissions')
      } else if (browserlessResponse.status >= 500) {
        throw new Error(`Browserless verification service is currently unavailable (status: ${browserlessResponse.status}). Please try again in a few minutes.`)
      } else {
        throw new Error(`Browserless API error: ${browserlessResponse.status} - ${errorText.substring(0, 200)}`)
      }
    }

    const browserlessData = await browserlessResponse.json()
    console.log('Browserless response URL:', browserlessData.url)

    // Extract groupCode from the final URL
    if (!browserlessData.url || !browserlessData.url.includes('hilton.com')) {
      throw new Error('Failed to redirect to Hilton booking page - check your voucher details')
    }
    
    const url = new URL(browserlessData.url)
    const groupCode = url.searchParams.get('groupCode')
    if (!groupCode) {
      throw new Error('Could not extract groupCode from booking URL - voucher may be invalid')
    }
    
    console.log('Extracted groupCode:', groupCode)

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
        error: error.message
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