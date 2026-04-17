#!/usr/bin/env node
/**
 * Integration Test Script for:
 * - check-hotel-availability
 * - validate-voucher
 *
 * Used for both local runs and GitHub Actions scheduled runs.
 *
 * Locally: put secrets in `.env.local` or `.env` in the repo root (both gitignored).
 * Same publishable/anon key may be named VITE_SUPABASE_PUBLISHABLE_KEY — that is accepted as a fallback.
 * CI: secrets are injected by GitHub Actions (no .env file).
 *
 * Fast path: `node integration-testing.js --smoke` (Voucher Test 1 + Hotel Test 3 only).
 */

import dotenv from "dotenv";
import https from "https";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

function resolveSupabaseAnonKey() {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""
  );
}

function resolveSupabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://ynlnrvuqypmwpevabtdc.supabase.co"
  );
}

const TEST_CONFIG = {
  supabaseUrl: resolveSupabaseUrl(),
  anonKey: resolveSupabaseAnonKey(),
};

const HOTEL_AVAILABILITY_TESTS = [
  {
    name: "Test 1: SINCICI Hotel on 2026-04-25",
    input: {
      creditCard: "377361",
      voucherCode: "P370336ZYH",
      destination: "Singapore",
      hotel: "SINCICI",
      arrivalDate: "2026-04-25",
      voucherExpiry: "2026-07-31",
      groupCode: "ZKFA25",
    },
    expected: {
      available: true,
      roomCount: 15,
    },
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
      groupCode: "ZKFA25",
    },
    expected: {
      available: true,
      roomCount: 16,
    },
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
      groupCode: "ZKFA25",
    },
    expected: {
      available: true,
      roomCount: 9,
    },
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
      groupCode: "ZKFA25",
    },
    expected: {
      available: true,
      roomCount: 9,
    },
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
      groupCode: "ZKFA25",
    },
    expected: {
      available: true,
      roomCount: 19,
    },
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
      groupCode: "ZKFA25",
    },
    expected: {
      available: true,
      roomCount: 13,
    },
  },
];

const VOUCHER_VALIDATION_TESTS = [
  {
    name: "Voucher Test 1: Valid voucher - Expected TRUE",
    input: { creditCard: "377361", voucherCode: "P370336ZYH" },
    expected: { valid: true },
  },
  {
    name: "Voucher Test 2: Invalid credit card - Expected FALSE",
    input: { creditCard: "377362", voucherCode: "P370336ZYA" },
    expected: { valid: false },
  },
  {
    name: "Voucher Test 3: Invalid voucher code - Expected FALSE",
    input: { creditCard: "377361", voucherCode: "P370336ZYA" },
    expected: { valid: false },
  },
  {
    name: "Voucher Test 4: Used voucher code - Expected FALSE (used)",
    input: { creditCard: "379875", voucherCode: "J526224GBZ" },
    expected: {
      valid: false,
      errorContains: "You've used your voucher code. Please provide another one.",
    },
  },
  {
    name: "Voucher Test 5: Invalid credit card - Expected FALSE",
    input: { creditCard: "379575", voucherCode: "J526224GBZ" },
    expected: { valid: false },
  },
  {
    name: "Voucher Test 6: Invalid voucher code - Expected FALSE",
    input: { creditCard: "379875", voucherCode: "J526234GBZ" },
    expected: { valid: false },
  },
];

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on("error", reject);

    if (options.body) req.write(options.body);
    req.end();
  });
}

function requireEnv() {
  if (!TEST_CONFIG.anonKey) {
    console.error(
      "❌ Missing Supabase anon/publishable key. Set one of:\n" +
        "   SUPABASE_ANON_KEY\n" +
        "   VITE_SUPABASE_PUBLISHABLE_KEY (same value as in the dashboard)\n" +
        "Optional: SUPABASE_URL or VITE_SUPABASE_URL\n\n" +
        "Cursor Cloud Agent: My Secrets do not always reach the shell that runs `npm run`.\n" +
        "Use GitHub Actions (workflow_dispatch or push) for automated runs, or keep keys in a local `.env` for local `npm run test:integration`.",
    );
    process.exit(1);
  }
}

async function testVoucherValidation(testCase) {
  const startTime = Date.now();
  try {
    const functionUrl = `${TEST_CONFIG.supabaseUrl}/functions/v1/validate-voucher`;
    const response = await makeRequest(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: TEST_CONFIG.anonKey,
        Authorization: `Bearer ${TEST_CONFIG.anonKey}`,
      },
      body: JSON.stringify(testCase.input),
    });

    const duration = Date.now() - startTime;
    const responseBody = JSON.parse(response.data);

    if (response.statusCode !== 200 || !responseBody.success) {
      return {
        name: testCase.name,
        passed: false,
        error: `HTTP ${response.statusCode}: ${responseBody.error || "Unknown error"}`,
        duration,
      };
    }

    if (responseBody.valid !== testCase.expected.valid) {
      return {
        name: testCase.name,
        passed: false,
        error: `Validation result mismatch: Expected ${testCase.expected.valid}, Got ${responseBody.valid}`,
        duration,
      };
    }

    if (testCase.expected.errorContains) {
      const err = responseBody.error || "";
      if (!err.includes(testCase.expected.errorContains)) {
        return {
          name: testCase.name,
          passed: false,
          error: `Error message mismatch: Expected to include "${testCase.expected.errorContains}", Got "${err}"`,
          duration,
        };
      }
    }

    return { name: testCase.name, passed: true, error: null, duration };
  } catch (error) {
    return {
      name: testCase.name,
      passed: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

async function testHotelAvailability(testCase) {
  const startTime = Date.now();
  try {
    const functionUrl = `${TEST_CONFIG.supabaseUrl}/functions/v1/check-hotel-availability`;
    const response = await makeRequest(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: TEST_CONFIG.anonKey,
        Authorization: `Bearer ${TEST_CONFIG.anonKey}`,
      },
      body: JSON.stringify(testCase.input),
    });

    const duration = Date.now() - startTime;
    const responseBody = JSON.parse(response.data);

    if (response.statusCode !== 200 || !responseBody.success) {
      return {
        name: testCase.name,
        passed: false,
        error: `HTTP ${response.statusCode}: ${responseBody.error || "Unknown error"}`,
        duration,
      };
    }

    const actualAvailability = responseBody.availability?.[0];
    if (!actualAvailability) {
      return {
        name: testCase.name,
        passed: false,
        error: "No availability data returned",
        duration,
      };
    }

    if (actualAvailability.available !== testCase.expected.available) {
      return {
        name: testCase.name,
        passed: false,
        error: `Availability mismatch: Expected ${testCase.expected.available}, Got ${actualAvailability.available}`,
        duration,
      };
    }

    if (
      testCase.expected.roomCount !== undefined &&
      actualAvailability.roomCount !== testCase.expected.roomCount
    ) {
      return {
        name: testCase.name,
        passed: false,
        error: `Room count mismatch: Expected ${testCase.expected.roomCount}, Got ${actualAvailability.roomCount}`,
        duration,
      };
    }

    return { name: testCase.name, passed: true, error: null, duration };
  } catch (error) {
    return {
      name: testCase.name,
      passed: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

async function runSuite(title, tests, runner) {
  console.log(title);
  console.log("=".repeat(title.length));

  const results = [];
  let allPassed = true;

  for (const testCase of tests) {
    console.log(`\n--- Running ${testCase.name} ---`);
    console.log("Input:", JSON.stringify(testCase.input, null, 2));
    const result = await runner(testCase);
    results.push(result);
    if (!result.passed) allPassed = false;

    console.log(`Test ${result.passed ? "✅ PASSED" : "❌ FAILED"}: ${testCase.name}`);
    if (result.error) console.log(`  Error: ${result.error}`);
    console.log(`  Duration: ${result.duration}ms`);
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log("\n📊 SUMMARY");
  console.log("==========");
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Overall Result: ${allPassed ? "✅ PASS" : "❌ FAIL"}`);

  if (!allPassed) {
    console.log("\n❌ Failed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
  }

  return allPassed;
}

/** Voucher Test 1 + Hotel Availability Test 3 — fast path for E2E / CI while iterating. */
const SMOKE_VOUCHER_CASE = VOUCHER_VALIDATION_TESTS[0];
const SMOKE_HOTEL_CASE = HOTEL_AVAILABILITY_TESTS[2];

async function runSmoke() {
  console.log("🚀 Smoke mode (--smoke): Voucher Test 1 + Hotel Availability Test 3 only");
  console.log("============================================================================");
  requireEnv();
  const start = Date.now();

  const v = await testVoucherValidation(SMOKE_VOUCHER_CASE);
  console.log(`\n--- ${SMOKE_VOUCHER_CASE.name} ---`);
  console.log(v.passed ? "✅ PASSED" : "❌ FAILED", v.error || "");
  console.log(`  Duration: ${v.duration}ms`);

  const h = await testHotelAvailability(SMOKE_HOTEL_CASE);
  console.log(`\n--- ${SMOKE_HOTEL_CASE.name} ---`);
  console.log(h.passed ? "✅ PASSED" : "❌ FAILED", h.error || "");
  console.log(`  Duration: ${h.duration}ms`);

  const ok = v.passed && h.passed;
  const duration = Date.now() - start;
  console.log("\n🎯 SMOKE SUMMARY");
  console.log("================");
  console.log(`Total Duration: ${duration}ms`);
  console.log(`Result: ${ok ? "✅ PASS" : "❌ FAIL"}`);
  process.exit(ok ? 0 : 1);
}

async function main() {
  const smokeMode = process.argv.includes("--smoke");
  if (smokeMode) {
    await runSmoke();
    return;
  }

  console.log("🚀 Starting Integration Test Suite");
  console.log("==================================");
  requireEnv();

  const start = Date.now();
  const voucherPassed = await runSuite(
    "🎫 Voucher Validation Integration Tests",
    VOUCHER_VALIDATION_TESTS,
    testVoucherValidation,
  );
  const hotelPassed = await runSuite(
    "\n🏨 Hotel Availability Integration Tests",
    HOTEL_AVAILABILITY_TESTS,
    testHotelAvailability,
  );

  const overallPassed = voucherPassed && hotelPassed;
  const duration = Date.now() - start;

  console.log("\n🎯 OVERALL TEST SUMMARY");
  console.log("=======================");
  console.log(`Voucher Validation: ${voucherPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Hotel Availability: ${hotelPassed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Total Duration: ${duration}ms`);
  console.log(`Overall Result: ${overallPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);

  process.exit(overallPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("💥 Test suite failed with error:", err?.message || String(err));
  process.exit(1);
});

