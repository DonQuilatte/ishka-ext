export default async function globalTeardown() {
  const pid = process.env.__STORYBOOK_PID__;
  if (pid) {
    console.log('[Playwright] Killing Storybook (PID ' + pid + ')...');
    try {
      process.kill(Number(pid));
    } catch (err) {
      console.warn('[Playwright] Failed to kill Storybook:', err);
    }
  }
} 