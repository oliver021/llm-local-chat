import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration
 *
 * Runs tests against the Vite dev server on localhost:5173.
 * Three desktop browsers + one mobile viewport for coverage.
 *
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Root directory for all test files
  testDir: './e2e/tests',

  // Re-run failing tests once before marking them as failed
  retries: 1,

  // Run tests in each file in parallel
  fullyParallel: true,

  // Fail fast: stop on first test failure in CI
  forbidOnly: !!process.env.CI,

  // Limit parallel workers in CI to avoid resource exhaustion
  workers: process.env.CI ? 1 : undefined,

  // Reporter: HTML report for local dev, minimal output for CI
  reporter: process.env.CI ? 'dot' : 'html',

  // Shared settings for every test
  use: {
    baseURL: 'http://localhost:5173',

    // Capture screenshot on failure for debugging
    screenshot: 'only-on-failure',

    // Collect trace on first retry to diagnose flaky tests
    trace: 'on-first-retry',

    // Automatically clear localStorage between tests to prevent state bleed
    storageState: undefined,
  },

  // Browsers to test against
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewport — tests sidebar overlay, touch behaviour
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Auto-start the Vite dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI, // Reuse if already running locally
    timeout: 30_000,
  },
});
