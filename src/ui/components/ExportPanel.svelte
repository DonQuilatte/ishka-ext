<script>
  import { onMount } from 'svelte';
  import { diagnosticStore, sessionStore } from '../../store/index.js';
  import StatusIndicator from './StatusIndicator.svelte';

  let exportFormats = [
    { id: 'json', name: 'JSON', description: 'Raw data export', icon: '📄' },
    { id: 'csv', name: 'CSV', description: 'Spreadsheet format', icon: '📊' },
    { id: 'html', name: 'HTML', description: 'Web report', icon: '🌐' },
    { id: 'pdf', name: 'PDF', description: 'Printable report', icon: '📑' }
  ];

  let exportOptions = {
    includeDiagnostics: true,
    includeTelemetry: true,
    includeStorage: false,
    includeSessions: false,
    dateRange: 'all', // 'today', 'week', 'month', 'all'
    format: 'json'
  };

  let isExporting = false;
  let exportStatus = '';
  let lastExport = '';

  onMount(() => {
    // Load last export time from storage
    loadExportHistory();
  });

  async function loadExportHistory() {
    try {
      // This would load from storage manager in real implementation
      const stored = localStorage.getItem('ishka-last-export');
      if (stored) {
        lastExport = new Date(stored).toLocaleString();
      }
    } catch (error) {
      console.error('[ExportPanel] Failed to load export history:', error);
    }
  }

  async function generateExport() {
    if (isExporting) return;
    
    isExporting = true;
    exportStatus = 'Preparing export...';
    
    try {
      let exportData = {};
      
      // Collect diagnostic data
      if (exportOptions.includeDiagnostics) {
        exportStatus = 'Collecting diagnostic data...';
        const healthData = await diagnosticStore.getLastResults();
        exportData.diagnostics = healthData;
      }
      
      // Collect telemetry data (placeholder)
      if (exportOptions.includeTelemetry) {
        exportStatus = 'Collecting telemetry data...';
        exportData.telemetry = {
          timestamp: new Date().toISOString(),
          placeholder: 'Telemetry data would be collected here'
        };
      }
      
      // Collect storage data
      if (exportOptions.includeStorage) {
        exportStatus = 'Collecting storage data...';
        exportData.storage = await getStorageData();
      }
      
      // Collect session data
      if (exportOptions.includeSessions) {
        exportStatus = 'Collecting session data...';
        const sessions = await sessionStore.getRecentSessions();
        exportData.sessions = sessions;
      }
      
      // Add export metadata
      exportData.metadata = {
        exportedAt: new Date().toISOString(),
        format: exportOptions.format,
        dateRange: exportOptions.dateRange,
        version: '1.0.0'
      };
      
      exportStatus = 'Generating file...';
      await downloadExport(exportData);
      
      // Save export history
      localStorage.setItem('ishka-last-export', new Date().toISOString());
      lastExport = new Date().toLocaleString();
      
      exportStatus = 'Export completed successfully!';
      
    } catch (error) {
      console.error('[ExportPanel] Export failed:', error);
      exportStatus = `Export failed: ${error.message}`;
    } finally {
      isExporting = false;
      // Clear status after delay
      setTimeout(() => {
        if (!isExporting) exportStatus = '';
      }, 3000);
    }
  }

  async function getStorageData() {
    const storageData = {};
    
    try {
      // Local storage
      if (typeof localStorage !== 'undefined') {
        storageData.localStorage = { ...localStorage };
      }
      
      // Session storage
      if (typeof sessionStorage !== 'undefined') {
        storageData.sessionStorage = { ...sessionStorage };
      }
      
      // Chrome storage (if available)
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const chromeData = await chrome.storage.local.get();
        storageData.chromeStorage = chromeData;
      }
      
    } catch (error) {
      console.error('[ExportPanel] Storage data collection failed:', error);
    }
    
    return storageData;
  }

  async function downloadExport(data) {
    let content, mimeType, filename;
    
    switch (exportOptions.format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        filename = `ishka-export-${Date.now()}.json`;
        break;
        
      case 'csv':
        content = convertToCSV(data);
        mimeType = 'text/csv';
        filename = `ishka-export-${Date.now()}.csv`;
        break;
        
      case 'html':
        content = generateHTMLReport(data);
        mimeType = 'text/html';
        filename = `ishka-report-${Date.now()}.html`;
        break;
        
      case 'pdf':
        // PDF generation would require additional library
        alert('PDF export not yet implemented');
        return;
        
      default:
        throw new Error(`Unsupported export format: ${exportOptions.format}`);
    }
    
    // Create and trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function convertToCSV(data) {
    let csv = 'Type,Status,Message,Timestamp\n';
    
    if (data.diagnostics && data.diagnostics.categories) {
      for (const [category, categoryData] of Object.entries(data.diagnostics.categories)) {
        if (categoryData.tests) {
          for (const test of categoryData.tests) {
            csv += `${category},${test.status},"${test.message}",${test.timestamp}\n`;
          }
        }
      }
    }
    
    return csv;
  }

  function generateHTMLReport(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Ishka Extension Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
        .status-pass { color: #22c55e; }
        .status-fail { color: #ef4444; }
        .status-warning { color: #f59e0b; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Ishka Extension Report</h1>
        <p>Generated: ${data.metadata.exportedAt}</p>
    </div>
    
    ${data.diagnostics ? generateDiagnosticsHTML(data.diagnostics) : ''}
    ${data.telemetry ? generateTelemetryHTML(data.telemetry) : ''}
    
    <footer>
        <p><small>Report generated by Ishka Extension v${data.metadata.version}</small></p>
    </footer>
</body>
</html>`;
  }

  function generateDiagnosticsHTML(diagnostics) {
    let html = '<h2>Diagnostic Results</h2>';
    
    if (diagnostics.categories) {
      html += '<table><tr><th>Category</th><th>Status</th><th>Tests</th></tr>';
      
      for (const [category, data] of Object.entries(diagnostics.categories)) {
        html += `<tr>
          <td>${category}</td>
          <td class="status-${data.status}">${data.status}</td>
          <td>${data.tests ? data.tests.length : 0}</td>
        </tr>`;
      }
      
      html += '</table>';
    }
    
    return html;
  }

  function generateTelemetryHTML(telemetry) {
    return `
      <h2>Telemetry Data</h2>
      <p>Timestamp: ${telemetry.timestamp}</p>
      <p>${telemetry.placeholder}</p>
    `;
  }


  function getSelectedCount() {
    let count = 0;
    if (exportOptions.includeDiagnostics) count++;
    if (exportOptions.includeTelemetry) count++;
    if (exportOptions.includeStorage) count++;
    if (exportOptions.includeSessions) count++;
    return count;
  }
</script>

<div class="export-panel">
  <!-- Panel header -->
  <div class="panel-header">
    <div class="header-info">
      <h2 class="panel-title">Data Export</h2>
      <p class="panel-description">Export diagnostic and telemetry data in various formats</p>
      {#if lastExport}
        <span class="last-export">Last export: {lastExport}</span>
      {/if}
    </div>
  </div>

  <div class="export-content">
    <!-- Export format selection -->
    <div class="format-section">
      <h3 class="section-title">Export Format</h3>
      <div class="format-grid">
        {#each exportFormats as format (format.id)}
          <label class="format-card" class:selected={exportOptions.format === format.id}>
            <input 
              type="radio" 
              bind:group={exportOptions.format} 
              value={format.id}
              class="format-radio"
            />
            <div class="format-content">
              <span class="format-icon">{format.icon}</span>
              <div class="format-info">
                <span class="format-name">{format.name}</span>
                <span class="format-description">{format.description}</span>
              </div>
            </div>
          </label>
        {/each}
      </div>
    </div>

    <!-- Data selection -->
    <div class="data-section">
      <h3 class="section-title">Data to Include</h3>
      <div class="data-options">
        <label class="data-option">
          <input 
            type="checkbox" 
            bind:checked={exportOptions.includeDiagnostics}
            class="data-checkbox"
          />
          <div class="option-content">
            <span class="option-name">Diagnostic Results</span>
            <span class="option-description">System health checks and test results</span>
          </div>
          <StatusIndicator status="pass" size="small" />
        </label>

        <label class="data-option">
          <input 
            type="checkbox" 
            bind:checked={exportOptions.includeTelemetry}
            class="data-checkbox"
          />
          <div class="option-content">
            <span class="option-name">Telemetry Data</span>
            <span class="option-description">Performance metrics and usage statistics</span>
          </div>
          <StatusIndicator status="warning" size="small" />
        </label>

        <label class="data-option">
          <input 
            type="checkbox" 
            bind:checked={exportOptions.includeStorage}
            class="data-checkbox"
          />
          <div class="option-content">
            <span class="option-name">Storage Information</span>
            <span class="option-description">Local storage, session data, and usage stats</span>
          </div>
          <StatusIndicator status="pass" size="small" />
        </label>

        <label class="data-option">
          <input 
            type="checkbox" 
            bind:checked={exportOptions.includeSessions}
            class="data-checkbox"
          />
          <div class="option-content">
            <span class="option-name">Session History</span>
            <span class="option-description">ChatGPT session metadata and timestamps</span>
          </div>
          <StatusIndicator status="unknown" size="small" />
        </label>
      </div>
    </div>

    <!-- Date range selection -->
    <div class="range-section">
      <h3 class="section-title">Date Range</h3>
      <div class="range-options">
        <label class="range-option">
          <input 
            type="radio" 
            bind:group={exportOptions.dateRange} 
            value="today"
            class="range-radio"
          />
          <span>Today</span>
        </label>
        <label class="range-option">
          <input 
            type="radio" 
            bind:group={exportOptions.dateRange} 
            value="week"
            class="range-radio"
          />
          <span>Past Week</span>
        </label>
        <label class="range-option">
          <input 
            type="radio" 
            bind:group={exportOptions.dateRange} 
            value="month"
            class="range-radio"
          />
          <span>Past Month</span>
        </label>
        <label class="range-option">
          <input 
            type="radio" 
            bind:group={exportOptions.dateRange} 
            value="all"
            class="range-radio"
          />
          <span>All Data</span>
        </label>
      </div>
    </div>

    <!-- Export summary and action -->
    <div class="export-summary">
      <div class="summary-info">
        <h3 class="summary-title">Export Summary</h3>
        <div class="summary-details">
          <span class="detail-item">Format: <strong>{exportFormats.find(f => f.id === exportOptions.format)?.name}</strong></span>
          <span class="detail-item">Data types: <strong>{getSelectedCount()}</strong></span>
          <span class="detail-item">Range: <strong>{exportOptions.dateRange}</strong></span>
        </div>
      </div>

      <div class="export-actions">
        {#if exportStatus}
          <div class="export-status" class:error={exportStatus.includes('failed')}>
            <span>{exportStatus}</span>
          </div>
        {/if}
        
        <button 
          class="export-btn"
          class:loading={isExporting}
          on:click={generateExport}
          disabled={isExporting || getSelectedCount() === 0}
        >
          {#if isExporting}
            <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="60" stroke-dashoffset="60"/>
            </svg>
            <span>Exporting...</span>
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Generate Export</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .export-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--ishka-bg-primary);
  }

  /* Header */
  .panel-header {
    padding: var(--ishka-space-6);
    background: var(--ishka-bg-secondary);
    border-bottom: var(--ishka-border-width) solid var(--ishka-border-color);
  }

  .panel-title {
    margin: 0 0 var(--ishka-space-1) 0;
    font-size: var(--ishka-text-lg);
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-primary);
  }

  .panel-description {
    margin: 0 0 var(--ishka-space-2) 0;
    font-size: var(--ishka-text-sm);
    color: var(--ishka-text-secondary);
  }

  .last-export {
    font-size: var(--ishka-text-xs);
    color: var(--ishka-text-tertiary);
  }

  /* Content */
  .export-content {
    flex: 1;
    overflow: auto;
    padding: var(--ishka-space-6);
    display: flex;
    flex-direction: column;
    gap: var(--ishka-space-6);
  }

  .section-title {
    margin: 0 0 var(--ishka-space-3) 0;
    font-size: var(--ishka-text-base);
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-primary);
  }

  /* Format selection */
  .format-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--ishka-space-3);
  }

  .format-card {
    position: relative;
    display: block;
    padding: var(--ishka-space-4);
    background: var(--ishka-bg-secondary);
    border: var(--ishka-border-width) solid var(--ishka-border-color);
    border-radius: var(--ishka-radius-lg);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
  }

  .format-card:hover {
    border-color: var(--ishka-accent-300);
    background: var(--ishka-bg-hover);
  }

  .format-card.selected {
    border-color: var(--ishka-accent-500);
    background: var(--ishka-accent-50);
  }

  .format-radio {
    position: absolute;
    opacity: 0;
  }

  .format-content {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-3);
  }

  .format-icon {
    font-size: var(--ishka-text-xl);
  }

  .format-info {
    display: flex;
    flex-direction: column;
    gap: var(--ishka-space-1);
  }

  .format-name {
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-primary);
  }

  .format-description {
    font-size: var(--ishka-text-sm);
    color: var(--ishka-text-secondary);
  }

  /* Data selection */
  .data-options {
    display: flex;
    flex-direction: column;
    gap: var(--ishka-space-3);
  }

  .data-option {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-3);
    padding: var(--ishka-space-3);
    background: var(--ishka-bg-secondary);
    border: var(--ishka-border-width) solid var(--ishka-border-color);
    border-radius: var(--ishka-radius-md);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
  }

  .data-option:hover {
    background: var(--ishka-bg-hover);
    border-color: var(--ishka-border-color-hover);
  }

  .data-checkbox {
    width: var(--ishka-space-4);
    height: var(--ishka-space-4);
  }

  .option-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--ishka-space-1);
  }

  .option-name {
    font-weight: var(--ishka-font-medium);
    color: var(--ishka-text-primary);
  }

  .option-description {
    font-size: var(--ishka-text-sm);
    color: var(--ishka-text-secondary);
  }

  /* Date range */
  .range-options {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ishka-space-3);
  }

  .range-option {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-2);
    padding: var(--ishka-space-2) var(--ishka-space-3);
    background: var(--ishka-bg-secondary);
    border: var(--ishka-border-width) solid var(--ishka-border-color);
    border-radius: var(--ishka-radius-md);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
  }

  .range-option:hover {
    background: var(--ishka-bg-hover);
    border-color: var(--ishka-border-color-hover);
  }

  .range-radio {
    margin: 0;
  }

  /* Export summary */
  .export-summary {
    padding: var(--ishka-space-4);
    background: var(--ishka-bg-secondary);
    border: var(--ishka-border-width) solid var(--ishka-border-color);
    border-radius: var(--ishka-radius-lg);
  }

  .summary-title {
    margin: 0 0 var(--ishka-space-3) 0;
    font-size: var(--ishka-text-base);
    font-weight: var(--ishka-font-semibold);
    color: var(--ishka-text-primary);
  }

  .summary-details {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ishka-space-4);
    margin-bottom: var(--ishka-space-4);
  }

  .detail-item {
    font-size: var(--ishka-text-sm);
    color: var(--ishka-text-secondary);
  }

  .detail-item strong {
    color: var(--ishka-text-primary);
  }

  .export-actions {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-3);
  }

  .export-status {
    flex: 1;
    font-size: var(--ishka-text-sm);
    color: var(--ishka-text-secondary);
  }

  .export-status.error {
    color: var(--ishka-status-fail);
  }

  .export-btn {
    display: flex;
    align-items: center;
    gap: var(--ishka-space-2);
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

  .export-btn:hover:not(:disabled) {
    background: var(--ishka-accent-600);
  }

  .export-btn:disabled {
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

  /* Responsive */
  @media (max-width: 768px) {
    .export-content {
      padding: var(--ishka-space-4);
      gap: var(--ishka-space-4);
    }

    .format-grid {
      grid-template-columns: 1fr;
    }

    .range-options {
      flex-direction: column;
    }

    .summary-details {
      flex-direction: column;
      gap: var(--ishka-space-2);
    }

    .export-actions {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>