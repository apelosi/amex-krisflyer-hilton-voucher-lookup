import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Browserless API test...');
    
    const browserlessApiKey = Deno.env.get('BROWSERLESS_API_KEY');
    
    if (!browserlessApiKey) {
      console.error('BROWSERLESS_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ 
          error: 'BROWSERLESS_API_KEY not configured',
          success: false 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('API key found, testing basic connectivity...');

    // Test 1: Basic API health check
    const healthUrl = `https://production-sfo.browserless.io/json/version?token=${browserlessApiKey}`;
    console.log('Testing health endpoint:', healthUrl.replace(browserlessApiKey, '[REDACTED]'));
    
    const healthResponse = await fetch(healthUrl);
    console.log('Health response status:', healthResponse.status);
    
    if (!healthResponse.ok) {
      const errorText = await healthResponse.text();
      console.error('Health check failed:', errorText);
      return new Response(
        JSON.stringify({ 
          error: `Health check failed: ${healthResponse.status} - ${errorText}`,
          success: false,
          step: 'health_check'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const healthData = await healthResponse.json();
    console.log('Health check successful:', healthData);

    // Test 2: Simple page content retrieval
    const contentUrl = `https://production-sfo.browserless.io/content?token=${browserlessApiKey}`;
    console.log('Testing content endpoint...');
    
    const contentResponse = await fetch(contentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://httpbin.org/get'
      })
    });

    console.log('Content response status:', contentResponse.status);

    if (!contentResponse.ok) {
      const errorText = await contentResponse.text();
      console.error('Content test failed:', errorText);
      return new Response(
        JSON.stringify({ 
          error: `Content test failed: ${contentResponse.status} - ${errorText}`,
          success: false,
          step: 'content_test',
          healthCheck: healthData
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const contentData = await contentResponse.text();
    console.log('Content test successful, page length:', contentData.length);

    // Test 3: Simple scraping test
    const scrapeUrl = `https://production-sfo.browserless.io/scrape?token=${browserlessApiKey}`;
    console.log('Testing scrape endpoint...');
    
    const scrapeResponse = await fetch(scrapeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://httpbin.org/get',
        elements: [{
          selector: 'title'
        }]
      })
    });

    console.log('Scrape response status:', scrapeResponse.status);

    let scrapeData = null;
    if (scrapeResponse.ok) {
      scrapeData = await scrapeResponse.json();
      console.log('Scrape test successful:', scrapeData);
    } else {
      const errorText = await scrapeResponse.text();
      console.log('Scrape test failed (non-critical):', errorText);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'All API tests completed successfully!',
        results: {
          healthCheck: healthData,
          contentTestLength: contentData.length,
          scrapeTest: scrapeData
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Test function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        step: 'unknown'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});