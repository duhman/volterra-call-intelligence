import { cleanupTestData } from './fixtures/seed';

async function globalTeardown() {
  console.log('Cleaning up test environment...');
  
  // Clean up test data
  await cleanupTestData();
  
  console.log('Test environment cleaned up');
}

export default globalTeardown;
