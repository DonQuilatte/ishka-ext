import type { 
  DiagnosticResult, 
  DiagnosticCategory, 
  ChatGPTSession,
  SystemHealth 
} from '../../utils/types.js';

export interface SearchHistoryPanelProps {
  /** Show search input */
  showSearch?: boolean;
  /** Show history timeline */
  showHistory?: boolean;
  /** Show diagnostics filters */
  showDiagnosticsFilter?: boolean;
  /** Show token usage information */
  showTokens?: boolean;
  /** Maximum number of history items to display */
  maxHistoryItems?: number;
  /** Compact layout mode */
  compact?: boolean;
}

export interface HistoryItem {
  id: string;
  type: 'session' | 'diagnostic' | 'error';
  title: string;
  timestamp: string;
  status?: 'pass' | 'fail' | 'warning';
  category?: DiagnosticCategory;
  data?: any;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
  cost?: number;
}

export interface SearchFilter {
  query: string;
  category: DiagnosticCategory | 'all';
  status: 'all' | 'pass' | 'fail' | 'warning';
  dateRange: 'all' | 'today' | 'week' | 'month';
  type: 'all' | 'session' | 'diagnostic' | 'error';
}

export interface SearchStats {
  total: number;
  sessions: number;
  diagnostics: number;
  errors: number;
  passed: number;
  failed: number;
  warnings: number;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface FilterGroup {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'daterange' | 'search';
  options: FilterOption[];
  value: string | string[];
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  includeData: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  categories?: DiagnosticCategory[];
  types?: ('session' | 'diagnostic' | 'error')[];
}

export interface HistoryLoadOptions {
  maxItems?: number;
  categories?: DiagnosticCategory[];
  includeData?: boolean;
  sortBy?: 'timestamp' | 'type' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface TimelineMarkerConfig {
  color: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export interface HistoryViewMode {
  type: 'timeline' | 'list' | 'grid' | 'compact';
  groupBy?: 'date' | 'type' | 'category' | 'status';
  showDetails?: boolean;
  expandByDefault?: boolean;
}

export interface SearchHighlight {
  text: string;
  startIndex: number;
  endIndex: number;
  field: string;
}

// Event payloads for EventBus integration
export interface HistoryFilterChangeEvent {
  filter: SearchFilter;
  resultCount: number;
  timestamp: string;
}

export interface HistoryItemExpandEvent {
  itemId: string;
  expanded: boolean;
  itemType: 'session' | 'diagnostic' | 'error';
}

export interface HistoryExportEvent {
  format: 'json' | 'csv' | 'xlsx';
  itemCount: number;
  options: ExportOptions;
}

export interface TokenUsageUpdateEvent {
  usage: TokenUsage;
  trend: 'up' | 'down' | 'stable';
  period: 'hour' | 'day' | 'week' | 'month';
}

// Store types for component state management
export interface FilterStoreState {
  activeFilters: SearchFilter;
  availableOptions: Record<string, FilterOption[]>;
  recentQueries: string[];
  savedFilters: Array<{
    id: string;
    name: string;
    filters: SearchFilter;
    timestamp: string;
  }>;
}

export interface HistoryStoreState {
  items: HistoryItem[];
  isLoading: boolean;
  lastUpdated: string | null;
  totalCount: number;
  hasMore: boolean;
  viewMode: HistoryViewMode;
  expandedItems: Set<string>;
  selectedItems: Set<string>;
}

// Component configuration types
export interface SearchHistoryConfig {
  enableRealTimeUpdates: boolean;
  enableKeyboardShortcuts: boolean;
  defaultMaxItems: number;
  autoSaveFilters: boolean;
  showAdvancedFilters: boolean;
  enableExport: boolean;
  enableSelection: boolean;
  themingEnabled: boolean;
}

// Advanced filter types for future extensions
export interface AdvancedSearchFilter extends SearchFilter {
  textSearch?: {
    fields: ('title' | 'message' | 'details' | 'data')[];
    matchType: 'contains' | 'exact' | 'regex';
    caseSensitive: boolean;
  };
  numericFilters?: {
    duration?: { min?: number; max?: number };
    messageCount?: { min?: number; max?: number };
    timestamp?: { before?: string; after?: string };
  };
  customFields?: Record<string, any>;
}