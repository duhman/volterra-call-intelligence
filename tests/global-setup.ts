import { test as base, expect } from '@playwright/test';
import { testSupabase, seedTestData, cleanupTestData } from './fixtures/seed';

// Define test fixtures
export interface TestFixtures {
  authenticatedPage: boolean;
  testSupabase: typeof testSupabase;
}

// Extend base test with custom fixtures
export const test = base.extend<TestFixtures>({
  // Authenticated page fixture
  authenticatedPage: [async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || 'test_password_123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await use(true);
  }, { scope: 'test' }],
  
  // Supabase client fixture
  testSupabase: [async ({}, use) => {
    await use(testSupabase);
  }, { scope: 'test' }],
});

// Global setup - runs before all tests (default export for Playwright)
async function globalSetup() {
  console.log('Setting up test environment...');
  await cleanupTestData();
  await seedTestData();
  console.log('Test environment ready');
}

export default globalSetup;
export { expect };
