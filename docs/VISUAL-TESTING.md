# Visual Testing Guide

This document outlines the visual testing strategy for the Ishka Chrome extension, replacing the deprecated Storybook setup with a more suitable approach for Chrome extension development.

## 🎯 Overview

Our visual testing approach consists of two main components:

1. **Component Playground** - Interactive development environment for components
2. **Playwright Visual Tests** - Automated screenshot comparison and regression testing

## 🛠️ Component Playground

### Purpose
The Component Playground provides a live development environment for testing UI components in isolation without the complexity of Storybook or Chrome extension context switching.

### Usage

```bash
# Start the playground development server
pnpm dev:playground

# Opens browser at http://localhost:3003
```

### Features
- **Live component testing** with HMR (Hot Module Replacement)
- **Interactive controls** for component props and state
- **Real-time feedback** during development
- **Native Svelte 5 support** without compatibility issues

### Structure
```
src/dev/
├── Playground.svelte         # Main playground component
├── playground.html          # HTML entry point
└── playground.js           # JavaScript entry point

vite.playground.config.js    # Playground-specific Vite config
```

### Adding Components
To add a new component to the playground:

1. Import the component in `Playground.svelte`
2. Add a new button to the selector
3. Add the component rendering logic
4. Include mock controls as needed

## 🎭 Playwright Visual Testing

### Purpose
Automated visual regression testing ensures UI consistency across changes, with screenshots compared automatically in CI/CD.

### Running Visual Tests

```bash
# Run all visual tests
pnpm test:visual

# Run specific visual test suites
npx playwright test tests/e2e/visual/component-playground.spec.ts
npx playwright test tests/e2e/visual/extension-ui.spec.ts

# Update visual baselines (when changes are intentional)
npx playwright test tests/e2e/visual/ --update-snapshots
```

### Test Structure

#### Component Playground Tests (`component-playground.spec.ts`)
- Tests components in the playground environment
- Captures different component states and configurations
- Validates responsive design across viewports

#### Extension UI Tests (`extension-ui.spec.ts`)
- Tests actual extension popup interface
- Captures real Chrome extension context
- Tests dark mode and error states

### Visual Test Organization

```
tests/e2e/visual/
├── component-playground.spec.ts    # Playground component tests
├── extension-ui.spec.ts           # Real extension UI tests
└── screenshots/                   # Generated screenshots
    ├── component-playground/
    └── extension-ui/
```

## 📸 Screenshot Management

### Naming Convention
Screenshots follow this pattern:
- `{component-name}-{state}.png` - For component tests
- `{interface-type}-{context}.png` - For UI tests

Examples:
- `status-indicator-default.png`
- `popup-interface-dark-mode.png`
- `playground-mobile.png`

### Updating Screenshots
When UI changes are intentional:

```bash
# Update all visual baselines
npx playwright test tests/e2e/visual/ --update-snapshots

# Update specific test baselines
npx playwright test tests/e2e/visual/component-playground.spec.ts --update-snapshots
```

### CI/CD Integration
Visual tests run automatically in the CI pipeline:
- **Pull Requests**: Compare screenshots against baseline
- **Failures**: Upload diff images as artifacts
- **Main Branch**: Update baselines for approved changes

## 🚫 Deprecated: Storybook

### Why Deprecated
- **No Svelte 5 Support**: Official Storybook doesn't support Svelte 5
- **Complexity**: Unnecessary overhead for Chrome extension development
- **CI/CD Friction**: Compatibility warnings and build instability
- **Context Mismatch**: iframe-based rendering doesn't match extension context

### Migration Path
1. ✅ **Removed** Storybook dependencies from package.json
2. ✅ **Created** Component Playground for interactive development
3. ✅ **Added** Playwright visual tests for regression testing
4. ❌ **No longer use** `.storybook/` configuration

## 🔧 Development Workflow

### For Component Development
1. **Start playground**: `pnpm dev:playground`
2. **Develop component** with live feedback
3. **Test different states** using playground controls
4. **Run visual tests** to capture baselines

### For UI Changes
1. **Make changes** to components or styles
2. **Verify in playground** that changes look correct
3. **Run visual tests** to check for regressions
4. **Update screenshots** if changes are intentional
5. **Commit changes** with updated visual baselines

### For Code Reviews
1. **Review visual diffs** in CI artifacts
2. **Validate intentional changes** match expectations
3. **Check mobile/responsive** screenshots
4. **Verify dark mode compatibility**

## 📋 Best Practices

### Component Testing
- Test components in multiple states (loading, error, success)
- Include edge cases (empty data, long text, etc.)
- Test responsive behavior across viewports
- Validate accessibility in visual tests

### Screenshot Quality
- Use consistent viewport sizes for comparison
- Wait for animations/transitions to complete
- Mask dynamic content (timestamps, IDs) when needed
- Include sufficient context in screenshots

### Maintenance
- Review and update visual tests with component changes
- Remove outdated screenshots for deleted components
- Keep test descriptions clear and specific
- Document expected visual behavior in tests

## 🆘 Troubleshooting

### Common Issues

**Flaky visual tests**
- Ensure animations complete before screenshots
- Use `waitForLoadState('networkidle')` for stability
- Add explicit waits for dynamic content

**Screenshot differences**
- Check font rendering differences across environments
- Verify consistent browser/OS in CI
- Use `threshold` option for minor differences

**Playground not loading**
- Check console for JavaScript errors
- Verify all component imports are correct
- Ensure dev server is running on correct port

### Getting Help
- Check CI artifacts for visual diff images
- Review Playwright documentation for visual testing
- Test locally with `--debug` flag for investigation

---

*Last updated: Phase 2 Migration - Storybook Deprecation*