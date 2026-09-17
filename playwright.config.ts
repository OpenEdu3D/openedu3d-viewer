import { defineConfig } from '@playwright/test';

const port = process.env.TEST_PORT || '5175';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  outputDir: 'node_modules/.cache/openedu3d/test-results',
  reporter: 'list',
  use: { actionTimeout: 5000, baseURL, viewport: { width: 1280, height: 900 } },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI
  }
});
