import { Page, Locator, expect } from '@playwright/test';
import { AppPage } from './AppPage';

/**
 * SidebarPage — Page Object for the left navigation sidebar.
 *
 * Encapsulates interactions specific to the sidebar:
 * pin/unpin, chat selection, mobile overlay toggle.
 *
 * Extends AppPage to inherit shared selectors.
 */
export class SidebarPage extends AppPage {
  constructor(page: Page) {
    super(page);
  }

  /** Get all chat item locators (pinned + recent combined). */
  get chatItems(): Locator {
    return this.sidebar.locator('[class*="rounded"]').filter({ hasText: /\w+/ });
  }

  /** Get the pin/unpin button inside a chat item by chat title. */
  pinButtonFor(chatTitle: string): Locator {
    return this.sidebar
      .locator('div', { hasText: chatTitle })
      .locator('button', { hasText: /pin/i });
  }

  /** Assert sidebar is visible (desktop: always; mobile: only when open). */
  async assertVisible() {
    await expect(this.sidebar).toBeVisible();
  }

  /** Assert sidebar is off-screen (mobile closed state). */
  async assertHidden() {
    // Sidebar uses translate-x classes, not display:none, so check bounding box
    const box = await this.sidebar.boundingBox();
    expect(box?.x ?? 0, 'sidebar should be translated off-screen').toBeLessThan(0);
  }

  /** Open sidebar via the hamburger menu (mobile). */
  async openOnMobile() {
    await this.menuButton.click();
    await this.sidebar.waitFor({ state: 'visible' });
  }

  /** Click the overlay backdrop to close the sidebar on mobile. */
  async closeViaOverlay() {
    // The translucent overlay sits below z-20 sidebar, behind the main content
    await this.page.locator('.fixed.inset-0').click({ position: { x: 350, y: 300 } });
  }

  /**
   * Assert the sidebar fills the full viewport height with no gap at the bottom.
   * This catches the scrollbar-gutter regression: sidebar bottom should equal
   * window.innerHeight.
   */
  async assertFullHeight() {
    const { sidebarBottom, viewportHeight } = await this.sidebar.evaluate((el) => ({
      sidebarBottom: el.getBoundingClientRect().bottom,
      viewportHeight: window.innerHeight,
    }));
    // Allow 1px for sub-pixel rounding
    expect(Math.abs(sidebarBottom - viewportHeight), 'sidebar should reach the bottom edge').toBeLessThanOrEqual(1);
  }
}
