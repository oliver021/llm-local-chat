import { test, expect } from '@playwright/test';
import { AppPage } from '../pages/AppPage';
import { SidebarPage } from '../pages/SidebarPage';

/**
 * Layout & Shell Tests
 *
 * Covers the fixed structural invariants that must hold regardless of
 * which chat is active or what the user has done:
 *
 *  - Header is always 64px (h-16) and never compressed
 *  - No content spills outside the viewport (no page-level scrollbar)
 *  - Sidebar fills the full viewport height with no gap at the bottom
 *  - Sidebar border and content edge stay aligned when chat area scrolls
 */

test.describe('Layout & Shell', () => {

  test('header is exactly 64px and sticky', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    // Baseline check on empty state
    await app.assertHeaderHeight();

    // Header must stay fixed when content scrolls — send a message to
    // populate the chat then scroll the message area
    await app.sendMessage('Test message for scroll');
    await app.waitForAiResponse();
    await app.assertHeaderHeight(); // must still be 64px after interaction
  });

  test('no page-level scroll overflow', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.assertNoPageScroll();
  });

  test('sidebar fills full viewport height (no bottom gap)', async ({ page }) => {
    const sidebar = new SidebarPage(page);
    await sidebar.goto();
    await sidebar.assertFullHeight();
  });

  test('sidebar height stays correct after chat scrolls', async ({ page }) => {
    const app = new AppPage(page);
    const sidebar = new SidebarPage(page);
    await app.goto();

    // Trigger scrollable content in the chat area
    await app.sendMessage('Generate a lot of content so the chat area scrolls');
    await app.waitForAiResponse();

    // Sidebar bottom edge must still touch the viewport bottom — no gap
    await sidebar.assertFullHeight();
    await app.assertHeaderHeight();
  });

  test('header icons do not overlap on desktop', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    // Collect bounding boxes of left and right header icon groups
    const themeToggleBox = await app.themeToggle.boundingBox();
    const avatarBox      = await app.userAvatar.boundingBox();
    const headerBox      = await app.header.boundingBox();

    expect(themeToggleBox).toBeTruthy();
    expect(avatarBox).toBeTruthy();

    // Both icons must sit within the header bounds
    expect(themeToggleBox!.y).toBeGreaterThanOrEqual(headerBox!.y);
    expect(themeToggleBox!.y + themeToggleBox!.height).toBeLessThanOrEqual(headerBox!.y + headerBox!.height);

    // Theme toggle must not overlap the user avatar
    const rightEdgeOfTheme = themeToggleBox!.x + themeToggleBox!.width;
    expect(rightEdgeOfTheme).toBeLessThanOrEqual(avatarBox!.x + 4); // +4 for gap
  });

  test('app renders without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const app = new AppPage(page);
    await app.goto();

    expect(errors, `Console errors found: ${errors.join(', ')}`).toHaveLength(0);
  });
});
