/**
 * Telemetry Store - Real-time metrics from content script and background worker
 * Tracks session health, messaging performance, and system diagnostics
 */

import { writable, derived, readable } from 'svelte/store';
import type { 
  ChatGPTSession, 
  DiagnosticResult, 
  PerformanceMetrics, 
  ErrorContext,
  SystemHealth 
} from '../utils/types.js';

// Define a type for test results
export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
}

export interface TelemetryStoreState {
  // Session metrics
  sessionCount: number;
  activeSessionId: string | null;
  sessionDuration: number;
  lastSessionChange: string;
  
  // Messaging metrics
  messagesExchanged: number;
  messageLatency: number;
  failedMessages: number;
  backgroundConnected: boolean;
  
  // DOM observer metrics
  domMutations: number;
  urlChanges: number;
  conversationUpdates: number;
  observerActive: boolean;
  
  // Performance metrics
  memoryUsage: number;
  cpuTime: number;
  renderTime: number;
  lastDiagnosticRun: string;
  
  // Error tracking
  errorCount: number;
  lastError: string | null;
  criticalErrors: number;
  
  // System health
  overallHealth: 'healthy' | 'degraded' | 'critical';
  componentHealth: Record<string, 'pass' | 'fail' | 'warning'>;
  testResults: {
    passed: number;
    failed: number;
    skipped: number;
    tests: TestResult[];
  } | null;
}

export interface TelemetryEvent {
  type: 'session' | 'message' | 'dom' | 'performance' | 'error' | 'diagnostic' | 'retry';
  subtype: string;
  timestamp: string;
  data?: any;
  latency?: number;
  retryAttempt?: number;
  maxRetries?: number;
}

// Initial telemetry state
const initialMetrics: TelemetryStoreState = {
  sessionCount: 0,
  activeSessionId: null,
  sessionDuration: 0,
  lastSessionChange: '',
  
  messagesExchanged: 0,
  messageLatency: 0,
  failedMessages: 0,
  backgroundConnected: false,
  
  domMutations: 0,
  urlChanges: 0,
  conversationUpdates: 0,
  observerActive: false,
  
  memoryUsage: 0,
  cpuTime: 0,
  renderTime: 0,
  lastDiagnosticRun: '',
  
  errorCount: 0,
  lastError: null,
  criticalErrors: 0,
  
  overallHealth: 'healthy',
  componentHealth: {},
  testResults: null
};

// Core stores
export const telemetryStore = writable<TelemetryStoreState>(initialMetrics);
export const telemetryEvents = writable<TelemetryEvent[]>([]);
export const telemetryConfig = writable({
  enabled: true,
  retentionLimit: 1000,
  updateInterval: 1000,
  autoCollect: true
});

// Real-time updates store
export const isRecording = writable(false);
export const lastUpdate = writable<string>('');


// Event tracking
const EVENT_RETENTION_LIMIT = 500;
let eventCounter = 0;

// Derived stores for UI
export const sessionMetrics = derived(telemetryStore, ($store) => ({
  count: $store.sessionCount,
  activeId: $store.activeSessionId,
  duration: $store.sessionDuration,
  lastChange: $store.lastSessionChange
}));

export const messagingMetrics = derived(telemetryStore, ($store) => ({
  exchanged: $store.messagesExchanged,
  latency: $store.messageLatency,
  failed: $store.failedMessages,
  connected: $store.backgroundConnected,
  successRate: $store.messagesExchanged > 0 
    ? (($store.messagesExchanged - $store.failedMessages) / $store.messagesExchanged * 100).toFixed(1)
    : '100'
}));

export const domMetrics = derived(telemetryStore, ($store) => ({
  mutations: $store.domMutations,
  urlChanges: $store.urlChanges,
  conversationUpdates: $store.conversationUpdates,
  observerActive: $store.observerActive
}));

export const performanceMetrics = derived(telemetryStore, ($store) => ({
  memory: ($store.memoryUsage / 1024 / 1024).toFixed(1), // MB
  cpuTime: $store.cpuTime.toFixed(2),
  renderTime: $store.renderTime.toFixed(2),
  lastDiagnostic: $store.lastDiagnosticRun
}));

export const errorMetrics = derived(telemetryStore, ($store) => ({
  total: $store.errorCount,
  critical: $store.criticalErrors,
  lastError: $store.lastError,
  errorRate: $store.messagesExchanged > 0 
    ? ($store.errorCount / $store.messagesExchanged * 100).toFixed(2)
    : '0.00'
}));

export const healthStatus = derived(telemetryStore, ($store) => ({
  overall: $store.overallHealth,
  components: $store.componentHealth,
  isHealthy: $store.overallHealth === 'healthy',
  componentCount: Object.keys($store.componentHealth).length,
  passCount: Object.values($store.componentHealth).filter(status => status === 'pass').length
}));

// Recent events (last 20)
export const recentEvents = derived(telemetryEvents, ($events) => 
  $events.slice(-20).reverse()
);

// Retry-specific derived stores
export const retryMetrics = derived(telemetryEvents, ($events) => {
  const retryEvents = $events.filter(e => e.type === 'retry');
  const attempts = retryEvents.filter(e => e.subtype === 'attempt');
  const successes = retryEvents.filter(e => e.subtype === 'success');
  const exhausted = retryEvents.filter(e => e.subtype === 'exhausted');
  
  return {
    totalAttempts: attempts.length,
    successfulRetries: successes.length,
    exhaustedRetries: exhausted.length,
    successRate: attempts.length > 0 ? 
      (successes.length / (successes.length + exhausted.length) * 100).toFixed(1) : '100',
    recentRetries: retryEvents.slice(-10)
  };
});

// Telemetry actions
export const telemetryActions = {
  // Record telemetry event
  recordEvent(event: Omit<TelemetryEvent, 'timestamp'>): void {
    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    telemetryEvents.update(events => {
      const updated = [...events, fullEvent];
      return updated.length > EVENT_RETENTION_LIMIT 
        ? updated.slice(-EVENT_RETENTION_LIMIT)
        : updated;
    });

    // Update last update timestamp
    lastUpdate.set(fullEvent.timestamp);
    eventCounter++;
  },

  // Update session metrics
  updateSessionMetrics(session: ChatGPTSession | null): void {
    telemetryStore.update(store => ({
      ...store,
      activeSessionId: session?.conversationId || null,
      sessionCount: session ? store.sessionCount + 1 : store.sessionCount,
      lastSessionChange: new Date().toISOString()
    }));

    this.recordEvent({
      type: 'session',
      subtype: session ? 'detected' : 'lost',
      data: session
    });
  },

  // Track message exchange
  trackMessage(type: 'sent' | 'received' | 'failed', latency?: number): void {
    telemetryStore.update(store => ({
      ...store,
      messagesExchanged: type !== 'failed' ? store.messagesExchanged + 1 : store.messagesExchanged,
      failedMessages: type === 'failed' ? store.failedMessages + 1 : store.failedMessages,
      messageLatency: latency || store.messageLatency
    }));

    this.recordEvent({
      type: 'message',
      subtype: type,
      latency
    });
  },

  // Track DOM changes
  trackDOMChange(type: 'mutation' | 'url' | 'conversation'): void {
    telemetryStore.update(store => ({
      ...store,
      domMutations: type === 'mutation' ? store.domMutations + 1 : store.domMutations,
      urlChanges: type === 'url' ? store.urlChanges + 1 : store.urlChanges,
      conversationUpdates: type === 'conversation' ? store.conversationUpdates + 1 : store.conversationUpdates
    }));

    this.recordEvent({
      type: 'dom',
      subtype: type
    });
  },

  // Update performance metrics
  updatePerformance(metrics: Partial<PerformanceMetrics>): void {
    telemetryStore.update(current => ({
      ...current,
      memoryUsage: metrics.memoryUsage || current.memoryUsage,
      cpuTime: metrics.domReadyTime || current.cpuTime,
      renderTime: metrics.scriptLoadTime || current.renderTime
    }));

    this.recordEvent({
      type: 'performance',
      subtype: 'update',
      data: metrics
    });
  },

  // Track errors
  trackError(error: ErrorContext): void {
    const isCritical = error.type === 'javascript' && error.message.includes('critical');
    
    telemetryStore.update(store => ({
      ...store,
      errorCount: store.errorCount + 1,
      criticalErrors: isCritical ? store.criticalErrors + 1 : store.criticalErrors,
      lastError: error.message
    }));

    this.recordEvent({
      type: 'error',
      subtype: error.type,
      data: error
    });
  },

  // Track retry attempts
  trackRetryAttempt(testId: string, attempt: number, maxRetries: number, delayMs: number, error?: string): void {
    this.recordEvent({
      type: 'retry',
      subtype: 'attempt',
      data: {
        testId,
        error,
        delayMs
      },
      retryAttempt: attempt,
      maxRetries
    });
  },

  // Track retry success
  trackRetrySuccess(testId: string, totalAttempts: number): void {
    this.recordEvent({
      type: 'retry',
      subtype: 'success',
      data: {
        testId,
        totalAttempts
      }
    });
  },

  // Track retry exhaustion
  trackRetryExhausted(testId: string, totalAttempts: number, finalError?: string): void {
    this.recordEvent({
      type: 'retry',
      subtype: 'exhausted',
      data: {
        testId,
        totalAttempts,
        finalError
      }
    });
  },

  // Update system health
  updateHealth(health: SystemHealth): void {
    const componentHealth: Record<string, 'pass' | 'fail' | 'warning'> = {};
    
    Object.entries(health.categories).forEach(([category, status]) => {
      componentHealth[category] = status.status;
    });

    telemetryStore.update(store => ({
      ...store,
      overallHealth: health.overall,
      componentHealth,
      lastDiagnosticRun: new Date().toISOString()
    }));

    this.recordEvent({
      type: 'diagnostic',
      subtype: 'health_update',
      data: health
    });
  },

  // Update connection status
  updateConnectionStatus(connected: boolean): void {
    telemetryStore.update(store => ({
      ...store,
      backgroundConnected: connected
    }));

    this.recordEvent({
      type: 'message',
      subtype: connected ? 'connected' : 'disconnected'
    });
  },

  // Update observer status
  updateObserverStatus(active: boolean): void {
    telemetryStore.update(store => ({
      ...store,
      observerActive: active
    }));

    this.recordEvent({
      type: 'dom',
      subtype: active ? 'observer_started' : 'observer_stopped'
    });
  },

  // Reset metrics
  reset(): void {
    telemetryStore.set(initialMetrics);
    telemetryEvents.set([]);
    lastUpdate.set('');
    eventCounter = 0;

    this.recordEvent({
      type: 'diagnostic',
      subtype: 'reset'
    });
  },

  // Get current metrics snapshot
  getSnapshot(): TelemetryStoreState {
    let snapshot: TelemetryStoreState;
    telemetryStore.subscribe(store => snapshot = store)();
    return snapshot!;
  },

  // Export telemetry data
  exportData(): {
    metrics: TelemetryStoreState;
    events: TelemetryEvent[];
    metadata: {
      exportTime: string;
      eventCount: number;
      uptime: number;
    };
  } {
    let metrics: TelemetryStoreState;
    let events: TelemetryEvent[];
    
    telemetryStore.subscribe(store => metrics = store)();
    telemetryEvents.subscribe(e => events = e)();

    return {
      metrics: metrics!,
      events: events!,
      metadata: {
        exportTime: new Date().toISOString(),
        eventCount: eventCounter,
        uptime: performance.now()
      }
    };
  },

  // Set test results
  setTestResults(results: TestResult[]): void {
    telemetryStore.update(store => ({
      ...store,
      testResults: {
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        tests: results
      }
    }));
  },

  // Get retry statistics
  getRetryStats(): {
    totalRetries: number;
    successfulRetries: number;
    exhaustedRetries: number;
    avgRetriesPerTest: number;
  } {
    let events: TelemetryEvent[];
    telemetryEvents.subscribe(e => events = e)();
    
    const retryEvents = events!.filter(e => e.type === 'retry');
    const retryAttempts = retryEvents.filter(e => e.subtype === 'attempt');
    const retrySuccesses = retryEvents.filter(e => e.subtype === 'success');
    const retryExhausted = retryEvents.filter(e => e.subtype === 'exhausted');
    
    return {
      totalRetries: retryAttempts.length,
      successfulRetries: retrySuccesses.length,
      exhaustedRetries: retryExhausted.length,
      avgRetriesPerTest: retryAttempts.length > 0 ? 
        retryAttempts.reduce((sum, e) => sum + (e.retryAttempt || 0), 0) / retryAttempts.length : 0
    };
  }
};

// Auto-start recording
isRecording.set(true);

// Real-time update timer
let updateTimer: any; // Use 'any' to handle both Node and browser types

telemetryConfig.subscribe(config => {
  if (updateTimer) {
    clearInterval(updateTimer);
  }

  if (config.enabled && config.autoCollect) {
    updateTimer = setInterval(() => {
      // Update performance metrics
      if ('memory' in performance) {
        telemetryActions.updatePerformance({
          memoryUsage: (performance as any).memory.usedJSHeapSize,
          domReadyTime: performance.now(),
          scriptLoadTime: 0,
          storageQuota: { used: 0, available: 0, percentage: 0 },
          workerResponseTimes: {}
        });
      }

      lastUpdate.set(new Date().toISOString());
    }, config.updateInterval);
  }
});

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (updateTimer) {
      clearInterval(updateTimer);
    }
  });
}