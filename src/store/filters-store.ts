/**
 * @fileoverview Filters Store - Advanced search and filtering state management.
 * Manages search filters, query history, and filter persistence for diagnostic data.
 * 
 * @author Ishka Extension Team
 * @version 1.0.0
 */

import { writable, derived, type Readable } from 'svelte/store';
import type {
  SearchFilter,
  FilterStoreState,
  FilterOption,
  SearchStats,
  HistoryItem
} from '../components/common/types.js';
import type { DiagnosticCategory } from '../utils/types.js';
import { eventBus } from '../utils/event-bus.js';
import { storageManager } from '../utils/storage-manager.js';

const STORAGE_KEY = 'ishka-filters';
const RECENT_QUERIES_LIMIT = 10;
const SAVED_FILTERS_LIMIT = 20;

const defaultFilter: SearchFilter = {
  query: '',
  category: 'all',
  status: 'all',
  dateRange: 'all',
  type: 'all'
};

const initialState: FilterStoreState = {
  activeFilters: defaultFilter,
  availableOptions: {
    categories: [
      { value: 'all', label: 'All Categories' },
      { value: 'dom', label: 'DOM' },
      { value: 'api', label: 'API' },
      { value: 'storage', label: 'Storage' },
      { value: 'worker', label: 'Worker' },
      { value: 'performance', label: 'Performance' },
      { value: 'security', label: 'Security' }
    ],
    statuses: [
      { value: 'all', label: 'All Status' },
      { value: 'pass', label: 'Pass' },
      { value: 'fail', label: 'Fail' },
      { value: 'warning', label: 'Warning' }
    ],
    types: [
      { value: 'all', label: 'All Types' },
      { value: 'session', label: 'Sessions' },
      { value: 'diagnostic', label: 'Diagnostics' },
      { value: 'error', label: 'Errors' }
    ],
    dateRanges: [
      { value: 'all', label: 'All Time' },
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'Past Week' },
      { value: 'month', label: 'Past Month' }
    ]
  },
  recentQueries: [],
  savedFilters: []
};

function createFiltersStore() {
  const { subscribe, set, update } = writable<FilterStoreState>(initialState);

  return {
    subscribe,

    // Filter Management
    setFilter(filters: Partial<SearchFilter>) {
      update(state => {
        const newFilters = { ...state.activeFilters, ...filters };
        
        // Add search query to recent queries if it's new
        if (filters.query && filters.query !== state.activeFilters.query) {
          const recentQueries = [
            filters.query,
            ...state.recentQueries.filter(q => q !== filters.query)
          ].slice(0, RECENT_QUERIES_LIMIT);
          
          // Persist recent queries
          storageManager.set(`${STORAGE_KEY}-recent`, recentQueries);
          
          state.recentQueries = recentQueries;
        }

        state.activeFilters = newFilters;
        
        // Emit filter change event
        eventBus.emit('filters:changed', {
          filter: newFilters,
          timestamp: new Date().toISOString()
        });

        return state;
      });
    },

    setQuery(query: string) {
      this.setFilter({ query });
    },

    setCategory(category: DiagnosticCategory | 'all') {
      this.setFilter({ category });
    },

    setStatus(status: 'all' | 'pass' | 'fail' | 'warning') {
      this.setFilter({ status });
    },

    setDateRange(dateRange: 'all' | 'today' | 'week' | 'month') {
      this.setFilter({ dateRange });
    },

    setType(type: 'all' | 'session' | 'diagnostic' | 'error') {
      this.setFilter({ type });
    },

    clearFilters() {
      this.setFilter(defaultFilter);
      eventBus.emit('filters:cleared', { timestamp: new Date().toISOString() });
    },

    clearQuery() {
      this.setFilter({ query: '' });
    },

    // Saved Filters
    async saveFilter(name: string, filters?: SearchFilter) {
      const filterToSave = filters || await this.getActiveFilters();
      
      update(state => {
        const savedFilter = {
          id: `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name,
          filters: filterToSave,
          timestamp: new Date().toISOString()
        };

        const savedFilters = [
          savedFilter,
          ...state.savedFilters.filter(f => f.name !== name)
        ].slice(0, SAVED_FILTERS_LIMIT);

        state.savedFilters = savedFilters;
        
        // Persist saved filters
        storageManager.set(`${STORAGE_KEY}-saved`, savedFilters);
        
        eventBus.emit('filters:saved', { name, filters: filterToSave });
        
        return state;
      });
    },

    async loadFilter(filterId: string) {
      const state = this.getState();
      const savedFilter = state.savedFilters.find(f => f.id === filterId);
      
      if (savedFilter) {
        this.setFilter(savedFilter.filters);
        eventBus.emit('filters:loaded', { 
          id: filterId, 
          name: savedFilter.name,
          filters: savedFilter.filters
        });
      }
    },

    async deleteFilter(filterId: string) {
      update(state => {
        const filterToDelete = state.savedFilters.find(f => f.id === filterId);
        state.savedFilters = state.savedFilters.filter(f => f.id !== filterId);
        
        storageManager.set(`${STORAGE_KEY}-saved`, state.savedFilters);
        
        if (filterToDelete) {
          eventBus.emit('filters:deleted', { 
            id: filterId, 
            name: filterToDelete.name 
          });
        }
        
        return state;
      });
    },

    // Options Management
    updateAvailableOptions(optionType: string, options: FilterOption[]) {
      update(state => {
        state.availableOptions[optionType] = options;
        return state;
      });
    },

    addOptionCounts(items: HistoryItem[]) {
      update(state => {
        // Update category counts
        const categoryCounts = items.reduce((acc, item) => {
          const category = item.category || 'unknown';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        state.availableOptions.categories = state.availableOptions.categories.map(option => ({
          ...option,
          count: option.value === 'all' ? items.length : categoryCounts[option.value] || 0
        }));

        // Update status counts
        const statusCounts = items.reduce((acc, item) => {
          const status = item.status || 'unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        state.availableOptions.statuses = state.availableOptions.statuses.map(option => ({
          ...option,
          count: option.value === 'all' ? items.length : statusCounts[option.value] || 0
        }));

        // Update type counts
        const typeCounts = items.reduce((acc, item) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        state.availableOptions.types = state.availableOptions.types.map(option => ({
          ...option,
          count: option.value === 'all' ? items.length : typeCounts[option.value] || 0
        }));

        return state;
      });
    },

    // Data Access
    async getActiveFilters(): Promise<SearchFilter> {
      return new Promise(resolve => {
        const unsubscribe = subscribe(state => {
          resolve(state.activeFilters);
          unsubscribe();
        });
      });
    },

    getState(): FilterStoreState {
      let currentState: FilterStoreState;
      const unsubscribe = subscribe(state => {
        currentState = state;
      });
      unsubscribe();
      return currentState!;
    },

    // Initialization
    async initialize() {
      try {
        const [savedFilters, recentQueries] = await Promise.all([
          storageManager.get<Array<any>>(`${STORAGE_KEY}-saved`),
          storageManager.get<string[]>(`${STORAGE_KEY}-recent`)
        ]);

        update(state => ({
          ...state,
          savedFilters: savedFilters || [],
          recentQueries: recentQueries || []
        }));
      } catch (error) {
        console.error('[FiltersStore] Failed to initialize:', error);
      }
    },

    // Reset
    reset() {
      set(initialState);
    }
  };
}

export const filtersStore = createFiltersStore();

// Derived stores for computed values
export const activeFilters: Readable<SearchFilter> = derived(
  filtersStore,
  state => state.activeFilters
);

export const hasActiveFilters: Readable<boolean> = derived(
  filtersStore,
  state => {
    const filters = state.activeFilters;
    return filters.query !== '' || 
           filters.category !== 'all' || 
           filters.status !== 'all' || 
           filters.dateRange !== 'all' || 
           filters.type !== 'all';
  }
);

export const recentQueries: Readable<string[]> = derived(
  filtersStore,
  state => state.recentQueries
);

export const savedFilters: Readable<Array<{ id: string; name: string; filters: SearchFilter; timestamp: string }>> = derived(
  filtersStore,
  state => state.savedFilters
);

export const categoryOptions: Readable<FilterOption[]> = derived(
  filtersStore,
  state => state.availableOptions.categories || []
);

export const statusOptions: Readable<FilterOption[]> = derived(
  filtersStore,
  state => state.availableOptions.statuses || []
);

export const typeOptions: Readable<FilterOption[]> = derived(
  filtersStore,
  state => state.availableOptions.types || []
);

export const dateRangeOptions: Readable<FilterOption[]> = derived(
  filtersStore,
  state => state.availableOptions.dateRanges || []
);

// Filter application logic
export function applyFilters(items: HistoryItem[], filters: SearchFilter): HistoryItem[] {
  let filtered = items;

  // Text search
  if (filters.query) {
    const query = filters.query.toLowerCase();
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(query) ||
      JSON.stringify(item.data).toLowerCase().includes(query)
    );
  }

  // Category filter
  if (filters.category !== 'all') {
    filtered = filtered.filter(item => item.category === filters.category);
  }

  // Status filter
  if (filters.status !== 'all') {
    filtered = filtered.filter(item => item.status === filters.status);
  }

  // Type filter
  if (filters.type !== 'all') {
    filtered = filtered.filter(item => item.type === filters.type);
  }

  // Date range filter
  if (filters.dateRange !== 'all') {
    const now = new Date();
    const cutoff = new Date();
    
    switch (filters.dateRange) {
      case 'today':
        cutoff.setHours(0, 0, 0, 0);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
    }

    filtered = filtered.filter(item => 
      new Date(item.timestamp) >= cutoff
    );
  }

  return filtered.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function generateSearchStats(filteredItems: HistoryItem[]): SearchStats {
  const stats: SearchStats = {
    total: filteredItems.length,
    sessions: 0,
    diagnostics: 0,
    errors: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  };

  filteredItems.forEach(item => {
    stats[item.type as keyof Pick<SearchStats, 'sessions' | 'diagnostics' | 'errors'>]++;
    if (item.status) {
      const statusKey = item.status === 'pass' ? 'passed' : 
                       item.status === 'fail' ? 'failed' : 'warnings';
      stats[statusKey]++;
    }
  });

  return stats;
}

// Initialize store on module load
filtersStore.initialize();