import type { IDataExporter, IStorageManager, IPerformanceMonitor } from './interfaces.js';
import type { ExportData, SystemHealth, ErrorContext } from './types.js';
import { errorReporter } from './error-reporter.js';
import { storageManager } from './storage-manager.js';

export class DataExporter implements IDataExporter {
  constructor(
    private storage: IStorageManager,
    private performanceMonitor: IPerformanceMonitor
  ) {}

  async exportDiagnostics(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const exportData = await this.generateSupportBundle();
      
      if (format === 'json') {
        return JSON.stringify(exportData, null, 2);
      } else {
        return this.convertToCSV(exportData);
      }
    } catch (error) {
      errorReporter.reportError({
        type: 'javascript',
        message: 'Export generation failed',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        sessionId: 'data-exporter',
        metadata: { format, error }
      });
      throw error;
    }
  }

  async exportToFile(data: ExportData, filename?: string): Promise<void> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const defaultFilename = `ishka-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
      const finalFilename = filename || defaultFilename;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      errorReporter.reportError({
        type: 'javascript',
        message: 'File export failed',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        sessionId: 'data-exporter',
        metadata: { filename, error }
      });
      throw error;
    }
  }

  async copyToClipboard(data: ExportData): Promise<void> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonString);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = jsonString;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (error) {
      errorReporter.reportError({
        type: 'javascript',
        message: 'Clipboard copy failed',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        sessionId: 'data-exporter',
        metadata: { error }
      });
      throw error;
    }
  }

  async generateSupportBundle(): Promise<ExportData> {
    try {
      const [
        systemHealth,
        performanceMetrics,
        configuration,
        sessions,
        storageQuota
      ] = await Promise.all([
        this.storage.get<SystemHealth>('lastDiagnosticRun'),
        this.performanceMonitor.getCurrentMetrics(),
        this.storage.get('configuration'),
        this.storage.get('sessions'),
        this.storage.getQuotaInfo()
      ]);

      const errors = errorReporter.getRecentErrors(50);
      
      let extensionId: string | undefined;
      let manifestVersion: number | undefined;
      
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          extensionId = chrome.runtime.id;
          manifestVersion = chrome.runtime.getManifest().manifest_version;
        }
      } catch (error) {
        // Extension APIs not available
      }

      const safeSystemHealth = systemHealth && typeof systemHealth === 'object' && 'summary' in systemHealth ? systemHealth : this.createEmptySystemHealth();
      const safeSessions = Array.isArray(sessions) ? sessions : [];
      const safePerformanceMetrics = performanceMetrics || {};
      const safeConfiguration = configuration || this.getDefaultConfiguration();

      const exportData: ExportData = {
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
          url: (typeof window !== 'undefined' ? window.location.href : ''),
          extensionId,
          manifestVersion,
          version: '1.0.0',
          environment: this.detectEnvironment(),
          // storageQuota, browserInfo, screenInfo, connectionInfo will be added below
        },
        systemHealth: safeSystemHealth,
        performanceMetrics: safePerformanceMetrics,
        errors: errors,
        configuration: safeConfiguration,
        sessions: safeSessions
      };

      // Add additional diagnostic info if available
      (exportData.metadata as any).storageQuota = storageQuota || {};
      (exportData.metadata as any).browserInfo = this.getBrowserInfo();
      (exportData.metadata as any).screenInfo = this.getScreenInfo();
      (exportData.metadata as any).connectionInfo = this.getConnectionInfo();

      return exportData;
    } catch (error) {
      errorReporter.reportError({
        type: 'javascript',
        message: 'Support bundle generation failed',
        timestamp: new Date().toISOString(),
        userAgent: (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
        sessionId: 'data-exporter',
        metadata: { error }
      });
      throw error;
    }
  }

  private convertToCSV(data: ExportData): string {
    const rows: string[] = [];
    
    // Add metadata
    rows.push('Section,Key,Value');
    rows.push(`Metadata,Timestamp,${data.metadata.timestamp}`);
    rows.push(`Metadata,User Agent,${data.metadata.userAgent}`);
    rows.push(`Metadata,URL,${data.metadata.url}`);
    rows.push(`Metadata,Extension ID,${data.metadata.extensionId || 'N/A'}`);
    rows.push(`Metadata,Version,${data.metadata.version}`);
    rows.push('');

    // Add system health summary
    if (data.systemHealth?.summary) {
      rows.push('System Health,Total Tests,' + data.systemHealth.summary.total);
      rows.push('System Health,Passed,' + data.systemHealth.summary.passed);
      rows.push('System Health,Failed,' + data.systemHealth.summary.failed);
      rows.push('System Health,Warnings,' + data.systemHealth.summary.warnings);
      rows.push('System Health,Overall Status,' + data.systemHealth.overall);
      rows.push('');
    }

    // Add performance metrics
    if (data.performanceMetrics) {
      Object.entries(data.performanceMetrics).forEach(([key, value]) => {
        if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subValue]) => {
            rows.push(`Performance,${key}.${subKey},${subValue}`);
          });
        } else {
          rows.push(`Performance,${key},${value}`);
        }
      });
      rows.push('');
    }

    // Add recent errors
    if (data.errors?.length > 0) {
      rows.push('Error Type,Message,Timestamp,Details');
      data.errors.slice(0, 10).forEach(error => {
        const escapedMessage = (error.message || '').replace(/"/g, '""');
        const escapedDetails = ('details' in error && error.details ? error.details.toString() : '').replace(/"/g, '""');
        rows.push(`${error.type},"${escapedMessage}",${error.timestamp},"${escapedDetails}"`);
      });
    }

    return rows.join('\n');
  }

  private createEmptySystemHealth(): SystemHealth {
    return {
      overall: 'healthy',
      categories: {
        dom: { status: 'pass', lastCheck: new Date().toISOString(), tests: [] },
        api: { status: 'pass', lastCheck: new Date().toISOString(), tests: [] },
        storage: { status: 'pass', lastCheck: new Date().toISOString(), tests: [] },
        worker: { status: 'pass', lastCheck: new Date().toISOString(), tests: [] },
        performance: { status: 'pass', lastCheck: new Date().toISOString(), tests: [] },
        security: { status: 'pass', lastCheck: new Date().toISOString(), tests: [] }
      },
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 }
    };
  }

  private getDefaultConfiguration(): any {
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

  private detectEnvironment(): string {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      return 'extension';
    }
    if (typeof window !== 'undefined') {
      if (window.location.protocol === 'file:') {
        return 'local';
      }
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'development';
      }
    }
    return 'production';
  }

  private getBrowserInfo(): any {
    if (typeof navigator === 'undefined') return {};
    const ua = navigator.userAgent;
    let browser = 'unknown';
    let version = 'unknown';

    if (ua.includes('Chrome/')) {
      browser = 'chrome';
      const match = ua.match(/Chrome\/(\d+\.\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (ua.includes('Firefox/')) {
      browser = 'firefox';
      const match = ua.match(/Firefox\/(\d+\.\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
      browser = 'safari';
      const match = ua.match(/Version\/(\d+\.\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (ua.includes('Edge/')) {
      browser = 'edge';
      const match = ua.match(/Edge\/(\d+\.\d+)/);
      version = match ? match[1] : 'unknown';
    }

    return {
      name: browser,
      version,
      userAgent: ua,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  private getScreenInfo(): any {
    if (typeof window === 'undefined' || typeof screen === 'undefined') return {};
    return {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      devicePixelRatio: window.devicePixelRatio,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    };
  }

  private getConnectionInfo(): any {
    if (typeof navigator === 'undefined') return {};
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    
    return {
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    };
  }

  async exportSystemSnapshot(): Promise<string> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return JSON.stringify({ timestamp: new Date().toISOString(), context: 'service-worker' }, null, 2);
    }
    const snapshot = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      title: document.title,
      readyState: document.readyState,
      referrer: document.referrer,
      lastModified: document.lastModified,
      characterSet: document.characterSet,
      domain: document.domain,
      forms: document.forms.length,
      images: document.images.length,
      links: document.links.length,
      scripts: document.scripts.length,
      styleSheets: document.styleSheets.length,
      activeElement: document.activeElement?.tagName || 'unknown',
      hasFocus: document.hasFocus(),
      hidden: document.hidden,
      visibilityState: document.visibilityState
    };

    return JSON.stringify(snapshot, null, 2);
  }
}

export const dataExporter = new DataExporter(storageManager, {} as any);