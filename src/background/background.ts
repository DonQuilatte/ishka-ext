/**
 * @fileoverview Ishka Extension Background Script (Service Worker)
 * Handles extension lifecycle, tab management, and content script communication.
 * Provides centralized data storage, diagnostic coordination, and export functionality.
 * 
 * @author Ishka Extension Team
 * @version 1.0.0
 */

import { DiagnosticRunner } from '../utils/diagnostic-runner.js';
import { StorageManager } from '../utils/storage-manager.js';
import { DataExporter } from '../utils/data-exporter.js';
import { EventBus } from '../utils/event-bus.js';
import { ErrorReporter } from '../utils/error-reporter.js';
import { TestRunner } from '../utils/test-runner.js';
import { PerformanceMonitor } from '../utils/performance-monitor.js';
import type { ChatGPTSession, ExtensionConfig, ExportData } from '../utils/types.js';

interface BackgroundTelemetry {
  startTime: number;
  messageCount: number;
  sessionCount: number;
  activeTabCount: number;
  diagnosticRuns: number;
  errorCount: number;
  lastActivity: string;
  performance: {
    avgMessageLatency: number;
    diagnosticLatency: number;
    storageOperations: number;
  };
}

class IshkaBackgroundScript {
  private diagnosticRunner: DiagnosticRunner;
  private storageManager: StorageManager;
  private dataExporter: DataExporter;
  private eventBus: EventBus;
  private errorReporter: ErrorReporter;
  private testRunner: TestRunner;
  private performanceMonitor: PerformanceMonitor;
  private activeTabs = new Map<number, ChatGPTSession | null>();
  private config: ExtensionConfig | null = null;
  private telemetry: BackgroundTelemetry;
  private cleanupInterval: number | null = null;

  constructor() {
    this.eventBus = new EventBus();
    this.errorReporter = new ErrorReporter();
    this.testRunner = new TestRunner();
    this.performanceMonitor = new PerformanceMonitor();
    this.storageManager = new StorageManager();
    this.diagnosticRunner = new DiagnosticRunner(this.testRunner);
    this.dataExporter = new DataExporter(this.storageManager, this.performanceMonitor);
    
    // Initialize telemetry
    this.telemetry = {
      startTime: Date.now(),
      messageCount: 0,
      sessionCount: 0,
      activeTabCount: 0,
      diagnosticRuns: 0,
      errorCount: 0,
      lastActivity: new Date().toISOString(),
      performance: {
        avgMessageLatency: 0,
        diagnosticLatency: 0,
        storageOperations: 0
      }
    };

    this.initialize();
  }

  /**
   * Initialize background script
   */
  private async initialize(): Promise<void> {
    try {
      console.log('[Ishka] Background script initializing...');

      // Load configuration
      await this.loadConfiguration();

      // Setup event listeners
      this.setupChromeListeners();
      this.setupInternalListeners();

      // Start periodic diagnostics if enabled
      if (this.config?.autoRunDiagnostics) {
        this.diagnosticRunner.schedulePeriodicDiagnostics(
          this.config.diagnosticsInterval || 300000 // 5 minutes default
        );
      }

      // Start periodic memory cleanup if enabled
      if (this.config?.memoryCleanupEnabled !== false) {
        this.schedulePeriodicCleanup();
      }

      console.log('[Ishka] Background script initialized successfully');
    } catch (error) {
      console.error('[Ishka] Background script initialization failed:', error);
      this.errorReporter.reportError({
        type: 'javascript',
        message: `Background script initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        url: 'background-script',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        sessionId: crypto.randomUUID()
      });
    }
  }

  /**
   * Load extension configuration from storage
   */
  private async loadConfiguration(): Promise<void> {
    try {
      this.config = await this.storageManager.get<ExtensionConfig>('config');
      
      if (!this.config) {
        // Set default configuration
        this.config = {
          diagnosticsEnabled: true,
          autoRunDiagnostics: true,
          diagnosticsInterval: 300000, // 5 minutes
          performanceMonitoring: true,
          errorReporting: true,
          debugMode: false,
          version: chrome.runtime.getManifest().version,
          memoryCleanupEnabled: true,
          memoryCleanupInterval: 30 * 60 * 1000, // 30 minutes
          maxStoredSessions: 100,
          maxSessionAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        };

        await this.storageManager.set('config', this.config);
        console.log('[Ishka] Default configuration created');
      }

      console.log('[Ishka] Configuration loaded:', this.config);
    } catch (error) {
      console.error('[Ishka] Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * Setup Chrome extension API listeners
   */
  private setupChromeListeners(): void {
    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Handle tab removal
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.activeTabs.delete(tabId);
      console.log(`[Ishka] Tab ${tabId} removed from tracking`);
    });

    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleContentMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle extension installation/update
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle service worker startup
    chrome.runtime.onStartup.addListener(() => {
      console.log('[Ishka] Service worker started');
    });

    // Handle extension suspension (cleanup on shutdown)
    chrome.runtime.onSuspend.addListener(() => {
      console.log('[Ishka] Service worker suspending, performing cleanup...');
      this.stopPeriodicCleanup();
      this.performMemoryCleanup().catch(error => {
        console.error('[Ishka] Shutdown cleanup failed:', error);
      });
    });

    console.log('[Ishka] Chrome listeners setup complete');
  }

  /**
   * Setup internal event listeners
   */
  private setupInternalListeners(): void {
    // Listen for diagnostic completion
    this.eventBus.on('diagnostics_completed', (results) => {
      this.broadcastToActiveTabs('diagnostics_results', results);
    });

    // Listen for health status changes
    this.eventBus.on('health_status_changed', (status) => {
      this.broadcastToActiveTabs('health_status_changed', status);
    });

    console.log('[Ishka] Internal listeners setup complete');
  }

  /**
   * Handle tab updates to detect ChatGPT pages
   */
  private async handleTabUpdate(
    tabId: number,
    changeInfo: any,
    tab: chrome.tabs.Tab
  ): Promise<void> {
    try {
      if (changeInfo.status === 'complete' && tab.url) {
        const isChatGPTPage = this.isChatGPTUrl(tab.url);
        
        if (isChatGPTPage) {
          console.log(`[Ishka] ChatGPT page detected in tab ${tabId}: ${tab.url}`);
          
          // Inject content script if not already injected
          try {
            await chrome.scripting.executeScript({
              target: { tabId },
              files: ['content/content.js']
            });
            console.log(`[Ishka] Content script injected into tab ${tabId}`);
          } catch (error) {
            // Content script might already be injected
            console.log(`[Ishka] Content script injection skipped for tab ${tabId}:`, error);
          }
        } else if (this.activeTabs.has(tabId)) {
          // Tab navigated away from ChatGPT
          this.activeTabs.delete(tabId);
          console.log(`[Ishka] Tab ${tabId} navigated away from ChatGPT`);
        }
      }
    } catch (error) {
      console.error('[Ishka] Error handling tab update:', error);
    }
  }

  /**
   * Handle messages from content scripts
   */
  private async handleContentMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'No tab ID' });
        return;
      }

      console.log(`[Ishka] Message from tab ${tabId}:`, message.type);

      switch (message.type) {
        case 'content_initialized':
          await this.handleContentInitialized(tabId, message.payload);
          sendResponse({ success: true });
          break;

        case 'session_detected':
          await this.handleSessionDetected(tabId, message.payload);
          sendResponse({ success: true });
          break;

        case 'session_lost':
          this.handleSessionLost(tabId);
          sendResponse({ success: true });
          break;

        case 'url_changed':
          await this.handleUrlChanged(tabId, message.payload);
          sendResponse({ success: true });
          break;

        case 'dashboard_toggled':
          await this.handleDashboardToggled(tabId, message.payload);
          sendResponse({ success: true });
          break;

        case 'diagnostics_requested':
          const diagnosticsResults = await this.runDiagnostics();
          sendResponse({ success: true, data: diagnosticsResults });
          break;

        case 'export_requested':
          const exportData = await this.exportData(message.payload?.format);
          sendResponse({ success: true, data: exportData });
          break;

        case 'get_telemetry':
          const telemetryData = this.getTelemetryData();
          sendResponse({ success: true, data: telemetryData });
          break;

        case 'telemetry_event':
          this.recordTelemetryEvent(message.payload);
          sendResponse({ success: true });
          break;

        case 'trigger_cleanup':
          await this.performMemoryCleanup();
          sendResponse({ success: true, message: 'Memory cleanup completed' });
          break;

        default:
          console.warn('[Ishka] Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[Ishka] Error handling content message:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Handle content script initialization
   */
  private async handleContentInitialized(tabId: number, payload: any): Promise<void> {
    console.log(`[Ishka] Content script initialized in tab ${tabId}`);
    
    // Send current configuration to content script
    if (this.config) {
      this.sendMessageToTab(tabId, 'config_update', this.config);
    }
  }

  /**
   * Handle ChatGPT session detection
   */
  private async handleSessionDetected(tabId: number, session: ChatGPTSession): Promise<void> {
    this.activeTabs.set(tabId, session);
    this.telemetry.sessionCount++;
    this.updateTelemetryMetrics();
    console.log(`[Ishka] Session detected in tab ${tabId}:`, session.conversationId);

    // Store session data
    try {
      const existingSessions = await this.storageManager.get<ChatGPTSession[]>('sessions') || [];
      const sessionIndex = existingSessions.findIndex(s => s.conversationId === session.conversationId);
      
      if (sessionIndex >= 0) {
        existingSessions[sessionIndex] = session;
      } else {
        existingSessions.push(session);
      }

      await this.storageManager.set('sessions', existingSessions);
    } catch (error) {
      console.error('[Ishka] Failed to store session:', error);
    }
  }

  /**
   * Handle session loss
   */
  private handleSessionLost(tabId: number): void {
    this.activeTabs.set(tabId, null);
    console.log(`[Ishka] Session lost in tab ${tabId}`);
  }

  /**
   * Handle URL changes
   */
  private async handleUrlChanged(tabId: number, url: string): Promise<void> {
    console.log(`[Ishka] URL changed in tab ${tabId}:`, url);
    
    if (!this.isChatGPTUrl(url)) {
      this.activeTabs.delete(tabId);
    }
  }

  /**
   * Handle dashboard toggle events
   */
  private async handleDashboardToggled(tabId: number, payload: any): Promise<void> {
    console.log(`[Ishka] Dashboard toggled in tab ${tabId}:`, payload.visible);
    
    // Could store dashboard state or trigger analytics here
  }

  /**
   * Handle extension installation/update
   */
  private async handleInstallation(details: chrome.runtime.InstalledDetails): Promise<void> {
    console.log('[Ishka] Extension installed/updated:', details.reason);

    if (details.reason === 'install') {
      // First time installation
      console.log('[Ishka] First time installation');
      
      // Could show welcome page or setup wizard
    } else if (details.reason === 'update') {
      // Extension updated
      console.log('[Ishka] Extension updated');
      
      // Could show changelog or migration logic
    }
  }

  /**
   * Run diagnostics
   */
  private async runDiagnostics(): Promise<any> {
    try {
      console.log('[Ishka] Running diagnostics...');
      const results = await this.diagnosticRunner.runDiagnostics();
      console.log('[Ishka] Diagnostics completed:', results);
      return results;
    } catch (error) {
      console.error('[Ishka] Diagnostics failed:', error);
      throw error;
    }
  }

  /**
   * Export data
   */
  private async exportData(format: string = 'json'): Promise<string> {
    try {
      console.log(`[Ishka] Exporting data as ${format}...`);
      const data = await this.dataExporter.exportDiagnostics(format as 'json' | 'csv');
      console.log('[Ishka] Data export completed');
      return data;
    } catch (error) {
      console.error('[Ishka] Data export failed:', error);
      throw error;
    }
  }

  /**
   * Send message to specific tab
   */
  private sendMessageToTab(tabId: number, type: string, payload?: any): void {
    chrome.tabs.sendMessage(tabId, { type, payload }).catch(error => {
      console.warn(`[Ishka] Failed to send message to tab ${tabId}:`, error);
    });
  }

  /**
   * Broadcast message to all active ChatGPT tabs
   */
  private broadcastToActiveTabs(type: string, payload?: any): void {
    for (const [tabId, session] of this.activeTabs) {
      if (session) {
        this.sendMessageToTab(tabId, type, payload);
      }
    }
  }

  /**
   * Check if URL is a ChatGPT page
   */
  private isChatGPTUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'chat.openai.com' || urlObj.hostname === 'chatgpt.com';
    } catch {
      return false;
    }
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): Map<number, ChatGPTSession | null> {
    return new Map(this.activeTabs);
  }

  /**
   * Get configuration
   */
  getConfiguration(): ExtensionConfig | null {
    return this.config;
  }

  /**
   * Update telemetry metrics
   */
  private updateTelemetryMetrics(): void {
    this.telemetry.activeTabCount = this.activeTabs.size;
    this.telemetry.lastActivity = new Date().toISOString();
  }

  /**
   * Record telemetry event from content script
   */
  private recordTelemetryEvent(event: any): void {
    this.telemetry.lastActivity = new Date().toISOString();
    
    switch (event.type) {
      case 'message':
        this.telemetry.messageCount++;
        if (event.latency) {
          const currentAvg = this.telemetry.performance.avgMessageLatency;
          this.telemetry.performance.avgMessageLatency = 
            (currentAvg + event.latency) / 2;
        }
        break;
      
      case 'error':
        this.telemetry.errorCount++;
        break;
      
      case 'diagnostic':
        this.telemetry.diagnosticRuns++;
        if (event.latency) {
          this.telemetry.performance.diagnosticLatency = event.latency;
        }
        break;
    }
  }

  /**
   * Get comprehensive telemetry data
   */
  private getTelemetryData(): BackgroundTelemetry & {
    uptime: number;
    activeSessions: Array<{ tabId: number; session: ChatGPTSession | null }>;
    systemInfo: {
      chromeVersion: string;
      extensionVersion: string;
      platform: string;
    };
  } {
    const uptime = Date.now() - this.telemetry.startTime;
    const activeSessions = Array.from(this.activeTabs.entries()).map(([tabId, session]) => ({
      tabId,
      session
    }));

    return {
      ...this.telemetry,
      uptime,
      activeSessions,
      systemInfo: {
        chromeVersion: navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown',
        extensionVersion: chrome.runtime.getManifest().version,
        platform: navigator.platform
      }
    };
  }

  /**
   * Schedule periodic memory cleanup to prevent leaks
   */
  private schedulePeriodicCleanup(): void {
    const cleanupInterval = this.config?.memoryCleanupInterval || 30 * 60 * 1000; // Default 30 minutes
    
    this.cleanupInterval = setInterval(async () => {
      try {
        console.log('[Ishka] Running periodic memory cleanup...');
        await this.performMemoryCleanup();
        console.log('[Ishka] Memory cleanup completed');
      } catch (error) {
        console.error('[Ishka] Memory cleanup failed:', error);
        this.errorReporter.reportError({
          type: 'javascript',
          message: `Memory cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
          stack: error instanceof Error ? error.stack : undefined,
          url: 'background-cleanup',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          sessionId: 'memory-cleanup'
        });
      }
    }, cleanupInterval) as any;

    const intervalMinutes = Math.round(cleanupInterval / (60 * 1000));
    console.log(`[Ishka] Periodic memory cleanup scheduled (${intervalMinutes} minute intervals)`);
  }

  /**
   * Stop periodic cleanup
   */
  private stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[Ishka] Periodic memory cleanup stopped');
    }
  }

  /**
   * Perform comprehensive memory cleanup
   */
  private async performMemoryCleanup(): Promise<void> {
    const startTime = Date.now();

    // 1. Clean up stale tab entries
    await this.cleanupStaleTabs();

    // 2. Clean up old session data from storage
    await this.cleanupOldSessions();

    // 3. Reset telemetry counters if they're getting too large
    this.resetTelemetryCounters();

    // 4. Clean up event bus listeners (if needed)
    this.cleanupEventBusListeners();

    // 5. Trigger garbage collection hint (if available)
    this.triggerGarbageCollection();

    const duration = Date.now() - startTime;
    console.log(`[Ishka] Memory cleanup completed in ${duration}ms`);
  }

  /**
   * Clean up stale tab entries by checking if tabs still exist
   */
  private async cleanupStaleTabs(): Promise<void> {
    let cleanedCount = 0;
    const tabsToRemove: number[] = [];

    for (const [tabId] of Array.from(this.activeTabs)) {
      try {
        // Check if tab still exists
        await chrome.tabs.get(tabId);
      } catch (error) {
        // Tab doesn't exist anymore, mark for removal
        tabsToRemove.push(tabId);
      }
    }

    // Remove stale tab entries
    for (const tabId of tabsToRemove) {
      this.activeTabs.delete(tabId);
      cleanedCount++;
    }

    if (cleanedCount > 0) {
      console.log(`[Ishka] Cleaned up ${cleanedCount} stale tab entries`);
      this.updateTelemetryMetrics();
    }
  }

  /**
   * Clean up old session data from storage to prevent unlimited growth
   */
  private async cleanupOldSessions(): Promise<void> {
    try {
      const sessions = await this.storageManager.get<ChatGPTSession[]>('sessions') || [];
      const maxSessions = this.config?.maxStoredSessions || 100;
      const maxAge = this.config?.maxSessionAge || 30 * 24 * 60 * 60 * 1000; // Default 30 days
      const cutoffTime = new Date(Date.now() - maxAge);

      let cleanedCount = 0;
      const filteredSessions = sessions
        .filter(session => {
          const sessionTime = new Date(session.lastUpdated);
          return sessionTime > cutoffTime;
        })
        .slice(0, maxSessions);

      cleanedCount = sessions.length - filteredSessions.length;

      if (cleanedCount > 0) {
        await this.storageManager.set('sessions', filteredSessions);
        console.log(`[Ishka] Cleaned up ${cleanedCount} old session records`);
      }
    } catch (error) {
      console.error('[Ishka] Failed to cleanup old sessions:', error);
    }
  }

  /**
   * Reset telemetry counters if they're getting too large to prevent overflow
   */
  private resetTelemetryCounters(): void {
    const maxCount = Number.MAX_SAFE_INTEGER / 2; // Reset before hitting limits
    let resetCount = 0;

    if (this.telemetry.messageCount > maxCount) {
      this.telemetry.messageCount = Math.floor(this.telemetry.messageCount / 2);
      resetCount++;
    }

    if (this.telemetry.sessionCount > maxCount) {
      this.telemetry.sessionCount = Math.floor(this.telemetry.sessionCount / 2);
      resetCount++;
    }

    if (this.telemetry.diagnosticRuns > maxCount) {
      this.telemetry.diagnosticRuns = Math.floor(this.telemetry.diagnosticRuns / 2);
      resetCount++;
    }

    if (this.telemetry.errorCount > maxCount) {
      this.telemetry.errorCount = Math.floor(this.telemetry.errorCount / 2);
      resetCount++;
    }

    if (resetCount > 0) {
      console.log(`[Ishka] Reset ${resetCount} telemetry counters to prevent overflow`);
    }
  }

  /**
   * Clean up orphaned event bus listeners
   */
  private cleanupEventBusListeners(): void {
    // Get current event count before cleanup
    const beforeEvents = this.eventBus.getAllEvents().length;
    
    // Remove listeners for events that might not be used anymore
    const orphanedEvents = ['diagnostics_started', 'test_started', 'session_updated'];
    orphanedEvents.forEach(event => {
      const listenerCount = this.eventBus.getEventCount(event);
      if (listenerCount > 10) { // Arbitrary threshold
        console.log(`[Ishka] Cleaning up ${listenerCount} listeners for event: ${event}`);
        this.eventBus.removeAllListeners(event);
      }
    });

    const afterEvents = this.eventBus.getAllEvents().length;
    if (beforeEvents !== afterEvents) {
      console.log(`[Ishka] Event bus cleanup: ${beforeEvents} -> ${afterEvents} events`);
    }
  }

  /**
   * Trigger garbage collection hint if available
   */
  private triggerGarbageCollection(): void {
    // Modern browsers and V8 don't expose gc() in production
    // This is mainly for development/debugging
    if (typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
      console.log('[Ishka] Triggered garbage collection');
    }
  }
}

// Initialize background script
const ishkaBackground = new IshkaBackgroundScript();

// Expose for debugging in development
if (chrome.runtime.getManifest().version.includes('dev')) {
  (globalThis as any).ishkaBackground = ishkaBackground;
}