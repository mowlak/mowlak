// The card screen has three resting positions, and the calm layer is nothing
// more than the rule about how it moves between them. That rule lives here,
// away from the DOM and the audio element, because every refusal below is a
// promise made to a child who cannot yet be told why the screen went quiet.

/**
 * What the surface is doing. It is published as `data-state` on the surface
 * root: the styling hook, and the signal the browser tests wait on instead of
 * guessing how long a clip lasts.
 */
export type PlayerState = 'idle' | 'playing' | 'played';

export interface Player {
	/** Position in the pack's own card order. */
	readonly index: number;
	readonly state: PlayerState;
	/**
	 * Whether this card has finished a playback at least once, which is when
	 * the advance control appears. Tracked apart from `state` because
	 * replaying a card returns it to `playing`, and a control that vanished
	 * under the hand already reaching for it would be its own small betrayal.
	 */
	readonly revealed: boolean;
}

/** The first card of a pack: silent, with nothing else on the screen. */
export const FIRST_CARD: Player = { index: 0, state: 'idle', revealed: false };

/**
 * Starts playback. A card already playing is handed back untouched, and that
 * refusal is the audio lock itself: no barrage of taps can restart, queue or
 * stack the voice a child is in the middle of listening to.
 */
export function play(player: Player): Player {
	if (player.state === 'playing') return player;

	return { ...player, state: 'playing' };
}

/** The clip reached its end, which is the only thing that opens the lock. */
export function complete(player: Player): Player {
	if (player.state !== 'playing') return player;

	return { ...player, state: 'played', revealed: true };
}

/**
 * The clip could not be played. The lock opens and the card returns to where
 * it stood, because a missing or unplayable file is a content fault and must
 * never leave a child holding a screen that has stopped answering.
 */
export function fail(player: Player): Player {
	if (player.state !== 'playing') return player;

	return { ...player, state: player.revealed ? 'played' : 'idle' };
}

/**
 * Moves to the next card, wrapping past the last one. Only a card that has
 * been heard through can be left, and the pack has no end: there is no finish
 * line to chase and no reward for reaching one.
 */
export function advance(player: Player, cardCount: number): Player {
	if (player.state !== 'played' || cardCount < 1) return player;

	return { index: (player.index + 1) % cardCount, state: 'idle', revealed: false };
}
