import { exec } from 'child_process';
import type { WaitOnOptions } from 'wait-on';
import waitOn from 'wait-on';

export default async function globalSetup() {
  const command = 'pnpm run storybook';

  console.log('[Playwright] Starting Storybook...');
  const child = exec(command, { env: process.env });

  // Store PID so we can kill it in teardown
  process.env.__STORYBOOK_PID__ = String(child.pid);

  // Wait until Storybook is available
  await waitOn({ resources: ['http://localhost:6006/'], timeout: 30_000 } as WaitOnOptions);
  console.log('[Playwright] Storybook is ready.');
} 