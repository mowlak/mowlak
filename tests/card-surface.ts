// The card screen publishes `data-state` and `data-card` on its root, and
// tags every control a child can reach with `data-child-action`. Those
// attributes are a contract rather than a convenience: waiting on a state
// change is exact, where waiting out a clip would only ever be a guess, and
// a suite that guessed at audio would go green on a browser playing silence.

import { expect, type Locator, type Page } from '@playwright/test';

export const SURFACE = '[data-card]';
export const PICTURE = '[data-child-action="picture"]';
export const ADVANCE = '[data-child-action="advance"]';
/** Every child-reachable control, and nothing else — the gate is not one. */
export const CHILD_ACTIONS = '[data-child-action]';
export const GATE = '[data-gate]';
export const AUDIO = '[data-player-audio]';
export const PANEL = '[role="dialog"]';

/** Room for a placeholder clip several times over, and no more. */
export const CLIP_TIMEOUT = 15_000;

export function surface(page: Page): Locator {
	return page.locator(SURFACE);
}

/** Opens the app and waits for the first card to be sitting there, silent. */
export async function openPlayer(page: Page): Promise<Locator> {
	await page.goto('/app/pl');
	const root = surface(page);
	await expect(root).toHaveAttribute('data-state', 'idle');

	return root;
}

export async function expectState(root: Locator, state: string): Promise<void> {
	await expect(root).toHaveAttribute('data-state', state, { timeout: CLIP_TIMEOUT });
}

/** Plays the current card and waits for the clip to reach its own end. */
export async function playThrough(page: Page, root: Locator): Promise<void> {
	await page.click(PICTURE);
	await expectState(root, 'played');
}

/** Presses the parent gate for exactly `ms`, then lets go. */
export async function holdGate(page: Page, ms: number): Promise<void> {
	const box = await page.locator(GATE).boundingBox();
	if (!box) throw new Error('the parent gate is not on screen');

	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	// The length of the hold is the thing under test, so it is timed rather
	// than waited on.
	await page.waitForTimeout(ms);
	await page.mouse.up();
}

export interface AudioEvent {
	name: string;
	/** How far into the clip the element had reached when it fired. */
	at: number;
}

export interface AudioProbe {
	/** The watched events, in the order the element fired them. */
	events: AudioEvent[];
	/** `currentTime` at each of those, and at every clock tick between them. */
	times: number[];
	/** The current clip's own length, or NaN before the browser knows it. */
	duration: number;
}

type ProbedAudio = HTMLAudioElement & { mowlakProbe?: AudioEvent[] };

/** Starts recording what the one shared audio element is asked to do. */
export async function watchAudio(page: Page): Promise<void> {
	await page.evaluate((selector) => {
		const audio = document.querySelector(selector) as ProbedAudio | null;
		if (!audio) throw new Error('the player has no audio element');

		const recorded: AudioEvent[] = [];
		audio.mowlakProbe = recorded;

		for (const name of ['play', 'pause', 'ended']) {
			audio.addEventListener(name, () => recorded.push({ name, at: audio.currentTime }));
		}
		// The clock ticks several times a second, which is often enough to
		// catch a clip quietly dropped back to its own beginning.
		audio.addEventListener('timeupdate', () =>
			recorded.push({ name: 'tick', at: audio.currentTime })
		);
	}, AUDIO);
}

export async function readAudio(page: Page): Promise<AudioProbe> {
	return page.evaluate((selector) => {
		const audio = document.querySelector(selector) as ProbedAudio | null;
		const recorded = audio?.mowlakProbe;
		if (!audio || !recorded) throw new Error('the audio probe was never attached');

		return {
			events: recorded.filter((event) => event.name !== 'tick'),
			times: recorded.map((event) => event.at),
			duration: audio.duration
		};
	}, AUDIO);
}

/** The events the element fired, named and in order. */
export function names(probe: AudioProbe): string[] {
	return probe.events.map((event) => event.name);
}

/** How many times the element fired `name`. */
export function countOf(probe: AudioProbe, name: string): number {
	return names(probe).filter((event) => event === name).length;
}

/** How far the clip had run the first time it fired `name`. */
export function firedAt(probe: AudioProbe, name: string): number {
	const event = probe.events.find((one) => one.name === name);
	if (!event) throw new Error(`the element never fired ${name}`);

	return event.at;
}

/** Every moment the clip was found further back than it had already been. */
export function rewinds(times: number[]): number[] {
	return times.filter((time, at) => at > 0 && time < times[at - 1]);
}

/** What the shared element was last pointed at. */
export async function audioSource(page: Page): Promise<string> {
	return (await page.locator(AUDIO).getAttribute('src')) ?? '';
}
