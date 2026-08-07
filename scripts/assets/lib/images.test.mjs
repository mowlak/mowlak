// What the importer would take and what it would turn away. The picks file is
// written by hand against a directory of downloads, so most of these cases are
// about a hand-written file being wrong in an ordinary way.

import { describe, expect, it } from 'vitest';
import { UsageError } from './args.mjs';
import {
	BACKGROUND,
	CANVAS,
	buildImportPlan,
	convertArgs,
	isSquareEnough,
	parseSize,
	readPicks,
	replaceImagePath,
	targetFor
} from './images.mjs';

const PACK = {
	language: 'pl',
	category: 'animals',
	cards: [
		{ id: 'dog', image: 'images/animals/dog.svg' },
		{ id: 'cow', image: 'images/animals/cow.svg' }
	]
};

const PACK_TEXT = JSON.stringify(PACK, null, '\t');

/**
 * @param {Record<string, string>} picks
 * @param {string[]} present file names sitting in the raw directory
 * @returns {{ entries: import('./images.mjs').Entry[], problems: string[] }}
 */
function plan(picks, present = ['dog-3.png', 'cow-1.png']) {
	return buildImportPlan(PACK, PACK_TEXT, picks, {
		rawDir: '/elsewhere/raw',
		exists: (path) => present.some((file) => path === `/elsewhere/raw/${file}`)
	});
}

describe('buildImportPlan', () => {
	it('files each pick under its card id, whatever the download was called', () => {
		const { entries, problems } = plan({ dog: 'dog-3.png', cow: 'cow-1.png' });

		expect(problems).toEqual([]);
		expect(entries.map((entry) => entry.target)).toEqual([
			'images/animals/dog.png',
			'images/animals/cow.png'
		]);
		expect(entries[0].source).toBe('/elsewhere/raw/dog-3.png');
		expect(entries[0].previous).toBe('images/animals/dog.svg');
		expect(entries[0].replaces).toBe(true);
	});

	it('refuses a card the pack does not have', () => {
		const { entries, problems } = plan({ dog: 'dog-3.png', goat: 'cow-1.png' });

		expect(problems).toEqual(['goat: the pack has no such card']);
		expect(entries.map((entry) => entry.card)).toEqual(['dog']);
	});

	it('refuses a pick that is not in the raw directory', () => {
		expect(plan({ dog: 'dog-9.png' }).problems).toEqual([
			'dog: "dog-9.png" is not in the raw directory'
		]);
	});

	it('refuses a pick that reaches out of the raw directory', () => {
		expect(plan({ dog: '../elsewhere/dog.png' }).problems[0]).toContain(
			'must be a file name in the raw directory'
		);
		expect(plan({ dog: 'nested/dog.png' }).problems[0]).toContain('must be a file name');
	});

	it('collects every problem, so a hand-written picks file is fixed in one pass', () => {
		const { problems } = plan({ goat: 'x.png', frog: 'y.png', dog: 'missing.png' });

		expect(problems).toHaveLength(3);
	});

	it('is idempotent: a card already importing keeps pointing where it points', () => {
		const imported = {
			...PACK,
			cards: [{ id: 'dog', image: 'images/animals/dog.png' }]
		};
		const { entries } = buildImportPlan(
			imported,
			JSON.stringify(imported),
			{ dog: 'dog-3.png' },
			{
				rawDir: '/elsewhere/raw',
				exists: () => true
			}
		);

		expect(entries[0].target).toBe('images/animals/dog.png');
		expect(entries[0].replaces).toBe(false);
	});
});

describe('readPicks', () => {
	it('reads a map of card id to file name', () => {
		expect(readPicks('{"dog": "dog-3.png"}', 'picks.json')).toEqual({ dog: 'dog-3.png' });
	});

	it('refuses a list, which is what a picks file is most likely to be by mistake', () => {
		expect(() => readPicks('["dog-3.png"]', 'picks.json')).toThrow(UsageError);
	});

	it('refuses an entry that names no file', () => {
		expect(() => readPicks('{"dog": ""}', 'picks.json')).toThrow(/"dog" must name a file/);
	});

	it('says which file will not parse', () => {
		expect(() => readPicks('{ nope', 'picks.json')).toThrow(/^picks\.json: not valid JSON/);
	});
});

describe('isSquareEnough', () => {
	it('accepts a square and the couple of percent either side of one', () => {
		expect(isSquareEnough(1024, 1024)).toBe(true);
		expect(isSquareEnough(1024, 1005)).toBe(true);
	});

	it('turns away anything that would visibly stretch the animal', () => {
		expect(isSquareEnough(1024, 960)).toBe(false);
		expect(isSquareEnough(1600, 900)).toBe(false);
		expect(isSquareEnough(0, 0)).toBe(false);
	});
});

describe('convertArgs', () => {
	it('redraws every picture at one size on the one background', () => {
		const args = convertArgs('/elsewhere/raw/dog-3.png', '/packs/images/animals/dog.png').join(' ');

		expect(args).toContain(`color=c=${BACKGROUND}:s=${CANVAS}x${CANVAS},format=rgb24`);
		expect(args).toContain(`scale=${CANVAS}:${CANVAS}:flags=lanczos`);
		expect(args).toContain('overlay=0:0');
	});

	it('strips whatever the tool that made it wrote into it', () => {
		const args = convertArgs('/raw/dog.png', '/packs/dog.png').join(' ');

		expect(args).toContain('-map_metadata -1');
		expect(args).toContain('-fflags +bitexact');
		expect(args).toContain('-c:v png');
	});
});

describe('parseSize', () => {
	it('reads what ffprobe printed', () => {
		expect(parseSize('1024,1024\n')).toEqual({ width: 1024, height: 1024 });
	});

	it('complains rather than importing a file it could not measure', () => {
		expect(() => parseSize('')).toThrow(/could not read the image size/);
	});
});

describe('replaceImagePath', () => {
	it('changes one value and leaves the rest of the file byte for byte', () => {
		const updated = replaceImagePath(PACK_TEXT, 'images/animals/dog.svg', 'images/animals/dog.png');

		expect(JSON.parse(updated).cards[0].image).toBe('images/animals/dog.png');
		expect(updated.replace('dog.png', 'dog.svg')).toBe(PACK_TEXT);
	});

	it('refuses to guess when the path is not unique', () => {
		expect(() =>
			replaceImagePath(`${PACK_TEXT}${PACK_TEXT}`, 'images/animals/dog.svg', 'x')
		).toThrow(/exactly once/);
	});
});

describe('targetFor', () => {
	it('keeps the picture beside its category and names it after the card', () => {
		expect(targetFor('images/animals/dog.svg', 'dog')).toBe('images/animals/dog.png');
		expect(targetFor('images/vehicles/bus.png', 'bus')).toBe('images/vehicles/bus.png');
	});
});
