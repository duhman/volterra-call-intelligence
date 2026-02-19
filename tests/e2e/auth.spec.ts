import { test, expect } from '../global-setup';

test.describe('Authentication', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login page
    await page.waitForURL('/login');
    // Login page shows "Call Transcription Admin" in the card title
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
  });

  test('should show error with wrong password', async ({ page }) => {
    await page.goto('/login');
    
    // Try to login with wrong password
    await page.fill('[data-testid="password-input"]', 'wrong_password');
    await page.click('[data-testid="login-button"]');
    
    // Should show error toast - use first() to handle multiple matches
    await expect(page.locator('text=Invalid password').first()).toBeVisible();
  });

  test('should login successfully with correct password', async ({ page }) => {
    await page.goto('/login');
    
    // Login with correct password
    await page.fill('[data-testid="password-input"]', process.env.TEST_ADMIN_PASSWORD || 'test_password_123');
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to dashboard
    await page.waitForURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="password-input"]', process.env.TEST_ADMIN_PASSWORD || 'test_password_123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Find and click logout button in sidebar
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await page.waitForURL('/login');
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
  });
});
