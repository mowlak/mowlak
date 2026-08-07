import { describe, expect, it } from 'vitest';
import { FIRST_CARD, advance, complete, fail, play, type Player } from './machine';

/** A card mid-clip, which is the state every lock below is about. */
function playing(over: Partial<Player> = {}): Player {
	return { index: 0, state: 'playing', revealed: false, ...over };
}

/** A card that has been heard through, so its advance control is there. */
function played(over: Partial<Player> = {}): Player {
	return { index: 0, state: 'played', revealed: true, ...over };
}

describe('a card', () => {
	it('starts silent, on the first card, with nothing else on screen', () => {
		expect(FIRST_CARD).toEqual({ index: 0, state: 'idle', revealed: false });
	});

	it('plays when touched', () => {
		expect(play(FIRST_CARD).state).toBe('playing');
	});

	it('shows its advance control once a clip has run to the end', () => {
		const heard = complete(play(FIRST_CARD));

		expect(heard.state).toBe('played');
		expect(heard.revealed).toBe(true);
	});

	it('plays again from the state it was left in', () => {
		expect(play(played()).state).toBe('playing');
	});

	it('keeps its advance control through a replay', () => {
		expect(play(played()).revealed).toBe(true);
	});
});

describe('the audio lock', () => {
	it('refuses to restart a card that is already speaking', () => {
		const mid = playing();

		expect(play(mid)).toBe(mid);
	});

	it('survives a barrage, leaving one playback and no queue', () => {
		let mid = playing();
		for (let touch = 0; touch < 20; touch += 1) mid = play(mid);

		expect(mid).toEqual(playing());
	});

	it('refuses to leave a card mid-clip', () => {
		const mid = playing({ revealed: true });

		expect(advance(mid, 12)).toBe(mid);
	});

	it('opens only when the clip reaches its end', () => {
		expect(complete(playing()).state).toBe('played');
	});

	it('ignores an end that arrives when nothing is playing', () => {
		const resting = played();

		expect(complete(resting)).toBe(resting);
	});
});

describe('a clip that cannot be played', () => {
	it('returns an untouched card to silence rather than stranding it', () => {
		expect(fail(playing())).toEqual(FIRST_CARD);
	});

	it('returns a replayed card to where it was, advance control and all', () => {
		expect(fail(playing({ revealed: true }))).toEqual(played());
	});

	it('is ignored when nothing was playing', () => {
		const resting = played();

		expect(fail(resting)).toBe(resting);
	});
});

describe('advancing', () => {
	it('needs a card that has been heard through', () => {
		expect(advance(FIRST_CARD, 12)).toBe(FIRST_CARD);
	});

	it('opens the next card silent, with its advance control gone', () => {
		expect(advance(played(), 12)).toEqual({ index: 1, state: 'idle', revealed: false });
	});

	it('wraps past the last card, so the pack has no end to reach', () => {
		expect(advance(played({ index: 11 }), 12).index).toBe(0);
	});

	it('walks a whole pack and comes back to where it started', () => {
		const cardCount = 12;
		let card = FIRST_CARD;
		const seen: number[] = [card.index];

		for (let step = 0; step < cardCount; step += 1) {
			card = advance(complete(play(card)), cardCount);
			seen.push(card.index);
		}

		expect(seen.slice(0, cardCount)).toEqual([...Array(cardCount).keys()]);
		expect(seen[cardCount]).toBe(0);
	});

	it('stays put rather than dividing by an empty pack', () => {
		const resting = played();

		expect(advance(resting, 0)).toBe(resting);
	});
});
