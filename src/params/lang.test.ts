import { describe, expect, it } from 'vitest';
import { match } from './lang';

describe('the lang route matcher', () => {
	it('accepts the two supported interface languages', () => {
		expect(match('pl')).toBe(true);
		expect(match('en')).toBe(true);
	});

	it('rejects any other language tag', () => {
		expect(match('de')).toBe(false);
		expect(match('uk')).toBe(false);
		expect(match('pl-PL')).toBe(false);
	});

	it('rejects casing variants, so every language has exactly one URL', () => {
		expect(match('PL')).toBe(false);
		expect(match('En')).toBe(false);
	});

	it('rejects the empty segment and sibling routes', () => {
		expect(match('')).toBe(false);
		expect(match('app')).toBe(false);
	});
});
