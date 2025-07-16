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
    
    // Retry logic for Browserless API
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}: Starting Browserless automation...`);
        
        // Submit form to AMEX KrisFlyer page to get the groupCode using puppeteer automation
        const browserlessResponse = await fetch(`https://production-sfo.browserless.io/content?token=${browserlessApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify({
            url: 'https://apac.hilton.com/amexkrisflyer',
            waitForSelector: {
              selector: 'form#cc_form',
              timeout: 30000
            },
            actions: [
              {
                type: 'type',
                selector: 'input[name="bin_number"]',
                text: cleanedParams.creditCard
              },
              {
                type: 'type', 
                selector: 'input[name="voucher_no"]',
                text: cleanedParams.voucherCode
              },
              {
                type: 'wait',
                timeout: 1000
              },
              {
                type: 'click',
                selector: 'input[name="btn-go"]'
              },
              {
                type: 'wait',
                timeout: 3000
              },
              {
                type: 'waitForSelector',
                selector: 'select[name="amex_dest_select"]',
                timeout: 10000
              },
              {
                type: 'select',
                selector: 'select[name="amex_dest_select"]',
                value: cleanedParams.destination
              },
              {
                type: 'wait',
                timeout: 2000
              },
              {
                type: 'waitForSelector',
                selector: `select[name="amex_select"] option[value="${cleanedParams.hotel}"]`,
                timeout: 10000
              },
              {
                type: 'select',
                selector: 'select[name="amex_select"]',
                value: cleanedParams.hotel
              },
              {
                type: 'click',
                selector: 'button#arrival-btn'
              },
              {
                type: 'wait',
                timeout: 1000
              },
              {
                type: 'evaluate',
                pageFunction: `(arrivalDate) => {
                  const arrivalInput = document.querySelector('input[name="arrival"]');
                  if (arrivalInput) {
                    arrivalInput.value = arrivalDate;
                    arrivalInput.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }`,
                args: [cleanedParams.arrivalDate]
              },
              {
                type: 'click',
                selector: 'input[name="agree"]'
              },
              {
                type: 'wait',
                timeout: 1000
              },
              {
                type: 'click',
                selector: 'input#gobtn'
              },
              {
                type: 'waitForNavigation',
                timeout: 15000
              }
            ]
          })
        })
        
        console.log(`Attempt ${attempt}: Browserless request completed, status:`, browserlessResponse.status)

        if (!browserlessResponse.ok) {
          const errorText = await browserlessResponse.text()
          console.error(`Attempt ${attempt}: Browserless API error status:`, browserlessResponse.status)
          console.error(`Attempt ${attempt}: Browserless API error response:`, errorText)
          console.error(`Attempt ${attempt}: Browserless API headers:`, Object.fromEntries(browserlessResponse.headers.entries()))
          
          // Check if it's an authentication issue (don't retry these)
          if (browserlessResponse.status === 401) {
            throw new Error('Browserless API authentication failed - check API key')
          } else if (browserlessResponse.status === 403) {
            throw new Error('Browserless API access forbidden - check API key permissions')
          } else if (browserlessResponse.status >= 500) {
            // Server errors - we should retry these
            lastError = new Error(`Browserless verification service returned ${browserlessResponse.status}: ${errorText.substring(0, 200)}`)
            if (attempt < maxRetries) {
              console.log(`Attempt ${attempt} failed with server error, retrying in ${attempt * 2} seconds...`)
              await new Promise(resolve => setTimeout(resolve, attempt * 2000))
              continue
            }
          } else {
            // Client errors - don't retry these
            throw new Error(`Browserless API error: ${browserlessResponse.status} - ${errorText.substring(0, 200)}`)
          }
        } else {
          // Success! Process the response
          const browserlessData = await browserlessResponse.json()
          console.log(`Attempt ${attempt}: Browserless content result:`, browserlessData)

          // For /content endpoint, get the final URL from the response
          const finalUrl = browserlessData.url || browserlessData.data?.url
          console.log(`Attempt ${attempt}: Final URL from Browserless:`, finalUrl)

          // Extract groupCode from the final URL
          if (!finalUrl || !finalUrl.includes('hilton.com')) {
            throw new Error('Failed to redirect to Hilton booking page - check your voucher details')
          }
          
          const url = new URL(finalUrl)
          const groupCode = url.searchParams.get('groupCode')
          if (!groupCode) {
            throw new Error('Could not extract groupCode from booking URL - voucher may be invalid')
          }
          
          console.log(`Attempt ${attempt}: Successfully extracted groupCode:`, groupCode)

          return new Response(
            JSON.stringify({ 
              success: true, 
              groupCode,
              finalUrl: finalUrl,
              attempt: attempt
            }),
            { 
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              } 
            }
          )
        }
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message)
        lastError = error
        if (attempt < maxRetries && error.message.includes('Browserless verification service returned')) {
          console.log(`Retrying in ${attempt * 2} seconds...`)
          await new Promise(resolve => setTimeout(resolve, attempt * 2000))
          continue
        } else {
          // Non-retryable error or final attempt
          throw error
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('All retry attempts failed')

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