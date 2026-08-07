/**
 * How long the parent must hold the gate before the panel opens.
 *
 * The gate is a deliberate barrier rather than a hint: roughly three seconds
 * of unbroken contact is far longer than a toddler's touch survives, and
 * short enough that a parent who knows it is there is not left waiting. The
 * progress ring is driven from this same number, so the ring can never
 * finish early or run on past the opening.
 */
export const GATE_HOLD_MS = 3000;

export interface Hold {
	/** Begins a hold. One already running continues undisturbed. */
	press(): void;
	/** Abandons a hold. Safe to call when none is running. */
	release(): void;
}

/**
 * Calls `open` only after `holdMs` of unbroken hold. A tap — the one gesture
 * a child reliably produces — presses and lets go long before that and so
 * reaches nothing, which is the whole design: the gate offers no hint and no
 * reward for pressing it.
 */
export function createHold(open: () => void, holdMs: number = GATE_HOLD_MS): Hold {
	let timer: ReturnType<typeof setTimeout> | undefined;

	return {
		press() {
			if (timer !== undefined) return;

			timer = setTimeout(() => {
				timer = undefined;
				open();
			}, holdMs);
		},

		release() {
			if (timer === undefined) return;

			clearTimeout(timer);
			timer = undefined;
		}
	};
}
