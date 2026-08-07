import { describe, expect, it } from 'vitest';
import { en } from './en';
import { pl } from './pl';
import { langFromParam, langs, t } from './index';

// Flattens a string table into `landing.lede` style paths so a failure
// names the entry that is wrong instead of dumping the whole tree.
function leaves(tree: unknown, path: string[] = []): [string, unknown][] {
	if (typeof tree === 'object' && tree !== null) {
		return Object.entries(tree).flatMap(([key, value]) => leaves(value, [...path, key]));
	}

	return [[path.join('.'), tree]];
}

describe('langFromParam', () => {
	it('narrows the two supported interface languages', () => {
		expect(langFromParam('pl')).toBe('pl');
		expect(langFromParam('en')).toBe('en');
	});

	it('throws on anything else, rather than guessing a language', () => {
		expect(() => langFromParam('de')).toThrow('de');
		expect(() => langFromParam('PL')).toThrow('PL');
		expect(() => langFromParam('')).toThrow();
	});

	it('treats an absent parameter as no language at all', () => {
		expect(() => langFromParam(undefined)).toThrow();
	});
});

describe('t', () => {
	it('hands each language its own table', () => {
		expect(t('pl')).toBe(pl);
		expect(t('en')).toBe(en);
	});
});

// The Strings interface makes a missing key a compile error, so the only
// hole left is a key that exists and says nothing — an empty placeholder
// committed in a hurry. These walks close it for every language at once.
describe.each([
	['pl', pl],
	['en', en]
])('the %s string table', (_name, table) => {
	it('says something at every leaf, or nothing on purpose', () => {
		const entries = leaves(table);
		expect(entries.length).toBeGreaterThan(0);

		for (const [path, value] of entries) {
			// null is the one way a language may stay silent: a sentence that
			// only one language needs. It is spelt out in the table, so the
			// silence is a decision rather than an oversight.
			if (value === null) continue;

			expect(value, path).toBeTypeOf('string');
			expect((value as string).trim(), path).not.toBe('');
		}
	});
});

// The entries above are few enough to name, and naming them keeps the
// exception from spreading: a null that appears anywhere else fails the
// walk, and a null that appears here in English fails this.
describe('the sentences one language does not need', () => {
	it('leaves Polish silent about the content language and the name', () => {
		expect(pl.landing.note).toBeNull();
		expect(pl.landing.name).toBeNull();
	});

	it('has English say both', () => {
		expect(en.landing.note).toBeTypeOf('string');
		expect(en.landing.name).not.toBeNull();
	});
});

describe('the language list', () => {
	it('covers every table the site ships', () => {
		expect([...langs].sort()).toEqual(['en', 'pl']);
	});
});
