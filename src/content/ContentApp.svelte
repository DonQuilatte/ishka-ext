<script>
  import { onMount } from 'svelte';
  import TelemetryPanel from '../ui/TelemetryPanel.svelte';
  import { telemetryActions } from '../store/telemetry-store.ts';
  
  export let eventBus;
  export let adapter;
  
  let isVisible = false;
  let currentSession = null;
  let isHealthy = true;
  let dashboardVisible = false;
  let telemetryVisible = false;
  
  onMount(() => {
    // Subscribe to session changes
    const unsubscribeSession = eventBus.on('session_changed', (session) => {
      currentSession = session;
      isVisible = !!session;
      // Track session change in telemetry
      telemetryActions.updateSessionMetrics(session);
      telemetryActions.recordEvent({
        type: 'session',
        subtype: session ? 'detected' : 'lost',
        data: session
      });
    });
    // Subscribe to dashboard toggle
    const unsubscribeDashboard = eventBus.on('toggle_dashboard', () => {
      dashboardVisible = !dashboardVisible;
    });
    // Subscribe to health status updates
    const unsubscribeHealth = eventBus.on('health_status_changed', (healthy) => {
      isHealthy = healthy;
    });
    // Subscribe to diagnostics requests
    const unsubscribeDiagnostics = eventBus.on('run_diagnostics', () => {
      runDiagnostics();
    });
    // Initial session detection
    detectSession();
    return () => {
      unsubscribeSession();
      unsubscribeDashboard();
      unsubscribeHealth();
      unsubscribeDiagnostics();
    };
  });
  async function detectSession() {
    try {
      const session = await adapter.detectCurrentSession();
      if (session) {
        currentSession = session;
        isVisible = true;
        eventBus.emit('session_changed', session);
      }
    } catch (error) {
      console.error('[Ishka] Failed to detect session:', error);
    }
  }
  function toggleDashboard() {
    dashboardVisible = !dashboardVisible;
    eventBus.emit('relay_to_background', {
      type: 'dashboard_toggled',
      payload: { visible: dashboardVisible }
    });
  }
  async function runDiagnostics() {
    try {
      eventBus.emit('relay_to_background', {
        type: 'diagnostics_requested',
        payload: { source: 'content_ui' }
      });
    } catch (error) {
      console.error('[Ishka] Failed to run diagnostics:', error);
    }
  }
  function exportData() {
    eventBus.emit('relay_to_background', {
      type: 'export_requested',
      payload: { format: 'json' }
    });
  }
</script>

<!-- Status Indicator (always visible when session detected) -->
{#if isVisible}
  <div class="ishka-status-indicator" class:healthy={isHealthy} class:unhealthy={!isHealthy}>
    <button 
      class="status-button"
      on:click={toggleDashboard}
      title="Ishka Extension - Click to toggle dashboard"
    >
      <div class="status-dot"></div>
      <span class="status-text">Ishka</span>
    </button>
  </div>
{/if}

<!-- Floating Dashboard -->
{#if dashboardVisible}
  <div class="ishka-dashboard">
    <div class="dashboard-header">
      <h3>Ishka Dashboard</h3>
      <button class="close-button" on:click={toggleDashboard}>×</button>
    </div>
    
    <div class="dashboard-content">
      {#if currentSession}
        <div class="session-info">
          <h4>Current Session</h4>
          <p>ID: {currentSession.conversationId}</p>
          <p>Messages: {currentSession.messageCount}</p>
          <p>Active: {currentSession.isActive ? 'Yes' : 'No'}</p>
        </div>
      {/if}
      
      <div class="health-status">
        <h4>System Health</h4>
        <div class="health-indicator" class:healthy={isHealthy} class:unhealthy={!isHealthy}>
          {isHealthy ? '✅ Healthy' : '⚠️ Issues Detected'}
        </div>
      </div>
      
      <div class="actions">
        <button class="action-button primary" on:click={runDiagnostics}>
          Run Diagnostics
        </button>
        <button class="action-button secondary" on:click={exportData}>
          Export Data
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .ishka-status-indicator {
    position: fixed;
    top: var(--ishka-space-4);
    right: var(--ishka-space-4);
    z-index: var(--ishka-z-toast);
  }
  
  .status-button {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-2);
    padding: var(--ishka-space-2) var(--ishka-space-3);
    background: var(--ishka-surface);
    border: 1px solid var(--ishka-border);
    border-radius: var(--ishka-radius-md);
    color: var(--ishka-text-primary);
    font-family: var(--ishka-font-family);
    font-size: var(--ishka-font-size-sm);
    font-weight: var(--ishka-font-weight-medium);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
    box-shadow: var(--ishka-shadow-sm);
  }
  
  .status-button:hover {
    background: var(--ishka-surface-secondary);
    box-shadow: var(--ishka-shadow-md);
  }
  
  .status-dot {
    width: var(--ishka-status-indicator-size);
    height: var(--ishka-status-indicator-size);
    border-radius: var(--ishka-radius-full);
    transition: background-color var(--ishka-transition-fast);
  }
  
  .healthy .status-dot {
    background-color: var(--ishka-status-pass);
  }
  
  .unhealthy .status-dot {
    background-color: var(--ishka-status-fail);
  }
  
  .status-text {
    font-size: var(--ishka-font-size-xs);
    color: var(--ishka-text-secondary);
  }
  
  .ishka-dashboard {
    position: fixed;
    top: var(--ishka-space-16);
    right: var(--ishka-space-4);
    width: 320px;
    max-height: 480px;
    background: var(--ishka-surface);
    border: 1px solid var(--ishka-border);
    border-radius: var(--ishka-radius-lg);
    box-shadow: var(--ishka-shadow-xl);
    z-index: var(--ishka-z-modal);
    overflow: hidden;
  }
  
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--ishka-space-4);
    background: var(--ishka-surface-secondary);
    border-bottom: 1px solid var(--ishka-border);
  }
  
  .dashboard-header h3 {
    margin: 0;
    font-size: var(--ishka-font-size-lg);
    font-weight: var(--ishka-font-weight-semibold);
    color: var(--ishka-text-primary);
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: var(--ishka-font-size-xl);
    color: var(--ishka-text-secondary);
    cursor: pointer;
    padding: 0;
    width: var(--ishka-space-6);
    height: var(--ishka-space-6);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--ishka-radius-sm);
    transition: all var(--ishka-transition-fast);
  }
  
  .close-button:hover {
    background: var(--ishka-border);
    color: var(--ishka-text-primary);
  }
  
  .dashboard-content {
    padding: var(--ishka-space-4);
    max-height: 400px;
    overflow-y: auto;
  }
  
  .session-info,
  .health-status {
    margin-bottom: var(--ishka-space-6);
  }
  
  .session-info h4,
  .health-status h4 {
    margin: 0 0 var(--ishka-space-3) 0;
    font-size: var(--ishka-font-size-base);
    font-weight: var(--ishka-font-weight-medium);
    color: var(--ishka-text-primary);
  }
  
  .session-info p {
    margin: var(--ishka-space-1) 0;
    font-size: var(--ishka-font-size-sm);
    color: var(--ishka-text-secondary);
    font-family: var(--ishka-font-family-mono);
  }
  
  .health-indicator {
    padding: var(--ishka-space-2) var(--ishka-space-3);
    border-radius: var(--ishka-radius-md);
    font-size: var(--ishka-font-size-sm);
    font-weight: var(--ishka-font-weight-medium);
  }
  
  .health-indicator.healthy {
    background: var(--ishka-status-pass-bg);
    color: var(--ishka-status-pass);
    border: 1px solid var(--ishka-status-pass-border);
  }
  
  .health-indicator.unhealthy {
    background: var(--ishka-status-fail-bg);
    color: var(--ishka-status-fail);
    border: 1px solid var(--ishka-status-fail-border);
  }
  
  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--ishka-space-3);
  }
  
  .action-button {
    padding: var(--ishka-space-3) var(--ishka-space-4);
    border-radius: var(--ishka-radius-md);
    font-family: var(--ishka-font-family);
    font-size: var(--ishka-font-size-sm);
    font-weight: var(--ishka-font-weight-medium);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
    border: 1px solid transparent;
  }
  
  .action-button.primary {
    background: var(--ishka-primary-500);
    color: white;
    border-color: var(--ishka-primary-500);
  }
  
  .action-button.primary:hover {
    background: var(--ishka-primary-600);
    border-color: var(--ishka-primary-600);
  }
  
  .action-button.secondary {
    background: var(--ishka-surface);
    color: var(--ishka-text-primary);
    border-color: var(--ishka-border);
  }
  
  .action-button.secondary:hover {
    background: var(--ishka-surface-secondary);
  }
</style>