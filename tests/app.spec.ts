import { expect, test } from '@playwright/test';
import { SURFACE, surface } from './card-surface';

test('the app opens on the first card of the pack, under its own path', async ({ page }) => {
	await page.goto('/app/pl');

	const root = surface(page);
	await expect(root).toHaveAttribute('data-state', 'idle');
	await expect(root).toHaveAttribute('data-card', 'dog');
});

test('the interface language does not change which cards are taught', async ({ page }) => {
	// The onomatopoeia canon is Polish speech-therapy practice, so an English
	// interface still opens the Polish pack.
	await page.goto('/app/en');

	await expect(surface(page)).toHaveAttribute('data-card', 'dog');
});

test('the card screen has no words on it', async ({ page }) => {
	await page.goto('/app/pl');
	await expect(surface(page)).toHaveAttribute('data-state', 'idle');

	// A child of one and a half cannot read, so anything written here would
	// be decoration competing with the picture. The controls are named for
	// assistive technology instead, which draws nothing.
	expect(await page.locator(SURFACE).innerText()).toBe('');
	expect(await page.getByRole('button').count()).toBeGreaterThan(0);
});
