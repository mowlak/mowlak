import { expect, test } from '@playwright/test';

test('the Polish landing page introduces the product and opens the app', async ({ page }) => {
	await page.goto('/pl');

	// The wordmark carries the name visually; the h1 spells it for screen
	// readers and search results without repeating it above its own logo.
	await expect(page.getByRole('heading', { level: 1, name: 'Mowlak' })).toHaveCount(1);
	await expect(
		page.getByAltText('„mowlak” w dymku mowy; obok „nie”, które właśnie ulatuje')
	).toBeVisible();
	await expect(
		page.getByText(
			'Spokojna aplikacja do nauki mówienia dla najmłodszych. Dziecko dotyka obrazka, ciepły głos mówi „piesek” — a dziecko powtarza, kiedy samo zechce. Bez reklam, bez nagród, bez pośpiechu. Za darmo, na zawsze.'
		)
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Otwórz aplikację' })).toHaveAttribute(
		'href',
		'/app/pl'
	);
});

test('the English landing page introduces the product and opens the app', async ({ page }) => {
	await page.goto('/en');

	await expect(page.getByRole('heading', { level: 1, name: 'Mowlak' })).toHaveCount(1);
	await expect(
		page.getByAltText(
			'"mowlak" spoken in a speech bubble; beside it the "nie" ("not") of "niemowlak" drifts away'
		)
	).toBeVisible();
	await expect(
		page.getByText(
			'A calm speech-learning app for toddlers. Your child touches a picture, a warm voice says "piesek" (dog) — and your child repeats when they feel like it. No ads, no rewards, no rush. Free, forever.'
		)
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Open the app' })).toHaveAttribute('href', '/app/en');
});

// The page argues for doing less, so the four promises it makes are the
// argument. Losing one silently would leave the section still reading like
// a complete thought.
test('the landing keeps all four promises on the page', async ({ page }) => {
	await page.goto('/en');

	const pledges = page.getByRole('listitem');
	await expect(pledges).toHaveCount(4);
	await expect(pledges.first()).toHaveText(
		'One thing on screen. — Nothing blinks, nothing pops up, there is nothing to scroll.'
	);
});

// The interface is bilingual and the cards are not. A reader who arrived in
// English would otherwise find that out from the first card.
test('only the English landing says which language the cards teach', async ({ page }) => {
	await page.goto('/en');
	await expect(page.getByText('Mowlak teaches Polish first words.')).toBeVisible();

	await page.goto('/pl');
	await expect(page.getByText('Mowlak teaches Polish first words.')).toHaveCount(0);
});

test('each landing page names itself and its other language', async ({ page }) => {
	await page.goto('/pl');

	await expect(page).toHaveTitle('Mowlak — nauka mówienia dla najmłodszych');
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		'content',
		'Spokojna aplikacja do nauki mówienia dla najmłodszych. Bez reklam, bez nagród, bez pośpiechu. Za darmo, na zawsze.'
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', '/pl');
	await expect(page.locator('link[hreflang="pl"]')).toHaveAttribute('href', '/pl');
	await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', '/en');
	// The root has no language of its own, which is exactly what x-default
	// is for: it reads the browser's and forwards.
	await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', '/');

	await page.goto('/en');

	await expect(page).toHaveTitle('Mowlak — a calm speech-learning app for toddlers');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', '/en');
	await expect(page.locator('link[hreflang="pl"]')).toHaveAttribute('href', '/pl');
});

test('the landing links to the source it promises is open', async ({ page }) => {
	await page.goto('/pl');

	await expect(page.getByRole('link', { name: 'Kod źródłowy' })).toHaveAttribute(
		'href',
		'https://github.com/mowlak/mowlak'
	);
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
