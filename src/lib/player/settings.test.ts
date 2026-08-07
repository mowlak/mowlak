import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_KEY, readSettings, writeSettings } from './settings';

/** Enough of the Storage interface for the two calls this module makes. */
function fakeStorage(seed: Record<string, string> = {}): Storage {
	const held = new Map(Object.entries(seed));

	return {
		getItem: (key) => held.get(key) ?? null,
		setItem: (key, value) => void held.set(key, value),
		removeItem: (key) => void held.delete(key),
		clear: () => held.clear(),
		key: (index) => [...held.keys()][index] ?? null,
		get length() {
			return held.size;
		}
	};
}

/** Storage that is present but refuses every call, as a private window can. */
function blockedStorage(): Storage {
	const refuse = () => {
		throw new DOMException('storage is not available', 'SecurityError');
	};

	return {
		getItem: refuse,
		setItem: refuse,
		removeItem: refuse,
		clear: refuse,
		key: refuse,
		get length(): number {
			return refuse();
		}
	};
}

describe('reading the parent preference', () => {
	it('starts at the onomatopoeia, which is the way into speech', () => {
		expect(DEFAULT_SETTINGS.level).toBe('onomatopoeia');
	});

	it('round-trips a choice through storage', () => {
		const storage = fakeStorage();

		writeSettings({ level: 'word' }, storage);

		expect(readSettings(storage)).toEqual({ level: 'word' });
	});

	it('writes one key, and only that key', () => {
		const storage = fakeStorage();

		writeSettings({ level: 'word' }, storage);

		expect(storage.length).toBe(1);
		expect(storage.getItem(SETTINGS_KEY)).toBe('{"level":"word"}');
	});

	it('falls back to the defaults when nothing was ever stored', () => {
		expect(readSettings(fakeStorage())).toEqual(DEFAULT_SETTINGS);
	});

	it('falls back silently when the stored value is not JSON', () => {
		expect(readSettings(fakeStorage({ [SETTINGS_KEY]: '{level:' }))).toEqual(DEFAULT_SETTINGS);
	});

	it.each([
		['a bare string', '"word"'],
		['null', 'null'],
		['an array', '["word"]'],
		['an object without a level', '{"volume":3}'],
		['a level this build does not ship', '{"level":"sentence"}'],
		['a level of the wrong type', '{"level":7}']
	])('falls back silently on %s', (_name, stored) => {
		expect(readSettings(fakeStorage({ [SETTINGS_KEY]: stored }))).toEqual(DEFAULT_SETTINGS);
	});

	it('falls back when there is no storage at all', () => {
		expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
	});

	it('falls back when storage refuses to be read', () => {
		expect(readSettings(blockedStorage())).toEqual(DEFAULT_SETTINGS);
	});

	it('hands out its own copy, so a caller cannot edit the defaults', () => {
		const settings = readSettings(null);
		settings.level = 'word';

		expect(DEFAULT_SETTINGS.level).toBe('onomatopoeia');
	});
});

describe('writing the parent preference', () => {
	it('says nothing when storage refuses, rather than breaking the app', () => {
		expect(() => writeSettings({ level: 'word' }, blockedStorage())).not.toThrow();
	});

	it('says nothing when there is no storage at all', () => {
		expect(() => writeSettings({ level: 'word' }, null)).not.toThrow();
	});
});
