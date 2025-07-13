/**
 * @fileoverview Integration tests for popup to background message passing
 * Tests communication between extension popup and background service worker
 * 
 * @author Ishka Extension Team
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupMessagePassingTestContext,
  simulateContentMessage,
  createMockSender,
  assertMessageSent,
  createMockEventBus,
  type MessagePassingTestContext
} from './message-passing-utils';

describe('Integration Test: Popup to Background Messaging', () => {
  let context: MessagePassingTestContext;
  let mockEventBus: any;

  beforeEach(() => {
    context = setupMessagePassingTestContext();
    mockEventBus = createMockEventBus();
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockEventBus._clear();
    delete (global as any).chrome;
  });

  describe('Popup Initialization', () => {
    it('should initialize popup and retrieve background data', async () => {
      // Arrange
      const initMessage = {
        type: 'popup_initialized',
        payload: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined // Popup doesn't have a tab
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, initMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'popup_init_response',
          data: expect.objectContaining({
            activeSessions: expect.any(Array),
            telemetry: expect.any(Object),
            config: expect.any(Object)
          })
        })
      );
    });

    it('should handle popup initialization failure gracefully', async () => {
      // Arrange - Simulate error condition
      const invalidInitMessage = {
        type: 'popup_initialized',
        payload: null // Invalid payload
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, invalidInitMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String)
        })
      );
    });
  });

  describe('Diagnostic Operations from Popup', () => {
    it('should handle ping message for connectivity check', async () => {
      // Arrange
      const pingMessage = {
        type: 'ping',
        payload: {
          timestamp: new Date().toISOString()
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, pingMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'pong',
          timestamp: expect.any(String),
          latency: expect.any(Number)
        })
      );
    });

    it('should handle health_check message with system status', async () => {
      // Arrange
      const healthCheckMessage = {
        type: 'health_check',
        payload: {
          includeDetails: true,
          categories: ['runtime', 'storage', 'api']
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, healthCheckMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'health_check_response',
          health: expect.objectContaining({
            runtime: expect.objectContaining({
              status: expect.stringMatching(/^(healthy|warning|error)$/),
              details: expect.any(Object)
            }),
            storage: expect.objectContaining({
              status: expect.stringMatching(/^(healthy|warning|error)$/),
              details: expect.any(Object)
            }),
            api: expect.objectContaining({
              status: expect.stringMatching(/^(healthy|warning|error)$/),
              details: expect.any(Object)
            })
          }),
          overallStatus: expect.stringMatching(/^(healthy|warning|error)$/)
        })
      );
    });

    it('should run full diagnostics from popup request', async () => {
      // Arrange
      const diagnosticsMessage = {
        type: 'run_full_diagnostics',
        payload: {
          categories: ['dom', 'api', 'storage', 'worker'],
          includePerformance: true,
          source: 'popup_ui'
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, diagnosticsMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'diagnostics_complete',
          results: expect.objectContaining({
            dom: expect.any(Array),
            api: expect.any(Array),
            storage: expect.any(Array),
            worker: expect.any(Array)
          }),
          summary: expect.objectContaining({
            totalTests: expect.any(Number),
            passed: expect.any(Number),
            failed: expect.any(Number),
            overallStatus: expect.stringMatching(/^(pass|fail)$/)
          }),
          performance: expect.any(Object)
        })
      );
    });
  });

  describe('Session Management from Popup', () => {
    it('should retrieve all active sessions', async () => {
      // Arrange
      const getSessionsMessage = {
        type: 'get_active_sessions',
        payload: {
          includeHistory: false,
          limit: 10
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, getSessionsMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sessions: expect.any(Array),
          count: expect.any(Number)
        })
      );
    });

    it('should retrieve session history with filtering', async () => {
      // Arrange
      const getHistoryMessage = {
        type: 'get_session_history',
        payload: {
          dateRange: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-12-31T23:59:59Z'
          },
          limit: 50,
          includeMetadata: true,
          filters: {
            minDuration: 60000, // 1 minute
            hasConversations: true
          }
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, getHistoryMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sessions: expect.any(Array),
          totalCount: expect.any(Number),
          filteredCount: expect.any(Number),
          metadata: expect.objectContaining({
            dateRange: expect.any(Object),
            filters: expect.any(Object)
          })
        })
      );
    });

    it('should switch to specific session', async () => {
      // Arrange
      const switchSessionMessage = {
        type: 'switch_to_session',
        payload: {
          sessionId: 'session-123',
          tabId: 1,
          focus: true
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, switchSessionMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          switched: true,
          sessionId: 'session-123',
          tabId: 1
        })
      );

      // Verify tab switching was attempted
      expect(context.chrome.tabs.query).toHaveBeenCalled();
    });
  });

  describe('Export Operations from Popup', () => {
    it('should handle export request with full configuration', async () => {
      // Arrange
      const exportMessage = {
        type: 'export_data',
        payload: {
          format: 'json',
          categories: ['sessions', 'diagnostics', 'telemetry'],
          options: {
            includeMetadata: true,
            compression: false,
            dateRange: {
              start: '2024-01-01T00:00:00Z',
              end: '2024-12-31T23:59:59Z'
            },
            filters: {
              minSessionDuration: 30000,
              includeErrorLogs: true
            }
          },
          source: 'popup_export'
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, exportMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'export_complete',
          exportId: expect.any(String),
          format: 'json',
          fileSize: expect.any(Number),
          recordCount: expect.any(Number),
          downloadUrl: expect.any(String)
        })
      );
    });

    it('should handle CSV export with specific formatting', async () => {
      // Arrange
      const csvExportMessage = {
        type: 'export_data',
        payload: {
          format: 'csv',
          categories: ['sessions'],
          options: {
            csvOptions: {
              delimiter: ',',
              includeHeaders: true,
              escapeQuotes: true
            },
            columns: ['id', 'url', 'title', 'timestamp', 'duration', 'messageCount']
          }
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, csvExportMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'export_complete',
          format: 'csv',
          columns: expect.arrayContaining(['id', 'url', 'title', 'timestamp', 'duration', 'messageCount'])
        })
      );
    });

    it('should handle export progress tracking', async () => {
      // Arrange
      const progressMessage = {
        type: 'get_export_progress',
        payload: {
          exportId: 'export-123'
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, progressMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          exportId: 'export-123',
          progress: expect.objectContaining({
            percentage: expect.any(Number),
            currentStep: expect.any(String),
            estimatedTimeRemaining: expect.any(Number)
          })
        })
      );
    });
  });

  describe('Configuration Management', () => {
    it('should retrieve current extension configuration', async () => {
      // Arrange
      const getConfigMessage = {
        type: 'get_config',
        payload: {}
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, getConfigMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          config: expect.objectContaining({
            autoRunDiagnostics: expect.any(Boolean),
            diagnosticsInterval: expect.any(Number),
            memoryCleanupEnabled: expect.any(Boolean),
            exportFormats: expect.any(Array),
            maxSessionHistory: expect.any(Number)
          })
        })
      );
    });

    it('should update extension configuration', async () => {
      // Arrange
      const updateConfigMessage = {
        type: 'update_config',
        payload: {
          config: {
            autoRunDiagnostics: false,
            diagnosticsInterval: 600000, // 10 minutes
            memoryCleanupEnabled: true,
            maxSessionHistory: 200
          },
          source: 'popup_settings'
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, updateConfigMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          configUpdated: true,
          newConfig: expect.objectContaining({
            autoRunDiagnostics: false,
            diagnosticsInterval: 600000,
            memoryCleanupEnabled: true,
            maxSessionHistory: 200
          })
        })
      );
    });

    it('should reset configuration to defaults', async () => {
      // Arrange
      const resetConfigMessage = {
        type: 'reset_config',
        payload: {
          confirm: true,
          categories: ['diagnostics', 'export', 'ui']
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, resetConfigMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          configReset: true,
          resetCategories: expect.arrayContaining(['diagnostics', 'export', 'ui'])
        })
      );
    });
  });

  describe('Telemetry and Analytics', () => {
    it('should retrieve comprehensive telemetry data', async () => {
      // Arrange
      const getTelemetryMessage = {
        type: 'get_comprehensive_telemetry',
        payload: {
          timeRange: '24h',
          includeCharts: true,
          categories: ['performance', 'usage', 'errors', 'diagnostics']
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, getTelemetryMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          telemetry: expect.objectContaining({
            performance: expect.objectContaining({
              averageResponseTime: expect.any(Number),
              memoryUsage: expect.any(Object),
              cpuUsage: expect.any(Object)
            }),
            usage: expect.objectContaining({
              sessionsCreated: expect.any(Number),
              diagnosticsRun: expect.any(Number),
              exportsGenerated: expect.any(Number)
            }),
            errors: expect.objectContaining({
              errorCount: expect.any(Number),
              errorTypes: expect.any(Array)
            }),
            diagnostics: expect.objectContaining({
              successRate: expect.any(Number),
              averageDuration: expect.any(Number)
            })
          }),
          charts: expect.any(Object),
          timeRange: '24h'
        })
      );
    });

    it('should clear telemetry data', async () => {
      // Arrange
      const clearTelemetryMessage = {
        type: 'clear_telemetry',
        payload: {
          categories: ['performance', 'usage'],
          olderThan: '7d',
          confirm: true
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, clearTelemetryMessage, popupSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          cleared: true,
          categories: expect.arrayContaining(['performance', 'usage']),
          itemsRemoved: expect.any(Number)
        })
      );
    });
  });

  describe('Error Handling in Popup Communication', () => {
    it('should handle popup closure during operation', async () => {
      // Arrange
      const longRunningMessage = {
        type: 'export_data',
        payload: {
          format: 'json',
          categories: ['sessions', 'diagnostics']
        }
      };
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      // Simulate popup closure by clearing the sender
      const { sendResponse } = simulateContentMessage(context, longRunningMessage, popupSender);
      
      // Simulate connection lost
      context.chrome.runtime.lastError = { message: 'The message port closed before a response was received.' };

      // Assert that background handles the disconnection gracefully
      await new Promise(resolve => setTimeout(resolve, 50));
      // The background should continue the operation even if popup closes
      expect(sendResponse).toHaveBeenCalled();
    });

    it('should validate popup origin for security', async () => {
      // Arrange
      const sensitiveMessage = {
        type: 'get_comprehensive_telemetry',
        payload: {}
      };
      const maliciousSender = createMockSender({
        url: 'https://malicious-site.com/fake-popup.html', // Invalid origin
        tab: undefined
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, sensitiveMessage, maliciousSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid sender origin'
        })
      );
    });
  });
});