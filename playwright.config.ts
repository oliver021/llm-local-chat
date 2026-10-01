import { defineConfig } from '@playwright/test';

const APP_PORT = 3199;
const LLM_PORT = 18199;

export const LLM_URL = `http://127.0.0.1:${LLM_PORT}`;

/**
 * End-to-end tests run the real production build in a real browser against a
 * fake llama.cpp server (e2e/support/mock-llm-server.mjs), so they need no model.
 *
 * They use the Google Chrome that is already installed (preinstalled on GitHub's
 * Ubuntu runners), so there is nothing to download. Set E2E_BROWSER=chromium to
 * use Playwright's own build after `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'test-results/e2e',
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    channel: process.env.E2E_BROWSER === 'chromium' ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node e2e/support/mock-llm-server.mjs',
      env: { MOCK_LLM_PORT: String(LLM_PORT), MOCK_LLM_DELAY_MS: '20' },
      url: `${LLM_URL}/v1/models`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run build && node e2e/support/start-app.mjs',
      env: {
        PORT: String(APP_PORT),
        HOST: '127.0.0.1',
        LLAMA_SERVER_URL: LLM_URL,
        // Pretend nothing else is installed so the "no key" hints are deterministic.
        OPENAI_API_KEY: '',
        ANTHROPIC_API_KEY: '',
        OLLAMA_URL: 'http://127.0.0.1:18200',
      },
      url: `http://127.0.0.1:${APP_PORT}/api/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
