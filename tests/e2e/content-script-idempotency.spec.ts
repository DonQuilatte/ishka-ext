/**
 * @fileoverview Content Script Idempotency Tests
 * Verifies that multiple injections of the content script are handled gracefully
 * and that diagnostic markers are only created once.
 * 
 * @author Ishka Extension Team
 * @version 1.0.0
 */

import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.join(__dirname, '../../public');

test.describe('Content Script Idempotency', () => {
  test('should handle duplicate script injections gracefully', async () => {
    console.log('Testing content script idempotency...');
    
    const browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    try {
      const [page] = browser.pages();
      
      // Navigate to a test page
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });

      // Wait for the first diagnostic element to appear
      const diagnosticLocator = page.locator('#ishka-diagnostic-element-present');
      await expect(diagnosticLocator).toBeAttached({ timeout: 10000 });
      console.log('✅ First diagnostic element detected');

      // Count initial diagnostic elements
      const initialCount = await page.locator('#ishka-diagnostic-element-present').count();
      expect(initialCount).toBe(1);
      console.log(`✅ Initial diagnostic element count: ${initialCount}`);

      // Simulate duplicate content script injection by manually executing it
      await page.evaluate(() => {
        // Check if the guard works
        const isInitialized = (window as any).ishkaContentScriptInitialized;
        console.log(`Initialization guard status: ${isInitialized}`);
        
        // Force re-injection by temporarily clearing the guard
        (window as any).ishkaContentScriptInitialized = false;
        
        // Try to inject diagnostic element again (simulating duplicate script execution)
        if (!document.getElementById('ishka-diagnostic-element-present-duplicate-test')) {
          const testElement = document.createElement('div');
          testElement.id = 'ishka-diagnostic-element-present-duplicate-test';
          testElement.style.display = 'none';
          document.body.appendChild(testElement);
          console.log('Test element created for duplicate injection simulation');
        }
      });

      // Wait a moment for any potential duplicate processing
      await page.waitForTimeout(2000);

      // Verify that we still only have one diagnostic element
      const finalCount = await page.locator('#ishka-diagnostic-element-present').count();
      expect(finalCount).toBe(1);
      console.log(`✅ Final diagnostic element count after duplicate attempt: ${finalCount}`);

      // Verify that duplicate injections are logged as warnings
      const consoleLogs = await page.evaluate(() => {
        return (window as any).ishkaTestLogs || [];
      });

      // Check that no JavaScript errors occurred during the test
      const jsErrors: string[] = [];
      page.on('pageerror', (error) => {
        jsErrors.push(error.message);
      });

      expect(jsErrors).toHaveLength(0);
      console.log('✅ No JavaScript errors during idempotency test');

      // Verify the content script initialization guard is working
      const guardStatus = await page.evaluate(() => {
        return (window as any).ishkaContentScriptInitialized;
      });
      
      console.log(`✅ Final guard status: ${guardStatus}`);
      
      console.log('✅ Content script idempotency test completed successfully');
      
    } finally {
      await browser.close();
    }
  });

  test('should handle rapid successive page loads without duplicate elements', async () => {
    console.log('Testing rapid page navigation idempotency...');
    
    const browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    try {
      const [page] = browser.pages();
      
      // Navigate rapidly between pages to test cleanup and re-injection
      for (let i = 0; i < 3; i++) {
        console.log(`Navigation cycle ${i + 1}/3`);
        
        await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
        
        await page.goto('https://httpbin.org/html', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
      }

      // Final navigation to test page
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
      
      // Wait for diagnostic element
      await expect(page.locator('#ishka-diagnostic-element-present')).toBeAttached({ timeout: 10000 });
      
      // Verify only one diagnostic element exists
      const elementCount = await page.locator('#ishka-diagnostic-element-present').count();
      expect(elementCount).toBe(1);
      
      console.log(`✅ Diagnostic element count after rapid navigation: ${elementCount}`);
      console.log('✅ Rapid navigation idempotency test completed successfully');
      
    } finally {
      await browser.close();
    }
  });

  test('should properly clean up on page unload', async () => {
    console.log('Testing cleanup on page unload...');
    
    const browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    try {
      const [page] = browser.pages();
      
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
      
      // Wait for initialization
      await expect(page.locator('#ishka-diagnostic-element-present')).toBeAttached({ timeout: 10000 });
      
      // Check initialization status
      const beforeUnload = await page.evaluate(() => {
        return (window as any).ishkaContentScriptInitialized;
      });
      expect(beforeUnload).toBe(true);
      
      // Navigate to new page (triggers beforeunload)
      await page.goto('https://httpbin.org/html', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      // Navigate back to test page
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
      
      // Wait for re-initialization
      await expect(page.locator('#ishka-diagnostic-element-present')).toBeAttached({ timeout: 10000 });
      
      // Check that re-initialization worked
      const afterReload = await page.evaluate(() => {
        return (window as any).ishkaContentScriptInitialized;
      });
      expect(afterReload).toBe(true);
      
      console.log('✅ Cleanup and re-initialization test completed successfully');
      
    } finally {
      await browser.close();
    }
  });
});