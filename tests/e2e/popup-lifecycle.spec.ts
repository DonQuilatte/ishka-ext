import { test, expect } from '@playwright/test';
import { launchExtensionContext } from './with-extension';

test('popup displays manifest data (name, version, permissions)', async () => {
  console.log('Launching extension...');
  const { extensionId, context } = await launchExtensionContext();
  console.log(`Extension loaded with ID: ${extensionId}`);

  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  console.log('Navigating to popup...');
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  console.log('Navigation complete, taking screenshot...');
  await page.screenshot({ path: 'tests/e2e/popup-debug.png', fullPage: true });
  console.log('Screenshot taken, waiting for #app...');
  await expect(page.locator('#app')).toBeAttached({ timeout: 10000 });
  console.log('#app is attached!');
}); 