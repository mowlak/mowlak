import { expect, test } from '@playwright/test';

test('the Polish landing page introduces the product and opens the app', async ({ page }) => {
	await page.goto('/pl');

	await expect(page.getByRole('heading', { level: 1, name: 'Mowlak' })).toBeVisible();
	await expect(
		page.getByText('Spokojna aplikacja do nauki mówienia dla najmłodszych.')
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Otwórz aplikację' })).toHaveAttribute(
		'href',
		'/app/pl'
	);
});

test('the English landing page introduces the product and opens the app', async ({ page }) => {
	await page.goto('/en');

	await expect(page.getByRole('heading', { level: 1, name: 'Mowlak' })).toBeVisible();
	await expect(page.getByText('A calm speech-learning app for toddlers.')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Open the app' })).toHaveAttribute('href', '/app/en');
});

// The root redirects before first paint, which makes asserting the landing
// it reaches racy. Read the prerendered document instead: the fallback links
// must work without scripting, and the redirect must ship inside the HTML
// rather than in a deferred bundle.
test('the root ships language fallbacks and an inline redirect', async ({ request }) => {
	const response = await request.get('/');
	expect(response.status()).toBe(200);

	const html = await response.text();
	expect(html).toContain('href="/pl"');
	expect(html).toContain('href="/en"');
	expect(html).toContain('location.replace');
});
