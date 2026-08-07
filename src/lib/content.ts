// The card packs the app teaches from. They ship as plain files under
// /content, mirrored there from content/packs by scripts/sync-content.mjs,
// so a pack is fetched like any other static asset and works offline.
//
// scripts/validate-content.mjs is the authority on what a valid pack is and
// runs before every build; the checks here are the narrow runtime restatement
// that refuses to hand the player something it cannot show.

/** Bumped only when the pack format changes in a way older builds misread. */
export const SCHEMA_VERSION = 0;

/** Where the synced packs are served from. Paths inside a pack are relative to it. */
export const CONTENT_ROOT = '/content';

/**
 * A card is spoken twice: first the onomatopoeia, then the word. That order
 * is the logopedic path into speech and is not a display preference.
 */
export type LevelKind = 'sound' | 'word';

export type Level = {
	kind: LevelKind;
	/** What the voice says. */
	text: string;
	/** Recording of a human voice saying it, relative to CONTENT_ROOT. */
	audio: string;
};

export type Card = {
	id: string;
	/** The word in the pack's language, as level 2 says it. */
	word: string;
	/** Illustration, relative to CONTENT_ROOT. */
	image: string;
	/** Exactly two, onomatopoeia first. */
	levels: [Level, Level];
	/** The published work the onomatopoeia is taken from. */
	source: string;
	/** Other accepted forms of the onomatopoeia, for the parent to read. */
	variants?: string[];
};

export type Pack = {
	schema_version: typeof SCHEMA_VERSION;
	language: string;
	category: string;
	cards: Card[];
};

/** Thrown for every refusal, so a caller can tell content faults from bugs. */
export class ContentError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = 'ContentError';
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
	return typeof value === 'string' && value !== '';
}

function readLevel(value: unknown, kind: LevelKind, where: string): Level {
	if (!isObject(value) || value.kind !== kind || !isText(value.text) || !isText(value.audio)) {
		throw new ContentError(`${where}: malformed ${kind} level`);
	}
	return { kind, text: value.text, audio: value.audio };
}

function readCard(value: unknown, where: string): Card {
	if (!isObject(value) || !isText(value.id)) {
		throw new ContentError(`${where}: malformed card`);
	}
	const at = `${where}: card "${value.id}"`;
	if (!isText(value.word) || !isText(value.image) || !isText(value.source)) {
		throw new ContentError(`${at}: incomplete card`);
	}
	if (!Array.isArray(value.levels) || value.levels.length !== 2) {
		throw new ContentError(`${at}: a card needs exactly two levels`);
	}
	const card: Card = {
		id: value.id,
		word: value.word,
		image: value.image,
		levels: [readLevel(value.levels[0], 'sound', at), readLevel(value.levels[1], 'word', at)],
		source: value.source
	};
	if (Array.isArray(value.variants) && value.variants.every(isText)) {
		card.variants = value.variants;
	}
	return card;
}

function readPack(value: unknown, language: string, category: string, where: string): Pack {
	if (!isObject(value)) throw new ContentError(`${where}: not a pack`);
	if (value.schema_version !== SCHEMA_VERSION) {
		throw new ContentError(
			`${where}: schema_version ${JSON.stringify(value.schema_version)} is not ${SCHEMA_VERSION}`
		);
	}
	if (value.language !== language || value.category !== category) {
		throw new ContentError(`${where}: declares ${value.language}/${value.category}`);
	}
	if (!Array.isArray(value.cards) || value.cards.length === 0) {
		throw new ContentError(`${where}: holds no cards`);
	}
	return {
		schema_version: SCHEMA_VERSION,
		language,
		category,
		cards: value.cards.map((card) => readCard(card, where))
	};
}

/**
 * Fetches one pack and returns it only if it is whole.
 *
 * @param fetchFn the caller's fetch, so SvelteKit can serve it from the
 *   prerendered payload during a load
 * @throws ContentError when the pack is missing, unreadable, of another
 *   schema version, or malformed
 */
export async function loadPack(
	fetchFn: typeof fetch,
	language: string,
	category: string
): Promise<Pack> {
	const url = `${CONTENT_ROOT}/${language}/${category}.json`;

	let response: Response;
	try {
		response = await fetchFn(url);
	} catch (cause) {
		throw new ContentError(`${url}: unreachable`, { cause });
	}
	if (!response.ok) throw new ContentError(`${url}: responded ${response.status}`);

	let body: unknown;
	try {
		body = await response.json();
	} catch (cause) {
		throw new ContentError(`${url}: not valid JSON`, { cause });
	}
	return readPack(body, language, category, url);
}
