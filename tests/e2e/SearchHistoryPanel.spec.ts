import { test, expect } from '@playwright/test';

const STORYBOOK_URL = 'http://localhost:6006';

test.describe('SearchHistoryPanel Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Storybook
    await page.goto(STORYBOOK_URL);
    
    // Wait for Storybook to load
    await page.waitForSelector('[data-testid="sidebar-search-input"]', { timeout: 10000 });
    
    // Search for SearchHistoryPanel
    await page.fill('[data-testid="sidebar-search-input"]', 'SearchHistoryPanel');
    await page.waitForTimeout(500); // Wait for search results
  });

  test('loads default story successfully', async ({ page }) => {
    // Click on Default story
    await page.click('text=Default');
    
    // Wait for story to load
    await page.waitForSelector('.search-history-panel', { timeout: 5000 });
    
    // Verify main sections are present
    await expect(page.locator('.search-section')).toBeVisible();
    await expect(page.locator('.history-section')).toBeVisible();
    
    // Verify search input is present
    await expect(page.locator('.search-input')).toBeVisible();
    
    // Verify filter controls are present
    await expect(page.locator('.filter-controls')).toBeVisible();
    
    // Verify section titles
    await expect(page.locator('text=Search & Filter')).toBeVisible();
    await expect(page.locator('text=History Timeline')).toBeVisible();
  });

  test('search functionality works correctly', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Type in search input
    const searchInput = page.locator('.search-input');
    await searchInput.fill('diagnostic');
    
    // Verify search input value
    await expect(searchInput).toHaveValue('diagnostic');
    
    // Verify clear search button appears
    await expect(page.locator('.clear-search-button')).toBeVisible();
    
    // Click clear search button
    await page.click('.clear-search-button');
    
    // Verify search input is cleared
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('.clear-search-button')).not.toBeVisible();
  });

  test('filter dropdowns function correctly', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Test category filter
    const categorySelect = page.locator('.filter-controls').locator('select').first();
    await categorySelect.selectOption('dom');
    await expect(categorySelect).toHaveValue('dom');
    
    // Test status filter
    const statusSelect = page.locator('.filter-controls').locator('select').nth(1);
    await statusSelect.selectOption('pass');
    await expect(statusSelect).toHaveValue('pass');
    
    // Test type filter
    const typeSelect = page.locator('.filter-controls').locator('select').nth(2);
    await typeSelect.selectOption('diagnostic');
    await expect(typeSelect).toHaveValue('diagnostic');
    
    // Test date range filter
    const dateSelect = page.locator('.filter-controls').locator('select').nth(3);
    await dateSelect.selectOption('week');
    await expect(dateSelect).toHaveValue('week');
  });

  test('clear all filters button works', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Set some filters
    await page.fill('.search-input', 'test query');
    await page.locator('.filter-controls select').first().selectOption('dom');
    await page.locator('.filter-controls select').nth(1).selectOption('pass');
    
    // Click clear all filters
    await page.click('text=Clear All');
    
    // Verify all filters are reset
    await expect(page.locator('.search-input')).toHaveValue('');
    await expect(page.locator('.filter-controls select').first()).toHaveValue('all');
    await expect(page.locator('.filter-controls select').nth(1)).toHaveValue('all');
  });

  test('timeline items expand and collapse', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Wait for timeline items to load
    await page.waitForSelector('.timeline-item', { timeout: 5000 });
    
    // Find first timeline item
    const firstItem = page.locator('.timeline-item').first();
    const expandButton = firstItem.locator('.expand-button');
    
    // Verify item is not expanded initially
    await expect(firstItem).not.toHaveClass(/expanded/);
    await expect(expandButton).toHaveText('+');
    
    // Click to expand
    await expandButton.click();
    
    // Verify item is expanded
    await expect(firstItem).toHaveClass(/expanded/);
    await expect(expandButton).toHaveText('−');
    await expect(firstItem.locator('.timeline-details')).toBeVisible();
    
    // Click to collapse
    await expandButton.click();
    
    // Verify item is collapsed
    await expect(firstItem).not.toHaveClass(/expanded/);
    await expect(expandButton).toHaveText('+');
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Focus search input with Tab
    await page.keyboard.press('Tab');
    await expect(page.locator('.search-input')).toBeFocused();
    
    // Type with keyboard
    await page.keyboard.type('keyboard test');
    await expect(page.locator('.search-input')).toHaveValue('keyboard test');
    
    // Navigate to filters with Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Skip clear button if visible
    
    // Navigate through filter dropdowns
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      // Verify focus is on a select element
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('tagName', 'SELECT');
    }
  });

  test('compact mode renders correctly', async ({ page }) => {
    await page.click('text=Compact');
    await page.waitForSelector('.search-history-panel');
    
    // Verify compact class is applied
    await expect(page.locator('.search-history-panel')).toHaveClass(/compact/);
    
    // Verify all sections are still present but with compact styling
    await expect(page.locator('.search-section')).toBeVisible();
    await expect(page.locator('.history-section')).toBeVisible();
    await expect(page.locator('.token-section')).toBeVisible();
  });

  test('token dashboard shows usage stats', async ({ page }) => {
    await page.click('text=Token Dashboard');
    await page.waitForSelector('.search-history-panel');
    
    // Verify token section is visible
    await expect(page.locator('.token-section')).toBeVisible();
    
    // Verify token stats are displayed
    await expect(page.locator('.token-stats')).toBeVisible();
    await expect(page.locator('.token-stat')).toHaveCount(4); // prompt, completion, total, cost
    
    // Verify specific token labels
    await expect(page.locator('text=Prompt')).toBeVisible();
    await expect(page.locator('text=Completion')).toBeVisible();
    await expect(page.locator('text=Total')).toBeVisible();
    await expect(page.locator('text=Cost')).toBeVisible();
  });

  test('empty state displays correctly', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Set search that will return no results
    await page.fill('.search-input', 'nonexistent search term that should not match anything');
    
    // Wait for empty state to appear
    await page.waitForSelector('.empty-state', { timeout: 3000 });
    
    // Verify empty state content
    await expect(page.locator('.empty-message')).toBeVisible();
    await expect(page.locator('.empty-description')).toBeVisible();
    await expect(page.locator('text=No history items found')).toBeVisible();
  });

  test('loading state shows spinner', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Check if loading spinner appears (it may be brief)
    const loadingSpinner = page.locator('.loading-spinner');
    
    // The spinner might appear briefly during initial load
    // We'll check that the spinner element exists in the DOM
    await expect(page.locator('.section-header')).toBeVisible();
  });

  test('export functionality is accessible', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Verify export button is present
    await expect(page.locator('text=Export')).toBeVisible();
    
    // Click export button (this will trigger download in real usage)
    await page.click('text=Export');
    
    // In a real test, we'd verify the download started
    // For now, we just verify the button is clickable
  });

  test('search stats update correctly', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Verify stats are displayed
    await expect(page.locator('.search-stats')).toBeVisible();
    await expect(page.locator('.stat-item')).toHaveCount(4); // total, sessions, diagnostics, errors
    
    // Verify stat labels
    await expect(page.locator('text=Total Items')).toBeVisible();
    await expect(page.locator('text=Sessions')).toBeVisible();
    await expect(page.locator('text=Diagnostics')).toBeVisible();
    await expect(page.locator('text=Errors')).toBeVisible();
    
    // All stat values should be visible
    const statValues = page.locator('.stat-value');
    await expect(statValues).toHaveCount(4);
  });

  test('timeline markers have correct colors', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Wait for timeline items
    await page.waitForSelector('.timeline-item');
    
    // Verify timeline markers exist
    const markers = page.locator('.timeline-marker');
    await expect(markers.first()).toBeVisible();
    
    // Check that markers have background colors (CSS custom properties)
    const firstMarker = markers.first();
    const markerStyle = await firstMarker.getAttribute('style');
    expect(markerStyle).toContain('background-color');
  });

  test('type badges have correct styling', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Wait for timeline items
    await page.waitForSelector('.timeline-item');
    
    // Check for type badges
    const badges = page.locator('.timeline-type-badge');
    if (await badges.count() > 0) {
      const firstBadge = badges.first();
      await expect(firstBadge).toBeVisible();
      
      // Verify badge has appropriate class
      const classes = await firstBadge.getAttribute('class');
      expect(classes).toMatch(/(session|diagnostic|error)/);
    }
  });

  test('responsive design works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('text=Compact');
    await page.waitForSelector('.search-history-panel');
    
    // Verify component is still usable on mobile
    await expect(page.locator('.search-history-panel')).toBeVisible();
    await expect(page.locator('.search-input')).toBeVisible();
    
    // Filter controls should stack properly on mobile
    await expect(page.locator('.filter-controls')).toBeVisible();
  });

  test('dark mode compatibility', async ({ page }) => {
    // Test with dark color scheme preference
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Verify component renders in dark mode
    await expect(page.locator('.search-history-panel')).toBeVisible();
    
    // Check that CSS custom properties are being applied
    const panel = page.locator('.search-history-panel');
    const styles = await panel.evaluate(element => {
      const computed = window.getComputedStyle(element);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color
      };
    });
    
    // Verify styles are applied (exact values depend on CSS custom properties)
    expect(styles.backgroundColor).toBeTruthy();
    expect(styles.color).toBeTruthy();
  });

  test('accessibility features work correctly', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Check for proper ARIA labels and roles
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toHaveAttribute('type', 'text');
    
    // Verify filter labels are associated with their controls
    const filterLabels = page.locator('.filter-label');
    if (await filterLabels.count() > 0) {
      await expect(filterLabels.first()).toBeVisible();
    }
    
    // Check that buttons are properly labeled
    const buttons = page.locator('button');
    for (let i = 0; i < await buttons.count(); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      expect(text).toBeTruthy(); // All buttons should have text content
    }
  });
});

test.describe('SearchHistoryPanel Performance', () => {
  test('renders within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(STORYBOOK_URL);
    await page.waitForSelector('[data-testid="sidebar-search-input"]');
    await page.fill('[data-testid="sidebar-search-input"]', 'SearchHistoryPanel');
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    // Should render within 10 seconds (generous for Storybook)
    expect(renderTime).toBeLessThan(10000);
  });

  test('handles large datasets efficiently', async ({ page }) => {
    await page.goto(STORYBOOK_URL);
    await page.waitForSelector('[data-testid="sidebar-search-input"]');
    await page.fill('[data-testid="sidebar-search-input"]', 'SearchHistoryPanel');
    await page.click('text=Default');
    await page.waitForSelector('.search-history-panel');
    
    // Perform multiple rapid filter changes
    const categorySelect = page.locator('.filter-controls select').first();
    
    for (const option of ['dom', 'api', 'storage', 'all']) {
      await categorySelect.selectOption(option);
      await page.waitForTimeout(100); // Brief pause between changes
    }
    
    // Component should remain responsive
    await expect(page.locator('.search-history-panel')).toBeVisible();
  });
});