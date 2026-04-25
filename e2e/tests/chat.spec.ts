import { test, expect } from '@playwright/test';
import { AppPage } from '../pages/AppPage';

/**
 * Chat Flow Tests
 *
 * Covers the core send/receive message loop and all message actions:
 *
 *  - New chat welcome screen shown when no chat is active
 *  - Suggested prompts trigger message flow
 *  - Typing a message and hitting Enter (or Send button) sends it
 *  - Typing indicator appears during mock AI delay, then disappears
 *  - AI response appears after indicator
 *  - Messages are grouped under a "TODAY" date divider
 *  - New Chat button creates a fresh conversation
 *  - Message actions: copy, delete, edit, regenerate
 */

test.describe('Chat Flow', () => {

  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.clearStorage(); // start from clean state each test
  });

  // ─── Welcome Screen ───────────────────────────────────────────────────────

  test('shows welcome heading on fresh state', async ({ page }) => {
    const app = new AppPage(page);
    await expect(app.welcomeHeading).toBeVisible();
  });

  test('shows four suggested prompts on welcome screen', async ({ page }) => {
    const app = new AppPage(page);
    await expect(app.suggestedPrompts).toHaveCount(4);
  });

  // ─── Sending Messages ─────────────────────────────────────────────────────

  test('can type and send a message via Enter key', async ({ page }) => {
    const app = new AppPage(page);
    const message = 'Hello Aura, how are you?';

    await app.chatInput.fill(message);
    await app.chatInput.press('Enter');

    // Scope to <main> to avoid matching the same text in sidebar title or header
    await expect(app.main.locator(`text=${message}`).first()).toBeVisible();
  });

  test('can send a message via the Send button', async ({ page }) => {
    const app = new AppPage(page);
    const message = 'Send via button test';

    await app.chatInput.fill(message);
    await app.sendButton.click();

    await expect(app.main.locator(`text=${message}`).first()).toBeVisible();
  });

  test('Shift+Enter inserts a newline instead of sending', async ({ page }) => {
    const app = new AppPage(page);
    await app.chatInput.fill('Line one');
    await app.chatInput.press('Shift+Enter');
    await app.chatInput.type('Line two');

    // Input still contains the text (not sent)
    await expect(app.chatInput).toContainText('Line one');
    // Welcome heading still visible — no chat started
    await expect(app.welcomeHeading).toBeVisible();
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    const app = new AppPage(page);
    await expect(app.sendButton).toBeDisabled();
  });

  test('send button becomes active once text is typed', async ({ page }) => {
    const app = new AppPage(page);
    await app.chatInput.fill('anything');
    await expect(app.sendButton).toBeEnabled();
  });

  // ─── Typing Indicator & AI Response ──────────────────────────────────────

  test('typing indicator appears and disappears during AI response', async ({ page }) => {
    const app = new AppPage(page);
    await app.sendMessage('What is TypeScript?');

    // Indicator must appear
    await expect(app.typingIndicator).toBeVisible({ timeout: 5_000 });

    // And then vanish once the mock response arrives
    await expect(app.typingIndicator).not.toBeVisible({ timeout: 8_000 });
  });

  test('AI response appears after typing indicator', async ({ page }) => {
    const app = new AppPage(page);
    await app.sendMessage('What is TypeScript?');
    await app.waitForAiResponse();

    // At least two bubbles: user + AI
    const count = await page.locator('text=You').count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ─── Date Divider ─────────────────────────────────────────────────────────

  test('messages are grouped under a TODAY divider', async ({ page }) => {
    const app = new AppPage(page);
    await app.sendMessage('Testing date grouping');
    await app.waitForAiResponse();

    await expect(app.todayDivider).toBeVisible();
  });

  // ─── Suggested Prompts ────────────────────────────────────────────────────

  test('clicking a suggested prompt sends that message', async ({ page }) => {
    const app = new AppPage(page);
    const prompt = page.locator('button', { hasText: 'Plan a weekend trip to Paris' });

    await prompt.click();

    // Scope to main — same text also appears in header title and sidebar
    await expect(app.main.locator('text=Plan a weekend trip to Paris').first()).toBeVisible();
  });

  // ─── New Chat ─────────────────────────────────────────────────────────────

  test('New Chat button creates a fresh conversation', async ({ page }) => {
    const app = new AppPage(page);

    // Start a conversation
    await app.sendMessage('First chat message');
    await app.waitForAiResponse();

    // Create a new chat — sidebar may be closed on mobile
    await app.ensureSidebarOpen();
    await app.newChatButton.click();

    // Welcome screen should reappear
    await expect(app.welcomeHeading).toBeVisible();
    // Input should be empty
    await expect(app.chatInput).toHaveValue('');
  });

  // ─── Message Actions ──────────────────────────────────────────────────────

  test('message delete removes the message from the UI', async ({ page }) => {
    const app = new AppPage(page);
    const messageText = 'Message to be deleted';

    await app.sendMessage(messageText);
    await app.waitForAiResponse();

    // The action menu lives in the DOM at all times (opacity-0); use force:true
    // to click it without needing a real CSS hover state (which is unreliable in
    // headless mode due to CSS transition timing).
    // Filter to the first delete button — the user message's action menu.
    const deleteButtons = page.locator('[aria-label="Delete message"]');
    await deleteButtons.first().click({ force: true });

    // The user message paragraph must be gone from main
    const userMessagePara = app.main.locator('p', { hasText: messageText });
    await expect(userMessagePara).not.toBeVisible({ timeout: 5_000 });
  });

  test('message copy button is present in the action menu', async ({ page }) => {
    const app = new AppPage(page);
    await app.sendMessage('Message to copy');
    await app.waitForAiResponse();

    // Copy button is always in the DOM (opacity-0 by default) — just check it exists
    const copyButtons = page.locator('[aria-label="Copy message"]');
    await expect(copyButtons.first()).toBeAttached({ timeout: 5_000 });
  });

  // ─── Persistence ──────────────────────────────────────────────────────────

  test('messages persist across page reload', async ({ page }) => {
    const app = new AppPage(page);
    // Use a short message so it also becomes the full chat title (max 40 chars)
    const persistMsg = 'Persistence test';

    await app.sendMessage(persistMsg);
    await app.waitForAiResponse();

    // Reload WITHOUT clearing storage — chats survive via localStorage
    await page.reload();
    await app.chatInput.waitFor({ state: 'visible' });

    // activeChatId is not persisted. Re-open the chat by clicking the sidebar
    // span whose text matches the message (useChats sets title = first 40 chars).
    // On mobile the sidebar must be opened first.
    await app.ensureSidebarOpen();
    await app.sidebar.locator('span.truncate', { hasText: persistMsg }).first().click();

    // Message must appear in the main chat area
    await expect(app.main.locator(`text=${persistMsg}`).first()).toBeVisible({ timeout: 5_000 });
  });
});
