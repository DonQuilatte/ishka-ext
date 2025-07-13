import { test, expect } from '@playwright/test';

test.describe('Simple E2E Test', () => {
  test('should be able to navigate to a website', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example Domain/);
    
    const heading = page.locator('h1');
    await expect(heading).toContainText('Example Domain');
  });

  test('should be able to interact with page elements', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Check that the page has loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for the "More information..." link
    const link = page.locator('a[href="https://www.iana.org/domains/example"]');
    await expect(link).toBeVisible();
  });
});