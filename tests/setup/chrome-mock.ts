/**
 * Chrome Extension API Mocks for Testing
 * Provides comprehensive mocking of Chrome extension APIs for Vitest
 */

import { vi } from 'vitest';

// Mock chrome.runtime API
const mockRuntime = {
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false),
  },
  onInstalled: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false),
  },
  onStartup: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false),
  },
  onSuspend: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false),
  },
  sendMessage: vi.fn((message, callback) => {
    // Simulate async response
    if (callback) {
      setTimeout(() => callback({ success: true }), 0);
    }
    return Promise.resolve({ success: true });
  }),
  getManifest: vi.fn(() => ({
    version: '1.0.0',
    name: 'Test Extension',
    manifest_version: 3,
  })),
  id: 'test-extension-id',
  getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
};

// Mock chrome.tabs API
const mockTabs = {
  onUpdated: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false),
  },
  onRemoved: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false),
  },
  query: vi.fn((queryInfo, callback) => {
    const mockTabs = [
      {
        id: 1,
        url: 'https://chat.openai.com/c/test-conversation',
        title: 'ChatGPT',
        active: true,
        windowId: 1,
      }
    ];
    if (callback) {
      setTimeout(() => callback(mockTabs), 0);
    }
    return Promise.resolve(mockTabs);
  }),
  get: vi.fn((tabId, callback) => {
    const mockTab = {
      id: tabId,
      url: 'https://chat.openai.com/c/test-conversation',
      title: 'ChatGPT',
      active: true,
      windowId: 1,
    };
    if (callback) {
      setTimeout(() => callback(mockTab), 0);
    }
    return Promise.resolve(mockTab);
  }),
  sendMessage: vi.fn((tabId, message, callback) => {
    if (callback) {
      setTimeout(() => callback({ success: true }), 0);
    }
    return Promise.resolve({ success: true });
  }),
  executeScript: vi.fn((tabId, details, callback) => {
    if (callback) {
      setTimeout(() => callback([{ result: 'script executed' }]), 0);
    }
    return Promise.resolve([{ result: 'script executed' }]);
  }),
};

// Mock chrome.scripting API
const mockScripting = {
  executeScript: vi.fn((injection, callback) => {
    const results = [{ result: 'script executed' }];
    if (callback) {
      setTimeout(() => callback(results), 0);
    }
    return Promise.resolve(results);
  }),
  insertCSS: vi.fn((injection, callback) => {
    if (callback) {
      setTimeout(() => callback(), 0);
    }
    return Promise.resolve();
  }),
  removeCSS: vi.fn((injection, callback) => {
    if (callback) {
      setTimeout(() => callback(), 0);
    }
    return Promise.resolve();
  }),
};

// Mock chrome.storage API
const createStorageMock = () => {
  const data: Record<string, any> = {};
  
  return {
    get: vi.fn((keys, callback) => {
      const result: Record<string, any> = {};
      if (typeof keys === 'string') {
        result[keys] = data[keys];
      } else if (Array.isArray(keys)) {
        keys.forEach(key => {
          result[key] = data[key];
        });
      } else if (keys === null || keys === undefined) {
        Object.assign(result, data);
      }
      
      if (callback) {
        setTimeout(() => callback(result), 0);
      }
      return Promise.resolve(result);
    }),
    set: vi.fn((items, callback) => {
      Object.assign(data, items);
      if (callback) {
        setTimeout(() => callback(), 0);
      }
      return Promise.resolve();
    }),
    remove: vi.fn((keys, callback) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => delete data[key]);
      if (callback) {
        setTimeout(() => callback(), 0);
      }
      return Promise.resolve();
    }),
    clear: vi.fn((callback) => {
      Object.keys(data).forEach(key => delete data[key]);
      if (callback) {
        setTimeout(() => callback(), 0);
      }
      return Promise.resolve();
    }),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false),
    },
  };
};

const mockStorage = {
  local: createStorageMock(),
  sync: createStorageMock(),
  session: createStorageMock(),
  managed: createStorageMock(),
};

// Mock chrome.action API (for MV3)
const mockAction = {
  setIcon: vi.fn((details, callback) => {
    if (callback) {
      setTimeout(() => callback(), 0);
    }
    return Promise.resolve();
  }),
  setBadgeText: vi.fn((details, callback) => {
    if (callback) {
      setTimeout(() => callback(), 0);
    }
    return Promise.resolve();
  }),
  setBadgeBackgroundColor: vi.fn((details, callback) => {
    if (callback) {
      setTimeout(() => callback(), 0);
    }
    return Promise.resolve();
  }),
  setTitle: vi.fn((details, callback) => {
    if (callback) {
      setTimeout(() => callback(), 0);
    }
    return Promise.resolve();
  }),
  setPopup: vi.fn((details, callback) => {
    if (callback) {
      setTimeout(() => callback(), 0);
    }
    return Promise.resolve();
  }),
};

// Mock chrome.alarms API
const mockAlarms = {
  create: vi.fn(),
  clear: vi.fn((name, callback) => {
    if (callback) {
      setTimeout(() => callback(true), 0);
    }
    return Promise.resolve(true);
  }),
  clearAll: vi.fn((callback) => {
    if (callback) {
      setTimeout(() => callback(true), 0);
    }
    return Promise.resolve(true);
  }),
  get: vi.fn((name, callback) => {
    if (callback) {
      setTimeout(() => callback(undefined), 0);
    }
    return Promise.resolve(undefined);
  }),
  getAll: vi.fn((callback) => {
    if (callback) {
      setTimeout(() => callback([]), 0);
    }
    return Promise.resolve([]);
  }),
  onAlarm: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false),
  },
};

// Complete Chrome API mock
export const chromeMock = {
  runtime: mockRuntime,
  tabs: mockTabs,
  scripting: mockScripting,
  storage: mockStorage,
  action: mockAction,
  alarms: mockAlarms,
  extension: {
    getURL: mockRuntime.getURL,
  },
  permissions: {
    contains: vi.fn((permissions, callback) => {
      if (callback) {
        setTimeout(() => callback(true), 0);
      }
      return Promise.resolve(true);
    }),
    request: vi.fn((permissions, callback) => {
      if (callback) {
        setTimeout(() => callback(true), 0);
      }
      return Promise.resolve(true);
    }),
  },
};

// Setup function to initialize Chrome mocks
export function setupChromeMocks() {
  // Mock the global chrome object
  (global as any).chrome = chromeMock;
  
  // Mock browser object for webextension-polyfill compatibility
  (global as any).browser = chromeMock;
  
  // Reset all mocks
  vi.clearAllMocks();
}

// Cleanup function
export function cleanupChromeMocks() {
  delete (global as any).chrome;
  delete (global as any).browser;
  vi.clearAllMocks();
}

// Helper functions for test assertions
export function getChromeApiCall(api: string, method: string, callIndex = 0) {
  const apiObj = chromeMock as any;
  const parts = api.split('.');
  let current = apiObj;
  
  for (const part of parts) {
    current = current[part];
  }
  
  return current[method].mock.calls[callIndex];
}

export function getLastChromeApiCall(api: string, method: string) {
  const apiObj = chromeMock as any;
  const parts = api.split('.');
  let current = apiObj;
  
  for (const part of parts) {
    current = current[part];
  }
  
  const calls = current[method].mock.calls;
  return calls[calls.length - 1];
}

// Export individual mocks for specific testing needs
export {
  mockRuntime,
  mockTabs,
  mockScripting,
  mockStorage,
  mockAction,
  mockAlarms,
};