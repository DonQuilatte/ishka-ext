import { chromium, type BrowserContext, type ChromiumBrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Update this if your dist path is different
const EXTENSION_PATH = path.resolve(__dirname, '../../dist');

export async function launchExtensionContext(): Promise<{
  context: ChromiumBrowserContext;
  extensionId: string;
}> {
  console.log('[with-extension] Launching browser with extension...');
  if (!fs.existsSync(path.join(EXTENSION_PATH, 'manifest.json'))) {
    throw new Error(`[with-extension] manifest.json not found in ${EXTENSION_PATH}`);
  }

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  console.log('[with-extension] Waiting for background page or service worker...');
  const backgroundPages = context.backgroundPages();
  const serviceWorkers = context.serviceWorkers();

  if (backgroundPages.length > 0) {
    const url = backgroundPages[0].url();
    const extensionId = url.split('/')[2];
    console.log('[with-extension] Found background page:', url);
    return { context, extensionId };
  }

  if (serviceWorkers.length > 0) {
    const url = serviceWorkers[0].url();
    const extensionId = url.split('/')[2];
    console.log('[with-extension] Found service worker:', url);
    return { context, extensionId };
  }

  // Wait up to 5 seconds for service worker to appear
  const extensionId = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('[with-extension] Timed out waiting for extension to load')), 5000);

    context.on('serviceworker', (worker) => {
      const id = worker.url().split('/')[2];
      clearTimeout(timeout);
      console.log('[with-extension] Service worker appeared:', worker.url());
      resolve(id);
    });

    context.on('page', (page) => {
      if (page.url().startsWith('chrome-extension://')) {
        const id = page.url().split('/')[2];
        console.log('[with-extension] Fallback: Found extension page:', page.url());
        clearTimeout(timeout);
        resolve(id);
      }
    });
  });

  return { context, extensionId };
}

export function extensionUrl(extensionId: string, path: string) {
  return `chrome-extension://${extensionId}/${path.replace(/^\//, '')}`;
} 