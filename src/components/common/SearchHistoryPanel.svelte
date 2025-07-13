<script lang="ts">
  import { onMount } from 'svelte';
  import { writable, derived } from 'svelte/store';
  import type { 
    DiagnosticResult, 
    DiagnosticCategory, 
    ChatGPTSession,
    SystemHealth 
  } from '../../utils/types.js';
  import { diagnosticStore, categoryResults } from '../../store/diagnostic-store.js';
  import { eventBus } from '../../utils/event-bus.js';
  import FilterDropdown from './inputs/FilterDropdown.svelte';
  import type { FilterOption } from './types.js';

  interface SearchHistoryPanelProps {
    /** Show search input */
    showSearch?: boolean;
    /** Show history timeline */
    showHistory?: boolean;
    /** Show diagnostics filters */
    showDiagnosticsFilter?: boolean;
    /** Show token usage information */
    showTokens?: boolean;
    /** Maximum number of history items to display */
    maxHistoryItems?: number;
    /** Compact layout mode */
    compact?: boolean;
  }

  interface HistoryItem {
    id: string;
    type: 'session' | 'diagnostic' | 'error';
    title: string;
    timestamp: string;
    status?: 'pass' | 'fail' | 'warning';
    category?: DiagnosticCategory;
    data?: any;
  }

  interface TokenUsage {
    prompt: number;
    completion: number;
    total: number;
    cost?: number;
  }

  interface SearchFilter {
    query: string;
    category: DiagnosticCategory | 'all';
    status: 'all' | 'pass' | 'fail' | 'warning';
    dateRange: 'all' | 'today' | 'week' | 'month';
    type: 'all' | 'session' | 'diagnostic' | 'error';
  }

  const { 
    showSearch = true, 
    showHistory = true, 
    showDiagnosticsFilter = true,
    showTokens = false,
    maxHistoryItems = 50,
    compact = false
  }: SearchHistoryPanelProps = $props();

  // Store state
  const searchFilter = writable<SearchFilter>({
    query: '',
    category: 'all',
    status: 'all',
    dateRange: 'all',
    type: 'all'
  });

  const historyItems = writable<HistoryItem[]>([]);
  const sessions = writable<ChatGPTSession[]>([]);
  const tokenUsage = writable<TokenUsage>({ prompt: 0, completion: 0, total: 0 });
  const isLoading = writable(false);
  const expandedItems = writable<Set<string>>(new Set());

  // Derived stores
  const filteredHistory = derived(
    [historyItems, searchFilter],
    ([$items, $filter]) => {
      let filtered = $items;

      // Text search
      if ($filter.query) {
        const query = $filter.query.toLowerCase();
        filtered = filtered.filter(item => 
          item.title.toLowerCase().includes(query) ||
          JSON.stringify(item.data).toLowerCase().includes(query)
        );
      }

      // Category filter
      if ($filter.category !== 'all') {
        filtered = filtered.filter(item => item.category === $filter.category);
      }

      // Status filter
      if ($filter.status !== 'all') {
        filtered = filtered.filter(item => item.status === $filter.status);
      }

      // Type filter
      if ($filter.type !== 'all') {
        filtered = filtered.filter(item => item.type === $filter.type);
      }

      // Date range filter
      if ($filter.dateRange !== 'all') {
        const now = new Date();
        const cutoff = new Date();
        
        switch ($filter.dateRange) {
          case 'today':
            cutoff.setHours(0, 0, 0, 0);
            break;
          case 'week':
            cutoff.setDate(now.getDate() - 7);
            break;
          case 'month':
            cutoff.setMonth(now.getMonth() - 1);
            break;
        }

        filtered = filtered.filter(item => 
          new Date(item.timestamp) >= cutoff
        );
      }

      return filtered
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxHistoryItems);
    }
  );

  const searchStats = derived(
    filteredHistory,
    ($filtered) => {
      const stats = {
        total: $filtered.length,
        sessions: 0,
        diagnostics: 0,
        errors: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      };

      $filtered.forEach(item => {
        stats[item.type as keyof typeof stats]++;
        if (item.status) {
          stats[item.status === 'pass' ? 'passed' : item.status === 'fail' ? 'failed' : 'warnings']++;
        }
      });

      return stats;
    }
  );

  // Filter options
  const categoryOptions: FilterOption[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'dom', label: 'DOM' },
    { value: 'api', label: 'API' },
    { value: 'storage', label: 'Storage' },
    { value: 'worker', label: 'Worker' },
    { value: 'performance', label: 'Performance' },
    { value: 'security', label: 'Security' }
  ];

  const statusOptions: FilterOption[] = [
    { value: 'all', label: 'All Status' },
    { value: 'pass', label: 'Pass' },
    { value: 'fail', label: 'Fail' },
    { value: 'warning', label: 'Warning' }
  ];

  const typeOptions: FilterOption[] = [
    { value: 'all', label: 'All Types' },
    { value: 'session', label: 'Sessions' },
    { value: 'diagnostic', label: 'Diagnostics' },
    { value: 'error', label: 'Errors' }
  ];

  const dateRangeOptions: FilterOption[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Past Week' },
    { value: 'month', label: 'Past Month' }
  ];

  // Functions
  async function loadHistoryData() {
    isLoading.set(true);
    try {
      // Load diagnostic history from background script
      const diagnosticHistory = await chrome.runtime.sendMessage({
        type: 'get-diagnostic-log'
      });

      // Load ChatGPT sessions
      const sessionHistory = await chrome.runtime.sendMessage({
        type: 'get-session-history'
      });

      // Load error history
      const errorHistory = await chrome.runtime.sendMessage({
        type: 'get-error-log'
      });

      // Combine all history items
      const allItems: HistoryItem[] = [
        ...(diagnosticHistory?.data || []).map((result: DiagnosticResult) => ({
          id: `diagnostic-${result.timestamp}`,
          type: 'diagnostic' as const,
          title: `${result.category}: ${result.message}`,
          timestamp: result.timestamp,
          status: result.status,
          category: result.category as DiagnosticCategory,
          data: result
        })),
        ...(sessionHistory?.data || []).map((session: ChatGPTSession) => ({
          id: `session-${session.conversationId}`,
          type: 'session' as const,
          title: session.title,
          timestamp: session.updatedAt,
          data: session
        })),
        ...(errorHistory?.data || []).map((error: any) => ({
          id: `error-${error.timestamp}`,
          type: 'error' as const,
          title: `${error.type}: ${error.message}`,
          timestamp: error.timestamp,
          status: 'fail' as const,
          data: error
        }))
      ];

      historyItems.set(allItems);
    } catch (error) {
      console.error('[SearchHistoryPanel] Failed to load history:', error);
    } finally {
      isLoading.set(false);
    }
  }

  async function loadTokenUsage() {
    try {
      const usage = await chrome.runtime.sendMessage({
        type: 'get-token-usage'
      });

      if (usage?.data) {
        tokenUsage.set(usage.data);
      }
    } catch (error) {
      console.error('[SearchHistoryPanel] Failed to load token usage:', error);
    }
  }

  function clearSearch() {
    searchFilter.update(filter => ({ ...filter, query: '' }));
  }

  function clearAllFilters() {
    searchFilter.set({
      query: '',
      category: 'all',
      status: 'all',
      dateRange: 'all',
      type: 'all'
    });
  }

  function toggleItemExpansion(itemId: string) {
    expandedItems.update(expanded => {
      const newExpanded = new Set(expanded);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      return newExpanded;
    });
  }

  function exportHistory() {
    const data = $filteredHistory;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ishka-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getStatusColor(status?: string): string {
    switch (status) {
      case 'pass': return 'var(--ishka-status-pass)';
      case 'fail': return 'var(--ishka-status-fail)';
      case 'warning': return 'var(--ishka-status-warning)';
      default: return 'var(--ishka-text-muted)';
    }
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${Math.floor(hours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  onMount(() => {
    loadHistoryData();
    if (showTokens) {
      loadTokenUsage();
    }

    // Listen for real-time updates
    const unsubscribeDiagnostic = eventBus.on('diagnostics:completed', loadHistoryData);
    const unsubscribeSession = eventBus.on('session:updated', loadHistoryData);
    const unsubscribeError = eventBus.on('error:reported', loadHistoryData);

    return () => {
      unsubscribeDiagnostic();
      unsubscribeSession();
      unsubscribeError();
    };
  });
</script>

<div class="ishka-root">
  <div class="search-history-panel" class:compact>
    <!-- Search Section -->
    {#if showSearch}
      <div class="search-section">
        <div class="search-header">
          <h3 class="section-title">Search & Filter</h3>
          <div class="search-actions">
            <button type="button" class="action-button" onclick={clearAllFilters}>
              Clear All
            </button>
            <button type="button" class="action-button" onclick={exportHistory}>
              Export
            </button>
          </div>
        </div>

        <!-- Search Input -->
        <div class="search-input-container">
          <input
            type="text"
            class="search-input"
            placeholder="Search history, diagnostics, sessions..."
            bind:value={$searchFilter.query}
          />
          {#if $searchFilter.query}
            <button type="button" class="clear-search-button" onclick={clearSearch}>
              ×
            </button>
          {/if}
        </div>

        <!-- Filter Controls -->
        {#if showDiagnosticsFilter}
          <div class="filter-controls">
            <FilterDropdown
              label="Category"
              options={categoryOptions}
              value={$searchFilter.category}
              onChange={(value) => searchFilter.update(f => ({ ...f, category: value as DiagnosticCategory | 'all' }))}
              compact={compact}
            />

            <FilterDropdown
              label="Status"
              options={statusOptions}
              value={$searchFilter.status}
              onChange={(value) => searchFilter.update(f => ({ ...f, status: value as 'all' | 'pass' | 'fail' | 'warning' }))}
              compact={compact}
            />

            <FilterDropdown
              label="Type"
              options={typeOptions}
              value={$searchFilter.type}
              onChange={(value) => searchFilter.update(f => ({ ...f, type: value as 'all' | 'session' | 'diagnostic' | 'error' }))}
              compact={compact}
            />

            <FilterDropdown
              label="Date Range"
              options={dateRangeOptions}
              value={$searchFilter.dateRange}
              onChange={(value) => searchFilter.update(f => ({ ...f, dateRange: value as 'all' | 'today' | 'week' | 'month' }))}
              compact={compact}
            />
          </div>
        {/if}

        <!-- Search Stats -->
        <div class="search-stats">
          <div class="stat-item">
            <span class="stat-value">{$searchStats.total}</span>
            <span class="stat-label">Total Items</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{$searchStats.sessions}</span>
            <span class="stat-label">Sessions</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{$searchStats.diagnostics}</span>
            <span class="stat-label">Diagnostics</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{$searchStats.errors}</span>
            <span class="stat-label">Errors</span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Token Usage Section -->
    {#if showTokens}
      <div class="token-section">
        <div class="section-header">
          <h3 class="section-title">Token Usage</h3>
        </div>
        <div class="token-stats">
          <div class="token-stat">
            <span class="token-label">Prompt</span>
            <span class="token-value">{$tokenUsage.prompt.toLocaleString()}</span>
          </div>
          <div class="token-stat">
            <span class="token-label">Completion</span>
            <span class="token-value">{$tokenUsage.completion.toLocaleString()}</span>
          </div>
          <div class="token-stat">
            <span class="token-label">Total</span>
            <span class="token-value">{$tokenUsage.total.toLocaleString()}</span>
          </div>
          {#if $tokenUsage.cost}
            <div class="token-stat">
              <span class="token-label">Cost</span>
              <span class="token-value">${$tokenUsage.cost.toFixed(4)}</span>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- History Timeline -->
    {#if showHistory}
      <div class="history-section">
        <div class="section-header">
          <h3 class="section-title">History Timeline</h3>
          {#if $isLoading}
            <div class="loading-spinner"></div>
          {/if}
        </div>

        {#if $filteredHistory.length === 0}
          <div class="empty-state">
            <p class="empty-message">No history items found</p>
            <p class="empty-description">
              {$searchFilter.query || $searchFilter.category !== 'all' || $searchFilter.status !== 'all' 
                ? 'Try adjusting your search filters' 
                : 'History will appear here as you use the extension'}
            </p>
          </div>
        {:else}
          <div class="timeline">
            {#each $filteredHistory as item (item.id)}
              <div class="timeline-item" class:expanded={$expandedItems.has(item.id)}>
                <div class="timeline-marker" style="background-color: {getStatusColor(item.status)}"></div>
                
                <div class="timeline-content">
                  <div class="timeline-header" onclick={() => toggleItemExpansion(item.id)}>
                    <div class="timeline-title-row">
                      <span class="timeline-type-badge" class:session={item.type === 'session'} 
                            class:diagnostic={item.type === 'diagnostic'} class:error={item.type === 'error'}>
                        {item.type}
                      </span>
                      <h4 class="timeline-title">{item.title}</h4>
                      {#if item.status}
                        <span class="timeline-status" style="color: {getStatusColor(item.status)}">
                          {item.status}
                        </span>
                      {/if}
                    </div>
                    <div class="timeline-meta">
                      <span class="timeline-timestamp">{formatTimestamp(item.timestamp)}</span>
                      {#if item.category}
                        <span class="timeline-category">{item.category}</span>
                      {/if}
                      <button type="button" class="expand-button">
                        {$expandedItems.has(item.id) ? '−' : '+'}
                      </button>
                    </div>
                  </div>

                  {#if $expandedItems.has(item.id)}
                    <div class="timeline-details">
                      <pre class="details-data">{JSON.stringify(item.data, null, 2)}</pre>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .ishka-root {
    font-family: var(--ishka-font-family);
    color: var(--ishka-text-primary);
  }

  .search-history-panel {
    background-color: var(--ishka-surface);
    border-radius: var(--ishka-radius-lg);
    box-shadow: var(--ishka-shadow-md);
    overflow: hidden;
  }

  .search-history-panel.compact {
    border-radius: var(--ishka-radius-md);
    box-shadow: var(--ishka-shadow-sm);
  }

  /* Search Section */
  .search-section {
    padding: var(--ishka-space-6);
    border-bottom: 1px solid var(--ishka-border);
  }

  .search-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--ishka-space-4);
  }

  .section-title {
    font-size: var(--ishka-font-size-lg);
    font-weight: var(--ishka-font-weight-semibold);
    margin: 0;
    color: var(--ishka-text-primary);
  }

  .search-actions {
    display: flex;
    gap: var(--ishka-space-2);
  }

  .action-button {
    background: none;
    border: 1px solid var(--ishka-border);
    border-radius: var(--ishka-radius-base);
    padding: var(--ishka-space-2) var(--ishka-space-3);
    color: var(--ishka-text-secondary);
    font-size: var(--ishka-font-size-sm);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
  }

  .action-button:hover {
    background-color: var(--ishka-surface-secondary);
    color: var(--ishka-text-primary);
  }

  .search-input-container {
    position: relative;
    margin-bottom: var(--ishka-space-4);
  }

  .search-input {
    width: 100%;
    height: var(--ishka-input-height-base);
    padding: var(--ishka-space-3) var(--ishka-space-4);
    border: 1px solid var(--ishka-border);
    border-radius: var(--ishka-radius-md);
    background-color: var(--ishka-surface);
    color: var(--ishka-text-primary);
    font-size: var(--ishka-font-size-base);
    transition: border-color var(--ishka-transition-fast);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--ishka-border-focus);
  }

  .clear-search-button {
    position: absolute;
    right: var(--ishka-space-3);
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--ishka-text-muted);
    font-size: var(--ishka-font-size-lg);
    cursor: pointer;
    width: var(--ishka-space-6);
    height: var(--ishka-space-6);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--ishka-radius-base);
    transition: all var(--ishka-transition-fast);
  }

  .clear-search-button:hover {
    color: var(--ishka-text-primary);
    background-color: var(--ishka-surface-secondary);
  }

  .filter-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--ishka-space-3);
    margin-bottom: var(--ishka-space-4);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--ishka-space-1);
  }

  .filter-label {
    font-size: var(--ishka-font-size-sm);
    font-weight: var(--ishka-font-weight-medium);
    color: var(--ishka-text-secondary);
  }

  .filter-select {
    height: var(--ishka-input-height-sm);
    padding: var(--ishka-space-1) var(--ishka-space-2);
    border: 1px solid var(--ishka-border);
    border-radius: var(--ishka-radius-base);
    background-color: var(--ishka-surface);
    color: var(--ishka-text-primary);
    font-size: var(--ishka-font-size-sm);
    cursor: pointer;
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--ishka-border-focus);
  }

  .search-stats {
    display: flex;
    gap: var(--ishka-space-6);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ishka-space-1);
  }

  .stat-value {
    font-size: var(--ishka-font-size-xl);
    font-weight: var(--ishka-font-weight-bold);
    color: var(--ishka-primary-600);
  }

  .stat-label {
    font-size: var(--ishka-font-size-xs);
    color: var(--ishka-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Token Section */
  .token-section {
    padding: var(--ishka-space-6);
    border-bottom: 1px solid var(--ishka-border);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--ishka-space-4);
  }

  .token-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--ishka-space-4);
  }

  .token-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--ishka-space-3);
    background-color: var(--ishka-surface-secondary);
    border-radius: var(--ishka-radius-md);
    gap: var(--ishka-space-1);
  }

  .token-label {
    font-size: var(--ishka-font-size-sm);
    color: var(--ishka-text-secondary);
    font-weight: var(--ishka-font-weight-medium);
  }

  .token-value {
    font-size: var(--ishka-font-size-lg);
    font-weight: var(--ishka-font-weight-bold);
    color: var(--ishka-text-primary);
    font-family: var(--ishka-font-family-mono);
  }

  /* History Section */
  .history-section {
    padding: var(--ishka-space-6);
  }

  .loading-spinner {
    width: var(--ishka-space-4);
    height: var(--ishka-space-4);
    border: 2px solid var(--ishka-border);
    border-top-color: var(--ishka-primary-500);
    border-radius: var(--ishka-radius-full);
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-state {
    text-align: center;
    padding: var(--ishka-space-12) var(--ishka-space-6);
  }

  .empty-message {
    font-size: var(--ishka-font-size-lg);
    font-weight: var(--ishka-font-weight-medium);
    color: var(--ishka-text-primary);
    margin: 0 0 var(--ishka-space-2) 0;
  }

  .empty-description {
    font-size: var(--ishka-font-size-base);
    color: var(--ishka-text-muted);
    margin: 0;
  }

  .timeline {
    position: relative;
  }

  .timeline::before {
    content: '';
    position: absolute;
    left: var(--ishka-space-2);
    top: 0;
    bottom: 0;
    width: 2px;
    background-color: var(--ishka-border);
  }

  .timeline-item {
    position: relative;
    margin-bottom: var(--ishka-space-4);
    padding-left: var(--ishka-space-8);
  }

  .timeline-marker {
    position: absolute;
    left: 0;
    top: var(--ishka-space-3);
    width: var(--ishka-space-4);
    height: var(--ishka-space-4);
    border-radius: var(--ishka-radius-full);
    border: 2px solid var(--ishka-surface);
    z-index: 1;
  }

  .timeline-content {
    background-color: var(--ishka-surface-secondary);
    border-radius: var(--ishka-radius-md);
    border: 1px solid var(--ishka-border);
    overflow: hidden;
    transition: all var(--ishka-transition-base);
  }

  .timeline-item.expanded .timeline-content {
    box-shadow: var(--ishka-shadow-md);
  }

  .timeline-header {
    padding: var(--ishka-space-4);
    cursor: pointer;
    transition: background-color var(--ishka-transition-fast);
  }

  .timeline-header:hover {
    background-color: var(--ishka-surface);
  }

  .timeline-title-row {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-3);
    margin-bottom: var(--ishka-space-2);
  }

  .timeline-type-badge {
    display: inline-block;
    padding: var(--ishka-space-1) var(--ishka-space-2);
    border-radius: var(--ishka-radius-base);
    font-size: var(--ishka-font-size-xs);
    font-weight: var(--ishka-font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .timeline-type-badge.session {
    background-color: var(--ishka-primary-100);
    color: var(--ishka-primary-700);
  }

  .timeline-type-badge.diagnostic {
    background-color: var(--ishka-warning-100);
    color: var(--ishka-warning-700);
  }

  .timeline-type-badge.error {
    background-color: var(--ishka-error-100);
    color: var(--ishka-error-700);
  }

  .timeline-title {
    flex: 1;
    font-size: var(--ishka-font-size-base);
    font-weight: var(--ishka-font-weight-medium);
    color: var(--ishka-text-primary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timeline-status {
    font-size: var(--ishka-font-size-sm);
    font-weight: var(--ishka-font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .timeline-meta {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-3);
  }

  .timeline-timestamp {
    font-size: var(--ishka-font-size-sm);
    color: var(--ishka-text-muted);
  }

  .timeline-category {
    font-size: var(--ishka-font-size-xs);
    color: var(--ishka-text-secondary);
    background-color: var(--ishka-surface);
    padding: var(--ishka-space-1) var(--ishka-space-2);
    border-radius: var(--ishka-radius-base);
  }

  .expand-button {
    background: none;
    border: none;
    color: var(--ishka-text-muted);
    font-size: var(--ishka-font-size-lg);
    font-weight: var(--ishka-font-weight-bold);
    cursor: pointer;
    width: var(--ishka-space-6);
    height: var(--ishka-space-6);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--ishka-radius-base);
    transition: all var(--ishka-transition-fast);
    margin-left: auto;
  }

  .expand-button:hover {
    background-color: var(--ishka-surface);
    color: var(--ishka-text-primary);
  }

  .timeline-details {
    border-top: 1px solid var(--ishka-border);
    padding: var(--ishka-space-4);
    background-color: var(--ishka-surface);
  }

  .details-data {
    font-family: var(--ishka-font-family-mono);
    font-size: var(--ishka-font-size-sm);
    color: var(--ishka-text-secondary);
    background-color: var(--ishka-surface-secondary);
    padding: var(--ishka-space-3);
    border-radius: var(--ishka-radius-base);
    border: 1px solid var(--ishka-border);
    white-space: pre-wrap;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
    margin: 0;
  }

  /* Compact mode adjustments */
  .compact .search-section,
  .compact .token-section,
  .compact .history-section {
    padding: var(--ishka-space-4);
  }

  .compact .filter-controls {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--ishka-space-2);
  }

  .compact .search-stats {
    gap: var(--ishka-space-4);
  }

  .compact .timeline-item {
    margin-bottom: var(--ishka-space-3);
    padding-left: var(--ishka-space-6);
  }

  .compact .timeline-header {
    padding: var(--ishka-space-3);
  }

  .compact .timeline-details {
    padding: var(--ishka-space-3);
  }
</style>