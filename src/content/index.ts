/**
 * @fileoverview Ishka Extension Content Script - Main entry point for ChatGPT integration.
 * Handles initialization, DOM injection, and coordination of extension features.
 * 
 * @author Ishka Extension Team
 * @version 1.0.0
 */

// ChatGPTAdapter is dynamically imported below to avoid bundling issues
import { EventBus } from '../utils/event-bus.js';
import { ErrorReporter } from '../utils/error-reporter.js';
import { createLogger, withErrorHandling, withSyncErrorHandling } from '../utils/logger.js';

/**
 * Global initialization guard to prevent multiple script executions.
 * This prevents duplicate DOM elements and conflicting event listeners
 * when the content script is injected multiple times.
 */
if ((window as any).ishkaContentScriptInitialized) {
  const logger = createLogger('ContentScript');
  logger.warn('Content script already injected. Halting execution.');
} else {
  (window as any).ishkaContentScriptInitialized = true;

  const eventBus = new EventBus();
  const errorReporter = new ErrorReporter();
  const logger = createLogger('ContentScript', errorReporter);
  let pageSpecificCleanup: (() => void) | null = null;

  logger.info('Content script bootstrapping...');

  // 1. Setup global error handling immediately
  setupGlobalErrorHandling(errorReporter);

  // 2. Initialize everything in async context
  (async () => {
    // Initialize infrastructure systems
    await initializeInfrastructure(logger);

    // 3. Check if we're on ChatGPT page and conditionally load logic
  const isChatGPTPage = window.location.hostname === 'chat.openai.com' || 
                        window.location.hostname === 'chatgpt.com';
  
  if (isChatGPTPage) {
    withErrorHandling(
      async () => {
        const module = await import('../adapters/chatgpt.ts');
        const { ChatGPTAdapter } = module;
        const adapter = new ChatGPTAdapter(eventBus);
        const cleanup = await module.init(eventBus, adapter);
        pageSpecificCleanup = cleanup;
        logger.info('ChatGPT-specific module loaded and initialized.');
        return cleanup;
      },
      logger,
      'load ChatGPT module'
    );
  } else {
    logger.info('Not on ChatGPT page. No page-specific modules loaded.');
  }

    // 4. Always add the diagnostic element for E2E tests (idempotent)
  if (!document.getElementById('ishka-diagnostic-element-present')) {
    const result = withSyncErrorHandling(
      () => {
        const diagnosticElement = document.createElement('div');
        diagnosticElement.id = 'ishka-diagnostic-element-present';
        diagnosticElement.style.display = 'none';
        document.body.appendChild(diagnosticElement);
        logger.debug('Diagnostic element created for E2E tests');
        return diagnosticElement;
      },
      logger,
      'create diagnostic element'
    );
  }
  })().catch(error => {
    logger.error('Failed to initialize content script', error);
  });

  // 5. Setup global cleanup
  window.addEventListener('beforeunload', () => {
    logger.debug('Unloading content script...');
    if (pageSpecificCleanup) {
      try {
        pageSpecificCleanup();
      } catch (error) {
        logger.error('Error during cleanup', error);
      }
    }
    // Allow re-injection on soft reloads
    (window as any).ishkaContentScriptInitialized = false; 
  });

  // --- Helper Functions ---

  /**
   * Initialize core infrastructure systems
   */
  async function initializeInfrastructure(logger: any): Promise<void> {
    try {
      // Import and initialize Safe Mode
      const { initializeSafeMode } = await import('./dom/safe-mode.js');
      await initializeSafeMode();
      
      // Initialize tag injection system on ChatGPT pages
      if (window.location.hostname === 'chat.openai.com' || window.location.hostname === 'chatgpt.com') {
        const { initializeTagInjection } = await import('./features/tag-injector.js');
        await initializeTagInjection();
        logger.info('✅ Tag injection system initialized');
      }
      
      logger.info('✅ Infrastructure initialized successfully');
    } catch (error) {
      logger.error('❌ Infrastructure initialization failed', error);
    }
  }

  /**
   * Set up global error handling for unhandled errors and rejections.
   * Routes all errors through the ErrorReporter for centralized handling.
   */
  function setupGlobalErrorHandling(reporter: ErrorReporter): void {
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      logger.error('Unhandled JavaScript error', event.error, false); // Don't double-report
      reporter.reportError({
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        sessionId: crypto.randomUUID(),
        metadata: { context: 'global-error-handler' }
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled promise rejection', event.reason, false); // Don't double-report
      reporter.reportError({
        type: 'javascript',
        message: `Unhandled promise rejection: ${String(event.reason)}`,
        stack: event.reason instanceof Error ? event.reason.stack : undefined,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        sessionId: crypto.randomUUID(),
        metadata: { context: 'global-rejection-handler' }
      });
    });
    
    logger.debug('Global error handling configured');
  }
} // End of global initialization guard