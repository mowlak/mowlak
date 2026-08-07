import { en } from './en';
import { pl } from './pl';
import type { Pledge, Section, Strings } from './types';

export type { Pledge, Section, Strings };

// The interface languages the site ships. Everything else derives from
// this list — the type below, the route matcher in src/params/lang.ts and
// the table lookup — so adding a language is one entry here plus the file
// the compiler then demands.
export const langs = ['pl', 'en'] as const;

export type Lang = (typeof langs)[number];

// Accepts the absent case because that is how route parameters are typed:
// the shared page state cannot know which route is rendering, so every
// parameter is optional to it. A missing language is as wrong as an
// unknown one, and this answers both.
export function isLang(value: string | undefined): value is Lang {
	return langs.some((lang) => lang === value);
}

// Both tables are a handful of lines and ship in the same bundle, so a
// page reads its language synchronously: no loading state, no flash of the
// wrong words, and the offline build stays a pile of static files.
const tables: Record<Lang, Strings> = { pl, en };

export function t(lang: Lang): Strings {
	return tables[lang];
}

// Turns a route parameter into a language. The matcher has already
// rejected anything else by the time a page renders, so a bad value here
// means the caller reached the page without routing — a bug worth a stack
// trace rather than a silent guess at what the reader wanted.
export function langFromParam(param: string | undefined): Lang {
	if (!isLang(param)) {
		throw new Error(`Unsupported interface language: ${param}`);
	}

	return param;
}
