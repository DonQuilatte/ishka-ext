import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest configuration
    globals: true,
    environment: 'jsdom',
    include: ['tests/unit/**/*.{test,spec}.{js,ts}', 'tests/integration/**/*.{test,spec}.{js,ts}'],
    exclude: ['tests/e2e/**/*.{test,spec}.{js,ts}', 'node_modules/**/*', '**/node_modules/**'],
    setupFiles: ['./tests/setup/test-setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: [
        'tests/**',
        'node_modules/**',
        '**/*.config.*',
        '**/*.mock.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});