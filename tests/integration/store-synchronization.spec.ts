/**
 * @fileoverview Integration tests for store synchronization across components
 * Tests how Svelte stores maintain consistency across content script, background, and popup
 * 
 * @author Ishka Extension Team
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { createMockEventBus } from './message-passing-utils';
import type { ChatGPTSession, SystemHealth, TelemetryEvent } from '../../src/utils/types';

// Mock stores for testing
const createMockStore = <T>(initialValue: T) => {
  let value = initialValue;
  const subscribers: Array<(value: T) => void> = [];
  
  return {
    subscribe: (callback: (value: T) => void) => {
      subscribers.push(callback);
      callback(value);
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) subscribers.splice(index, 1);
      };
    },
    set: (newValue: T) => {
      value = newValue;
      subscribers.forEach(callback => callback(value));
    },
    update: (updater: (value: T) => T) => {
      value = updater(value);
      subscribers.forEach(callback => callback(value));
    },
    get: () => value
  };
};

describe('Integration Test: Store Synchronization Across Components', () => {
  let mockEventBus: any;
  let mockSessionStore: any;
  let mockTelemetryStore: any;
  let mockDiagnosticStore: any;
  let mockUiStore: any;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    
    // Create mock stores with initial states
    mockSessionStore = {
      currentSession: createMockStore<ChatGPTSession | null>(null),
      sessionHistory: createMockStore<ChatGPTSession[]>([]),
      activeSessions: createMockStore<Map<number, ChatGPTSession>>(new Map()),
      isTracking: createMockStore<boolean>(false)
    };

    mockTelemetryStore = {
      metrics: createMockStore({
        sessionCount: 0,
        activeSessionId: null,
        sessionDuration: 0,
        lastSessionChange: '',
        messageCount: 0,
        totalMessages: 0,
        avgResponseTime: 0,
        componentHealth: {},
        testResults: null
      }),
      events: createMockStore<TelemetryEvent[]>([]),
      isRecording: createMockStore<boolean>(true)
    };

    mockDiagnosticStore = {
      systemHealth: createMockStore<SystemHealth | null>(null),
      isRunning: createMockStore<boolean>(false),
      lastRunTime: createMockStore<string | null>(null),
      diagnosticHistory: createMockStore<SystemHealth[]>([])
    };

    mockUiStore = {
      dashboardVisible: createMockStore<boolean>(false),
      activePanel: createMockStore<string>('diagnostics'),
      theme: createMockStore<string>('light'),
      isPopupOpen: createMockStore<boolean>(false)
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockEventBus._clear();
  });

  describe('Session Store Synchronization', () => {
    it('should synchronize session detection across all components', async () => {
      // Arrange
      const mockSession: ChatGPTSession = {
        id: 'session-sync-test',
        url: 'https://chat.openai.com/chat/conversation/test',
        title: 'Sync Test Session',
        timestamp: new Date().toISOString(),
        conversationId: 'conv-test-123',
        messageCount: 0,
        isActive: true
      };

      const contentSubscriber = vi.fn();
      const backgroundSubscriber = vi.fn();
      const popupSubscriber = vi.fn();

      // Subscribe to store changes
      mockSessionStore.currentSession.subscribe(contentSubscriber);
      mockSessionStore.currentSession.subscribe(backgroundSubscriber);
      mockSessionStore.currentSession.subscribe(popupSubscriber);

      // Act - Simulate session detection in content script
      mockEventBus.emit('session:detected', mockSession);
      
      // Simulate store update
      mockSessionStore.currentSession.set(mockSession);

      // Assert
      expect(contentSubscriber).toHaveBeenCalledWith(mockSession);
      expect(backgroundSubscriber).toHaveBeenCalledWith(mockSession);
      expect(popupSubscriber).toHaveBeenCalledWith(mockSession);
      
      expect(mockSessionStore.currentSession.get()).toEqual(mockSession);
    });

    it('should maintain session history consistency across components', async () => {
      // Arrange
      const sessions: ChatGPTSession[] = [
        {
          id: 'session-1',
          url: 'https://chat.openai.com/chat/1',
          title: 'Session 1',
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          conversationId: 'conv-1',
          messageCount: 5,
          isActive: false
        },
        {
          id: 'session-2',
          url: 'https://chat.openai.com/chat/2',
          title: 'Session 2',
          timestamp: new Date().toISOString(),
          conversationId: 'conv-2',
          messageCount: 3,
          isActive: true
        }
      ];

      const historySubscribers = [vi.fn(), vi.fn(), vi.fn()];
      historySubscribers.forEach(subscriber => {
        mockSessionStore.sessionHistory.subscribe(subscriber);
      });

      // Act - Add sessions to history
      sessions.forEach(session => {
        mockEventBus.emit('session:stored', session);
        mockSessionStore.sessionHistory.update(history => [...history, session]);
      });

      // Assert
      historySubscribers.forEach(subscriber => {
        expect(subscriber).toHaveBeenCalledWith(sessions);
      });
      
      expect(mockSessionStore.sessionHistory.get()).toEqual(sessions);
      expect(mockSessionStore.sessionHistory.get()).toHaveLength(2);
    });

    it('should handle session cleanup and synchronization', async () => {
      // Arrange
      const initialSessions = new Map([
        [1, { id: 'session-tab-1', url: 'https://chat.openai.com/1', title: 'Tab 1 Session' }],
        [2, { id: 'session-tab-2', url: 'https://chat.openai.com/2', title: 'Tab 2 Session' }],
        [3, { id: 'session-tab-3', url: 'https://chat.openai.com/3', title: 'Tab 3 Session' }]
      ]);

      mockSessionStore.activeSessions.set(initialSessions);

      const cleanupSubscriber = vi.fn();
      mockSessionStore.activeSessions.subscribe(cleanupSubscriber);

      // Act - Simulate tab cleanup (remove tab 2)
      mockEventBus.emit('session:cleanup', { tabId: 2, reason: 'tab_closed' });
      
      mockSessionStore.activeSessions.update(sessions => {
        const updated = new Map(sessions);
        updated.delete(2);
        return updated;
      });

      // Assert
      const finalSessions = mockSessionStore.activeSessions.get();
      expect(finalSessions.size).toBe(2);
      expect(finalSessions.has(1)).toBe(true);
      expect(finalSessions.has(2)).toBe(false);
      expect(finalSessions.has(3)).toBe(true);
      
      expect(cleanupSubscriber).toHaveBeenCalledWith(finalSessions);
    });
  });

  describe('Telemetry Store Synchronization', () => {
    it('should synchronize telemetry metrics across components', async () => {
      // Arrange
      const metricsSubscribers = [vi.fn(), vi.fn(), vi.fn()];
      metricsSubscribers.forEach(subscriber => {
        mockTelemetryStore.metrics.subscribe(subscriber);
      });

      const telemetryUpdate = {
        sessionCount: 5,
        activeSessionId: 'session-123',
        sessionDuration: 45000,
        messageCount: 12,
        totalMessages: 156,
        avgResponseTime: 1250,
        componentHealth: {
          content: 'pass',
          background: 'pass',
          popup: 'pass'
        }
      };

      // Act - Update telemetry from background
      mockEventBus.emit('telemetry:updated', telemetryUpdate);
      mockTelemetryStore.metrics.update(current => ({
        ...current,
        ...telemetryUpdate
      }));

      // Assert
      const updatedMetrics = mockTelemetryStore.metrics.get();
      expect(updatedMetrics.sessionCount).toBe(5);
      expect(updatedMetrics.activeSessionId).toBe('session-123');
      expect(updatedMetrics.avgResponseTime).toBe(1250);
      
      metricsSubscribers.forEach(subscriber => {
        expect(subscriber).toHaveBeenCalledWith(expect.objectContaining(telemetryUpdate));
      });
    });

    it('should synchronize telemetry events across components', async () => {
      // Arrange
      const eventsSubscribers = [vi.fn(), vi.fn()];
      eventsSubscribers.forEach(subscriber => {
        mockTelemetryStore.events.subscribe(subscriber);
      });

      const newEvents: TelemetryEvent[] = [
        {
          type: 'session',
          subtype: 'created',
          timestamp: new Date().toISOString(),
          data: { sessionId: 'session-123' }
        },
        {
          type: 'message',
          subtype: 'sent',
          timestamp: new Date().toISOString(),
          data: { messageLength: 150 },
          latency: 800
        },
        {
          type: 'diagnostic',
          subtype: 'completed',
          timestamp: new Date().toISOString(),
          data: { category: 'api', status: 'pass' }
        }
      ];

      // Act - Add events from multiple sources
      newEvents.forEach(event => {
        mockEventBus.emit('telemetry:event', event);
        mockTelemetryStore.events.update(events => [...events, event]);
      });

      // Assert
      const allEvents = mockTelemetryStore.events.get();
      expect(allEvents).toHaveLength(3);
      expect(allEvents).toEqual(newEvents);
      
      eventsSubscribers.forEach(subscriber => {
        expect(subscriber).toHaveBeenCalledWith(newEvents);
      });
    });

    it('should handle telemetry overflow and cleanup', async () => {
      // Arrange
      const maxEvents = 100;
      const initialEvents = Array.from({ length: maxEvents }, (_, i) => ({
        type: 'performance' as const,
        subtype: 'memory_check',
        timestamp: new Date(Date.now() - (maxEvents - i) * 1000).toISOString(),
        data: { memoryUsage: Math.random() * 100 }
      }));

      mockTelemetryStore.events.set(initialEvents);

      const overflowSubscriber = vi.fn();
      mockTelemetryStore.events.subscribe(overflowSubscriber);

      // Act - Add more events to trigger overflow
      const newEvents = Array.from({ length: 20 }, (_, i) => ({
        type: 'error' as const,
        subtype: 'api_failure',
        timestamp: new Date().toISOString(),
        data: { errorCode: `E00${i}` }
      }));

      newEvents.forEach(event => {
        mockTelemetryStore.events.update(events => {
          const updated = [...events, event];
          return updated.length > maxEvents 
            ? updated.slice(-maxEvents) // Keep only last 100
            : updated;
        });
      });

      // Assert
      const finalEvents = mockTelemetryStore.events.get();
      expect(finalEvents).toHaveLength(maxEvents);
      
      // Should contain the newest events
      const lastEvent = finalEvents[finalEvents.length - 1];
      expect(lastEvent.type).toBe('error');
      expect(lastEvent.subtype).toBe('api_failure');
    });
  });

  describe('Diagnostic Store Synchronization', () => {
    it('should synchronize diagnostic results across components', async () => {
      // Arrange
      const diagnosticSubscribers = [vi.fn(), vi.fn(), vi.fn()];
      diagnosticSubscribers.forEach(subscriber => {
        mockDiagnosticStore.systemHealth.subscribe(subscriber);
      });

      const diagnosticResults: SystemHealth = {
        overallStatus: 'healthy',
        timestamp: new Date().toISOString(),
        categories: {
          dom: {
            status: 'pass',
            tests: [
              { category: 'Element Access', status: 'pass', message: 'DOM accessible' },
              { category: 'Event Listeners', status: 'pass', message: 'Events working' }
            ]
          },
          api: {
            status: 'pass',
            tests: [
              { category: 'Extension API', status: 'pass', message: 'API responding' },
              { category: 'Runtime', status: 'pass', message: 'Runtime operational' }
            ]
          },
          storage: {
            status: 'warning',
            tests: [
              { category: 'Local Storage', status: 'pass', message: 'Local storage working' },
              { category: 'IndexedDB', status: 'fail', message: 'IndexedDB connection failed', details: 'Quota exceeded' }
            ]
          }
        }
      };

      // Act - Complete diagnostics in background
      mockEventBus.emit('diagnostics:completed', diagnosticResults);
      mockDiagnosticStore.systemHealth.set(diagnosticResults);
      mockDiagnosticStore.isRunning.set(false);
      mockDiagnosticStore.lastRunTime.set(diagnosticResults.timestamp);

      // Assert
      diagnosticSubscribers.forEach(subscriber => {
        expect(subscriber).toHaveBeenCalledWith(diagnosticResults);
      });
      
      expect(mockDiagnosticStore.systemHealth.get()).toEqual(diagnosticResults);
      expect(mockDiagnosticStore.isRunning.get()).toBe(false);
      expect(mockDiagnosticStore.lastRunTime.get()).toBe(diagnosticResults.timestamp);
    });

    it('should synchronize diagnostic running state', async () => {
      // Arrange
      const runningStateSubscribers = [vi.fn(), vi.fn()];
      runningStateSubscribers.forEach(subscriber => {
        mockDiagnosticStore.isRunning.subscribe(subscriber);
      });

      // Act - Start diagnostics
      mockEventBus.emit('diagnostics:started', { categories: ['all'] });
      mockDiagnosticStore.isRunning.set(true);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Complete diagnostics
      mockEventBus.emit('diagnostics:completed', { overallStatus: 'healthy' });
      mockDiagnosticStore.isRunning.set(false);

      // Assert
      runningStateSubscribers.forEach(subscriber => {
        expect(subscriber).toHaveBeenCalledWith(true);
        expect(subscriber).toHaveBeenCalledWith(false);
      });
    });

    it('should maintain diagnostic history synchronization', async () => {
      // Arrange
      const historySubscriber = vi.fn();
      mockDiagnosticStore.diagnosticHistory.subscribe(historySubscriber);

      const diagnosticRuns: SystemHealth[] = [
        {
          overallStatus: 'healthy',
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          categories: { dom: { status: 'pass', tests: [] } }
        },
        {
          overallStatus: 'warning',
          timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
          categories: { dom: { status: 'warning', tests: [] } }
        },
        {
          overallStatus: 'healthy',
          timestamp: new Date().toISOString(),
          categories: { dom: { status: 'pass', tests: [] } }
        }
      ];

      // Act - Add diagnostic runs to history
      diagnosticRuns.forEach(run => {
        mockEventBus.emit('diagnostics:completed', run);
        mockDiagnosticStore.diagnosticHistory.update(history => [...history, run]);
      });

      // Assert
      const history = mockDiagnosticStore.diagnosticHistory.get();
      expect(history).toHaveLength(3);
      expect(history).toEqual(diagnosticRuns);
      
      expect(historySubscriber).toHaveBeenCalledWith(diagnosticRuns);
    });
  });

  describe('UI Store Synchronization', () => {
    it('should synchronize dashboard visibility across content and popup', async () => {
      // Arrange
      const visibilitySubscribers = [vi.fn(), vi.fn(), vi.fn()];
      visibilitySubscribers.forEach(subscriber => {
        mockUiStore.dashboardVisible.subscribe(subscriber);
      });

      // Act - Toggle dashboard from content script
      mockEventBus.emit('dashboard:toggle', { visible: true, source: 'content' });
      mockUiStore.dashboardVisible.set(true);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Toggle from popup
      mockEventBus.emit('dashboard:toggle', { visible: false, source: 'popup' });
      mockUiStore.dashboardVisible.set(false);

      // Assert
      visibilitySubscribers.forEach(subscriber => {
        expect(subscriber).toHaveBeenCalledWith(true);
        expect(subscriber).toHaveBeenCalledWith(false);
      });
      
      expect(mockUiStore.dashboardVisible.get()).toBe(false);
    });

    it('should synchronize active panel selection', async () => {
      // Arrange
      const panelSubscribers = [vi.fn(), vi.fn()];
      panelSubscribers.forEach(subscriber => {
        mockUiStore.activePanel.subscribe(subscriber);
      });

      const panels = ['diagnostics', 'sessions', 'telemetry', 'export'];

      // Act - Switch between panels
      panels.forEach(panel => {
        mockEventBus.emit('ui:panel_change', { panel, source: 'user_click' });
        mockUiStore.activePanel.set(panel);
      });

      // Assert
      panelSubscribers.forEach(subscriber => {
        panels.forEach(panel => {
          expect(subscriber).toHaveBeenCalledWith(panel);
        });
      });
      
      expect(mockUiStore.activePanel.get()).toBe('export');
    });

    it('should handle theme synchronization across components', async () => {
      // Arrange
      const themeSubscribers = [vi.fn(), vi.fn(), vi.fn()];
      themeSubscribers.forEach(subscriber => {
        mockUiStore.theme.subscribe(subscriber);
      });

      // Act - Change theme
      mockEventBus.emit('theme:change', { theme: 'dark', source: 'user_preference' });
      mockUiStore.theme.set('dark');

      await new Promise(resolve => setTimeout(resolve, 10));

      // Change back to light
      mockEventBus.emit('theme:change', { theme: 'light', source: 'system_preference' });
      mockUiStore.theme.set('light');

      // Assert
      themeSubscribers.forEach(subscriber => {
        expect(subscriber).toHaveBeenCalledWith('dark');
        expect(subscriber).toHaveBeenCalledWith('light');
      });
    });
  });

  describe('Cross-Store Dependencies and Consistency', () => {
    it('should maintain consistency when session changes affect multiple stores', async () => {
      // Arrange
      const session: ChatGPTSession = {
        id: 'session-cross-store',
        url: 'https://chat.openai.com/chat/cross',
        title: 'Cross Store Session',
        timestamp: new Date().toISOString(),
        conversationId: 'conv-cross',
        messageCount: 8,
        isActive: true
      };

      const sessionSubscriber = vi.fn();
      const telemetrySubscriber = vi.fn();
      const uiSubscriber = vi.fn();

      mockSessionStore.currentSession.subscribe(sessionSubscriber);
      mockTelemetryStore.metrics.subscribe(telemetrySubscriber);
      mockUiStore.dashboardVisible.subscribe(uiSubscriber);

      // Act - Session detection should update multiple stores
      mockEventBus.emit('session:detected', session);
      
      // Update session store
      mockSessionStore.currentSession.set(session);
      
      // Update telemetry
      mockTelemetryStore.metrics.update(metrics => ({
        ...metrics,
        sessionCount: metrics.sessionCount + 1,
        activeSessionId: session.id,
        messageCount: session.messageCount
      }));
      
      // Show dashboard
      mockUiStore.dashboardVisible.set(true);

      // Assert
      expect(sessionSubscriber).toHaveBeenCalledWith(session);
      expect(telemetrySubscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionCount: 1,
          activeSessionId: session.id,
          messageCount: 8
        })
      );
      expect(uiSubscriber).toHaveBeenCalledWith(true);
    });

    it('should handle store conflicts and resolution', async () => {
      // Arrange - Simulate conflicting updates
      const session1: ChatGPTSession = {
        id: 'session-conflict-1',
        url: 'https://chat.openai.com/1',
        title: 'Session 1',
        timestamp: new Date().toISOString(),
        conversationId: 'conv-1',
        messageCount: 5,
        isActive: true
      };

      const session2: ChatGPTSession = {
        id: 'session-conflict-2',
        url: 'https://chat.openai.com/2',
        title: 'Session 2',
        timestamp: new Date().toISOString(),
        conversationId: 'conv-2',
        messageCount: 3,
        isActive: true
      };

      const conflictSubscriber = vi.fn();
      mockSessionStore.currentSession.subscribe(conflictSubscriber);

      // Act - Rapid session changes
      mockSessionStore.currentSession.set(session1);
      mockSessionStore.currentSession.set(session2);
      mockSessionStore.currentSession.set(session1); // Back to session1

      // Assert - Should handle rapid changes correctly
      expect(conflictSubscriber).toHaveBeenCalledWith(session1);
      expect(conflictSubscriber).toHaveBeenCalledWith(session2);
      expect(conflictSubscriber).toHaveBeenCalledTimes(4); // null + 3 updates
      
      expect(mockSessionStore.currentSession.get()).toEqual(session1);
    });

    it('should maintain store integrity during error scenarios', async () => {
      // Arrange
      const initialTelemetry = mockTelemetryStore.metrics.get();
      const errorSubscriber = vi.fn();
      
      mockTelemetryStore.metrics.subscribe(errorSubscriber);

      // Act - Simulate error during store update
      try {
        mockEventBus.emit('error:critical', { component: 'telemetry_store' });
        
        // Attempt invalid update
        mockTelemetryStore.metrics.update(metrics => {
          throw new Error('Store update failed');
        });
      } catch (error) {
        // Store should maintain previous state
      }

      // Assert - Store should be unchanged
      expect(mockTelemetryStore.metrics.get()).toEqual(initialTelemetry);
      
      // Recovery attempt
      mockTelemetryStore.metrics.update(metrics => ({
        ...metrics,
        sessionCount: metrics.sessionCount + 1
      }));

      expect(mockTelemetryStore.metrics.get().sessionCount).toBe(1);
    });
  });

  describe('Store Performance and Memory Management', () => {
    it('should handle large datasets without memory leaks', () => {
      // Arrange
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        type: 'performance' as const,
        subtype: 'test_event',
        timestamp: new Date().toISOString(),
        data: { index: i, randomData: Math.random().toString(36) }
      }));

      // Act - Add large dataset
      mockTelemetryStore.events.set(largeDataset);

      // Assert
      expect(mockTelemetryStore.events.get()).toHaveLength(10000);
      
      // Cleanup large data
      mockTelemetryStore.events.update(events => events.slice(-1000)); // Keep last 1000
      expect(mockTelemetryStore.events.get()).toHaveLength(1000);
    });

    it('should optimize store updates for frequently changing data', () => {
      // Arrange
      const updateSubscriber = vi.fn();
      mockTelemetryStore.metrics.subscribe(updateSubscriber);

      // Act - Rapidly update metrics
      for (let i = 0; i < 100; i++) {
        mockTelemetryStore.metrics.update(metrics => ({
          ...metrics,
          messageCount: metrics.messageCount + 1,
          lastSessionChange: new Date().toISOString()
        }));
      }

      // Assert
      expect(updateSubscriber).toHaveBeenCalledTimes(101); // Initial + 100 updates
      expect(mockTelemetryStore.metrics.get().messageCount).toBe(100);
    });
  });
});