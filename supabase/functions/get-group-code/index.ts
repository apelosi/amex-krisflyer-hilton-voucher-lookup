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
        const browserlessResponse = await fetch(`https://production-sfo.browserless.io/function?token=${browserlessApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify({
            code: `
              export default async ({ page, context }) => {
                const { creditCard, voucherCode, destination, hotel, arrivalDate } = context;
                console.log('Starting automation with params:', { creditCard, voucherCode, destination, hotel, arrivalDate });
                
                try {
                  // Navigate to the AMEX KrisFlyer page (8s timeout)
                  await page.goto('https://apac.hilton.com/amexkrisflyer', { waitUntil: 'domcontentloaded', timeout: 8000 });
                  console.log('Page loaded successfully');
                  
                  // Wait for the form to be available (5s timeout)
                  await page.waitForSelector('form#cc_form', { timeout: 5000 });
                  console.log('Form found');
                  
                  // Fill in credit card number and voucher code simultaneously
                  await Promise.all([
                    page.type('input[name="bin_number"]', creditCard),
                    page.type('input[name="voucher_no"]', voucherCode)
                  ]);
                  console.log('Credit card and voucher filled');
                  
                  // Click the "Go" button to proceed to second stage
                  await page.click('input[name="btn-go"]');
                  console.log('Go button clicked');
                  
                  // Wait for second stage form to load (5s timeout)
                  await page.waitForSelector('select[name="amex_dest_select"]', { timeout: 5000 });
                  console.log('Second stage form loaded');
                  
                  // Select destination - get options and select in one go
                  const destinationOptions = await page.$$eval('select[name="amex_dest_select"] option', options => 
                    options.map(option => ({ value: option.value, text: option.textContent.trim() }))
                  );
                  console.log('Available destinations:', destinationOptions);
                  
                  // Find the correct destination option
                  const destinationOption = destinationOptions.find(opt => opt.text === destination);
                  if (!destinationOption) {
                    throw new Error('Destination not found: ' + destination);
                  }
                  
                  await page.select('select[name="amex_dest_select"]', destinationOption.value);
                  console.log('Destination selected:', destination);
                  
                  // Smart polling for hotel options instead of fixed delay
                  console.log('Polling for hotel options...');
                  let hotelOptionsAvailable = false;
                  const maxPollAttempts = 30; // 3 seconds max (100ms intervals)
                  
                  for (let i = 0; i < maxPollAttempts; i++) {
                    try {
                      const hotelOptions = await page.$$eval('select[name="amex_select"] option[value!=""]', options => options.length);
                      if (hotelOptions > 0) {
                        hotelOptionsAvailable = true;
                        break;
                      }
                    } catch (e) {
                      // Element not ready yet, continue polling
                    }
                    await page.waitForTimeout(100);
                  }
                  
                  if (!hotelOptionsAvailable) {
                    throw new Error('Hotel options failed to load within 3 seconds');
                  }
                  
                  console.log('Hotel options loaded');
                  
                  // Get all hotel options
                  const hotelOptions = await page.$$eval('select[name="amex_select"] option', options => 
                    options.map(option => ({ value: option.value, text: option.textContent.trim() }))
                  );
                  console.log('Available hotels:', hotelOptions);
                  
                  // Select hotel using the hotel code
                  await page.select('select[name="amex_select"]', hotel);
                  console.log('Hotel selected:', hotel);
                  
                  // Click arrival date button and set date immediately
                  await page.click('button#arrival-btn');
                  console.log('Arrival date button clicked');
                  
                  // Poll for date input availability (max 1 second)
                  let dateInputReady = false;
                  for (let i = 0; i < 10; i++) {
                    try {
                      const dateInput = await page.$('input[name="arrival"]');
                      if (dateInput) {
                        dateInputReady = true;
                        break;
                      }
                    } catch (e) {
                      // Continue polling
                    }
                    await page.waitForTimeout(100);
                  }
                  
                  if (!dateInputReady) {
                    throw new Error('Date input failed to appear within 1 second');
                  }
                  
                  // Set arrival date using evaluate
                  await page.evaluate((arrivalDate) => {
                    const arrivalInput = document.querySelector('input[name="arrival"]');
                    if (arrivalInput) {
                      arrivalInput.value = arrivalDate;
                      arrivalInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }, arrivalDate);
                  console.log('Arrival date set:', arrivalDate);
                  
                  // Check the agreement checkbox
                  await page.click('input[name="agree"]');
                  console.log('Agreement checkbox checked');
                  
                  // Click final submit button and wait for navigation (5s timeout)
                  await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }),
                    page.click('input#gobtn')
                  ]);
                  console.log('Final submission completed');
                  
                  // Get the final URL
                  const finalUrl = page.url();
                  console.log('Final URL:', finalUrl);
                  
                  return {
                    success: true,
                    finalUrl: finalUrl,
                    timestamp: new Date().toISOString()
                  };
                  
                } catch (error) {
                  console.error('Automation error:', error.message);
                  return {
                    success: false,
                    error: error.message,
                    currentUrl: page.url(),
                    timestamp: new Date().toISOString()
                  };
                }
              };
            `,
            context: cleanedParams
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
          } else if (browserlessResponse.status === 429) {
            // Rate limiting - retry with longer delays
            lastError = new Error(`Browserless API rate limited: ${errorText.substring(0, 200)}`)
            if (attempt < maxRetries) {
              const delay = Math.min(attempt * 5000, 15000) // 5s, 10s, 15s max
              console.log(`Attempt ${attempt} failed with rate limit, retrying in ${delay / 1000} seconds...`)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            }
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
          console.log(`Attempt ${attempt}: Browserless function result:`, browserlessData)

          // Check if the automation was successful
          if (!browserlessData.success) {
            throw new Error(`Automation failed: ${browserlessData.error || 'Unknown error'}`)
          }

          // For /function endpoint, get the final URL from the automation result
          const finalUrl = browserlessData.finalUrl
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
              attempt: attempt,
              timestamp: browserlessData.timestamp
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