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
	it('says something at every leaf', () => {
		const entries = leaves(table);
		expect(entries.length).toBeGreaterThan(0);

		for (const [path, value] of entries) {
			expect(value, path).toBeTypeOf('string');
			expect((value as string).trim(), path).not.toBe('');
		}
	});
});

describe('the language list', () => {
	it('covers every table the site ships', () => {
		expect([...langs].sort()).toEqual(['en', 'pl']);
	});
});
