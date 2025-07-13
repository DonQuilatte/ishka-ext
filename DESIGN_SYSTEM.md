# Ishka Extension Design System

> **Related Documentation**: [README](./README.md) | [Features & Architecture](./docs/PRD_Features.md) | [Testing Strategy](./docs/PRD_Testing.md) | [Claude Guidelines](./CLAUDE.md) | [Docs Index](./docs/README.md)

## Overview

The Ishka Extension uses a systematic approach to design that ensures consistency, maintainability, and accessibility across all components. All visual elements must use the design tokens defined in `theme.css`.

This document is the **source of truth** for all design tokens and visual mappings used throughout the extension.

## Core Principles

### 1. Token-Based Design
- **NEVER** use raw CSS values for colors, spacing, or typography
- **ALWAYS** use `--ishka-*` custom properties
- Enforce this with stylelint rules

### 2. Shadow DOM Isolation
- All styles must work within shadow DOM boundaries
- Use `.ishka-root` class for base styling isolation
- Prevent host page CSS interference

### 3. Accessibility First
- Maintain WCAG 2.1 AA compliance
- Use semantic HTML elements
- Ensure proper contrast ratios (defined in tokens)

### 4. Performance Conscious
- Minimize CSS bundle size
- Use efficient selectors
- Leverage browser optimization

## Design Tokens

### Color System

```css
/* Status Colors - Use these for diagnostic results */
--ishka-status-pass: var(--ishka-success-500);     /* #22c55e */
--ishka-status-fail: var(--ishka-error-500);       /* #ef4444 */
--ishka-status-warning: var(--ishka-warning-500);  /* #f59e0b */

/* Background Colors */
--ishka-status-pass-bg: var(--ishka-success-50);
--ishka-status-fail-bg: var(--ishka-error-50);
--ishka-status-warning-bg: var(--ishka-warning-50);
```

### Typography Scale

```css
/* Font Sizes */
--ishka-font-size-xs: 0.75rem;    /* Labels, captions */
--ishka-font-size-sm: 0.875rem;   /* Body text, buttons */
--ishka-font-size-base: 1rem;     /* Default body */
--ishka-font-size-lg: 1.125rem;   /* Subheadings */
--ishka-font-size-xl: 1.25rem;    /* Headings */
--ishka-font-size-2xl: 1.5rem;    /* Page titles */

/* Font Weights */
--ishka-font-weight-normal: 400;
--ishka-font-weight-medium: 500;   /* Buttons, labels */
--ishka-font-weight-semibold: 600; /* Tab titles */
--ishka-font-weight-bold: 700;     /* Headings */
```

### Spacing System

```css
/* Based on 4px grid */
--ishka-space-1: 0.25rem;  /* 4px - tight spacing */
--ishka-space-2: 0.5rem;   /* 8px - compact spacing */
--ishka-space-3: 0.75rem;  /* 12px - comfortable spacing */
--ishka-space-4: 1rem;     /* 16px - standard spacing */
--ishka-space-6: 1.5rem;   /* 24px - loose spacing */
--ishka-space-8: 2rem;     /* 32px - section spacing */
```

## Component Patterns

### Component: SearchHistoryPanel
- **Location**: `/src/components/common/SearchHistoryPanel.svelte`
- **Tokens Used**: 
  - Typography: `--ishka-font-size-*`, `--ishka-font-weight-*`, `--ishka-line-height-*`
  - Colors: `--ishka-status-*`, `--ishka-surface-*`, `--ishka-text-*`, `--ishka-border-*`
  - Spacing: `--ishka-space-*` for consistent padding/margins
  - Radius: `--ishka-radius-*` for border-radius values
  - Shadows: `--ishka-shadow-*` for depth and elevation
  - Transitions: `--ishka-transition-*` for smooth animations
- **Typography Classes**: 
  - `.section-title` → `--ishka-font-size-lg` + `--ishka-font-weight-semibold`
  - `.timeline-title` → `--ishka-font-size-base` + `--ishka-font-weight-medium`
  - `.token-value` → `--ishka-font-family-mono` + `--ishka-font-weight-bold`
- **Interactions**: 
  - Expand/collapse transitions using `--ishka-transition-base`
  - Hover states with `--ishka-transition-fast`
  - Focus rings respecting `--ishka-border-focus`
  - Keyboard navigation support built-in
- **Responsive**: Grid layouts using CSS Grid with `--ishka-space-*` gaps
- **Dark Mode**: Automatic support via CSS custom properties

### Diagnostic Items

```css
.diagnostic-item {
  background-color: var(--ishka-surface);
  border: 1px solid var(--ishka-border);
  border-radius: var(--ishka-radius-md);
  padding: var(--ishka-space-4);
  margin-bottom: var(--ishka-space-4);
}

.diagnostic-item.pass {
  border-left: 4px solid var(--ishka-status-pass);
  background-color: var(--ishka-status-pass-bg);
}

.diagnostic-item.fail {
  border-left: 4px solid var(--ishka-status-fail);
  background-color: var(--ishka-status-fail-bg);
}
```

### Status Indicators

```css
.status-indicator {
  width: var(--ishka-status-indicator-size);
  height: var(--ishka-status-indicator-size);
  border-radius: var(--ishka-radius-full);
  display: inline-block;
}

.status-indicator.pass {
  background-color: var(--ishka-status-pass);
}

.status-indicator.fail {
  background-color: var(--ishka-status-fail);
}
```

### Buttons

```css
.button-primary {
  background-color: var(--ishka-primary-500);
  color: white;
  border: none;
  border-radius: var(--ishka-radius-base);
  padding: var(--ishka-space-2) var(--ishka-space-4);
  font-size: var(--ishka-font-size-sm);
  font-weight: var(--ishka-font-weight-medium);
  transition: background-color var(--ishka-transition-fast);
}

.button-primary:hover {
  background-color: var(--ishka-primary-600);
}
```

### Tabs

```css
.tab-navigation {
  display: flex;
  border-bottom: 2px solid var(--ishka-border);
  margin-bottom: var(--ishka-space-6);
  gap: var(--ishka-space-2);
}

.tab {
  height: var(--ishka-tab-height);
  padding: var(--ishka-space-3) var(--ishka-space-4);
  border: none;
  background: none;
  color: var(--ishka-text-secondary);
  font-weight: var(--ishka-font-weight-medium);
  border-bottom: 3px solid transparent;
  transition: all var(--ishka-transition-base);
}

.tab.active {
  color: var(--ishka-text-primary);
  border-bottom-color: var(--ishka-primary-500);
}
```

## Layout Guidelines

### Dashboard Container

```css
.diagnostics-dashboard {
  max-width: var(--ishka-dashboard-max-width);
  margin: 0 auto;
  padding: var(--ishka-space-5);
  font-family: var(--ishka-font-family);
}
```

### Grid System

Use CSS Grid for complex layouts:

```css
.diagnostic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--ishka-space-4);
}
```

## Animation Guidelines

### Transitions

```css
/* Use predefined transition speeds */
transition: all var(--ishka-transition-fast);   /* 150ms - hover states */
transition: all var(--ishka-transition-base);   /* 200ms - standard interactions */
transition: all var(--ishka-transition-slow);   /* 300ms - complex state changes */
```

### Loading States

```css
.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--ishka-border);
  border-top-color: var(--ishka-primary-500);
  border-radius: var(--ishka-radius-full);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## Dark Mode Support

The design system includes automatic dark mode support via `prefers-color-scheme`. All components using design tokens will automatically adapt.

## Validation Rules

### Stylelint Configuration

```json
{
  "extends": ["stylelint-config-standard"],
  "plugins": ["stylelint-declaration-strict-value"],
  "rules": {
    "scale-unlimited/declaration-strict-value": [
      ["/color/", "z-index", "font-size", "margin", "padding"],
      {
        "ignoreValues": ["inherit", "transparent", "currentColor", "none", "0"]
      }
    ]
  }
}
```

## Implementation Checklist

- [ ] Import `theme.css` in main component
- [ ] Wrap content in `.ishka-root` class
- [ ] Use only `--ishka-*` tokens for styling
- [ ] Test in both light and dark modes
- [ ] Validate with stylelint
- [ ] Ensure shadow DOM isolation works
- [ ] Test accessibility with screen readers

## Examples

### Correct Usage ✅

```css
.my-component {
  background-color: var(--ishka-surface);
  color: var(--ishka-text-primary);
  padding: var(--ishka-space-4);
  border-radius: var(--ishka-radius-md);
}
```

### Incorrect Usage ❌

```css
.my-component {
  background-color: #ffffff;  /* Use --ishka-surface */
  color: #111827;            /* Use --ishka-text-primary */
  padding: 16px;             /* Use --ishka-space-4 */
  border-radius: 8px;        /* Use --ishka-radius-md */
}
```

## Audit Metadata

| Source  | Element          | Notes                      | Date       |
| ------- | ---------------- | -------------------------- | ---------- |
| ChatGPT | Main Text        | Computed via DevTools      | 2025-07-11 |
| ChatGPT | Modal Background | Light/dark themes verified | 2025-07-11 |
| System  | Design Tokens    | Comprehensive system v2.0  | 2025-07-12 |

## Contribution Process

1. Use browser DevTools to audit target UI element.
2. Define new `--ishka-*` variable in `theme.css`.
3. Add entry to this file with light/dark values and description.
4. Reference this variable in Svelte components.
5. Update this file via PR with design approval.

## Resources

- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Shadow DOM Styling](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Stylelint Rules](https://stylelint.io/user-guide/rules/list)

---

## Component Tokens & Design Rules

### FilterDropdown
- **Tokens:**
  - `--ishka-filter-bg`: Background color
  - `--ishka-filter-border`: Border color
  - `--ishka-filter-radius`: Border radius
  - `--ishka-filter-padding`: Padding
  - `--ishka-filter-font`: Font family
  - `--ishka-filter-shadow`: Box shadow
- **Typography:**
  - Font: var(--ishka-filter-font, var(--ishka-font-sans))
  - Size: 1rem (16px)
  - Weight: 500
- **Spacing:**
  - Padding: var(--ishka-filter-padding, 0.5rem 1rem)
  - Margin-bottom: 0.5rem
- **Utility Classes:**
  - `.ishka-filter-dropdown` (applies all tokens)
  - `.ishka-filter-active` (highlighted state)

### DateRangePicker
- **Tokens:**
  - `--ishka-date-bg`: Background color
  - `--ishka-date-border`: Border color
  - `--ishka-date-radius`: Border radius
  - `--ishka-date-padding`: Padding
  - `--ishka-date-font`: Font family
  - `--ishka-date-highlight`: Selected range color
- **Typography:**
  - Font: var(--ishka-date-font, var(--ishka-font-sans))
  - Size: 0.95rem (15px)
  - Weight: 400 (normal), 600 (selected)
- **Spacing:**
  - Padding: var(--ishka-date-padding, 0.5rem)
  - Gap between fields: 0.75rem
- **Utility Classes:**
  - `.ishka-date-range-picker` (applies all tokens)
  - `.ishka-date-selected` (applies highlight)

---
