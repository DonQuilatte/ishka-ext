/**
 * @fileoverview Centralized logging utility for the Ishka Extension.
 * Provides consistent logging format with module prefixes and log levels.
 * 
 * @author Ishka Extension Team
 * @version 1.0.0
 */

import { ErrorReporter } from './error-reporter.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  timestamp: string;
  stack?: string;
}

/**
 * Centralized logger for consistent logging across all extension modules.
 * Automatically prefixes log messages with [ISHKA:<Module>] format.
 * 
 * @example
 * ```typescript
 * const logger = Logger.create('ContentScript');
 * logger.info('Script initialized successfully');
 * logger.error('Failed to load adapter', error);
 * ```
 */
export class Logger {
  private static errorReporter?: ErrorReporter;
  private static logLevel: LogLevel = 'info';
  private static isDevelopment = process.env.NODE_ENV === 'development';

  constructor(private module: string) {}

  /**
   * Create a logger instance for a specific module.
   * @param module - Module name for log prefixing
   * @returns Logger instance
   */
  static create(module: string): Logger {
    return new Logger(module);
  }

  /**
   * Set the global log level for filtering.
   * @param level - Minimum log level to output
   */
  static setLogLevel(level: LogLevel): void {
    Logger.logLevel = level;
  }

  /**
   * Set the error reporter for automatic error logging.
   * @param reporter - ErrorReporter instance
   */
  static setErrorReporter(reporter: ErrorReporter): void {
    Logger.errorReporter = reporter;
  }

  /**
   * Log a debug message (development only).
   * @param message - Log message
   * @param data - Optional additional data
   */
  debug(message: string, data?: any): void {
    if (!Logger.isDevelopment) return;
    this.log('debug', message, data);
  }

  /**
   * Log an informational message.
   * @param message - Log message
   * @param data - Optional additional data
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log a warning message.
   * @param message - Log message
   * @param data - Optional additional data
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log an error message and optionally report to ErrorReporter.
   * @param message - Error message
   * @param error - Error object or additional data
   * @param shouldReport - Whether to send to ErrorReporter (default: true)
   */
  error(message: string, error?: Error | any, shouldReport = true): void {
    this.log('error', message, error);

    // Report to ErrorReporter if available and requested
    if (shouldReport && Logger.errorReporter && error instanceof Error) {
      Logger.errorReporter.reportError({
        type: 'javascript',
        message: `[${this.module}] ${message}`,
        stack: error.stack,
        url: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        sessionId: crypto.randomUUID(),
        metadata: {
          module: this.module,
          originalMessage: message
        }
      });
    }
  }

  /**
   * Core logging method with level filtering and formatting.
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[ISHKA:${this.module}]`;
    const formattedMessage = `${prefix} ${message}`;

    const logEntry: LogEntry = {
      level,
      module: this.module,
      message,
      data,
      timestamp,
      stack: level === 'error' && data instanceof Error ? data.stack : undefined
    };

    // Output to console with appropriate method
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data);
        break;
      case 'info':
        console.log(formattedMessage, data);
        break;
      case 'warn':
        console.warn(formattedMessage, data);
        break;
      case 'error':
        console.error(formattedMessage, data);
        break;
    }

    // Store in session storage for debugging (development only)
    if (Logger.isDevelopment) {
      this.storeLogEntry(logEntry);
    }
  }

  /**
   * Check if a log level should be output based on current settings.
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levels[level] >= levels[Logger.logLevel];
  }

  /**
   * Store log entry in session storage for debugging.
   */
  private storeLogEntry(entry: LogEntry): void {
    try {
      if (typeof sessionStorage === 'undefined') return;

      const key = 'ishka-logs';
      const existing = sessionStorage.getItem(key);
      const logs: LogEntry[] = existing ? JSON.parse(existing) : [];
      
      logs.push(entry);
      
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      sessionStorage.setItem(key, JSON.stringify(logs));
    } catch (error) {
      // Silently fail if storage is not available
    }
  }

  /**
   * Get stored log entries (development only).
   */
  static getLogs(): LogEntry[] {
    try {
      if (typeof sessionStorage === 'undefined') return [];
      const logs = sessionStorage.getItem('ishka-logs');
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear stored log entries.
   */
  static clearLogs(): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('ishka-logs');
      }
    } catch {
      // Silently fail
    }
  }
}

/**
 * Create a module logger with error handling wrapper.
 * @param module - Module name
 * @param errorReporter - Optional ErrorReporter instance
 */
export function createLogger(module: string, errorReporter?: ErrorReporter): Logger {
  const logger = Logger.create(module);
  
  if (errorReporter) {
    Logger.setErrorReporter(errorReporter);
  }
  
  return logger;
}

/**
 * Async operation wrapper with automatic error logging.
 * @param operation - Async function to wrap
 * @param logger - Logger instance
 * @param operationName - Name for logging purposes
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  logger: Logger,
  operationName: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`Failed to ${operationName}`, error);
    return null;
  }
}

/**
 * Sync operation wrapper with automatic error logging.
 * @param operation - Function to wrap
 * @param logger - Logger instance
 * @param operationName - Name for logging purposes
 */
export function withSyncErrorHandling<T>(
  operation: () => T,
  logger: Logger,
  operationName: string
): T | null {
  try {
    return operation();
  } catch (error) {
    logger.error(`Failed to ${operationName}`, error);
    return null;
  }
}