import type { IErrorReporter } from './interfaces.js';
import type { ErrorContext } from './types.js';
import { eventBus } from './event-bus.js';
import { storageManager } from './storage-manager.js';

export class ErrorReporter implements IErrorReporter {
  private errors: ErrorContext[] = [];
  private maxErrors = 100;
  private sessionId = this.generateSessionId();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.loadPersistedErrors();
    this.setupGlobalErrorHandlers();
    this.isInitialized = true;
  }

  reportError(error: ErrorContext): void {
    const enrichedError: ErrorContext = {
      ...error,
      timestamp: error.timestamp || new Date().toISOString(),
      userAgent: (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      sessionId: this.sessionId,
      metadata: {
        url: (typeof window !== 'undefined' ? window.location.href : ''),
        retryAttempts: error.metadata?.retryAttempts || 0,
        totalRetries: error.metadata?.totalRetries || 0,
        finalAttempt: error.metadata?.finalAttempt || false,
        ...error.metadata
      }
    };

    this.errors.unshift(enrichedError);
    
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console for debugging
    console.error('[Ishka Error]', error);
    
    this.persistErrors();
    eventBus.emit('error:reported', enrichedError);
  }

  getRecentErrors(limit = 10): ErrorContext[] {
    return this.errors.slice(0, limit);
  }

  clearErrors(): void {
    this.errors = [];
    this.persistErrors();
    eventBus.emit('errors:cleared');
  }

  subscribeToErrors(callback: (error: ErrorContext) => void): () => void {
    return eventBus.on('error:reported', callback);
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (event) => {
      this.reportError({
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        sessionId: this.sessionId
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        type: 'javascript',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack || String(event.reason),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        metadata: {
          type: 'unhandledrejection',
          reason: event.reason
        }
      });
    });

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'error') {
          this.reportError({
            type: message.errorType || 'javascript',
            message: message.message,
            stack: message.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            sessionId: this.sessionId,
            metadata: {
              source: 'background',
              sender: sender
            }
          });
        }
      });
    }
  }

  private async loadPersistedErrors(): Promise<void> {
    try {
      const persistedErrors = await storageManager.get<ErrorContext[]>('errors');
      if (persistedErrors && Array.isArray(persistedErrors)) {
        this.errors = persistedErrors.slice(0, this.maxErrors);
      }
    } catch (error) {
      console.warn('[ErrorReporter] Failed to load persisted errors:', error);
    }
  }

  private async persistErrors(): Promise<void> {
    try {
      await storageManager.set('errors', this.errors);
    } catch (error) {
      console.warn('[ErrorReporter] Failed to persist errors:', error);
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  reportNetworkError(url: string, status: number, statusText: string, details?: any): void {
    this.reportError({
      type: 'network',
      message: `Network error: ${status} ${statusText}`,
      url,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      metadata: {
        status,
        statusText,
        details
      }
    });
  }

  reportPermissionError(permission: string, details?: any): void {
    this.reportError({
      type: 'permission',
      message: `Permission denied: ${permission}`,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      metadata: {
        permission,
        details
      }
    });
  }

  reportDOMError(operation: string, element?: string, details?: any): void {
    this.reportError({
      type: 'dom',
      message: `DOM error during ${operation}${element ? ` on ${element}` : ''}`,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      metadata: {
        operation,
        element,
        details
      }
    });
  }

  reportStorageError(operation: string, key?: string, details?: any): void {
    this.reportError({
      type: 'storage',
      message: `Storage error during ${operation}${key ? ` for key ${key}` : ''}`,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      metadata: {
        operation,
        key,
        details
      }
    });
  }

  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    recentCount: number;
    sessionErrors: number;
  } {
    const byType: Record<string, number> = {};
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    let recentCount = 0;
    let sessionErrors = 0;

    this.errors.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
      
      const errorTime = new Date(error.timestamp).getTime();
      if (errorTime > oneHourAgo) {
        recentCount++;
      }
      
      if (error.sessionId === this.sessionId) {
        sessionErrors++;
      }
    });

    return {
      total: this.errors.length,
      byType,
      recentCount,
      sessionErrors
    };
  }
}

export const errorReporter = new ErrorReporter();