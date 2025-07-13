<script>
  export let status = 'unknown'; // 'pass' | 'fail' | 'warning' | 'unknown'
  export let size = 'medium'; // 'small' | 'medium' | 'large'
  export let showText = false;
  export let text = '';

  $: displayText = text || getDefaultText(status);
  $: statusClass = `status-${status}`;
  $: sizeClass = `size-${size}`;

  function getDefaultText(status) {
    switch (status) {
      case 'pass': return 'Healthy';
      case 'fail': return 'Issues';
      case 'warning': return 'Warnings';
      default: return 'Unknown';
    }
  }
</script>

<div class="status-indicator {statusClass} {sizeClass}">
  <div class="status-dot" class:pulse={status === 'fail'}></div>
  {#if showText}
    <span class="status-text">{displayText}</span>
  {/if}
</div>

<style>
  .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--ishka-space-2);
  }

  .status-dot {
    border-radius: var(--ishka-radius-full);
    transition: all var(--ishka-transition-fast);
  }

  /* Size variants */
  .size-small .status-dot {
    width: var(--ishka-space-2);
    height: var(--ishka-space-2);
  }

  .size-medium .status-dot {
    width: var(--ishka-space-3);
    height: var(--ishka-space-3);
  }

  .size-large .status-dot {
    width: var(--ishka-space-4);
    height: var(--ishka-space-4);
  }

  /* Status colors */
  .status-pass .status-dot {
    background: var(--ishka-status-pass);
    box-shadow: 0 0 0 2px var(--ishka-status-pass-bg);
  }

  .status-fail .status-dot {
    background: var(--ishka-status-fail);
    box-shadow: 0 0 0 2px var(--ishka-status-fail-bg);
  }

  .status-warning .status-dot {
    background: var(--ishka-status-warning);
    box-shadow: 0 0 0 2px var(--ishka-status-warning-bg);
  }

  .status-unknown .status-dot {
    background: var(--ishka-text-tertiary);
    box-shadow: 0 0 0 2px var(--ishka-bg-secondary);
  }

  /* Pulse animation for critical status */
  .pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .status-text {
    font-size: var(--ishka-text-sm);
    font-weight: var(--ishka-font-medium);
    color: var(--ishka-text-secondary);
  }

  .size-small .status-text {
    font-size: var(--ishka-text-xs);
  }

  .size-large .status-text {
    font-size: var(--ishka-text-base);
  }
</style>