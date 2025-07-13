import type { IPerformanceMonitor } from './interfaces.js';
import type { PerformanceMetrics } from './types.js';
import { eventBus } from './event-bus.js';
import { storageManager } from './storage-manager.js';

export class PerformanceMonitor implements IPerformanceMonitor {
  private isMonitoring = false;
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 100;
  private monitoringInterval: number | null = null;
  private customMetrics = new Map<string, { value: number; metadata?: any; timestamp: Date }>();

  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Collect metrics every 30 seconds
    this.monitoringInterval = window.setInterval(async () => {
      try {
        const metrics = await this.getCurrentMetrics();
        this.addToHistory(metrics);
        eventBus.emit('performance:updated', metrics);
      } catch (error) {
        console.error('[PerformanceMonitor] Failed to collect metrics:', error);
      }
    }, 30000);

    eventBus.emit('performance:monitoring:started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    eventBus.emit('performance:monitoring:stopped');
  }

  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    const domReadyTime = this.getDOMReadyTime();
    const scriptLoadTime = this.getScriptLoadTime();
    const memoryUsage = this.getMemoryUsage();
    const storageQuota = await this.getStorageQuotaInfo();
    const workerResponseTimes = await this.getWorkerResponseTimes();

    return {
      domReadyTime,
      scriptLoadTime,
      memoryUsage,
      storageQuota,
      workerResponseTimes
    };
  }

  async getHistoricalMetrics(timeRange: string): Promise<PerformanceMetrics[]> {
    const now = Date.now();
    let cutoffTime: number;

    switch (timeRange) {
      case '1h':
        cutoffTime = now - (60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = now - (60 * 60 * 1000); // Default to 1 hour
    }

    // Try to load from storage if memory is empty
    if (this.metricsHistory.length === 0) {
      await this.loadHistoryFromStorage();
    }

    return this.metricsHistory.filter(metric => {
      // Assuming we add a timestamp field to metrics
      const timestamp = (metric as any).timestamp;
      return timestamp && new Date(timestamp).getTime() > cutoffTime;
    });
  }

  recordCustomMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.customMetrics.set(name, {
      value,
      metadata,
      timestamp: new Date()
    });

    eventBus.emit('performance:custom-metric', { name, value, metadata });
  }

  private getDOMReadyTime(): number {
    if (!performance.timing) {
      return 0;
    }

    const { navigationStart, domContentLoadedEventEnd } = performance.timing;
    return domContentLoadedEventEnd - navigationStart;
  }

  private getScriptLoadTime(): number {
    if (!performance.timing) {
      return 0;
    }

    const { navigationStart, loadEventEnd } = performance.timing;
    return loadEventEnd - navigationStart;
  }

  private getMemoryUsage(): number {
    // @ts-ignore - memory API is not in all browsers
    if (performance.memory) {
      // @ts-ignore
      return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    
    return 0;
  }

  private async getStorageQuotaInfo(): Promise<PerformanceMetrics['storageQuota']> {
    try {
      const quota = await storageManager.getQuotaInfo();
      const total = quota.used + quota.available;
      
      return {
        used: quota.used,
        available: quota.available,
        percentage: total > 0 ? (quota.used / total) * 100 : 0
      };
    } catch (error) {
      return {
        used: 0,
        available: 0,
        percentage: 0
      };
    }
  }

  private async getWorkerResponseTimes(): Promise<Record<string, number>> {
    const times: Record<string, number> = {};

    // Test service worker response time
    if ('serviceWorker' in navigator) {
      try {
        const start = Date.now();
        await navigator.serviceWorker.getRegistration();
        times.serviceWorker = Date.now() - start;
      } catch (error) {
        times.serviceWorker = -1; // Error
      }
    }

    // Test background script response time (if in extension context)
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        const start = Date.now();
        await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
          setTimeout(() => reject(new Error('Timeout')), 5000);
        });
        times.backgroundScript = Date.now() - start;
      } catch (error) {
        times.backgroundScript = -1; // Error
      }
    }

    return times;
  }

  private addToHistory(metrics: PerformanceMetrics): void {
    // Add timestamp to metrics
    const timestampedMetrics = {
      ...metrics,
      timestamp: new Date().toISOString()
    };

    this.metricsHistory.unshift(timestampedMetrics);
    
    // Keep history size manageable
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(0, this.maxHistorySize);
    }

    // Persist to storage
    this.saveHistoryToStorage();
  }

  private async saveHistoryToStorage(): Promise<void> {
    try {
      await storageManager.set('performanceHistory', this.metricsHistory);
    } catch (error) {
      console.warn('[PerformanceMonitor] Failed to save history to storage:', error);
    }
  }

  private async loadHistoryFromStorage(): Promise<void> {
    try {
      const history = await storageManager.get<PerformanceMetrics[]>('performanceHistory');
      if (history && Array.isArray(history)) {
        this.metricsHistory = history.slice(0, this.maxHistorySize);
      }
    } catch (error) {
      console.warn('[PerformanceMonitor] Failed to load history from storage:', error);
    }
  }

  getCustomMetrics(): Map<string, { value: number; metadata?: any; timestamp: Date }> {
    return new Map(this.customMetrics);
  }

  clearCustomMetrics(): void {
    this.customMetrics.clear();
    eventBus.emit('performance:custom-metrics:cleared');
  }

  clearHistory(): void {
    this.metricsHistory = [];
    storageManager.remove('performanceHistory');
    eventBus.emit('performance:history:cleared');
  }

  getMonitoringStatus(): {
    isMonitoring: boolean;
    historySize: number;
    customMetricsCount: number;
    lastUpdate: string | null;
  } {
    return {
      isMonitoring: this.isMonitoring,
      historySize: this.metricsHistory.length,
      customMetricsCount: this.customMetrics.size,
      lastUpdate: this.metricsHistory.length > 0 ? 
        (this.metricsHistory[0] as any).timestamp || null : null
    };
  }

  async generatePerformanceReport(): Promise<{
    current: PerformanceMetrics;
    trends: {
      domReadyTrend: 'improving' | 'degrading' | 'stable';
      memoryTrend: 'improving' | 'degrading' | 'stable';
      storageTrend: 'improving' | 'degrading' | 'stable';
    };
    recommendations: string[];
  }> {
    const current = await this.getCurrentMetrics();
    const recent = await this.getHistoricalMetrics('1h');
    
    // Calculate trends
    const trends = this.calculateTrends(recent);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(current, trends);

    return {
      current,
      trends,
      recommendations
    };
  }

  private calculateTrends(history: PerformanceMetrics[]): {
    domReadyTrend: 'improving' | 'degrading' | 'stable';
    memoryTrend: 'improving' | 'degrading' | 'stable';
    storageTrend: 'improving' | 'degrading' | 'stable';
  } {
    if (history.length < 2) {
      return {
        domReadyTrend: 'stable',
        memoryTrend: 'stable',
        storageTrend: 'stable'
      };
    }

    const recent = history.slice(0, Math.min(5, history.length));
    const older = history.slice(-Math.min(5, history.length));

    const recentAvgDom = recent.reduce((sum, m) => sum + m.domReadyTime, 0) / recent.length;
    const olderAvgDom = older.reduce((sum, m) => sum + m.domReadyTime, 0) / older.length;

    const recentAvgMemory = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    const olderAvgMemory = older.reduce((sum, m) => sum + m.memoryUsage, 0) / older.length;

    const recentAvgStorage = recent.reduce((sum, m) => sum + m.storageQuota.percentage, 0) / recent.length;
    const olderAvgStorage = older.reduce((sum, m) => sum + m.storageQuota.percentage, 0) / older.length;

    return {
      domReadyTrend: this.getTrend(recentAvgDom, olderAvgDom, true), // Lower is better
      memoryTrend: this.getTrend(recentAvgMemory, olderAvgMemory, true), // Lower is better
      storageTrend: this.getTrend(recentAvgStorage, olderAvgStorage, true) // Lower is better
    };
  }

  private getTrend(recent: number, older: number, lowerIsBetter: boolean): 'improving' | 'degrading' | 'stable' {
    const threshold = 0.1; // 10% change threshold
    const change = (recent - older) / older;

    if (Math.abs(change) < threshold) {
      return 'stable';
    }

    if (lowerIsBetter) {
      return change < 0 ? 'improving' : 'degrading';
    } else {
      return change > 0 ? 'improving' : 'degrading';
    }
  }

  private generateRecommendations(current: PerformanceMetrics, trends: any): string[] {
    const recommendations: string[] = [];

    // DOM performance recommendations
    if (current.domReadyTime > 3000) {
      recommendations.push('DOM ready time is slow. Consider optimizing DOM manipulation.');
    }
    if (trends.domReadyTrend === 'degrading') {
      recommendations.push('DOM performance is degrading over time. Monitor for memory leaks.');
    }

    // Memory recommendations
    if (current.memoryUsage > 100) { // 100MB
      recommendations.push('High memory usage detected. Consider optimizing memory management.');
    }
    if (trends.memoryTrend === 'degrading') {
      recommendations.push('Memory usage is increasing. Check for memory leaks.');
    }

    // Storage recommendations
    if (current.storageQuota.percentage > 80) {
      recommendations.push('Storage usage is high. Consider cleaning up old data.');
    }
    if (trends.storageTrend === 'degrading') {
      recommendations.push('Storage usage is growing. Implement data retention policies.');
    }

    // Worker recommendations
    Object.entries(current.workerResponseTimes).forEach(([worker, time]) => {
      if (time > 1000) {
        recommendations.push(`${worker} response time is slow (${time}ms). Check worker health.`);
      }
      if (time === -1) {
        recommendations.push(`${worker} is not responding. Check worker status.`);
      }
    });

    return recommendations;
  }
}

export const performanceMonitor = new PerformanceMonitor();