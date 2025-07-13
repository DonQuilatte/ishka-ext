import { test, expect } from '@playwright/test';
import { launchExtensionContext, extensionUrl } from './with-extension';

test('dashboard and popup share diagnostic state and update live', async () => {
  const { context, extensionId } = await launchExtensionContext();
  const popupPage = await context.newPage();
  const dashboardPage = await context.newPage();

  await popupPage.goto(extensionUrl(extensionId, 'popup.html'));
  await dashboardPage.goto(extensionUrl(extensionId, 'dashboard.html'));

  // Example: trigger a diagnostic in the popup, check dashboard updates
  await popupPage.click('button[aria-label="Run Diagnostics"]');
  await expect(dashboardPage.getByText('Diagnostics Running')).toBeVisible();

  // Example: check shared state
  await expect(popupPage.getByText('✓')).toBeVisible();
  await expect(dashboardPage.getByText('✓')).toBeVisible();

  await context.close();
}); 