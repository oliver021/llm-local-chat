import { expect, test, type Page } from '@playwright/test';
import { LLM_URL } from '../playwright.config.js';

/** Fail the test on anything the browser logs as an error (CSP violations, crashes, ...). */
function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

const messageBox = (page: Page) => page.getByPlaceholder('Message Aura…');

async function send(page: Page, text: string) {
  await messageBox(page).fill(text);
  await messageBox(page).press('Enter');
}

/** The reply has been fully received and saved: the Stop button is gone. */
async function waitForReplyToFinish(page: Page) {
  await expect(page.getByRole('button', { name: 'Stop generating' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
}

/**
 * Wait until the server has stored `count` messages for the chat called `title`.
 * The UI updates as soon as a reply ends, but the save is a separate request; reloading
 * before it lands aborts it and the reply is gone, which is flaky on a slow machine.
 */
async function waitForSaved(page: Page, title: string, count: number) {
  await expect
    .poll(async () => {
      const chats = await (await page.request.get('/api/chats')).json();
      return chats.find((c: { title: string }) => c.title === title)?.messages.length;
    })
    .toBe(count);
}

/** A chat entry in the sidebar. */
const sidebarChat = (page: Page, title: string) =>
  page.getByRole('listitem').filter({ hasText: title }).first();

test.beforeEach(async ({ request }) => {
  // Start every test from an empty history.
  await request.delete('/api/chats');
});

test('loads without console errors or third-party requests', async ({ page, baseURL }) => {
  const errors = collectBrowserErrors(page);
  const external: string[] = [];
  page.on('request', (req) => {
    if (req.url().startsWith('http') && new URL(req.url()).origin !== new URL(baseURL!).origin) {
      external.push(req.url());
    }
  });

  await page.goto('/');
  await expect(page.getByText('How can I help you today?')).toBeVisible();
  await expect(page.getByLabel('Backend online')).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('sends a message, streams the reply, and keeps the chat after a reload', async ({ page }) => {
  await page.goto('/');
  await send(page, 'Hello from Playwright');

  await expect(page.getByText('Mock reply. You said: "Hello from Playwright"')).toBeVisible();
  await waitForReplyToFinish(page);
  await waitForSaved(page, 'Hello from Playwright', 2);

  await page.reload();
  await sidebarChat(page, 'Hello from Playwright').click();
  await expect(page.getByText('Mock reply. You said: "Hello from Playwright"')).toBeVisible();
});

test('reloading in the middle of a reply does not save a bogus error as the answer', async ({ page }) => {
  await page.goto('/');
  await send(page, 'tell me everything [long]');
  await expect(page.getByText(/word3\b/)).toBeVisible();
  await waitForSaved(page, 'tell me everything [long]', 1); // the question; the reply is unfinished

  await page.reload();
  await sidebarChat(page, 'tell me everything').click();

  await expect(page.getByText('tell me everything [long]').first()).toBeVisible();
  await expect(page.getByText('Could not reach the model')).toHaveCount(0);
});

test('Stop halts generation and cancels the request to the model server', async ({ page, request }) => {
  const before = await (await request.get(`${LLM_URL}/__stats`)).json();

  await page.goto('/');
  await send(page, 'tell me everything [long]');

  const stop = page.getByRole('button', { name: 'Stop generating' });
  await expect(stop).toBeVisible();
  await expect(page.getByText(/word3\b/)).toBeVisible();
  await stop.click();

  // The model server notices the browser went away: generation really stops.
  await expect
    .poll(async () => (await (await request.get(`${LLM_URL}/__stats`)).json()).aborted)
    .toBe(before.aborted + 1);
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
  await expect(page.getByText('word300')).toHaveCount(0);
});

test('copying a chat creates a second, persisted chat', async ({ page }) => {
  await page.goto('/');
  await send(page, 'Copy me');
  await expect(page.getByText('Mock reply. You said: "Copy me"')).toBeVisible();
  await waitForReplyToFinish(page);

  const item = sidebarChat(page, 'Copy me');
  await item.hover();
  await item.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('button', { name: 'Copy', exact: true }).click();

  await page.getByPlaceholder('New chat title').fill('My duplicate');
  await page.getByRole('button', { name: 'Copy', exact: true }).click();

  await expect(page.getByText('My duplicate').first()).toBeVisible();

  // The copy is written message by message; wait until the server has all of it.
  await waitForSaved(page, 'My duplicate', 2);

  await page.reload();
  await expect(sidebarChat(page, 'My duplicate')).toBeVisible();
  await expect(sidebarChat(page, 'Copy me').first()).toBeVisible();

  // The copy keeps the conversation, not just the title.
  await sidebarChat(page, 'My duplicate').click();
  await expect(page.getByText('Mock reply. You said: "Copy me"')).toBeVisible();
});

test('model selector reports which providers are available', async ({ page }) => {
  await page.goto('/');
  await page.getByTitle('Select model / provider').click();

  await expect(page.getByText('llama-server is running.')).toBeVisible();
  await expect(page.getByText('mock-model.gguf').first()).toBeVisible();

  await page.getByRole('button', { name: 'OpenAI' }).click();
  await expect(page.getByText('Set OPENAI_API_KEY in .env and restart the server.')).toBeVisible();

  await page.getByRole('button', { name: 'Ollama' }).click();
  await expect(page.getByText(/Ollama not reachable/)).toBeVisible();
});

test('asking OpenAI without a server-side key explains what to do', async ({ page }) => {
  await page.goto('/');
  await page.getByTitle('Select model / provider').click();
  await page.getByRole('button', { name: 'OpenAI' }).click();
  await page.keyboard.press('Escape');

  // Use the API directly: the key is missing, so the proxy must say so clearly.
  const res = await page.request.post('/api/proxy/openai/chat/completions', { data: { model: 'gpt-4o', messages: [] } });
  expect(res.status()).toBe(503);
  expect((await res.json()).error.message).toBe('OPENAI_API_KEY is not set on the server');
});
