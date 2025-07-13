import { test, expect } from '@playwright/test';
import { loadExtension } from '../with-extension';

test.describe('Extension UI Visual Tests', () => {
  test('Popup interface renders correctly', async ({ context }) => {
    const { extensionId } = await loadExtension(context);
    const page = await context.newPage();
    
    // Navigate to popup
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await page.waitForLoadState('networkidle');
    
    // Wait for components to load
    await page.waitForSelector('.ishka-root', { timeout: 5000 });
    
    // Take screenshot of the full popup
    await expect(page.locator('.ishka-root')).toHaveScreenshot('popup-interface-default.png');
    
    // Test status indicator in popup context
    const statusIndicator = page.locator('[data-component="status-indicator"]');
    if (await statusIndicator.count() > 0) {
      await expect(statusIndicator).toHaveScreenshot('popup-status-indicator.png');
    }
    
    // Test telemetry panel in popup context
    const telemetryPanel = page.locator('[data-component="telemetry-panel"]');
    if (await telemetryPanel.count() > 0) {
      await expect(telemetryPanel).toHaveScreenshot('popup-telemetry-panel.png');
    }
  });

  test('Popup dark mode compatibility', async ({ context }) => {
    const { extensionId } = await loadExtension(context);
    const page = await context.newPage();
    
    // Simulate dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await page.waitForSelector('.ishka-root', { timeout: 5000 });
    
    await expect(page.locator('.ishka-root')).toHaveScreenshot('popup-interface-dark-mode.png');
  });

  test('Popup error states render correctly', async ({ context }) => {
    const { extensionId } = await loadExtension(context);
    const page = await context.newPage();
    
    // Inject console errors to test error display
    await page.addInitScript(() => {
      console.error('Test error for visual regression');
    });
    
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await page.waitForSelector('.ishka-root', { timeout: 5000 });
    
    // Take screenshot to verify error handling UI
    await expect(page.locator('.ishka-root')).toHaveScreenshot('popup-with-errors.png');
  });

  test('Popup responsive design', async ({ context }) => {
    const { extensionId } = await loadExtension(context);
    const page = await context.newPage();
    
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await page.waitForSelector('.ishka-root', { timeout: 5000 });
    
    // Test different popup sizes
    await page.setViewportSize({ width: 300, height: 400 });
    await expect(page.locator('.ishka-root')).toHaveScreenshot('popup-compact.png');
    
    await page.setViewportSize({ width: 400, height: 600 });
    await expect(page.locator('.ishka-root')).toHaveScreenshot('popup-expanded.png');
  });
});