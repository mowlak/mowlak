import { describe, expect, it, vi } from 'vitest';
import { ContentError, loadPack } from './content';

function samplePack() {
	return {
		schema_version: 0,
		language: 'pl',
		category: 'animals',
		cards: [
			{
				id: 'dog',
				word: 'pies',
				image: 'images/animals/dog.svg',
				levels: [
					{
						kind: 'onomatopoeia',
						text: 'hau hau',
						audio: 'pl/audio/animals/dog.onomatopoeia.m4a'
					},
					{ kind: 'word', text: 'pies', audio: 'pl/audio/animals/dog.word.m4a' }
				],
				source: 'a published work',
				variants: ['hau']
			}
		]
	};
}

function serving(body: unknown, init?: ResponseInit) {
	return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), init));
}

describe('loadPack', () => {
	it('reads a pack from the served content root', async () => {
		const fetchStub = serving(samplePack());

		const pack = await loadPack(fetchStub, 'pl', 'animals');

		expect(fetchStub).toHaveBeenCalledWith('/content/pl/animals.json');
		expect(pack.category).toBe('animals');
		expect(pack.cards).toHaveLength(1);
		expect(pack.cards[0].levels[0].text).toBe('hau hau');
		expect(pack.cards[0].levels[1].kind).toBe('word');
		expect(pack.cards[0].variants).toEqual(['hau']);
	});

	it('refuses a pack written to another schema version', async () => {
		const fetchStub = serving({ ...samplePack(), schema_version: 1 });

		await expect(loadPack(fetchStub, 'pl', 'animals')).rejects.toThrow(ContentError);
		await expect(loadPack(fetchStub, 'pl', 'animals')).rejects.toThrow(/schema_version/);
	});

	it('refuses a pack that is not there', async () => {
		const fetchStub = serving({}, { status: 404 });

		await expect(loadPack(fetchStub, 'pl', 'birds')).rejects.toThrow(/responded 404/);
	});

	it('refuses a pack that answers for another category', async () => {
		const fetchStub = serving(samplePack());

		await expect(loadPack(fetchStub, 'pl', 'birds')).rejects.toThrow(/declares pl\/animals/);
	});

	it('refuses a card whose levels are out of order, so no child hears the word first', async () => {
		const pack = samplePack();
		pack.cards[0].levels.reverse();
		const fetchStub = serving(pack);

		await expect(loadPack(fetchStub, 'pl', 'animals')).rejects.toThrow(/onomatopoeia level/);
	});
});
