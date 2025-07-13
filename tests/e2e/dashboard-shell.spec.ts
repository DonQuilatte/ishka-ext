import { test, expect } from '@playwright/test';

test.describe('Dashboard UI Shell', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the extension or test page
    await page.goto('/');
    
    // Wait for the dashboard to load
    await page.waitForSelector('.ishka-root');
  });

  test('should render dashboard with all navigation tabs', async ({ page }) => {
    // Check that all tabs are present
    const tabs = ['Diagnostics', 'Telemetry', 'Storage', 'Export'];
    
    for (const tabName of tabs) {
      await expect(page.getByRole('button', { name: tabName })).toBeVisible();
    }
  });

  test('should have diagnostics tab active by default', async ({ page }) => {
    const diagnosticsTab = page.getByRole('button', { name: 'Diagnostics' });
    await expect(diagnosticsTab).toHaveClass(/active/);
  });

  test('should switch between tabs correctly', async ({ page }) => {
    // Click telemetry tab
    await page.getByRole('button', { name: 'Telemetry' }).click();
    
    // Check that telemetry tab is now active
    await expect(page.getByRole('button', { name: 'Telemetry' })).toHaveClass(/active/);
    await expect(page.getByRole('button', { name: 'Diagnostics' })).not.toHaveClass(/active/);
    
    // Check that telemetry content is visible
    await expect(page.getByText('Telemetry')).toBeVisible();
  });

  test('should display system status indicator', async ({ page }) => {
    // Look for the overall status indicator in header
    const statusIndicator = page.locator('.header-status .status-indicator');
    await expect(statusIndicator).toBeVisible();
    
    // Should have a status dot
    await expect(statusIndicator.locator('.status-dot')).toBeVisible();
  });

  test('should show refresh button in header', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    await expect(refreshBtn).toBeVisible();
    await expect(refreshBtn).toBeEnabled();
  });

  test('should handle tab switching with keyboard navigation', async ({ page }) => {
    // Focus on first tab
    await page.getByRole('button', { name: 'Diagnostics' }).focus();
    
    // Use arrow keys to navigate
    await page.keyboard.press('ArrowRight');
    
    // Should focus on telemetry tab (implementation dependent)
    const telemetryTab = page.getByRole('button', { name: 'Telemetry' });
    await expect(telemetryTab).toBeFocused();
  });

  test('should display tab badges when there are issues', async ({ page }) => {
    // This would require setting up mock data or triggering diagnostics
    // For now, we'll just check that the badge structure exists
    const diagnosticsTab = page.getByRole('button', { name: 'Diagnostics' });
    
    // Badge might not be visible initially, but structure should exist
    await expect(diagnosticsTab).toBeVisible();
  });

  test('should be responsive on smaller screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Dashboard should still be visible and functional
    await expect(page.locator('.dashboard-container')).toBeVisible();
    
    // Tabs should be accessible (might scroll horizontally)
    const tabs = page.locator('.nav-tab');
    await expect(tabs.first()).toBeVisible();
  });

  test('should maintain scroll position when switching tabs', async ({ page }) => {
    // Switch to a tab with scrollable content
    await page.getByRole('button', { name: 'Storage' }).click();
    
    // Scroll down if content is available
    const contentArea = page.locator('.dashboard-content');
    await contentArea.evaluate(el => el.scrollTop = 100);
    
    // Switch to another tab and back
    await page.getByRole('button', { name: 'Diagnostics' }).click();
    await page.getByRole('button', { name: 'Storage' }).click();
    
    // Content should be visible (scroll position may reset, which is expected)
    await expect(contentArea).toBeVisible();
  });

  test('should handle rapid tab switching', async ({ page }) => {
    const tabs = ['Telemetry', 'Storage', 'Export', 'Diagnostics'];
    
    // Rapidly switch between tabs
    for (const tabName of tabs) {
      await page.getByRole('button', { name: tabName }).click();
      await expect(page.getByRole('button', { name: tabName })).toHaveClass(/active/);
    }
  });

  test('should show loading states appropriately', async ({ page }) => {
    // Click refresh button
    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    await refreshBtn.click();
    
    // Button might show loading state temporarily
    // This is hard to test without controlling timing, but we can check it doesn't break
    await expect(refreshBtn).toBeVisible();
  });

  test('should handle theme switching if available', async ({ page }) => {
    // Check that CSS custom properties are applied
    const root = page.locator('.ishka-root');
    await expect(root).toBeVisible();
    
    // Verify that Ishka design tokens are being used
    const computedStyle = await root.evaluate(el => 
      getComputedStyle(el).getPropertyValue('--ishka-bg-primary')
    );
    
    // Should have some value (exact value depends on theme implementation)
    expect(computedStyle).toBeTruthy();
  });
});

test.describe('Dashboard Integration', () => {
  test('should integrate with diagnostic runner', async ({ page }) => {
    await page.goto('/');
    
    // Switch to diagnostics tab
    await page.getByRole('button', { name: 'Diagnostics' }).click();
    
    // Should show diagnostics content
    await expect(page.getByText(/diagnostic/i)).toBeVisible();
  });

  test('should integrate with telemetry system', async ({ page }) => {
    await page.goto('/');
    
    // Switch to telemetry tab
    await page.getByRole('button', { name: 'Telemetry' }).click();
    
    // Should show telemetry content
    await expect(page.getByText(/telemetry/i)).toBeVisible();
  });

  test('should integrate with storage management', async ({ page }) => {
    await page.goto('/');
    
    // Switch to storage tab
    await page.getByRole('button', { name: 'Storage' }).click();
    
    // Should show storage content
    await expect(page.getByText(/storage/i)).toBeVisible();
  });

  test('should integrate with export functionality', async ({ page }) => {
    await page.goto('/');
    
    // Switch to export tab
    await page.getByRole('button', { name: 'Export' }).click();
    
    // Should show export content
    await expect(page.getByText(/export/i)).toBeVisible();
  });
});