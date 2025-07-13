# Contributing to Ishka Extension

## Getting Started

Thank you for your interest in contributing to Ishka! This guide will help you set up your development environment and understand our contribution workflow.

### Prerequisites

- **Node.js v24.5.0** (use `nvm use` to switch automatically)
- **pnpm v10.8.0+** (package manager)
- **Chrome browser** with Developer Mode enabled
- **Git** for version control

### Quick Setup

```bash
# Clone and setup
git clone <repository-url>
cd ishka-ext
nvm use                    # Switch to Node v24.5.0
pnpm install              # Install dependencies
pnpm build                # Build extension
# Load dist/ folder in chrome://extensions/
```

---

## Development Workflow

### Branch Strategy

- **`master`**: Production-ready code, protected branch
- **`develop`**: Integration branch for new features
- **`feature/*`**: Individual feature branches
- **`hotfix/*`**: Critical bug fixes

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test thoroughly**:
   ```bash
   pnpm build              # Build must succeed
   pnpm test              # Unit tests must pass
   pnpm test:e2e          # E2E tests must pass
   npx stylelint 'src/**/*.svelte' --fix  # Style compliance
   ```

4. **Commit with conventional commits**:
   ```bash
   git add .
   git commit -m "feat: add new telemetry export feature"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   # Create PR via GitHub UI
   ```

---

## Coding Standards

### TypeScript

- **Strict mode enabled**: No `any` types without explicit reasoning
- **Explicit return types** for public functions
- **Import organization**: External libraries first, then internal modules
- **File extensions**: Use `.js` for imports in TypeScript files

```typescript
// ✅ Good
import { chrome } from 'chrome';
import { StorageManager } from '../utils/storage-manager.js';

export function processData(input: string): Promise<ProcessedData> {
  // implementation
}

// ❌ Bad  
import { StorageManager } from '../utils/storage-manager'; // Missing .js
export function processData(input: any) { // No types
  // implementation
}
```

### Svelte Components

- **Single responsibility**: Each component has one clear purpose
- **Props validation**: Use TypeScript interfaces for prop types
- **Store usage**: Access stores reactively with `$` syntax
- **Event handling**: Use descriptive event names

```svelte
<!-- ✅ Good -->
<script lang="ts">
  import type { DiagnosticResult } from '../utils/types.js';
  import { diagnosticStore } from '../store/diagnostic-store.js';
  
  export let result: DiagnosticResult;
  
  $: isHealthy = $diagnosticStore.status === 'pass';
</script>

<!-- ❌ Bad -->
<script>
  export let result; // No type
  let store = diagnosticStore; // Not reactive
</script>
```

### CSS & Design System

**CRITICAL**: All styling must use `--ishka-*` CSS custom properties. Raw values are not allowed.

```css
/* ✅ Correct */
.component {
  color: var(--ishka-text-primary);
  padding: var(--ishka-space-4);
  border-radius: var(--ishka-radius-md);
  transition: all var(--ishka-transition-fast);
}

/* ❌ Incorrect */
.component {
  color: #333;
  padding: 16px;
  border-radius: 8px;
  transition: all 0.2s;
}
```

**Design Token Categories**:
- `--ishka-color-*`: Colors and transparency
- `--ishka-space-*`: Spacing and sizing
- `--ishka-radius-*`: Border radius
- `--ishka-shadow-*`: Box shadows
- `--ishka-transition-*`: Animation timing
- `--ishka-font-*`: Typography
- `--ishka-status-*`: Status indicators

### Chrome Extension Architecture

- **Background script**: Handle extension lifecycle, tab management
- **Content scripts**: Minimal footprint, Shadow DOM isolation
- **Popup**: Lightweight UI, quick access to features
- **Messaging**: Use Chrome runtime messaging API consistently

```typescript
// ✅ Background script pattern
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'get_diagnostics':
      getDiagnostics().then(sendResponse);
      return true; // Keep channel open
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// ✅ Content script pattern  
chrome.runtime.sendMessage({ 
  type: 'session_detected', 
  payload: sessionData 
});
```

---

## Testing Requirements

### Unit Tests (Vitest)

- **Coverage**: All utilities and core logic must have unit tests
- **Test structure**: Arrange, Act, Assert pattern
- **Mocking**: Mock Chrome APIs and external dependencies

```typescript
// tests/unit/storage-manager.test.ts
import { describe, it, expect, vi } from 'vitest';
import { StorageManager } from '../src/utils/storage-manager.js';

describe('StorageManager', () => {
  it('should store and retrieve data correctly', async () => {
    // Arrange
    const manager = new StorageManager();
    const testData = { key: 'value' };
    
    // Act
    await manager.set('test-key', testData);
    const result = await manager.get('test-key');
    
    // Assert
    expect(result).toEqual(testData);
  });
});
```

### Integration Tests

- **Cross-component**: Test component interactions
- **Store integration**: Verify state management works correctly
- **Message passing**: Test background/content/popup communication

### End-to-End Tests (Playwright)

- **User workflows**: Test complete user journeys
- **Chrome extension**: Test in real browser extension environment
- **ChatGPT integration**: Verify functionality on actual ChatGPT pages

```typescript
// tests/e2e/popup.spec.ts
import { test, expect } from '@playwright/test';

test('popup displays telemetry data correctly', async ({ page }) => {
  await page.goto('chrome-extension://[id]/popup/index.html');
  
  const statusIndicator = page.locator('[data-testid="status-indicator"]');
  await expect(statusIndicator).toBeVisible();
  
  const telemetryPanel = page.locator('[data-testid="telemetry-panel"]');
  await expect(telemetryPanel).toContainText('Test Results');
});
```

### Visual Testing (Storybook)

- **Component states**: Cover all visual states and variants
- **Responsive design**: Test different viewport sizes
- **Dark/light modes**: Verify theme compatibility

---

## Pull Request Guidelines

### PR Requirements

**Before submitting a PR**:
- [ ] All tests pass (`pnpm test` and `pnpm test:e2e`)
- [ ] Build succeeds without warnings (`pnpm build`)  
- [ ] Code follows style guidelines (Stylelint passes)
- [ ] New components have Storybook stories
- [ ] Documentation updated if needed
- [ ] Self-review completed

### PR Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated  
- [ ] Manual testing completed
- [ ] Storybook stories added for new components

## UI/UX Compliance
- [ ] Uses only `--ishka-*` design tokens
- [ ] Responsive design verified
- [ ] Dark/light mode compatible
- [ ] Accessibility standards met

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes without version bump
```

### Review Process

1. **Automated checks**: CI pipeline must pass
2. **Code review**: At least one maintainer approval required
3. **Manual testing**: Reviewer tests functionality manually
4. **Design review**: UI changes require design approval
5. **Merge**: Squash and merge to maintain clean history

---

## Component Development

### Creating New Components

1. **Design first**: Create Figma mockups if needed
2. **Define interface**: Create TypeScript interfaces for props
3. **Implement component**: Use design tokens exclusively
4. **Add stories**: Create Storybook stories for all states
5. **Write tests**: Unit tests for logic, E2E for integration
6. **Documentation**: Add component to CLAUDE.md

### Component Structure

```
src/ui/components/YourComponent.svelte
├── YourComponent.svelte          # Main component
├── YourComponent.stories.svelte  # Storybook stories
└── YourComponent.test.ts         # Unit tests (if needed)
```

### Storybook Stories Template

```svelte
<!-- YourComponent.stories.svelte -->
<script>
  import { Meta, Template, Story } from '@storybook/addon-svelte-csf';
  import YourComponent from './YourComponent.svelte';
</script>

<Meta 
  title="UI/YourComponent" 
  component={YourComponent}
  argTypes={{
    variant: { 
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger']
    }
  }}
/>

<Template let:args>
  <YourComponent {...args} />
</Template>

<Story name="Default" args={{ variant: 'primary' }} />
<Story name="Secondary" args={{ variant: 'secondary' }} />
<Story name="Danger" args={{ variant: 'danger' }} />
<Story name="Loading" args={{ variant: 'primary', loading: true }} />
```

---

## Build & Deployment

### Build Process

The extension uses **CRXJS v2** for Chrome extension building:

```bash
# Development build
pnpm build

# Watch mode (for development)
pnpm dev

# Production build (same as build, but explicit)
NODE_ENV=production pnpm build
```

### Build Artifacts

```
dist/                    # Chrome extension ready to load
├── manifest.json       # Generated extension manifest
├── src/popup/          # Popup HTML and assets
├── assets/            # Bundled JavaScript and CSS
└── public/           # Static assets (icons, etc.)
```

### CI/CD Pipeline

Our GitHub Actions pipeline:

1. **Code Quality**: Lint, format, type check
2. **Testing**: Unit tests, integration tests, E2E tests
3. **Build**: Extension build and artifact verification
4. **Release**: Automatic release package creation (master branch)

### Release Process

1. **Version bump**: Update version in `manifest.config.js`
2. **Changelog**: Update CHANGELOG.md with new features/fixes
3. **Tag release**: Create git tag with version number
4. **Build package**: CI creates Chrome Web Store zip
5. **Manual upload**: Upload to Chrome Web Store dashboard

---

## Troubleshooting

### Common Development Issues

**Build fails with module errors**:
```bash
# Solution: Check Node version and reinstall
node -v                  # Should be v24.5.0
nvm use
rm -rf node_modules
pnpm install
```

**Extension won't load in Chrome**:
```bash
# Solution: Check manifest and rebuild
pnpm build
# Check dist/manifest.json is valid JSON
# Check chrome://extensions/ for specific error messages
```

**Stylelint errors about design tokens**:
```bash
# Solution: Replace raw CSS values with tokens
# Change: color: #333;
# To: color: var(--ishka-text-primary);
npx stylelint 'src/**/*.svelte' --fix
```

**Tests fail in CI but pass locally**:
```bash
# Solution: Check browser dependencies
npx playwright install chromium
# Ensure consistent Node version between local and CI
```

### Getting Help

- **Technical issues**: Check existing GitHub issues
- **Chrome extension APIs**: [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- **Svelte questions**: [Svelte Documentation](https://svelte.dev/docs)
- **CRXJS issues**: [CRXJS Documentation](https://crxjs.dev/vite-plugin/)

### Migration Context

This project was successfully migrated using the **Phoenix Protocol** to resolve `effect_orphan` errors. See `docs/migration.md` for complete details. The current LTS stack is battle-tested and should not be modified without extreme caution.

**Critical**: Never update major dependency versions without following the Phoenix Protocol for validation.

---

## Code of Conduct

### Our Standards

- **Be respectful**: Treat everyone with respect and professionalism
- **Be collaborative**: Work together to build the best possible extension
- **Be inclusive**: Welcome contributors from all backgrounds
- **Be helpful**: Support other contributors and users

### Unacceptable Behavior

- Personal attacks or harassment
- Discriminatory language or behavior  
- Publishing private information without permission
- Any conduct that would be inappropriate in a professional setting

### Reporting Issues

If you experience or witness unacceptable behavior, please contact the project maintainers directly.

---

## Recognition

Contributors who make significant improvements will be:
- Added to the project README
- Mentioned in release notes
- Invited to join the core contributor team

Thank you for helping make Ishka better for everyone! 🚀

---

*Last updated: v1.0.0-migrated - Post-Phoenix Protocol migration*