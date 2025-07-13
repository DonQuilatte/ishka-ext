/**
 * @fileoverview Core service interfaces for the Ishka ChatGPT Extension.
 * Defines contracts for dependency injection and service architecture.
 * 
 * @author Ishka Extension Team
 * @version 1.0.0
 */

import type { 
  DiagnosticResult, 
  DiagnosticSuite, 
  SystemHealth, 
  PerformanceMetrics, 
  ErrorContext, 
  ChatGPTSession, 
  ExtensionConfig,
  ExportData,
  TestExecutionContext,
  DiagnosticCategory
} from './types.js';

/**
 * Service interface for running system diagnostics and health checks.
 * Provides both one-time and scheduled diagnostic capabilities for monitoring
 * extension performance and ChatGPT integration status.
 */
export interface IDiagnosticRunner {
  /**
   * Run diagnostics for specified categories or all available tests.
   * @param categories - Optional array of diagnostic categories to run
   * @returns Promise resolving to system health summary
   */
  runDiagnostics(categories?: DiagnosticCategory[]): Promise<SystemHealth>;
  
  /**
   * Execute a single diagnostic test by its identifier.
   * @param testId - Unique identifier for the test to run
   * @returns Promise resolving to the test result
   */
  runSingleTest(testId: string): Promise<DiagnosticResult>;
  
  /**
   * Get all available diagnostic test suites and their metadata.
   * @returns Array of available diagnostic suites
   */
  getAvailableTests(): DiagnosticSuite[];
  
  /**
   * Schedule periodic diagnostic runs at specified intervals.
   * @param intervalMs - Interval in milliseconds between diagnostic runs
   */
  schedulePeriodicDiagnostics(intervalMs: number): void;
  
  /**
   * Stop any active periodic diagnostic scheduling.
   */
  stopPeriodicDiagnostics(): void;
}

/**
 * Service interface for monitoring extension performance metrics.
 * Tracks memory usage, response times, and custom performance indicators.
 */
export interface IPerformanceMonitor {
  /**
   * Start performance monitoring with configured intervals.
   */
  startMonitoring(): void;
  
  /**
   * Stop performance monitoring and cleanup resources.
   */
  stopMonitoring(): void;
  
  /**
   * Get current performance metrics snapshot.
   * @returns Promise resolving to current performance data
   */
  getCurrentMetrics(): Promise<PerformanceMetrics>;
  
  /**
   * Retrieve historical performance metrics for analysis.
   * @param timeRange - Time range identifier (e.g., "1h", "24h", "7d")
   * @returns Promise resolving to array of historical metrics
   */
  getHistoricalMetrics(timeRange: string): Promise<PerformanceMetrics[]>;
  
  /**
   * Record a custom performance metric with optional metadata.
   * @param name - Metric name identifier
   * @param value - Numeric metric value
   * @param metadata - Optional additional data for the metric
   */
  recordCustomMetric(name: string, value: number, metadata?: Record<string, any>): void;
}

/**
 * Service interface for collecting and managing error reports.
 * Provides centralized error handling with persistence and notification.
 */
export interface IErrorReporter {
  /**
   * Report an error with full context information.
   * @param error - Error context with stack trace and metadata
   */
  reportError(error: ErrorContext): void;
  
  /**
   * Get recently reported errors for debugging.
   * @param limit - Maximum number of errors to return (default: 10)
   * @returns Array of recent error contexts
   */
  getRecentErrors(limit?: number): ErrorContext[];
  
  /**
   * Clear all stored error reports from memory and storage.
   */
  clearErrors(): void;
  
  /**
   * Subscribe to error events for real-time monitoring.
   * @param callback - Function to call when new errors are reported
   * @returns Unsubscribe function to remove the listener
   */
  subscribeToErrors(callback: (error: ErrorContext) => void): () => void;
}

/**
 * Service interface for ChatGPT page integration and session management.
 * Handles conversation detection, session monitoring, and data extraction.
 */
export interface IChatGPTAdapter {
  /**
   * Detect the currently active ChatGPT session.
   * @returns Promise resolving to session data or null if no active session
   */
  detectCurrentSession(): Promise<ChatGPTSession | null>;
  
  /**
   * Get all available ChatGPT sessions from browser history.
   * @returns Promise resolving to array of all discovered sessions
   */
  getAllSessions(): Promise<ChatGPTSession[]>;
  
  /**
   * Check if the current page is a ChatGPT conversation page.
   * @returns True if on a ChatGPT page, false otherwise
   */
  isOnChatGPTPage(): boolean;
  
  /**
   * Set up observer for ChatGPT session changes and navigation.
   * @param callback - Function called when session state changes
   * @returns Unsubscribe function to remove the observer
   */
  observeSessionChanges(callback: (session: ChatGPTSession | null) => void): () => void;
  
  /**
   * Extract conversation data from the current ChatGPT page.
   * @returns Promise resolving to conversation data object
   */
  extractConversationData(): Promise<any>;
}

/**
 * Service interface for cross-platform storage management.
 * Handles both Chrome extension storage and fallback to localStorage.
 */
export interface IStorageManager {
  /**
   * Retrieve a value from storage by key.
   * @param key - Storage key identifier
   * @returns Promise resolving to stored value or null if not found
   */
  get<T>(key: string): Promise<T | null>;
  
  /**
   * Store a value with the specified key.
   * @param key - Storage key identifier
   * @param value - Value to store
   * @returns Promise that resolves when storage is complete
   */
  set<T>(key: string, value: T): Promise<void>;
  
  /**
   * Remove a value from storage by key.
   * @param key - Storage key identifier
   * @returns Promise that resolves when removal is complete
   */
  remove(key: string): Promise<void>;
  
  /**
   * Clear all stored data.
   * @returns Promise that resolves when storage is cleared
   */
  clear(): Promise<void>;
  
  /**
   * Get storage quota usage information.
   * @returns Promise resolving to object with used and available bytes
   */
  getQuotaInfo(): Promise<{ used: number; available: number }>;
  
  /**
   * Create a backup of all stored data.
   * @returns Promise resolving to exportable data structure
   */
  backup(): Promise<ExportData>;
  
  /**
   * Restore data from a backup.
   * @param data - Previously exported data to restore
   * @returns Promise that resolves when restore is complete
   */
  restore(data: ExportData): Promise<void>;
}

/**
 * Service interface for extension configuration management.
 * Handles user preferences and extension settings persistence.
 */
export interface IConfigurationManager {
  /**
   * Get current extension configuration.
   * @returns Promise resolving to complete configuration object
   */
  getConfig(): Promise<ExtensionConfig>;
  
  /**
   * Update specific configuration properties.
   * @param updates - Partial configuration object with updates
   * @returns Promise that resolves when configuration is updated
   */
  updateConfig(updates: Partial<ExtensionConfig>): Promise<void>;
  
  /**
   * Reset configuration to default values.
   * @returns Promise that resolves when reset is complete
   */
  resetToDefaults(): Promise<void>;
  
  /**
   * Subscribe to configuration changes.
   * @param callback - Function called when configuration changes
   * @returns Unsubscribe function to remove the listener
   */
  subscribeToChanges(callback: (config: ExtensionConfig) => void): () => void;
}

/**
 * Service interface for event-driven communication between components.
 * Provides publish-subscribe pattern with type safety and error handling.
 */
export interface IEventBus {
  /**
   * Emit an event with optional data payload.
   * @param event - Event name identifier
   * @param data - Optional data to pass to event handlers
   */
  emit<T>(event: string, data?: T): void;
  
  /**
   * Subscribe to an event with a handler function.
   * @param event - Event name to listen for
   * @param handler - Function to call when event is emitted
   * @returns Unsubscribe function to remove the listener
   */
  on<T>(event: string, handler: (data: T) => void): () => void;
  
  /**
   * Subscribe to an event that will only fire once.
   * @param event - Event name to listen for
   * @param handler - Function to call when event is emitted
   * @returns Unsubscribe function to remove the listener
   */
  once<T>(event: string, handler: (data: T) => void): () => void;
  
  /**
   * Remove event listener(s) for a specific event.
   * @param event - Event name to unsubscribe from
   * @param handler - Optional specific handler to remove
   */
  off(event: string, handler?: Function): void;
  
  /**
   * Remove all listeners for an event or all events.
   * @param event - Optional event name to clear (clears all if omitted)
   */
  removeAllListeners(event?: string): void;
}

export interface ITestRunner {
  executeTest(testId: string, context: TestExecutionContext): Promise<DiagnosticResult>;
  executeTestSuite(suiteId: string, context: TestExecutionContext): Promise<DiagnosticResult[]>;
  getTestRegistry(): Map<string, () => Promise<DiagnosticResult>>;
  registerTest(id: string, test: () => Promise<DiagnosticResult>): void;
  unregisterTest(id: string): void;
}

export interface IDataExporter {
  exportDiagnostics(format?: 'json' | 'csv'): Promise<string>;
  exportToFile(data: ExportData, filename?: string): Promise<void>;
  copyToClipboard(data: ExportData): Promise<void>;
  generateSupportBundle(): Promise<ExportData>;
}

export interface IUIController {
  showDashboard(): void;
  hideDashboard(): void;
  toggleDashboard(): void;
  updateHealthIndicator(health: SystemHealth): void;
  showNotification(message: string, type: 'info' | 'warning' | 'error'): void;
  isVisible(): boolean;
}

export interface IWorkerManager {
  isServiceWorkerActive(): Promise<boolean>;
  getBackgroundScriptStatus(): Promise<'active' | 'inactive' | 'error'>;
  sendMessage<T, R>(message: T): Promise<R>;
  subscribeToMessages<T>(callback: (message: T) => void): () => void;
  restartWorkers(): Promise<void>;
}