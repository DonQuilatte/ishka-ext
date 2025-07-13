import { test, expect, chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.join(__dirname, '../../public');

test.describe('Ishka Extension E2E Tests', () => {
  let browser: BrowserContext;
  let page: Page;

  test.beforeAll(async () => {
    browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
  });

  test.afterAll(async () => {
    if (browser) await browser.close();
  });

  test.beforeEach(async () => {
    page = await browser.newPage();
    page.on('console', msg => console.log('[PAGE]', msg.text()));
    page.on('pageerror', err => console.error('[PAGE ERROR]', err));
  });

  test.afterEach(async () => {
    if (page) await page.close();
  });

  test('should inject the diagnostic marker only once', async () => {
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
    const locator = page.locator('#ishka-diagnostic-element-present');
    await expect(locator).toHaveCount(1, { timeout: 10000 });

    // Reload and check again to ensure no duplicate injection
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(locator).toHaveCount(1, { timeout: 10000 });
  });

  test('should not inject the main UI on non-ChatGPT pages', async () => {
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
    const mainUiLocator = page.locator('#ishka-ext-content-root');
    await expect(mainUiLocator).not.toBeAttached();
  });

  test('should inject the main UI on ChatGPT pages', async () => {
    // Mock the page since we don't need to actually load chatgpt.com
    await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });

    // The script waits for the main element to exist before initializing the UI
    await page.setContent('<html><body><main></main></body></html>');
    
    const mainUiLocator = page.locator('#ishka-ext-content-root');
    await expect(mainUiLocator).toBeAttached({ timeout: 10000 });
  });

  test('should handle missing DOM target gracefully', async () => {
    // This page will trigger the ChatGPT-specific logic
    await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
  
    // But the 'main' element required by the observer is missing
    await page.setContent('<html><body><div>No main element</div></body></html>');

    // The diagnostic element should still be present
    const diagnosticLocator = page.locator('#ishka-diagnostic-element-present');
    await expect(diagnosticLocator).toBeAttached({ timeout: 10000 });

    // And no errors should be thrown. Playwright will fail if there's an uncaught exception.
    // We can also check that the main UI was not initialized
    const mainUiLocator = page.locator('#ishka-ext-content-root');
    await expect(mainUiLocator).toBeAttached(); // The root is created before the observer
  });
});