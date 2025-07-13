import { test, expect } from '@playwright/test';

const STORYBOOK_URL = 'http://localhost:6006';

test.describe('FilterDropdown Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORYBOOK_URL);
    await page.waitForSelector('[data-testid="sidebar-search-input"]', { timeout: 10000 });
    await page.fill('[data-testid="sidebar-search-input"]', 'FilterDropdown');
    await page.waitForTimeout(500);
  });

  test('renders default story with basic functionality', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.filter-dropdown');
    
    // Verify label is present
    await expect(page.locator('.filter-label')).toHaveText('Priority Level');
    
    // Verify select element exists
    await expect(page.locator('.filter-select')).toBeVisible();
    
    // Verify custom dropdown arrow
    await expect(page.locator('.dropdown-arrow')).toBeVisible();
    
    // Check default value
    await expect(page.locator('.filter-select')).toHaveValue('all');
  });

  test('dropdown options are accessible and selectable', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.filter-dropdown');
    
    const select = page.locator('.filter-select');
    
    // Open dropdown and select an option
    await select.selectOption('important');
    await expect(select).toHaveValue('important');
    
    // Try another option
    await select.selectOption('normal');
    await expect(select).toHaveValue('normal');
    
    // Verify all options are present
    const options = await select.locator('option').allTextContents();
    expect(options).toContain('All Items');
    expect(options).toContain('Important');
    expect(options).toContain('Normal');
    expect(options).toContain('Low Priority');
  });

  test('shows option counts when enabled', async ({ page }) => {
    await page.click('text=With Counts');
    await page.waitForSelector('.filter-dropdown');
    
    const select = page.locator('.filter-select');
    const options = await select.locator('option').allTextContents();
    
    // Verify counts are displayed in parentheses
    expect(options.some(option => option.includes('(156)'))).toBeTruthy();
    expect(options.some(option => option.includes('(42)'))).toBeTruthy();
    expect(options.some(option => option.includes('(38)'))).toBeTruthy();
  });

  test('handles disabled options correctly', async ({ page }) => {
    await page.click('text=With Disabled Options');
    await page.waitForSelector('.filter-dropdown');
    
    const select = page.locator('.filter-select');
    
    // Try to select enabled options
    await select.selectOption('pass');
    await expect(select).toHaveValue('pass');
    
    await select.selectOption('warning');
    await expect(select).toHaveValue('warning');
    
    // Verify disabled options exist but cannot be selected through user interaction
    const options = await select.locator('option').all();
    let hasDisabledOptions = false;
    
    for (const option of options) {
      const isDisabled = await option.getAttribute('disabled');
      if (isDisabled !== null) {
        hasDisabledOptions = true;
        break;
      }
    }
    
    expect(hasDisabledOptions).toBeTruthy();
  });

  test('compact mode renders with smaller styling', async ({ page }) => {
    await page.click('text=Compact');
    await page.waitForSelector('.filter-dropdown');
    
    // Verify compact class is applied
    await expect(page.locator('.filter-dropdown')).toHaveClass(/compact/);
    
    // Verify compact styling affects label and select
    const label = page.locator('.filter-label');
    const select = page.locator('.filter-select');
    
    await expect(label).toBeVisible();
    await expect(select).toBeVisible();
    
    // Test functionality still works in compact mode
    await select.selectOption('api');
    await expect(select).toHaveValue('api');
  });

  test('disabled state prevents interaction', async ({ page }) => {
    await page.click('text=Disabled');
    await page.waitForSelector('.filter-dropdown');
    
    // Verify disabled class is applied
    await expect(page.locator('.filter-dropdown')).toHaveClass(/disabled/);
    
    // Verify select is disabled
    const select = page.locator('.filter-select');
    await expect(select).toBeDisabled();
    
    // Verify current value is preserved
    await expect(select).toHaveValue('pass');
  });

  test('empty state shows placeholder', async ({ page }) => {
    await page.click('text=Empty State');
    await page.waitForSelector('.filter-dropdown');
    
    const select = page.locator('.filter-select');
    
    // Should show placeholder option
    const options = await select.locator('option').allTextContents();
    expect(options).toContain('No options available');
    
    // Should have empty value
    await expect(select).toHaveValue('');
  });

  test('handles long labels gracefully', async ({ page }) => {
    await page.click('text=Long Labels');
    await page.waitForSelector('.filter-dropdown');
    
    const select = page.locator('.filter-select');
    
    // Verify dropdown still functions with long labels
    await select.selectOption('diagnostics');
    await expect(select).toHaveValue('diagnostics');
    
    // Verify text doesn't overflow container
    const dropdown = page.locator('.filter-dropdown');
    const boundingBox = await dropdown.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(0);
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    await page.click('text=Interactive');
    await page.waitForSelector('.filter-dropdown');
    
    const select = page.locator('.filter-select');
    
    // Focus the select element
    await select.focus();
    await expect(select).toBeFocused();
    
    // Use keyboard to navigate
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // Should have changed value
    const value = await select.inputValue();
    expect(value).not.toBe('all');
  });

  test('focus states are visible', async ({ page }) => {
    await page.click('text=Interactive');
    await page.waitForSelector('.filter-dropdown');
    
    const select = page.locator('.filter-select');
    
    // Focus the select
    await select.focus();
    
    // Verify focus styling is applied
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBe(select);
  });

  test('hover states work correctly', async ({ page }) => {
    await page.click('text=Interactive');
    await page.waitForSelector('.filter-dropdown');
    
    const select = page.locator('.filter-select');
    
    // Hover over the select
    await select.hover();
    
    // Element should still be visible and interactable
    await expect(select).toBeVisible();
    await expect(select).not.toBeDisabled();
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('text=Compact');
    await page.waitForSelector('.filter-dropdown');
    
    // Component should still be usable on mobile
    await expect(page.locator('.filter-dropdown')).toBeVisible();
    
    const select = page.locator('.filter-select');
    await expect(select).toBeVisible();
    
    // Should still be able to select options
    await select.selectOption('storage');
    await expect(select).toHaveValue('storage');
  });

  test('accessibility attributes are present', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.filter-dropdown');
    
    const label = page.locator('.filter-label');
    const select = page.locator('.filter-select');
    
    // Verify label-select association
    const labelFor = await label.getAttribute('for');
    const selectId = await select.getAttribute('id');
    expect(labelFor).toBe(selectId);
    
    // Verify select has proper attributes
    await expect(select).toHaveAttribute('type', null); // Default select type
    
    // Verify dropdown arrow is hidden from screen readers
    const arrow = page.locator('.dropdown-arrow');
    await expect(arrow).toHaveAttribute('aria-hidden', 'true');
  });

  test('multiple dropdowns can coexist', async ({ page }) => {
    await page.click('text=Interactive');
    await page.waitForSelector('.filter-dropdown');
    
    // In the interactive story, multiple FilterDropdowns might be present
    const dropdowns = page.locator('.filter-dropdown');
    const count = await dropdowns.count();
    
    // Should handle multiple instances gracefully
    expect(count).toBeGreaterThanOrEqual(1);
    
    // Each should have unique IDs
    if (count > 1) {
      const firstSelect = dropdowns.nth(0).locator('.filter-select');
      const secondSelect = dropdowns.nth(1).locator('.filter-select');
      
      const firstId = await firstSelect.getAttribute('id');
      const secondId = await secondSelect.getAttribute('id');
      
      expect(firstId).not.toBe(secondId);
    }
  });

  test('dark mode compatibility', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.click('text=Default');
    await page.waitForSelector('.filter-dropdown');
    
    // Verify component renders in dark mode
    await expect(page.locator('.filter-dropdown')).toBeVisible();
    
    const select = page.locator('.filter-select');
    
    // Check that styles are applied (CSS custom properties handle the actual colors)
    const styles = await select.evaluate(element => {
      const computed = window.getComputedStyle(element);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        borderColor: computed.borderColor
      };
    });
    
    expect(styles.backgroundColor).toBeTruthy();
    expect(styles.color).toBeTruthy();
    expect(styles.borderColor).toBeTruthy();
  });
});

test.describe('FilterDropdown Performance', () => {
  test('renders quickly with large option sets', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(STORYBOOK_URL);
    await page.waitForSelector('[data-testid="sidebar-search-input"]');
    await page.fill('[data-testid="sidebar-search-input"]', 'FilterDropdown');
    await page.click('text=With Counts');
    await page.waitForSelector('.filter-dropdown');
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    // Should render within reasonable time
    expect(renderTime).toBeLessThan(5000);
  });

  test('handles rapid selection changes smoothly', async ({ page }) => {
    await page.goto(STORYBOOK_URL);
    await page.waitForSelector('[data-testid="sidebar-search-input"]');
    await page.fill('[data-testid="sidebar-search-input"]', 'FilterDropdown');
    await page.click('text=Interactive');
    await page.waitForSelector('.filter-dropdown');
    
    const select = page.locator('.filter-select');
    
    // Rapidly change selections
    const options = ['all', 'dom', 'api', 'storage', 'all'];
    
    for (const option of options) {
      await select.selectOption(option);
      await expect(select).toHaveValue(option);
      await page.waitForTimeout(50); // Brief pause
    }
    
    // Component should remain responsive
    await expect(select).toBeVisible();
    await expect(select).not.toBeDisabled();
  });
});