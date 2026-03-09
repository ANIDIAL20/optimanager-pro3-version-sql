
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { getDevis } = require('./src/app/actions/devis-actions');

// Mock secureAction behavior by setting up appropriate environment or bypassing it
// Actually getDevis is wrapped in secureAction which uses auth()
// Calling it directly might trigger an auth failure if not in a request context

async function main() {
  try {
    console.log('--- CALLING getDevis() ---');
    // We need to mock auth() used inside secureAction or wait...
    // secureAction calls auth() from @/auth
    
    const result = await getDevis();
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('--- FAILURE ---');
    console.error(err);
    process.exit(1);
  }
}

main();
