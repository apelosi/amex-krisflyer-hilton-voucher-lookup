#!/usr/bin/env node

/**
 * Integration Test Script for Hotel Availability Function
 * 
 * This script tests the check-hotel-availability function with real test cases
 * and validates the expected outputs.
 */

import https from 'https';
import { execSync } from 'child_process';

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://ynlnrvuqypmwpevabtdc.supabase.co',
  anonKey: process.env.SUPABASE_ANON_KEY,
  functionName: 'test-hotel-availability'
};

// Test cases for check-hotel-availability
const HOTEL_AVAILABILITY_TESTS = [
  {
    name: "Test 1: SINGI Hotel - Expected 2 rooms available",
    input: {
      creditCard: "377361",
      voucherCode: "P370336ZYH",
      destination: "Singapore",
      hotel: "SINGI",
      arrivalDate: "2025-10-15",
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

// Test cases for validate-voucher
const VOUCHER_VALIDATION_TESTS = [
  {
    name: "Voucher Test 1: Valid voucher - Expected TRUE",
    input: {
      creditCard: "377361",
      voucherCode: "P370336ZYH"
    },
    expected: {
      valid: true
    }
  },
  {
    name: "Voucher Test 2: Invalid credit card - Expected FALSE",
    input: {
      creditCard: "377362",
      voucherCode: "P370336ZYA"
    },
    expected: {
      valid: false
    }
  },
  {
    name: "Voucher Test 3: Invalid voucher code - Expected FALSE",
    input: {
      creditCard: "377361",
      voucherCode: "P370336ZYA"
    },
    expected: {
      valid: false
    }
  }
  {
  name: "Voucher Test 4: Valid voucher code - Expected TRUE",
    input: {
      creditCard: "379875",
      voucherCode: "J526224GBZ"
    },
    expected: {
      valid: true
    }
  }
];

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test the hotel availability function directly
async function testHotelAvailability(testCase) {
  const functionUrl = `${TEST_CONFIG.supabaseUrl}/functions/v1/check-hotel-availability`;
  
  console.log(`\n--- Running ${testCase.name} ---`);
  console.log('Input:', JSON.stringify(testCase.input, null, 2));
  
  const startTime = Date.now();
  
  try {
    const response = await makeRequest(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_CONFIG.anonKey}`
      },
      body: JSON.stringify(testCase.input)
    });
    
    const duration = Date.now() - startTime;
    console.log(`Response status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status !== 200) {
      return {
        testName: testCase.name,
        passed: false,
        error: `HTTP ${response.status}: ${response.data.error || 'Unknown error'}`,
        duration
      };
    }
    
    const result = response.data;
    
    if (!result.success) {
      return {
        testName: testCase.name,
        passed: false,
        actual: result,
        expected: testCase.expected,
        error: `Function returned success: false - ${result.error}`,
        duration
      };
    }
    
    if (!result.availability || !Array.isArray(result.availability) || result.availability.length === 0) {
      return {
        testName: testCase.name,
        passed: false,
        actual: result,
        expected: testCase.expected,
        error: 'No availability data returned',
        duration
      };
    }
    
    const availability = result.availability[0];
    
    // Check if availability matches expected
    const availabilityMatches = availability.available === testCase.expected.available;
    const roomCountMatches = testCase.expected.roomCount === undefined || 
      availability.roomCount === testCase.expected.roomCount;
    
    const testPassed = availabilityMatches && roomCountMatches;
    
    return {
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
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      testName: testCase.name,
      passed: false,
      error: error.message,
      duration
    };
  }
}

// Run the test suite
async function runTests() {
  console.log('🚀 Starting Hotel Availability Integration Tests');
  console.log('================================================');
  
  if (!TEST_CONFIG.anonKey) {
    console.error('❌ SUPABASE_ANON_KEY environment variable is required');
    process.exit(1);
  }
  
  const results = [];
  let allTestsPassed = true;
  
  for (const testCase of TEST_CASES) {
    const result = await testHotelAvailability(testCase);
    results.push(result);
    
    if (!result.passed) {
      allTestsPassed = false;
    }
    
    console.log(`Test ${result.passed ? '✅ PASSED' : '❌ FAILED'}: ${testCase.name}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    console.log(`  Duration: ${result.duration}ms`);
  }
  
  // Summary
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Overall Result: ${allTestsPassed ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!allTestsPassed) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`  - ${result.testName}: ${result.error}`);
    });
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test suite error:', error);
  process.exit(1);
});
