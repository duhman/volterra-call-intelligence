import { test, expect } from '../global-setup';
import { testSupabase, createTestBlockedNumber, insertTestBlockedNumber } from '../fixtures/seed';

test.describe('Blocked Numbers Management', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || 'test_password_123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display blocked numbers list', async ({ page }) => {
    await page.goto('/settings/blocked-numbers');
    
    // Wait for list to load
    await page.waitForSelector('[data-testid="blocked-numbers-list"]');
    
    // Check list is displayed
    await expect(page.locator('[data-testid="blocked-number-row"]')).toBeVisible();
  });

  test('should add new blocked number', async ({ page }) => {
    await page.goto('/settings/blocked-numbers');
    
    // Click add new button
    await page.click('[data-testid="add-blocked-number-button"]');
    
    // Fill in form
    await page.fill('[data-testid="phone-number"]', '+46000000001');
    await page.fill('[data-testid="reason"]', 'Test spam number');
    
    // Save
    await page.click('[data-testid="save-blocked-number-button"]');
    
    // Should show success message
    await expect(page.locator('text=Blocked number added successfully')).toBeVisible();
    
    // Verify in list
    await expect(page.locator('text=+46000000001')).toBeVisible();
  });

  test('should delete blocked number', async ({ page }) => {
    await page.goto('/settings/blocked-numbers');
    
    // Get initial count
    const initialCount = await page.locator('[data-testid="blocked-number-row"]').count();
    
    // Click delete on first number
    await page.locator('[data-testid="blocked-number-row"]').first().locator('[data-testid="delete-button"]').click();
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Should show success message
    await expect(page.locator('text=Blocked number deleted successfully')).toBeVisible();
    
    // Verify count decreased
    const finalCount = await page.locator('[data-testid="blocked-number-row"]').count();
    expect(finalCount).toBe(initialCount - 1);
  });

  test('should validate phone number format', async ({ page }) => {
    await page.goto('/settings/blocked-numbers');
    
    // Click add new button
    await page.click('[data-testid="add-blocked-number-button"]');
    
    // Enter invalid phone number
    await page.fill('[data-testid="phone-number"]', 'invalid');
    
    // Should show validation error
    await expect(page.locator('text=Please enter a valid phone number')).toBeVisible();
    
    // Save button should be disabled
    await expect(page.locator('[data-testid="save-blocked-number-button"]')).toBeDisabled();
  });
});
