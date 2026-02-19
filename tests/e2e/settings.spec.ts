import { test, expect } from '../global-setup';
import { testSupabase, createTestSetting, insertTestSetting } from '../fixtures/seed';

test.describe('Settings Management', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || 'test_password_123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display general settings', async ({ page }) => {
    await page.goto('/settings');
    
    // Wait for settings to load
    await page.waitForSelector('[data-testid="settings-form"]');
    
    // Check settings are displayed
    await expect(page.locator('[data-testid="setting-transcribe-unknown"]')).toBeVisible();
    await expect(page.locator('[data-testid="setting-auto-sync-hubspot"]')).toBeVisible();
  });

  test('should update general settings', async ({ page }) => {
    await page.goto('/settings');
    
    // Wait for settings to load
    await page.waitForSelector('[data-testid="settings-form"]');
    
    // Toggle transcribe unknown numbers
    await page.click('[data-testid="setting-transcribe-unknown"]');
    
    // Toggle auto sync to HubSpot
    await page.click('[data-testid="setting-auto-sync-hubspot"]');
    
    // Save settings
    await page.click('[data-testid="save-settings-button"]');
    
    // Should show success message
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();
  });

  test('should display API keys list', async ({ page }) => {
    await page.goto('/settings');
    
    // Click on API Keys tab
    await page.click('[data-testid="api-keys-tab"]');
    
    // Wait for API keys to load
    await page.waitForSelector('[data-testid="api-keys-list"]');
    
    // Check API keys are displayed
    await expect(page.locator('[data-testid="api-key-row"]')).toBeVisible();
  });

  test('should add new API key', async ({ page }) => {
    await page.goto('/settings');
    
    // Click on API Keys tab
    await page.click('[data-testid="api-keys-tab"]');
    
    // Click add new key button
    await page.click('[data-testid="add-api-key-button"]');
    
    // Fill in API key form
    await page.fill('[data-testid="agent-email"]', 'test2@example.com');
    await page.fill('[data-testid="display-name"]', 'Test Agent 2');
    await page.fill('[data-testid="api-key"]', 'test_api_key_456');
    await page.fill('[data-testid="hubspot-user-id"]', 'test_user_456');
    
    // Save API key
    await page.click('[data-testid="save-api-key-button"]');
    
    // Should show success message
    await expect(page.locator('text=API key added successfully')).toBeVisible();
    
    // Verify new key appears in list
    await expect(page.locator('text=Test Agent 2')).toBeVisible();
  });

  test('should edit existing API key', async ({ page }) => {
    await page.goto('/settings');
    
    // Click on API Keys tab
    await page.click('[data-testid="api-keys-tab"]');
    
    // Click edit on first API key
    await page.locator('[data-testid="api-key-row"]').first().locator('[data-testid="edit-button"]').click();
    
    // Update display name
    await page.fill('[data-testid="display-name"]', 'Updated Test Agent');
    
    // Save changes
    await page.click('[data-testid="save-api-key-button"]');
    
    // Should show success message
    await expect(page.locator('text=API key updated successfully')).toBeVisible();
  });

  test('should delete API key', async ({ page }) => {
    await page.goto('/settings');
    
    // Click on API Keys tab
    await page.click('[data-testid="api-keys-tab"]');
    
    // Get initial count
    const initialCount = await page.locator('[data-testid="api-key-row"]').count();
    
    // Click delete on first API key
    await page.locator('[data-testid="api-key-row"]').first().locator('[data-testid="delete-button"]').click();
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Should show success message
    await expect(page.locator('text=API key deleted successfully')).toBeVisible();
    
    // Verify count decreased
    const finalCount = await page.locator('[data-testid="api-key-row"]').count();
    expect(finalCount).toBe(initialCount - 1);
  });
});
