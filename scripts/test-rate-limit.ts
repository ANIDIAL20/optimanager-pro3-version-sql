/**
 * Rate Limit Test Script
 * Tests the 5 requests/min limit for admin routes
 */

async function testRateLimit() {
  const url = 'http://localhost:3000/api/auth/session'; // A simple endpoint to hit
  console.log(`🚀 Testing rate limit on: ${url}`);
  
  const results = [];
  
  // Attempt 10 rapid requests
  for (let i = 1; i <= 10; i++) {
    const start = Date.now();
    try {
        const res = await fetch(url);
        results.push({
            request: i,
            status: res.status,
            duration: Date.now() - start
        });
        console.log(`Request ${i}: Status ${res.status} (${res.status === 429 ? '🛑 BLOCKED' : '✅ OK'})`);
    } catch (err: any) {
        console.error(`Request ${i}: Failed - ${err.message}`);
    }
  }
  
  const blocked = results.filter(r => r.status === 429).length;
  console.log('\n--- Test Summary ---');
  console.log(`Total Requests: ${results.length}`);
  console.log(`Blocked: ${blocked}`);
  
  if (blocked > 0) {
    console.log('✅ Rate Limit is WORKING.');
  } else {
    console.log('⚠️ Rate Limit might NOT be working or threshold is higher than 10.');
  }
}

testRateLimit();
