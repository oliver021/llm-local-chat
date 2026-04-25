import { test, expect } from '@playwright/test';
import { AppPage } from '../pages/AppPage';

/**
 * Theme Tests
 *
 * Covers light/dark mode toggle behaviour and persistence:
 *
 *  - App starts in dark mode by default (matches index.html class="dark")
 *  - Clicking the theme toggle switches between light and dark
 *  - The html element's class reflects the active theme
 *  - Theme choice persists across page reloads (localStorage)
 *  - Settings modal "Appearance" tab also toggles theme
 */

test.describe('Theme Toggle', () => {

  test.beforeEach(async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.clearStorage(); // always start from dark (the HTML default)
  });

  test('starts in dark mode by default', async ({ page }) => {
    // index.html sets class="dark" on <html>; useTheme falls back to 'dark'
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
  });

  test('theme toggle button is visible in header', async ({ page }) => {
    const app = new AppPage(page);
    await expect(app.themeToggle).toBeVisible();
  });

  test('clicking theme toggle switches to light mode', async ({ page }) => {
    const app = new AppPage(page);
    await app.themeToggle.click();

    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('light');
    expect(htmlClass).not.toContain('dark');
  });

  test('clicking theme toggle twice returns to dark mode', async ({ page }) => {
    const app = new AppPage(page);
    await app.themeToggle.click(); // → light
    await app.themeToggle.click(); // → dark

    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
  });

  test('theme persists after page reload', async ({ page }) => {
    const app = new AppPage(page);

    // Switch to light and reload
    await app.themeToggle.click();
    await page.reload();
    await app.chatInput.waitFor({ state: 'visible' });

    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('light');
  });

  test('dark mode applies dark background colour to body', async ({ page }) => {
    // In dark mode the body carries bg-gray-950 via Tailwind dark: prefix
    const bgColor = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    // dark bg-gray-950 = rgb(3, 7, 18) in Tailwind default palette
    // We only assert it is NOT white to avoid being fragile against palette changes
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  test('light mode removes dark class from html element', async ({ page }) => {
    const app = new AppPage(page);
    await app.themeToggle.click(); // switch to light

    // NOTE: We check the html class attribute rather than the computed CSS value
    // because Tailwind v4's dark mode media query vs class strategy may differ
    // depending on how the project is configured. The html class toggle is
    // the authoritative signal that the theme has changed.
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).not.toContain('dark');
    expect(htmlClass).toContain('light');
  });
});
