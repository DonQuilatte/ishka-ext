import type { IDiagnosticRunner, ITestRunner } from './interfaces.js';
import type { 
  DiagnosticResult, 
  DiagnosticSuite, 
  SystemHealth, 
  DiagnosticCategory,
  TestExecutionContext,
  RetryConfig 
} from './types.js';
import { eventBus } from './event-bus.js';
import { errorReporter } from './error-reporter.js';
import { telemetryActions } from '../store/telemetry-store.js';
import { storageManager } from './storage-manager.js';

export class DiagnosticRunner implements IDiagnosticRunner {
  private testSuites: Map<DiagnosticCategory, DiagnosticSuite> = new Map();
  private periodicInterval: number | null = null;
  private isRunning = false;

  constructor(private testRunner: ITestRunner) {
    this.initializeBuiltInTests();
  }

  async runDiagnostics(categories?: DiagnosticCategory[]): Promise<SystemHealth> {
    if (this.isRunning) {
      throw new Error('Diagnostics are already running');
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      eventBus.emit('diagnostics:started', { categories });

      const categoriesToRun = categories || Array.from(this.testSuites.keys());
      const results: Record<DiagnosticCategory, DiagnosticResult[]> = {} as any;

      for (const category of categoriesToRun) {
        const suite = this.testSuites.get(category);
        if (!suite) continue;

        results[category] = await this.runSuiteTests(suite);
      }

      const systemHealth = this.computeSystemHealth(results);
      
      await storageManager.set('lastDiagnosticRun', {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        results: systemHealth
      });

      eventBus.emit('diagnostics:completed', systemHealth);
      return systemHealth;

    } catch (error) {
      errorReporter.reportError({
        type: 'javascript',
        message: 'Diagnostic runner failed',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        sessionId: 'diagnostic-runner',
        metadata: { 
          error, 
          categories,
          runDuration: Date.now() - startTime,
          totalRetries: 0
        }
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async runSingleTest(testId: string): Promise<DiagnosticResult> {
    const context: TestExecutionContext = {
      environment: process.env.NODE_ENV as any || 'production',
      testMode: 'manual',
      userInitiated: true,
      timestamp: new Date().toISOString()
    };

    try {
      eventBus.emit('test:started', { testId });
      
      // Find the test by ID
      let targetTest: any = null;
      for (const suite of this.testSuites.values()) {
        const test = suite.tests.find(t => t.id === testId);
        if (test) {
          targetTest = test;
          break;
        }
      }
      
      if (!targetTest) {
        throw new Error(`Test with ID '${testId}' not found`);
      }
      
      const result = await this.executeTestWithRetry(targetTest);
      eventBus.emit('test:completed', { testId, result });
      return result;
    } catch (error) {
      const errorResult: DiagnosticResult = {
        category: 'unknown',
        status: 'fail',
        message: `Test execution failed: ${error}`,
        timestamp: new Date().toISOString(),
        metadata: { testId, error }
      };
      
      eventBus.emit('test:failed', { testId, error });
      return errorResult;
    }
  }

  getAvailableTests(): DiagnosticSuite[] {
    return Array.from(this.testSuites.values());
  }

  schedulePeriodicDiagnostics(intervalMs: number): void {
    this.stopPeriodicDiagnostics();
    // Use the correct setInterval for both window and service worker contexts
    const setInt = (typeof window !== 'undefined' && window.setInterval) ? window.setInterval : setInterval;
    this.periodicInterval = setInt(async () => {
      try {
        await this.runDiagnostics();
      } catch (error) {
        errorReporter.reportError({
          type: 'javascript',
          message: 'Periodic diagnostic run failed',
          timestamp: new Date().toISOString(),
          userAgent: (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
          sessionId: 'periodic-diagnostics',
          metadata: { error }
        });
      }
    }, intervalMs) as any;
    eventBus.emit('diagnostics:scheduled', { intervalMs });
  }

  stopPeriodicDiagnostics(): void {
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
      this.periodicInterval = null;
      eventBus.emit('diagnostics:unscheduled');
    }
  }

  private async runSuiteTests(suite: DiagnosticSuite): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    const context: TestExecutionContext = {
      environment: process.env.NODE_ENV as any || 'production',
      testMode: 'automated',
      userInitiated: false,
      timestamp: new Date().toISOString()
    };

    for (const test of suite.tests) {
      if (!test.isEnabled) continue;

      const result = await this.executeTestWithRetry(test);
      results.push(result);
    }

    return results;
  }

  private computeSystemHealth(results: Record<DiagnosticCategory, DiagnosticResult[]>): SystemHealth {
    const categories: SystemHealth['categories'] = {} as any;
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const [category, tests] of Object.entries(results)) {
      const categoryPassed = tests.filter(t => t.status === 'pass').length;
      const categoryFailed = tests.filter(t => t.status === 'fail').length;
      const categoryWarnings = tests.filter(t => t.status === 'warning').length;

      totalTests += tests.length;
      passed += categoryPassed;
      failed += categoryFailed;
      warnings += categoryWarnings;

      let status: 'pass' | 'fail' | 'warning' = 'pass';
      if (categoryFailed > 0) {
        status = 'fail';
      } else if (categoryWarnings > 0) {
        status = 'warning';
      }

      categories[category as DiagnosticCategory] = {
        status,
        lastCheck: new Date().toISOString(),
        tests
      };
    }

    let overall: SystemHealth['overall'] = 'healthy';
    if (failed > 0) {
      overall = failed > totalTests * 0.5 ? 'critical' : 'degraded';
    } else if (warnings > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      categories,
      summary: {
        total: totalTests,
        passed,
        failed,
        warnings
      }
    };
  }

  private async executeTestWithRetry(test: any): Promise<DiagnosticResult> {
    const defaultRetryConfig: RetryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      retryCondition: (error: Error, result?: DiagnosticResult) => {
        // Retry on network errors, timeouts, and API failures
        if (error.message.includes('timeout') || 
            error.message.includes('network') ||
            error.message.includes('fetch') ||
            error.message.includes('API')) {
          return true;
        }
        // Don't retry on DOM/permission errors (they're unlikely to resolve)
        if (error.message.includes('permission') ||
            error.message.includes('not supported') ||
            error.message.includes('not available')) {
          return false;
        }
        // Retry failed tests unless they're warnings
        return result ? result.status === 'fail' : true;
      }
    };
    
    const retryConfig = test.retryConfig || defaultRetryConfig;
    let lastError: Error | null = null;
    let lastResult: DiagnosticResult | null = null;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      const isLastAttempt = attempt === retryConfig.maxRetries;
      
      try {
        const startTime = Date.now();
        const timeoutPromise = new Promise<DiagnosticResult>((_, reject) => {
          setTimeout(() => reject(new Error('Test timeout')), test.timeout);
        });

        const testPromise = test.execute();
        const result = await Promise.race([testPromise, timeoutPromise]);
        
        result.duration = Date.now() - startTime;
        result.retryAttempts = attempt;
        result.finalAttempt = isLastAttempt;
        
        // Success case - return immediately
        if (result.status === 'pass') {
          eventBus.emit('test:retry_success', { 
            testId: test.id, 
            attempts: attempt + 1, 
            result 
          });
          
          // Track retry success in telemetry
          telemetryActions.trackRetrySuccess(test.id, attempt + 1);
          return result;
        }
        
        // Store the result for potential retry decision
        lastResult = result;
        
        // Check if we should retry this result
        if (!isLastAttempt && retryConfig.retryCondition) {
          const shouldRetry = retryConfig.retryCondition(new Error(result.message), result);
          if (!shouldRetry) {
            result.finalAttempt = true;
            return result;
          }
        }
        
        // If this is the last attempt, return the result
        if (isLastAttempt) {
          result.finalAttempt = true;
          return result;
        }
        
      } catch (error) {
        lastError = error as Error;
        
        // Check retry condition for errors
        if (!isLastAttempt && retryConfig.retryCondition) {
          const shouldRetry = retryConfig.retryCondition(lastError, lastResult);
          if (!shouldRetry) {
            // Create error result immediately when retry condition fails
            const errorResult: DiagnosticResult = {
              category: test.category,
              status: 'fail',
              message: `Test failed: ${lastError.message}`,
              timestamp: new Date().toISOString(),
              metadata: { 
                testId: test.id, 
                error: lastError, 
                lastResult,
                totalRetries: 0
              },
              retryAttempts: attempt,
              finalAttempt: true
            };
            
            eventBus.emit('test:retry_exhausted', { 
              testId: test.id, 
              totalAttempts: attempt + 1,
              finalError: lastError.message
            });
            
            telemetryActions.trackRetryExhausted(
              test.id, 
              attempt + 1, 
              lastError.message
            );
            
            return errorResult;
          }
        }
        
        // If this is the last attempt, fall through to error result creation
        if (isLastAttempt) {
          break;
        }
      }
      
      // Calculate delay for next retry
      if (!isLastAttempt) {
        const delay = Math.min(
          retryConfig.baseDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelayMs
        );
        
        eventBus.emit('test:retry_attempt', { 
          testId: test.id, 
          attempt: attempt + 1, 
          maxRetries: retryConfig.maxRetries,
          delayMs: delay,
          error: lastError?.message || lastResult?.message
        });
        
        // Track retry attempt in telemetry
        telemetryActions.trackRetryAttempt(
          test.id, 
          attempt + 1, 
          retryConfig.maxRetries, 
          delay, 
          lastError?.message || lastResult?.message
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Create error result if we exhausted all retries
    const errorResult: DiagnosticResult = {
      category: test.category,
      status: 'fail',
      message: lastError ? `Test failed after ${retryConfig.maxRetries + 1} attempts: ${lastError.message}` 
                         : lastResult?.message || 'Unknown test failure',
      timestamp: new Date().toISOString(),
      metadata: { 
        testId: test.id, 
        error: lastError, 
        lastResult,
        totalRetries: retryConfig.maxRetries
      },
      retryAttempts: retryConfig.maxRetries,
      finalAttempt: true
    };
    
    eventBus.emit('test:retry_exhausted', { 
      testId: test.id, 
      totalAttempts: retryConfig.maxRetries + 1,
      finalError: lastError?.message || lastResult?.message
    });
    
    // Track retry exhaustion in telemetry
    telemetryActions.trackRetryExhausted(
      test.id, 
      retryConfig.maxRetries + 1, 
      lastError?.message || lastResult?.message
    );
    
    return errorResult;
  }

  private initializeBuiltInTests(): void {
    this.testSuites.set('dom', {
      name: 'DOM Health',
      description: 'Tests DOM integrity and manipulation capabilities',
      tests: [
        {
          id: 'dom-element-access',
          name: 'Element Access Test',
          category: 'dom',
          execute: async () => this.testDOMElementAccess(),
          isEnabled: true,
          timeout: 5000,
          retryConfig: {
            maxRetries: 2,
            baseDelayMs: 500,
            maxDelayMs: 2000,
            backoffMultiplier: 2,
            retryCondition: (error) => !error.message.includes('not available')
          }
        },
        {
          id: 'dom-event-listeners',
          name: 'Event Listener Test',
          category: 'dom',
          execute: async () => this.testEventListeners(),
          isEnabled: true,
          timeout: 3000
        },
        {
          id: 'dom-mutation-observer',
          name: 'Mutation Observer Test',
          category: 'dom',
          execute: async () => this.testMutationObserver(),
          isEnabled: true,
          timeout: 3000
        }
      ]
    });

    this.testSuites.set('api', {
      name: 'Extension API',
      description: 'Tests Chrome extension API availability and functionality',
      tests: [
        {
          id: 'api-runtime',
          name: 'Runtime API Test',
          category: 'api',
          execute: async () => this.testRuntimeAPI(),
          isEnabled: true,
          timeout: 5000,
          retryConfig: {
            maxRetries: 3,
            baseDelayMs: 1000,
            maxDelayMs: 5000,
            backoffMultiplier: 2,
            retryCondition: (error) => error.message.includes('API') || error.message.includes('timeout')
          }
        },
        {
          id: 'api-storage',
          name: 'Storage API Test',
          category: 'api',
          execute: async () => this.testStorageAPI(),
          isEnabled: true,
          timeout: 5000,
          retryConfig: {
            maxRetries: 3,
            baseDelayMs: 1000,
            maxDelayMs: 5000,
            backoffMultiplier: 2,
            retryCondition: (error) => !error.message.includes('permission')
          }
        }
      ]
    });

    this.testSuites.set('storage', {
      name: 'Storage Systems',
      description: 'Tests various storage mechanisms',
      tests: [
        {
          id: 'storage-local',
          name: 'Local Storage Test',
          category: 'storage',
          execute: async () => this.testLocalStorage(),
          isEnabled: true,
          timeout: 3000
        },
        {
          id: 'storage-session',
          name: 'Session Storage Test',
          category: 'storage',
          execute: async () => this.testSessionStorage(),
          isEnabled: true,
          timeout: 3000
        },
        {
          id: 'storage-indexeddb',
          name: 'IndexedDB Test',
          category: 'storage',
          execute: async () => this.testIndexedDB(),
          isEnabled: true,
          timeout: 10000,
          retryConfig: {
            maxRetries: 2,
            baseDelayMs: 2000,
            maxDelayMs: 8000,
            backoffMultiplier: 2,
            retryCondition: (error) => error.message.includes('connection') || error.message.includes('timeout')
          }
        }
      ]
    });

    this.testSuites.set('worker', {
      name: 'Worker Systems',
      description: 'Tests service workers and background scripts',
      tests: [
        {
          id: 'worker-service-worker',
          name: 'Service Worker Test',
          category: 'worker',
          execute: async () => this.testServiceWorker(),
          isEnabled: true,
          timeout: 5000
        },
        {
          id: 'worker-background-script',
          name: 'Background Script Test',
          category: 'worker',
          execute: async () => this.testBackgroundScript(),
          isEnabled: true,
          timeout: 5000
        }
      ]
    });
  }

  private async testDOMElementAccess(): Promise<DiagnosticResult> {
    if (typeof document === 'undefined') {
      return {
        category: 'dom',
        status: 'warning',
        message: 'DOM not available in this context',
        timestamp: new Date().toISOString()
      };
    }
    try {
      const elementCount = document.querySelectorAll('*').length;
      return {
        category: 'dom',
        status: elementCount > 0 ? 'pass' : 'fail',
        message: `${elementCount} DOM elements accessible`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        category: 'dom',
        status: 'fail',
        message: 'DOM element access failed',
        timestamp: new Date().toISOString(),
        details: String(error)
      };
    }
  }

  private async testEventListeners(): Promise<DiagnosticResult> {
    if (typeof document === 'undefined') {
      return {
        category: 'dom',
        status: 'warning',
        message: 'DOM not available in this context',
        timestamp: new Date().toISOString()
      };
    }
    try {
      const testElement = document.createElement('div');
      let eventFired = false;
      testElement.addEventListener('click', () => { eventFired = true; });
      testElement.click();
      return {
        category: 'dom',
        status: eventFired ? 'pass' : 'fail',
        message: eventFired ? 'Event binding functional' : 'Event binding failed',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        category: 'dom',
        status: 'fail',
        message: 'Event listener test failed',
        timestamp: new Date().toISOString(),
        details: String(error)
      };
    }
  }

  private async testMutationObserver(): Promise<DiagnosticResult> {
    if (typeof document === 'undefined') {
      return {
        category: 'dom',
        status: 'warning',
        message: 'DOM not available in this context',
        timestamp: new Date().toISOString()
      };
    }
    try {
      const observer = new MutationObserver(() => {});
      observer.observe(document.body, { childList: true });
      observer.disconnect();
      return {
        category: 'dom',
        status: 'pass',
        message: 'MutationObserver operational',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        category: 'dom',
        status: 'fail',
        message: 'MutationObserver failed',
        timestamp: new Date().toISOString(),
        details: String(error)
      };
    }
  }

  private async testRuntimeAPI(): Promise<DiagnosticResult> {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const manifest = chrome.runtime.getManifest();
        return {
          category: 'api',
          status: 'pass',
          message: `Extension API v${manifest.manifest_version} responding`,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          category: 'api',
          status: 'fail',
          message: 'Chrome extension API not available',
          timestamp: new Date().toISOString(),
          details: 'Running outside extension context'
        };
      }
    } catch (error) {
      return {
        category: 'api',
        status: 'fail',
        message: 'Extension API test failed',
        timestamp: new Date().toISOString(),
        details: String(error)
      };
    }
  }

  private async testStorageAPI(): Promise<DiagnosticResult> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.get('test');
        return {
          category: 'api',
          status: 'pass',
          message: 'Storage permission granted',
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          category: 'api',
          status: 'fail',
          message: 'Storage API not accessible',
          timestamp: new Date().toISOString(),
          details: 'Missing storage permission'
        };
      }
    } catch (error) {
      return {
        category: 'api',
        status: 'fail',
        message: 'Permission check failed',
        timestamp: new Date().toISOString(),
        details: String(error)
      };
    }
  }

  private async testLocalStorage(): Promise<DiagnosticResult> {
    try {
      const testKey = 'diagnostic_test';
      const testValue = 'test_data';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      return {
        category: 'storage',
        status: retrieved === testValue ? 'pass' : 'fail',
        message: retrieved === testValue ? 'Local storage accessible' : 'Local storage read/write failed',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        category: 'storage',
        status: 'fail',
        message: 'Local storage test failed',
        timestamp: new Date().toISOString(),
        details: String(error)
      };
    }
  }

  private async testSessionStorage(): Promise<DiagnosticResult> {
    try {
      const testKey = 'diagnostic_test';
      const testValue = 'session_data';
      
      sessionStorage.setItem(testKey, testValue);
      const retrieved = sessionStorage.getItem(testKey);
      sessionStorage.removeItem(testKey);
      
      return {
        category: 'storage',
        status: retrieved === testValue ? 'pass' : 'fail',
        message: retrieved === testValue ? 'Session storage operational' : 'Session storage read/write failed',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        category: 'storage',
        status: 'fail',
        message: 'Session storage test failed',
        timestamp: new Date().toISOString(),
        details: String(error)
      };
    }
  }

  private async testIndexedDB(): Promise<DiagnosticResult> {
    try {
      const dbName = 'diagnostic_test_db';
      const request = indexedDB.open(dbName, 1);
      
      await new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          db.close();
          indexedDB.deleteDatabase(dbName);
          resolve(true);
        };
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore('test', { keyPath: 'id' });
        };
      });
      
      return {
        category: 'storage',
        status: 'pass',
        message: 'IndexedDB connection successful',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        category: 'storage',
        status: 'fail',
        message: 'IndexedDB connection failed',
        timestamp: new Date().toISOString(),
        details: String(error)
      };
    }
  }

  private async testServiceWorker(): Promise<DiagnosticResult> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return {
          category: 'worker',
          status: registration ? 'pass' : 'fail',
          message: registration ? 'Service worker registered' : 'No service worker found',
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          category: 'worker',
          status: 'fail',
          message: 'Service Worker API not supported',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        category: 'worker',
        status: 'fail',
        message: 'Service worker check failed',
        timestamp: new Date().toISOString(),
        details: String(error)
      };
    }
  }

  private async testBackgroundScript(): Promise<DiagnosticResult> {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const backgroundPage = chrome.extension?.getBackgroundPage();
        return {
          category: 'worker',
          status: backgroundPage ? 'pass' : 'fail',
          message: backgroundPage ? 'Background script accessible' : 'Background script not found',
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          category: 'worker',
          status: 'fail',
          message: 'Extension runtime not available',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        category: 'worker',
        status: 'fail',
        message: 'Background script check failed',
        timestamp: new Date().toISOString(),
        details: String(error)
      };
    }
  }

  addCustomTest(category: DiagnosticCategory, test: any): void {
    const suite = this.testSuites.get(category);
    if (suite) {
      suite.tests.push(test);
    }
  }

  removeTest(testId: string): void {
    for (const suite of this.testSuites.values()) {
      suite.tests = suite.tests.filter(test => test.id !== testId);
    }
  }
}