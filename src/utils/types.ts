export interface DiagnosticResult {
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
  timestamp: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  retryAttempts?: number;
  finalAttempt?: boolean;
}

export interface DiagnosticSuite {
  name: string;
  description: string;
  tests: DiagnosticTest[];
}

export interface DiagnosticTest {
  id: string;
  name: string;
  category: DiagnosticCategory;
  execute(): Promise<DiagnosticResult>;
  isEnabled: boolean;
  timeout: number;
  retryConfig?: RetryConfig;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryCondition?: (error: Error, result?: DiagnosticResult) => boolean;
}

export type DiagnosticCategory = 'dom' | 'api' | 'storage' | 'worker' | 'performance' | 'security';

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  categories: Record<DiagnosticCategory, {
    status: 'pass' | 'fail' | 'warning';
    lastCheck: string;
    tests: DiagnosticResult[];
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface PerformanceMetrics {
  domReadyTime: number;
  scriptLoadTime: number;
  memoryUsage: number;
  storageQuota: {
    used: number;
    available: number;
    percentage: number;
  };
  workerResponseTimes: Record<string, number>;
}

export interface ErrorContext {
  type: 'javascript' | 'network' | 'permission' | 'dom' | 'storage';
  message: string;
  stack?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  timestamp: string;
  userAgent: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

export interface ChatGPTSession {
  id: string;
  title: string;
  lastUpdated: string;
  conversationId?: string;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
  isActive?: boolean;
  url?: string;
}

export interface ExtensionConfig {
  diagnosticsEnabled: boolean;
  autoRunDiagnostics: boolean;
  diagnosticsInterval: number;
  performanceMonitoring: boolean;
  errorReporting: boolean;
  debugMode: boolean;
  version: string;
  memoryCleanupEnabled?: boolean;
  memoryCleanupInterval?: number;
  maxStoredSessions?: number;
  maxSessionAge?: number;
}

export interface TestExecutionContext {
  environment: 'development' | 'production' | 'testing';
  testMode: 'manual' | 'automated' | 'ci' | 'background';
  userInitiated: boolean;
  timestamp: string;
}

export interface ExportData {
  metadata: {
    timestamp: string;
    userAgent: string;
    url: string;
    extensionId?: string;
    manifestVersion?: number;
    version: string;
    environment: string;
  };
  systemHealth: SystemHealth;
  performanceMetrics: PerformanceMetrics;
  errors: ErrorContext[];
  configuration: ExtensionConfig;
  sessions: ChatGPTSession[];
}

export interface TestResult {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
}

// ==================== USER-CENTERED TYPES ====================

/**
 * Tag interface for conversation organization
 */
export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
  conversationId?: string;
}

/**
 * Note interface for message annotations
 */
export interface Note {
  id: string;
  messageId: string;
  conversationId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Template interface for reusable prompts
 */
export interface Template {
  id: string;
  name: string;
  content: string;
  variables: TemplateVariable[];
  category?: string;
  createdAt: Date;
  updatedAt?: Date;
  usageCount?: number;
}

/**
 * Template variable for dynamic content
 */
export interface TemplateVariable {
  name: string;
  description: string;
  defaultValue?: string;
  required: boolean;
}

/**
 * Conversation metadata for organization
 */
export interface ConversationMetadata {
  id: string;
  title: string;
  tags: Tag[];
  notes: Note[];
  createdAt: Date;
  lastModified: Date;
  messageCount?: number;
  isBookmarked?: boolean;
}

/**
 * Extension settings for user preferences
 */
export interface ExtensionSettings {
  theme: 'auto' | 'light' | 'dark';
  enableVoiceInput: boolean;
  enableTokenCounter: boolean;
  privacySettings: PrivacySettings;
}

/**
 * Privacy settings for user control
 */
export interface PrivacySettings {
  enableClipboardHistory: boolean;
  enableUsageStats: boolean;
  dataRetentionDays: number;
}