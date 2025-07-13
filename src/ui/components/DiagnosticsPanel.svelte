<script>
  import { onMount } from 'svelte';
  import { diagnosticStore, overallHealthStatus, categoryResults } from '../../store/index.js';
  import StatusIndicator from './StatusIndicator.svelte';
  import TestStatusPanel from './TestStatusPanel.svelte';

  let isLoading = false;
  let lastRefresh = '';
  let selectedCategory = 'all';

  const categories = [
    { id: 'all', name: 'All Tests', icon: '🔍' },
    { id: 'dom', name: 'DOM Health', icon: '🌐' },
    { id: 'api', name: 'Extension API', icon: '🔌' },
    { id: 'storage', name: 'Storage Systems', icon: '💾' },
    { id: 'worker', name: 'Worker Systems', icon: '⚙️' }
  ];

  onMount(() => {
    // Initial load
    refreshDiagnostics();
  });

  async function refreshDiagnostics() {
    isLoading = true;
    try {
      await diagnosticStore.runDiagnostics();
      lastRefresh = new Date().toLocaleTimeString();
    } catch (error) {
      console.error('[DiagnosticsPanel] Refresh failed:', error);
    } finally {
      isLoading = false;
    }
  }

  async function runSingleCategory(categoryId) {
    if (categoryId === 'all') {
      return refreshDiagnostics();
    }
    
    isLoading = true;
    try {
      await diagnosticStore.runDiagnostics([categoryId]);
      lastRefresh = new Date().toLocaleTimeString();
    } catch (error) {
      console.error('[DiagnosticsPanel] Category test failed:', error);
    } finally {
      isLoading = false;
    }
  }

  function handleCategorySelect(categoryId) {
    selectedCategory = categoryId;
  }

  $: overallStatus = $overallHealthStatus;
  $: results = $categoryResults;
  $: filteredResults = selectedCategory === 'all' 
    ? results 
    : { [selectedCategory]: results[selectedCategory] };
</script>

<div class="diagnostics-panel">
  <!-- Panel header -->
  <div class="panel-header">
    <div class="header-info">
      <h2 class="panel-title">System Diagnostics</h2>
      <div class="header-status">
        <StatusIndicator status={overallStatus} size="medium" showText={true} />
        {#if lastRefresh}
          <span class="last-refresh">Last updated: {lastRefresh}</span>
        {/if}
      </div>
    </div>
    
    <div class="header-actions">
      <button 
        class="refresh-btn" 
        class:loading={isLoading}
        on:click={refreshDiagnostics}
        disabled={isLoading}
      >
        {#if isLoading}
          <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="60" stroke-dashoffset="60"/>
          </svg>
        {:else}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="m20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
          </svg>
        {/if}
        <span>Refresh</span>
      </button>
    </div>
  </div>

  <!-- Category filters -->
  <div class="category-filters">
    {#each categories as category (category.id)}
      <button
        class="category-btn"
        class:active={selectedCategory === category.id}
        on:click={() => handleCategorySelect(category.id)}
      >
        <span class="category-icon">{category.icon}</span>
        <span class="category-name">{category.name}</span>
        {#if results[category.id] && category.id !== 'all'}
          <StatusIndicator 
            status={results[category.id].status} 
            size="small" 
          />
        {/if}
      </button>
    {/each}
  </div>

  <!-- Test results -->
  <div class="test-results">
    {#if isLoading}
      <div class="loading-state">
        <div class="loading-skeleton">
          <div class="skeleton-line skeleton-header"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line skeleton-short"></div>
        </div>
      </div>
    {:else if Object.keys(filteredResults).length === 0}
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3 class="empty-title">No diagnostic data available</h3>
        <p class="empty-description">Run diagnostics to see system health information</p>
        <button class="empty-action" on:click={refreshDiagnostics}>
          Run Diagnostics
        </button>
      </div>
    {:else}
      {#each Object.entries(filteredResults) as [categoryId, categoryData] (categoryId)}
        <div class="category-section">
          <div class="category-header">
            <h3 class="category-title">
              {categories.find(c => c.id === categoryId)?.name || categoryId}
            </h3>
            <div class="category-meta">
              <StatusIndicator status={categoryData.status} size="small" showText={true} />
              <span class="test-count">{categoryData.tests?.length || 0} tests</span>
            </div>
          </div>
          
          {#if categoryData.tests && categoryData.tests.length > 0}
            <TestStatusPanel tests={categoryData.tests} />
          {:else}
            <div class="no-tests">
              <p>No tests available for this category</p>
              <button 
                class="run-category-btn" 
                on:click={() => runSingleCategory(categoryId)}
              >
                Run {categoryId} tests
              </button>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .diagnostics-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--ishka-bg-primary);
  }

  /* Header */
  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--ishka-space-4);
    padding: var(--ishka-space-6);
    background: var(--ishka-bg-secondary);
    border-bottom: var(--ishka-border-width) solid var(--ishka-border-color);
  }

  .header-info {
    flex: 1;
  }

  .panel-title {
    margin: 0 0 var(--ishka-space-2) 0;
    font-size: var(--ishka-text-lg);
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-primary);
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-3);
  }

  .last-refresh {
    font-size: var(--ishka-text-xs);
    color: var(--ishka-text-tertiary);
  }

  .header-actions {
    display: flex;
    gap: var(--ishka-space-2);
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-2);
    padding: var(--ishka-space-2) var(--ishka-space-3);
    background: var(--ishka-accent-500);
    border: none;
    border-radius: var(--ishka-radius-md);
    color: var(--ishka-text-white);
    font-size: var(--ishka-text-sm);
    font-weight: var(--ishka-font-medium);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
  }

  .refresh-btn:hover:not(:disabled) {
    background: var(--ishka-accent-600);
  }

  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .refresh-btn.loading {
    pointer-events: none;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Category filters */
  .category-filters {
    display: flex;
    gap: var(--ishka-space-1);
    padding: var(--ishka-space-4);
    background: var(--ishka-bg-secondary);
    border-bottom: var(--ishka-border-width) solid var(--ishka-border-color);
    overflow-x: auto;
  }

  .category-btn {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-2);
    padding: var(--ishka-space-2) var(--ishka-space-3);
    background: var(--ishka-bg-primary);
    border: var(--ishka-border-width) solid var(--ishka-border-color);
    border-radius: var(--ishka-radius-md);
    color: var(--ishka-text-secondary);
    font-size: var(--ishka-text-sm);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
    white-space: nowrap;
  }

  .category-btn:hover {
    background: var(--ishka-bg-hover);
    border-color: var(--ishka-border-color-hover);
    color: var(--ishka-text-primary);
  }

  .category-btn.active {
    background: var(--ishka-accent-50);
    border-color: var(--ishka-accent-200);
    color: var(--ishka-accent-700);
  }

  .category-icon {
    font-size: var(--ishka-text-base);
  }

  .category-name {
    font-weight: var(--ishka-font-medium);
  }

  /* Test results */
  .test-results {
    flex: 1;
    overflow: auto;
    padding: var(--ishka-space-4);
  }

  .category-section {
    margin-bottom: var(--ishka-space-6);
  }

  .category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--ishka-space-4);
  }

  .category-title {
    margin: 0;
    font-size: var(--ishka-text-base);
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-primary);
  }

  .category-meta {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-3);
  }

  .test-count {
    font-size: var(--ishka-text-xs);
    color: var(--ishka-text-tertiary);
  }

  /* Loading state */
  .loading-state {
    padding: var(--ishka-space-8);
  }

  .loading-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--ishka-space-3);
  }

  .skeleton-line {
    height: var(--ishka-space-4);
    background: var(--ishka-bg-secondary);
    border-radius: var(--ishka-radius-sm);
    animation: skeleton-pulse 2s ease-in-out infinite;
  }

  .skeleton-header {
    height: var(--ishka-space-6);
    width: 40%;
  }

  .skeleton-short {
    width: 60%;
  }

  @keyframes skeleton-pulse {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--ishka-space-12) var(--ishka-space-4);
    text-align: center;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: var(--ishka-space-4);
  }

  .empty-title {
    margin: 0 0 var(--ishka-space-2) 0;
    font-size: var(--ishka-text-lg);
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-primary);
  }

  .empty-description {
    margin: 0 0 var(--ishka-space-6) 0;
    font-size: var(--ishka-text-sm);
    color: var(--ishka-text-secondary);
  }

  .empty-action,
  .run-category-btn {
    padding: var(--ishka-space-3) var(--ishka-space-4);
    background: var(--ishka-accent-500);
    border: none;
    border-radius: var(--ishka-radius-md);
    color: var(--ishka-text-white);
    font-size: var(--ishka-text-sm);
    font-weight: var(--ishka-font-medium);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
  }

  .empty-action:hover,
  .run-category-btn:hover {
    background: var(--ishka-accent-600);
  }

  .no-tests {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ishka-space-3);
    padding: var(--ishka-space-6);
    background: var(--ishka-bg-secondary);
    border: var(--ishka-border-width) solid var(--ishka-border-color);
    border-radius: var(--ishka-radius-lg);
    text-align: center;
  }

  .no-tests p {
    margin: 0;
    font-size: var(--ishka-text-sm);
    color: var(--ishka-text-secondary);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .panel-header {
      flex-direction: column;
      align-items: stretch;
      gap: var(--ishka-space-3);
    }

    .header-status {
      flex-wrap: wrap;
    }

    .category-filters {
      padding: var(--ishka-space-3);
    }

    .test-results {
      padding: var(--ishka-space-3);
    }
  }
</style>