// What the importer would take from a directory of home recordings and what it
// would turn away, checked against a fixture pack and a fixture listing —
// without ffmpeg and without touching a file. The exports are made by hand at
// the end of a recording session, so most of these cases are about a directory
// being wrong in an ordinary way.

import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UsageError } from './args.mjs';
import { ENCODE, LOUDNESS, encodeArgs, measureArgs } from './audio.mjs';
import {
	RECORDING_EXTENSIONS,
	buildRecordingPlan,
	encodeRecordingArgs,
	measureRecordingArgs,
	takeName
} from './recordings.mjs';
import { REPO_ROOT, refuseInsideRepo } from './repo.mjs';

const MEASURED = {
	input_i: '-21.75',
	input_tp: '-18.06',
	input_lra: '0.00',
	input_thresh: '-31.75',
	target_offset: '0.05'
};

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
			{ kind: 'sound', text: onomatopoeia, audio: `pl/audio/animals/${id}.sound.m4a` },
			{ kind: 'word', text: word, audio: `pl/audio/animals/${id}.word.m4a` }
		]
	};
}

const PACK = { cards: [card('dog', 'hau hau', 'pies'), card('cow', 'mu', 'krowa')] };

const EVERY_TAKE = ['dog.sound.wav', 'dog.word.wav', 'cow.sound.wav', 'cow.word.wav'];

/**
 * @param {string[]} files
 * @param {{ only?: string, present?: (path: string) => boolean }} options
 * @returns {{ takes: import('./recordings.mjs').Take[], problems: string[], total: number }}
 */
function plan(files, options = {}) {
	return buildRecordingPlan(PACK, files, options);
}

describe('buildRecordingPlan', () => {
	it('files each recording under the clip its name says, whatever order they arrive in', () => {
		const { takes, problems, total } = plan(EVERY_TAKE);

		expect(problems).toEqual([]);
		expect(total).toBe(4);
		// In pack order, not directory order: the plan reads like the pack.
		expect(takes.map((take) => take.path)).toEqual([
			'pl/audio/animals/dog.sound.m4a',
			'pl/audio/animals/dog.word.m4a',
			'pl/audio/animals/cow.sound.m4a',
			'pl/audio/animals/cow.word.m4a'
		]);
		expect(takes.map((take) => take.file)).toEqual([
			'dog.sound.wav',
			'dog.word.wav',
			'cow.sound.wav',
			'cow.word.wav'
		]);
		expect(takes[0].text).toBe('hau hau');
	});

	it('replaces the clip a card already plays, and writes where there is none', () => {
		const { takes } = plan(EVERY_TAKE, {
			present: (path) => path === 'pl/audio/animals/dog.sound.m4a'
		});

		expect(takes.map((take) => take.action)).toEqual(['replace', 'write', 'write', 'write']);
	});

	it('takes what is there and names what is not, so one flubbed take can be redone alone', () => {
		const { takes, problems, total } = plan(['dog.sound.wav']);

		expect(problems).toEqual([]);
		expect(total).toBe(4);
		expect(takes.map((take) => take.action)).toEqual(['write', 'missing', 'missing', 'missing']);
		expect(
			takes.filter((take) => take.action === 'missing').every((take) => take.file === '')
		).toBe(true);
	});

	it('reads the containers a recorder is likely to export, whatever the case', () => {
		const { takes, problems } = plan(['dog.sound.WAV', 'dog.word.flac', 'cow.sound.aiff']);

		expect(problems).toEqual([]);
		expect(takes.slice(0, 3).map((take) => take.action)).toEqual(['write', 'write', 'write']);
		expect(RECORDING_EXTENSIONS).toContain('wav');
	});

	it('refuses a file whose name is not a clip, rather than passing over it in silence', () => {
		const { problems } = plan(['dog-sound-final.wav', 'goat.sound.wav', 'dog.bark.wav']);

		expect(problems).toHaveLength(3);
		expect(problems[0]).toContain('no clip is called "dog-sound-final"');
		expect(problems[0]).toContain('<card-id>.<kind>.<ext>');
		expect(problems[1]).toContain('"goat.sound.wav"');
	});

	it('refuses a file it could not decode, and says what it reads', () => {
		const { problems } = plan(['dog.sound.ogg', 'notes.txt']);

		expect(problems).toHaveLength(2);
		expect(problems[0]).toContain('not a recording this pipeline reads');
		expect(problems[0]).toContain('wav, aiff, flac, m4a, mp3');
	});

	it('refuses two files claiming one clip rather than choosing between them', () => {
		const { problems } = plan(['dog.sound.wav', 'dog.sound.flac']);

		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain('already the take for dog.sound');
	});

	it('collects every problem, so a directory of exports is fixed in one pass', () => {
		const { problems, takes } = plan(['dog.sound.wav', 'goat.word.wav', 'sheep.sound.ogg']);

		expect(problems).toHaveLength(2);
		// What is well named still imports once the directory is put right.
		expect(takes[0].action).toBe('write');
	});

	it('ignores what the platform leaves in a directory', () => {
		const { takes, problems } = plan(['.DS_Store', 'dog.sound.wav']);

		expect(problems).toEqual([]);
		expect(takes[0].file).toBe('dog.sound.wav');
	});

	it('imports one card when asked for one card, and still counts the whole pack', () => {
		const { takes, total } = plan(EVERY_TAKE, { only: 'cow' });

		expect(takes.map((take) => take.card)).toEqual(['cow', 'cow']);
		// The pack is still four clips, and the summary has to say so: a run
		// that narrowed itself is exactly the run that leaves a pack in two
		// voices.
		expect(total).toBe(4);
	});

	it('judges the names of every file, not only the ones --only selected', () => {
		expect(plan(['cow.sound.wav', 'dog-sound.wav'], { only: 'cow' }).problems).toHaveLength(1);
	});

	it('refuses a card the pack does not have', () => {
		expect(() => plan(EVERY_TAKE, { only: 'goat' })).toThrow(UsageError);
		expect(() => plan(EVERY_TAKE, { only: 'goat' })).toThrow(/no card "goat"/);
	});
});

describe('takeName', () => {
	it('is the whole naming contract: the card, the level, and nothing else', () => {
		expect(takeName('dog', 'sound')).toBe('dog.sound');
		expect(takeName('rooster', 'word')).toBe('rooster.word');
	});
});

describe('the ffmpeg passes', () => {
	it('is the same chain the rest of the pack went through, not a second one', () => {
		// A take that arrived as an mp3 from the speech service needs no
		// description either, so the two commands have to come out identical
		// once the file names are set aside. That equality is the guarantee:
		// a clip recorded at home cannot be normalised differently from the
		// clip beside it.
		const swap = (/** @type {string[]} */ args, /** @type {string} */ source) =>
			args.map((argument) => (argument === source ? '<source>' : argument));

		expect(swap(measureRecordingArgs('/takes/dog.sound.wav'), '/takes/dog.sound.wav')).toEqual(
			swap(measureArgs('/raw/dog.mp3', 'mp3_44100_128'), '/raw/dog.mp3')
		);
		expect(
			swap(
				encodeRecordingArgs('/takes/dog.sound.wav', '/packs/dog.m4a', MEASURED),
				'/takes/dog.sound.wav'
			)
		).toEqual(
			swap(encodeArgs('/raw/dog.mp3', '/packs/dog.m4a', 'mp3_44100_128', MEASURED), '/raw/dog.mp3')
		);
	});

	it('trims and measures without writing, letting ffmpeg read the file for itself', () => {
		const args = measureRecordingArgs('/takes/dog.sound.wav').join(' ');

		expect(args).toContain('-i /takes/dog.sound.wav');
		expect(args).not.toContain('s16le');
		expect(args).toContain('silenceremove=');
		expect(args).toContain('areverse');
		expect(args).toContain(
			`loudnorm=I=${LOUDNESS.integrated}:TP=${LOUDNESS.truePeak}:LRA=${LOUDNESS.range}`
		);
		expect(args).toContain('print_format=json');
		expect(args).toContain('-f null');
	});

	it('normalises to the one loudness and encodes the one way', () => {
		const args = encodeRecordingArgs('/takes/dog.sound.wav', '/packs/dog.m4a', MEASURED);

		expect(args.join(' ')).toContain('measured_I=-21.75:measured_TP=-18.06');
		expect(args.join(' ')).toContain('offset=0.05:linear=true');
		expect(args.join(' ')).toContain(`-ac ${ENCODE.channels} -c:a ${ENCODE.codec}`);
		expect(args.join(' ')).toContain(`-b:a ${ENCODE.bitrate}`);
		expect(args.join(' ')).toContain('-map_metadata -1');
		expect(args.join(' ')).toContain('-fflags +bitexact');
		// The clip is written under a temporary name, so the container is
		// stated rather than guessed from the extension.
		expect(args.join(' ')).toContain('-f ipod');
		expect(args[args.length - 1]).toBe('/packs/dog.m4a');
	});
});

describe('where the recordings may live', () => {
	it('refuses a directory of takes inside the working tree', () => {
		const refusal = refuseInsideRepo('--raw-dir', join(REPO_ROOT, 'content/packs/pl/audio'));

		expect(refusal).toContain('is inside the repository');
		expect(refusal).toContain('--raw-dir');
	});

	it('has nothing to say about one outside it', () => {
		expect(refuseInsideRepo('--raw-dir', join(REPO_ROOT, '..', 'mowlak-takes'))).toBeNull();
	});
});
