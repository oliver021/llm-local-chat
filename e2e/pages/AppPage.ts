import { Page, Locator, expect } from '@playwright/test';

/**
 * AppPage — top-level Page Object Model
 *
 * Centralises all selectors and shared actions used across the app.
 * Each feature area (Sidebar, Chat, TopNav) has its own sub-POM that extends this.
 *
 * Usage:
 *   const app = new AppPage(page);
 *   await app.goto();
 *   await app.clearStorage(); // always call before tests that depend on fresh state
 */
export class AppPage {
  readonly page: Page;

  // Layout roots
  readonly sidebar: Locator;
  readonly main: Locator;
  readonly header: Locator;

  // TopNav elements
  readonly menuButton: Locator;       // Hamburger — mobile only
  readonly themeToggle: Locator;      // Sun / Moon button
  readonly userAvatar: Locator;

  // Sidebar elements
  readonly newChatButton: Locator;
  readonly settingsButton: Locator;
  readonly pinnedSection: Locator;
  readonly recentSection: Locator;

  // Chat area elements
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly welcomeHeading: Locator;   // "How can I help you today?"
  readonly suggestedPrompts: Locator; // Quick-action buttons below welcome
  readonly typingIndicator: Locator;
  readonly messageBubbles: Locator;
  readonly todayDivider: Locator;

  // Settings modal
  readonly settingsModal: Locator;
  readonly settingsCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Layout roots — using semantic HTML elements where possible
    this.sidebar    = page.locator('aside');
    this.main       = page.locator('main');
    this.header     = page.locator('header');

    // TopNav
    this.menuButton  = page.locator('header button').filter({ has: page.locator('svg') }).first();
    this.themeToggle = page.locator('[aria-label="Toggle theme"]');
    this.userAvatar  = page.locator('img[alt="User"]');

    // Sidebar
    this.newChatButton   = page.locator('aside button', { hasText: 'New Chat' });
    this.settingsButton  = page.locator('aside button', { hasText: 'Settings' });
    this.pinnedSection   = page.locator('aside').filter({ hasText: 'PINNED' });
    this.recentSection   = page.locator('aside').filter({ hasText: 'RECENT' });

    // Chat area
    this.chatInput        = page.locator('textarea[placeholder="Message Aura..."]');
    this.sendButton       = page.locator('button[aria-label="Send message"]');
    this.welcomeHeading   = page.locator('text=How can I help you today?');
    this.suggestedPrompts = page.locator('button', { hasText: /trip to Paris|quantum physics|python script|dinner recipe/i });
    this.typingIndicator  = page.locator('text=Aura is thinking');
    this.messageBubbles   = page.locator('[data-testid="message-bubble"]');
    this.todayDivider     = page.locator('text=TODAY');

    // Settings modal
    this.settingsModal       = page.locator('[role="dialog"], .settings-modal').first();
    this.settingsCloseButton = page.locator('[aria-label="Close settings"]');
  }

  /** Navigate to the app and wait for it to be ready. */
  async goto() {
    await this.page.goto('/');
    // Wait for the React root to hydrate — the chat input is a reliable signal
    await this.chatInput.waitFor({ state: 'visible', timeout: 10_000 });
  }

  /**
   * Wipe localStorage before a test to avoid state bleed from previous runs.
   * Call this inside test `beforeEach` or at the start of each test.
   */
  async clearStorage() {
    await this.page.evaluate(() => localStorage.clear());
    await this.page.reload();
    await this.chatInput.waitFor({ state: 'visible', timeout: 10_000 });
  }

  /** Type a message and click Send (or press Enter). */
  async sendMessage(text: string) {
    await this.chatInput.fill(text);
    await this.chatInput.press('Enter');
  }

  /** Wait for the typing indicator to appear then disappear (AI response cycle). */
  async waitForAiResponse(timeout = 8_000) {
    // Typing indicator shows while waiting for mock AI
    await this.typingIndicator.waitFor({ state: 'visible',  timeout });
    await this.typingIndicator.waitFor({ state: 'detached', timeout });
  }

  /** Return the text of a specific message bubble by index (0-based). */
  async getMessageText(index: number): Promise<string> {
    return this.messageBubbles.nth(index).textContent() ?? '';
  }

  /**
   * Open the sidebar on mobile viewports before performing sidebar actions.
   * On desktop (md: breakpoint ≥ 768px) the sidebar is always visible — no-op.
   * On mobile the hamburger must be clicked first.
   */
  async ensureSidebarOpen() {
    const viewport = this.page.viewportSize();
    const isMobile = !viewport || viewport.width < 768;
    if (isMobile) {
      // Check if sidebar is already visible (translated on-screen)
      const isOffScreen = await this.sidebar.evaluate(
        (el) => el.getBoundingClientRect().x < 0
      );
      if (isOffScreen) {
        await this.menuButton.click();
        // Wait for translate animation to complete
        await this.page.waitForFunction(
          () => (document.querySelector('aside')?.getBoundingClientRect().x ?? -1) >= 0,
          { timeout: 5_000 }
        );
      }
    }
  }

  /** Click a chat item in the sidebar by its visible title. */
  async selectChat(title: string) {
    await this.ensureSidebarOpen();
    await this.sidebar.locator(`text=${title}`).click();
  }

  /** Assert that the header height is the designed 64px (h-16). */
  async assertHeaderHeight() {
    const height = await this.header.evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBe(64);
  }

  /** Assert that no content spills outside the viewport (no page-level scroll). */
  async assertNoPageScroll() {
    const overflow = await this.page.evaluate(() => ({
      body: document.body.scrollHeight <= window.innerHeight,
      root: (document.getElementById('root')?.scrollHeight ?? 0) <= window.innerHeight,
    }));
    expect(overflow.body, 'body should not overflow viewport').toBe(true);
  }
}
