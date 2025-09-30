import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestCase {
  name: string;
  input: {
    creditCard: string;
    voucherCode: string;
    destination: string;
    hotel: string;
    arrivalDate: string;
    voucherExpiry: string;
    groupCode: string;
  };
  expected: {
    available: boolean;
    roomCount?: number;
  };
}

interface TestResult {
  testName: string;
  passed: boolean;
  actual?: any;
  expected?: any;
  error?: string;
  duration: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Hotel Availability Integration Tests...');
    
    // Test cases based on your requirements
    const testCases: TestCase[] = [
      {
        name: "Test 1: SINGI Hotel - Expected 2 rooms available",
        input: {
          creditCard: "377361",
          voucherCode: "P370336ZYH",
          destination: "Singapore",
          hotel: "SINGI",
          arrivalDate: "2025-11-12",
          voucherExpiry: "2026-07-31",
          groupCode: "ZKFA25"
        },
        expected: {
          available: true,
          roomCount: 2
        }
      },
      {
        name: "Test 2: SINOR Hotel - Expected 0 rooms available",
        input: {
          creditCard: "377361",
          voucherCode: "P370336ZYH", 
          destination: "Singapore",
          hotel: "SINOR",
          arrivalDate: "2025-10-15",
          voucherExpiry: "2026-07-31",
          groupCode: "ZKFA25"
        },
        expected: {
          available: false,
          roomCount: 0
        }
      }
    ];

    const results: TestResult[] = [];
    let allTestsPassed = true;

    // Get the function URL from environment or construct it
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const functionUrl = `${supabaseUrl}/functions/v1/check-hotel-availability`;
    
    console.log('Testing function at:', functionUrl);

    for (const testCase of testCases) {
      console.log(`\n--- Running ${testCase.name} ---`);
      const startTime = Date.now();
      
      try {
        // Call the actual function
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify(testCase.input)
        });

        const duration = Date.now() - startTime;
        console.log(`Response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Function call failed: ${errorText}`);
          
          results.push({
            testName: testCase.name,
            passed: false,
            error: `HTTP ${response.status}: ${errorText}`,
            duration
          });
          allTestsPassed = false;
          continue;
        }

        const actualResult = await response.json();
        console.log('Actual result:', JSON.stringify(actualResult, null, 2));
        
        // Validate the response structure
        if (!actualResult.success) {
          results.push({
            testName: testCase.name,
            passed: false,
            actual: actualResult,
            expected: testCase.expected,
            error: `Function returned success: false - ${actualResult.error}`,
            duration
          });
          allTestsPassed = false;
          continue;
        }

        if (!actualResult.availability || !Array.isArray(actualResult.availability) || actualResult.availability.length === 0) {
          results.push({
            testName: testCase.name,
            passed: false,
            actual: actualResult,
            expected: testCase.expected,
            error: 'No availability data returned',
            duration
          });
          allTestsPassed = false;
          continue;
        }

        const availability = actualResult.availability[0];
        
        // Check if availability matches expected
        const availabilityMatches = availability.available === testCase.expected.available;
        const roomCountMatches = testCase.expected.roomCount === undefined || 
          availability.roomCount === testCase.expected.roomCount;
        
        const testPassed = availabilityMatches && roomCountMatches;
        
        if (!testPassed) {
          allTestsPassed = false;
        }

        results.push({
          testName: testCase.name,
          passed: testPassed,
          actual: {
            available: availability.available,
            roomCount: availability.roomCount
          },
          expected: testCase.expected,
          error: testPassed ? undefined : 
            `Availability: ${availability.available} (expected ${testCase.expected.available}), ` +
            `RoomCount: ${availability.roomCount} (expected ${testCase.expected.roomCount})`,
          duration
        });

        console.log(`Test ${testPassed ? 'PASSED' : 'FAILED'}: ${testCase.name}`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`Test error for ${testCase.name}:`, error);
        
        results.push({
          testName: testCase.name,
          passed: false,
          error: error.message,
          duration
        });
        allTestsPassed = false;
      }
    }

    // Summary
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n=== TEST SUMMARY ===`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Overall Result: ${allTestsPassed ? 'PASS' : 'FAIL'}`);

    return new Response(
      JSON.stringify({
        success: allTestsPassed,
        summary: {
          total: totalTests,
          passed: passedTests,
          failed: failedTests,
          duration: totalDuration
        },
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        status: allTestsPassed ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Test suite error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
