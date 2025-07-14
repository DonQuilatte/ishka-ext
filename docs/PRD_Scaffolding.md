# Ishka Extension: Product Requirements Document - Scaffolding & Architecture

**Document Version**: 2.0 (Stability-First Revision)  
**Last Updated**: July 14, 2025  
**Focus**: Project structure, coding standards, and architectural patterns for stability-first development

---

## 🏗️ Architectural Overview

The Ishka Extension follows a **stability-first architecture** that prioritizes graceful degradation, local-first data management, and resilient DOM interaction patterns. This scaffolding document defines the structure and standards that enable reliable ChatGPT enhancement.

### Core Architectural Principles

1. **Selector Abstraction**: All DOM interaction through centralized selector management
2. **Safe Injection**: DOM modifications that never break ChatGPT functionality  
3. **Local-First Storage**: All user data stored locally with privacy by design
4. **Graceful Degradation**: Features fail safely with clear user feedback
5. **Performance Isolation**: Zero impact on ChatGPT's native performance

---

## 📁 Project Structure

### Current Structure (Aligned with Stability Requirements)

```
src/
├── background/                 # Service worker & extension lifecycle
│   ├── background.ts          # Main service worker
│   ├── messaging-hub.ts       # Centralized message routing
│   └── telemetry-collector.ts # Performance & error tracking
│
├── content/                   # ChatGPT page integration
│   ├── index.ts              # Content script entry point
│   ├── ContentApp.svelte     # Main Svelte app container
│   ├── dom/                  # DOM interaction layer
│   │   ├── selectors.ts      # 🔴 CRITICAL: All selectors here
│   │   ├── injection-manager.ts # Safe DOM injection patterns
│   │   ├── observer-manager.ts  # DOM change monitoring
│   │   └── safe-mode.ts      # Fallback behavior system
│   └── views/                # Content script UI components
│       └── App.svelte
│
├── popup/                     # Extension popup interface
│   ├── App.svelte
│   ├── index.html
│   └── main.js
│
├── ui/                        # Main UI components
│   ├── components/           # Feature-specific components
│   │   ├── TagManager.svelte
│   │   ├── TemplateBuilder.svelte
│   │   ├── SettingsPanel.svelte
│   │   ├── OnboardingFlow.svelte
│   │   └── FloatingActionPanel.svelte
│   └── common/               # Shared UI components
│       ├── StatusIndicator.svelte
│       ├── SearchHistoryPanel.svelte
│       └── inputs/
│
├── store/                     # Svelte stores for state management
│   ├── index.ts              # Store exports
│   ├── features/             # Feature-specific stores
│   │   ├── tags-store.ts
│   │   ├── templates-store.ts
│   │   ├── notes-store.ts
│   │   └── settings-store.ts
│   ├── ui-store.ts           # UI state management
│   └── telemetry-store.ts    # Analytics & performance
│
├── utils/                     # Core services & infrastructure
│   ├── storage/              # Data persistence layer
│   │   ├── storage-manager.ts # 🔴 CRITICAL: All storage here
│   │   ├── migration-manager.ts # Schema versioning
│   │   └── backup-manager.ts # Data export/import
│   ├── dom/                  # DOM utilities
│   │   ├── selector-health.ts # Selector monitoring
│   │   ├── style-mirror.ts   # CSS variable mirroring
│   │   └── performance-guard.ts # Performance monitoring
│   ├── features/             # Feature implementations
│   │   ├── token-counter.ts  # Local tokenization
│   │   ├── voice-input.ts    # Speech recognition
│   │   ├── export-manager.ts # Data export
│   │   └── template-engine.ts # Template processing
│   ├── logger.ts             # Structured logging
│   ├── error-reporter.ts     # Error handling
│   └── types.ts              # TypeScript definitions
│
└── assets/                    # Static assets
    ├── icons/
    ├── styles/
    │   ├── variables.css     # CSS custom properties
    │   └── components.css    # Component styles
    └── manifest.json
```

### Required New Structure (For Stability-First Features)

```
🆕 NEW ADDITIONS REQUIRED:

src/
├── content/dom/
│   ├── selectors.ts          # 🔴 Must centralize ALL selectors
│   ├── safe-mode.ts          # 🔴 Graceful degradation system
│   └── style-mirror.ts       # 🔴 CSS variable mirroring
│
├── utils/storage/
│   ├── storage-manager.ts    # 🔴 Unified storage interface
│   └── migration-manager.ts  # 🔴 Schema version management
│
├── utils/features/
│   ├── token-counter.ts      # Local tokenization
│   ├── template-engine.ts    # Template processing
│   └── voice-input.ts        # Speech recognition
│
└── store/features/
    ├── tags-store.ts         # Tag management
    ├── templates-store.ts    # Template storage
    └── settings-store.ts     # User preferences
```

---

## 🔴 Critical Infrastructure Requirements

### 1. Centralized Selector Management (`src/content/dom/selectors.ts`)

**Purpose**: Single source of truth for all DOM selectors to enable rapid updates when ChatGPT changes.

```typescript
// selectors.ts - REQUIRED STRUCTURE
export const selectors = {
  // Injection anchors (stable, high-level)
  injection: {
    promptTextareaContainer: '[data-testid="prompt-textarea"]',
    conversationContainer: 'main[role="main"]',
    messageContainer: '[data-message-id]',
    sidebarContainer: 'nav[aria-label="Chat history"]'
  },
  
  // Content elements (for reading/observing)
  content: {
    messageText: '[data-message-author-role] .markdown',
    userMessage: '[data-message-author-role="user"]',
    assistantMessage: '[data-message-author-role="assistant"]',
    conversationTitle: 'h1, [role="heading"]'
  },
  
  // Fallback selectors (if primary fails)
  fallback: {
    promptArea: 'textarea, [contenteditable]',
    messageArea: 'main, #main, .conversation',
    sidebar: 'nav, aside, .sidebar'
  }
};

// Selector health monitoring
export async function validateSelectors(): Promise<SelectorHealth> {
  // Implementation required
}
```

### 2. Unified Storage Manager (`src/utils/storage/storage-manager.ts`)

**Purpose**: All data operations go through this interface to ensure consistency, migration support, and privacy compliance.

```typescript
// storage-manager.ts - REQUIRED INTERFACE
export interface StorageManager {
  // Tags & Notes
  saveTags(conversationId: string, tags: string[]): Promise<void>;
  loadTags(conversationId: string): Promise<string[]>;
  saveNote(messageId: string, note: string): Promise<void>;
  
  // Templates & Snippets
  saveTemplate(template: Template): Promise<void>;
  loadTemplates(): Promise<Template[]>;
  
  // Settings & Preferences
  saveSetting<T>(key: string, value: T): Promise<void>;
  loadSetting<T>(key: string): Promise<T | null>;
  
  // Data management
  exportAllData(): Promise<ExportData>;
  importData(data: ExportData): Promise<void>;
  clearAllData(): Promise<void>;
}
```

### 3. Safe Mode System (`src/content/dom/safe-mode.ts`)

**Purpose**: Graceful degradation when ChatGPT updates break selectors.

```typescript
// safe-mode.ts - REQUIRED IMPLEMENTATION
export interface SafeModeManager {
  // Detection
  detectChatGPTVersion(): Promise<string>;
  validateCriticalSelectors(): Promise<boolean>;
  
  // Activation
  activateSafeMode(reason: string): void;
  deactivateSafeMode(): void;
  
  // User communication
  showDegradationNotice(features: string[]): void;
  hideAllFeatures(): void;
}
```

---

## 🔧 Development Standards

### Code Organization Standards

**File Naming**:
- `kebab-case.ts` for utilities and services
- `PascalCase.svelte` for components
- `camelCase-store.ts` for Svelte stores
- `UPPER_CASE.md` for documentation

**Import Organization**:
```typescript
// 1. External dependencies
import { writable } from 'svelte/store';

// 2. Internal utilities (absolute paths)
import { storageManager } from '@/utils/storage/storage-manager';
import { selectors } from '@/content/dom/selectors';

// 3. Types
import type { Tag, Template } from '@/utils/types';
```

**Component Structure**:
```svelte
<!-- ComponentName.svelte -->
<script lang="ts">
  // 1. Imports
  // 2. Props
  // 3. State
  // 4. Reactive statements
  // 5. Functions
  // 6. Lifecycle
</script>

<!-- 7. Template -->
<div class="component-root">
  <!-- Content -->
</div>

<!-- 8. Styles -->
<style>
  .component-root {
    /* Use --ix-* variables only */
  }
</style>
```

### CSS Standards

**CSS Custom Properties** (Required):
```css
/* Use --ix-* namespace for all custom properties */
:root {
  /* Mirrored from ChatGPT computed styles */
  --ix-color-bg-primary: var(--computed-bg-primary);
  --ix-color-text-primary: var(--computed-text-primary);
  --ix-font-family-mono: var(--computed-font-mono);
  
  /* Ishka-specific */
  --ix-ishka-brand: #2563eb;
  --ix-spacing-xs: 0.25rem;
  --ix-border-radius: 0.375rem;
}
```

**Style Isolation**:
```css
/* All Ishka styles must be scoped */
.ishka-container {
  /* Styles here */
}

/* Use CSS containment for performance */
.ishka-feature {
  contain: layout style;
}
```

### TypeScript Standards

**Type Definitions** (`src/utils/types.ts`):
```typescript
// Feature types
export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  variables: TemplateVariable[];
  category?: string;
}

export interface Note {
  id: string;
  messageId: string;
  content: string;
  createdAt: Date;
}

// Configuration types
export interface ExtensionSettings {
  theme: 'auto' | 'light' | 'dark';
  enableVoiceInput: boolean;
  enableTokenCounter: boolean;
  privacySettings: PrivacySettings;
}

// Safety types
export interface SelectorHealth {
  critical: { [key: string]: boolean };
  optional: { [key: string]: boolean };
  lastChecked: Date;
}
```

**Error Handling**:
```typescript
// Use Result pattern for operations that can fail
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Example usage
export async function saveTag(conversationId: string, tag: Tag): Promise<Result<void>> {
  try {
    await storageManager.saveTags(conversationId, [tag]);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

---

## 🛡️ Safety Patterns

### DOM Interaction Safety

**Required Pattern**:
```typescript
// Always use try-catch for DOM operations
export async function injectFeatureUI(feature: string): Promise<boolean> {
  try {
    const anchor = document.querySelector(selectors.injection.promptTextareaContainer);
    if (!anchor) {
      await activateSafeMode(`Missing anchor for ${feature}`);
      return false;
    }
    
    // Safe injection logic
    const element = createFeatureElement(feature);
    anchor.appendChild(element);
    
    return true;
  } catch (error) {
    logger.error(`Failed to inject ${feature}`, error);
    return false;
  }
}
```

**Selector Validation**:
```typescript
// Always validate selectors before use
export function validateSelector(selector: string): boolean {
  try {
    document.querySelector(selector);
    return true;
  } catch {
    return false;
  }
}
```

### Storage Safety

**Data Validation**:
```typescript
// Always validate data before storage
export function validateTag(tag: unknown): tag is Tag {
  return (
    typeof tag === 'object' &&
    tag !== null &&
    'id' in tag &&
    'name' in tag &&
    typeof tag.id === 'string' &&
    typeof tag.name === 'string'
  );
}
```

**Migration Safety**:
```typescript
// Handle storage schema changes gracefully
export async function migrateStorageV1ToV2(): Promise<void> {
  const oldData = await chrome.storage.local.get('ishka_tags_v1');
  if (oldData.ishka_tags_v1) {
    // Transform data
    const newData = transformTagsV1ToV2(oldData.ishka_tags_v1);
    await chrome.storage.local.set({ 'ishka_tags_v2': newData });
    await chrome.storage.local.remove('ishka_tags_v1');
  }
}
```

---

## 🚀 Implementation Guidelines

### Feature Development Workflow

1. **Plan Phase**:
   - Define UI anchor in `selectors.ts`
   - Design storage schema
   - Plan fallback behavior
   - Document Safe Mode impact

2. **Implementation Phase**:
   - Create feature component
   - Implement storage operations via `storage-manager.ts`
   - Add error handling and logging
   - Test selector health monitoring

3. **Testing Phase**:
   - Unit tests for core logic
   - Integration tests for DOM interaction
   - E2E tests for user workflows
   - Performance impact validation

4. **Deployment Phase**:
   - Visual regression testing
   - Gradual rollout
   - Monitor error rates
   - Validate user feedback

### Performance Requirements

**Load Time**:
- Extension initialization < 200ms
- Feature UI injection < 100ms
- Settings panel open < 50ms

**Memory Usage**:
- Maximum 50MB total extension memory
- DOM observers must be efficient
- Clean up event listeners properly

**DOM Impact**:
- No modification of ChatGPT's existing DOM
- Only additive changes (appendChild, insertBefore)
- Use Shadow DOM for complex UI

### Security Requirements

**Content Security Policy**:
- No inline scripts
- No external resource loading
- All assets bundled with extension

**Privacy by Design**:
- All data stored locally
- No telemetry without consent
- Clear data deletion procedures

**Permission Minimization**:
- Only request necessary Chrome permissions
- Document all permission usage
- Graceful degradation for denied permissions

---

## 📝 Required Documentation

Each feature must include:

1. **Architecture Decision Record (ADR)**
   - Why this approach was chosen
   - Alternative approaches considered
   - Trade-offs and implications

2. **Implementation Guide**
   - Step-by-step setup instructions
   - Configuration options
   - Troubleshooting common issues

3. **Testing Documentation**
   - Test cases and scenarios
   - Performance benchmarks
   - Regression test procedures

4. **User Documentation**
   - Feature overview and benefits
   - Usage instructions
   - FAQ and troubleshooting

---

*This scaffolding document ensures that all Ishka Extension development follows stability-first principles while maintaining high code quality and user experience standards.*