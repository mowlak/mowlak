// Installing the app, and using it with no network at all. Both are the
// same promise to a parent: the cards work in a car, on a plane, in a
// basement, on a phone with no data left — a child does not understand a
// connection failing, and the app must never have to explain one.

import { expect, test, type Page } from '@playwright/test';
import { PICTURE, expectState, openPlayer, surface } from './card-surface';

/** Long enough for a page that registers a worker to have registered it. */
const REGISTRATION_GRACE = 2000;

test('the manifest belongs to the app and not to the site around it', async ({ page }) => {
	await page.goto('/app/pl');
	await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);

	// The landing is a web page: something to read and link to, with nothing
	// to install. Only the thing a parent hands to a child is installable.
	await page.goto('/pl');
	await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
});

test('the start_url is a real page that picks a language', async ({ request }) => {
	// An installed app is launched at /app/, with no language in the URL,
	// which is a request a static host can only answer with a file that is
	// really there. Read as a document rather than driven, because the
	// redirect fires before first paint and racing it proves nothing.
	const response = await request.get('/app/');
	expect(response.status()).toBe(200);

	const html = await response.text();
	expect(html).toContain('href="/app/pl"');
	expect(html).toContain('href="/app/en"');
	expect(html).toContain('location.replace');
});

test('the start_url sits inside the scope by string prefix', async ({ request }) => {
	const manifest = await (await request.get('/manifest.webmanifest')).json();

	// The rule the trailing slashes exist for, read first because it is the
	// one that matters: a start_url is inside its scope only if it begins
	// with the scope as a string. "/app" reads as a sibling of "/app/"
	// rather than as a member of it, and a browser then refuses to install
	// the app without ever saying so.
	expect(
		manifest.start_url.startsWith(manifest.scope),
		`start_url ${manifest.start_url} is outside scope ${manifest.scope}`
	).toBe(true);

	expect(manifest.scope).toBe('/app/');
	expect(manifest.start_url).toBe('/app/');

	// And the entry it names answers.
	expect((await request.get(manifest.start_url)).status()).toBe(200);
});

test('the site around the app installs nothing', async ({ page, baseURL }) => {
	await page.goto('/pl');
	await page.waitForLoadState('load');
	// Absence is only worth reading once the page has had the time a
	// registration takes, so the wait comes before the reading and not after.
	await page.waitForTimeout(REGISTRATION_GRACE);

	expect(await installed(page)).toEqual([]);
	expect(await page.evaluate(() => navigator.serviceWorker.controller === null)).toBe(true);

	// Guards the guard: the same reading finds the worker once the app itself
	// has been opened, so the empty answer above is a page that never asked
	// for one rather than a reading that cannot see them.
	await page.goto('/app/pl');
	await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));

	expect(await installed(page)).toEqual([`${baseURL}/app/`]);
});

test('one online visit is enough to use the app with no network', async ({
	page,
	context,
	baseURL
}) => {
	const origin = new URL(baseURL!).origin;
	const requested: string[] = [];
	page.on('request', (request) => requested.push(request.url()));

	const root = await openPlayer(page);
	// Resolves on an active worker, and the worker only becomes active once
	// it has taken the whole app: the pages, the code, the pictures and every
	// clip of the voice.
	await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));

	await context.setOffline(true);
	await page.reload();

	expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
	await expect(surface(page)).toHaveAttribute('data-state', 'idle');
	await expect(root).toHaveAttribute('data-card', 'dog');

	// The picture is the whole app to a child, and it has to speak: a card
	// that draws but stays silent offline is the failure this test exists
	// for, so the clip is heard to its own end.
	await page.click(PICTURE);
	await expect(root).toHaveAttribute('data-state', 'playing');
	await expectState(root, 'played');

	// Guards the guard, and the promise that nothing ever leaves the origin:
	// a worker that reached off it would be the first byte this app sent
	// anywhere.
	expect(requested.length).toBeGreaterThan(0);
	expect(requested.filter((url) => !url.startsWith(`${origin}/`))).toEqual([]);
});

/** The scopes this browsing context currently holds a worker for. */
async function installed(page: Page): Promise<string[]> {
	return page.evaluate(async () =>
		(await navigator.serviceWorker.getRegistrations()).map((one) => one.scope)
	);
}
