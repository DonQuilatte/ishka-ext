<script>
  import { onMount } from 'svelte';
  import { diagnosticStore } from '../../store/index.js';
  import StatusIndicator from './StatusIndicator.svelte';

  let storageData = {
    localStorage: { used: 0, quota: 0, status: 'unknown' },
    sessionStorage: { used: 0, quota: 0, status: 'unknown' },
    indexedDB: { used: 0, quota: 0, status: 'unknown' },
    chromeStorage: { used: 0, quota: 0, status: 'unknown' }
  };
  
  let isLoading = true;
  let lastRefresh = '';

  onMount(() => {
    loadStorageInfo();
  });

  async function loadStorageInfo() {
    isLoading = true;
    try {
      // Run storage diagnostics
      await diagnosticStore.runDiagnostics(['storage']);
      
      // Get actual storage usage
      await checkStorageUsage();
      
      lastRefresh = new Date().toLocaleTimeString();
    } catch (error) {
      console.error('[StoragePanel] Failed to load storage info:', error);
    } finally {
      isLoading = false;
    }
  }

  async function checkStorageUsage() {
    try {
      // Check localStorage
      if (typeof localStorage !== 'undefined') {
        const localUsed = JSON.stringify(localStorage).length;
        storageData.localStorage = {
          used: localUsed,
          quota: 5 * 1024 * 1024, // 5MB typical limit
          status: 'pass'
        };
      }

      // Check sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        const sessionUsed = JSON.stringify(sessionStorage).length;
        storageData.sessionStorage = {
          used: sessionUsed,
          quota: 5 * 1024 * 1024, // 5MB typical limit
          status: 'pass'
        };
      }

      // Check Chrome storage API
      if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
          const { bytesInUse } = await chrome.storage.local.getBytesInUse();
          storageData.chromeStorage = {
            used: bytesInUse || 0,
            quota: chrome.storage.local.QUOTA_BYTES || 5242880, // 5MB default
            status: 'pass'
          };
        } catch {
          storageData.chromeStorage.status = 'fail';
        }
      }

      // Check IndexedDB quota
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          storageData.indexedDB = {
            used: estimate.usage || 0,
            quota: estimate.quota || 0,
            status: 'pass'
          };
        } catch {
          storageData.indexedDB.status = 'fail';
        }
      }

    } catch (error) {
      console.error('[StoragePanel] Storage check failed:', error);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getUsagePercentage(used, quota) {
    if (!quota) return 0;
    return Math.min((used / quota) * 100, 100);
  }

  function getUsageStatus(percentage) {
    if (percentage < 50) return 'pass';
    if (percentage < 80) return 'warning';
    return 'fail';
  }

  async function clearStorage(storageType) {
    try {
      switch (storageType) {
        case 'localStorage':
          if (confirm('Clear all localStorage data? This action cannot be undone.')) {
            localStorage.clear();
          }
          break;
        case 'sessionStorage':
          if (confirm('Clear all sessionStorage data? This action cannot be undone.')) {
            sessionStorage.clear();
          }
          break;
        case 'chromeStorage':
          if (confirm('Clear Chrome extension storage? This action cannot be undone.') && typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.clear();
          }
          break;
        case 'indexedDB':
          alert('IndexedDB clearing requires specific database operations. Use browser DevTools for manual clearing.');
          break;
      }
      
      // Refresh after clearing
      setTimeout(loadStorageInfo, 500);
    } catch (error) {
      console.error(`[StoragePanel] Failed to clear ${storageType}:`, error);
    }
  }
</script>

<div class="storage-panel">
  <!-- Panel header -->
  <div class="panel-header">
    <div class="header-info">
      <h2 class="panel-title">Storage Management</h2>
      {#if lastRefresh}
        <span class="last-refresh">Last updated: {lastRefresh}</span>
      {/if}
    </div>
    
    <div class="header-actions">
      <button 
        class="refresh-btn" 
        class:loading={isLoading}
        on:click={loadStorageInfo}
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

  <!-- Storage breakdown -->
  <div class="storage-content">
    {#if isLoading}
      <div class="loading-state">
        <div class="loading-skeleton">
          <div class="skeleton-line skeleton-header"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line skeleton-short"></div>
        </div>
      </div>
    {:else}
      <div class="storage-grid">
        {#each Object.entries(storageData) as [storageType, data] (storageType)}
          {@const percentage = getUsagePercentage(data.used, data.quota)}
          {@const usageStatus = getUsageStatus(percentage)}
          
          <div class="storage-card">
            <div class="card-header">
              <h3 class="storage-type">
                {storageType === 'localStorage' ? 'Local Storage' :
                 storageType === 'sessionStorage' ? 'Session Storage' :
                 storageType === 'indexedDB' ? 'IndexedDB' :
                 storageType === 'chromeStorage' ? 'Chrome Storage' : storageType}
              </h3>
              <StatusIndicator status={data.status} size="small" />
            </div>
            
            <div class="usage-info">
              <div class="usage-stats">
                <span class="used">{formatBytes(data.used)}</span>
                {#if data.quota > 0}
                  <span class="quota">/ {formatBytes(data.quota)}</span>
                {:else}
                  <span class="quota">/ Unknown limit</span>
                {/if}
              </div>
              
              {#if data.quota > 0}
                <div class="usage-bar">
                  <div 
                    class="usage-fill {usageStatus}" 
                    style="width: {percentage}%"
                  ></div>
                </div>
                <div class="usage-percentage">
                  <span class="percentage {usageStatus}">{percentage.toFixed(1)}%</span>
                  <span class="status-text">
                    {usageStatus === 'pass' ? 'Good' : 
                     usageStatus === 'warning' ? 'High' : 'Critical'}
                  </span>
                </div>
              {/if}
            </div>

            <div class="card-actions">
              {#if storageType !== 'indexedDB'}
                <button 
                  class="clear-btn"
                  on:click={() => clearStorage(storageType)}
                  disabled={data.used === 0}
                >
                  Clear Data
                </button>
              {:else}
                <button class="inspect-btn" disabled>
                  Use DevTools
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <!-- Storage tips -->
      <div class="storage-tips">
        <h3 class="tips-title">Storage Management Tips</h3>
        <ul class="tips-list">
          <li>
            <strong>Local Storage:</strong> Persists until manually cleared. Good for user preferences.
          </li>
          <li>
            <strong>Session Storage:</strong> Cleared when tab closes. Use for temporary data.
          </li>
          <li>
            <strong>Chrome Storage:</strong> Extension-specific storage with sync capabilities.
          </li>
          <li>
            <strong>IndexedDB:</strong> Large data storage. Clear specific databases in DevTools.
          </li>
        </ul>
      </div>
    {/if}
  </div>
</div>

<style>
  .storage-panel {
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
    margin: 0 0 var(--ishka-space-1) 0;
    font-size: var(--ishka-text-lg);
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-primary);
  }

  .last-refresh {
    font-size: var(--ishka-text-xs);
    color: var(--ishka-text-tertiary);
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

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Content */
  .storage-content {
    flex: 1;
    overflow: auto;
    padding: var(--ishka-space-6);
  }

  .storage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--ishka-space-4);
    margin-bottom: var(--ishka-space-8);
  }

  .storage-card {
    padding: var(--ishka-space-4);
    background: var(--ishka-bg-secondary);
    border: var(--ishka-border-width) solid var(--ishka-border-color);
    border-radius: var(--ishka-radius-lg);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--ishka-space-3);
  }

  .storage-type {
    margin: 0;
    font-size: var(--ishka-text-base);
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-primary);
  }

  .usage-info {
    margin-bottom: var(--ishka-space-4);
  }

  .usage-stats {
    display: flex;
    align-items: baseline;
    gap: var(--ishka-space-1);
    margin-bottom: var(--ishka-space-2);
  }

  .used {
    font-size: var(--ishka-text-lg);
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-primary);
  }

  .quota {
    font-size: var(--ishka-text-sm);
    color: var(--ishka-text-secondary);
  }

  .usage-bar {
    width: 100%;
    height: var(--ishka-space-2);
    background: var(--ishka-bg-tertiary);
    border-radius: var(--ishka-radius-full);
    overflow: hidden;
    margin-bottom: var(--ishka-space-1);
  }

  .usage-fill {
    height: 100%;
    border-radius: var(--ishka-radius-full);
    transition: all var(--ishka-transition-normal);
  }

  .usage-fill.pass {
    background: var(--ishka-status-pass);
  }

  .usage-fill.warning {
    background: var(--ishka-status-warning);
  }

  .usage-fill.fail {
    background: var(--ishka-status-fail);
  }

  .usage-percentage {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--ishka-text-xs);
  }

  .percentage {
    font-weight: var(--ishka-font-semibold);
  }

  .percentage.pass {
    color: var(--ishka-status-pass);
  }

  .percentage.warning {
    color: var(--ishka-status-warning);
  }

  .percentage.fail {
    color: var(--ishka-status-fail);
  }

  .status-text {
    color: var(--ishka-text-tertiary);
  }

  .card-actions {
    display: flex;
    gap: var(--ishka-space-2);
  }

  .clear-btn,
  .inspect-btn {
    flex: 1;
    padding: var(--ishka-space-2) var(--ishka-space-3);
    border: var(--ishka-border-width) solid var(--ishka-border-color);
    border-radius: var(--ishka-radius-md);
    font-size: var(--ishka-text-sm);
    font-weight: var(--ishka-font-medium);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
  }

  .clear-btn {
    background: var(--ishka-error-50);
    color: var(--ishka-error-700);
    border-color: var(--ishka-error-200);
  }

  .clear-btn:hover:not(:disabled) {
    background: var(--ishka-error-100);
    border-color: var(--ishka-error-300);
  }

  .clear-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .inspect-btn {
    background: var(--ishka-bg-primary);
    color: var(--ishka-text-secondary);
  }

  .inspect-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Storage tips */
  .storage-tips {
    padding: var(--ishka-space-4);
    background: var(--ishka-bg-secondary);
    border: var(--ishka-border-width) solid var(--ishka-border-color);
    border-radius: var(--ishka-radius-lg);
  }

  .tips-title {
    margin: 0 0 var(--ishka-space-3) 0;
    font-size: var(--ishka-text-base);
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-primary);
  }

  .tips-list {
    margin: 0;
    padding-left: var(--ishka-space-4);
    color: var(--ishka-text-secondary);
    font-size: var(--ishka-text-sm);
    line-height: var(--ishka-leading-relaxed);
  }

  .tips-list li {
    margin-bottom: var(--ishka-space-2);
  }

  .tips-list strong {
    color: var(--ishka-text-primary);
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

  /* Responsive */
  @media (max-width: 768px) {
    .panel-header {
      flex-direction: column;
      align-items: stretch;
      gap: var(--ishka-space-3);
    }

    .storage-grid {
      grid-template-columns: 1fr;
    }

    .storage-content {
      padding: var(--ishka-space-4);
    }
  }
</style>