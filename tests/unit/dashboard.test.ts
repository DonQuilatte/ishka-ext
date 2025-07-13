import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { 
  dashboardStore, 
  tabStatusStore, 
  activeTab, 
  overallStatus, 
  tabBadges 
} from '../../src/store/dashboard-store';

describe('Dashboard Store', () => {
  beforeEach(() => {
    dashboardStore.reset();
    tabStatusStore.reset();
  });

  describe('dashboardStore', () => {
    it('should initialize with default values', () => {
      const state = get(dashboardStore);
      
      expect(state.activeTab).toBe('diagnostics');
      expect(state.isCollapsed).toBe(false);
      expect(state.showAdvanced).toBe(false);
      expect(state.refreshInterval).toBe(30000);
      expect(state.autoRefresh).toBe(true);
    });

    it('should update active tab', () => {
      dashboardStore.setActiveTab('telemetry');
      
      const state = get(dashboardStore);
      expect(state.activeTab).toBe('telemetry');
    });

    it('should toggle collapsed state', () => {
      dashboardStore.toggleCollapsed();
      
      const state = get(dashboardStore);
      expect(state.isCollapsed).toBe(true);
      
      dashboardStore.toggleCollapsed();
      expect(get(dashboardStore).isCollapsed).toBe(false);
    });

    it('should toggle advanced mode', () => {
      dashboardStore.toggleAdvanced();
      
      const state = get(dashboardStore);
      expect(state.showAdvanced).toBe(true);
    });

    it('should update refresh interval', () => {
      dashboardStore.setRefreshInterval(60000);
      
      const state = get(dashboardStore);
      expect(state.refreshInterval).toBe(60000);
    });

    it('should toggle auto refresh', () => {
      dashboardStore.toggleAutoRefresh();
      
      const state = get(dashboardStore);
      expect(state.autoRefresh).toBe(false);
    });

    it('should reset to defaults', () => {
      // Modify state
      dashboardStore.setActiveTab('storage');
      dashboardStore.toggleCollapsed();
      dashboardStore.setRefreshInterval(10000);
      
      // Reset
      dashboardStore.reset();
      
      const state = get(dashboardStore);
      expect(state.activeTab).toBe('diagnostics');
      expect(state.isCollapsed).toBe(false);
      expect(state.refreshInterval).toBe(30000);
    });
  });

  describe('tabStatusStore', () => {
    it('should initialize with default status indicators', () => {
      const statuses = get(tabStatusStore);
      
      expect(statuses.diagnostics.status).toBe('unknown');
      expect(statuses.telemetry.status).toBe('unknown');
      expect(statuses.storage.status).toBe('unknown');
      expect(statuses.export.status).toBe('unknown');
    });

    it('should update tab status', () => {
      const indicator = {
        category: 'dom' as const,
        status: 'pass' as const,
        count: 5,
        lastUpdate: '2023-01-01T00:00:00Z'
      };
      
      tabStatusStore.updateTabStatus('diagnostics', indicator);
      
      const statuses = get(tabStatusStore);
      expect(statuses.diagnostics).toEqual(indicator);
    });

    it('should reset all tab statuses', () => {
      // Update a status
      tabStatusStore.updateTabStatus('diagnostics', {
        category: 'dom',
        status: 'fail',
        count: 2,
        lastUpdate: '2023-01-01T00:00:00Z'
      });
      
      // Reset
      tabStatusStore.reset();
      
      const statuses = get(tabStatusStore);
      expect(statuses.diagnostics.status).toBe('unknown');
      expect(statuses.diagnostics.count).toBe(0);
    });
  });

  describe('Derived stores', () => {
    it('should derive active tab correctly', () => {
      dashboardStore.setActiveTab('storage');
      
      expect(get(activeTab)).toBe('storage');
    });

    it('should calculate overall status based on tab statuses', () => {
      // All pass
      tabStatusStore.updateTabStatus('diagnostics', {
        category: 'dom',
        status: 'pass',
        count: 3,
        lastUpdate: '2023-01-01T00:00:00Z'
      });
      
      tabStatusStore.updateTabStatus('telemetry', {
        category: 'api',
        status: 'pass',
        count: 2,
        lastUpdate: '2023-01-01T00:00:00Z'
      });
      
      tabStatusStore.updateTabStatus('storage', {
        category: 'storage',
        status: 'pass',
        count: 0,
        lastUpdate: '2023-01-01T00:00:00Z'
      });
      
      tabStatusStore.updateTabStatus('export', {
        category: 'dom',
        status: 'pass',
        count: 0,
        lastUpdate: '2023-01-01T00:00:00Z'
      });
      
      expect(get(overallStatus)).toBe('pass');
      
      // One fail
      tabStatusStore.updateTabStatus('storage', {
        category: 'storage',
        status: 'fail',
        count: 1,
        lastUpdate: '2023-01-01T00:00:00Z'
      });
      
      expect(get(overallStatus)).toBe('fail');
      
      // Warning only
      tabStatusStore.reset();
      tabStatusStore.updateTabStatus('diagnostics', {
        category: 'dom',
        status: 'warning',
        count: 1,
        lastUpdate: '2023-01-01T00:00:00Z'
      });
      
      expect(get(overallStatus)).toBe('warning');
    });

    it('should calculate tab badges correctly', () => {
      tabStatusStore.updateTabStatus('diagnostics', {
        category: 'dom',
        status: 'fail',
        count: 3,
        lastUpdate: '2023-01-01T00:00:00Z'
      });
      
      tabStatusStore.updateTabStatus('telemetry', {
        category: 'api',
        status: 'pass',
        count: 5,
        lastUpdate: '2023-01-01T00:00:00Z'
      });
      
      tabStatusStore.updateTabStatus('storage', {
        category: 'storage',
        status: 'warning',
        count: 2,
        lastUpdate: '2023-01-01T00:00:00Z'
      });
      
      const badges = get(tabBadges);
      
      expect(badges.diagnostics).toBe(3); // fail shows count
      expect(badges.telemetry).toBe(0);   // pass shows 0
      expect(badges.storage).toBe(2);     // warning shows count
      expect(badges.export).toBe(0);      // unknown shows 0
    });
  });

  describe('Store integration', () => {
    it('should maintain store independence', () => {
      // Modifying dashboard store shouldn't affect tab status store
      dashboardStore.setActiveTab('export');
      
      const tabStatuses = get(tabStatusStore);
      expect(tabStatuses.diagnostics.status).toBe('unknown');
    });

    it('should handle rapid state changes', () => {
      // Simulate rapid tab switching
      dashboardStore.setActiveTab('telemetry');
      dashboardStore.setActiveTab('storage');
      dashboardStore.setActiveTab('export');
      dashboardStore.setActiveTab('diagnostics');
      
      expect(get(activeTab)).toBe('diagnostics');
    });

    it('should handle concurrent status updates', () => {
      const updates = [
        { tab: 'diagnostics' as const, status: 'pass' as const },
        { tab: 'telemetry' as const, status: 'fail' as const },
        { tab: 'storage' as const, status: 'warning' as const },
        { tab: 'export' as const, status: 'pass' as const }
      ];
      
      updates.forEach(({ tab, status }) => {
        tabStatusStore.updateTabStatus(tab, {
          category: 'dom',
          status,
          count: 1,
          lastUpdate: new Date().toISOString()
        });
      });
      
      expect(get(overallStatus)).toBe('fail'); // Should show worst status
    });
  });
});