/**
 * @fileoverview Integration test utilities for inter-component message passing
 * Provides mocks and helpers for testing Chrome extension messaging and EventBus communication
 * 
 * @author Ishka Extension Team
 * @version 1.0.0
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

export interface MockChromeRuntime {
  sendMessage: Mock;
  onMessage: {
    addListener: Mock;
    removeListener: Mock;
    hasListener: Mock;
  };
  lastError?: chrome.runtime.LastError;
  id: string;
  getManifest: Mock;
}

export interface MockChrome {
  runtime: MockChromeRuntime;
  tabs: {
    query: Mock;
    sendMessage: Mock;
    onUpdated: {
      addListener: Mock;
      removeListener: Mock;
    };
  };
  storage: {
    local: {
      get: Mock;
      set: Mock;
      remove: Mock;
    };
  };
}

export interface MessagePassingTestContext {
  chrome: MockChrome;
  messageHandlers: Map<string, Function[]>;
  tabUpdateHandlers: Function[];
  runtimeListeners: Function[];
}

/**
 * Creates a comprehensive Chrome API mock for testing extension messaging
 */
export function createChromeMock(): MockChrome {
  const messageHandlers = new Map<string, Function[]>();
  const tabUpdateHandlers: Function[] = [];
  const runtimeListeners: Function[] = [];

  const chrome: MockChrome = {
    runtime: {
      sendMessage: vi.fn((message, callback) => {
        // Simulate async response
        setTimeout(() => {
          if (callback) {
            callback({ success: true, data: message });
          }
        }, 0);
      }),
      onMessage: {
        addListener: vi.fn((listener) => {
          runtimeListeners.push(listener);
        }),
        removeListener: vi.fn((listener) => {
          const index = runtimeListeners.indexOf(listener);
          if (index > -1) {
            runtimeListeners.splice(index, 1);
          }
        }),
        hasListener: vi.fn((listener) => {
          return runtimeListeners.includes(listener);
        })
      },
      id: 'test-extension-id',
      getManifest: vi.fn(() => ({
        manifest_version: 3,
        name: 'Ishka Test Extension',
        version: '1.0.0'
      }))
    },
    tabs: {
      query: vi.fn((queryInfo, callback) => {
        const mockTabs = [
          { id: 1, url: 'https://chat.openai.com/chat', active: true },
          { id: 2, url: 'https://chatgpt.com/chat', active: false }
        ];
        if (callback) {
          callback(mockTabs.filter(tab => 
            !queryInfo.url || tab.url.includes(queryInfo.url)
          ));
        }
      }),
      sendMessage: vi.fn((tabId, message, callback) => {
        setTimeout(() => {
          if (callback) {
            callback({ received: true, tabId });
          }
        }, 0);
      }),
      onUpdated: {
        addListener: vi.fn((listener) => {
          tabUpdateHandlers.push(listener);
        }),
        removeListener: vi.fn((listener) => {
          const index = tabUpdateHandlers.indexOf(listener);
          if (index > -1) {
            tabUpdateHandlers.splice(index, 1);
          }
        })
      }
    },
    storage: {
      local: {
        get: vi.fn((keys, callback) => {
          const mockStorage: Record<string, any> = {
            'currentSession': {
              id: 'test-session-123',
              url: 'https://chat.openai.com/chat',
              title: 'Test Conversation',
              timestamp: new Date().toISOString()
            },
            'extensionConfig': {
              autoRunDiagnostics: true,
              diagnosticsInterval: 300000,
              memoryCleanupEnabled: true
            }
          };
          
          const result = typeof keys === 'string' 
            ? { [keys]: mockStorage[keys] }
            : Array.isArray(keys)
              ? keys.reduce((acc, key) => ({ ...acc, [key]: mockStorage[key] }), {})
              : mockStorage;
              
          if (callback) {
            callback(result);
          }
        }),
        set: vi.fn((items, callback) => {
          if (callback) {
            callback();
          }
        }),
        remove: vi.fn((keys, callback) => {
          if (callback) {
            callback();
          }
        })
      }
    }
  };

  return chrome;
}

/**
 * Simulates a message being sent from content script to background
 */
export function simulateContentMessage(
  context: MessagePassingTestContext,
  message: any,
  sender?: chrome.runtime.MessageSender
) {
  const mockSender = sender || {
    tab: { id: 1, url: 'https://chat.openai.com/chat' },
    frameId: 0,
    id: 'test-extension-id'
  };

  const sendResponse = vi.fn();
  
  // Trigger all runtime message listeners
  context.chrome.runtime.onMessage.addListener.mock.calls.forEach(([listener]) => {
    if (typeof listener === 'function') {
      listener(message, mockSender, sendResponse);
    }
  });

  return { sendResponse, sender: mockSender };
}

/**
 * Simulates a tab update event
 */
export function simulateTabUpdate(
  context: MessagePassingTestContext,
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab
) {
  context.tabUpdateHandlers.forEach(handler => {
    handler(tabId, changeInfo, tab);
  });
}

/**
 * Creates a mock EventBus for testing internal messaging
 */
export function createMockEventBus() {
  const listeners = new Map<string, Set<Function>>();
  const onceListeners = new Map<string, Set<Function>>();

  return {
    emit: vi.fn((event: string, data?: any) => {
      // Trigger persistent listeners
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error(`Mock EventBus error in handler for '${event}':`, error);
          }
        });
      }

      // Trigger one-time listeners and clean them up
      const eventOnceListeners = onceListeners.get(event);
      if (eventOnceListeners) {
        eventOnceListeners.forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error(`Mock EventBus error in once handler for '${event}':`, error);
          }
        });
        onceListeners.delete(event);
      }
    }),

    on: vi.fn((event: string, handler: Function) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);

      return () => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          eventListeners.delete(handler);
          if (eventListeners.size === 0) {
            listeners.delete(event);
          }
        }
      };
    }),

    once: vi.fn((event: string, handler: Function) => {
      if (!onceListeners.has(event)) {
        onceListeners.set(event, new Set());
      }
      onceListeners.get(event)!.add(handler);

      return () => {
        const eventOnceListeners = onceListeners.get(event);
        if (eventOnceListeners) {
          eventOnceListeners.delete(handler);
          if (eventOnceListeners.size === 0) {
            onceListeners.delete(event);
          }
        }
      };
    }),

    off: vi.fn((event: string, handler?: Function) => {
      if (handler) {
        listeners.get(event)?.delete(handler);
        onceListeners.get(event)?.delete(handler);
      } else {
        listeners.delete(event);
        onceListeners.delete(event);
      }
    }),

    removeAllListeners: vi.fn((event?: string) => {
      if (event) {
        listeners.delete(event);
        onceListeners.delete(event);
      } else {
        listeners.clear();
        onceListeners.clear();
      }
    }),

    getEventCount: vi.fn((event: string) => {
      const persistentCount = listeners.get(event)?.size || 0;
      const onceCount = onceListeners.get(event)?.size || 0;
      return persistentCount + onceCount;
    }),

    getAllEvents: vi.fn(() => {
      const events = new Set([
        ...listeners.keys(),
        ...onceListeners.keys()
      ]);
      return Array.from(events);
    }),

    // Test utility methods
    _getListeners: () => listeners,
    _getOnceListeners: () => onceListeners,
    _clear: () => {
      listeners.clear();
      onceListeners.clear();
    }
  };
}

/**
 * Sets up a complete test context with Chrome mocks and message handling
 */
export function setupMessagePassingTestContext(): MessagePassingTestContext {
  const chrome = createChromeMock();
  
  // Make chrome available globally for tests
  (global as any).chrome = chrome;

  return {
    chrome,
    messageHandlers: new Map(),
    tabUpdateHandlers: [],
    runtimeListeners: []
  };
}

/**
 * Waits for a specific number of messages to be processed
 */
export async function waitForMessages(count: number, timeout = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    let processed = 0;
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${count} messages, only processed ${processed}`));
    }, timeout);

    const checkCount = () => {
      processed++;
      if (processed >= count) {
        clearTimeout(timer);
        resolve();
      }
    };

    // This would be called by the test when messages are processed
    (global as any).__messageProcessed = checkCount;
  });
}

/**
 * Creates a mock sender object for testing
 */
export function createMockSender(overrides?: Partial<chrome.runtime.MessageSender>): chrome.runtime.MessageSender {
  return {
    tab: {
      id: 1,
      url: 'https://chat.openai.com/chat',
      title: 'ChatGPT',
      active: true,
      highlighted: true,
      pinned: false,
      incognito: false,
      selected: true,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      windowId: 1,
      sessionId: 'test-session',
      index: 0,
      ...overrides?.tab
    },
    frameId: 0,
    id: 'test-extension-id',
    url: 'https://chat.openai.com/chat',
    ...overrides
  };
}

/**
 * Asserts that a message was sent with specific content
 */
export function assertMessageSent(
  mock: Mock,
  expectedMessage: any,
  callIndex = 0
): void {
  expect(mock).toHaveBeenCalled();
  expect(mock.mock.calls.length).toBeGreaterThan(callIndex);
  
  const [actualMessage] = mock.mock.calls[callIndex];
  expect(actualMessage).toEqual(expect.objectContaining(expectedMessage));
}

/**
 * Asserts that an EventBus event was emitted
 */
export function assertEventEmitted(
  mockEventBus: any,
  event: string,
  expectedData?: any,
  callIndex = 0
): void {
  expect(mockEventBus.emit).toHaveBeenCalled();
  
  const calls = mockEventBus.emit.mock.calls.filter(([eventName]) => eventName === event);
  expect(calls.length).toBeGreaterThan(callIndex);
  
  if (expectedData !== undefined) {
    const [, actualData] = calls[callIndex];
    expect(actualData).toEqual(expectedData);
  }
}