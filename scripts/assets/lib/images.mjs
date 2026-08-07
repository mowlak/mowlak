// Turning a chosen file into a card's picture, and refusing everything else.
//
// Generation happens outside this repository, by hand or in whichever image
// tool the operator prefers; what this file describes is the narrow gate the
// result has to fit through. Pure, like the audio library: it plans, checks
// and builds argument lists, and the script does the work.

import { UsageError } from './args.mjs';

// Big enough for a card filling a phone screen at three times the density,
// small enough that twelve of them install offline without comment.
export const CANVAS = 1024;

// The style anchor in README.md names one background and only one. Anything
// transparent is composited onto exactly that cream rather than onto whatever
// the renderer would have picked, so a picture drawn on a transparent ground
// cannot quietly become a card with a different background from its
// neighbours.
export const BACKGROUND = '0xFFFFFF';

// Generators rarely return an exactly square image. A couple of percent
// disappears once the card is drawn; more than that would visibly stretch the
// animal, and a stretched animal is a worse picture of a dog.
export const SQUARE_TOLERANCE = 0.02;

export const IMAGE_EXTENSION = '.png';

/**
 * @typedef {object} Entry
 * @property {string} card
 * @property {string} file the picked file name, within the raw directory
 * @property {string} source the picked file, absolute
 * @property {string} previous what the card points at now, relative to the pack root
 * @property {string} target what it will point at, relative to the pack root
 * @property {boolean} replaces whether the previous file becomes unused
 */

/**
 * @param {number} width
 * @param {number} height
 * @returns {boolean}
 */
export function isSquareEnough(width, height) {
	if (!(width > 0) || !(height > 0)) return false;
	return Math.abs(width - height) / Math.max(width, height) <= SQUARE_TOLERANCE;
}

/**
 * A picked value has to name a file sitting directly in the raw directory.
 * Anything with a separator in it would let a picks file reach outside the
 * directory the operator named, which is the one thing this script is allowed
 * to read.
 *
 * @param {string} file
 * @returns {boolean}
 */
export function isPlainFileName(file) {
	return file !== '' && !/[/\\]/.test(file) && file !== '.' && file !== '..';
}

/**
 * @param {string} contents
 * @param {string} source how to name the file in an error
 * @returns {Record<string, string>}
 */
export function readPicks(contents, source) {
	/** @type {unknown} */
	let value;
	try {
		value = JSON.parse(contents);
	} catch (error) {
		throw new UsageError(
			`${source}: not valid JSON (${error instanceof Error ? error.message : String(error)})`
		);
	}
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new UsageError(`${source}: must be a JSON object of card id to file name`);
	}
	for (const [card, file] of Object.entries(value)) {
		if (typeof file !== 'string' || file.trim() === '') {
			throw new UsageError(`${source}: ${JSON.stringify(card)} must name a file`);
		}
	}
	return /** @type {Record<string, string>} */ (value);
}

/**
 * @param {string} image the path a card points at, relative to the pack root
 * @param {string} card
 * @returns {string} where that card's picture will live once imported
 */
export function targetFor(image, card) {
	const directory = image.includes('/') ? image.slice(0, image.lastIndexOf('/')) : '';
	return `${directory === '' ? '' : `${directory}/`}${card}${IMAGE_EXTENSION}`;
}

/**
 * What the run will do, or every reason it cannot.
 *
 * Problems are collected rather than thrown one at a time: a picks file is
 * written by hand against a directory of downloads, and finding out about its
 * four mistakes one run at a time would be four runs.
 *
 * @param {{ cards: { id: string, image: string }[] }} pack
 * @param {string} packText the pack exactly as it is on disk
 * @param {Record<string, string>} picks
 * @param {{ rawDir: string, exists: (path: string) => boolean }} options
 * @returns {{ entries: Entry[], problems: string[] }}
 */
export function buildImportPlan(pack, packText, picks, options) {
	/** @type {Map<string, string>} */
	const images = new Map(pack.cards.map((card) => [card.id, card.image]));
	/** @type {Entry[]} */
	const entries = [];
	/** @type {string[]} */
	const problems = [];

	for (const [card, file] of Object.entries(picks)) {
		const previous = images.get(card);
		if (previous === undefined) {
			problems.push(`${card}: the pack has no such card`);
			continue;
		}
		if (!isPlainFileName(file)) {
			problems.push(`${card}: ${JSON.stringify(file)} must be a file name in the raw directory`);
			continue;
		}

		const source = `${options.rawDir}/${file}`;
		if (!options.exists(source)) {
			problems.push(`${card}: ${JSON.stringify(file)} is not in the raw directory`);
			continue;
		}

		const target = targetFor(previous, card);
		// The rewrite below is textual so the pack keeps its formatting, which
		// only works while the path it replaces appears exactly once.
		if (previous !== target && countOccurrences(packText, JSON.stringify(previous)) !== 1) {
			problems.push(
				`${card}: ${JSON.stringify(previous)} does not appear exactly once in the pack`
			);
			continue;
		}

		entries.push({ card, file, source, previous, target, replaces: previous !== target });
	}

	return { entries, problems };
}

/**
 * @param {string} haystack
 * @param {string} needle
 * @returns {number}
 */
function countOccurrences(haystack, needle) {
	let count = 0;
	for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
		count += 1;
	}
	return count;
}

/**
 * The pack is edited as text, one value at a time, rather than parsed and
 * written back. A round trip through JSON.stringify would reformat a file
 * that is reviewed like prose and checked by the formatter, so the diff of an
 * import is exactly the paths that changed.
 *
 * @param {string} packText
 * @param {string} from a path relative to the pack root
 * @param {string} to
 * @returns {string}
 */
export function replaceImagePath(packText, from, to) {
	const needle = JSON.stringify(from);
	if (countOccurrences(packText, needle) !== 1) {
		throw new Error(`${from} does not appear exactly once in the pack`);
	}
	return packText.replace(needle, JSON.stringify(to));
}

/**
 * Every picture is redrawn to the same size on the same ground and stripped of
 * whatever the tool that made it wrote into it, so twelve files downloaded one
 * at a time still arrive as one set.
 *
 * @param {string} source
 * @param {string} target
 * @returns {string[]}
 */
export function convertArgs(source, target) {
	return [
		'-hide_banner',
		'-nostdin',
		'-y',
		// The ground is stated in RGB: taken as YUV it would come back a shade
		// off the anchor, and eleven cards agreeing on a shade the twelfth
		// misses is exactly the drift this pipeline exists to prevent.
		'-f',
		'lavfi',
		'-i',
		`color=c=${BACKGROUND}:s=${CANVAS}x${CANVAS},format=rgb24`,
		'-i',
		source,
		'-filter_complex',
		`[1:v]scale=${CANVAS}:${CANVAS}:flags=lanczos[art];` +
			'[0:v][art]overlay=0:0:format=auto,format=rgb24',
		'-frames:v',
		'1',
		'-update',
		'1',
		'-map_metadata',
		'-1',
		'-fflags',
		'+bitexact',
		'-f',
		'image2',
		'-c:v',
		'png',
		target
	];
}

/**
 * @param {string} source
 * @returns {string[]} the ffprobe arguments that report one image's size
 */
export function probeArgs(source) {
	return [
		'-v',
		'error',
		'-select_streams',
		'v:0',
		'-show_entries',
		'stream=width,height',
		'-of',
		'csv=p=0',
		source
	];
}

/**
 * @param {string} printed what ffprobe wrote
 * @returns {{ width: number, height: number }}
 */
export function parseSize(printed) {
	const [width, height] = printed.trim().split(',').map(Number);
	if (!Number.isFinite(width) || !Number.isFinite(height)) {
		throw new Error(
			`could not read the image size (ffprobe said ${JSON.stringify(printed.trim())})`
		);
	}
	return { width, height };
}
