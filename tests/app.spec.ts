import { expect, test } from '@playwright/test';

test('the app renders under its own path', async ({ page }) => {
	await page.goto('/app/pl');

	await expect(page.getByRole('heading', { level: 1, name: 'Mowlak' })).toBeVisible();
	await expect(page.getByText('Wkrótce.')).toBeVisible();
});
