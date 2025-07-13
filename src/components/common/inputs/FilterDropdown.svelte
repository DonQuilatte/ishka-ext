<script lang="ts">
  import type { FilterOption } from '../types.js';

  interface FilterDropdownProps {
    /** Label for the dropdown */
    label: string;
    /** Available options */
    options: FilterOption[];
    /** Currently selected value */
    value: string;
    /** Callback when selection changes */
    onChange: (value: string) => void;
    /** Whether to show option counts */
    showCounts?: boolean;
    /** Compact styling */
    compact?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Placeholder text when no option selected */
    placeholder?: string;
  }

  const { 
    label, 
    options, 
    value, 
    onChange, 
    showCounts = false,
    compact = false,
    disabled = false,
    placeholder = 'Select...'
  }: FilterDropdownProps = $props();

  function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    onChange(target.value);
  }

  function formatOptionLabel(option: FilterOption): string {
    if (showCounts && typeof option.count === 'number') {
      return `${option.label} (${option.count})`;
    }
    return option.label;
  }
</script>

<div class="ishka-root">
  <div class="filter-dropdown" class:compact class:disabled>
    <label class="filter-label" for="filter-{label}">
      {label}
    </label>
    <div class="select-container">
      <select
        id="filter-{label}"
        class="filter-select"
        {value}
        {disabled}
        onchange={handleChange}
      >
        {#if placeholder && !value}
          <option value="" disabled>{placeholder}</option>
        {/if}
        
        {#each options as option (option.value)}
          <option 
            value={option.value} 
            disabled={option.disabled}
            class:has-count={showCounts && typeof option.count === 'number'}
          >
            {formatOptionLabel(option)}
          </option>
        {/each}
      </select>
      
      <!-- Custom dropdown arrow -->
      <div class="dropdown-arrow" aria-hidden="true">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path 
            d="M1 1.5L6 6.5L11 1.5" 
            stroke="currentColor" 
            stroke-width="1.5" 
            stroke-linecap="round" 
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>
  </div>
</div>

<style>
  .ishka-root {
    font-family: var(--ishka-font-family);
  }

  .filter-dropdown {
    display: flex;
    flex-direction: column;
    gap: var(--ishka-space-1);
    min-width: 0; /* Allow shrinking */
  }

  .filter-dropdown.compact {
    gap: var(--ishka-space-1);
  }

  .filter-dropdown.disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .filter-label {
    font-size: var(--ishka-font-size-sm);
    font-weight: var(--ishka-font-weight-medium);
    color: var(--ishka-text-secondary);
    margin: 0;
    line-height: var(--ishka-line-height-normal);
  }

  .compact .filter-label {
    font-size: var(--ishka-font-size-xs);
  }

  .select-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .filter-select {
    width: 100%;
    height: var(--ishka-input-height-sm);
    padding: var(--ishka-space-2) var(--ishka-space-8) var(--ishka-space-2) var(--ishka-space-3);
    border: 1px solid var(--ishka-border);
    border-radius: var(--ishka-radius-base);
    background-color: var(--ishka-surface);
    color: var(--ishka-text-primary);
    font-size: var(--ishka-font-size-sm);
    font-family: var(--ishka-font-family);
    line-height: var(--ishka-line-height-normal);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
    appearance: none; /* Remove default arrow */
    -webkit-appearance: none;
    -moz-appearance: none;
  }

  .compact .filter-select {
    height: var(--ishka-button-height-sm);
    padding: var(--ishka-space-1) var(--ishka-space-6) var(--ishka-space-1) var(--ishka-space-2);
    font-size: var(--ishka-font-size-xs);
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--ishka-border-focus);
    box-shadow: 0 0 0 2px var(--ishka-primary-100);
  }

  .filter-select:hover:not(:disabled) {
    border-color: var(--ishka-primary-300);
  }

  .filter-select:disabled {
    background-color: var(--ishka-surface-secondary);
    color: var(--ishka-text-muted);
    cursor: not-allowed;
  }

  /* Custom dropdown arrow */
  .dropdown-arrow {
    position: absolute;
    right: var(--ishka-space-3);
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--ishka-text-muted);
    transition: all var(--ishka-transition-fast);
  }

  .compact .dropdown-arrow {
    right: var(--ishka-space-2);
  }

  .filter-select:focus + .dropdown-arrow {
    color: var(--ishka-border-focus);
  }

  .filter-select:hover:not(:disabled) + .dropdown-arrow {
    color: var(--ishka-text-secondary);
  }

  /* Option styling */
  .filter-select option {
    background-color: var(--ishka-surface);
    color: var(--ishka-text-primary);
    padding: var(--ishka-space-2) var(--ishka-space-3);
  }

  .filter-select option:disabled {
    color: var(--ishka-text-muted);
    background-color: var(--ishka-surface-secondary);
  }

  .filter-select option.has-count {
    font-family: var(--ishka-font-family-mono);
  }

  /* Enhanced hover states for better UX */
  .filter-select option:hover:not(:disabled) {
    background-color: var(--ishka-primary-50);
  }

  /* Focus visible for keyboard navigation */
  .filter-select:focus-visible {
    border-color: var(--ishka-border-focus);
    box-shadow: 
      0 0 0 2px var(--ishka-primary-100),
      0 0 0 4px var(--ishka-primary-200);
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .filter-dropdown {
      min-width: 120px;
    }
    
    .filter-select {
      font-size: var(--ishka-font-size-sm);
    }
  }

  /* Dark mode enhancements */
  @media (prefers-color-scheme: dark) {
    .filter-select option:hover:not(:disabled) {
      background-color: var(--ishka-primary-900);
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .filter-select {
      border-width: 2px;
    }
    
    .filter-select:focus {
      border-width: 3px;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .filter-select,
    .dropdown-arrow {
      transition: none;
    }
  }
</style>