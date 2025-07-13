import { writable, derived } from 'svelte/store';
import type { DiagnosticCategory } from '../utils/types.js';

export type DashboardTab = 'diagnostics' | 'telemetry' | 'storage' | 'export';

export interface DashboardState {
  activeTab: DashboardTab;
  isCollapsed: boolean;
  showAdvanced: boolean;
  refreshInterval: number;
  autoRefresh: boolean;
}

export interface TabStatusIndicator {
  category: DiagnosticCategory;
  status: 'pass' | 'fail' | 'warning' | 'unknown';
  count: number;
  lastUpdate: string;
}

// Core dashboard state
function createDashboardStore() {
  const { subscribe, set, update } = writable<DashboardState>({
    activeTab: 'diagnostics',
    isCollapsed: false,
    showAdvanced: false,
    refreshInterval: 30000, // 30 seconds
    autoRefresh: true
  });

  return {
    subscribe,
    setActiveTab: (tab: DashboardTab) => update(state => ({ ...state, activeTab: tab })),
    toggleCollapsed: () => update(state => ({ ...state, isCollapsed: !state.isCollapsed })),
    toggleAdvanced: () => update(state => ({ ...state, showAdvanced: !state.showAdvanced })),
    setRefreshInterval: (interval: number) => update(state => ({ ...state, refreshInterval: interval })),
    toggleAutoRefresh: () => update(state => ({ ...state, autoRefresh: !state.autoRefresh })),
    reset: () => set({
      activeTab: 'diagnostics',
      isCollapsed: false,
      showAdvanced: false,
      refreshInterval: 30000,
      autoRefresh: true
    })
  };
}

// Tab status indicators for live updates
function createTabStatusStore() {
  const { subscribe, set, update } = writable<Record<DashboardTab, TabStatusIndicator>>({
    diagnostics: { category: 'dom', status: 'unknown', count: 0, lastUpdate: '' },
    telemetry: { category: 'api', status: 'unknown', count: 0, lastUpdate: '' },
    storage: { category: 'storage', status: 'unknown', count: 0, lastUpdate: '' },
    export: { category: 'dom', status: 'unknown', count: 0, lastUpdate: '' }
  });

  return {
    subscribe,
    updateTabStatus: (tab: DashboardTab, indicator: TabStatusIndicator) => 
      update(statuses => ({ ...statuses, [tab]: indicator })),
    reset: () => set({
      diagnostics: { category: 'dom', status: 'unknown', count: 0, lastUpdate: '' },
      telemetry: { category: 'api', status: 'unknown', count: 0, lastUpdate: '' },
      storage: { category: 'storage', status: 'unknown', count: 0, lastUpdate: '' },
      export: { category: 'dom', status: 'unknown', count: 0, lastUpdate: '' }
    })
  };
}

// Main exports
export const dashboardStore = createDashboardStore();
export const tabStatusStore = createTabStatusStore();

// Derived stores for common UI patterns
export const activeTab = derived(dashboardStore, $dashboard => $dashboard.activeTab);
export const isCollapsed = derived(dashboardStore, $dashboard => $dashboard.isCollapsed);
export const shouldAutoRefresh = derived(dashboardStore, $dashboard => $dashboard.autoRefresh);
export const refreshInterval = derived(dashboardStore, $dashboard => $dashboard.refreshInterval);

// Helper to get overall system health based on tab statuses
export const overallStatus = derived(tabStatusStore, $tabStatuses => {
  const statuses = Object.values($tabStatuses).map(tab => tab.status);
  
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('warning')) return 'warning';
  if (statuses.every(status => status === 'pass')) return 'pass';
  return 'unknown';
});

// Tab badge counts for navigation
export const tabBadges = derived(tabStatusStore, $tabStatuses => {
  return Object.fromEntries(
    Object.entries($tabStatuses).map(([tab, indicator]) => [
      tab,
      indicator.status === 'fail' || indicator.status === 'warning' ? indicator.count : 0
    ])
  );
});