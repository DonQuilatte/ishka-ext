<script lang="ts">
  import { telemetryStore } from '../../store/telemetry-store';
  import { derived } from 'svelte/store';
  export let testResults: any = undefined;

  // Use store if prop not provided
  const results = derived(telemetryStore, $t => testResults ?? $t.testResults);
</script>

{#if $results}
  <div class="test-status-summary">
    <h2>Test Results</h2>
    <div>
      ✅ {$results.passed} Passed &nbsp; ❌ {$results.failed} Failed &nbsp; ⚠️ {$results.skipped} Skipped
    </div>
    <ul>
      {#each $results.tests as test}
        <li class={test.status}>
          {#if test.status === 'passed'}✅{/if}
          {#if test.status === 'failed'}❌{/if}
          {#if test.status === 'skipped'}⚠️{/if}
          <strong>{test.name}</strong>
          {#if test.error}
            <pre>{test.error}</pre>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{:else}
  <div class="test-status-empty">No test results loaded. Please load test-results.json.</div>
{/if}

<style>
.test-status-summary { margin: 1em 0; }
.test-status-summary ul { list-style: none; padding: 0; }
.test-status-summary li { margin: 0.25em 0; }
.passed { color: green; }
.failed { color: red; }
.skipped { color: orange; }
.test-status-empty { color: #888; font-style: italic; }
</style> 