import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Must set env before importing db
import { getClientUsageStats } from './src/app/actions/adminActions';

async function test() {
  const userId = 'd7daf565-32ff-482d-b798-63120fd75e66';
  try {
    console.log('Testing getClientUsageStats for:', userId);
    const stats = await getClientUsageStats(userId);
    console.log('Stats Result:', JSON.stringify(stats, null, 2));
  } catch (e: any) {
    console.error('Test Failed:', e);
  } finally {
    process.exit();
  }
}

test();
