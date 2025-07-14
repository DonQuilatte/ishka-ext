# CLAUDE.md

## Project: Ishka – ChatGPT Extension Enhancer

### Project Overview

Ishka is a Chrome browser extension that enhances the ChatGPT user experience through **local-first productivity tools** including tags, templates, notes, and data export. It follows a **stability-first philosophy** that prioritizes graceful degradation and user trust over aggressive feature implementation.

**Status**: Production-ready foundation with user-centered feature roadmap ✅  
**Strategic Focus**: Local organization, workflow enhancement, and data portability

### Tech Stack (LTS - Validated)

* **Framework**: Svelte 5.28.1
* **Language**: TypeScript + HTML/CSS
* **Bundler**: Vite 6.2.0
* **Extension**: CRXJS v2.0.0
* **Node**: v24.5.0 (per .nvmrc)
* **Package Manager**: pnpm 10.8.0
* **Database**: Chrome Storage API + IndexedDB
* **Styling**: CSS variables with `--ix-*` tokens (mirrored from ChatGPT computed styles)
* **Testing**: Vitest (unit), Playwright (e2e), Storybook (visual)

### Migration History

**Previous Issue**: Persistent `effect_orphan` error caused by dependency drift
**Root Cause**: Vite 7.x + Svelte-Vite plugin 6.x incompatibility with CRXJS v2
**Solution**: Phoenix Protocol - rebuilt from stable CRXJS + Svelte demo template
**Result**: Zero regressions, bulletproof foundation established

See `ARCHITECTURE.md` for complete RCA and `docs/migration.md` for detailed timeline.

### Project Structure

```
/src
  /background          # Service worker (Chrome extension lifecycle)
  /content            # Content scripts (ChatGPT page injection)
  /popup              # Extension popup UI
  /ui                 # Main UI components and panels
  /components         # Shared Svelte components
  /store              # Svelte stores for state management
  /utils              # Core services & infrastructure
  theme.css           # Ishka design system tokens
/docs                 # Technical documentation
  migration.md        # Phoenix Protocol execution details
  PRD_Features.md     # Feature requirements & specifications
  PRD_Testing.md      # Testing strategy & methodologies
  PRD_Scaffolding.md  # Project setup & structure
/tests
  /e2e               # Playwright end-to-end tests
  /integration       # Cross-component integration tests
  /unit              # Vitest unit tests
ARCHITECTURE.md       # Complete RCA and LTS stack documentation
DESIGN_SYSTEM.md      # Complete design token system
README.md             # Project overview & getting started
SETUP.md              # Production setup instructions
```

### Essential Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm build            # Build extension for Chrome
pnpm dev              # Watch mode development

# Testing
pnpm test             # Run unit tests (Vitest)
pnpm test:e2e         # Run end-to-end tests (Playwright)
pnpm storybook        # Visual component testing

# Quality
npx stylelint 'src/**/*.svelte' --fix  # Lint with design system enforcement

# Extension Development
# Load dist/ folder in chrome://extensions/ with Developer mode enabled
```

### Memory Management

The extension includes automated memory cleanup to prevent leaks:

* **Periodic Cleanup**: Runs every 30 minutes (configurable)
* **Stale Tab Cleanup**: Removes tracking for closed tabs
* **Session Pruning**: Keeps only 100 recent sessions, max 30 days old
* **Telemetry Reset**: Prevents counter overflow
* **Event Bus Cleanup**: Removes orphaned listeners

### Architecture Principles

**Chrome Extension Structure**:
- `background/background.ts`: Service worker managing extension lifecycle
- `content/index.ts`: Injects into ChatGPT pages, mounts ContentApp.svelte
- `popup/`: Extension popup with StatusIndicator and TelemetryPanel
- All scripts communicate via `chrome.runtime.sendMessage`

**Svelte Integration**:
- Shadow DOM isolation for content script injection
- Svelte stores for cross-component state management
- Component-based architecture with clear separation of concerns

### Code Style & Standards

* All visual styles must use CSS variables prefixed with `--ishka-*`
* No inline style values or raw color codes allowed
* Consistent spacing, border radius, and transitions via design tokens
* Shared components only – no per-page unique styles
* TypeScript strict mode enabled
* ESM modules throughout

### Testing Requirements

* **Unit coverage**: All utilities and Svelte logic (Vitest)
* **Integration tests**: Component interactions and message passing
* **E2E validation**: Real browser automation (Playwright)
* **Visual testing**: Component states and responsive behavior (Storybook)
* **Regression prevention**: Build must pass before any commit
* **Chrome extension testing**: Background script, content injection, popup

### Development Workflow

**Setup**:
1. `nvm use` (ensures Node v24.5.0)
2. `pnpm install`
3. `pnpm build`
4. Load `dist/` in Chrome extensions developer mode

**Development Loop**:
1. Make changes to `src/`
2. `pnpm build` (validates build)
3. Reload extension in Chrome
4. Test functionality
5. Run tests if modifying core logic

**Quality Gates**:
- Build must succeed without warnings
- Stylelint must pass (enforces `--ishka-*` tokens)
- New components require Storybook stories
- E2E tests for user-facing features

### Git Workflow

* **PRs must pass visual/native feel review**
* **PRs auto-checked with Stylelint** for `--ishka-*` compliance
* **PR checklist includes**: `UI/UX Compliance`, `Token Audit`, `Storybook added`
* **No commits to main without passing CI**

### Maintenance Guidelines

**Dependency Updates**:
- ⚠️ **CRITICAL**: Never update major versions without full regression testing
- Test on isolated branch first
- Validate against official CRXJS + Svelte demos
- Document any compatibility issues in ARCHITECTURE.md

**Performance Monitoring**:
- Background script includes comprehensive telemetry
- Monitor memory usage via periodic cleanup logs
- Track build sizes and bundle analysis

**Security**:
- All external communications go through background script
- Content scripts isolated via Shadow DOM
- No direct manipulation of ChatGPT's global scope

### Claude AI Assistant Guidelines

### Claude May

* Generate `--ishka-*` tokens from screenshots or audits
* Propose compliant styles in new components
* Refactor inline styles into design tokens
* Generate Storybook stories for new components
* Suggest improvements to component architecture
* Help debug Chrome extension messaging
* Analyze telemetry data and suggest optimizations
* Create comprehensive test coverage
* Document new features and architectural decisions

### Claude Must Not

* Reference ChatGPT's live CSS classes or variables
* Suggest raw CSS values like `#333`, `16px`, etc.
* Mix icon libraries or styling paradigms
* Modify the LTS dependency stack without explicit approval
* Break Shadow DOM isolation patterns
* Suggest changes that could reintroduce `effect_orphan` errors

### Component Library

### Core Components

**StatusIndicator.svelte** (`src/ui/components/`)
- Purpose: Visual status display with configurable states
- States: `pass`, `fail`, `warning`, `unknown`
- Features: Size variants, text labels, pulse animation
- Usage: Health monitoring, diagnostic results, system status

**TelemetryPanel.svelte** (`src/ui/`)
- Purpose: Test result upload and telemetry management
- Features: File upload, JSON parsing, development mode toggle
- Integration: Connects to telemetry-store, TestStatusPanel
- Usage: Development and debugging workflows

**SearchHistoryPanel.svelte** (`src/components/common/`)
- Purpose: Advanced diagnostics history viewer and search tool
- Features: Real-time search, filterable timeline, token tracking, export
- Styling: Full `--ix-*` token compliance with dark/light mode
- Integration: `diagnosticStore`, `filtersStore`, `EventBus`
- Testing: 8 Storybook variants covering all interaction modes

### Background Services

**IshkaBackgroundScript** (`src/background/background.ts`)
- Service worker managing extension lifecycle
- Tab tracking for ChatGPT pages
- Automated diagnostics and telemetry collection
- Memory cleanup and performance monitoring
- Message routing between popup and content scripts

**Content Script** (`src/content/index.ts`)
- Injected into `chat.openai.com` pages
- Mounts Shadow DOM and Svelte app (`ContentApp.svelte`)
- Initializes `ChatGPTAdapter` for conversation detection
- Observes DOM mutations and URL changes
- Communicates with background script via messaging API

### State Management

**Store Architecture** (`src/store/`)
- `telemetry-store.ts`: Test results, diagnostics, performance metrics
- `diagnostic-store.ts`: Health checks, system status, error tracking
- `session-store.ts`: ChatGPT session data, conversation tracking
- `ui-store.ts`: Component visibility, user preferences
- `filters-store.ts`: Search filters, display options

### Utilities

**Core Services** (`src/utils/`)
- `storage-manager.ts`: Chrome Storage API abstraction
- `error-reporter.ts`: Structured error collection and reporting
- `diagnostic-runner.ts`: Automated health checks and validation
- `data-exporter.ts`: Export functionality (JSON, CSV)
- `event-bus.ts`: Internal messaging and component communication
- `logger.ts`: Structured logging with levels and categories

---

## 🛡️ Design Principles & Development Guardrails

This project follows **non-negotiable architectural and ethical guidelines** to ensure long-term maintainability, stability, and user trust:

### Core Design Principles

1. **Stability Over Aggression**: Prioritize features that degrade gracefully and never depend on brittle internal DOM structures or undocumented APIs
2. **Local-First Philosophy**: All data stored and processed locally unless a public, documented API becomes available
3. **Chameleon Integration**: Mirror host UI through computed style mirroring and semantic selectors — never via visual guesswork
4. **Predictable UX**: Never surprise users. All injected UI must look, feel, and behave like native ChatGPT functionality
5. **Zero Trust, Zero Breakage**: Defensive code patterns, runtime guards, and fallback UI ensure extension never silently fails
6. **Graceful Degradation**: Failed features remain visible but disabled with clear explanation tooltips

### Mandatory Development Guardrails

**🚫 FORBIDDEN**:
- Direct GraphQL query injection or mutation
- Scraping of internal APIs or private DOM state
- Hardcoded selectors anywhere in code
- Raw CSS values or color codes
- Ad hoc `chrome.storage` calls

**✅ REQUIRED**:
- All selectors must come from `src/content/dom/selectors.ts`
- All style tokens retrieved at runtime from computed styles using `--ix-*` namespace
- Every DOM injection must fail gracefully with fallback logic
- All features must run in Safe Mode without crashing
- Visual regression tests for all UI changes

### Critical Infrastructure Requirements

**Every new feature MUST document**:
- UI anchor strategy and fallback plan
- DOM injection approach with Safe Mode behavior
- Storage mapping using `storage-manager.ts`
- Reversion plan if DOM selectors change

**Safety Requirements**:
- Opt-in consent for any local tracking features (clipboard history, usage stats)
- Performance isolation from ChatGPT (zero impact on native responsiveness)
- Memory usage monitoring and cleanup procedures

---

## 🎯 Feature Implementation Standards

### Selector Management (CRITICAL)
All DOM selectors must be centralized in `src/content/dom/selectors.ts`:

```typescript
// REQUIRED STRUCTURE
export const selectors = {
  injection: {
    promptTextareaContainer: '[data-testid="prompt-textarea"]',
    conversationContainer: 'main[role="main"]'
  },
  fallback: {
    promptArea: 'textarea, [contenteditable]',
    messageArea: 'main, #main, .conversation'
  }
};
```

### Storage Operations (CRITICAL)
All data persistence must use `src/utils/storage/storage-manager.ts`:

```typescript
// NEVER do this:
chrome.storage.local.set({tags: userTags});

// ALWAYS do this:
await storageManager.saveTags(conversationId, userTags);
```

### CSS Standards (CRITICAL)
All styles must use mirrored CSS variables:

```css
/* REQUIRED: Use --ix-* tokens only */
.ishka-feature {
  background: var(--ix-color-bg-primary);
  color: var(--ix-color-text-primary);
  font-family: var(--ix-font-family);
}

/* FORBIDDEN: Raw values */
.bad-example {
  background: #ffffff;
  color: #333333;
}
```

### Safe Mode Integration (CRITICAL)
All features must handle Safe Mode activation:

```typescript
// Required pattern for all UI features
if (safeModeActive) {
  showDisabledFeatureWithTooltip('Feature temporarily disabled due to ChatGPT update');
  return;
}
```

---

## 🔒 Out of Scope (DO NOT IMPLEMENT)

These features are **permanently prohibited** due to stability and policy risks:

**Very High Risk (Account Safety)**:
- Bulk conversation operations (delete, move, archive)
- Chat renaming, moving, or deletion
- Folder/project manipulation

**High Risk (API Dependency)**:
- Full conversation search via API interception
- Integrated web search
- Live token management tools

**Medium Risk (DOM Fragility)**:
- Inline threading or branching
- Core conversation UI modification

See `docs/OUT_OF_SCOPE.md` for complete rationale and alternatives.

### Documentation References

#### Primary Development Docs
* **[README.md](./README.md)** - Project overview, setup, and getting started
* **[SETUP.md](./SETUP.md)** - Production setup and deployment instructions
* **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete RCA, LTS stack, and migration history
* **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** - Design token system and component patterns
* **[docs/migration.md](./docs/migration.md)** - Phoenix Protocol execution details

#### Feature Documentation
* **[docs/PRD_Features.md](./docs/PRD_Features.md)** - Detailed feature specifications
* **[docs/PRD_Testing.md](./docs/PRD_Testing.md)** - Testing strategy and implementation
* **[docs/PRD_Scaffolding.md](./docs/PRD_Scaffolding.md)** - Project structure and conventions

#### Architecture Reference
* **[src/utils/types.ts](./src/utils/types.ts)** - TypeScript interfaces and type definitions
* **[src/utils/interfaces.ts](./src/utils/interfaces.ts)** - Service contracts and APIs

---

## Development Environment

### Prerequisites

- Node.js v24.5.0 (use `nvm use`)
- pnpm v10.8.0+
- Chrome browser with Developer Mode enabled

### Quick Start

```bash
# Clone and setup
git clone <repository>
cd ishka-ext
nvm use                 # Switch to Node v24.5.0
pnpm install           # Install dependencies
pnpm build             # Build extension

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" 
# 4. Select the dist/ folder
```

### Troubleshooting

**Build Issues**:
- Ensure Node v24.5.0 is active (`node -v`)
- Clear node_modules and reinstall if needed
- Check that all imports use `.js` extensions for TypeScript files

**Extension Issues**:
- Check service worker console for background script errors
- Verify content script injection on ChatGPT pages
- Reload extension after any code changes

**Test Failures**:
- Run `pnpm test` for unit tests
- Use `pnpm test:e2e` for full browser testing
- Check Playwright setup if E2E tests fail

---

*Ishka Extension v1.0.0-migrated | Production-ready foundation | Phoenix Protocol validated*