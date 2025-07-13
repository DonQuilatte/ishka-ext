/**
 * Test Setup - Chrome Extension API Mocking
 * Initializes Chrome extension APIs for testing environment
 */

import { beforeEach, afterEach } from 'vitest';
import { setupChromeMocks, cleanupChromeMocks } from './chrome-mock.js';

// Initialize Chrome mocks before each test
beforeEach(() => {
  setupChromeMocks();
});

// Cleanup after each test
afterEach(() => {
  cleanupChromeMocks();
});

// Mock crypto for test environment (for UUID generation)
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 15),
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  }
});

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  configurable: true,
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
console.log = (...args) => {
  if (!args[0]?.includes?.('[Ishka]') && !args[0]?.includes?.('[EventBus]')) {
    originalConsole.log(...args);
  }
};

console.error = (...args) => {
  if (!args[0]?.includes?.('[Ishka]') && !args[0]?.includes?.('[EventBus]')) {
    originalConsole.error(...args);
  }
};