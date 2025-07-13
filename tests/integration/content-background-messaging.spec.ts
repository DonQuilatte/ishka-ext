/**
 * @fileoverview Integration tests for content script to background message passing
 * Tests the complete communication flow between content scripts and background service worker
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

describe('Integration Test: Content Script to Background Messaging', () => {
  let context: MessagePassingTestContext;
  let mockEventBus: any;
  let backgroundScript: any;

  beforeEach(async () => {
    context = setupMessagePassingTestContext();
    mockEventBus = createMockEventBus();
    
    // Mock the background script class - just create a basic mock for testing
    backgroundScript = {
      handleContentMessage: vi.fn((message, sender, sendResponse) => {
        // Basic message handling simulation
        const response = { success: true, type: `${message.type}_response` };
        sendResponse(response);
        return true;
      })
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockEventBus._clear();
    delete (global as any).chrome;
  });

  describe('Session Management Messages', () => {
    it('should handle content_initialized message', async () => {
      // Arrange
      const initMessage = {
        type: 'content_initialized',
        payload: {
          url: 'https://chat.openai.com/chat',
          timestamp: new Date().toISOString(),
          userAgent: 'Mozilla/5.0 (Test Browser)'
        }
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, initMessage, sender);

      // Assert
      expect(context.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
      
      // Verify the response indicates successful initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'content_initialized_response'
        })
      );
    });

    it('should handle session_detected message and update active tabs', async () => {
      // Arrange
      const sessionMessage = {
        type: 'session_detected',
        payload: {
          id: 'session-123',
          url: 'https://chat.openai.com/chat/conversation/abc',
          title: 'New Chat Session',
          timestamp: new Date().toISOString(),
          conversationId: 'conv-abc-123',
          messageCount: 0
        }
      };
      const sender = createMockSender({ tab: { id: 42 } });

      // Act
      const { sendResponse } = simulateContentMessage(context, sessionMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sessionStored: true
        })
      );
    });

    it('should handle session_lost message and clean up tab tracking', async () => {
      // Arrange - First establish a session
      const sessionDetectedMessage = {
        type: 'session_detected',
        payload: { id: 'session-to-lose', url: 'https://chat.openai.com/chat' }
      };
      const sender = createMockSender({ tab: { id: 42 } });
      
      simulateContentMessage(context, sessionDetectedMessage, sender);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act - Now lose the session
      const sessionLostMessage = {
        type: 'session_lost',
        payload: {
          sessionId: 'session-to-lose',
          reason: 'navigation',
          timestamp: new Date().toISOString()
        }
      };

      const { sendResponse } = simulateContentMessage(context, sessionLostMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          sessionRemoved: true
        })
      );
    });

    it('should handle url_changed message and update session tracking', async () => {
      // Arrange
      const urlChangeMessage = {
        type: 'url_changed',
        payload: {
          oldUrl: 'https://chat.openai.com/chat',
          newUrl: 'https://chat.openai.com/chat/conversation/new-123',
          timestamp: new Date().toISOString(),
          sessionId: 'session-123'
        }
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, urlChangeMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          urlUpdated: true
        })
      );
    });
  });

  describe('Dashboard and UI Messages', () => {
    it('should handle dashboard_toggled message', async () => {
      // Arrange
      const dashboardMessage = {
        type: 'dashboard_toggled',
        payload: {
          visible: true,
          timestamp: new Date().toISOString(),
          source: 'content_script',
          sessionId: 'session-123'
        }
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, dashboardMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          dashboardState: 'visible'
        })
      );
    });

    it('should handle dashboard toggle with analytics tracking', async () => {
      // Arrange
      const dashboardMessage = {
        type: 'dashboard_toggled',
        payload: {
          visible: false,
          timestamp: new Date().toISOString(),
          source: 'keyboard_shortcut',
          sessionId: 'session-123',
          analytics: {
            timeOpen: 45000, // 45 seconds
            interactionCount: 3
          }
        }
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, dashboardMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          dashboardState: 'hidden',
          analyticsRecorded: true
        })
      );
    });
  });

  describe('Diagnostic Messages', () => {
    it('should handle diagnostics_requested message', async () => {
      // Arrange
      const diagnosticsMessage = {
        type: 'diagnostics_requested',
        payload: {
          categories: ['dom', 'api', 'storage'],
          source: 'content_ui',
          sessionId: 'session-123',
          timestamp: new Date().toISOString()
        }
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, diagnosticsMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 50)); // More time for diagnostics
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          diagnosticsStarted: true,
          categories: expect.arrayContaining(['dom', 'api', 'storage'])
        })
      );
    });

    it('should handle diagnostics request with custom configuration', async () => {
      // Arrange
      const diagnosticsMessage = {
        type: 'diagnostics_requested',
        payload: {
          categories: ['performance'],
          config: {
            timeout: 10000,
            detailedResults: true,
            includeMetrics: true
          },
          source: 'manual_trigger',
          sessionId: 'session-123'
        }
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, diagnosticsMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          diagnosticsStarted: true,
          config: expect.objectContaining({
            timeout: 10000,
            detailedResults: true
          })
        })
      );
    });
  });

  describe('Export and Data Messages', () => {
    it('should handle export_requested message', async () => {
      // Arrange
      const exportMessage = {
        type: 'export_requested',
        payload: {
          format: 'json',
          categories: ['sessions', 'diagnostics', 'telemetry'],
          dateRange: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-12-31T23:59:59Z'
          },
          includeMetadata: true,
          sessionId: 'session-123'
        }
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, exportMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          exportStarted: true,
          format: 'json'
        })
      );
    });

    it('should handle export request with CSV format', async () => {
      // Arrange
      const exportMessage = {
        type: 'export_requested',
        payload: {
          format: 'csv',
          categories: ['sessions'],
          compression: true,
          sessionId: 'session-123'
        }
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, exportMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          exportStarted: true,
          format: 'csv',
          compression: true
        })
      );
    });
  });

  describe('Telemetry Messages', () => {
    it('should handle get_telemetry message', async () => {
      // Arrange
      const telemetryMessage = {
        type: 'get_telemetry',
        payload: {
          includeHistory: true,
          categories: ['performance', 'usage', 'errors'],
          sessionId: 'session-123'
        }
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, telemetryMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          telemetry: expect.objectContaining({
            performance: expect.any(Object),
            usage: expect.any(Object),
            errors: expect.any(Object)
          })
        })
      );
    });

    it('should handle telemetry_event message', async () => {
      // Arrange
      const telemetryEventMessage = {
        type: 'telemetry_event',
        payload: {
          event: 'feature_used',
          data: {
            feature: 'search_history',
            duration: 2500,
            success: true,
            metadata: {
              queryLength: 25,
              resultsCount: 12
            }
          },
          sessionId: 'session-123',
          timestamp: new Date().toISOString()
        }
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, telemetryEventMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          eventRecorded: true
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed messages gracefully', async () => {
      // Arrange
      const malformedMessage = {
        // Missing type field
        payload: 'invalid payload'
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, malformedMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid message format'
        })
      );
    });

    it('should handle unknown message types', async () => {
      // Arrange
      const unknownMessage = {
        type: 'unknown_message_type',
        payload: { data: 'test' }
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, unknownMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unknown message type: unknown_message_type'
        })
      );
    });

    it('should handle messages from invalid senders', async () => {
      // Arrange
      const validMessage = {
        type: 'session_detected',
        payload: { id: 'session-123' }
      };
      const invalidSender = createMockSender({
        tab: undefined // Invalid tab
      });

      // Act
      const { sendResponse } = simulateContentMessage(context, validMessage, invalidSender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid sender'
        })
      );
    });
  });

  describe('Message Broadcasting', () => {
    it('should broadcast updates to all active tabs', async () => {
      // Arrange - Setup multiple active tabs
      const tab1Sender = createMockSender({ tab: { id: 1 } });
      const tab2Sender = createMockSender({ tab: { id: 2 } });
      
      // Initialize sessions for both tabs
      simulateContentMessage(context, {
        type: 'content_initialized',
        payload: { url: 'https://chat.openai.com/chat' }
      }, tab1Sender);
      
      simulateContentMessage(context, {
        type: 'content_initialized',
        payload: { url: 'https://chatgpt.com/chat' }
      }, tab2Sender);
      
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act - Trigger a diagnostic that should broadcast to all tabs
      simulateContentMessage(context, {
        type: 'diagnostics_requested',
        payload: { categories: ['all'], broadcast: true }
      }, tab1Sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify that messages were sent to both tabs
      expect(context.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ type: 'diagnostics_broadcast' }),
        expect.any(Function)
      );
      
      expect(context.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ type: 'diagnostics_broadcast' }),
        expect.any(Function)
      );
    });
  });

  describe('Memory Cleanup Messages', () => {
    it('should handle trigger_cleanup message', async () => {
      // Arrange
      const cleanupMessage = {
        type: 'trigger_cleanup',
        payload: {
          force: true,
          categories: ['sessions', 'telemetry', 'cache'],
          sessionId: 'session-123'
        }
      };
      const sender = createMockSender();

      // Act
      const { sendResponse } = simulateContentMessage(context, cleanupMessage, sender);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          cleanupCompleted: true,
          itemsRemoved: expect.any(Number)
        })
      );
    });
  });
});