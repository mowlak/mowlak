// What the voice is asked to say, and how the answer is made fit to ship.
//
// Everything in this file is pure: it builds plans, argument lists and
// refusals, and returns them. Nothing here opens a socket or a file, which is
// what lets the tests cover the parts that matter — the loudness constants,
// the refusals, the resolved texts — without a key, without a network and
// without ffmpeg.

import { UsageError } from './args.mjs';

// Uniform loudness is a product rule, not a mixing preference. The app plays
// these clips one after another to a small child who is holding the device,
// and a clip that lands louder than the one before it is a jump scare — the
// exact opposite of what the app is for. Every clip of every pack is measured
// and normalised to the same target, so the numbers are written down once,
// here, and read from here by both passes and by the audition.
export const LOUDNESS = { integrated: -18, truePeak: -2, range: 7 };

// A take that opens on an indrawn breath makes the parent wait and the child
// lose the thread, so both ends are trimmed before anything is measured.
export const SILENCE = { threshold: '-50dB', keep: 0.05 };

// One encoding as well as one voice: mono, because the clips are speech, and
// a small bitrate because every clip is cached on a phone for offline use.
export const ENCODE = { sampleRate: 44100, channels: 1, codec: 'aac', bitrate: '48k' };

// The speech endpoint returns pcm_* as headerless little-endian 16-bit
// samples, so ffmpeg has to be told what it is being handed.
export const RAW_FORMATS = {
	pcm_16000: { extension: 'pcm', args: ['-f', 's16le', '-ar', '16000', '-ac', '1'] },
	pcm_22050: { extension: 'pcm', args: ['-f', 's16le', '-ar', '22050', '-ac', '1'] },
	pcm_24000: { extension: 'pcm', args: ['-f', 's16le', '-ar', '24000', '-ac', '1'] },
	pcm_44100: { extension: 'pcm', args: ['-f', 's16le', '-ar', '44100', '-ac', '1'] },
	mp3_44100_128: { extension: 'mp3', args: [] }
};

// One onomatopoeia and one word: the two jobs every card gives the voice, and
// enough to hear whether a candidate can do both.
export const AUDITION_TEXTS = ['hau hau', 'pies'];

export const SPEECH_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';

export const PAID_TIER_REFUSAL =
	'--paid-tier-confirmed is missing, so nothing was requested. The speech ' +
	"service's free tier does not grant the rights the content license needs, " +
	'and audio produced under it could not ship, so a run that would spend the ' +
	'quota has to say out loud that the account is on a paid plan. Add ' +
	'--paid-tier-confirmed when it is, or use --dry-run to see the plan without ' +
	'calling anything.';

export const MISSING_KEY_REFUSAL =
	'ELEVENLABS_API_KEY is not set. Export it in the shell that runs this ' +
	'script, or put it in a gitignored .env at the root of the working tree. ' +
	'The key is never written anywhere by this pipeline.';

export const MISSING_VOICE_REFUSAL =
	'audio.config.json still has an empty "voice_id". One voice reads the whole ' +
	'app, because a child hearing two different speakers hears two different ' +
	'things being asked, so the choice is made once and then pinned: run ' +
	'--audition with a directory outside the repository, listen to the clips, ' +
	'and paste the id of the voice you chose into the config.';

/**
 * @typedef {object} Config
 * @property {string} voice_id empty until an audition has settled it
 * @property {string} model_id
 * @property {Record<string, number>} voice_settings
 * @property {string} output_format a key of RAW_FORMATS
 * @property {Record<string, string>} audition_voices name to voice id
 * @property {Record<string, string>} tts_overrides "<card>.<kind>" to spoken text
 */

/**
 * @typedef {object} Clip
 * @property {string} card
 * @property {string} kind
 * @property {string} display what the card shows the parent
 * @property {string} text what the voice is asked to say
 * @property {boolean} overridden whether the two differ
 * @property {string} path the target, relative to the pack root
 * @property {'write' | 'replace' | 'keep'} action
 */

/**
 * @typedef {object} Audition
 * @property {string} voice
 * @property {string} voiceId
 * @property {string} text
 * @property {string} file the file name to write, without a directory
 */

/**
 * A name reduced to something safe to use as a file name on any platform.
 * Folding is lossy — "Michał" and "Michal" come out the same — so the
 * audition checks for a collision rather than pretending there cannot be one.
 *
 * @param {string} value
 * @returns {string}
 */
export function slug(value) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/ł/g, 'l')
		.replace(/Ł/g, 'L')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

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
 * @param {unknown} value
 * @param {string} label
 * @returns {Record<string, string>}
 */
function readStringMap(value, label) {
	if (!isObject(value)) throw new UsageError(`${label} must be a JSON object`);
	for (const [key, entry] of Object.entries(value)) {
		if (!isText(entry)) throw new UsageError(`${label}: ${JSON.stringify(key)} must be a string`);
	}
	return /** @type {Record<string, string>} */ (value);
}

/**
 * @param {string} contents
 * @param {string} source how to name the file in an error
 * @returns {Config}
 */
export function readConfig(contents, source) {
	/** @type {unknown} */
	let value;
	try {
		value = JSON.parse(contents);
	} catch (error) {
		throw new UsageError(`${source}: not valid JSON (${describe(error)})`);
	}
	if (!isObject(value)) throw new UsageError(`${source}: must be a JSON object`);

	if (typeof value.voice_id !== 'string')
		throw new UsageError(`${source}: "voice_id" must be a string`);
	if (!isText(value.model_id))
		throw new UsageError(`${source}: "model_id" must be a non-empty string`);
	if (!isObject(value.voice_settings)) {
		throw new UsageError(`${source}: "voice_settings" must be a JSON object`);
	}
	for (const [key, setting] of Object.entries(value.voice_settings)) {
		if (typeof setting !== 'number' || !Number.isFinite(setting)) {
			throw new UsageError(`${source}: voice_settings.${key} must be a number`);
		}
	}
	if (!isText(value.output_format) || !(value.output_format in RAW_FORMATS)) {
		throw new UsageError(
			`${source}: "output_format" must be one of ${Object.keys(RAW_FORMATS).join(', ')}`
		);
	}

	return {
		voice_id: value.voice_id.trim(),
		model_id: value.model_id,
		voice_settings: /** @type {Record<string, number>} */ (value.voice_settings),
		output_format: value.output_format,
		audition_voices: readStringMap(value.audition_voices, `${source}: "audition_voices"`),
		tts_overrides: readStringMap(value.tts_overrides, `${source}: "tts_overrides"`)
	};
}

/**
 * @param {unknown} error
 * @returns {string}
 */
export function describe(error) {
	return error instanceof Error ? error.message : String(error);
}

/**
 * @param {string} card
 * @param {string} kind
 * @returns {string} the key an override is filed under
 */
export function overrideKey(card, kind) {
	return `${card}.${kind}`;
}

/**
 * One clip per card per level, in pack order.
 *
 * The target path is the one the card itself declares rather than one built
 * from a convention here: the card names the recording it wants, so a file
 * this script writes is by construction the file that card will play.
 *
 * `tts_overrides` exists because some voices read a two-letter input as an
 * initial rather than a syllable. It changes what is spoken and nothing else —
 * the text on the card, which comes from the logopedic canon, is never touched
 * by this pipeline.
 *
 * @param {{ cards: { id: string, levels: { kind: string, text: string, audio: string }[] }[] }} pack
 * @param {Config} config
 * @param {{ only?: string, force?: boolean, present?: (path: string) => boolean }} options
 * @returns {Clip[]}
 */
export function buildPlan(pack, config, options = {}) {
	const present = options.present ?? (() => false);

	/** @type {Set<string>} */
	const keys = new Set();
	/** @type {Clip[]} */
	const clips = [];

	for (const card of pack.cards) {
		for (const level of card.levels) {
			const key = overrideKey(card.id, level.kind);
			keys.add(key);
			if (options.only !== undefined && options.only !== card.id) continue;

			const override = config.tts_overrides[key];
			const here = present(level.audio);
			clips.push({
				card: card.id,
				kind: level.kind,
				display: level.text,
				text: override ?? level.text,
				overridden: override !== undefined && override !== level.text,
				path: level.audio,
				action: here ? (options.force === true ? 'replace' : 'keep') : 'write'
			});
		}
	}

	// An override filed under a name the pack does not have does nothing at
	// all, and doing nothing quietly is how a card ends up recorded wrong.
	for (const key of Object.keys(config.tts_overrides)) {
		if (!keys.has(key))
			throw new UsageError(`tts_overrides names ${JSON.stringify(key)}, which no card has`);
	}
	if (options.only !== undefined && clips.length === 0) {
		throw new UsageError(`no card ${JSON.stringify(options.only)} in this pack`);
	}

	return clips;
}

/**
 * Two clips for every candidate voice, so the choice is made by ear on the
 * two things a card actually asks for.
 *
 * @param {Config} config
 * @returns {Audition[]}
 */
export function buildAuditionPlan(config) {
	const names = Object.keys(config.audition_voices);
	if (names.length === 0) throw new UsageError('audio.config.json lists no audition_voices');

	// The point of an audition is to compare voices by ear and then write one
	// id down. Two candidates writing to the same file would mean choosing
	// from a set that quietly lost a member.
	/** @type {Map<string, string>} */
	const seen = new Map();
	for (const voice of names) {
		const taken = seen.get(slug(voice));
		if (taken !== undefined) {
			throw new UsageError(
				`audition_voices: ${JSON.stringify(voice)} and ${JSON.stringify(taken)} would be ` +
					'written to the same file; give one of them a name that differs by more than its accents'
			);
		}
		seen.set(slug(voice), voice);
	}

	/** @type {Audition[]} */
	const takes = [];
	for (const voice of names) {
		for (const text of AUDITION_TEXTS) {
			takes.push({
				voice,
				voiceId: config.audition_voices[voice],
				text,
				file: `${slug(voice)}.${slug(text)}.m4a`
			});
		}
	}
	return takes;
}

/**
 * Everything standing between this command and a real request, all of it at
 * once so the operator fixes one command rather than three.
 *
 * @param {{ confirmed: boolean, apiKey: string | undefined, voiceId: string, audition: boolean }} state
 * @returns {string[]}
 */
export function blockingReasons(state) {
	/** @type {string[]} */
	const reasons = [];
	if (!state.confirmed) reasons.push(PAID_TIER_REFUSAL);
	if (!isText(state.apiKey)) reasons.push(MISSING_KEY_REFUSAL);
	// An audition is how a voice_id is chosen, so it cannot require one.
	if (!state.audition && !isText(state.voiceId)) reasons.push(MISSING_VOICE_REFUSAL);
	return reasons;
}

/**
 * The filter both passes share. Trimming comes first because silence at the
 * head of a take drags the measured loudness of everything after it.
 *
 * @returns {string}
 */
function trim() {
	const gate =
		`start_periods=1:start_silence=${SILENCE.keep}` +
		`:start_threshold=${SILENCE.threshold}:detection=peak`;
	// silenceremove only ever trims the head, so the tail is trimmed by
	// reversing the stream, trimming its head as well, and reversing back.
	return `silenceremove=${gate},areverse,silenceremove=${gate},areverse`;
}

/**
 * @returns {string} the target half of the loudnorm filter, shared by both passes
 */
function target() {
	return `loudnorm=I=${LOUDNESS.integrated}:TP=${LOUDNESS.truePeak}:LRA=${LOUDNESS.range}`;
}

/**
 * @param {string} format
 * @returns {{ extension: string, args: string[] }}
 */
export function rawFormat(format) {
	const known = RAW_FORMATS[/** @type {keyof typeof RAW_FORMATS} */ (format)];
	if (known === undefined)
		throw new UsageError(`unsupported output_format ${JSON.stringify(format)}`);
	return known;
}

/**
 * Pass one: measure the take, changing nothing. loudnorm in one pass would
 * guess at the parts it has not heard yet, which is audible on clips this
 * short.
 *
 * How the source is described to ffmpeg is the parameter, because that is the
 * only thing that differs between a take the speech service returned — raw
 * samples with no header, which have to be described — and a recording made at
 * home, which is a file ffmpeg reads for itself. Everything after the input is
 * identical for both, and identical is the whole point: clips that arrive by
 * different routes still go through one trim, one measurement, one loudness.
 *
 * @param {string[]} input what the source is, for ffmpeg; empty when the file says so itself
 * @param {string} source the file to measure
 * @returns {string[]}
 */
export function measurePass(input, source) {
	return [
		'-hide_banner',
		'-nostdin',
		'-y',
		...input,
		'-i',
		source,
		'-af',
		`${trim()},${target()}:print_format=json`,
		'-f',
		'null',
		'-'
	];
}

/**
 * @param {string} raw the file the speech service returned
 * @param {string} format the configured output_format
 * @returns {string[]}
 */
export function measureArgs(raw, format) {
	return measurePass(rawFormat(format).args, raw);
}

/**
 * @typedef {object} Measured
 * @property {string} input_i
 * @property {string} input_tp
 * @property {string} input_lra
 * @property {string} input_thresh
 * @property {string} target_offset
 */

/**
 * Pass two: the same filter, told what pass one heard, then encoded.
 *
 * loudnorm resamples internally, so the sample rate is stated again on the
 * way out; the output format is stated explicitly so the file can be written
 * under a temporary name and still be an m4a.
 *
 * @param {string[]} input what the source is, for ffmpeg; empty when the file says so itself
 * @param {string} source
 * @param {string} out
 * @param {Measured} measured
 * @returns {string[]}
 */
export function encodePass(input, source, out, measured) {
	const normalise =
		`${target()}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}` +
		`:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}` +
		`:offset=${measured.target_offset}:linear=true`;

	return [
		'-hide_banner',
		'-nostdin',
		'-y',
		...input,
		'-i',
		source,
		'-af',
		`${trim()},${normalise}`,
		'-ar',
		String(ENCODE.sampleRate),
		'-ac',
		String(ENCODE.channels),
		'-c:a',
		ENCODE.codec,
		'-b:a',
		ENCODE.bitrate,
		'-movflags',
		'+faststart',
		// Keep the bytes reproducible, so regenerating one card does not churn
		// the repository for every other card beside it.
		'-fflags',
		'+bitexact',
		'-map_metadata',
		'-1',
		'-f',
		'ipod',
		out
	];
}

/**
 * @param {string} raw
 * @param {string} out
 * @param {string} format
 * @param {Measured} measured
 * @returns {string[]}
 */
export function encodeArgs(raw, out, format, measured) {
	return encodePass(rawFormat(format).args, raw, out, measured);
}

const MEASURED_KEYS = ['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset'];

/**
 * @param {string} stderr everything pass one printed
 * @returns {Measured}
 */
export function parseLoudnorm(stderr) {
	const open = stderr.lastIndexOf('{');
	const close = stderr.lastIndexOf('}');
	if (open === -1 || close < open) throw new Error('ffmpeg printed no loudness measurement');

	/** @type {Record<string, unknown>} */
	let measured;
	try {
		measured = JSON.parse(stderr.slice(open, close + 1));
	} catch (error) {
		throw new Error(`ffmpeg printed an unreadable measurement (${describe(error)})`, {
			cause: error
		});
	}

	/** @type {Record<string, string>} */
	const values = {};
	for (const key of MEASURED_KEYS) {
		const value = measured[key];
		if (typeof value !== 'string' && typeof value !== 'number') {
			throw new Error(`the loudness measurement is missing ${key}`);
		}
		values[key] = String(value);
		// A take that measures as silence is a failed request, not a quiet
		// voice, and normalising it would raise the noise floor to speech.
		if (key === 'input_i' && values[key].includes('inf')) {
			throw new Error('the take is silent; nothing was spoken');
		}
	}
	return /** @type {Measured} */ (/** @type {unknown} */ (values));
}

/**
 * The only part of this file that talks to anything. It is returned as a
 * function so the batch can be driven by a stub: the tests plan, refuse and
 * build arguments without ever reaching a network.
 *
 * @param {{ apiKey: string, config: Config, fetch?: typeof globalThis.fetch }} options
 * @returns {(voiceId: string, text: string) => Promise<Uint8Array>}
 */
export function createSpeaker(options) {
	const call = options.fetch ?? globalThis.fetch;

	return async (voiceId, text) => {
		const query = new URLSearchParams({ output_format: options.config.output_format });
		const response = await call(
			`${SPEECH_ENDPOINT}/${encodeURIComponent(voiceId)}?${query.toString()}`,
			{
				method: 'POST',
				headers: {
					'xi-api-key': options.apiKey,
					'content-type': 'application/json',
					accept: 'audio/*'
				},
				body: JSON.stringify({
					text,
					model_id: options.config.model_id,
					voice_settings: options.config.voice_settings
				})
			}
		);

		if (!response.ok) {
			const detail = await response.text().catch(() => '');
			throw new Error(
				`the speech service answered ${response.status} ${response.statusText}` +
					(detail === '' ? '' : `: ${detail.slice(0, 300)}`)
			);
		}

		const audio = new Uint8Array(await response.arrayBuffer());
		if (audio.length === 0) throw new Error('the speech service returned an empty body');
		return audio;
	};
}
