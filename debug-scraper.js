#!/usr/bin/env node

/**
 * Debug script to see what HTML ScraperAPI is actually returning
 */

import https from 'https';
import { execSync } from 'child_process';
import fs from 'fs';

// Get ScraperAPI key from Supabase secrets
let scraperApiKey;
try {
  const secretsOutput = execSync('supabase secrets list --project-ref ynlnrvuqypmwpevabtdc', {encoding: 'utf-8'});
  console.log('✓ Retrieved ScraperAPI configuration from Supabase');

  // For this test, we'll use a test key or get it from env
  scraperApiKey = process.env.SCRAPERAPI_KEY;
  if (!scraperApiKey) {
    console.error('❌ SCRAPERAPI_KEY environment variable required');
    console.error('   Run: export SCRAPERAPI_KEY="your_key_here"');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error getting ScraperAPI key:', error.message);
  process.exit(1);
}

// Test URL for SINGI hotel (should have 2 rooms available)
const hiltonUrl = 'https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=SINGI&arrivalDate=2025-10-15&departureDate=2025-10-16&groupCode=ZKFA25&room1NumAdults=1&cid=OH,MB,APACAMEXKrisFlyerComplimentaryNight,MULTIBR,OfferCTA,Offer,Book';

console.log('\n🔍 Testing ScraperAPI with SINGI hotel URL');
console.log('=========================================\n');
console.log('Target URL:', hiltonUrl);

async function testFastScraping() {
  console.log('\n📡 Testing FAST scraping (no JavaScript)...');

  const params = new URLSearchParams({
    'api_key': scraperApiKey,
    'url': hiltonUrl,
    'render': 'false',
    'country_code': 'sg',
    'premium': 'true'
  });

  const scraperUrl = `https://api.scraperapi.com/?${params.toString()}`;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    https.get(scraperUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        console.log(`✓ Response received (${duration}ms)`);
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  HTML length: ${data.length} bytes`);

        // Save to file for inspection
        fs.writeFileSync('debug-scraper-fast.html', data);
        console.log('  Saved to: debug-scraper-fast.html');

        // Search for key indicators
        console.log('\n🔍 Searching for key indicators:');
        const indicators = [
          'Amex Krisflyer',
          'voucher rates',
          'We\'re showing Amex Krisflyer Ascend Voucher rates',
          'rooms found',
          'unavailable',
          'We\'re showing the lowest rate first',
          'Your selected rates are unavailable'
        ];

        indicators.forEach(indicator => {
          const found = data.includes(indicator);
          const icon = found ? '✓' : '✗';
          console.log(`  ${icon} "${indicator}": ${found ? 'FOUND' : 'NOT FOUND'}`);

          if (found) {
            // Show surrounding context
            const index = data.indexOf(indicator);
            const context = data.substring(Math.max(0, index - 100), Math.min(data.length, index + 200));
            console.log(`     Context: ...${context}...`);
          }
        });

        resolve(data);
      });
    }).on('error', reject);
  });
}

async function testJSScraping() {
  console.log('\n📡 Testing JS rendering scraping...');

  const params = new URLSearchParams({
    'api_key': scraperApiKey,
    'url': hiltonUrl,
    'render': 'true',
    'country_code': 'sg',
    'premium': 'true',
    'wait': '2000'
  });

  const scraperUrl = `https://api.scraperapi.com/?${params.toString()}`;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    https.get(scraperUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        console.log(`✓ Response received (${duration}ms)`);
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  HTML length: ${data.length} bytes`);

        // Save to file for inspection
        fs.writeFileSync('debug-scraper-js.html', data);
        console.log('  Saved to: debug-scraper-js.html');

        // Search for key indicators
        console.log('\n🔍 Searching for key indicators:');
        const indicators = [
          'Amex Krisflyer',
          'voucher rates',
          'We\'re showing Amex Krisflyer Ascend Voucher rates',
          'rooms found',
          'unavailable',
          'We\'re showing the lowest rate first',
          'Your selected rates are unavailable'
        ];

        indicators.forEach(indicator => {
          const found = data.includes(indicator);
          const icon = found ? '✓' : '✗';
          console.log(`  ${icon} "${indicator}": ${found ? 'FOUND' : 'NOT FOUND'}`);

          if (found) {
            // Show surrounding context
            const index = data.indexOf(indicator);
            const context = data.substring(Math.max(0, index - 100), Math.min(data.length, index + 200));
            console.log(`     Context: ...${context}...`);
          }
        });

        resolve(data);
      });
    }).on('error', reject);
  });
}

async function runDebug() {
  try {
    await testFastScraping();
    console.log('\n' + '='.repeat(50) + '\n');
    await testJSScraping();

    console.log('\n✅ Debug complete!');
    console.log('   Review the saved HTML files to see what ScraperAPI is returning.');
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

runDebug();