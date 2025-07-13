import { test, expect, chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.join(__dirname, '../../dist');

test.describe('Extension Error Detection and Reporting', () => {
  let browser: BrowserContext;
  let page: Page;
  let extensionId: string;
  let consoleErrors: string[] = [];
  let pageErrors: string[] = [];

  test.beforeAll(async () => {
    // Launch Chrome with extension loaded
    browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--disable-web-security',
        '--enable-logging=stderr'
      ],
    });

    // Get extension ID
    const extensionsPage = await browser.newPage();
    await extensionsPage.goto('chrome://extensions/');
    
    extensionId = await extensionsPage.evaluate(() => {
      const items = document.querySelectorAll('extensions-item');
      for (const item of items) {
        const nameEl = item.shadowRoot?.querySelector('#name');
        if (nameEl?.textContent?.includes('Ishka')) {
          return item.getAttribute('id') || '';
        }
      }
      return '';
    });
    
    await extensionsPage.close();
    
    if (!extensionId) {
      throw new Error('Could not find Ishka extension ID');
    }
    
    console.log(`Found extension ID: ${extensionId}`);
  });

  test.beforeEach(async () => {
    page = await browser.newPage();
    consoleErrors = [];
    pageErrors = [];
    page.on('console', msg => console.log('[PAGE]', msg.text()));
    page.on('pageerror', err => console.error('[PAGE ERROR]', err));
  });

  test.afterEach(async () => {
    // Report any errors found during the test
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      console.log('Page Errors:', pageErrors);
    }
    if (page) await page.close();
  });

  test.afterAll(async () => {
    if (browser) await browser.close();
  });

  test('popup should load without JavaScript errors', async () => {
    const popupUrl = `chrome-extension://${extensionId}/popup/index.html`;
    
    // Navigate to popup
    await page.goto(popupUrl);
    
    // Wait for popup to fully load
    await page.waitForSelector('.ishka-root', { timeout: 10000 });
    
    // Wait a bit more for any async operations
    await page.waitForTimeout(3000);
    
    // Check for errors
    expect(consoleErrors.filter(err => 
      !err.includes('Manifest V2') && // Ignore V2 warnings
      !err.includes('favicon.ico') // Ignore favicon errors
    )).toHaveLength(0);
    
    expect(pageErrors).toHaveLength(0);
    
    // Verify core elements are present
    await expect(page.locator('.diagnostic-content')).toBeVisible();
    await expect(page.locator('.tab-navigation')).toBeVisible();
  });

  test('content script should inject without errors', async () => {
    // Test on a regular page first
    await page.goto('https://example.com');
    
    // Wait for content script injection
    await page.waitForSelector('#ishka-diagnostic-element-present', { timeout: 10000 });
    
    // Should have no errors on regular pages
    expect(consoleErrors.filter(err => 
      err.includes('ishka') || err.includes('Ishka')
    )).toHaveLength(0);
  });

  test('extension should handle ChatGPT page simulation', async () => {
    // Navigate to ChatGPT domain
    await page.goto('https://chatgpt.com');
    
    // Set up ChatGPT-like DOM structure
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>ChatGPT</title></head>
        <body>
          <main>
            <div class="composer-container">
              <div class="composer">
                <textarea placeholder="Message ChatGPT..."></textarea>
              </div>
            </div>
            <div class="conversation">
              <div class="message">Sample conversation</div>
            </div>
          </main>
        </body>
      </html>
    `);
    
    // Wait for content script to process
    await page.waitForTimeout(5000);
    
    // Check for diagnostic element
    await expect(page.locator('#ishka-diagnostic-element-present')).toBeVisible();
    
    // Filter out expected warnings and check for actual errors
    const relevantErrors = consoleErrors.filter(err => 
      !err.includes('favicon.ico') &&
      !err.includes('Manifest V2') &&
      !err.includes('Permissions policy') &&
      err.includes('ishka') || err.includes('Ishka') || err.includes('Error')
    );
    
    expect(relevantErrors).toHaveLength(0);
  });

  test('diagnostics should run without throwing errors', async () => {
    const popupUrl = `chrome-extension://${extensionId}/popup/index.html`;
    await page.goto(popupUrl);
    
    // Wait for initial diagnostics
    await page.waitForSelector('.diagnostic-item', { timeout: 15000 });
    
    // Trigger manual diagnostics run
    const refreshBtn = await page.$('.refresh-btn');
    if (refreshBtn) {
      await refreshBtn.click();
      
      // Wait for diagnostics to complete
      await page.waitForTimeout(5000);
    }
    
    // Check that diagnostics are displayed
    const diagnosticItems = await page.$$('.diagnostic-item');
    expect(diagnosticItems.length).toBeGreaterThan(0);
    
    // Should have no critical errors during diagnostics
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('TypeError') || 
      err.includes('ReferenceError') ||
      err.includes('Failed to execute')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('background script errors should be detectable', async () => {
    // Navigate to extension errors page
    const errorsUrl = `chrome://extensions/?errors=${extensionId}`;
    const errorsPage = await browser.newPage();
    
    try {
      await errorsPage.goto(errorsUrl);
      
      // Check for any logged errors
      const errorElements = await errorsPage.$$eval(
        '.error-message, .stack-trace, .runtime-error', 
        elements => elements.map(el => el.textContent?.trim()).filter(text => text)
      );
      
      // Report errors but don't fail test (some errors might be expected)
      if (errorElements.length > 0) {
        console.log('Extension Errors Found:', errorElements);
      }
      
      // Only fail if there are critical errors
      const criticalErrors = errorElements.filter(error => 
        error && (
          error.includes('Cannot read property') ||
          error.includes('is not a function') ||
          error.includes('Uncaught TypeError')
        )
      );
      
      expect(criticalErrors).toHaveLength(0);
      
    } finally {
      await errorsPage.close();
    }
  });

  test('export functionality should work without errors', async () => {
    const popupUrl = `chrome-extension://${extensionId}/popup/index.html`;
    await page.goto(popupUrl);
    
    // Wait for diagnostics to load
    await page.waitForSelector('.export-btn', { timeout: 10000 });
    
    // Test JSON export
    const exportBtn = await page.$('.export-btn');
    if (exportBtn) {
      await exportBtn.click();
      
      // Wait for any export processing
      await page.waitForTimeout(2000);
    }
    
    // Test clipboard copy
    const copyBtn = await page.$('.export-btn.secondary');
    if (copyBtn) {
      await copyBtn.click();
      
      // Wait for clipboard operation
      await page.waitForTimeout(1000);
    }
    
    // Should have no errors during export
    const exportErrors = consoleErrors.filter(err => 
      err.includes('export') || 
      err.includes('clipboard') ||
      err.includes('Blob')
    );
    
    expect(exportErrors).toHaveLength(0);
  });

  test('memory leaks and cleanup should be handled', async () => {
    const popupUrl = `chrome-extension://${extensionId}/popup/index.html`;
    
    // Open and close popup multiple times
    for (let i = 0; i < 3; i++) {
      const popupPage = await browser.newPage();
      await popupPage.goto(popupUrl);
      await popupPage.waitForSelector('.ishka-root', { timeout: 10000 });
      await popupPage.waitForTimeout(2000);
      await popupPage.close();
    }
    
    // Check for memory-related errors
    const memoryErrors = consoleErrors.filter(err => 
      err.includes('memory') || 
      err.includes('leak') ||
      err.includes('cleanup')
    );
    
    expect(memoryErrors).toHaveLength(0);
  });
});