import { expect, test } from '@playwright/test';
import { surface } from './card-surface';

// The root picks a language from the browser, so the walk below only has a
// fixed route once the browser has a fixed language.
test.use({ locale: 'pl-PL' });

// The product collects nothing and calls nobody, so there is nothing for a
// visitor to consent to. That promise is only true while every byte comes
// from this origin: no fonts, no analytics, no embeds, no CDN. This test
// walks the whole site and fails the moment a request leaves it.
test('a full visit never leaves the origin', async ({ page, baseURL }) => {
	const origin = new URL(baseURL!).origin;
	const requested: string[] = [];
	page.on('request', (request) => requested.push(request.url()));

	await page.goto('/');
	await page.waitForURL('**/pl');
	await page.getByRole('link', { name: 'Prywatność' }).click();
	await page.waitForURL('**/pl/privacy');
	await page.getByRole('link', { name: 'Mowlak' }).click();
	await page.waitForURL('**/pl');
	await page.getByRole('link', { name: 'Otwórz aplikację' }).click();
	await page.waitForURL('**/app/pl');
	await expect(surface(page)).toHaveAttribute('data-state', 'idle');

	// The English pages are the same documents in another language, and have
	// the same nothing to fetch.
	await page.goto('/en');
	await page.getByRole('link', { name: 'Privacy' }).click();
	await page.waitForURL('**/en/privacy');
	await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();

	// Guards the guard: an empty list would pass the assertion below while
	// proving nothing.
	expect(requested.length).toBeGreaterThan(0);
	expect(requested.filter((url) => !url.startsWith(`${origin}/`))).toEqual([]);
});
