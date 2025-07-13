import { writable, derived, type Readable } from 'svelte/store';
import type { 
  SystemHealth, 
  DiagnosticResult, 
  DiagnosticCategory, 
  PerformanceMetrics,
  ExtensionConfig 
} from '../utils/types.js';
import { eventBus } from '../utils/event-bus.js';
import { storageManager } from '../utils/storage-manager.js';

interface DiagnosticStoreState {
  isRunning: boolean;
  lastRun: Date | null;
  systemHealth: SystemHealth | null;
  performanceMetrics: PerformanceMetrics | null;
  config: ExtensionConfig | null;
  activeTab: DiagnosticCategory;
}

const initialState: DiagnosticStoreState = {
  isRunning: false,
  lastRun: null,
  systemHealth: null,
  performanceMetrics: null,
  config: null,
  activeTab: 'dom'
};

function createDiagnosticStore() {
  const { subscribe, set, update } = writable<DiagnosticStoreState>(initialState);

  return {
    subscribe,
    
    // Actions
    setRunning(isRunning: boolean) {
      update(state => ({ ...state, isRunning }));
    },

    setSystemHealth(systemHealth: SystemHealth) {
      update(state => ({ 
        ...state, 
        systemHealth, 
        lastRun: new Date(),
        isRunning: false 
      }));
      
      // Persist to storage
      storageManager.set('systemHealth', systemHealth);
    },

    setPerformanceMetrics(metrics: PerformanceMetrics) {
      update(state => ({ ...state, performanceMetrics: metrics }));
      storageManager.set('performanceMetrics', metrics);
    },

    setConfig(config: ExtensionConfig) {
      update(state => ({ ...state, config }));
      storageManager.set('config', config);
    },

    setActiveTab(tab: DiagnosticCategory) {
      update(state => ({ ...state, activeTab: tab }));
    },

    async initialize() {
      try {
        const [savedHealth, savedMetrics, savedConfig] = await Promise.all([
          storageManager.get<SystemHealth>('systemHealth'),
          storageManager.get<PerformanceMetrics>('performanceMetrics'),
          storageManager.get<ExtensionConfig>('config')
        ]);

        update(state => ({
          ...state,
          systemHealth: savedHealth,
          performanceMetrics: savedMetrics,
          config: savedConfig || getDefaultConfig()
        }));
      } catch (error) {
        console.error('[DiagnosticStore] Failed to initialize:', error);
        update(state => ({ ...state, config: getDefaultConfig() }));
      }
    },

    reset() {
      set(initialState);
    }
  };
}

function getDefaultConfig(): ExtensionConfig {
  return {
    diagnosticsEnabled: true,
    autoRunDiagnostics: true,
    diagnosticsInterval: 30000,
    performanceMonitoring: true,
    errorReporting: true,
    debugMode: false,
    version: '1.0.0'
  };
}

export const diagnosticStore = createDiagnosticStore();

// Derived stores for computed values
export const overallHealthStatus: Readable<'healthy' | 'degraded' | 'critical' | 'unknown'> = derived(
  diagnosticStore,
  ($store) => $store.systemHealth?.overall || 'unknown'
);

export const categoryResults: Readable<Record<DiagnosticCategory, DiagnosticResult[]>> = derived(
  diagnosticStore,
  ($store) => {
    if (!$store.systemHealth) {
      return {
        dom: [],
        api: [],
        storage: [],
        worker: [],
        performance: [],
        security: []
      };
    }

    const results: Record<DiagnosticCategory, DiagnosticResult[]> = {} as any;
    
    for (const [category, data] of Object.entries($store.systemHealth.categories)) {
      results[category as DiagnosticCategory] = data.tests || [];
    }

    return results;
  }
);

export const activeTabResults: Readable<DiagnosticResult[]> = derived(
  [diagnosticStore, categoryResults],
  ([$store, $results]) => $results[$store.activeTab] || []
);

export const testsSummary: Readable<{ total: number; passed: number; failed: number; warnings: number }> = derived(
  diagnosticStore,
  ($store) => $store.systemHealth?.summary || { total: 0, passed: 0, failed: 0, warnings: 0 }
);

export const isConfigured: Readable<boolean> = derived(
  diagnosticStore,
  ($store) => $store.config !== null
);

export const shouldAutoRun: Readable<boolean> = derived(
  diagnosticStore,
  ($store) => $store.config?.autoRunDiagnostics === true
);

export const diagnosticsInterval: Readable<number> = derived(
  diagnosticStore,
  ($store) => $store.config?.diagnosticsInterval || 30000
);

// Event listeners for external updates
eventBus.on('diagnostics:completed', (systemHealth: SystemHealth) => {
  diagnosticStore.setSystemHealth(systemHealth);
});

eventBus.on('diagnostics:started', () => {
  diagnosticStore.setRunning(true);
});

eventBus.on('performance:updated', (metrics: PerformanceMetrics) => {
  diagnosticStore.setPerformanceMetrics(metrics);
});

eventBus.on('config:updated', (config: ExtensionConfig) => {
  diagnosticStore.setConfig(config);
});