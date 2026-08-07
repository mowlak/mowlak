// Each case builds a throwaway pack tree in a temporary directory and breaks
// exactly one thing, so a rule that stops working shows up as the one test
// that no longer fails.
//
// These tests sit beside the script rather than under src/ because they read
// and write real files: the rules they cover are about the file system, and a
// stubbed one would not test them.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateContent } from './validate-content.mjs';

const PACK_PATH = 'pl/animals.json';

/** @type {string[]} */
const roots = [];

afterEach(() => {
	while (roots.length > 0) rmSync(String(roots.pop()), { recursive: true, force: true });
});

/**
 * @param {string} id
 * @returns {Record<string, any>}
 */
function card(id) {
	return {
		id,
		word: `word-${id}`,
		image: `images/animals/${id}.svg`,
		levels: [
			{ kind: 'sound', text: 'aa', audio: `pl/audio/animals/${id}.sound.m4a` },
			{ kind: 'word', text: `word-${id}`, audio: `pl/audio/animals/${id}.word.m4a` }
		],
		source: 'a published work'
	};
}

/**
 * @param {Record<string, any>[]} cards
 * @returns {Record<string, any>}
 */
function pack(...cards) {
	return {
		schema_version: 0,
		language: 'pl',
		category: 'animals',
		cards: cards.length > 0 ? cards : [card('dog'), card('cat')]
	};
}

/**
 * @param {Record<string, any>} value
 * @returns {string[]}
 */
function assetsOf(value) {
	return value.cards.flatMap((/** @type {Record<string, any>} */ entry) => [
		entry.image,
		...entry.levels.map((/** @type {Record<string, any>} */ level) => level.audio)
	]);
}

/**
 * Writes the pack and the given asset files, and returns the pack root.
 *
 * @param {Record<string, any>} value
 * @param {string[]} files
 * @param {string} packPath
 * @returns {string}
 */
function build(value, files = assetsOf(value), packPath = PACK_PATH) {
	const root = mkdtempSync(join(tmpdir(), 'mowlak-content-'));
	roots.push(root);
	for (const file of [...files, packPath]) {
		mkdirSync(dirname(join(root, file)), { recursive: true });
	}
	for (const file of files) writeFileSync(join(root, file), '');
	writeFileSync(join(root, packPath), JSON.stringify(value));
	return root;
}

describe('validateContent', () => {
	it('accepts a whole pack and counts what it read', () => {
		const report = validateContent(build(pack()));

		expect(report.violations).toEqual([]);
		expect(report.packs).toEqual([PACK_PATH]);
		expect(report.cards).toBe(2);
		expect(report.assets).toHaveLength(6);
	});

	it('rejects a card with no named source', () => {
		const value = pack();
		delete value.cards[0].source;

		expect(validateContent(build(value)).violations).toEqual([
			'pl/animals.json: card "dog": "source" must be a non-empty string'
		]);
	});

	it('rejects an image path that points at nothing', () => {
		const value = pack();
		const files = assetsOf(value).filter((file) => file !== 'images/animals/dog.svg');

		expect(validateContent(build(value, files)).violations).toEqual([
			'pl/animals.json: card "dog": image "images/animals/dog.svg" does not exist'
		]);
	});

	it('rejects an audio path that points at nothing', () => {
		const value = pack();
		const missing = 'pl/audio/animals/cat.word.m4a';
		const files = assetsOf(value).filter((file) => file !== missing);

		expect(validateContent(build(value, files)).violations).toEqual([
			`pl/animals.json: card "cat": level 2: audio "${missing}" does not exist`
		]);
	});

	it('rejects a path that reaches outside the pack root', () => {
		const value = pack();
		value.cards[0].image = '../secrets/dog.svg';
		const files = assetsOf(pack()).filter((file) => file !== 'images/animals/dog.svg');

		expect(validateContent(build(value, files)).violations).toEqual([
			'pl/animals.json: card "dog": image "../secrets/dog.svg" must be a relative path inside the pack root'
		]);
	});

	it('rejects an asset no card refers to', () => {
		const value = pack();
		const files = [...assetsOf(value), 'images/animals/leftover.svg'];

		expect(validateContent(build(value, files)).violations).toEqual([
			'images/animals/leftover.svg: orphan asset, no card refers to it'
		]);
	});

	it('rejects a duplicate id', () => {
		expect(validateContent(build(pack(card('dog'), card('dog')))).violations).toEqual([
			'pl/animals.json: card "dog": duplicate id'
		]);
	});

	it('rejects an id that is not a plain lowercase slug', () => {
		expect(validateContent(build(pack(card('Dog')))).violations).toEqual([
			'pl/animals.json: card "Dog": "id" must match ^[a-z][a-z0-9-]*$'
		]);
	});

	it('rejects levels given in the wrong order', () => {
		const value = pack();
		value.cards[0].levels.reverse();

		expect(validateContent(build(value)).violations).toEqual([
			'pl/animals.json: card "dog": level 1: kind must be "sound", found "word"',
			'pl/animals.json: card "dog": level 2: kind must be "word", found "sound"'
		]);
	});

	it('rejects a card with only one level', () => {
		const value = pack();
		value.cards[0].levels.pop();

		expect(validateContent(build(value, assetsOf(pack()))).violations).toEqual([
			'pl/animals.json: card "dog": "levels" must hold exactly 2 levels',
			'pl/audio/animals/dog.sound.m4a: orphan asset, no card refers to it',
			'pl/audio/animals/dog.word.m4a: orphan asset, no card refers to it'
		]);
	});

	it('rejects a misspelled card key instead of ignoring it', () => {
		const value = pack();
		value.cards[0].varaints = ['hau'];

		expect(validateContent(build(value)).violations).toEqual([
			'pl/animals.json: card "dog": unknown key "varaints"'
		]);
	});

	it('rejects a misspelled pack key instead of ignoring it', () => {
		expect(validateContent(build({ ...pack(), schema: 0 })).violations).toEqual([
			'pl/animals.json: unknown key "schema"'
		]);
	});

	it('rejects empty variants, which would read as a card that has none', () => {
		const value = pack();
		value.cards[0].variants = [];

		expect(validateContent(build(value)).violations).toEqual([
			'pl/animals.json: card "dog": "variants" must be a non-empty array of non-empty strings'
		]);
	});

	it('rejects another schema version', () => {
		expect(validateContent(build({ ...pack(), schema_version: 1 })).violations).toEqual([
			'pl/animals.json: schema_version must be 0, found 1'
		]);
	});

	it('rejects a pack whose language or category contradicts its path', () => {
		const value = { ...pack(), language: 'en', category: 'birds' };

		expect(validateContent(build(value)).violations).toEqual([
			'pl/animals.json: language "en" does not match the directory "pl"',
			'pl/animals.json: category "birds" does not match the file name "animals"'
		]);
	});

	it('rejects a pack filed outside a language directory', () => {
		const value = pack();

		expect(validateContent(build(value, assetsOf(value), 'animals.json')).violations).toContain(
			'animals.json: a pack must live at <language>/<category>.json'
		);
	});

	it('rejects a pack that is not valid JSON', () => {
		const root = build(pack());
		writeFileSync(join(root, PACK_PATH), '{ nope');

		expect(validateContent(root).violations[0]).toMatch(/^pl\/animals\.json: not valid JSON/);
	});
});
