<!-- <reference types="vite/client" /> -->
<script lang="ts">
  import TestStatusPanel from './components/TestStatusPanel.svelte';
  import { telemetryActions } from '../store/telemetry-store';
  let devMode = import.meta.env.MODE === 'development';

  function handleFile(event: any) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const json = JSON.parse(e.target?.result as string);
        telemetryActions.setTestResults(json);
      } catch (err) {
        alert('Failed to parse test-results.json: ' + err);
      }
    };
    reader.readAsText(file);
  }
</script>

{#if devMode}
  <div class="test-loader">
    <label>Load Playwright test-results.json:
      <input type="file" accept="application/json" on:change={handleFile} />
    </label>
  </div>
{/if}

<TestStatusPanel />

<style>
.test-loader { margin: 1em 0; }
</style>