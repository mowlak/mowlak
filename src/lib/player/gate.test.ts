import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GATE_HOLD_MS, createHold } from './gate';

describe('the gate threshold', () => {
	// Pinned rather than merely used: the number is the barrier itself, and a
	// well-meant trim to make the gate "feel snappier" would quietly hand the
	// parent panel to any child who leans on the screen.
	it('is three seconds of unbroken hold', () => {
		expect(GATE_HOLD_MS).toBe(3000);
	});
});

describe('a hold', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('opens nothing until the threshold is reached', () => {
		const open = vi.fn();
		createHold(open).press();

		vi.advanceTimersByTime(GATE_HOLD_MS - 1);

		expect(open).not.toHaveBeenCalled();
	});

	it('opens once the threshold is reached', () => {
		const open = vi.fn();
		createHold(open).press();

		vi.advanceTimersByTime(GATE_HOLD_MS);

		expect(open).toHaveBeenCalledTimes(1);
	});

	it('is cancelled by letting go early, however late', () => {
		const open = vi.fn();
		const hold = createHold(open);

		hold.press();
		vi.advanceTimersByTime(GATE_HOLD_MS - 1);
		hold.release();
		vi.advanceTimersByTime(GATE_HOLD_MS);

		expect(open).not.toHaveBeenCalled();
	});

	it('ignores a tap, which is all a child produces', () => {
		const open = vi.fn();
		const hold = createHold(open);

		hold.press();
		vi.advanceTimersByTime(80);
		hold.release();
		vi.runAllTimers();

		expect(open).not.toHaveBeenCalled();
	});

	it('is not restarted or doubled by pressing again mid-hold', () => {
		const open = vi.fn();
		const hold = createHold(open);

		hold.press();
		vi.advanceTimersByTime(GATE_HOLD_MS / 2);
		hold.press();
		vi.advanceTimersByTime(GATE_HOLD_MS / 2);

		expect(open).toHaveBeenCalledTimes(1);
	});

	it('survives a release with no hold running', () => {
		const open = vi.fn();

		expect(() => createHold(open).release()).not.toThrow();
		vi.runAllTimers();
		expect(open).not.toHaveBeenCalled();
	});

	it('can be held again after one has opened', () => {
		const open = vi.fn();
		const hold = createHold(open);

		hold.press();
		vi.advanceTimersByTime(GATE_HOLD_MS);
		hold.press();
		vi.advanceTimersByTime(GATE_HOLD_MS);

		expect(open).toHaveBeenCalledTimes(2);
	});
});
