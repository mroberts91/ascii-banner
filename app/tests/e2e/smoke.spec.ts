import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// `vite preview` ignores Pages' _headers, so apply the production CSP here to catch violations.
const CSP = /Content-Security-Policy: (.+)/.exec(readFileSync('public/_headers', 'utf8'))![1];

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': CSP } });
  });
});

test('type → render → search → copy as Markdown', async ({ page, context, browserName }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ASCII Banner' })).toBeVisible();

  // Empty input previews "Merica" in the first card.
  const first = page.locator('.card').first();
  await expect(first.locator('pre')).not.toBeEmpty();

  await page.getByLabel('Your text').fill('Test');
  await expect(page.locator('.card[data-font="Standard"] pre')).toHaveAttribute('aria-label', 'Test in Standard');

  await page.getByLabel('Search fonts').fill('slant');
  const slant = page.locator('.card[data-font="Slant"]');
  await expect(slant).toBeVisible();
  await expect(page.locator('.card[data-font="Standard"]')).toHaveCount(0);
  await expect(slant.locator('pre')).not.toBeEmpty();

  await page.getByLabel('Copy as').selectOption('markdown');
  await slant.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('status')).toHaveText('Copied Slant');

  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip.startsWith('```text\n')).toBe(true);
  expect(clip.endsWith('\n```')).toBe(true);

  // State is reflected in a shareable URL.
  await expect(page).toHaveURL(/t=Test/);
  await expect(page).toHaveURL(/f=markdown/);

  expect(errors).toEqual([]);
});

test('shared URL restores state', async ({ page }) => {
  await page.goto('/?t=Hi&w=120&s=fitted&q=big&cat=block');
  await expect(page.getByLabel('Your text')).toHaveValue('Hi');
  await expect(page.getByLabel('Search fonts')).toHaveValue('big');
  await expect(page.getByRole('radio', { name: '120' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Block', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('theme switch persists', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Dark' }).check({ force: true });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('reset restores defaults and clears the URL', async ({ page }) => {
  await page.goto('/?t=Hi&w=120&s=fitted&q=big&cat=block&f=markdown');
  const reset = page.getByRole('button', { name: 'Reset' });
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(page.getByLabel('Your text')).toHaveValue('');
  await expect(page.getByLabel('Your text')).toBeFocused();
  await expect(page.getByLabel('Search fonts')).toHaveValue('');
  await expect(page.getByLabel('Copy as')).toHaveValue('raw');
  await expect(page.getByRole('radio', { name: '80' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\/$/);
  await expect(reset).toBeDisabled();
});

test.describe('small viewport', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test('options collapse behind a toggle and the text box stays pinned', async ({ page }) => {
    await page.goto('/?w=120&f=markdown');

    // No horizontal page scroll at phone width.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // Header fits on one row: theme toggle sits beside the brand, and the title isn't truncated.
    const brandBox = (await page.locator('.brand').boundingBox())!;
    const themeBox = (await page.locator('.theme-toggle').boundingBox())!;
    const center = (b: { y: number; height: number }) => b.y + b.height / 2;
    expect(Math.abs(center(brandBox) - center(themeBox))).toBeLessThan(8);
    expect(themeBox.x).toBeGreaterThan(brandBox.x + brandBox.width);
    const truncated = await page.locator('.brand h1').evaluate((h) => h.scrollWidth > h.clientWidth);
    expect(truncated).toBe(false);

    const toggle = page.getByRole('button', { name: /^Options/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAccessibleName('Options 2 changed');
    await expect(page.getByLabel('Search fonts')).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByLabel('Search fonts')).toBeVisible();
    await toggle.click();

    // Sticky compose bar keeps the text box on screen after scrolling the gallery.
    await page.evaluate(() => window.scrollBy(0, 3000));
    await expect(page.getByLabel('Your text')).toBeInViewport();
  });
});

test('footer links open in a new tab and the font licenses are served', async ({ page, request }) => {
  await page.goto('/');
  for (const name of ['figlet.js (opens in a new tab)', 'font licenses (opens in a new tab)']) {
    const link = page.getByRole('link', { name });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  const res = await request.get('/font-licenses.txt');
  expect(res.ok()).toBe(true);
  expect(await res.text()).toContain('Standard by Glenn Chappell');
});
