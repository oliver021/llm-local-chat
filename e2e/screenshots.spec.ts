import path from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * Regenerates the images used in the README:  npm run screenshots
 * Skipped in normal e2e runs. It seeds a sample conversation through the API
 * and fakes an Ollama model list in the browser, so no real model is needed.
 */
test.skip(!process.env.SCREENSHOTS, 'Run with `npm run screenshots`');
test.use({ viewport: { width: 1440, height: 1040 } });

const OUT = path.resolve('docs/screenshots');
const MAIN_CHAT = 'Composition vs inheritance';

const ANSWER = `Short version: **prefer composition**, reach for inheritance only for a true "is-a" relationship.

- **Composition** builds behaviour by combining small, focused pieces.
- **Inheritance** couples a subclass to every detail of its parent.

\`\`\`javascript
// Prefer this (composition)
const withLogging = (fn) => (...args) => {
  console.log('Calling with:', args);
  return fn(...args);
};

const loggedFetch = withLogging(fetch);
\`\`\`

Composed pieces can be swapped, tested and reused on their own, which is why most modern codebases lean that way.`;

async function seed(request: APIRequestContext) {
  const now = Date.now();
  const minutes = (n: number) => now - n * 60_000;

  const chats = [
    { id: 'seed-pinned-1', title: 'React performance tips', pinned: true, at: 600 },
    { id: 'seed-pinned-2', title: 'Dinner recipes', pinned: true, at: 700 },
    { id: 'seed-main', title: MAIN_CHAT, pinned: false, at: 5 },
    { id: 'seed-3', title: 'Plan a weekend trip to Paris', pinned: false, at: 90 },
    { id: 'seed-4', title: 'Explain quantum computing', pinned: false, at: 300 },
    { id: 'seed-5', title: 'Travel itinerary: Japan', pinned: false, at: 900 },
  ];
  for (const c of chats) {
    await request.post('/api/chats', {
      data: { id: c.id, title: c.title, isPinned: c.pinned, updatedAt: minutes(c.at), createdAt: minutes(c.at) },
    });
  }

  await request.post('/api/chats/seed-main/messages', {
    data: {
      id: 'seed-main-1',
      role: 'user',
      content: 'What is the difference between composition and inheritance? Show me a small example.',
      timestamp: minutes(5),
    },
  });
  await request.post('/api/chats/seed-main/messages', {
    data: { id: 'seed-main-2', role: 'ai', content: ANSWER, timestamp: minutes(4) },
  });
}

const OLLAMA_MODELS = [
  ['llama3.2:latest', 2019393189, 'llama', '3.2B'],
  ['qwen2.5-coder:7b', 4683087332, 'qwen2', '7.6B'],
  ['mistral:7b', 4113301824, 'llama', '7.2B'],
  ['gemma3:4b', 3338801804, 'gemma3', '4.3B'],
  ['phi4:14b', 9053116391, 'phi3', '14.7B'],
].map(([name, size, family, parameter_size]) => ({
  name,
  model: name,
  size,
  digest: String(name).replace(/\W/g, '').padEnd(12, '0'),
  modified_at: '2026-03-24T10:00:00Z',
  details: { family, parameter_size, quantization_level: 'Q4_K_M' },
}));

test.beforeEach(async ({ request }) => {
  await request.delete('/api/chats');
  await seed(request);
});

test('chat, dark and light', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('listitem').filter({ hasText: MAIN_CHAT }).first().click();
  await expect(page.getByText('Short version:')).toBeVisible();
  await page.waitForTimeout(700); // let the entrance animations finish
  await page.screenshot({ path: path.join(OUT, 'chat-dark.png') });

  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'chat-light.png') });
});

test('model manager', async ({ page }) => {
  await page.route('**/ollama/api/tags', (route) => route.fulfill({ json: { models: OLLAMA_MODELS } }));

  await page.goto('/');
  await page.getByTitle('Select model / provider').click();
  await page.getByRole('button', { name: 'Ollama' }).click();
  await expect(page.getByText('llama3.2').first()).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, 'model-manager.png') });
});
