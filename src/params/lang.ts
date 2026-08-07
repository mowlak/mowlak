import type { ParamMatcher } from '@sveltejs/kit';
import { isLang } from '$lib/i18n';

// The set of languages lives with the string tables, so a language that
// has no translations can never be reachable by URL.
export const match: ParamMatcher = (param) => isLang(param);
