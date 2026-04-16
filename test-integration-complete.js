#!/usr/bin/env node

/**
 * Complete Integration Test Script for Hotel Availability and Voucher Validation Functions
 *
 * This script tests both the check-hotel-availability and validate-voucher functions
 * with comprehensive test cases and validates the expected outputs.
 */

import https from 'https';

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://ynlnrvuqypmwpevabtdc.supabase.co',
  anonKey: process.env.SUPABASE_ANON_KEY,
};

// Test cases for check-hotel-availability
const HOTEL_AVAILABILITY_TESTS = [
  {
    name: "Test 1: SINCICI Hotel on 2026-04-25",
    input: {
      creditCard: "377361",
      voucherCode: "P370336ZYH",
      destination: "Singapore",
      hotel: "SINCICI",
      arrivalDate: "2026-05-06",
      voucherExpiry: "2026-07-31",
      groupCode: "ZKFA25"
    },
    expected: {
      available: true,
      roomCount: 15
    }
  },
  {
    name: "Test 2: SINCICI Hotel on 2026-05-06",
    input: {
      creditCard: "377361",
      voucherCode: "P370336ZYH",
      destination: "Singapore",
      hotel: "SINCICI",
      arrivalDate: "2026-05-06",
      voucherExpiry: "2026-07-31",
      groupCode: "ZKFA25"
    },
    expected: {
      available: true,
      roomCount: 16
    }
  },
  {
    name: "Test 3: SINGI Hotel on 2026-04-30",
    input: {
      creditCard: "377361",
      voucherCode: "P370336ZYH",
      destination: "Singapore",
      hotel: "SINGI",
      arrivalDate: "2026-04-30",
      voucherExpiry: "2026-07-31",
      groupCode: "ZKFA25"
    },
    expected: {
      available: true,
      roomCount: 2
    }
  },
  {
    name: "Test 4: SINGI Hotel on 2026-05-01",
    input: {
      creditCard: "377361",
      voucherCode: "P370336ZYH",
      destination: "Singapore",
      hotel: "SINGI",
      arrivalDate: "2026-05-01",
      voucherExpiry: "2026-07-31",
      groupCode: "ZKFA25"
    },
    expected: {
      available: true,
      roomCount: 2
    }
  },
  {
    name: "Test 5: SINOR Hotel on 2026-04-25",
    input: {
      creditCard: "377361",
      voucherCode: "P370336ZYH",
      destination: "Singapore",
      hotel: "SINOR",
      arrivalDate: "2026-04-25",
      voucherExpiry: "2026-07-31",
      groupCode: "ZKFA25"
    },
    expected: {
      available: true,
      roomCount: 19
    }
  },
  {
    name: "Test 6: SINOR Hotel on 2026-05-02",
    input: {
      creditCard: "377361",
      voucherCode: "P370336ZYH",
      destination: "Singapore",
      hotel: "SINOR",
      arrivalDate: "2026-05-02",
      voucherExpiry: "2026-07-31",
      groupCode: "ZKFA25"
    },
    expected: {
      available: false,
      roomCount: 15
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
  },
  {
    name: "Voucher Test 4: Valid voucher code - Expected TRUE",
    input: {
      creditCard: "379875",
      voucherCode: "J526224GBZ"
    },
    expected: {
      valid: true
    }
  },
  {
    name: "Voucher Test 5: Invalid credit card - Expected FALSE",
    input: {
      creditCard: "379575",
      voucherCode: "J526224GBZ"
    },
    expected: {
      valid: false
    }
  },
  {
    name: "Voucher Test 6: Invalid voucher code - Expected FALSE",
    input: {
      creditCard: "379875",
      voucherCode: "J526234GBZ"
    },
    expected: {
      valid: false
    }
  }
];

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data: data });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Test voucher validation function
async function testVoucherValidation(testCase) {
  const startTime = Date.now();
  
  try {
    const functionUrl = `${TEST_CONFIG.supabaseUrl}/functions/v1/validate-voucher`;
    const response = await makeRequest(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': TEST_CONFIG.anonKey,
        'Authorization': `Bearer ${TEST_CONFIG.anonKey}`,
      },
      body: JSON.stringify(testCase.input),
    });

    const responseBody = JSON.parse(response.data);
    const duration = Date.now() - startTime;

    let passed = true;
    let error = null;

    if (response.statusCode !== 200 || !responseBody.success) {
      passed = false;
      error = `HTTP ${response.statusCode}: ${responseBody.error || 'Unknown error'}`;
    } else {
      if (responseBody.valid !== testCase.expected.valid) {
        passed = false;
        error = `Validation result mismatch: Expected ${testCase.expected.valid}, Got ${responseBody.valid}`;
      }
    }

    return {
      name: testCase.name,
      passed,
      error,
      duration
    };
  } catch (error) {
    return {
      name: testCase.name,
      passed: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

// Test hotel availability function
async function testHotelAvailability(testCase) {
  const startTime = Date.now();
  
  try {
    const functionUrl = `${TEST_CONFIG.supabaseUrl}/functions/v1/check-hotel-availability`;
    const response = await makeRequest(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': TEST_CONFIG.anonKey,
        'Authorization': `Bearer ${TEST_CONFIG.anonKey}`,
      },
      body: JSON.stringify(testCase.input),
    });

    const responseBody = JSON.parse(response.data);
    const duration = Date.now() - startTime;

    let passed = true;
    let error = null;

    if (response.statusCode !== 200 || !responseBody.success) {
      passed = false;
      error = `HTTP ${response.statusCode}: ${responseBody.error || 'Unknown error'}`;
    } else {
      const actualAvailability = responseBody.availability[0];
      if (actualAvailability.available !== testCase.expected.available) {
        passed = false;
        error = `Availability mismatch: Expected ${testCase.expected.available}, Got ${actualAvailability.available}`;
      } else if (testCase.expected.roomCount !== undefined && actualAvailability.roomCount !== testCase.expected.roomCount) {
        passed = false;
        error = `Room count mismatch: Expected ${testCase.expected.roomCount}, Got ${actualAvailability.roomCount}`;
      }
    }

    return {
      name: testCase.name,
      passed,
      error,
      duration
    };
  } catch (error) {
    return {
      name: testCase.name,
      passed: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

// Run voucher validation tests
async function runVoucherValidationTests() {
  console.log('🎫 Starting Voucher Validation Integration Tests');
  console.log('================================================');

  const results = [];
  let allTestsPassed = true;

  for (const testCase of VOUCHER_VALIDATION_TESTS) {
    console.log(`\n--- Running ${testCase.name} ---`);
    console.log('Input:', JSON.stringify(testCase.input, null, 2));

    const result = await testVoucherValidation(testCase);
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

  console.log('\n📊 VOUCHER VALIDATION TEST SUMMARY');
  console.log('==================================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Overall Result: ${allTestsPassed ? '✅ PASS' : '❌ FAIL'}`);

  if (!allTestsPassed) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }

  return allTestsPassed;
}

// Run hotel availability tests
async function runHotelAvailabilityTests() {
  console.log('\n🏨 Starting Hotel Availability Integration Tests');
  console.log('=================================================');

  const results = [];
  let allTestsPassed = true;

  for (const testCase of HOTEL_AVAILABILITY_TESTS) {
    console.log(`\n--- Running ${testCase.name} ---`);
    console.log('Input:', JSON.stringify(testCase.input, null, 2));

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

  console.log('\n📊 HOTEL AVAILABILITY TEST SUMMARY');
  console.log('===================================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Overall Result: ${allTestsPassed ? '✅ PASS' : '❌ FAIL'}`);

  if (!allTestsPassed) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }

  return allTestsPassed;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Complete Integration Test Suite');
  console.log('============================================');

  if (!TEST_CONFIG.anonKey) {
    console.error('❌ SUPABASE_ANON_KEY environment variable is required');
    process.exit(1);
  }

  const globalStartTime = Date.now();

  try {
    // Run voucher validation tests
    const voucherTestsPassed = await runVoucherValidationTests();
    
    // Run hotel availability tests
    const hotelTestsPassed = await runHotelAvailabilityTests();

    // Overall summary
    const overallPassed = voucherTestsPassed && hotelTestsPassed;
    const totalDuration = Date.now() - globalStartTime;

    console.log('\n🎯 OVERALL TEST SUMMARY');
    console.log('=======================');
    console.log(`Voucher Validation: ${voucherTestsPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Hotel Availability: ${hotelTestsPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Overall Result: ${overallPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    if (overallPassed) {
      console.log('\n🎉 All integration tests completed successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Some integration tests failed. Please check the logs above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Test suite failed with error:', error.message);
    process.exit(1);
  }
}

// Run the complete test suite
runAllTests();
