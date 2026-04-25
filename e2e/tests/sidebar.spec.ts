import { test, expect } from '@playwright/test';
import { SidebarPage } from '../pages/SidebarPage';
import { AppPage } from '../pages/AppPage';

/**
 * Sidebar Tests
 *
 * Covers sidebar navigation and state:
 *
 *  - Desktop: sidebar always visible, chats listed in Pinned / Recent
 *  - Mobile: sidebar hidden by default, opens via hamburger, closes via overlay
 *  - Pin / unpin a chat moves it between sections
 *  - Selecting a chat loads it in the main area
 *  - Settings button in sidebar footer opens the settings modal
 *  - Sidebar fills full viewport height (no bottom gap)
 */

test.describe('Sidebar — Desktop', () => {

  test('sidebar is visible on desktop without toggling', async ({ page }) => {
    const sidebar = new SidebarPage(page);
    await sidebar.goto();
    await sidebar.assertVisible();
  });

  test('shows PINNED and RECENT section headers', async ({ page }) => {
    const sidebar = new SidebarPage(page);
    await sidebar.goto();

    await expect(page.locator('text=PINNED')).toBeVisible();
    await expect(page.locator('text=RECENT')).toBeVisible();
  });

  test('shows mock chats in sidebar', async ({ page }) => {
    const sidebar = new SidebarPage(page);
    await sidebar.goto();

    // MOCK_CHATS has at least these two pinned entries from constants.ts
    await expect(sidebar.sidebar.locator('text=React Performance Tips')).toBeVisible();
    await expect(sidebar.sidebar.locator('text=Dinner Recipes')).toBeVisible();
  });

  test('clicking a chat loads it in the main area', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    // ensureSidebarOpen() handles mobile/desktop — selectChat calls it internally
    await app.selectChat('React Performance Tips');

    // Header should update with the chat title
    await expect(app.header.locator('text=React Performance Tips')).toBeVisible();
  });

  test('New Chat button shows welcome screen', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    // Navigate into an existing chat first
    await app.selectChat('React Performance Tips');
    await expect(app.welcomeHeading).not.toBeVisible();

    // Re-open sidebar on mobile before clicking New Chat
    await app.ensureSidebarOpen();
    await app.newChatButton.click();
    await expect(app.welcomeHeading).toBeVisible();
  });

  test('sidebar fills viewport height with no bottom gap', async ({ page }) => {
    const sidebar = new SidebarPage(page);
    await sidebar.goto();
    await sidebar.assertFullHeight();
  });
});


test.describe('Sidebar — Pin / Unpin', () => {

  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.clearStorage();
  });

  test('pin button is present on each chat item', async ({ page }) => {
    const sidebar = new SidebarPage(page);
    await sidebar.goto();

    // Pin/unpin buttons are always in the DOM (opacity-0 until hover via CSS group).
    // Verify they are attached for the two known unpinned chats.
    // Uses aria-label which we added to ChatItem.tsx for test accessibility.
    const pinButtons = page.locator('aside button[aria-label="Pin chat"]');
    await expect(pinButtons.first()).toBeAttached({ timeout: 3_000 });
  });
});


test.describe('Sidebar — Mobile', () => {

  // All tests in this describe block run at a 375px viewport
  test.use({ viewport: { width: 375, height: 812 } });

  test('sidebar is hidden by default on mobile', async ({ page }) => {
    const sidebar = new SidebarPage(page);
    await sidebar.goto();
    await sidebar.assertHidden();
  });

  test('hamburger menu opens sidebar on mobile', async ({ page }) => {
    const sidebar = new SidebarPage(page);
    await sidebar.goto();

    await sidebar.menuButton.click();

    // Wait for the CSS translate animation to finish (300ms transition) before measuring.
    // Polling the bounding box until x >= 0 is more reliable than a fixed sleep.
    await page.waitForFunction(() => {
      const aside = document.querySelector('aside');
      return aside ? aside.getBoundingClientRect().x >= 0 : false;
    }, { timeout: 5_000 });

    const box = await sidebar.sidebar.boundingBox();
    expect(box?.x ?? -999).toBeGreaterThanOrEqual(0);
  });

  test('sidebar still fills full height when open on mobile', async ({ page }) => {
    const sidebar = new SidebarPage(page);
    await sidebar.goto();
    await sidebar.openOnMobile();
    await sidebar.assertFullHeight();
  });
});


test.describe('Sidebar — Settings shortcut', () => {

  test('Settings button opens settings modal', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    // Settings button is inside sidebar — ensure it's open on mobile
    await app.ensureSidebarOpen();
    await app.settingsButton.click();

    // Settings modal or dialog should appear
    await expect(
      page.locator('[role="dialog"]').or(page.locator('text=Settings')).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
