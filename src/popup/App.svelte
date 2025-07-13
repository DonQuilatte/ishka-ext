<script>
  import StatusIndicator from '../ui/components/StatusIndicator.svelte';
  let message = "Hello, Svelte Chrome Extension!";
</script>

<main>
  <h1>{message}</h1>
  
  <!-- Test the migrated UI component -->
  <div class="status-test">
    <h2>UI Component Test</h2>
    <StatusIndicator status="pass" showText={true} text="UI Migration Successful" />
    <StatusIndicator status="fail" showText={true} text="Test Failure" />
    <StatusIndicator status="warning" showText={true} text="Needs Attention" />
    <StatusIndicator status="unknown" showText={true} />
  </div>
</main>

<style>
  .status-test {
    margin-top: 1rem;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .status-test h2 {
    font-size: 14px;
    margin-bottom: 1rem;
  }
  
  /* Basic CSS custom properties for the StatusIndicator */
  :global(:root) {
    --ishka-space-2: 8px;
    --ishka-space-3: 12px;
    --ishka-space-4: 16px;
    --ishka-radius-full: 50%;
    --ishka-transition-fast: 0.2s;
    --ishka-status-pass: #10b981;
    --ishka-status-pass-bg: #d1fae5;
    --ishka-status-fail: #ef4444;
    --ishka-status-fail-bg: #fee2e2;
    --ishka-status-warning: #f59e0b;
    --ishka-status-warning-bg: #fef3c7;
    --ishka-text-tertiary: #6b7280;
    --ishka-bg-secondary: #f3f4f6;
    --ishka-text-sm: 14px;
    --ishka-text-xs: 12px;
    --ishka-text-base: 16px;
    --ishka-font-medium: 500;
    --ishka-text-secondary: #374151;
  }
</style>