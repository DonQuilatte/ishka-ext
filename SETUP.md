# Ishka Extension - Production Setup Guide

## Quick Start (5 minutes)

### Prerequisites

- **Node.js v24.5.0** (enforced via `.nvmrc`)
- **pnpm v10.8.0+** (package manager)
- **Chrome browser** with Developer Mode enabled

### Installation

```bash
# 1. Clone repository
git clone <your-repository-url>
cd ishka-ext

# 2. Use correct Node version
nvm use                    # Switches to v24.5.0

# 3. Install dependencies
pnpm install              # Uses validated lockfile

# 4. Build extension
pnpm build                # Creates dist/ folder

# 5. Load in Chrome
# Open chrome://extensions/
# Enable "Developer mode" (top-right toggle)
# Click "Load unpacked"
# Select the dist/ folder
```

### Verify Installation

1. **Extension Icon**: Should appear in Chrome toolbar
2. **Popup Test**: Click icon → should show StatusIndicator components
3. **ChatGPT Test**: Visit `chat.openai.com` → check console for `[CRXJS] Hello world from content script!`
4. **Service Worker**: In `chrome://extensions/` → click "service worker" → should see `[Ishka] Background script initialized successfully`

---

## Development Workflow

### Daily Development

```bash
# Start development session
nvm use                   # Ensure correct Node version
pnpm build               # Build extension
# Reload extension in Chrome (chrome://extensions/)

# Make code changes in src/
# Run build again
pnpm build
# Reload extension to test changes
```

### Testing

```bash
# Unit tests
pnpm test                # Vitest unit tests

# End-to-end tests  
pnpm test:e2e           # Playwright browser automation

# Visual component tests
pnpm storybook          # Component library

# Style compliance
npx stylelint 'src/**/*.svelte' --fix
```

---

## Architecture Overview

### Chrome Extension Structure

```
dist/                    # Built extension (load this in Chrome)
├── manifest.json       # Extension configuration
├── src/popup/          # Extension popup UI
├── background/         # Service worker
├── content/           # Scripts injected into ChatGPT
└── assets/           # Bundled JS/CSS

src/                    # Source code
├── background/        # Service worker TypeScript
├── content/          # Content script + Svelte app
├── popup/           # Popup HTML + Svelte
├── ui/             # Main UI components
├── components/     # Shared Svelte components  
├── store/         # State management
└── utils/        # Core utilities
```

### Key Files

| File | Purpose |
|------|---------|
| `src/background/background.ts` | Chrome extension service worker |
| `src/content/index.ts` | Injects into ChatGPT pages |
| `src/popup/App.svelte` | Extension popup interface |
| `src/ui/TelemetryPanel.svelte` | Main diagnostics UI |
| `src/store/telemetry-store.ts` | Test data management |
| `src/utils/storage-manager.ts` | Chrome Storage API wrapper |

---

## Technology Stack (LTS Validated)

### Core Dependencies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | v24.5.0 | Runtime environment |
| **pnpm** | 10.8.0+ | Package management |
| **Vite** | 6.2.0 | Build tool and bundler |
| **Svelte** | 5.28.1 | UI framework |
| **TypeScript** | Latest | Type safety |
| **CRXJS** | v2.0.0 | Chrome extension plugin |

### Development Tools

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit testing |
| **Playwright** | End-to-end testing |
| **Storybook** | Component development |
| **Stylelint** | CSS/design token enforcement |

---

## Configuration

### Environment Setup

The project uses these configuration files:

- **`.nvmrc`**: Locks Node version to v24.5.0
- **`package.json`**: Dependencies and scripts
- **`pnpm-lock.yaml`**: Exact dependency versions
- **`vite.config.js`**: Build configuration with CRXJS
- **`tsconfig.json`**: TypeScript settings
- **`playwright.config.ts`**: E2E test configuration

### Build Configuration

The extension uses **CRXJS v2** which automatically:
- Processes `manifest.config.js` → `manifest.json`
- Bundles TypeScript/Svelte files
- Handles Chrome extension APIs
- Generates proper script injection

### Design System

All styling uses CSS custom properties with `--ishka-*` prefix:

```css
/* ✅ Correct */
.component {
  color: var(--ishka-text-primary);
  padding: var(--ishka-space-4);
  border-radius: var(--ishka-radius-md);
}

/* ❌ Incorrect */
.component {
  color: #333;
  padding: 16px;
  border-radius: 8px;
}
```

---

## Production Deployment

### Building for Release

```bash
# Ensure clean state
pnpm install              # Fresh dependencies
pnpm build               # Production build

# Verify build
ls -la dist/             # Should contain manifest.json, assets/, etc.
```

### Chrome Web Store Preparation

1. **Update Manifest**:
   ```javascript
   // manifest.config.js
   export default {
     manifest_version: 3,
     name: "Ishka - ChatGPT Extension Enhancer",
     version: "1.0.0",
     // ... rest of configuration
   }
   ```

2. **Create Release Package**:
   ```bash
   pnpm build              # Creates dist/
   cd dist/
   zip -r ../ishka-extension-v1.0.0.zip .
   ```

3. **Upload to Chrome Web Store**:
   - Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Upload `ishka-extension-v1.0.0.zip`
   - Fill in store listing details

---

## Troubleshooting

### Common Issues

**❌ Build Fails**
```bash
# Solution: Check Node version
node -v                  # Should be v24.5.0
nvm use                  # Switch to correct version
pnpm install            # Reinstall if needed
```

**❌ Extension Won't Load**
```bash
# Solution: Rebuild and check console
pnpm build
# Check chrome://extensions/ for error messages
# Check dist/manifest.json is valid JSON
```

**❌ Content Script Not Injecting**
```bash
# Solution: Check permissions and matches
# Verify manifest.json has correct content_scripts.matches
# Check ChatGPT page console for error messages
```

**❌ effect_orphan Errors Return**
```bash
# This should NOT happen with the migrated stack
# If it does, check:
# 1. Node version (must be v24.5.0)
# 2. Dependencies match package.json exactly
# 3. No manual dependency updates made
```

### Debug Mode

Enable extended logging:

```javascript
// In popup console or content script console
localStorage.setItem('ishka-debug', 'true');
// Reload extension
```

### Performance Monitoring

Check background script telemetry:

```javascript
// In service worker console (chrome://extensions/)
// Background script logs comprehensive metrics
// Look for memory cleanup logs every 30 minutes
```

---

## Development Best Practices

### Code Standards

- **TypeScript**: Use strict mode, explicit types
- **Svelte**: Component-based architecture, reactive stores
- **CSS**: Only `--ishka-*` tokens, no raw values
- **Testing**: Unit tests for utilities, E2E for user flows
- **Git**: Conventional commits, PR reviews required

### Performance

- **Memory Management**: Background script auto-cleanup every 30min
- **Bundle Size**: Monitor via build output, optimize imports
- **Extension Performance**: Minimize content script footprint

### Security

- **Permissions**: Request minimal necessary permissions
- **Content Security**: All external requests through background script
- **Data Handling**: Use Chrome Storage API, not localStorage

---

## Migration History

This project was successfully migrated using the **Phoenix Protocol**:

**Previous Issue**: `effect_orphan` errors in Svelte popup
**Root Cause**: Vite 7 + Svelte-Vite plugin v6 incompatibility with CRXJS v2
**Solution**: Rebuild from stable CRXJS + Svelte demo template
**Result**: Zero regressions, production-ready foundation

See `ARCHITECTURE.md` for complete root cause analysis and `docs/migration.md` for detailed timeline.

---

## Support & Maintenance

### Getting Help

- **Build Issues**: Check this SETUP.md first
- **Chrome Extension APIs**: Refer to [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- **Svelte Questions**: Check [Svelte Documentation](https://svelte.dev/docs)
- **CRXJS Issues**: See [CRXJS Documentation](https://crxjs.dev/vite-plugin/)

### Updating Dependencies

⚠️ **CRITICAL**: Never update major versions without full testing

```bash
# Safe updates (patch versions only)
pnpm update

# Major version updates (high risk)
# 1. Create isolated branch
# 2. Update one dependency at a time  
# 3. Test extensively against ChatGPT
# 4. Document any compatibility issues
```

### Contributing

See `CONTRIBUTING.md` for detailed contribution guidelines including:
- Code style requirements
- Testing standards  
- PR review process
- Design token compliance

---

*Last updated: Migration v1.0.0 - Production ready*