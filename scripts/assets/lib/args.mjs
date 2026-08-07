// A command line small enough to read in one sitting.
//
// The scripts here are run by hand, rarely, and they spend money and rewrite
// content when they run, so the parser is deliberately strict: a misspelled
// option is an error rather than a silently ignored word. Nothing is inferred
// from position — every input is named.

/** Raised for anything the operator can fix by retyping the command. */
export class UsageError extends Error {}

/**
 * @param {string} argument
 * @returns {[string, string | undefined]} the name and its inline value
 */
function split(argument) {
	const at = argument.indexOf('=');
	return at === -1 ? [argument, undefined] : [argument.slice(0, at), argument.slice(at + 1)];
}

/**
 * @param {string[]} argv arguments after the script name
 * @param {{ flags: string[], options: string[] }} spec names taking no value, and names taking one
 * @returns {Record<string, string | true>}
 */
export function parseArgs(argv, spec) {
	/** @type {Record<string, string | true>} */
	const given = {};

	for (let index = 0; index < argv.length; index += 1) {
		const argument = String(argv[index]);
		const [name, inline] = split(argument);
		if (!name.startsWith('--')) throw new UsageError(`unexpected argument ${JSON.stringify(name)}`);

		const key = name.slice(2);
		if (key in given) throw new UsageError(`${name} was given twice`);

		if (spec.flags.includes(key)) {
			if (inline !== undefined) throw new UsageError(`${name} takes no value`);
			given[key] = true;
			continue;
		}
		if (!spec.options.includes(key)) throw new UsageError(`unknown option ${JSON.stringify(name)}`);

		const value = inline ?? argv[index + 1];
		// A value that looks like another option is far more likely to be a
		// forgotten argument than a directory called --force.
		if (value === undefined || value.startsWith('--')) {
			throw new UsageError(`${name} needs a value`);
		}
		if (inline === undefined) index += 1;
		given[key] = value;
	}

	return given;
}

/**
 * @param {Record<string, string | true>} given
 * @param {string} key
 * @returns {string | undefined}
 */
export function text(given, key) {
	const value = given[key];
	if (value === undefined) return undefined;
	if (value === true) throw new UsageError(`--${key} needs a value`);
	return value;
}
