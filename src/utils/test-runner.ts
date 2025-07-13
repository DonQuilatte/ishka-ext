import type { ITestRunner } from './interfaces.js';
import type { DiagnosticResult, TestExecutionContext } from './types.js';
import { eventBus } from './event-bus.js';
import { errorReporter } from './error-reporter.js';

export class TestRunner implements ITestRunner {
  private testRegistry = new Map<string, () => Promise<DiagnosticResult>>();
  private suiteRegistry = new Map<string, string[]>();

  async executeTest(testId: string, context: TestExecutionContext): Promise<DiagnosticResult> {
    const test = this.testRegistry.get(testId);
    if (!test) {
      throw new Error(`Test with ID '${testId}' not found`);
    }

    const startTime = Date.now();
    
    try {
      eventBus.emit('test:started', { testId, context });
      
      const result = await test();
      const duration = Date.now() - startTime;
      
      const enrichedResult: DiagnosticResult = {
        ...result,
        duration,
        metadata: {
          ...result.metadata,
          testId,
          context,
          startTime: new Date(startTime).toISOString()
        }
      };

      eventBus.emit('test:completed', { testId, result: enrichedResult });
      return enrichedResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResult: DiagnosticResult = {
        category: 'unknown',
        status: 'fail',
        message: `Test execution failed: ${error}`,
        timestamp: new Date().toISOString(),
        duration,
        details: error instanceof Error ? error.stack : String(error),
        metadata: {
          testId,
          context,
          error: error instanceof Error ? error.message : String(error)
        }
      };

      eventBus.emit('test:failed', { testId, error, result: errorResult });
      errorReporter.reportError({
        type: 'javascript',
        message: `Test execution failed: ${testId}`,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        sessionId: 'test-runner',
        metadata: { testId, context, error }
      });

      return errorResult;
    }
  }

  async executeTestSuite(suiteId: string, context: TestExecutionContext): Promise<DiagnosticResult[]> {
    const testIds = this.suiteRegistry.get(suiteId);
    if (!testIds) {
      throw new Error(`Test suite with ID '${suiteId}' not found`);
    }

    const results: DiagnosticResult[] = [];
    
    eventBus.emit('suite:started', { suiteId, testIds, context });

    for (const testId of testIds) {
      try {
        const result = await this.executeTest(testId, context);
        results.push(result);
      } catch (error) {
        // Error already handled in executeTest
        console.error(`Test ${testId} failed in suite ${suiteId}:`, error);
      }
    }

    eventBus.emit('suite:completed', { suiteId, results });
    return results;
  }

  getTestRegistry(): Map<string, () => Promise<DiagnosticResult>> {
    return new Map(this.testRegistry);
  }

  registerTest(id: string, test: () => Promise<DiagnosticResult>): void {
    if (this.testRegistry.has(id)) {
      console.warn(`[TestRunner] Test with ID '${id}' already exists. Overwriting.`);
    }
    
    this.testRegistry.set(id, test);
    eventBus.emit('test:registered', { testId: id });
  }

  unregisterTest(id: string): void {
    const removed = this.testRegistry.delete(id);
    if (removed) {
      eventBus.emit('test:unregistered', { testId: id });
    }
  }

  registerTestSuite(suiteId: string, testIds: string[]): void {
    this.suiteRegistry.set(suiteId, testIds);
    eventBus.emit('suite:registered', { suiteId, testIds });
  }

  unregisterTestSuite(suiteId: string): void {
    const removed = this.suiteRegistry.delete(suiteId);
    if (removed) {
      eventBus.emit('suite:unregistered', { suiteId });
    }
  }

  getAvailableTests(): string[] {
    return Array.from(this.testRegistry.keys());
  }

  getAvailableTestSuites(): string[] {
    return Array.from(this.suiteRegistry.keys());
  }

  isTestRegistered(id: string): boolean {
    return this.testRegistry.has(id);
  }

  isSuiteRegistered(id: string): boolean {
    return this.suiteRegistry.has(id);
  }

  async validateTestRegistry(): Promise<{ valid: string[]; invalid: string[] }> {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const [testId, test] of this.testRegistry.entries()) {
      try {
        // Quick validation - just check if it's callable
        if (typeof test === 'function') {
          valid.push(testId);
        } else {
          invalid.push(testId);
        }
      } catch (error) {
        invalid.push(testId);
      }
    }

    return { valid, invalid };
  }

  async runHealthCheck(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const validation = await this.validateTestRegistry();
      const duration = Date.now() - startTime;

      return {
        category: 'test-runner',
        status: validation.invalid.length === 0 ? 'pass' : 'fail',
        message: `Test Runner Health: ${validation.valid.length} valid tests, ${validation.invalid.length} invalid tests`,
        timestamp: new Date().toISOString(),
        duration,
        details: validation.invalid.length > 0 ? `Invalid tests: ${validation.invalid.join(', ')}` : undefined,
        metadata: {
          validTests: validation.valid,
          invalidTests: validation.invalid,
          totalTests: this.testRegistry.size,
          totalSuites: this.suiteRegistry.size
        }
      };
    } catch (error) {
      return {
        category: 'test-runner',
        status: 'fail',
        message: 'Test Runner health check failed',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  clearRegistry(): void {
    const testCount = this.testRegistry.size;
    const suiteCount = this.suiteRegistry.size;
    
    this.testRegistry.clear();
    this.suiteRegistry.clear();
    
    eventBus.emit('registry:cleared', { testCount, suiteCount });
  }

  getRegistryStats(): {
    tests: number;
    suites: number;
    averageTestsPerSuite: number;
  } {
    const tests = this.testRegistry.size;
    const suites = this.suiteRegistry.size;
    
    let totalTestsInSuites = 0;
    for (const testIds of this.suiteRegistry.values()) {
      totalTestsInSuites += testIds.length;
    }
    
    const averageTestsPerSuite = suites > 0 ? totalTestsInSuites / suites : 0;

    return {
      tests,
      suites,
      averageTestsPerSuite
    };
  }
}

export const testRunner = new TestRunner();