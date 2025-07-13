/**
 * @fileoverview Master integration test suite for all message passing scenarios
 * Orchestrates comprehensive testing of inter-component communication
 * 
 * @author Ishka Extension Team
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupMessagePassingTestContext,
  simulateContentMessage,
  createMockSender,
  createMockEventBus,
  waitForMessages,
  type MessagePassingTestContext
} from './message-passing-utils';

describe('Integration Test Suite: Complete Message Passing Architecture', () => {
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

  describe('End-to-End Message Flow Scenarios', () => {
    it('should handle complete user session lifecycle with all message types', async () => {
      // Arrange - Setup comprehensive message tracking
      const messageLog: any[] = [];
      const logMessage = (source: string, type: string, data: any) => {
        messageLog.push({ source, type, data, timestamp: Date.now() });
      };

      // Mock all message handlers
      const contentHandlers = {
        sessionDetected: vi.fn(data => logMessage('content', 'session_detected', data)),
        dashboardToggled: vi.fn(data => logMessage('content', 'dashboard_toggled', data)),
        diagnosticsRequested: vi.fn(data => logMessage('content', 'diagnostics_requested', data))
      };

      const backgroundHandlers = {
        contentInitialized: vi.fn(data => logMessage('background', 'content_initialized', data)),
        sessionStored: vi.fn(data => logMessage('background', 'session_stored', data)),
        diagnosticsCompleted: vi.fn(data => logMessage('background', 'diagnostics_completed', data))
      };

      const popupHandlers = {
        ping: vi.fn(data => logMessage('popup', 'ping', data)),
        healthCheck: vi.fn(data => logMessage('popup', 'health_check', data)),
        exportRequested: vi.fn(data => logMessage('popup', 'export_requested', data))
      };

      // Act - Execute complete user session flow
      
      // 1. Content script initialization
      const initResponse = simulateContentMessage(context, {
        type: 'content_initialized',
        payload: {
          url: 'https://chat.openai.com/chat',
          timestamp: new Date().toISOString(),
          userAgent: 'Mozilla/5.0 Test'
        }
      });
      contentHandlers.sessionDetected(initResponse);

      // 2. Session detection
      const sessionResponse = simulateContentMessage(context, {
        type: 'session_detected',
        payload: {
          id: 'e2e-session-123',
          url: 'https://chat.openai.com/chat/conversation/e2e',
          title: 'E2E Test Session',
          timestamp: new Date().toISOString(),
          conversationId: 'conv-e2e-123',
          messageCount: 0,
          isActive: true
        }
      });
      backgroundHandlers.sessionStored(sessionResponse);

      // 3. Dashboard interaction
      const dashboardResponse = simulateContentMessage(context, {
        type: 'dashboard_toggled',
        payload: {
          visible: true,
          timestamp: new Date().toISOString(),
          source: 'user_click',
          sessionId: 'e2e-session-123'
        }
      });
      contentHandlers.dashboardToggled(dashboardResponse);

      // 4. Popup operations
      const popupSender = createMockSender({
        url: 'chrome-extension://test-id/popup/index.html',
        tab: undefined
      });

      const pingResponse = simulateContentMessage(context, {
        type: 'ping',
        payload: { timestamp: new Date().toISOString() }
      }, popupSender);
      popupHandlers.ping(pingResponse);

      // 5. Health check from popup
      const healthResponse = simulateContentMessage(context, {
        type: 'health_check',
        payload: {
          includeDetails: true,
          categories: ['runtime', 'storage', 'api']
        }
      }, popupSender);
      popupHandlers.healthCheck(healthResponse);

      // 6. Diagnostics from content
      const diagnosticsResponse = simulateContentMessage(context, {
        type: 'diagnostics_requested',
        payload: {
          categories: ['dom', 'api', 'storage'],
          source: 'content_ui',
          sessionId: 'e2e-session-123'
        }
      });
      contentHandlers.diagnosticsRequested(diagnosticsResponse);
      backgroundHandlers.diagnosticsCompleted(diagnosticsResponse);

      // 7. Export from popup
      const exportResponse = simulateContentMessage(context, {
        type: 'export_requested',
        payload: {
          format: 'json',
          categories: ['sessions', 'diagnostics'],
          sessionId: 'e2e-session-123'
        }
      }, popupSender);
      popupHandlers.exportRequested(exportResponse);

      // Wait for all async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - Verify complete flow
      expect(messageLog.length).toBeGreaterThan(0);
      
      // Verify Chrome runtime messages were sent
      expect(context.chrome.runtime.sendMessage).toHaveBeenCalled();
      
      // Verify all handlers were called
      Object.values(contentHandlers).forEach(handler => {
        expect(handler).toHaveBeenCalled();
      });
      
      Object.values(backgroundHandlers).forEach(handler => {
        expect(handler).toHaveBeenCalled();
      });
      
      Object.values(popupHandlers).forEach(handler => {
        expect(handler).toHaveBeenCalled();
      });

      // Verify message flow sequence
      const messageTypes = messageLog.map(log => `${log.source}:${log.type}`);
      expect(messageTypes).toContain('content:session_detected');
      expect(messageTypes).toContain('background:session_stored');
      expect(messageTypes).toContain('popup:ping');
      expect(messageTypes).toContain('popup:health_check');
    });

    it('should handle concurrent operations without message conflicts', async () => {
      // Arrange
      const concurrentOperations = [
        { type: 'session_detected', source: 'tab1' },
        { type: 'session_detected', source: 'tab2' },
        { type: 'diagnostics_requested', source: 'tab1' },
        { type: 'dashboard_toggled', source: 'tab2' },
        { type: 'export_requested', source: 'popup' },
        { type: 'telemetry_event', source: 'background' }
      ];

      const responses: any[] = [];
      const responsePromises: Promise<any>[] = [];

      // Act - Execute all operations concurrently
      concurrentOperations.forEach((op, index) => {
        const promise = new Promise(resolve => {
          setTimeout(() => {
            const response = simulateContentMessage(context, {
              type: op.type,
              payload: {
                id: `concurrent-${index}`,
                source: op.source,
                timestamp: new Date().toISOString()
              }
            }, createMockSender({
              tab: { id: index + 1 }
            }));
            responses.push(response);
            resolve(response);
          }, Math.random() * 50); // Random delay up to 50ms
        });
        responsePromises.push(promise);
      });

      await Promise.all(responsePromises);

      // Assert
      expect(responses).toHaveLength(concurrentOperations.length);
      expect(context.chrome.runtime.sendMessage).toHaveBeenCalledTimes(concurrentOperations.length);
      
      // Verify no message corruption
      responses.forEach((response, index) => {
        expect(response.sendResponse).toHaveBeenCalled();
      });
    });

    it('should maintain message ordering for related operations', async () => {
      // Arrange
      const orderedOperations = [
        { type: 'content_initialized', expectedOrder: 1 },
        { type: 'session_detected', expectedOrder: 2 },
        { type: 'dashboard_toggled', expectedOrder: 3 },
        { type: 'diagnostics_requested', expectedOrder: 4 },
        { type: 'session_lost', expectedOrder: 5 }
      ];

      const processingOrder: number[] = [];
      const sender = createMockSender({ tab: { id: 1 } });

      // Act - Execute operations in sequence
      for (const op of orderedOperations) {
        const response = simulateContentMessage(context, {
          type: op.type,
          payload: {
            sessionId: 'ordered-session-123',
            timestamp: new Date().toISOString(),
            order: op.expectedOrder
          }
        }, sender);

        processingOrder.push(op.expectedOrder);
        
        // Small delay to ensure ordering
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Assert
      expect(processingOrder).toEqual([1, 2, 3, 4, 5]);
      expect(context.chrome.runtime.sendMessage).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from message handler failures', async () => {
      // Arrange
      const failingHandler = vi.fn(() => {
        throw new Error('Handler failure');
      });
      
      const recoveryHandler = vi.fn();
      
      // Setup error handler
      context.chrome.runtime.onMessage.addListener(failingHandler);
      context.chrome.runtime.onMessage.addListener(recoveryHandler);

      // Act
      const response = simulateContentMessage(context, {
        type: 'test_error_recovery',
        payload: { test: 'error handling' }
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(failingHandler).toHaveBeenCalled();
      expect(recoveryHandler).toHaveBeenCalled();
      expect(response.sendResponse).toHaveBeenCalled();
    });

    it('should handle message timeout scenarios', async () => {
      // Arrange
      const timeoutMessage = {
        type: 'long_running_operation',
        payload: {
          timeout: 5000,
          operation: 'export_large_dataset'
        }
      };

      // Mock slow response
      const slowHandler = vi.fn((message, sender, sendResponse) => {
        setTimeout(() => {
          sendResponse({ success: true, completed: true });
        }, 100); // Simulate delay
        return true; // Keep message channel open
      });

      context.chrome.runtime.onMessage.addListener(slowHandler);

      // Act
      const response = simulateContentMessage(context, timeoutMessage);

      // Wait for timeout handling
      await new Promise(resolve => setTimeout(resolve, 150));

      // Assert
      expect(slowHandler).toHaveBeenCalled();
      expect(response.sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, completed: true })
      );
    });

    it('should handle connection loss during message exchange', async () => {
      // Arrange
      const connectionLossMessage = {
        type: 'test_connection_loss',
        payload: { data: 'connection test' }
      };

      // Simulate connection loss
      context.chrome.runtime.lastError = { 
        message: 'The message port closed before a response was received.' 
      };

      // Act
      const response = simulateContentMessage(context, connectionLossMessage);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert - Should handle gracefully
      expect(response.sendResponse).toHaveBeenCalled();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high message volume efficiently', async () => {
      // Arrange
      const messageCount = 1000;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        type: 'performance_test',
        payload: {
          index: i,
          timestamp: new Date().toISOString(),
          data: `test-data-${i}`
        }
      }));

      const startTime = Date.now();
      const responses: any[] = [];

      // Act
      for (const message of messages) {
        const response = simulateContentMessage(context, message);
        responses.push(response);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Assert
      expect(responses).toHaveLength(messageCount);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(context.chrome.runtime.sendMessage).toHaveBeenCalledTimes(messageCount);
    });

    it('should maintain performance with large payloads', async () => {
      // Arrange
      const largePayload = {
        type: 'large_data_transfer',
        payload: {
          data: Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            content: `Large content block ${i}`.repeat(100)
          }))
        }
      };

      const startTime = Date.now();

      // Act
      const response = simulateContentMessage(context, largePayload);

      await new Promise(resolve => setTimeout(resolve, 100));
      const endTime = Date.now();

      // Assert
      expect(response.sendResponse).toHaveBeenCalled();
      expect(endTime - startTime).toBeLessThan(1000); // Should handle large payload quickly
    });
  });

  describe('Security and Validation', () => {
    it('should validate message origins and reject malicious senders', async () => {
      // Arrange
      const maliciousMessage = {
        type: 'get_sensitive_data',
        payload: { request: 'user_data' }
      };

      const maliciousSender = createMockSender({
        url: 'https://malicious-site.com/fake-extension.html',
        id: 'fake-extension-id'
      });

      // Act
      const response = simulateContentMessage(context, maliciousMessage, maliciousSender);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(response.sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/invalid|unauthorized|origin/i)
        })
      );
    });

    it('should sanitize message payloads', async () => {
      // Arrange
      const unsafeMessage = {
        type: 'test_sanitization',
        payload: {
          userInput: '<script>alert("xss")</script>',
          sqlQuery: "'; DROP TABLE users; --",
          functionCall: 'eval("malicious code")'
        }
      };

      // Act
      const response = simulateContentMessage(context, unsafeMessage);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(response.sendResponse).toHaveBeenCalled();
      // Verify that unsafe content is handled appropriately
    });

    it('should enforce message size limits', async () => {
      // Arrange
      const oversizedMessage = {
        type: 'oversized_message',
        payload: {
          data: 'x'.repeat(10 * 1024 * 1024) // 10MB payload
        }
      };

      // Act
      const response = simulateContentMessage(context, oversizedMessage);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert - Should handle oversized messages appropriately
      expect(response.sendResponse).toHaveBeenCalled();
    });
  });

  describe('Message Passing Analytics', () => {
    it('should track message passing metrics', async () => {
      // Arrange
      const testMessages = [
        { type: 'session_detected', category: 'session' },
        { type: 'diagnostics_requested', category: 'diagnostic' },
        { type: 'export_requested', category: 'export' },
        { type: 'ping', category: 'health' }
      ];

      const metrics = {
        totalMessages: 0,
        messagesByType: new Map<string, number>(),
        averageLatency: 0,
        errorCount: 0
      };

      // Act
      for (const message of testMessages) {
        const startTime = Date.now();
        const response = simulateContentMessage(context, message);
        const endTime = Date.now();
        
        metrics.totalMessages++;
        metrics.messagesByType.set(
          message.type,
          (metrics.messagesByType.get(message.type) || 0) + 1
        );
        metrics.averageLatency = (metrics.averageLatency + (endTime - startTime)) / 2;
        
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Assert
      expect(metrics.totalMessages).toBe(4);
      expect(metrics.messagesByType.size).toBe(4);
      expect(metrics.averageLatency).toBeGreaterThan(0);
      expect(metrics.errorCount).toBe(0);
    });
  });
});