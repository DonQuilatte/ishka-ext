<script>
  import StatusIndicator from '../ui/components/StatusIndicator.svelte';
  import TelemetryPanel from '../ui/TelemetryPanel.svelte';
  import SearchHistoryPanel from '../ui/SearchHistoryPanel.svelte';
  
  // Playground state for component testing
  let selectedComponent = 'status-indicator';
  let mockData = {
    status: {
      isConnected: true,
      lastUpdate: new Date().toISOString(),
      errorCount: 0,
      sessionActive: true
    },
    telemetry: {
      sessionsToday: 5,
      searchesPerformed: 23,
      averageSessionTime: '4m 32s',
      topDomains: ['example.com', 'github.com', 'stackoverflow.com']
    },
    searchHistory: [
      { query: 'chrome extension testing', timestamp: Date.now() - 300000, domain: 'stackoverflow.com' },
      { query: 'svelte 5 components', timestamp: Date.now() - 600000, domain: 'github.com' },
      { query: 'playwright visual testing', timestamp: Date.now() - 900000, domain: 'playwright.dev' }
    ]
  };
</script>

<div class="playground">
  <nav class="component-selector">
    <h2>Component Playground</h2>
    <div class="selector-buttons">
      <button 
        class:active={selectedComponent === 'status-indicator'} 
        on:click={() => selectedComponent = 'status-indicator'}
      >
        Status Indicator
      </button>
      <button 
        class:active={selectedComponent === 'telemetry-panel'} 
        on:click={() => selectedComponent = 'telemetry-panel'}
      >
        Telemetry Panel
      </button>
      <button 
        class:active={selectedComponent === 'search-history'} 
        on:click={() => selectedComponent = 'search-history'}
      >
        Search History
      </button>
    </div>
  </nav>

  <main class="component-display" data-testid="playground-component">
    {#if selectedComponent === 'status-indicator'}
      <div class="component-container" data-component="status-indicator">
        <h3>Status Indicator Component</h3>
        <StatusIndicator 
          isConnected={mockData.status.isConnected}
          lastUpdate={mockData.status.lastUpdate}
          errorCount={mockData.status.errorCount}
        />
        
        <div class="mock-controls">
          <label>
            <input type="checkbox" bind:checked={mockData.status.isConnected} />
            Connected
          </label>
          <label>
            Error Count: 
            <input type="number" bind:value={mockData.status.errorCount} min="0" max="10" />
          </label>
        </div>
      </div>
    {/if}

    {#if selectedComponent === 'telemetry-panel'}
      <div class="component-container" data-component="telemetry-panel">
        <h3>Telemetry Panel Component</h3>
        <TelemetryPanel />
        
        <div class="mock-controls">
          <p>Mock data: {JSON.stringify(mockData.telemetry, null, 2)}</p>
        </div>
      </div>
    {/if}

    {#if selectedComponent === 'search-history'}
      <div class="component-container" data-component="search-history">
        <h3>Search History Panel Component</h3>
        <SearchHistoryPanel />
        
        <div class="mock-controls">
          <p>Mock searches: {mockData.searchHistory.length} entries</p>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .playground {
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .component-selector {
    background: #f5f5f5;
    padding: 1rem;
    border-bottom: 1px solid #ddd;
  }

  .component-selector h2 {
    margin: 0 0 1rem 0;
    color: #333;
  }

  .selector-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .selector-buttons button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .selector-buttons button:hover {
    background: #e9e9e9;
  }

  .selector-buttons button.active {
    background: #0066cc;
    color: white;
    border-color: #0066cc;
  }

  .component-display {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }

  .component-container {
    max-width: 600px;
    margin: 0 auto;
  }

  .component-container h3 {
    margin-bottom: 1rem;
    color: #333;
    border-bottom: 2px solid #0066cc;
    padding-bottom: 0.5rem;
  }

  .mock-controls {
    margin-top: 2rem;
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 4px;
    border: 1px solid #ddd;
  }

  .mock-controls label {
    display: block;
    margin-bottom: 0.5rem;
  }

  .mock-controls input[type="checkbox"] {
    margin-right: 0.5rem;
  }

  .mock-controls input[type="number"] {
    margin-left: 0.5rem;
    padding: 0.25rem;
    border: 1px solid #ccc;
    border-radius: 2px;
    width: 60px;
  }

  .mock-controls p {
    margin: 0;
    font-size: 0.9rem;
    color: #666;
    white-space: pre-wrap;
  }
</style>