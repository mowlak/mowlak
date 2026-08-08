#!/usr/bin/env node
// Checks the content packs against the schema described in
// content/README.md. The packs teach speech to children, so the rules are
// deliberately unforgiving: a card without a named published source, a path
// that points at nothing, an asset no card uses, or a misspelled key all
// fail the build rather than reaching a child as a silent gap.
//
// Run it as `npm run validate`; it takes an optional pack root argument so
// the tests can point it at a synthetic tree.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCHEMA_VERSION = 0;
const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const PACK_KEYS = ['schema_version', 'language', 'category', 'cards'];
const CARD_KEYS = ['id', 'word', 'image', 'levels', 'source', 'variants'];
const LEVEL_KEYS = ['kind', 'text', 'audio'];
// Position matters: the word level closes the list, and the onomatopoeia may
// only precede it. A card without a sound level is a card whose recording
// does not exist yet, not a different kind of card.
const LEVEL_SHAPES = [['word'], ['sound', 'word']];

const DEFAULT_ROOT = fileURLToPath(new URL('../content/packs', import.meta.url));

/**
 * @typedef {object} Report
 * @property {string[]} violations one line per problem; empty when valid
 * @property {string[]} packs pack files found, relative to the root
 * @property {number} cards total cards across those packs
 * @property {string[]} assets non-pack files found, relative to the root
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObject(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isText(value) {
	return typeof value === 'string' && value.trim() !== '';
}

/**
 * Every file under `root`, as paths relative to it with forward slashes.
 * Dot files are skipped so editor and platform droppings never register as
 * content.
 *
 * @param {string} root
 * @param {string} prefix
 * @returns {string[]}
 */
function walk(root, prefix = '') {
	/** @type {string[]} */
	const found = [];
	const entries = readdirSync(prefix === '' ? root : `${root}/${prefix}`, {
		withFileTypes: true
	});
	for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
		if (entry.name.startsWith('.')) continue;
		const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
		if (entry.isDirectory()) found.push(...walk(root, path));
		else found.push(path);
	}
	return found;
}

/**
 * @param {Record<string, unknown>} value
 * @param {string[]} allowed
 * @returns {string[]}
 */
function unknownKeys(value, allowed) {
	return Object.keys(value).filter((key) => !allowed.includes(key));
}

/**
 * A reference is usable only if it stays inside the pack root and names a
 * file that is really there. The check reads the walked file list rather
 * than the file system so it is case sensitive everywhere, including on the
 * case-insensitive file systems developers tend to use.
 *
 * @param {unknown} value
 * @param {Set<string>} present
 * @returns {'missing-value' | 'escapes' | 'dangling' | 'ok'}
 */
function checkReference(value, present) {
	if (!isText(value)) return 'missing-value';
	if (value.startsWith('/') || value.split('/').includes('..')) return 'escapes';
	return present.has(value) ? 'ok' : 'dangling';
}

/**
 * @param {string} packPath pack file, relative to the root
 * @param {string} text the file's contents
 * @param {Set<string>} present every file under the root
 * @param {Set<string>} referenced collects the files the cards point at
 * @param {string[]} violations collects the problems found
 * @returns {number} how many cards the pack declares
 */
function validatePack(packPath, text, present, referenced, violations) {
	/** @param {string} message */
	const fail = (message) => violations.push(`${packPath}: ${message}`);

	const segments = packPath.split('/');
	if (segments.length !== 2) {
		fail('a pack must live at <language>/<category>.json');
		return 0;
	}
	const [directory, fileName] = segments;
	const expectedCategory = fileName.replace(/\.json$/, '');

	/** @type {unknown} */
	let pack;
	try {
		pack = JSON.parse(text);
	} catch (error) {
		fail(`not valid JSON (${error instanceof Error ? error.message : String(error)})`);
		return 0;
	}
	if (!isObject(pack)) {
		fail('a pack must be a JSON object');
		return 0;
	}

	for (const key of unknownKeys(pack, PACK_KEYS)) fail(`unknown key "${key}"`);
	if (pack.schema_version !== SCHEMA_VERSION) {
		fail(`schema_version must be ${SCHEMA_VERSION}, found ${JSON.stringify(pack.schema_version)}`);
	}
	if (pack.language !== directory) {
		fail(`language ${JSON.stringify(pack.language)} does not match the directory "${directory}"`);
	}
	if (pack.category !== expectedCategory) {
		fail(
			`category ${JSON.stringify(pack.category)} does not match the file name "${expectedCategory}"`
		);
	}
	if (!Array.isArray(pack.cards) || pack.cards.length === 0) {
		fail('"cards" must be a non-empty array');
		return 0;
	}

	/** @type {Set<string>} */
	const ids = new Set();
	pack.cards.forEach((/** @type {unknown} */ card, /** @type {number} */ index) => {
		validateCard(card, index, ids, present, referenced, fail);
	});
	return pack.cards.length;
}

/**
 * @param {unknown} card
 * @param {number} index position in the pack, used when the id is unusable
 * @param {Set<string>} ids ids already seen in this pack
 * @param {Set<string>} present every file under the root
 * @param {Set<string>} referenced collects the files the cards point at
 * @param {(message: string) => void} fail
 * @returns {void}
 */
function validateCard(card, index, ids, present, referenced, fail) {
	if (!isObject(card)) {
		fail(`card ${index + 1}: must be a JSON object`);
		return;
	}

	const label =
		typeof card.id === 'string' && card.id !== '' ? `card "${card.id}"` : `card ${index + 1}`;
	/** @param {string} message */
	const cardFail = (message) => fail(`${label}: ${message}`);

	for (const key of unknownKeys(card, CARD_KEYS)) cardFail(`unknown key "${key}"`);

	if (!isText(card.id)) cardFail('"id" must be a non-empty string');
	else if (!ID_PATTERN.test(card.id)) cardFail(`"id" must match ${ID_PATTERN.source}`);
	else if (ids.has(card.id)) cardFail('duplicate id');
	else ids.add(card.id);

	if (!isText(card.word)) cardFail('"word" must be a non-empty string');
	// Sources are what keeps the onomatopoeia canon honest: every card names
	// the published work its form comes from.
	if (!isText(card.source)) cardFail('"source" must be a non-empty string');

	switch (checkReference(card.image, present)) {
		case 'missing-value':
			cardFail('"image" must be a non-empty string');
			break;
		case 'escapes':
			cardFail(`image ${JSON.stringify(card.image)} must be a relative path inside the pack root`);
			break;
		case 'dangling':
			cardFail(`image ${JSON.stringify(card.image)} does not exist`);
			break;
		default:
			referenced.add(String(card.image));
	}

	if ('variants' in card) {
		const variants = card.variants;
		if (!Array.isArray(variants) || variants.length === 0 || !variants.every(isText)) {
			cardFail('"variants" must be a non-empty array of non-empty strings');
		}
	}

	const shape = LEVEL_SHAPES.find(
		(kinds) => Array.isArray(card.levels) && card.levels.length === kinds.length
	);
	if (!Array.isArray(card.levels) || shape === undefined) {
		cardFail('"levels" must be [word] or [sound, word]');
		return;
	}
	card.levels.forEach((/** @type {unknown} */ level, /** @type {number} */ position) => {
		validateLevel(level, shape[position], position, present, referenced, cardFail);
	});
}

/**
 * @param {unknown} level
 * @param {string} expected the kind this position must carry
 * @param {number} position
 * @param {Set<string>} present
 * @param {Set<string>} referenced
 * @param {(message: string) => void} cardFail
 * @returns {void}
 */
function validateLevel(level, expected, position, present, referenced, cardFail) {
	/** @param {string} message */
	const levelFail = (message) => cardFail(`level ${position + 1}: ${message}`);

	if (!isObject(level)) {
		levelFail('must be a JSON object');
		return;
	}
	for (const key of unknownKeys(level, LEVEL_KEYS)) levelFail(`unknown key "${key}"`);

	if (level.kind !== expected) {
		levelFail(`kind must be "${expected}", found ${JSON.stringify(level.kind)}`);
	}
	if (!isText(level.text)) levelFail('"text" must be a non-empty string');

	switch (checkReference(level.audio, present)) {
		case 'missing-value':
			levelFail('"audio" must be a non-empty string');
			break;
		case 'escapes':
			levelFail(
				`audio ${JSON.stringify(level.audio)} must be a relative path inside the pack root`
			);
			break;
		case 'dangling':
			levelFail(`audio ${JSON.stringify(level.audio)} does not exist`);
			break;
		default:
			referenced.add(String(level.audio));
	}
}

/**
 * @param {string} root absolute path of the pack root
 * @returns {Report}
 */
export function validateContent(root) {
	/** @type {string[]} */
	const violations = [];
	/** @type {string[]} */
	let files;
	try {
		files = walk(root);
	} catch {
		return { violations: [`${root}: no such content directory`], packs: [], cards: 0, assets: [] };
	}

	const packs = files.filter((file) => file.endsWith('.json'));
	const assets = files.filter((file) => !file.endsWith('.json'));
	const present = new Set(files);
	/** @type {Set<string>} */
	const referenced = new Set();
	let cards = 0;

	if (packs.length === 0) violations.push(`${root}: holds no pack files`);
	for (const pack of packs) {
		cards += validatePack(
			pack,
			readFileSync(`${root}/${pack}`, 'utf8'),
			present,
			referenced,
			violations
		);
	}
	// An asset nobody points at is either a leftover or a card that lost its
	// reference; both mean the pack no longer says what it ships.
	for (const asset of assets) {
		if (!referenced.has(asset)) violations.push(`${asset}: orphan asset, no card refers to it`);
	}

	return { violations, packs, cards, assets };
}

function main() {
	const root = resolve(process.argv[2] ?? DEFAULT_ROOT);
	const report = validateContent(root);

	if (report.violations.length > 0) {
		for (const violation of report.violations) console.error(violation);
		console.error(`${report.violations.length} content violation(s)`);
		process.exitCode = 1;
		return;
	}

	const packs = report.packs.length === 1 ? '1 pack' : `${report.packs.length} packs`;
	console.log(
		`content: ${packs} (${report.packs.join(', ')}), ${report.cards} cards, ` +
			`${report.assets.length} asset files, every reference resolved`
	);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
