import { test, expect } from '../global-setup';
import { testSupabase, createTestCall, insertTestCall } from '../fixtures/seed';

test.describe('Calls Management', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || 'test_password_123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display calls list with pagination', async ({ page }) => {
    await page.goto('/calls');
    
    // Wait for calls to load
    await page.waitForSelector('[data-testid="calls-table"]');
    
    // Check table headers
    await expect(page.locator('[data-testid="header-from"]')).toBeVisible();
    await expect(page.locator('[data-testid="header-to"]')).toBeVisible();
    await expect(page.locator('[data-testid="header-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="header-date"]')).toBeVisible();
    
    // Check pagination
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
  });

  test('should filter calls by various criteria', async ({ page }) => {
    await page.goto('/calls');
    
    // Filter by status
    await page.selectOption('[data-testid="status-filter"]', 'completed');
    await page.waitForTimeout(1000);
    
    // Filter by direction
    await page.selectOption('[data-testid="direction-filter"]', 'inbound');
    await page.waitForTimeout(1000);
    
    // Filter by HubSpot contact
    await page.selectOption('[data-testid="hubspot-filter"]', 'true');
    await page.waitForTimeout(1000);
    
    // Verify filters are applied
    const url = page.url();
    expect(url).toContain('status=completed');
    expect(url).toContain('direction=inbound');
    expect(url).toContain('hubspot_contact=true');
  });

  test('should search calls', async ({ page }) => {
    await page.goto('/calls');
    
    // Search by phone number
    await page.fill('[data-testid="search-input"]', '+46123456789');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Verify search in URL
    const url = page.url();
    expect(url).toContain('search=%2B46123456789');
  });

  test('should navigate to call details', async ({ page }) => {
    await page.goto('/calls');
    
    // Wait for calls to load
    await page.waitForSelector('[data-testid="calls-table"]');
    
    // Click on first call
    const firstCall = page.locator('[data-testid="call-row"]').first();
    await firstCall.click();
    
    // Should navigate to call details
    await page.waitForURL(/\/calls\/[a-f0-9-]+/);
    await expect(page.locator('h1')).toContainText('Call Details');
  });

  test('should reprocess a call', async ({ page }) => {
    // Create a test call
    const testCall = await insertTestCall({
      ...createTestCall(),
      status: 'failed',
      error_message: 'Test error',
    });
    
    await page.goto(`/calls/${testCall.id}`);
    
    // Wait for details to load
    await page.waitForSelector('[data-testid="call-details"]');
    
    // Click reprocess button
    await page.click('[data-testid="reprocess-button"]');
    
    // Should show success message
    await expect(page.locator('text=Call queued for reprocessing')).toBeVisible();
    
    // Status should change to pending
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="call-status"]')).toContainText('pending');
  });

  test('should sync call to HubSpot', async ({ page }) => {
    // Create a test call with transcription
    const testCall = await insertTestCall({
      ...createTestCall(),
      status: 'completed',
    });
    
    await page.goto(`/calls/${testCall.id}`);
    
    // Wait for details to load
    await page.waitForSelector('[data-testid="call-details"]');
    
    // Click sync to HubSpot button
    await page.click('[data-testid="hubspot-sync-button"]');
    
    // Should show success message
    await expect(page.locator('text=Call synced to HubSpot')).toBeVisible();
  });
});
