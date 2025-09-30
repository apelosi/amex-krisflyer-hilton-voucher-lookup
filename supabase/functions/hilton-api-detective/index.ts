import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const scraperApiKey = Deno.env.get('SCRAPERAPI_KEY');
    if (!scraperApiKey) {
      throw new Error('SCRAPERAPI_KEY not configured');
    }

    // Use ScraperAPI to access browser dev tools and capture network requests
    const hiltonUrl = 'https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=SINGI&arrivalDate=2025-10-15&departureDate=2025-10-16&groupCode=ZKFA25&room1NumAdults=1&cid=OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book';

    // Custom JavaScript to intercept network requests
    const networkInterceptorScript = `
      // Capture all fetch and XMLHttpRequest calls
      const originalFetch = window.fetch;
      const originalXHR = window.XMLHttpRequest;
      const capturedRequests = [];

      // Override fetch
      window.fetch = function(...args) {
        const url = args[0];
        const options = args[1] || {};
        
        if (url.toString().includes('hilton') || url.toString().includes('api') || url.toString().includes('book') || url.toString().includes('availability')) {
          capturedRequests.push({
            type: 'fetch',
            url: url.toString(),
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.body,
            timestamp: Date.now()
          });
        }
        
        return originalFetch.apply(this, args);
      };

      // Override XMLHttpRequest
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;
      
      XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._intercepted = {
          method: method,
          url: url.toString(),
          headers: {}
        };
        return originalOpen.apply(this, [method, url, ...args]);
      };

      XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
        if (this._intercepted) {
          this._intercepted.headers[header] = value;
        }
        return XMLHttpRequest.prototype.setRequestHeader.apply(this, [header, value]);
      };

      XMLHttpRequest.prototype.send = function(body) {
        if (this._intercepted && 
            (this._intercepted.url.includes('hilton') || 
             this._intercepted.url.includes('api') || 
             this._intercepted.url.includes('book') || 
             this._intercepted.url.includes('availability'))) {
          
          capturedRequests.push({
            type: 'xhr',
            method: this._intercepted.method,
            url: this._intercepted.url,
            headers: this._intercepted.headers,
            body: body,
            timestamp: Date.now()
          });
        }
        return originalSend.apply(this, [body]);
      };

      // Wait for page to load and capture requests
      setTimeout(() => {
        console.log('CAPTURED_REQUESTS:', JSON.stringify(capturedRequests, null, 2));
        
        // Try to find API endpoints in page source
        const scripts = Array.from(document.scripts);
        const apiEndpoints = [];
        
        scripts.forEach(script => {
          const content = script.innerHTML || script.textContent || '';
          const apiMatches = content.match(/https?:\\/\\/[^"'\\s]+api[^"'\\s]*/gi) || [];
          const bookingMatches = content.match(/https?:\\/\\/[^"'\\s]+book[^"'\\s]*/gi) || [];
          apiEndpoints.push(...apiMatches, ...bookingMatches);
        });
        
        console.log('API_ENDPOINTS_FOUND:', JSON.stringify([...new Set(apiEndpoints)], null, 2));
        
        // Also look for specific patterns in the HTML
        const pageText = document.body.innerText;
        const hasAvailabilityAPI = pageText.includes('availability') || pageText.includes('rooms');
        
        console.log('PAGE_ANALYSIS:', {
          hasAvailabilityAPI,
          totalRequests: capturedRequests.length,
          pageLoadComplete: document.readyState === 'complete'
        });
      }, 8000); // Wait 8 seconds for full page load
    `;

    const scraperParams = new URLSearchParams({
      'api_key': scraperApiKey,
      'url': hiltonUrl,
      'render': 'true',
      'country_code': 'sg',
      'premium': 'true',
      'wait': '10000', // Wait longer to capture all requests
      'session_number': '1',
      'custom_js': networkInterceptorScript
    });

    const scraperUrl = `https://api.scraperapi.com/?${scraperParams.toString()}`;
    
    console.log('Starting network interception...');
    
    const response = await fetch(scraperUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`ScraperAPI failed: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract captured requests from console logs
    const capturedRequestsMatch = html.match(/CAPTURED_REQUESTS: (.*?)(?=CAPTURED_REQUESTS:|API_ENDPOINTS_FOUND:|PAGE_ANALYSIS:|$)/s);
    const apiEndpointsMatch = html.match(/API_ENDPOINTS_FOUND: (.*?)(?=CAPTURED_REQUESTS:|API_ENDPOINTS_FOUND:|PAGE_ANALYSIS:|$)/s);
    const pageAnalysisMatch = html.match(/PAGE_ANALYSIS: (.*?)(?=CAPTURED_REQUESTS:|API_ENDPOINTS_FOUND:|PAGE_ANALYSIS:|$)/s);

    let capturedRequests = [];
    let apiEndpoints = [];
    let pageAnalysis = {};

    try {
      if (capturedRequestsMatch) capturedRequests = JSON.parse(capturedRequestsMatch[1].trim());
      if (apiEndpointsMatch) apiEndpoints = JSON.parse(apiEndpointsMatch[1].trim());
      if (pageAnalysisMatch) pageAnalysis = JSON.parse(pageAnalysisMatch[1].trim());
    } catch (parseError) {
      console.log('Parse error:', parseError.message);
    }

    // Look for booking-related URLs in the HTML itself
    const urlPattern = /https?:\/\/[^\s"'<>]+(?:api|book|availability|reservation)[^\s"'<>]*/gi;
    const htmlUrls = html.match(urlPattern) || [];

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        capturedRequests: capturedRequests.length,
        apiEndpoints: apiEndpoints.length,
        pageAnalysis,
        foundUrls: [...new Set(htmlUrls)].slice(0, 10), // First 10 unique URLs
        // Include first few captured requests for analysis
        sampleRequests: capturedRequests.slice(0, 5)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('API detective error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
