/**
 * @fileoverview Integration tests for EventBus inter-component messaging
 * Tests the complete EventBus communication flow between all extension components
 * 
 * @author Ishka Extension Team
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus } from '../../src/utils/event-bus';
import { createMockEventBus } from './message-passing-utils';
import type { ChatGPTSession, SystemHealth, TelemetryEvent } from '../../src/utils/types';

describe('Integration Test: EventBus Inter-Component Messaging', () => {
  let eventBus: EventBus;
  let mockHandlers: Map<string, vi.Mock[]>;

  beforeEach(() => {
    eventBus = new EventBus();
    mockHandlers = new Map();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
    vi.clearAllMocks();
  });

  // Helper to create and track mock handlers
  function createMockHandler(event: string): vi.Mock {
    const handler = vi.fn();
    if (!mockHandlers.has(event)) {
      mockHandlers.set(event, []);
    }
    mockHandlers.get(event)!.push(handler);
    return handler;
  }

  describe('Session Management Events', () => {
    it('should coordinate session detection across components', async () => {
      // Arrange
      const sessionDetectedHandler = createMockHandler('session:detected');
      const sessionChangedHandler = createMockHandler('session:changed');
      const sessionStoredHandler = createMockHandler('session:stored');

      eventBus.on('session:detected', sessionDetectedHandler);
      eventBus.on('session:changed', sessionChangedHandler);
      eventBus.on('session:stored', sessionStoredHandler);

      const mockSession: ChatGPTSession = {
        id: 'session-abc-123',
        url: 'https://chat.openai.com/chat/conversation/abc-123',
        title: 'Test Conversation',
        timestamp: new Date().toISOString(),
        conversationId: 'conv-abc-123',
        messageCount: 5,
        isActive: true,
        metadata: {
          model: 'gpt-4',
          userAgent: 'Mozilla/5.0 Test',
          language: 'en'
        }
      };

      // Act - Simulate session detection flow
      eventBus.emit('session:detected', mockSession);
      
      // Simulate downstream events that should fire
      await new Promise(resolve => setTimeout(resolve, 10));
      eventBus.emit('session:changed', mockSession);
      eventBus.emit('session:stored', { sessionId: mockSession.id, success: true });

      // Assert
      expect(sessionDetectedHandler).toHaveBeenCalledOnce();
      expect(sessionDetectedHandler).toHaveBeenCalledWith(mockSession);
      
      expect(sessionChangedHandler).toHaveBeenCalledOnce();
      expect(sessionChangedHandler).toHaveBeenCalledWith(mockSession);
      
      expect(sessionStoredHandler).toHaveBeenCalledOnce();
      expect(sessionStoredHandler).toHaveBeenCalledWith({ 
        sessionId: mockSession.id, 
        success: true 
      });
    });

    it('should handle session end and cleanup coordination', async () => {
      // Arrange
      const sessionEndHandler = createMockHandler('session:ended');
      const sessionCleanupHandler = createMockHandler('session:cleanup');
      const telemetryUpdateHandler = createMockHandler('telemetry:session_ended');

      eventBus.on('session:ended', sessionEndHandler);
      eventBus.on('session:cleanup', sessionCleanupHandler);
      eventBus.on('telemetry:session_ended', telemetryUpdateHandler);

      const sessionEndData = {
        sessionId: 'session-abc-123',
        reason: 'navigation',
        duration: 45000,
        messageCount: 12,
        timestamp: new Date().toISOString()
      };

      // Act
      eventBus.emit('session:ended', sessionEndData);
      
      // Simulate cleanup cascade
      await new Promise(resolve => setTimeout(resolve, 10));
      eventBus.emit('session:cleanup', { sessionId: sessionEndData.sessionId });
      eventBus.emit('telemetry:session_ended', {
        sessionId: sessionEndData.sessionId,
        metrics: {
          duration: sessionEndData.duration,
          messageCount: sessionEndData.messageCount
        }
      });

      // Assert
      expect(sessionEndHandler).toHaveBeenCalledOnce();
      expect(sessionEndHandler).toHaveBeenCalledWith(sessionEndData);
      
      expect(sessionCleanupHandler).toHaveBeenCalledOnce();
      expect(telemetryUpdateHandler).toHaveBeenCalledOnce();
    });

    it('should handle concurrent session events without conflicts', async () => {
      // Arrange
      const sessionHandler = createMockHandler('session:concurrent');
      const calls: any[] = [];
      
      eventBus.on('session:concurrent', (data) => {
        calls.push(data);
        sessionHandler(data);
      });

      // Act - Emit multiple session events rapidly
      const sessions = Array.from({ length: 5 }, (_, i) => ({
        id: `session-${i}`,
        url: `https://chat.openai.com/chat/${i}`,
        timestamp: new Date().toISOString()
      }));

      sessions.forEach(session => {
        eventBus.emit('session:concurrent', session);
      });

      // Assert
      expect(sessionHandler).toHaveBeenCalledTimes(5);
      expect(calls).toHaveLength(5);
      
      // Verify all sessions were processed in order
      calls.forEach((call, index) => {
        expect(call.id).toBe(`session-${index}`);
      });
    });
  });

  describe('Diagnostic Event Coordination', () => {
    it('should coordinate diagnostic lifecycle across all components', async () => {
      // Arrange
      const diagnosticStartedHandler = createMockHandler('diagnostics:started');
      const diagnosticProgressHandler = createMockHandler('diagnostics:progress');
      const diagnosticCompletedHandler = createMockHandler('diagnostics:completed');
      const storeUpdateHandler = createMockHandler('store:diagnostic_update');

      eventBus.on('diagnostics:started', diagnosticStartedHandler);
      eventBus.on('diagnostics:progress', diagnosticProgressHandler);
      eventBus.on('diagnostics:completed', diagnosticCompletedHandler);
      eventBus.on('store:diagnostic_update', storeUpdateHandler);

      const diagnosticConfig = {
        categories: ['dom', 'api', 'storage'],
        source: 'background_auto',
        sessionId: 'session-123'
      };

      const diagnosticResults: SystemHealth = {
        overallStatus: 'healthy',
        timestamp: new Date().toISOString(),
        categories: {
          dom: { status: 'pass', tests: [{ category: 'Element Access', status: 'pass', message: 'DOM accessible' }] },
          api: { status: 'pass', tests: [{ category: 'Extension API', status: 'pass', message: 'API responding' }] },
          storage: { status: 'pass', tests: [{ category: 'Local Storage', status: 'pass', message: 'Storage working' }] }
        }
      };

      // Act - Simulate complete diagnostic flow
      eventBus.emit('diagnostics:started', diagnosticConfig);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      eventBus.emit('diagnostics:progress', { completed: 1, total: 3, category: 'dom' });
      eventBus.emit('diagnostics:progress', { completed: 2, total: 3, category: 'api' });
      eventBus.emit('diagnostics:progress', { completed: 3, total: 3, category: 'storage' });
      
      eventBus.emit('diagnostics:completed', diagnosticResults);
      eventBus.emit('store:diagnostic_update', { results: diagnosticResults });

      // Assert
      expect(diagnosticStartedHandler).toHaveBeenCalledOnce();
      expect(diagnosticStartedHandler).toHaveBeenCalledWith(diagnosticConfig);
      
      expect(diagnosticProgressHandler).toHaveBeenCalledTimes(3);
      expect(diagnosticCompletedHandler).toHaveBeenCalledOnce();
      expect(diagnosticCompletedHandler).toHaveBeenCalledWith(diagnosticResults);
      
      expect(storeUpdateHandler).toHaveBeenCalledOnce();
    });

    it('should handle diagnostic errors and recovery', async () => {
      // Arrange
      const diagnosticErrorHandler = createMockHandler('diagnostics:error');
      const diagnosticRetryHandler = createMockHandler('diagnostics:retry');
      const errorReportHandler = createMockHandler('error:reported');

      eventBus.on('diagnostics:error', diagnosticErrorHandler);
      eventBus.on('diagnostics:retry', diagnosticRetryHandler);
      eventBus.on('error:reported', errorReportHandler);

      const diagnosticError = {
        category: 'api',
        error: 'Extension API timeout',
        sessionId: 'session-123',
        retryAttempt: 1,
        maxRetries: 3
      };

      // Act
      eventBus.emit('diagnostics:error', diagnosticError);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      eventBus.emit('diagnostics:retry', { 
        ...diagnosticError, 
        retryAttempt: 2,
        delay: 2000 
      });
      
      eventBus.emit('error:reported', {
        type: 'diagnostic_failure',
        message: diagnosticError.error,
        context: { category: diagnosticError.category }
      });

      // Assert
      expect(diagnosticErrorHandler).toHaveBeenCalledOnce();
      expect(diagnosticRetryHandler).toHaveBeenCalledOnce();
      expect(errorReportHandler).toHaveBeenCalledOnce();
    });
  });

  describe('Performance and Telemetry Events', () => {
    it('should coordinate performance monitoring across components', async () => {
      // Arrange
      const performanceUpdateHandler = createMockHandler('performance:updated');
      const telemetryRecordHandler = createMockHandler('telemetry:record');
      const metricsAggregateHandler = createMockHandler('metrics:aggregate');

      eventBus.on('performance:updated', performanceUpdateHandler);
      eventBus.on('telemetry:record', telemetryRecordHandler);
      eventBus.on('metrics:aggregate', metricsAggregateHandler);

      const performanceData = {
        memoryUsage: { used: 25.6, total: 100 },
        cpuUsage: 15.2,
        responseTime: 150,
        timestamp: new Date().toISOString()
      };

      const telemetryEvent: TelemetryEvent = {
        type: 'performance',
        subtype: 'memory_check',
        timestamp: new Date().toISOString(),
        data: performanceData
      };

      // Act
      eventBus.emit('performance:updated', performanceData);
      eventBus.emit('telemetry:record', telemetryEvent);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      eventBus.emit('metrics:aggregate', {
        timeWindow: '1h',
        metrics: ['memory', 'cpu', 'responseTime']
      });

      // Assert
      expect(performanceUpdateHandler).toHaveBeenCalledOnce();
      expect(performanceUpdateHandler).toHaveBeenCalledWith(performanceData);
      
      expect(telemetryRecordHandler).toHaveBeenCalledOnce();
      expect(telemetryRecordHandler).toHaveBeenCalledWith(telemetryEvent);
      
      expect(metricsAggregateHandler).toHaveBeenCalledOnce();
    });

    it('should handle telemetry overflow and cleanup events', async () => {
      // Arrange
      const telemetryOverflowHandler = createMockHandler('telemetry:overflow');
      const telemetryCleanupHandler = createMockHandler('telemetry:cleanup');
      const memoryCleanupHandler = createMockHandler('memory:cleanup');

      eventBus.on('telemetry:overflow', telemetryOverflowHandler);
      eventBus.on('telemetry:cleanup', telemetryCleanupHandler);
      eventBus.on('memory:cleanup', memoryCleanupHandler);

      const overflowData = {
        eventCount: 10000,
        memoryMB: 150,
        threshold: 100,
        action: 'truncate_oldest'
      };

      // Act
      eventBus.emit('telemetry:overflow', overflowData);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      eventBus.emit('telemetry:cleanup', { itemsRemoved: 5000 });
      eventBus.emit('memory:cleanup', { memoryFreed: 50, totalMemory: 100 });

      // Assert
      expect(telemetryOverflowHandler).toHaveBeenCalledOnce();
      expect(telemetryCleanupHandler).toHaveBeenCalledOnce();
      expect(memoryCleanupHandler).toHaveBeenCalledOnce();
    });
  });

  describe('UI State Synchronization Events', () => {
    it('should synchronize dashboard state across content and popup', async () => {
      // Arrange
      const dashboardToggleHandler = createMockHandler('dashboard:toggle');
      const uiStateChangeHandler = createMockHandler('ui:state_change');
      const popupUpdateHandler = createMockHandler('popup:update_state');

      eventBus.on('dashboard:toggle', dashboardToggleHandler);
      eventBus.on('ui:state_change', uiStateChangeHandler);
      eventBus.on('popup:update_state', popupUpdateHandler);

      const dashboardState = {
        visible: true,
        activePanel: 'diagnostics',
        source: 'keyboard_shortcut',
        sessionId: 'session-123'
      };

      // Act
      eventBus.emit('dashboard:toggle', dashboardState);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      eventBus.emit('ui:state_change', { 
        component: 'dashboard', 
        state: dashboardState 
      });
      eventBus.emit('popup:update_state', {
        dashboardVisible: dashboardState.visible,
        activeSession: dashboardState.sessionId
      });

      // Assert
      expect(dashboardToggleHandler).toHaveBeenCalledOnce();
      expect(uiStateChangeHandler).toHaveBeenCalledOnce();
      expect(popupUpdateHandler).toHaveBeenCalledOnce();
    });

    it('should handle theme and configuration changes', async () => {
      // Arrange
      const configUpdateHandler = createMockHandler('config:updated');
      const themeChangeHandler = createMockHandler('theme:changed');
      const uiRefreshHandler = createMockHandler('ui:refresh');

      eventBus.on('config:updated', configUpdateHandler);
      eventBus.on('theme:changed', themeChangeHandler);
      eventBus.on('ui:refresh', uiRefreshHandler);

      const configUpdate = {
        autoRunDiagnostics: false,
        theme: 'dark',
        diagnosticsInterval: 600000
      };

      // Act
      eventBus.emit('config:updated', configUpdate);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      eventBus.emit('theme:changed', { theme: 'dark', source: 'config' });
      eventBus.emit('ui:refresh', { reason: 'config_change' });

      // Assert
      expect(configUpdateHandler).toHaveBeenCalledOnce();
      expect(themeChangeHandler).toHaveBeenCalledOnce();
      expect(uiRefreshHandler).toHaveBeenCalledOnce();
    });
  });

  describe('Error Propagation and Recovery', () => {
    it('should propagate errors across component boundaries', async () => {
      // Arrange
      const errorReportedHandler = createMockHandler('error:reported');
      const errorRecoveryHandler = createMockHandler('error:recovery');
      const componentErrorHandler = createMockHandler('component:error');

      eventBus.on('error:reported', errorReportedHandler);
      eventBus.on('error:recovery', errorRecoveryHandler);
      eventBus.on('component:error', componentErrorHandler);

      const error = {
        type: 'runtime_error',
        component: 'content_script',
        message: 'Failed to inject dashboard',
        stack: 'Error at ContentApp.svelte:45',
        sessionId: 'session-123',
        timestamp: new Date().toISOString()
      };

      // Act
      eventBus.emit('error:reported', error);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      eventBus.emit('component:error', {
        component: error.component,
        severity: 'high',
        recoverable: true
      });
      
      eventBus.emit('error:recovery', {
        errorId: 'error-123',
        strategy: 'restart_component',
        success: true
      });

      // Assert
      expect(errorReportedHandler).toHaveBeenCalledOnce();
      expect(componentErrorHandler).toHaveBeenCalledOnce();
      expect(errorRecoveryHandler).toHaveBeenCalledOnce();
    });

    it('should handle cascading error scenarios', async () => {
      // Arrange
      const cascadeStartHandler = createMockHandler('error:cascade_start');
      const cascadeStopHandler = createMockHandler('error:cascade_stop');
      const systemRecoveryHandler = createMockHandler('system:recovery');

      eventBus.on('error:cascade_start', cascadeStartHandler);
      eventBus.on('error:cascade_stop', cascadeStopHandler);
      eventBus.on('system:recovery', systemRecoveryHandler);

      // Act - Simulate error cascade
      eventBus.emit('error:cascade_start', { 
        triggerError: 'storage_failure',
        affectedComponents: ['background', 'content', 'popup']
      });
      
      // Simulate multiple component failures
      await new Promise(resolve => setTimeout(resolve, 10));
      ['background', 'content', 'popup'].forEach(component => {
        eventBus.emit('error:reported', {
          type: 'cascade_error',
          component,
          message: 'Storage unavailable'
        });
      });
      
      // Simulate recovery
      eventBus.emit('error:cascade_stop', { resolved: true });
      eventBus.emit('system:recovery', { 
        strategy: 'full_restart',
        componentsRecovered: 3
      });

      // Assert
      expect(cascadeStartHandler).toHaveBeenCalledOnce();
      expect(cascadeStopHandler).toHaveBeenCalledOnce();
      expect(systemRecoveryHandler).toHaveBeenCalledOnce();
    });
  });

  describe('EventBus Reliability and Edge Cases', () => {
    it('should handle handler exceptions without breaking other handlers', () => {
      // Arrange
      const goodHandler1 = createMockHandler('test:exception');
      const badHandler = vi.fn(() => { throw new Error('Handler error'); });
      const goodHandler2 = createMockHandler('test:exception');

      eventBus.on('test:exception', goodHandler1);
      eventBus.on('test:exception', badHandler);
      eventBus.on('test:exception', goodHandler2);

      // Act
      eventBus.emit('test:exception', { data: 'test' });

      // Assert - Good handlers should still execute
      expect(goodHandler1).toHaveBeenCalledOnce();
      expect(goodHandler2).toHaveBeenCalledOnce();
      expect(badHandler).toHaveBeenCalledOnce();
    });

    it('should handle rapid event emission without memory leaks', () => {
      // Arrange
      const handler = createMockHandler('rapid:emission');
      eventBus.on('rapid:emission', handler);

      // Act - Emit many events rapidly
      for (let i = 0; i < 1000; i++) {
        eventBus.emit('rapid:emission', { index: i });
      }

      // Assert
      expect(handler).toHaveBeenCalledTimes(1000);
      expect(eventBus.getEventCount('rapid:emission')).toBe(1);
    });

    it('should properly clean up listeners on unsubscribe', () => {
      // Arrange
      const handler1 = createMockHandler('cleanup:test');
      const handler2 = createMockHandler('cleanup:test');
      
      const unsubscribe1 = eventBus.on('cleanup:test', handler1);
      const unsubscribe2 = eventBus.on('cleanup:test', handler2);

      // Verify initial state
      expect(eventBus.getEventCount('cleanup:test')).toBe(2);

      // Act
      unsubscribe1();
      expect(eventBus.getEventCount('cleanup:test')).toBe(1);

      eventBus.emit('cleanup:test', { data: 'after_unsubscribe' });

      // Assert
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();

      // Final cleanup
      unsubscribe2();
      expect(eventBus.getEventCount('cleanup:test')).toBe(0);
    });

    it('should handle once listeners correctly', () => {
      // Arrange
      const onceHandler = createMockHandler('once:test');
      const persistentHandler = createMockHandler('once:test');

      eventBus.once('once:test', onceHandler);
      eventBus.on('once:test', persistentHandler);

      // Act
      eventBus.emit('once:test', { first: true });
      eventBus.emit('once:test', { second: true });

      // Assert
      expect(onceHandler).toHaveBeenCalledOnce();
      expect(onceHandler).toHaveBeenCalledWith({ first: true });
      
      expect(persistentHandler).toHaveBeenCalledTimes(2);
      expect(persistentHandler).toHaveBeenNthCalledWith(1, { first: true });
      expect(persistentHandler).toHaveBeenNthCalledWith(2, { second: true });
    });
  });

  describe('Cross-Component Integration Scenarios', () => {
    it('should handle complete session lifecycle with all components', async () => {
      // Arrange - Setup handlers for all components
      const contentHandlers = {
        sessionDetected: createMockHandler('content:session_detected'),
        dashboardUpdate: createMockHandler('content:dashboard_update')
      };
      
      const backgroundHandlers = {
        sessionStored: createMockHandler('background:session_stored'),
        telemetryUpdate: createMockHandler('background:telemetry_update')
      };
      
      const popupHandlers = {
        sessionList: createMockHandler('popup:session_list_update'),
        statusUpdate: createMockHandler('popup:status_update')
      };

      // Subscribe all handlers
      Object.entries(contentHandlers).forEach(([key, handler]) => {
        eventBus.on(`content:${key.replace(/([A-Z])/g, '_$1').toLowerCase()}`, handler);
      });
      
      Object.entries(backgroundHandlers).forEach(([key, handler]) => {
        eventBus.on(`background:${key.replace(/([A-Z])/g, '_$1').toLowerCase()}`, handler);
      });
      
      Object.entries(popupHandlers).forEach(([key, handler]) => {
        eventBus.on(`popup:${key.replace(/([A-Z])/g, '_$1').toLowerCase()}`, handler);
      });

      // Act - Simulate complete session lifecycle
      const session: ChatGPTSession = {
        id: 'session-full-lifecycle',
        url: 'https://chat.openai.com/chat',
        title: 'Integration Test Session',
        timestamp: new Date().toISOString(),
        conversationId: 'conv-integration',
        messageCount: 0,
        isActive: true
      };

      // 1. Content script detects session
      eventBus.emit('content:session_detected', session);
      
      // 2. Background stores session
      await new Promise(resolve => setTimeout(resolve, 10));
      eventBus.emit('background:session_stored', { sessionId: session.id, success: true });
      
      // 3. Dashboard updates
      eventBus.emit('content:dashboard_update', { session, visible: true });
      
      // 4. Telemetry records event
      eventBus.emit('background:telemetry_update', {
        type: 'session_created',
        sessionId: session.id
      });
      
      // 5. Popup updates session list
      eventBus.emit('popup:session_list_update', { sessions: [session] });
      eventBus.emit('popup:status_update', { activeSession: session.id });

      // Assert - All components received their events
      expect(contentHandlers.sessionDetected).toHaveBeenCalledWith(session);
      expect(contentHandlers.dashboardUpdate).toHaveBeenCalled();
      
      expect(backgroundHandlers.sessionStored).toHaveBeenCalled();
      expect(backgroundHandlers.telemetryUpdate).toHaveBeenCalled();
      
      expect(popupHandlers.sessionList).toHaveBeenCalled();
      expect(popupHandlers.statusUpdate).toHaveBeenCalled();
    });
  });
});