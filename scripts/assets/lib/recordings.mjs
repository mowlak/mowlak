// Recordings made at home, matched to the clips a pack asks for.
//
// A pack can be voiced by a speech service or by a person at a microphone, and
// the app must not be able to tell: the same trim, the same loudness, the same
// encoding. So this file does not describe a second pipeline. It describes the
// one gate a home recording goes through — a file name that names a clip — and
// then hands ffmpeg the same two passes generate-audio.mjs uses.
//
// Pure, like the libraries beside it: it matches names and builds argument
// lists. The script does the reading and the writing.

import { UsageError } from './args.mjs';
import { encodePass, measurePass } from './audio.mjs';

// ffmpeg reads the container for itself, so this list is about what a person
// is likely to export rather than about what can be decoded. wav is the one to
// prefer and the one the runbook asks for: no encoder has been between the
// microphone and the normalisation.
export const RECORDING_EXTENSIONS = ['wav', 'aiff', 'flac', 'm4a', 'mp3'];

/**
 * @typedef {object} Take
 * @property {string} card
 * @property {string} kind
 * @property {string} text what the card asks to be said
 * @property {string} path the target, relative to the pack root
 * @property {string} file the recording that becomes it, or '' when there is none
 * @property {'write' | 'replace' | 'missing'} action
 */

/**
 * The name a recording has to carry to be recognised: the card id, the level,
 * and an extension. Nothing else identifies it — not the order it was recorded
 * in, not what the file was called in the recorder.
 *
 * @param {string} card
 * @param {string} kind
 * @returns {string}
 */
export function takeName(card, kind) {
	return `${card}.${kind}`;
}

/**
 * @param {string} file
 * @returns {{ name: string, extension: string }} the part before the last dot, and after it
 */
function split(file) {
	const at = file.lastIndexOf('.');
	return at <= 0
		? { name: file, extension: '' }
		: { name: file.slice(0, at), extension: file.slice(at + 1).toLowerCase() };
}

/**
 * What the run would import, and every reason it should not start.
 *
 * A file whose name is not a clip is a problem rather than a file quietly
 * skipped. The whole risk of this path is silence: a take exported as
 * `dog-sound-final.wav` that the importer ignores leaves the operator
 * believing a card was re-recorded when it was not, and the person who finds
 * out is the child hearing two voices. Problems are collected rather than
 * thrown one at a time, because a directory of exports is wrong in batches.
 *
 * Missing clips are not a problem: re-recording one flubbed take has to be as
 * easy as re-recording all of them. The caller is left to say loudly how many
 * of the pack's clips this run did not touch.
 *
 * @param {{ cards: { id: string, levels: { kind: string, text: string, audio: string }[] }[] }} pack
 * @param {string[]} files the file names sitting directly in the raw directory
 * @param {{ only?: string, present?: (path: string) => boolean }} options
 * @returns {{ takes: Take[], problems: string[], total: number }}
 */
export function buildRecordingPlan(pack, files, options = {}) {
	const present = options.present ?? (() => false);

	/** @type {Map<string, { card: string, kind: string, text: string, path: string }>} */
	const wanted = new Map();
	for (const card of pack.cards) {
		for (const level of card.levels) {
			wanted.set(takeName(card.id, level.kind), {
				card: card.id,
				kind: level.kind,
				text: level.text,
				path: level.audio
			});
		}
	}

	/** @type {Map<string, string>} */
	const found = new Map();
	/** @type {string[]} */
	const problems = [];

	for (const file of files) {
		// Editor and platform droppings are not takes and never were; the
		// content validator skips them on the same rule.
		if (file.startsWith('.')) continue;

		const { name, extension } = split(file);
		if (!RECORDING_EXTENSIONS.includes(extension)) {
			problems.push(
				`${JSON.stringify(file)}: not a recording this pipeline reads ` +
					`(${RECORDING_EXTENSIONS.join(', ')}); keep anything else out of the directory, ` +
					'or in a subdirectory of it'
			);
			continue;
		}
		if (!wanted.has(name)) {
			problems.push(
				`${JSON.stringify(file)}: no clip is called ${JSON.stringify(name)}; a take is named ` +
					'<card-id>.<kind>.<ext>, the kind being "sound" or "word"'
			);
			continue;
		}

		const taken = found.get(name);
		if (taken !== undefined) {
			problems.push(
				`${JSON.stringify(file)}: ${JSON.stringify(taken)} is already the take for ${name}; ` +
					'leave one file per clip in the directory'
			);
			continue;
		}
		found.set(name, file);
	}

	/** @type {Take[]} */
	const takes = [];
	for (const [name, clip] of wanted) {
		if (options.only !== undefined && options.only !== clip.card) continue;

		const file = found.get(name);
		takes.push({
			...clip,
			file: file ?? '',
			action: file === undefined ? 'missing' : present(clip.path) ? 'replace' : 'write'
		});
	}
	if (options.only !== undefined && takes.length === 0) {
		throw new UsageError(`no card ${JSON.stringify(options.only)} in this pack`);
	}

	return { takes, problems, total: wanted.size };
}

/**
 * Pass one over a recording. The take is a file with a header, so ffmpeg is
 * told nothing about it beyond where it is.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function measureRecordingArgs(source) {
	return measurePass([], source);
}

/**
 * Pass two, and the only encoding this repository ships: what comes out is
 * indistinguishable in format from a clip the speech service voiced.
 *
 * @param {string} source
 * @param {string} out
 * @param {import('./audio.mjs').Measured} measured
 * @returns {string[]}
 */
export function encodeRecordingArgs(source, out, measured) {
	return encodePass([], source, out, measured);
}
