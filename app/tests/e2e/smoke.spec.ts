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

  // Empty input previews "Hello World" in the first card.
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
