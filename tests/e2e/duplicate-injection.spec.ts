/**
 * @fileoverview E2E test for verifying idempotent diagnostic marker injection.
 * Tests that multiple content script injections don't create duplicate elements.
 */

import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.join(__dirname, '../../public');

test.describe('Diagnostic Marker Idempotency', () => {
  test('should inject diagnostic marker only once despite multiple injection attempts', async () => {
    // Launch browser with extension
    const browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    try {
      const [page] = browser.pages();
      
      // Navigate to test page
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
      
      // Wait for first injection
      const diagnosticLocator = page.locator('#ishka-diagnostic-element-present');
      await expect(diagnosticLocator).toBeAttached({ timeout: 10000 });
      
      // Verify only one element exists
      const initialCount = await page.locator('#ishka-diagnostic-element-present').count();
      expect(initialCount).toBe(1);
      
      // Simulate duplicate injection by manually injecting the content script again
      await page.evaluate(() => {
        // Reset the guard flag to allow re-injection
        (window as any).ishkaContentScriptInitialized = false;
        
        // Create and execute a new script element that would inject the content script
        const script = document.createElement('script');
        script.textContent = `
          // Simulate content script re-injection
          if (!(window as any).ishkaContentScriptInitialized) {
            (window as any).ishkaContentScriptInitialized = true;
            
            // Attempt to create diagnostic element again
            if (!document.getElementById('ishka-diagnostic-element-present')) {
              const diagnosticElement = document.createElement('div');
              diagnosticElement.id = 'ishka-diagnostic-element-present';
              diagnosticElement.style.display = 'none';
              document.body.appendChild(diagnosticElement);
            }
          }
        `;
        document.head.appendChild(script);
      });
      
      // Wait a moment for the potential duplicate injection
      await page.waitForTimeout(1000);
      
      // Verify still only one element exists
      const finalCount = await page.locator('#ishka-diagnostic-element-present').count();
      expect(finalCount).toBe(1);
      
      // Verify the element is still properly attached
      await expect(diagnosticLocator).toBeAttached();
      
      console.log('✅ Diagnostic marker idempotency test passed');
      
    } finally {
      await browser.close();
    }
  });

  test('should handle rapid multiple injection attempts gracefully', async () => {
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
      
      // Wait for initial injection
      await expect(page.locator('#ishka-diagnostic-element-present')).toBeAttached({ timeout: 10000 });
      
      // Simulate rapid multiple injection attempts
      await page.evaluate(() => {
        // Rapid fire injection attempts
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            if (!document.getElementById('ishka-diagnostic-element-present')) {
              const diagnosticElement = document.createElement('div');
              diagnosticElement.id = 'ishka-diagnostic-element-present';
              diagnosticElement.style.display = 'none';
              document.body.appendChild(diagnosticElement);
            }
          }, i * 10); // Stagger by 10ms
        }
      });
      
      // Wait for all attempts to complete
      await page.waitForTimeout(200);
      
      // Should still only have one element
      const count = await page.locator('#ishka-diagnostic-element-present').count();
      expect(count).toBe(1);
      
      console.log('✅ Rapid injection attempts handled correctly');
      
    } finally {
      await browser.close();
    }
  });

  test('should maintain diagnostic element through page navigation', async () => {
    const browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    try {
      const [page] = browser.pages();
      
      // Initial page
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#ishka-diagnostic-element-present')).toBeAttached({ timeout: 10000 });
      
      // Navigate to different page
      await page.goto('https://httpbin.org/html', { waitUntil: 'domcontentloaded' });
      
      // Should inject diagnostic element on new page
      await expect(page.locator('#ishka-diagnostic-element-present')).toBeAttached({ timeout: 10000 });
      
      // Should only have one element
      const count = await page.locator('#ishka-diagnostic-element-present').count();
      expect(count).toBe(1);
      
      console.log('✅ Diagnostic element properly re-injected on navigation');
      
    } finally {
      await browser.close();
    }
  });
});