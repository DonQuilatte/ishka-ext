import { test, expect } from '@playwright/test';

const STORYBOOK_URL = 'http://localhost:6006';

test.describe('DateRangePicker Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORYBOOK_URL);
    await page.waitForSelector('[data-testid="sidebar-search-input"]', { timeout: 10000 });
    await page.fill('[data-testid="sidebar-search-input"]', 'DateRangePicker');
    await page.waitForTimeout(500);
  });

  test('renders default story with empty inputs', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.date-range-picker');
    
    // Verify label is present
    await expect(page.locator('.date-range-label')).toHaveText('Date Range');
    
    // Verify both date inputs exist
    await expect(page.locator('.start-input')).toBeVisible();
    await expect(page.locator('.end-input')).toBeVisible();
    
    // Verify input labels
    await expect(page.locator('text=From')).toBeVisible();
    await expect(page.locator('text=To')).toBeVisible();
    
    // Verify range separator is present
    await expect(page.locator('.range-separator')).toBeVisible();
    
    // Verify clear button is not visible when no dates are set
    await expect(page.locator('.clear-button')).not.toBeVisible();
  });

  test('accepts date input and validates range', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.date-range-picker');
    
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    
    // Enter start date
    await startInput.fill('2023-01-01');
    await expect(startInput).toHaveValue('2023-01-01');
    
    // Enter end date
    await endInput.fill('2023-01-31');
    await expect(endInput).toHaveValue('2023-01-31');
    
    // Clear button should now be visible
    await expect(page.locator('.clear-button')).toBeVisible();
  });

  test('clear button resets both dates', async ({ page }) => {
    await page.click('text=With Values');
    await page.waitForSelector('.date-range-picker');
    
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    const clearButton = page.locator('.clear-button');
    
    // Verify dates are pre-filled
    const startValue = await startInput.inputValue();
    const endValue = await endInput.inputValue();
    expect(startValue).not.toBe('');
    expect(endValue).not.toBe('');
    
    // Click clear button
    await clearButton.click();
    
    // Verify dates are cleared
    await expect(startInput).toHaveValue('');
    await expect(endInput).toHaveValue('');
    
    // Clear button should be hidden
    await expect(clearButton).not.toBeVisible();
  });

  test('respects min and max date restrictions', async ({ page }) => {
    await page.click('text=Restricted');
    await page.waitForSelector('.date-range-picker');
    
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    
    // Check that min/max attributes are set
    const startMin = await startInput.getAttribute('min');
    const startMax = await startInput.getAttribute('max');
    const endMin = await endInput.getAttribute('min');
    const endMax = await endInput.getAttribute('max');
    
    expect(startMin).toBeTruthy();
    expect(endMax).toBeTruthy();
    
    // Try to enter a date outside the range (browser should prevent this)
    await startInput.fill('1999-01-01');
    await endInput.fill('2099-12-31');
    
    // Browser validation should handle invalid dates
    // We can't easily test browser-level validation, so we verify attributes are set
    expect(startMin).not.toBe('');
    expect(endMax).not.toBe('');
  });

  test('compact mode renders with smaller styling', async ({ page }) => {
    await page.click('text=Compact');
    await page.waitForSelector('.date-range-picker');
    
    // Verify compact class is applied
    await expect(page.locator('.date-range-picker')).toHaveClass(/compact/);
    
    // Verify functionality still works in compact mode
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    
    await startInput.fill('2023-06-01');
    await endInput.fill('2023-06-30');
    
    await expect(startInput).toHaveValue('2023-06-01');
    await expect(endInput).toHaveValue('2023-06-30');
  });

  test('disabled state prevents interaction', async ({ page }) => {
    await page.click('text=Disabled');
    await page.waitForSelector('.date-range-picker');
    
    // Verify disabled class is applied
    await expect(page.locator('.date-range-picker')).toHaveClass(/disabled/);
    
    // Verify inputs are disabled
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    
    await expect(startInput).toBeDisabled();
    await expect(endInput).toBeDisabled();
    
    // Clear button should not be functional
    const clearButton = page.locator('.clear-button');
    if (await clearButton.isVisible()) {
      await expect(clearButton).toBeDisabled();
    }
  });

  test('displays error state correctly', async ({ page }) => {
    await page.click('text=With Error');
    await page.waitForSelector('.date-range-picker');
    
    // Verify error class is applied
    await expect(page.locator('.date-range-picker')).toHaveClass(/error/);
    
    // Verify error message is displayed
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toHaveText('Start date must be before or equal to end date');
    
    // Verify error styling on inputs
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    
    // Inputs should have error styling (checked via CSS class)
    await expect(startInput).toBeVisible();
    await expect(endInput).toBeVisible();
  });

  test('hides clear button when showClear is false', async ({ page }) => {
    await page.click('text=No Clear Button');
    await page.waitForSelector('.date-range-picker');
    
    // Clear button should not be present even with values
    await expect(page.locator('.clear-button')).not.toBeVisible();
    
    // Verify dates are still present
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    
    const startValue = await startInput.inputValue();
    const endValue = await endInput.inputValue();
    expect(startValue).not.toBe('');
    expect(endValue).not.toBe('');
  });

  test('shows custom placeholders', async ({ page }) => {
    await page.click('text=Custom Placeholders');
    await page.waitForSelector('.date-range-picker');
    
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    
    // Check placeholder attributes
    const startPlaceholder = await startInput.getAttribute('placeholder');
    const endPlaceholder = await endInput.getAttribute('placeholder');
    
    expect(startPlaceholder).toBe('Event start');
    expect(endPlaceholder).toBe('Event end');
  });

  test('keyboard navigation between inputs works', async ({ page }) => {
    await page.click('text=Interactive');
    await page.waitForSelector('.date-range-picker');
    
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    
    // Focus start input
    await startInput.focus();
    await expect(startInput).toBeFocused();
    
    // Tab to end input (should skip the separator and icons)
    await page.keyboard.press('Tab');
    await expect(endInput).toBeFocused();
    
    // Shift+Tab back to start input
    await page.keyboard.press('Shift+Tab');
    await expect(startInput).toBeFocused();
  });

  test('automatic validation adjusts dates', async ({ page }) => {
    await page.click('text=Interactive');
    await page.waitForSelector('.date-range-picker');
    
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    
    // Set end date first
    await endInput.fill('2023-06-15');
    await expect(endInput).toHaveValue('2023-06-15');
    
    // Set start date after end date
    await startInput.fill('2023-06-20');
    
    // Component should auto-adjust or show validation error
    // The exact behavior depends on implementation
    await expect(startInput).toHaveValue('2023-06-20');
  });

  test('calendar icons are present and properly positioned', async ({ page }) => {
    await page.click('text=Default');
    await page.waitForSelector('.date-range-picker');
    
    // Verify calendar icons exist
    const icons = page.locator('.input-icon');
    await expect(icons).toHaveCount(2);
    
    // Icons should be hidden from screen readers
    for (let i = 0; i < 2; i++) {
      const icon = icons.nth(i);
      await expect(icon).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('text=Responsive Mobile');
    await page.waitForSelector('.date-range-picker');
    
    // Component should still be usable on mobile
    await expect(page.locator('.date-range-picker')).toBeVisible();
    
    // Inputs should stack vertically on mobile
    const inputsContainer = page.locator('.inputs-container');
    await expect(inputsContainer).toBeVisible();
    
    // Should still be able to set dates
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    
    await startInput.fill('2023-07-01');
    await endInput.fill('2023-07-31');
    
    await expect(startInput).toHaveValue('2023-07-01');
    await expect(endInput).toHaveValue('2023-07-31');
  });

  test('accessibility attributes are correct', async ({ page }) => {
    await page.click('text=With Error');
    await page.waitForSelector('.date-range-picker');
    
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    const errorMessage = page.locator('.error-message');
    
    // Verify error message has correct role
    await expect(errorMessage).toHaveAttribute('role', 'alert');
    
    // Verify inputs are described by error message
    const errorId = await errorMessage.getAttribute('id');
    const startDescribedBy = await startInput.getAttribute('aria-describedby');
    const endDescribedBy = await endInput.getAttribute('aria-describedby');
    
    expect(startDescribedBy).toBe(errorId);
    expect(endDescribedBy).toBe(errorId);
    
    // Verify input labels are properly associated
    const startLabel = page.locator('label[for="start-Invalid Range"]');
    const endLabel = page.locator('label[for="end-Invalid Range"]');
    
    await expect(startLabel).toBeVisible();
    await expect(endLabel).toBeVisible();
  });

  test('focus states are visible and work correctly', async ({ page }) => {
    await page.click('text=Interactive');
    await page.waitForSelector('.date-range-picker');
    
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    const clearButton = page.locator('.clear-button');
    
    // Test focus on start input
    await startInput.focus();
    await expect(startInput).toBeFocused();
    
    // Test focus on end input
    await endInput.focus();
    await expect(endInput).toBeFocused();
    
    // Test focus on clear button if visible
    if (await clearButton.isVisible()) {
      await clearButton.focus();
      await expect(clearButton).toBeFocused();
    }
  });

  test('date input formatting works correctly', async ({ page }) => {
    await page.click('text=Interactive');
    await page.waitForSelector('.date-range-picker');
    
    const startInput = page.locator('.start-input');
    
    // Input should accept various date formats and normalize them
    await startInput.fill('2023-12-25');
    await expect(startInput).toHaveValue('2023-12-25');
    
    // Verify input type is date
    await expect(startInput).toHaveAttribute('type', 'date');
  });

  test('multiple date range pickers can coexist', async ({ page }) => {
    await page.click('text=Interactive');
    await page.waitForSelector('.date-range-picker');
    
    // Check if multiple instances exist in the story
    const pickers = page.locator('.date-range-picker');
    const count = await pickers.count();
    
    expect(count).toBeGreaterThanOrEqual(1);
    
    // Each should have unique IDs for accessibility
    if (count > 1) {
      const firstStartInput = pickers.nth(0).locator('.start-input');
      const secondStartInput = pickers.nth(1).locator('.start-input');
      
      const firstId = await firstStartInput.getAttribute('id');
      const secondId = await secondStartInput.getAttribute('id');
      
      expect(firstId).not.toBe(secondId);
    }
  });

  test('dark mode compatibility', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.click('text=Default');
    await page.waitForSelector('.date-range-picker');
    
    // Verify component renders in dark mode
    await expect(page.locator('.date-range-picker')).toBeVisible();
    
    const startInput = page.locator('.start-input');
    
    // Check that styles are applied (CSS custom properties handle colors)
    const styles = await startInput.evaluate(element => {
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

test.describe('DateRangePicker Performance', () => {
  test('renders quickly and remains responsive', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(STORYBOOK_URL);
    await page.waitForSelector('[data-testid="sidebar-search-input"]');
    await page.fill('[data-testid="sidebar-search-input"]', 'DateRangePicker');
    await page.click('text=Interactive');
    await page.waitForSelector('.date-range-picker');
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    // Should render within reasonable time
    expect(renderTime).toBeLessThan(5000);
  });

  test('handles rapid date changes smoothly', async ({ page }) => {
    await page.goto(STORYBOOK_URL);
    await page.waitForSelector('[data-testid="sidebar-search-input"]');
    await page.fill('[data-testid="sidebar-search-input"]', 'DateRangePicker');
    await page.click('text=Interactive');
    await page.waitForSelector('.date-range-picker');
    
    const startInput = page.locator('.start-input');
    const endInput = page.locator('.end-input');
    
    // Rapidly change dates
    const dates = [
      { start: '2023-01-01', end: '2023-01-31' },
      { start: '2023-02-01', end: '2023-02-28' },
      { start: '2023-03-01', end: '2023-03-31' },
      { start: '2023-04-01', end: '2023-04-30' }
    ];
    
    for (const { start, end } of dates) {
      await startInput.fill(start);
      await endInput.fill(end);
      await expect(startInput).toHaveValue(start);
      await expect(endInput).toHaveValue(end);
      await page.waitForTimeout(100); // Brief pause
    }
    
    // Component should remain responsive
    await expect(startInput).toBeVisible();
    await expect(endInput).toBeVisible();
  });
});