// What the generator would do, checked without a key, without a network and
// without ffmpeg. The plan, the refusals and the filter arguments are the
// whole of the product rules this script carries, so they are the whole of
// what is tested here; the request itself is a function the batch is handed,
// and the one case that exercises it hands it a stub.

import { describe, expect, it } from 'vitest';
import { UsageError } from './args.mjs';
import {
	AUDITION_TEXTS,
	ENCODE,
	LOUDNESS,
	MISSING_KEY_REFUSAL,
	MISSING_VOICE_REFUSAL,
	PAID_TIER_REFUSAL,
	SPEECH_ENDPOINT,
	blockingReasons,
	buildAuditionPlan,
	buildPlan,
	createSpeaker,
	encodeArgs,
	measureArgs,
	parseLoudnorm,
	readConfig,
	slug
} from './audio.mjs';

const MEASURED = {
	input_i: '-21.75',
	input_tp: '-18.06',
	input_lra: '0.00',
	input_thresh: '-31.75',
	target_offset: '0.05'
};

/**
 * @param {Partial<import('./audio.mjs').Config>} changes
 * @returns {import('./audio.mjs').Config}
 */
function config(changes = {}) {
	return {
		voice_id: 'a-pinned-voice',
		model_id: 'eleven_multilingual_v2',
		voice_settings: { stability: 0.6, similarity_boost: 0.75, speed: 0.95 },
		output_format: 'pcm_44100',
		audition_voices: { Aleksandra: 'voice-one', 'Michał K.': 'voice-two' },
		tts_overrides: {},
		...changes
	};
}

/**
 * @param {string} id
 * @param {string} onomatopoeia
 * @param {string} word
 * @returns {Record<string, any>}
 */
function card(id, onomatopoeia, word) {
	return {
		id,
		word,
		image: `images/animals/${id}.svg`,
		levels: [
			{
				kind: 'onomatopoeia',
				text: onomatopoeia,
				audio: `pl/audio/animals/${id}.onomatopoeia.m4a`
			},
			{ kind: 'word', text: word, audio: `pl/audio/animals/${id}.word.m4a` }
		]
	};
}

const PACK = { cards: [card('dog', 'hau hau', 'pies'), card('cow', 'mu', 'krowa')] };

describe('buildPlan', () => {
	it('plans one clip per card per level, at the paths the cards name', () => {
		const clips = buildPlan(PACK, config());

		expect(clips).toHaveLength(4);
		expect(clips.map((clip) => clip.path)).toEqual([
			'pl/audio/animals/dog.onomatopoeia.m4a',
			'pl/audio/animals/dog.word.m4a',
			'pl/audio/animals/cow.onomatopoeia.m4a',
			'pl/audio/animals/cow.word.m4a'
		]);
		expect(clips.map((clip) => clip.text)).toEqual(['hau hau', 'pies', 'mu', 'krowa']);
	});

	it('leaves recordings that are already there alone', () => {
		const clips = buildPlan(PACK, config(), {
			present: (path) => path === 'pl/audio/animals/dog.word.m4a'
		});

		expect(clips.map((clip) => clip.action)).toEqual(['write', 'keep', 'write', 'write']);
	});

	it('re-records them when asked to', () => {
		const clips = buildPlan(PACK, config(), { present: () => true, force: true });

		expect(new Set(clips.map((clip) => clip.action))).toEqual(new Set(['replace']));
	});

	it('speaks the override while the card keeps saying what the canon says', () => {
		const clips = buildPlan(PACK, config({ tts_overrides: { 'cow.onomatopoeia': 'muu' } }));
		const clip = clips.find((entry) => entry.card === 'cow' && entry.kind === 'onomatopoeia');

		expect(clip?.text).toBe('muu');
		expect(clip?.display).toBe('mu');
		expect(clip?.overridden).toBe(true);
		// Nothing else moves.
		expect(clips.filter((entry) => entry.overridden)).toHaveLength(1);
	});

	it('refuses an override filed under a name no card has, rather than ignoring it', () => {
		expect(() => buildPlan(PACK, config({ tts_overrides: { 'cow.wrod': 'krowa' } }))).toThrow(
			UsageError
		);
		expect(() => buildPlan(PACK, config({ tts_overrides: { 'goat.word': 'koza' } }))).toThrow(
			/no card has/
		);
	});

	it('records one card when asked for one card', () => {
		const clips = buildPlan(PACK, config(), { only: 'cow' });

		expect(clips.map((clip) => clip.card)).toEqual(['cow', 'cow']);
	});

	it('refuses a card the pack does not have', () => {
		expect(() => buildPlan(PACK, config(), { only: 'goat' })).toThrow(/no card "goat"/);
	});
});

describe('buildAuditionPlan', () => {
	it('records both jobs of a card for every candidate', () => {
		const takes = buildAuditionPlan(config());

		expect(takes).toHaveLength(4);
		expect(takes.map((take) => take.file)).toEqual([
			'aleksandra.hau-hau.m4a',
			'aleksandra.pies.m4a',
			'michal-k.hau-hau.m4a',
			'michal-k.pies.m4a'
		]);
		expect(new Set(takes.map((take) => take.text))).toEqual(new Set(AUDITION_TEXTS));
	});

	it('refuses two candidates that would be written to the same file', () => {
		expect(() =>
			buildAuditionPlan(config({ audition_voices: { Michał: 'a', Michal: 'b' } }))
		).toThrow(/same file/);
	});

	it('refuses an audition with nobody in it', () => {
		expect(() => buildAuditionPlan(config({ audition_voices: {} }))).toThrow(/no audition_voices/);
	});

	it('folds Polish letters rather than dropping them', () => {
		expect(slug('Michał K.')).toBe('michal-k');
		expect(slug('hau hau')).toBe('hau-hau');
	});
});

describe('blockingReasons', () => {
	const ready = { confirmed: true, apiKey: 'a-key', voiceId: 'a-voice', audition: false };

	it('lets a run through when the key, the voice and the confirmation are all there', () => {
		expect(blockingReasons(ready)).toEqual([]);
	});

	it('refuses without --paid-tier-confirmed, and says what the flag is about', () => {
		expect(blockingReasons({ ...ready, confirmed: false })).toEqual([PAID_TIER_REFUSAL]);
		expect(PAID_TIER_REFUSAL).toContain('free tier');
	});

	it('refuses without a key', () => {
		expect(blockingReasons({ ...ready, apiKey: undefined })).toEqual([MISSING_KEY_REFUSAL]);
		expect(blockingReasons({ ...ready, apiKey: '' })).toEqual([MISSING_KEY_REFUSAL]);
	});

	it('refuses a batch before a voice has been chosen', () => {
		expect(blockingReasons({ ...ready, voiceId: '' })).toEqual([MISSING_VOICE_REFUSAL]);
	});

	it('does not ask an audition for the voice the audition exists to choose', () => {
		expect(blockingReasons({ ...ready, voiceId: '', audition: true })).toEqual([]);
	});

	it('names everything that is missing at once', () => {
		expect(
			blockingReasons({ confirmed: false, apiKey: undefined, voiceId: '', audition: false })
		).toEqual([PAID_TIER_REFUSAL, MISSING_KEY_REFUSAL, MISSING_VOICE_REFUSAL]);
	});
});

describe('the ffmpeg passes', () => {
	it('measures without writing, through the same trim the encode uses', () => {
		const args = measureArgs('/raw/dog.pcm', 'pcm_44100').join(' ');

		expect(args).toContain('-f s16le -ar 44100 -ac 1 -i /raw/dog.pcm');
		expect(args).toContain('silenceremove=');
		expect(args).toContain('areverse');
		expect(args).toContain('loudnorm=I=-18:TP=-2:LRA=7');
		expect(args).toContain('print_format=json');
		expect(args).toContain('-f null');
	});

	it('normalises every clip to the one loudness the app plays at', () => {
		const args = encodeArgs('/raw/dog.pcm', '/packs/dog.m4a', 'pcm_44100', MEASURED).join(' ');

		expect(args).toContain(
			`loudnorm=I=${LOUDNESS.integrated}:TP=${LOUDNESS.truePeak}:LRA=${LOUDNESS.range}`
		);
		expect(args).toContain('measured_I=-21.75:measured_TP=-18.06');
		expect(args).toContain('measured_LRA=0.00:measured_thresh=-31.75');
		expect(args).toContain('offset=0.05:linear=true');
	});

	it('encodes one way only: mono aac, no metadata, reproducible bytes', () => {
		const args = encodeArgs('/raw/dog.pcm', '/packs/dog.m4a', 'pcm_44100', MEASURED);

		expect(args).toContain(String(ENCODE.channels));
		expect(args.join(' ')).toContain(`-ac ${ENCODE.channels} -c:a ${ENCODE.codec}`);
		expect(args.join(' ')).toContain(`-b:a ${ENCODE.bitrate}`);
		expect(args.join(' ')).toContain('-map_metadata -1');
		expect(args.join(' ')).toContain('-fflags +bitexact');
		// The target is written under a temporary name, so the container is
		// stated rather than guessed from the extension.
		expect(args.join(' ')).toContain('-f ipod');
		expect(args[args.length - 1]).toBe('/packs/dog.m4a');
	});

	it('tells ffmpeg what a headerless take is, per configured format', () => {
		expect(measureArgs('/raw/dog.pcm', 'pcm_24000').join(' ')).toContain('-f s16le -ar 24000');
		expect(measureArgs('/raw/dog.mp3', 'mp3_44100_128').join(' ')).not.toContain('s16le');
	});

	it('refuses a format it cannot describe to ffmpeg', () => {
		expect(() => measureArgs('/raw/dog.wav', 'flac')).toThrow(/unsupported output_format/);
	});
});

describe('parseLoudnorm', () => {
	it('reads the measurement out of everything else ffmpeg printed', () => {
		const printed = `Stream #0:0: Audio\n[Parsed_loudnorm_4]\n${JSON.stringify(MEASURED)}\nsize=N/A`;

		expect(parseLoudnorm(printed)).toMatchObject(MEASURED);
	});

	it('calls a silent take a failure rather than normalising the noise floor up', () => {
		const silent = { ...MEASURED, input_i: '-inf' };

		expect(() => parseLoudnorm(JSON.stringify(silent))).toThrow(/silent/);
	});

	it('complains when there is no measurement to read', () => {
		expect(() => parseLoudnorm('ffmpeg version 8.0')).toThrow(/no loudness measurement/);
	});

	it('complains when the measurement is short of a field', () => {
		const partial = { ...MEASURED };
		delete (/** @type {Record<string, unknown>} */ (partial).target_offset);

		expect(() => parseLoudnorm(JSON.stringify(partial))).toThrow(/missing target_offset/);
	});
});

describe('readConfig', () => {
	it('reads the shipped shape', () => {
		const value = readConfig(JSON.stringify(config({ voice_id: ' padded ' })), 'audio.config.json');

		expect(value.voice_id).toBe('padded');
		expect(value.model_id).toBe('eleven_multilingual_v2');
	});

	it('accepts the empty voice_id the config ships with', () => {
		expect(readConfig(JSON.stringify(config({ voice_id: '' })), 'c.json').voice_id).toBe('');
	});

	it('refuses an output format the pipeline could not decode', () => {
		expect(() => readConfig(JSON.stringify(config({ output_format: 'ogg' })), 'c.json')).toThrow(
			/output_format/
		);
	});

	it('refuses a voice setting that is not a number', () => {
		const broken = { ...config(), voice_settings: { stability: 'high' } };

		expect(() => readConfig(JSON.stringify(broken), 'c.json')).toThrow(/voice_settings.stability/);
	});
});

describe('createSpeaker', () => {
	it('asks for the configured voice, model and format, with the key in a header', async () => {
		/** @type {any[]} */
		const calls = [];
		const speak = createSpeaker({
			apiKey: 'a-key',
			config: config(),
			fetch: async (url, init) => {
				calls.push([url, init]);
				return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
			}
		});

		expect(await speak('a-pinned-voice', 'hau hau')).toEqual(new Uint8Array([1, 2, 3]));
		expect(calls[0][0]).toBe(`${SPEECH_ENDPOINT}/a-pinned-voice?output_format=pcm_44100`);
		expect(calls[0][1].headers['xi-api-key']).toBe('a-key');
		expect(JSON.parse(calls[0][1].body)).toEqual({
			text: 'hau hau',
			model_id: 'eleven_multilingual_v2',
			voice_settings: { stability: 0.6, similarity_boost: 0.75, speed: 0.95 }
		});
	});

	it('fails loudly on a refused request instead of writing the error as audio', async () => {
		const speak = createSpeaker({
			apiKey: 'a-key',
			config: config(),
			fetch: async () =>
				new Response('quota exhausted', { status: 401, statusText: 'Unauthorized' })
		});

		await expect(speak('a-pinned-voice', 'pies')).rejects.toThrow(/401 Unauthorized/);
	});

	it('fails on an empty body, which would encode as a clip of nothing', async () => {
		const speak = createSpeaker({
			apiKey: 'a-key',
			config: config(),
			fetch: async () => new Response(new Uint8Array(), { status: 200 })
		});

		await expect(speak('a-pinned-voice', 'pies')).rejects.toThrow(/empty body/);
	});
});
