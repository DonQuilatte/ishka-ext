<script lang="ts">
  interface DateRangePickerProps {
    /** Label for the date range picker */
    label: string;
    /** Start date value (YYYY-MM-DD format) */
    start: string;
    /** End date value (YYYY-MM-DD format) */
    end: string;
    /** Callback when date range changes */
    onChange: (start: string, end: string) => void;
    /** Minimum selectable date */
    min?: string;
    /** Maximum selectable date */
    max?: string;
    /** Compact styling */
    compact?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Show clear button */
    showClear?: boolean;
    /** Placeholder text for start date */
    startPlaceholder?: string;
    /** Placeholder text for end date */
    endPlaceholder?: string;
    /** Validation error message */
    error?: string;
  }

  const { 
    label, 
    start = '', 
    end = '', 
    onChange,
    min,
    max,
    compact = false,
    disabled = false,
    showClear = true,
    startPlaceholder = 'Start date',
    endPlaceholder = 'End date',
    error = ''
  }: DateRangePickerProps = $props();

  let startValue = $state(start);
  let endValue = $state(end);
  let startInputRef: HTMLInputElement;
  let endInputRef: HTMLInputElement;

  // Reactive updates when props change
  $effect(() => {
    startValue = start;
  });

  $effect(() => {
    endValue = end;
  });

  function handleStartChange(event: Event) {
    const target = event.target as HTMLInputElement;
    startValue = target.value;
    
    // Auto-adjust end date if it's before start date
    if (endValue && startValue && new Date(endValue) < new Date(startValue)) {
      endValue = startValue;
    }
    
    onChange(startValue, endValue);
  }

  function handleEndChange(event: Event) {
    const target = event.target as HTMLInputElement;
    endValue = target.value;
    
    // Auto-adjust start date if it's after end date
    if (startValue && endValue && new Date(startValue) > new Date(endValue)) {
      startValue = endValue;
    }
    
    onChange(startValue, endValue);
  }

  function clearDates() {
    startValue = '';
    endValue = '';
    onChange('', '');
    
    // Focus the start input after clearing
    if (startInputRef) {
      startInputRef.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Enable keyboard navigation between inputs
    if (event.key === 'Tab' && !event.shiftKey && event.target === startInputRef) {
      event.preventDefault();
      endInputRef?.focus();
    } else if (event.key === 'Tab' && event.shiftKey && event.target === endInputRef) {
      event.preventDefault();
      startInputRef?.focus();
    }
  }

  // Compute effective min/max values
  $derived: effectiveStartMax = endValue || max;
  $derived: effectiveEndMin = startValue || min;

  // Validation
  $derived: isValid = !error && (!startValue || !endValue || new Date(startValue) <= new Date(endValue));
</script>

<div class="ishka-root">
  <div class="date-range-picker" class:compact class:disabled class:error={!isValid || error}>
    <div class="label-container">
      <label class="date-range-label" for="start-{label}">
        {label}
      </label>
      
      {#if showClear && (startValue || endValue) && !disabled}
        <button 
          type="button" 
          class="clear-button"
          onclick={clearDates}
          aria-label="Clear date range"
        >
          Clear
        </button>
      {/if}
    </div>

    <div class="inputs-container">
      <div class="input-group">
        <label class="input-label" for="start-{label}">
          From
        </label>
        <div class="input-wrapper">
          <input
            bind:this={startInputRef}
            id="start-{label}"
            type="date"
            class="date-input start-input"
            value={startValue}
            {min}
            max={effectiveStartMax}
            {disabled}
            placeholder={startPlaceholder}
            onchange={handleStartChange}
            onkeydown={handleKeyDown}
            aria-describedby={error ? `error-${label}` : undefined}
          />
          <div class="input-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path 
                d="M12.667 2.667H3.333C2.597 2.667 2 3.264 2 4v8.667c0 .736.597 1.333 1.333 1.333h9.334c.736 0 1.333-.597 1.333-1.333V4c0-.736-.597-1.333-1.333-1.333z" 
                stroke="currentColor" 
                stroke-width="1.2" 
                stroke-linecap="round" 
                stroke-linejoin="round"
              />
              <path 
                d="M10.667 1.333V4M5.333 1.333V4M2 6.667h12" 
                stroke="currentColor" 
                stroke-width="1.2" 
                stroke-linecap="round" 
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div class="range-separator" aria-hidden="true">
        <svg width="16" height="2" viewBox="0 0 16 2" fill="none">
          <path 
            d="M1 1h14" 
            stroke="currentColor" 
            stroke-width="1.5" 
            stroke-linecap="round"
          />
        </svg>
      </div>

      <div class="input-group">
        <label class="input-label" for="end-{label}">
          To
        </label>
        <div class="input-wrapper">
          <input
            bind:this={endInputRef}
            id="end-{label}"
            type="date"
            class="date-input end-input"
            value={endValue}
            min={effectiveEndMin}
            {max}
            {disabled}
            placeholder={endPlaceholder}
            onchange={handleEndChange}
            onkeydown={handleKeyDown}
            aria-describedby={error ? `error-${label}` : undefined}
          />
          <div class="input-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path 
                d="M12.667 2.667H3.333C2.597 2.667 2 3.264 2 4v8.667c0 .736.597 1.333 1.333 1.333h9.334c.736 0 1.333-.597 1.333-1.333V4c0-.736-.597-1.333-1.333-1.333z" 
                stroke="currentColor" 
                stroke-width="1.2" 
                stroke-linecap="round" 
                stroke-linejoin="round"
              />
              <path 
                d="M10.667 1.333V4M5.333 1.333V4M2 6.667h12" 
                stroke="currentColor" 
                stroke-width="1.2" 
                stroke-linecap="round" 
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    {#if error}
      <div class="error-message" id="error-{label}" role="alert">
        {error}
      </div>
    {/if}
  </div>
</div>

<style>
  .ishka-root {
    font-family: var(--ishka-font-family);
  }

  .date-range-picker {
    display: flex;
    flex-direction: column;
    gap: var(--ishka-space-2);
    min-width: 0;
  }

  .date-range-picker.compact {
    gap: var(--ishka-space-1);
  }

  .date-range-picker.disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .date-range-picker.error .date-input {
    border-color: var(--ishka-status-fail);
  }

  .date-range-picker.error .date-input:focus {
    border-color: var(--ishka-status-fail);
    box-shadow: 0 0 0 2px var(--ishka-status-fail-bg);
  }

  .label-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--ishka-space-2);
  }

  .date-range-label {
    font-size: var(--ishka-font-size-sm);
    font-weight: var(--ishka-font-weight-medium);
    color: var(--ishka-text-secondary);
    margin: 0;
    line-height: var(--ishka-line-height-normal);
  }

  .compact .date-range-label {
    font-size: var(--ishka-font-size-xs);
  }

  .clear-button {
    background: none;
    border: 1px solid var(--ishka-border);
    border-radius: var(--ishka-radius-base);
    padding: var(--ishka-space-1) var(--ishka-space-2);
    color: var(--ishka-text-muted);
    font-size: var(--ishka-font-size-xs);
    font-weight: var(--ishka-font-weight-medium);
    cursor: pointer;
    transition: all var(--ishka-transition-fast);
  }

  .clear-button:hover {
    background-color: var(--ishka-surface-secondary);
    color: var(--ishka-text-secondary);
    border-color: var(--ishka-primary-300);
  }

  .clear-button:focus {
    outline: none;
    border-color: var(--ishka-border-focus);
    box-shadow: 0 0 0 2px var(--ishka-primary-100);
  }

  .inputs-container {
    display: flex;
    align-items: flex-end;
    gap: var(--ishka-space-3);
  }

  .compact .inputs-container {
    gap: var(--ishka-space-2);
  }

  .input-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--ishka-space-1);
  }

  .input-label {
    font-size: var(--ishka-font-size-xs);
    font-weight: var(--ishka-font-weight-medium);
    color: var(--ishka-text-muted);
    margin: 0;
    line-height: var(--ishka-line-height-normal);
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .date-input {
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
    transition: all var(--ishka-transition-fast);
  }

  .compact .date-input {
    height: var(--ishka-button-height-sm);
    padding: var(--ishka-space-1) var(--ishka-space-6) var(--ishka-space-1) var(--ishka-space-2);
    font-size: var(--ishka-font-size-xs);
  }

  .date-input:focus {
    outline: none;
    border-color: var(--ishka-border-focus);
    box-shadow: 0 0 0 2px var(--ishka-primary-100);
  }

  .date-input:hover:not(:disabled) {
    border-color: var(--ishka-primary-300);
  }

  .date-input:disabled {
    background-color: var(--ishka-surface-secondary);
    color: var(--ishka-text-muted);
    cursor: not-allowed;
  }

  /* Custom calendar icon */
  .input-icon {
    position: absolute;
    right: var(--ishka-space-3);
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--ishka-text-muted);
    transition: all var(--ishka-transition-fast);
  }

  .compact .input-icon {
    right: var(--ishka-space-2);
  }

  .date-input:focus + .input-icon {
    color: var(--ishka-border-focus);
  }

  .date-input:hover:not(:disabled) + .input-icon {
    color: var(--ishka-text-secondary);
  }

  .range-separator {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ishka-text-muted);
    margin-bottom: var(--ishka-space-4);
  }

  .compact .range-separator {
    margin-bottom: var(--ishka-space-3);
  }

  .error-message {
    font-size: var(--ishka-font-size-xs);
    color: var(--ishka-status-fail);
    margin: 0;
    line-height: var(--ishka-line-height-normal);
  }

  /* Focus visible for keyboard navigation */
  .date-input:focus-visible {
    border-color: var(--ishka-border-focus);
    box-shadow: 
      0 0 0 2px var(--ishka-primary-100),
      0 0 0 4px var(--ishka-primary-200);
  }

  .clear-button:focus-visible {
    border-color: var(--ishka-border-focus);
    box-shadow: 
      0 0 0 2px var(--ishka-primary-100),
      0 0 0 4px var(--ishka-primary-200);
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .inputs-container {
      flex-direction: column;
      gap: var(--ishka-space-2);
    }
    
    .range-separator {
      transform: rotate(90deg);
      margin: 0;
    }
    
    .input-group {
      width: 100%;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .date-input {
      border-width: 2px;
    }
    
    .date-input:focus {
      border-width: 3px;
    }
    
    .clear-button {
      border-width: 2px;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .date-input,
    .clear-button,
    .input-icon {
      transition: none;
    }
  }

  /* Date input browser-specific styling */
  .date-input::-webkit-calendar-picker-indicator {
    opacity: 0;
    position: absolute;
    right: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }

  .date-input::-webkit-inner-spin-button {
    display: none;
  }

  .date-input::-webkit-clear-button {
    display: none;
  }
</style>