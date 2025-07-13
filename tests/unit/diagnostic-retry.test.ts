import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiagnosticRunner } from '../../src/utils/diagnostic-runner.js';
import type { DiagnosticResult, DiagnosticTest, RetryConfig } from '../../src/utils/types.js';
import { eventBus } from '../../src/utils/event-bus.js';
import { telemetryActions } from '../../src/store/telemetry-store.js';

// Mock dependencies
vi.mock('../../src/utils/event-bus.js');
vi.mock('../../src/utils/error-reporter.js');
vi.mock('../../src/utils/storage-manager.js');
vi.mock('../../src/store/telemetry-store.js');

describe('DiagnosticRunner Retry Mechanisms', () => {
  let diagnosticRunner: DiagnosticRunner;
  let mockTestRunner: any;
  let eventEmitSpy: any;
  let telemetrySpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockTestRunner = {
      executeTest: vi.fn()
    };

    diagnosticRunner = new DiagnosticRunner(mockTestRunner);
    eventEmitSpy = vi.spyOn(eventBus, 'emit');
    telemetrySpy = {
      trackRetryAttempt: vi.spyOn(telemetryActions, 'trackRetryAttempt'),
      trackRetrySuccess: vi.spyOn(telemetryActions, 'trackRetrySuccess'),
      trackRetryExhausted: vi.spyOn(telemetryActions, 'trackRetryExhausted')
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeTestWithRetry', () => {
    it('should succeed on first attempt without retries', async () => {
      const mockTest: DiagnosticTest = {
        id: 'test-success',
        name: 'Success Test',
        category: 'dom',
        execute: vi.fn().mockResolvedValue({
          category: 'dom',
          status: 'pass',
          message: 'Test passed',
          timestamp: new Date().toISOString()
        }),
        isEnabled: true,
        timeout: 5000
      };

      const result = await (diagnosticRunner as any).executeTestWithRetry(mockTest);

      expect(result.status).toBe('pass');
      expect(result.retryAttempts).toBe(0);
      expect(mockTest.execute).toHaveBeenCalledTimes(1);
      expect(telemetrySpy.trackRetrySuccess).toHaveBeenCalledWith('test-success', 1);
    });

    it('should retry failed tests with exponential backoff', async () => {
      const mockTest: DiagnosticTest = {
        id: 'test-retry',
        name: 'Retry Test',
        category: 'api',
        execute: vi.fn()
          .mockRejectedValueOnce(new Error('Network timeout'))
          .mockRejectedValueOnce(new Error('API unavailable'))
          .mockResolvedValueOnce({
            category: 'api',
            status: 'pass',
            message: 'Test passed on retry',
            timestamp: new Date().toISOString()
          }),
        isEnabled: true,
        timeout: 5000,
        retryConfig: {
          maxRetries: 3,
          baseDelayMs: 100,
          maxDelayMs: 1000,
          backoffMultiplier: 2,
          retryCondition: (error) => error.message.includes('timeout') || error.message.includes('API')
        }
      };

      const result = await (diagnosticRunner as any).executeTestWithRetry(mockTest);

      expect(result.status).toBe('pass');
      expect(result.retryAttempts).toBe(2);
      expect(mockTest.execute).toHaveBeenCalledTimes(3);
      expect(telemetrySpy.trackRetryAttempt).toHaveBeenCalledTimes(2);
      expect(telemetrySpy.trackRetrySuccess).toHaveBeenCalledWith('test-retry', 3);
    });

    it('should exhaust retries and return failure', async () => {
      const mockTest: DiagnosticTest = {
        id: 'test-fail',
        name: 'Failing Test',
        category: 'storage',
        execute: vi.fn().mockRejectedValue(new Error('Persistent failure')),
        isEnabled: true,
        timeout: 5000,
        retryConfig: {
          maxRetries: 2,
          baseDelayMs: 50,
          maxDelayMs: 200,
          backoffMultiplier: 2,
          retryCondition: () => true
        }
      };

      const result = await (diagnosticRunner as any).executeTestWithRetry(mockTest);

      expect(result.status).toBe('fail');
      expect(result.retryAttempts).toBe(2);
      expect(result.finalAttempt).toBe(true);
      expect(result.message).toContain('failed after 3 attempts');
      expect(mockTest.execute).toHaveBeenCalledTimes(3);
      expect(telemetrySpy.trackRetryAttempt).toHaveBeenCalledTimes(2);
      expect(telemetrySpy.trackRetryExhausted).toHaveBeenCalledWith('test-fail', 3, 'Persistent failure');
    });

    it('should respect retry condition and stop early', async () => {
      const mockTest: DiagnosticTest = {
        id: 'test-no-retry',
        name: 'No Retry Test',
        category: 'dom',
        execute: vi.fn().mockRejectedValue(new Error('permission denied')),
        isEnabled: true,
        timeout: 5000,
        retryConfig: {
          maxRetries: 3,
          baseDelayMs: 100,
          maxDelayMs: 1000,
          backoffMultiplier: 2,
          retryCondition: (error) => !error.message.includes('permission')
        }
      };

      const result = await (diagnosticRunner as any).executeTestWithRetry(mockTest);

      expect(result.status).toBe('fail');
      expect(result.retryAttempts).toBe(0);
      expect(result.finalAttempt).toBe(true);
      expect(mockTest.execute).toHaveBeenCalledTimes(1);
      expect(telemetrySpy.trackRetryAttempt).not.toHaveBeenCalled();
      expect(telemetrySpy.trackRetryExhausted).toHaveBeenCalledWith('test-no-retry', 1, 'permission denied');
    });

    it('should handle timeout errors properly', async () => {
      const mockTest: DiagnosticTest = {
        id: 'test-timeout',
        name: 'Timeout Test',
        category: 'worker',
        execute: vi.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), 6000)
          )
        ),
        isEnabled: true,
        timeout: 100, // Short timeout to trigger timeout error
        retryConfig: {
          maxRetries: 2,
          baseDelayMs: 50,
          maxDelayMs: 200,
          backoffMultiplier: 2,
          retryCondition: (error) => error.message.includes('timeout')
        }
      };

      const result = await (diagnosticRunner as any).executeTestWithRetry(mockTest);

      expect(result.status).toBe('fail');
      expect(result.message).toContain('timeout');
      expect(telemetrySpy.trackRetryAttempt).toHaveBeenCalledTimes(2);
    });

    it('should use default retry config when none provided', async () => {
      const mockTest: DiagnosticTest = {
        id: 'test-default-config',
        name: 'Default Config Test',
        category: 'api',
        execute: vi.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            category: 'api',
            status: 'pass',
            message: 'Test passed',
            timestamp: new Date().toISOString()
          }),
        isEnabled: true,
        timeout: 5000
        // No retryConfig provided - should use defaults
      };

      const result = await (diagnosticRunner as any).executeTestWithRetry(mockTest);

      expect(result.status).toBe('pass');
      expect(result.retryAttempts).toBe(1);
      expect(mockTest.execute).toHaveBeenCalledTimes(2);
      expect(telemetrySpy.trackRetrySuccess).toHaveBeenCalledWith('test-default-config', 2);
    });

    it('should track retry events correctly', async () => {
      const mockTest: DiagnosticTest = {
        id: 'test-events',
        name: 'Event Test',
        category: 'storage',
        execute: vi.fn()
          .mockRejectedValueOnce(new Error('Storage error'))
          .mockResolvedValueOnce({
            category: 'storage',
            status: 'pass',
            message: 'Test passed',
            timestamp: new Date().toISOString()
          }),
        isEnabled: true,
        timeout: 5000,
        retryConfig: {
          maxRetries: 2,
          baseDelayMs: 100,
          maxDelayMs: 500,
          backoffMultiplier: 2,
          retryCondition: () => true
        }
      };

      await (diagnosticRunner as any).executeTestWithRetry(mockTest);

      // Should emit retry_attempt event
      expect(eventEmitSpy).toHaveBeenCalledWith('test:retry_attempt', expect.objectContaining({
        testId: 'test-events',
        attempt: 1,
        maxRetries: 2,
        delayMs: 100,
        error: 'Storage error'
      }));

      // Should emit retry_success event
      expect(eventEmitSpy).toHaveBeenCalledWith('test:retry_success', expect.objectContaining({
        testId: 'test-events',
        attempts: 2
      }));

      // Should track telemetry
      expect(telemetrySpy.trackRetryAttempt).toHaveBeenCalledWith(
        'test-events', 
        1, 
        2, 
        100, 
        'Storage error'
      );
      expect(telemetrySpy.trackRetrySuccess).toHaveBeenCalledWith('test-events', 2);
    });

    it('should handle warning results without retrying unnecessarily', async () => {
      const mockTest: DiagnosticTest = {
        id: 'test-warning',
        name: 'Warning Test',
        category: 'dom',
        execute: vi.fn().mockResolvedValue({
          category: 'dom',
          status: 'warning',
          message: 'DOM not available in this context',
          timestamp: new Date().toISOString()
        }),
        isEnabled: true,
        timeout: 5000,
        retryConfig: {
          maxRetries: 2,
          baseDelayMs: 100,
          maxDelayMs: 500,
          backoffMultiplier: 2,
          retryCondition: (_, result) => result ? result.status === 'fail' : true
        }
      };

      const result = await (diagnosticRunner as any).executeTestWithRetry(mockTest);

      expect(result.status).toBe('warning');
      expect(result.retryAttempts).toBe(0);
      expect(result.finalAttempt).toBe(true);
      expect(mockTest.execute).toHaveBeenCalledTimes(1);
      expect(telemetrySpy.trackRetryAttempt).not.toHaveBeenCalled();
    });
  });

  describe('Built-in test retry configurations', () => {
    it('should have appropriate retry configs for different test categories', () => {
      const suites = diagnosticRunner.getAvailableTests();
      
      // DOM tests should have conservative retry settings
      const domSuite = suites.find(s => s.name === 'DOM Health');
      const domElementTest = domSuite?.tests.find(t => t.id === 'dom-element-access');
      expect(domElementTest?.retryConfig?.maxRetries).toBe(2);
      expect(domElementTest?.retryConfig?.baseDelayMs).toBe(500);

      // API tests should have more aggressive retry settings
      const apiSuite = suites.find(s => s.name === 'Extension API');
      const runtimeTest = apiSuite?.tests.find(t => t.id === 'api-runtime');
      expect(runtimeTest?.retryConfig?.maxRetries).toBe(3);
      expect(runtimeTest?.retryConfig?.baseDelayMs).toBe(1000);

      // Storage tests should handle connection issues
      const storageSuite = suites.find(s => s.name === 'Storage Systems');
      const indexedDbTest = storageSuite?.tests.find(t => t.id === 'storage-indexeddb');
      expect(indexedDbTest?.retryConfig?.maxRetries).toBe(2);
      expect(indexedDbTest?.retryConfig?.baseDelayMs).toBe(2000);
    });
  });
});