import { describe, it, expect } from 'vitest';
import { DataExporter } from '../../src/utils/data-exporter';
import type { ExportData } from '../../src/utils/types';

// Minimal mock ExportData for testing
const mockExportData: ExportData = {
  metadata: {
    timestamp: '2024-01-01T00:00:00.000Z',
    userAgent: 'test-agent',
    url: 'https://example.com',
    version: '1.0.0',
    environment: 'test',
  },
  systemHealth: {
    overall: 'healthy',
    categories: {
      dom: { status: 'pass', lastCheck: '2024-01-01T00:00:00.000Z', tests: [] },
      api: { status: 'pass', lastCheck: '2024-01-01T00:00:00.000Z', tests: [] },
      storage: { status: 'pass', lastCheck: '2024-01-01T00:00:00.000Z', tests: [] },
      worker: { status: 'pass', lastCheck: '2024-01-01T00:00:00.000Z', tests: [] },
      performance: { status: 'pass', lastCheck: '2024-01-01T00:00:00.000Z', tests: [] },
      security: { status: 'pass', lastCheck: '2024-01-01T00:00:00.000Z', tests: [] },
    },
    summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
  },
  performanceMetrics: {
    domReadyTime: 0,
    scriptLoadTime: 0,
    memoryUsage: 0,
    storageQuota: { used: 0, available: 0, percentage: 0 },
    workerResponseTimes: {},
  },
  errors: [],
  configuration: {
    diagnosticsEnabled: true,
    autoRunDiagnostics: true,
    diagnosticsInterval: 30000,
    performanceMonitoring: true,
    errorReporting: true,
    debugMode: false,
    version: '1.0.0',
  },
  sessions: [],
};

describe('DataExporter', () => {
  it('convertToCSV should serialize ExportData to CSV', () => {
    // Use a dummy for performanceMonitor, not needed for this test
    const exporter = new DataExporter({} as any, {} as any);
    // @ts-expect-error: testing private method
    const csv = exporter.convertToCSV(mockExportData);
    expect(csv).toContain('Section,Key,Value');
    expect(csv).toContain('Metadata,Timestamp,2024-01-01T00:00:00.000Z');
    expect(csv).toContain('System Health,Total Tests,0');
    expect(csv).toContain('Performance,domReadyTime,0');
  });
}); 