// The calm layer, guard by guard. Each test below is one rule the child
// surface promises to keep, and the rules are the product: an app a parent
// opens with a toddler is only calm if nothing on it can be made to react.

import { expect, test, type CDPSession, type Page } from '@playwright/test';
import {
	ADVANCE,
	AUDIO,
	CHILD_ACTIONS,
	GATE,
	PANEL,
	PICTURE,
	audioSource,
	countOf,
	expectState,
	firedAt,
	holdGate,
	names,
	openPlayer,
	playThrough,
	readAudio,
	rewinds,
	watchAudio
} from './card-surface';

test('the audio lock refuses to restart or stack the voice mid-clip', async ({ page }) => {
	const root = await openPlayer(page);
	await watchAudio(page);

	await page.click(PICTURE);
	await expect(root).toHaveAttribute('data-state', 'playing');
	for (let touch = 0; touch < 3; touch += 1) await page.click(PICTURE);

	await expectState(root, 'played');

	const probe = await readAudio(page);
	expect(countOf(probe, 'play')).toBe(1);
	expect(countOf(probe, 'ended')).toBe(1);
	expect(countOf(probe, 'pause')).toBe(1);
	// A restart would drop the clip back to its beginning, so the play count
	// alone is not enough: the clock must only ever have run forward.
	expect(rewinds(probe.times)).toEqual([]);
});

test('the advance control is deaf while a card is replaying', async ({ page }) => {
	const root = await openPlayer(page);
	await playThrough(page, root);
	const heard = await root.getAttribute('data-card');

	await page.click(PICTURE);
	await expect(root).toHaveAttribute('data-state', 'playing');
	// Delivered straight to the control rather than clicked, so the refusal
	// under test is the handler's own and not merely the disabled attribute.
	await page.locator(ADVANCE).dispatchEvent('click');
	expect(await root.getAttribute('data-card')).toBe(heard);

	await expectState(root, 'played');
	await page.click(ADVANCE);
	expect(await root.getAttribute('data-card')).not.toBe(heard);
});

test('the advance control does not exist until a card has been heard', async ({ page }) => {
	const root = await openPlayer(page);
	await expect(page.locator(ADVANCE)).toHaveCount(0);

	await page.click(PICTURE);
	await expect(root).toHaveAttribute('data-state', 'playing');
	// Both facts read in one pass, so the pair cannot straddle the moment the
	// clip ends and report a state that never existed together.
	expect(
		await root.evaluate(
			(node, selector) => ({
				state: node.getAttribute('data-state'),
				advances: node.querySelectorAll(selector).length
			}),
			ADVANCE
		)
	).toEqual({ state: 'playing', advances: 0 });

	await expectState(root, 'played');
	await expect(page.locator(ADVANCE)).toHaveCount(1);
});

test.describe('on a touchscreen', () => {
	test.use({ hasTouch: true });

	/** A real touch gesture, dispatched by the browser rather than the page. */
	async function swipe(
		cdp: CDPSession,
		from: { x: number; y: number },
		to: { x: number; y: number }
	): Promise<void> {
		const steps = 8;
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [{ x: from.x, y: from.y }]
		});
		for (let step = 1; step <= steps; step += 1) {
			await cdp.send('Input.dispatchTouchEvent', {
				type: 'touchMove',
				touchPoints: [
					{
						x: from.x + ((to.x - from.x) * step) / steps,
						y: from.y + ((to.y - from.y) * step) / steps
					}
				]
			});
		}
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	}

	test('swiping the card does nothing at all', async ({ page }) => {
		const root = await openPlayer(page);
		const opened = await root.getAttribute('data-card');

		const box = await page.locator(PICTURE).boundingBox();
		if (!box) throw new Error('the card is not on screen');
		const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		const cdp = await page.context().newCDPSession(page);

		await swipe(cdp, middle, { x: box.x + 8, y: middle.y });
		await swipe(cdp, middle, { x: box.x + box.width - 8, y: middle.y });
		await swipe(cdp, middle, { x: middle.x, y: box.y + 8 });
		await swipe(cdp, middle, { x: middle.x, y: box.y + box.height - 8 });

		expect(await root.getAttribute('data-card')).toBe(opened);
		expect(await page.evaluate(() => [window.scrollX, window.scrollY])).toEqual([0, 0]);
	});
});

test('the parent gate opens only for a long, deliberate hold', async ({ page }) => {
	await openPlayer(page);
	const panel = page.locator(PANEL);

	// A tap is what a child produces, and it is answered with nothing: no
	// panel, and no hint that holding would do anything either.
	await page.click(GATE);
	await expect(panel).toHaveCount(0);

	await holdGate(page, 1500);
	await expect(panel).toHaveCount(0);

	await holdGate(page, 3400);
	await expect(panel).toBeVisible();
});

test('one action is reachable on the screen at a time', async ({ page }) => {
	const root = await openPlayer(page);
	// The gate carries no data-child-action, because its tap does nothing and
	// only a parent's long hold reaches anything at all.
	const actions = page.locator(`${CHILD_ACTIONS}:not([disabled]):visible`);

	await expect(actions).toHaveCount(1);

	await page.click(PICTURE);
	await expect(root).toHaveAttribute('data-state', 'playing');
	await expect(actions).toHaveCount(1);

	await expectState(root, 'played');
	await expect(actions).toHaveCount(2);
});

test('playback runs to its end whatever the child does', async ({ page }) => {
	const root = await openPlayer(page);
	await watchAudio(page);

	await page.click(PICTURE);
	await expect(root).toHaveAttribute('data-state', 'playing');
	for (let touch = 0; touch < 4; touch += 1) await page.click(PICTURE);

	// Read before the clip can have finished: a pause seen here is one the
	// barrage caused, and the child would have heard the voice cut off.
	expect(names(await readAudio(page))).toEqual(['play']);

	await expectState(root, 'played');
	const probe = await readAudio(page);
	// A media element is paused as part of being ended, so one pause belongs
	// here — but only in that position, and only with the clip behind it.
	expect(names(probe)).toEqual(['play', 'pause', 'ended']);
	expect(firedAt(probe, 'pause')).toBeGreaterThan(probe.duration - 0.05);
});

test('a whole session never leaves the origin', async ({ page, baseURL }) => {
	const origin = new URL(baseURL!).origin;
	const requested: string[] = [];
	page.on('request', (request) => requested.push(request.url()));

	const root = await openPlayer(page);
	await playThrough(page, root);

	await holdGate(page, 3400);
	await page.getByLabel('słowa (pies)').check();
	await page.getByRole('button', { name: 'Zamknij' }).click();
	await expect(page.locator(PANEL)).toHaveCount(0);

	await playThrough(page, root);

	// Guards the guard: an empty list would pass the check below while
	// proving nothing about a page that had loaded nothing.
	expect(requested.length).toBeGreaterThan(0);
	expect(requested.filter((url) => !url.startsWith(`${origin}/`))).toEqual([]);
});

test('the pack has no end: the last card leads back to the first', async ({ page }) => {
	// Twelve clips heard through end to end, because there is no way to reach
	// the last card without hearing every card before it.
	test.slow();

	const root = await openPlayer(page);
	const cards: (string | null)[] = [await root.getAttribute('data-card')];

	for (let step = 0; step < 12; step += 1) {
		await playThrough(page, root);
		await page.click(ADVANCE);
		await expect(root).toHaveAttribute('data-state', 'idle');
		cards.push(await root.getAttribute('data-card'));
	}

	expect(new Set(cards.slice(0, 12)).size).toBe(12);
	expect(cards[12]).toBe(cards[0]);
});

test('the parent chooses which level the picture speaks', async ({ page }) => {
	const root = await openPlayer(page);

	await page.click(PICTURE);
	await expect(root).toHaveAttribute('data-state', 'playing');
	expect(await audioSource(page)).toContain('.onomatopoeia.');
	await expectState(root, 'played');

	await holdGate(page, 3400);
	await page.getByLabel('słowa (pies)').check();
	await page.getByRole('button', { name: 'Zamknij' }).click();
	await expect(page.locator(PANEL)).toHaveCount(0);

	await page.click(PICTURE);
	await expect(root).toHaveAttribute('data-state', 'playing');
	expect(await audioSource(page)).toContain('.word.');

	// One key, holding one preference, and nothing else anywhere in storage.
	expect(
		await page.evaluate(() => ({
			keys: Object.keys(localStorage),
			stored: localStorage.getItem('mowlak:settings')
		}))
	).toEqual({ keys: ['mowlak:settings'], stored: '{"level":"word"}' });
});

test('a clip that will not play leaves the card usable', async ({ page }) => {
	const root = await openPlayer(page);

	// A pack can rot: a clip goes missing, or a build ships a file the
	// browser cannot decode. Whatever else that is, it must not be a screen
	// that has stopped answering a child.
	await breakAudio(page);
	await page.click(PICTURE);
	await expectState(root, 'idle');

	await expect(page.locator(ADVANCE)).toHaveCount(0);
	await expect(page.locator(`${CHILD_ACTIONS}:not([disabled]):visible`)).toHaveCount(1);
});

test('an abandoned clip is not mistaken for a broken one', async ({ page }) => {
	const root = await openPlayer(page);
	await watchAudio(page);

	await page.click(PICTURE);
	await expect(root).toHaveAttribute('data-state', 'playing');

	// Pointing the shared element at the next card cancels whatever the last
	// one was still fetching, and the browser announces that cancellation
	// with the same event a broken file uses. Read as a failure it would cut
	// the voice that is speaking now short, which is the one thing the card
	// screen must never do.
	await page.evaluate((selector) => {
		const audio = document.querySelector(selector);
		if (!audio) throw new Error('the player has no audio element');

		Object.defineProperty(audio, 'error', {
			configurable: true,
			get: () => ({ code: MediaError.MEDIA_ERR_ABORTED })
		});
		audio.dispatchEvent(new Event('error'));
	}, AUDIO);

	await expectState(root, 'played');
	expect(names(await readAudio(page))).toEqual(['play', 'pause', 'ended']);
});

/** Points the shared element at nothing, whatever the player asks it to play. */
async function breakAudio(page: Page): Promise<void> {
	await page.evaluate((selector) => {
		const audio = document.querySelector(selector);
		if (!audio) throw new Error('the player has no audio element');

		const src = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
		Object.defineProperty(audio, 'src', {
			set(this: HTMLAudioElement) {
				src?.set?.call(this, '/content/pl/audio/animals/no-such-clip.m4a');
			},
			get(this: HTMLAudioElement) {
				return src?.get?.call(this) ?? '';
			}
		});
	}, AUDIO);
}
