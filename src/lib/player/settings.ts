import type { LevelKind } from '../content';

/**
 * The one key this app writes, in the one store it touches: a single
 * preference the parent set, on the parent's own device. Nothing is
 * collected and nothing is sent, so there is correspondingly nothing for
 * anyone to consent to.
 */
export const SETTINGS_KEY = 'mowlak:settings';

export interface Settings {
	/** Which of a card's two levels the picture speaks. */
	level: LevelKind;
}

/**
 * Onomatopoeia first. That is the logopedic path into speech for a late
 * talker rather than a display preference, so it is also what an app with
 * nothing remembered does.
 */
export const DEFAULT_SETTINGS: Settings = { level: 'sound' };

const LEVELS: readonly LevelKind[] = ['sound', 'word'];

function isLevel(value: unknown): value is LevelKind {
	return LEVELS.some((known) => known === value);
}

/**
 * The browser's store, or nothing at all. Merely reaching for `localStorage`
 * can throw where storage is blocked outright, so even that is guarded.
 */
function defaultStorage(): Storage | null {
	try {
		return globalThis.localStorage ?? null;
	} catch {
		return null;
	}
}

/**
 * Reads the stored preference. Everything unreadable — absent, blocked, not
 * JSON, JSON of the wrong shape, a level this build no longer ships — is
 * answered with the defaults and no complaint: whoever opened this came to
 * use the app with a child, not to be told about a storage fault.
 */
export function readSettings(storage: Storage | null = defaultStorage()): Settings {
	let raw: string | null;
	try {
		raw = storage?.getItem(SETTINGS_KEY) ?? null;
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
	if (raw === null) return { ...DEFAULT_SETTINGS };

	let stored: unknown;
	try {
		stored = JSON.parse(raw);
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
	if (typeof stored !== 'object' || stored === null) return { ...DEFAULT_SETTINGS };

	const { level } = stored as { level?: unknown };

	return isLevel(level) ? { level } : { ...DEFAULT_SETTINGS };
}

/** Remembers the preference, or silently does not when storage refuses. */
export function writeSettings(
	settings: Settings,
	storage: Storage | null = defaultStorage()
): void {
	try {
		storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch {
		// A private window and a full quota both land here. The choice holds
		// for this session and is forgotten afterwards, which is a smaller
		// failure than an app that stops working over a stored preference.
	}
}
