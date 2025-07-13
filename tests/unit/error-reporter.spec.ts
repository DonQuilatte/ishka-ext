import { describe, it, expect, vi } from 'vitest';
import { ErrorReporter } from '../../src/utils/error-reporter';
import type { ErrorContext } from '../../src/utils/types';

describe('Unit Test: ErrorReporter', () => {

  it('should report an error without crashing', () => {
    // Arrange
    const errorReporter = new ErrorReporter();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockError: ErrorContext = {
      type: 'javascript', // Using a valid error type
      message: 'This is a test error',
      stack: new Error().stack,
      url: 'http://example.com/test',
      timestamp: new Date().toISOString(),
      userAgent: 'Vitest Test Runner',
      sessionId: 'test-session-id'
    };

    // Act & Assert
    expect(() => errorReporter.reportError(mockError)).not.toThrow();
    
    // Check that console.error was called with our formatted message
    expect(consoleSpy).toHaveBeenCalledWith('[Ishka Error]', mockError);

    // Clean up the spy
    consoleSpy.mockRestore();
  });

  it('should handle errors with minimal information', () => {
    // Arrange
    const errorReporter = new ErrorReporter();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // This is intentionally an incomplete object to test resilience
    const minimalError = {
      type: 'network',
      message: 'A very basic error',
      timestamp: new Date().toISOString()
    };

    // Act & Assert
    expect(() => errorReporter.reportError(minimalError as any)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith('[Ishka Error]', minimalError);

    // Clean up
    consoleSpy.mockRestore();
  });

});