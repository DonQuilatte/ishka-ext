<script>
  import { onMount, onDestroy } from 'svelte';
  import { 
    dashboardStore, 
    tabStatusStore, 
    activeTab, 
    overallStatus, 
    tabBadges 
  } from '../store/dashboard-store.js';
  import { diagnosticStore } from '../store/index.js';
  import DiagnosticsPanel from './components/DiagnosticsPanel.svelte';
  import TelemetryPanel from './TelemetryPanel.svelte';
  import StoragePanel from './components/StoragePanel.svelte';
  import ExportPanel from './components/ExportPanel.svelte';
  import StatusIndicator from './components/StatusIndicator.svelte';

  let refreshTimer;

  onMount(async () => {
    // Initialize stores
    await diagnosticStore.initialize();
    
    // Set up auto-refresh if enabled
    setupAutoRefresh();
    
    // Run initial diagnostics
    updateDiagnosticStatus();
  });

  onDestroy(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  });

  function setupAutoRefresh() {
    dashboardStore.subscribe(state => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      
      if (state.autoRefresh) {
        refreshTimer = setInterval(() => {
          updateDiagnosticStatus();
        }, state.refreshInterval);
      }
    });
  }

  async function updateDiagnosticStatus() {
    try {
      const health = await diagnosticStore.runDiagnostics();
      
      // Update tab statuses based on diagnostic results
      tabStatusStore.updateTabStatus('diagnostics', {
        category: 'dom',
        status: health.categories.dom?.status || 'unknown',
        count: health.categories.dom?.tests?.length || 0,
        lastUpdate: new Date().toISOString()
      });
      
      tabStatusStore.updateTabStatus('storage', {
        category: 'storage',
        status: health.categories.storage?.status || 'unknown',
        count: health.categories.storage?.tests?.length || 0,
        lastUpdate: new Date().toISOString()
      });
      
      tabStatusStore.updateTabStatus('telemetry', {
        category: 'api',
        status: health.categories.api?.status || 'unknown',
        count: health.categories.api?.tests?.length || 0,
        lastUpdate: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Dashboard] Failed to update diagnostic status:', error);
    }
  }

  function handleTabClick(tab) {
    dashboardStore.setActiveTab(tab);
  }

  function handleRefresh() {
    updateDiagnosticStatus();
  }

  $: currentTab = $activeTab;
  $: systemStatus = $overallStatus;
  $: badges = $tabBadges;
</script>

<div class="ishka-root">
  <div class="dashboard-container">
    <!-- Header with overall status -->
    <header class="dashboard-header">
      <div class="header-content">
        <h1 class="dashboard-title">Ishka Dashboard</h1>
        <div class="header-status">
          <StatusIndicator status={systemStatus} size="large" />
          <span class="status-text">System {systemStatus === 'pass' ? 'Healthy' : systemStatus === 'fail' ? 'Issues' : systemStatus === 'warning' ? 'Warnings' : 'Unknown'}</span>
        </div>
        <button class="refresh-btn" on:click={handleRefresh} title="Refresh diagnostics" aria-label="Refresh diagnostics">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="m20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
          </svg>
        </button>
      </div>
    </header>

    <!-- Navigation tabs -->
    <nav class="dashboard-nav">
      <div class="nav-tabs">
        <button 
          class="nav-tab" 
          class:active={currentTab === 'diagnostics'}
          on:click={() => handleTabClick('diagnostics')}
        >
          <span class="tab-label">Diagnostics</span>
          {#if badges.diagnostics > 0}
            <span class="tab-badge">{badges.diagnostics}</span>
          {/if}
        </button>
        
        <button 
          class="nav-tab" 
          class:active={currentTab === 'telemetry'}
          on:click={() => handleTabClick('telemetry')}
        >
          <span class="tab-label">Telemetry</span>
          {#if badges.telemetry > 0}
            <span class="tab-badge">{badges.telemetry}</span>
          {/if}
        </button>
        
        <button 
          class="nav-tab" 
          class:active={currentTab === 'storage'}
          on:click={() => handleTabClick('storage')}
        >
          <span class="tab-label">Storage</span>
          {#if badges.storage > 0}
            <span class="tab-badge">{badges.storage}</span>
          {/if}
        </button>
        
        <button 
          class="nav-tab" 
          class:active={currentTab === 'export'}
          on:click={() => handleTabClick('export')}
        >
          <span class="tab-label">Export</span>
          {#if badges.export > 0}
            <span class="tab-badge">{badges.export}</span>
          {/if}
        </button>
      </div>
    </nav>

    <!-- Main content area -->
    <main class="dashboard-content">
      {#if currentTab === 'diagnostics'}
        <DiagnosticsPanel />
      {:else if currentTab === 'telemetry'}
        <TelemetryPanel />
      {:else if currentTab === 'storage'}
        <StoragePanel />
      {:else if currentTab === 'export'}
        <ExportPanel />
      {/if}
    </main>
  </div>
</div>

<style>
  .ishka-root {
    all: initial;
    font-family: var(--ishka-font-sans);
    font-size: var(--ishka-text-sm);
    line-height: var(--ishka-leading-normal);
    color: var(--ishka-text-primary);
    background: var(--ishka-bg-primary);
  }

  .dashboard-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-width: var(--ishka-min-width-dashboard);
    background: var(--ishka-bg-primary);
  }

  /* Header */
  .dashboard-header {
    flex-shrink: 0;
    padding: var(--ishka-space-4);
    background: var(--ishka-bg-secondary);
    border-bottom: var(--ishka-border-width) solid var(--ishka-border-color);
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ishka-space-4);
  }

  .dashboard-title {
    margin: 0;
    font-size: var(--ishka-text-lg);
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-primary);
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-2);
  }

  .status-text {
    font-size: var(--ishka-text-sm);
    font-weight: var(--ishka-font-medium);
    color: var(--ishka-text-secondary);
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--ishka-space-8);
    height: var(--ishka-space-8);
    padding: 0;
    background: transparent;
    border: var(--ishka-border-width) solid var(--ishka-border-color);
    border-radius: var(--ishka-radius-md);
    color: var(--ishka-text-secondary);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
  }

  .refresh-btn:hover {
    background: var(--ishka-bg-hover);
    color: var(--ishka-text-primary);
    border-color: var(--ishka-border-color-hover);
  }

  .refresh-btn:active {
    transform: scale(0.95);
  }

  /* Navigation */
  .dashboard-nav {
    flex-shrink: 0;
    background: var(--ishka-bg-secondary);
    border-bottom: var(--ishka-border-width) solid var(--ishka-border-color);
  }

  .nav-tabs {
    display: flex;
    overflow-x: auto;
  }

  .nav-tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--ishka-space-2);
    padding: var(--ishka-space-3) var(--ishka-space-4);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--ishka-text-secondary);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
    white-space: nowrap;
  }

  .nav-tab:hover {
    background: var(--ishka-bg-hover);
    color: var(--ishka-text-primary);
  }

  .nav-tab.active {
    color: var(--ishka-accent-600);
    border-bottom-color: var(--ishka-accent-500);
    background: var(--ishka-bg-primary);
  }

  .tab-label {
    font-size: var(--ishka-text-sm);
    font-weight: var(--ishka-font-medium);
  }

  .tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--ishka-space-5);
    height: var(--ishka-space-5);
    padding: 0 var(--ishka-space-1);
    font-size: var(--ishka-text-xs);
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-white);
    background: var(--ishka-error-500);
    border-radius: var(--ishka-radius-full);
  }

  /* Content */
  .dashboard-content {
    flex: 1;
    overflow: auto;
    background: var(--ishka-bg-primary);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .header-content {
      flex-wrap: wrap;
      gap: var(--ishka-space-2);
    }
    
    .dashboard-title {
      font-size: var(--ishka-text-base);
    }
    
    .nav-tabs {
      flex-wrap: wrap;
    }
    
    .nav-tab {
      padding: var(--ishka-space-2) var(--ishka-space-3);
    }
  }
</style>