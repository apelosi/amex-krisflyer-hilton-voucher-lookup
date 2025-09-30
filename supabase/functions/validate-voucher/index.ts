import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoucherValidationRequest {
  creditCard: string;
  voucherCode: string;
}

interface VoucherValidationResult {
  valid: boolean;
  error?: string;
}

// Helper function to validate voucher details using REAL ScraperAPI validation
async function validateVoucher(creditCard: string, voucherCode: string): Promise<VoucherValidationResult> {
  console.log('Real voucher validation for:', { creditCard, voucherCode });
  
  const scraperApiKey = Deno.env.get('SCRAPERAPI_KEY');
  if (!scraperApiKey) {
    return {
      valid: false,
      error: 'SCRAPERAPI_KEY not configured. Please set your ScraperAPI key in the environment variables.'
    };
  }
  
  // Basic format validation first
  if (!creditCard || creditCard.length !== 6) {
    return {
      valid: false,
      error: 'Credit card number must be 6 digits'
    };
  }
  
  if (!voucherCode || voucherCode.length !== 10) {
    return {
      valid: false,
      error: 'Voucher code must be 10 characters'
    };
  }
  
  // Use Fast + Fallback approach like hotel availability function
  const baseUrl = 'https://apac.hilton.com/amexkrisflyer';
  
  try {
    console.log(`Fast checking voucher validation: ${creditCard} / ${voucherCode}`);

    // Try FAST approach first - minimal JavaScript, quick validation
    const fastParams = new URLSearchParams({
      'api_key': scraperApiKey,
      'url': baseUrl,
      'render': 'true', // Need JavaScript for form interaction
      'country_code': 'sg',
      'premium': 'true',
      'wait': '2000', // Short wait
      'custom_js': `
        // ChatGPT-inspired approach: human-like typing + proper event sequence
        setTimeout(async () => {
          console.log('Starting enhanced voucher validation...');
          
          // Try multiple selectors like ChatGPT suggested
          const cardSelectors = ['input[name="bin_number"]', '#bin_number', 'input[autocomplete="cc-number"]', 'input[inputmode="numeric"]'];
          const voucherSelectors = ['input[name="voucher_no"]', '#voucher_no', 'input[name="voucher"]', 'input[data-field="voucher"]'];
          
          let binInput = null;
          let voucherInput = null;
          
          // Find inputs using multiple selectors
          for (const sel of cardSelectors) {
            binInput = document.querySelector(sel);
            if (binInput) break;
          }
          for (const sel of voucherSelectors) {
            voucherInput = document.querySelector(sel);
            if (voucherInput) break;
          }
          
          if (binInput && voucherInput) {
            console.log('Found form inputs, filling with human-like typing...');
            
            // Fill card field with human-like typing
            binInput.focus();
            binInput.value = '';
            const cardValue = '${creditCard}';
            for (let i = 0; i < cardValue.length; i++) {
              binInput.value += cardValue[i];
              binInput.dispatchEvent(new Event('input', { bubbles: true }));
              await new Promise(r => setTimeout(r, 50)); // 50ms delay between chars
            }
            binInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Fill voucher field with human-like typing
            voucherInput.focus();
            voucherInput.value = '';
            const voucherValue = '${voucherCode}';
            for (let i = 0; i < voucherValue.length; i++) {
              voucherInput.value += voucherValue[i];
              voucherInput.dispatchEvent(new Event('input', { bubbles: true }));
              await new Promise(r => setTimeout(r, 50)); // 50ms delay between chars
            }
            voucherInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Trigger blur via Tab (simulates user behavior)
            document.activeElement.blur();
            
            console.log('Form filled, waiting for validation (650ms debounce)...');
            
            // Wait for debounce like ChatGPT suggested
            setTimeout(() => {
              console.log('Checking validation results...');
              
              // Multi-signal validation detection like ChatGPT approach
              const errorSelectors = [
                '[role="alert"]',
                '[aria-live="assertive"]',
                '.invalid-feedback',
                '.error',
                '.has-error',
                '[data-error-for="bin_number"]',
                '[data-error-for="voucher_no"]'
              ];
              
              let errorFound = false;
              let errorDetails = [];
              
              // Check for visible error elements
              errorSelectors.forEach(sel => {
                const elements = document.querySelectorAll(sel);
                elements.forEach(el => {
                  const rect = el.getBoundingClientRect();
                  const style = getComputedStyle(el);
                  const isVisible = rect.width > 0 && rect.height > 0 && 
                                  style.display !== 'none' && 
                                  style.visibility !== 'hidden' && 
                                  style.opacity !== '0';
                  
                  if (isVisible && el.textContent.trim()) {
                    errorFound = true;
                    errorDetails.push({
                      selector: sel,
                      text: el.textContent.trim()
                    });
                  }
                });
              });
              
              // Check ARIA invalid attributes
              if (binInput.getAttribute('aria-invalid') === 'true' || 
                  voucherInput.getAttribute('aria-invalid') === 'true') {
                errorFound = true;
                errorDetails.push({ type: 'aria-invalid', value: 'true' });
              }
              
              // Check validity API
              const cardValid = binInput.checkValidity ? binInput.checkValidity() : true;
              const voucherValid = voucherInput.checkValidity ? voucherInput.checkValidity() : true;
              
              if (!cardValid || !voucherValid) {
                errorFound = true;
                errorDetails.push({ 
                  type: 'validity-api', 
                  cardValid, 
                  voucherValid,
                  cardMessage: binInput.validationMessage || '',
                  voucherMessage: voucherInput.validationMessage || ''
                });
              }
              
              // Check for specific error text (your original approach)
              const specificError = document.body.innerHTML.includes("You've provided an incorrect entry. Please try again.");
              if (specificError) {
                errorFound = true;
                errorDetails.push({ type: 'specific-error-text', found: true });
              }
              
              // Set result marker
              if (errorFound) {
                document.body.setAttribute('data-validation-result', 'INVALID');
                document.body.setAttribute('data-error-details', JSON.stringify(errorDetails));
                console.log('Validation FAILED - errors detected:', errorDetails);
              } else {
                document.body.setAttribute('data-validation-result', 'VALID');
                console.log('Validation SUCCESS - no errors detected');
              }
            }, 650); // ChatGPT's recommended debounce time
            
          } else {
            console.log('Could not find form inputs');
            document.body.setAttribute('data-validation-result', 'FORM_NOT_FOUND');
          }
        }, 1000);
      `
    });

    const fastScraperUrl = `https://api.scraperapi.com/?${fastParams.toString()}`;
    
    // Short timeout for fast approach
    const timeoutMs = 10000; // 10 seconds only
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Fast voucher validation timeout')), timeoutMs);
    });

    const startTime = Date.now();
    const response = await Promise.race([
      fetch(fastScraperUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }),
      timeoutPromise
    ]) as Response;

    const duration = Date.now() - startTime;
    console.log(`${creditCard} fast voucher validation: ${response.status} (${duration}ms)`);

    if (response.ok) {
      const html = await response.text();
      console.log(`${creditCard} fast HTML length: ${html.length}`);

      // Check the enhanced validation result using ChatGPT-inspired approach
      if (html.includes('data-validation-result="INVALID"')) {
        console.log(`${creditCard} FAST INVALID: Enhanced validation detected errors`);
        
        // Extract error details if available
        const errorDetailsMatch = html.match(/data-error-details="([^"]+)"/);
        let errorInfo = '';
        if (errorDetailsMatch) {
          try {
            const details = JSON.parse(errorDetailsMatch[1].replace(/&quot;/g, '"'));
            errorInfo = ' - ' + details.map(d => d.text || d.type).join(', ');
          } catch (e) {
            // Ignore parsing errors
          }
        }
        
        return {
          valid: false,
          error: 'We couldn\'t verify your voucher details. Please check your information and try again. If the problem continues, contact Vibez Ventures.'
        };
      } else if (html.includes('data-validation-result="VALID"')) {
        console.log(`${creditCard} FAST SUCCESS: Enhanced validation confirmed valid`);
        return { valid: true };
      }
      
      // Fallback to simple checks if enhanced validation didn't complete
      const hasSpecificError = html.includes("You've provided an incorrect entry. Please try again.");
      const hasErrorClass = html.includes('class="error"') || html.includes('class="invalid"');
      const hasAriaInvalid = html.includes('aria-invalid="true"');
      
      if (hasSpecificError || hasErrorClass || hasAriaInvalid) {
        console.log(`${creditCard} FAST INVALID: Basic error indicators found`);
        return {
          valid: false,
          error: 'We couldn\'t verify your voucher details. Please check your information and try again. If the problem continues, contact Vibez Ventures.'
        };
      }
      
      console.log(`${creditCard} fast result incomplete, falling back to JS rendering`);
    }

    // Fallback to longer JavaScript rendering if fast approach failed
    console.log(`${creditCard} trying JS rendering fallback`);
    
    const jsParams = new URLSearchParams({
      'api_key': scraperApiKey,
      'url': baseUrl,
      'render': 'true',
      'country_code': 'sg',
      'premium': 'true',
      'wait': '4000', // Longer wait for fallback
      'custom_js': `
        setTimeout(() => {
          // Simplified fallback version of ChatGPT approach
          const cardSelectors = ['input[name="bin_number"]', '#bin_number', 'input[autocomplete="cc-number"]'];
          const voucherSelectors = ['input[name="voucher_no"]', '#voucher_no', 'input[name="voucher"]'];
          
          let binInput = null;
          let voucherInput = null;
          
          for (const sel of cardSelectors) {
            binInput = document.querySelector(sel);
            if (binInput) break;
          }
          for (const sel of voucherSelectors) {
            voucherInput = document.querySelector(sel);
            if (voucherInput) break;
          }
          
          if (binInput && voucherInput) {
            binInput.focus();
            binInput.value = '${creditCard}';
            binInput.dispatchEvent(new Event('input', { bubbles: true }));
            binInput.dispatchEvent(new Event('change', { bubbles: true }));
            binInput.blur();
            
            voucherInput.focus();
            voucherInput.value = '${voucherCode}';
            voucherInput.dispatchEvent(new Event('input', { bubbles: true }));
            voucherInput.dispatchEvent(new Event('change', { bubbles: true }));
            voucherInput.blur();
            
            // Wait for validation like ChatGPT suggested
            setTimeout(() => {
              const hasError = document.body.innerHTML.includes("You've provided an incorrect entry. Please try again.") ||
                             binInput.getAttribute('aria-invalid') === 'true' ||
                             voucherInput.getAttribute('aria-invalid') === 'true' ||
                             document.querySelector('.error, .invalid, [role="alert"]');
                             
              if (hasError) {
                document.body.setAttribute('data-validation-result', 'INVALID');
              } else {
                document.body.setAttribute('data-validation-result', 'VALID');
              }
            }, 650);
          }
        }, 1000);
      `
    });

    const jsScraperUrl = `https://api.scraperapi.com/?${jsParams.toString()}`;
    const jsTimeoutMs = 15000; // 15 seconds for JS version
    const jsTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('JS voucher validation timeout')), jsTimeoutMs);
    });

    const jsStartTime = Date.now();
    const jsResponse = await Promise.race([
      fetch(jsScraperUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }),
      jsTimeoutPromise
    ]) as Response;

    const jsDuration = Date.now() - jsStartTime;
    console.log(`${creditCard} JS voucher validation: ${jsResponse.status} (${jsDuration}ms)`);

    if (!jsResponse.ok) {
      throw new Error(`JS voucher validation failed: ${jsResponse.status}`);
    }

    const jsHtml = await jsResponse.text();
    
    // Check enhanced validation result from fallback
    if (jsHtml.includes('data-validation-result="INVALID"')) {
      console.log(`${creditCard} JS INVALID: Fallback validation detected errors`);
      return {
        valid: false,
        error: 'We couldn\'t verify your voucher details. Please check your information and try again. If the problem continues, contact Vibez Ventures.'
      };
    } else if (jsHtml.includes('data-validation-result="VALID"')) {
      console.log(`${creditCard} JS SUCCESS: Fallback validation confirmed valid`);
      return { valid: true };
    } else {
      // Final fallback to simple error detection
      const hasSpecificError = jsHtml.includes("You've provided an incorrect entry. Please try again.");
      
      if (hasSpecificError) {
        console.log(`${creditCard} JS INVALID: Found specific error message`);
        return {
          valid: false,
          error: 'We couldn\'t verify your voucher details. Please check your information and try again. If the problem continues, contact Vibez Ventures.'
        };
      } else {
        console.log(`${creditCard} JS SUCCESS: No error indicators found`);
        return { valid: true };
      }
    }

  } catch (error) {
    console.log('Voucher validation error:', error.message);
    return {
      valid: false,
      error: 'Unable to verify voucher details at this time. Please try again.'
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: VoucherValidationRequest = await req.json();
    console.log('Validating voucher:', requestData);

    const result = await validateVoucher(requestData.creditCard, requestData.voucherCode);
    
    return new Response(JSON.stringify({
      success: true,
      valid: result.valid,
      error: result.error
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in validate-voucher function:', error);
    return new Response(JSON.stringify({
      success: false,
      valid: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
