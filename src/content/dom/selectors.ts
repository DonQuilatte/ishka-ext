/**
 * Centralized Selector Management for Ishka Extension
 * 
 * CRITICAL: All DOM selectors must be defined here
 * This is the single source of truth for ChatGPT DOM interaction
 * 
 * Selector Strategy:
 * 1. Primary: Use stable, semantic selectors (data-testid, role, etc.)
 * 2. Fallback: Use structural selectors as backup
 * 3. Never: Use class names or deep nesting
 */

export interface SelectorHealth {
  critical: { [key: string]: boolean };
  optional: { [key: string]: boolean };
  lastChecked: Date;
}

/**
 * Main selector definitions organized by usage pattern
 */
export const selectors = {
  /**
   * Primary injection points for Ishka UI elements
   * These are high-level, stable anchors for adding our features
   */
  injection: {
    // Prompt input area - for voice input, token counter, template insertion
    promptTextareaContainer: '[data-testid="prompt-textarea"]',
    
    // Main conversation area - for floating action panel, tags, notes
    conversationContainer: 'main[role="main"]',
    
    // Individual messages - for per-message notes, copy enhancements
    messageContainer: '[data-message-id]',
    
    // Sidebar area - for conversation organization, export buttons
    sidebarContainer: 'nav[aria-label="Chat history"]',
    
    // Chat header - for conversation actions, export options
    chatHeader: 'header, [role="banner"]'
  },

  /**
   * Content elements for reading/observing (non-invasive)
   * Used for data extraction and context awareness
   */
  content: {
    // Message content for export, search, analysis
    messageText: '[data-message-author-role] .markdown',
    userMessage: '[data-message-author-role="user"]',
    assistantMessage: '[data-message-author-role="assistant"]',
    
    // Conversation metadata
    conversationTitle: 'h1, [role="heading"]',
    conversationId: '[data-conversation-id]',
    
    // Input elements for token counting, voice input
    promptTextarea: 'textarea[data-id="root"]',
    promptInput: '[contenteditable][data-id="root"]'
  },

  /**
   * Fallback selectors when primary selectors fail
   * Broader, more generic selectors for graceful degradation
   */
  fallback: {
    // General prompt area fallbacks
    promptArea: 'textarea, [contenteditable]',
    promptContainer: 'form, .prompt-textarea',
    
    // General message area fallbacks  
    messageArea: 'main, #main, .conversation',
    messageList: '[role="log"], .conversation-turn',
    
    // General sidebar fallbacks
    sidebar: 'nav, aside, .sidebar',
    conversationList: '[role="list"], .conversation-list',
    
    // General layout fallbacks
    mainContent: 'main, #app, .app',
    pageContainer: 'body, #root, .container'
  },

  /**
   * Template selectors for creating UI elements
   * Used to match ChatGPT's native styling patterns
   */
  templates: {
    // Button styles to match ChatGPT's design
    primaryButton: 'button[data-testid="send-button"]',
    secondaryButton: 'button[aria-label]',
    
    // Input styles to match native inputs
    textInput: 'input[type="text"]',
    textArea: 'textarea',
    
    // Panel styles to match ChatGPT's modals/panels
    modal: '[role="dialog"]',
    dropdown: '[role="menu"]',
    tooltip: '[role="tooltip"]'
  }
};

/**
 * Validate selector availability and health
 * Returns health status for monitoring and Safe Mode decisions
 */
export async function validateSelectors(): Promise<SelectorHealth> {
  const health: SelectorHealth = {
    critical: {},
    optional: {},
    lastChecked: new Date()
  };

  // Test critical selectors (required for core functionality)
  const criticalSelectors = [
    'injection.promptTextareaContainer',
    'injection.conversationContainer',
    'content.messageText'
  ];

  for (const selectorPath of criticalSelectors) {
    const selector = getNestedSelector(selectors, selectorPath);
    if (selector) {
      health.critical[selectorPath] = document.querySelector(selector) !== null;
    }
  }

  // Test optional selectors (nice-to-have but not critical)
  const optionalSelectors = [
    'injection.sidebarContainer',
    'injection.chatHeader',
    'content.conversationTitle'
  ];

  for (const selectorPath of optionalSelectors) {
    const selector = getNestedSelector(selectors, selectorPath);
    if (selector) {
      health.optional[selectorPath] = document.querySelector(selector) !== null;
    }
  }

  return health;
}

/**
 * Get a selector with automatic fallback support
 * Tries primary selector first, then fallback if available
 */
export function getSelector(
  primaryPath: string, 
  fallbackPath?: string
): string | null {
  const primary = getNestedSelector(selectors, primaryPath);
  if (primary && document.querySelector(primary)) {
    return primary;
  }

  if (fallbackPath) {
    const fallback = getNestedSelector(selectors, fallbackPath);
    if (fallback && document.querySelector(fallback)) {
      return fallback;
    }
  }

  return null;
}

/**
 * Safely query an element with fallback support
 * Returns null if neither primary nor fallback selectors work
 */
export function safeQuerySelector(
  primaryPath: string,
  fallbackPath?: string
): Element | null {
  const selector = getSelector(primaryPath, fallbackPath);
  return selector ? document.querySelector(selector) : null;
}

/**
 * Monitor selector health in real-time
 * Useful for detecting ChatGPT updates that break selectors
 */
export function startSelectorMonitoring(
  onHealthChange: (health: SelectorHealth) => void,
  intervalMs: number = 30000
): () => void {
  const interval = setInterval(async () => {
    const health = await validateSelectors();
    onHealthChange(health);
  }, intervalMs);

  return () => clearInterval(interval);
}

/**
 * Helper function to get nested object values by string path
 * e.g., getNestedSelector(selectors, 'injection.promptTextareaContainer')
 */
function getNestedSelector(obj: any, path: string): string | null {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current[part] === undefined) {
      return null;
    }
    current = current[part];
  }
  
  return typeof current === 'string' ? current : null;
}

/**
 * Export individual selector groups for convenience
 */
export const injectionSelectors = selectors.injection;
export const contentSelectors = selectors.content;
export const fallbackSelectors = selectors.fallback;
export const templateSelectors = selectors.templates;