import { test, expect } from '@playwright/test';

test.describe('Component Playground Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start the playground dev server
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
  });

  test('Status Indicator component renders correctly', async ({ page }) => {
    // Select status indicator component
    await page.click('button:has-text("Status Indicator")');
    await page.waitForSelector('[data-component="status-indicator"]');
    
    // Take screenshot of the component
    const component = page.locator('[data-component="status-indicator"]');
    await expect(component).toHaveScreenshot('status-indicator-default.png');
    
    // Test different states
    await page.uncheck('input[type="checkbox"]'); // Disconnect
    await expect(component).toHaveScreenshot('status-indicator-disconnected.png');
    
    // Test with errors
    await page.check('input[type="checkbox"]'); // Reconnect
    await page.fill('input[type="number"]', '3');
    await expect(component).toHaveScreenshot('status-indicator-with-errors.png');
  });

  test('Telemetry Panel component renders correctly', async ({ page }) => {
    await page.click('button:has-text("Telemetry Panel")');
    await page.waitForSelector('[data-component="telemetry-panel"]');
    
    const component = page.locator('[data-component="telemetry-panel"]');
    await expect(component).toHaveScreenshot('telemetry-panel-default.png');
  });

  test('Search History Panel component renders correctly', async ({ page }) => {
    await page.click('button:has-text("Search History")');
    await page.waitForSelector('[data-component="search-history"]');
    
    const component = page.locator('[data-component="search-history"]');
    await expect(component).toHaveScreenshot('search-history-panel-default.png');
  });

  test('Component selector navigation works correctly', async ({ page }) => {
    // Test component switching
    await page.click('button:has-text("Status Indicator")');
    await expect(page.locator('button:has-text("Status Indicator")')).toHaveClass(/active/);
    
    await page.click('button:has-text("Telemetry Panel")');
    await expect(page.locator('button:has-text("Telemetry Panel")')).toHaveClass(/active/);
    
    await page.click('button:has-text("Search History")');
    await expect(page.locator('button:has-text("Search History")')).toHaveClass(/active/);
    
    // Take screenshot of the full playground interface
    await expect(page.locator('.playground')).toHaveScreenshot('playground-full-interface.png');
  });

  test('Playground responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.click('button:has-text("Status Indicator")');
    
    await expect(page.locator('.playground')).toHaveScreenshot('playground-mobile.png');
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.playground')).toHaveScreenshot('playground-tablet.png');
  });
});