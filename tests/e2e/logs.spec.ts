import { test, expect } from '../global-setup';

test.describe('Webhook Logs', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || 'test_password_123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display webhook logs list', async ({ page }) => {
    await page.goto('/logs');
    
    // Wait for logs to load
    await page.waitForSelector('[data-testid="webhook-logs-table"]');
    
    // Check table headers
    await expect(page.locator('[data-testid="header-event-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="header-source-ip"]')).toBeVisible();
    await expect(page.locator('[data-testid="header-processed"]')).toBeVisible();
    await expect(page.locator('[data-testid="header-date"]')).toBeVisible();
  });

  test('should filter logs by event type', async ({ page }) => {
    await page.goto('/logs');
    
    // Select event type filter
    await page.selectOption('[data-testid="event-type-filter"]', 'hangup');
    
    // Wait for filter to apply
    await page.waitForTimeout(1000);
    
    // Verify filter in URL
    const url = page.url();
    expect(url).toContain('event_type=hangup');
  });

  test('should filter logs by processing status', async ({ page }) => {
    await page.goto('/logs');
    
    // Select processed filter
    await page.selectOption('[data-testid="processed-filter"]', 'true');
    
    // Wait for filter to apply
    await page.waitForTimeout(1000);
    
    // Verify filter in URL
    const url = page.url();
    expect(url).toContain('processed=true');
  });

  test('should search logs', async ({ page }) => {
    await page.goto('/logs');
    
    // Search by IP
    await page.fill('[data-testid="search-input"]', '127.0.0.1');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Verify search in URL
    const url = page.url();
    expect(url).toContain('search=127.0.0.1');
  });

  test('should view log details', async ({ page }) => {
    await page.goto('/logs');
    
    // Wait for logs to load
    await page.waitForSelector('[data-testid="webhook-logs-table"]');
    
    // Click on first log
    const firstLog = page.locator('[data-testid="log-row"]').first();
    await firstLog.click();
    
    // Should show log details modal
    await expect(page.locator('[data-testid="log-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="log-payload"]')).toBeVisible();
  });

  test('should refresh logs', async ({ page }) => {
    await page.goto('/logs');
    
    // Click refresh button
    await page.click('[data-testid="refresh-button"]');
    
    // Should show loading state
    await expect(page.locator('[data-testid="refresh-button"][aria-disabled="true"]')).toBeVisible();
    
    // Should enable after refresh
    await page.waitForSelector('[data-testid="refresh-button"]:not([aria-disabled="true"])');
  });
});
