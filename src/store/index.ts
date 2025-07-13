// Main store exports for the Ishka Extension
// Centralized store management with typed exports

export { diagnosticStore, overallHealthStatus, categoryResults, activeTabResults, testsSummary, isConfigured, shouldAutoRun, diagnosticsInterval } from './diagnostic-store.js';

export { uiStore, currentTheme, hasNotifications, errorNotifications, hasErrors } from './ui-store.js';

export { sessionStore, isOnChatGPT, hasActiveSession, sessionCount, isConnected, activeSessions, recentSessions } from './session-store.js';

export { 
  dashboardStore, 
  tabStatusStore, 
  activeTab, 
  isCollapsed, 
  shouldAutoRefresh, 
  refreshInterval, 
  overallStatus, 
  tabBadges 
} from './dashboard-store.js';

// Re-export types for convenience
export type { 
  SystemHealth, 
  DiagnosticResult, 
  DiagnosticCategory, 
  PerformanceMetrics,
  ExtensionConfig,
  ChatGPTSession,
  ErrorContext,
  ExportData
} from '../utils/types.js';

// Store initialization helper
export async function initializeStores() {
  try {
    await Promise.all([
      diagnosticStore.initialize(),
      sessionStore.initialize()
    ]);
    
    // Dashboard store doesn't need async initialization
    dashboardStore.reset();
    tabStatusStore.reset();
    
    if (import.meta.env.DEV) {
      console.log('[Stores] All stores initialized successfully');
    }
  } catch (error) {
    console.error('[Stores] Failed to initialize stores:', error);
    throw error;
  }
}

// Store cleanup helper
export function cleanupStores() {
  diagnosticStore.reset();
  uiStore.reset();
  sessionStore.reset();
  dashboardStore.reset();
  tabStatusStore.reset();
  
  if (import.meta.env.DEV) {
    console.log('[Stores] All stores reset');
  }
}