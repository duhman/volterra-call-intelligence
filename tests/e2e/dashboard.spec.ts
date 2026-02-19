import { test, expect } from '../global-setup';

test.describe('Dashboard', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="password-input"]', process.env.TEST_ADMIN_PASSWORD || 'test_password_123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should display call statistics', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('[data-testid="stats-container"]');
    
    // Check stats are displayed (using actual testIds: total-calls, completed-calls, pending-calls, failed-calls)
    await expect(page.locator('[data-testid="total-calls"]')).toBeVisible();
    await expect(page.locator('[data-testid="completed-calls"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-calls"]')).toBeVisible();
    
    // Verify stats are numbers
    const totalCalls = await page.locator('[data-testid="total-calls"]').textContent();
    expect(parseInt(totalCalls || '0')).toBeGreaterThanOrEqual(0);
  });

  test('should display recent calls section', async ({ page }) => {
    // Wait for recent calls card to load
    await page.waitForSelector('[data-testid="recent-calls"]');
    
    // Recent calls section should be visible (may be empty if no test data seeded)
    await expect(page.locator('[data-testid="recent-calls"]')).toBeVisible();
  });

  test('should navigate to calls page from View all link', async ({ page }) => {
    await page.waitForSelector('[data-testid="recent-calls"]');
    
    // Click "View all" link
    await page.click('[data-testid="recent-calls"] a:has-text("View all")');
    
    // Should navigate to calls page
    await page.waitForURL('/calls');
    await expect(page.getByRole('heading', { name: 'Calls' })).toBeVisible();
  });
});
