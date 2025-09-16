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

// Helper function to validate voucher details
async function validateVoucher(creditCard: string, voucherCode: string): Promise<VoucherValidationResult> {
  console.log('Validating voucher:', { creditCard, voucherCode });
  
  const scraperApiKey = Deno.env.get('SCRAPERAPI_KEY');
  if (!scraperApiKey) {
    return {
      valid: false,
      error: 'SCRAPERAPI_KEY not configured. Please set your ScraperAPI key in the environment variables.'
    };
  }
  
  // Step 1: Load the voucher verification page
  const verificationUrl = 'https://apac.hilton.com/amexkrisflyer';
  const scraperParams = new URLSearchParams({
    'api_key': scraperApiKey,
    'url': verificationUrl,
    'render': 'true',
    'country_code': 'sg',
    'session_number': '1',
    'wait': '3000', // Wait for JavaScript to execute
    'premium': 'true' // Required for protected domains
  });
  
  const scraperUrl = `https://api.scraperapi.com/?${scraperParams.toString()}`;
  
  try {
    const response = await fetch(scraperUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.log('Voucher verification page load failed:', response.status);
      return {
        valid: false,
        error: 'Failed to load voucher verification page'
      };
    }
    
    const html = await response.text();
    console.log('Voucher verification page loaded, length:', html.length);
    
    // Step 2: Simulate form interaction with JavaScript to trigger client-side validation
    const interactionScript = `
      // Fill in the credit card number and trigger validation
      const binInput = document.querySelector('input[name="bin_number"]');
      if (binInput) {
        binInput.value = '${creditCard}';
        binInput.dispatchEvent(new Event('input', { bubbles: true }));
        binInput.dispatchEvent(new Event('change', { bubbles: true }));
        binInput.dispatchEvent(new Event('blur', { bubbles: true }));
      }
      
      // Fill in the voucher code and trigger validation
      const voucherInput = document.querySelector('input[name="voucher_no"]');
      if (voucherInput) {
        voucherInput.value = '${voucherCode}';
        voucherInput.dispatchEvent(new Event('input', { bubbles: true }));
        voucherInput.dispatchEvent(new Event('change', { bubbles: true }));
        voucherInput.dispatchEvent(new Event('blur', { bubbles: true }));
      }
      
      // Wait for client-side validation to complete
      setTimeout(() => {
        console.log('Client-side validation completed');
      }, 3000);
    `;
    
    // Execute the interaction
    const jsScraperParams = new URLSearchParams({
      'api_key': scraperApiKey,
      'url': verificationUrl,
      'render': 'true',
      'country_code': 'sg', // Use Singapore proxies for APAC region
      'session_number': '1',
      'wait': '5000', // Wait for validation to complete
      'premium': 'true', // Required for protected domains
      'custom_js': interactionScript
    });
    
    const jsScraperUrl = `https://api.scraperapi.com/?${jsScraperParams.toString()}`;
    
    const jsResponse = await fetch(jsScraperUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!jsResponse.ok) {
      console.log('Voucher verification interaction failed:', jsResponse.status);
      return {
        valid: false,
        error: 'Failed to validate voucher details'
      };
    }
    
    const resultHtml = await jsResponse.text();
    console.log('Voucher verification interaction completed, length:', resultHtml.length);
    
    // Step 3: Check for client-side validation results
    // Look for error messages (red error text)
    const hasBinError = resultHtml.includes('bin_error') || resultHtml.includes('You\'ve provided an incorrect entry');
    const hasVoucherError = resultHtml.includes('voucher_error') || resultHtml.includes('You\'ve provided an incorrect entry');
    
    if (hasBinError || hasVoucherError) {
      console.log('Voucher validation failed - validation errors present');
      return {
        valid: false,
        error: 'We couldn\'t verify your voucher details. Please check your information and try again. If the problem continues, contact Vibez Ventures.'
      };
    }
    
    // Check if submit button is enabled (indicates successful validation)
    const submitButtonMatch = resultHtml.match(/<input[^>]*type="submit"[^>]*>/i);
    if (submitButtonMatch) {
      const isDisabled = submitButtonMatch[0].includes('disabled');
      if (isDisabled) {
        console.log('Voucher validation failed - submit button is disabled');
        return {
          valid: false,
          error: 'We couldn\'t verify your voucher details. Please check your information and try again. If the problem continues, contact Vibez Ventures.'
        };
      } else {
        console.log('Voucher validation successful - submit button is enabled');
        return { valid: true };
      }
    }
    
    // If we can't find the submit button, assume validation passed if no errors
    console.log('Voucher validation successful - no errors found');
    return { valid: true };
    
  } catch (error) {
    console.log('Voucher validation error:', error.message);
    return {
      valid: false,
      error: 'An error occurred while validating your voucher details. Please try again.'
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
