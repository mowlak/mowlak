import { expect, test } from '@playwright/test';

// A parent looking for this page, and an app store asking for its URL,
// both start from the landing footer.
const VARIANTS = [
	{
		lang: 'pl',
		link: 'Prywatność',
		heading: 'Prywatność',
		lede: 'Mowlak nie zbiera żadnych danych — ani o tobie, ani o dziecku.',
		title: 'Prywatność — Mowlak'
	},
	{
		lang: 'en',
		link: 'Privacy',
		heading: 'Privacy',
		lede: 'Mowlak collects no data — none about you, none about your child.',
		title: 'Privacy — Mowlak'
	}
];

for (const { lang, link, heading, lede, title } of VARIANTS) {
	test(`the ${lang} privacy page is one click from the landing and collects nothing`, async ({
		page
	}) => {
		await page.goto(`/${lang}`);
		await page.getByRole('link', { name: link }).click();
		await page.waitForURL(`**/${lang}/privacy`);

		await expect(page).toHaveTitle(title);
		await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
		// The headline sentence is the whole policy; everything under it only
		// says the same thing about one more thing the app does not do.
		await expect(page.getByText(lede)).toBeVisible();
		await expect(page.getByRole('listitem')).toHaveCount(4);
	});

	test(`the ${lang} privacy page leads back to the site`, async ({ page }) => {
		await page.goto(`/${lang}/privacy`);

		await page.getByRole('link', { name: 'Mowlak' }).click();
		await page.waitForURL(`**/${lang}`);
		await expect(page.getByRole('heading', { level: 1, name: 'Mowlak' })).toBeVisible();
	});
}

test('the privacy pages point at each other rather than at the landing', async ({ page }) => {
	await page.goto('/pl/privacy');

	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', '/pl/privacy');
	await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', '/en/privacy');
});
