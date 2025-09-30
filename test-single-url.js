#!/usr/bin/env node

/**
 * Quick test to check a single Hilton URL through the function
 */

import https from 'https';

const SUPABASE_URL = 'https://ynlnrvuqypmwpevabtdc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlubG5ydnVxeXBtd3BldmFidGRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NzM0NjQsImV4cCI6MjA2ODE0OTQ2NH0.dvRTW9S7ZRCcjYJgEx-Adw1QnRV2Gv6jqCpAhPt-qoE';

async function testHotelUrl() {
  const testData = {
    creditCard: "377361",
    voucherCode: "P370336ZYH",
    destination: "Singapore",
    hotel: "SINGI", // Should have 2 rooms
    arrivalDate: "2025-10-15",
    voucherExpiry: "2026-07-31",
    groupCode: "ZKFA25"
  };

  console.log('Testing SINGI hotel (should show 2 rooms available)');
  console.log('Input:', JSON.stringify(testData, null, 2));
  console.log('\nCalling check-hotel-availability function...\n');

  const url = `${SUPABASE_URL}/functions/v1/check-hotel-availability`;
  const data = JSON.stringify(testData);

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        console.log('Response:', JSON.stringify(JSON.parse(responseData), null, 2));

        const result = JSON.parse(responseData);
        if (result.availability && result.availability[0]) {
          const avail = result.availability[0];
          console.log('\n📊 Result Summary:');
          console.log(`  Available: ${avail.available}`);
          console.log(`  Room Count: ${avail.roomCount}`);
          console.log(`  Booking URL: ${avail.bookingUrl}`);

          if (avail.available) {
            console.log('\n✅ SUCCESS: Rooms found!');
          } else {
            console.log('\n❌ PROBLEM: No rooms found (but we expected 2 rooms)');
            console.log('   This suggests the parseAvailability function is not detecting voucher rates correctly.');
          }
        }

        resolve();
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

testHotelUrl().catch(console.error);