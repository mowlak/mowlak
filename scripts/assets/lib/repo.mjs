// Where the repository is, and — the part the pipeline actually needs —
// what is outside it.
//
// Raw material never enters this repository: not the takes that were not
// chosen, not the downloads straight out of an image tool. What ships is the
// curated, normalised final under content/packs/, and every asset in the tree
// is one a card points at. So both scripts refuse a raw directory or an
// audition directory that lives inside the working tree, and this is where
// that judgement is made — once, for both of them.

import { realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/** The working tree, found from this file rather than from the cwd. */
export const REPO_ROOT = resolve(fileURLToPath(new URL('../../../', import.meta.url)));

/**
 * The path with every symbolic link on it resolved as far as the file system
 * allows: the leading part that exists is resolved, the rest is appended
 * unchanged. Plain string comparison would not do — macOS keeps the temporary
 * directory behind a link, so /tmp/raw and /private/tmp/raw are one place
 * that spells itself two ways, and a check that missed that would be a check
 * an operator could walk straight past.
 *
 * @param {string} path
 * @returns {string}
 */
export function resolveLinks(path) {
	let head = resolve(path);
	/** @type {string[]} */
	const tail = [];
	for (;;) {
		try {
			return join(realpathSync(head), ...tail);
		} catch {
			const parent = dirname(head);
			// The root of the file system exists, so this is unreachable in
			// practice; it is here so a malformed path cannot spin forever.
			if (parent === head) return join(head, ...tail);
			tail.unshift(basename(head));
			head = parent;
		}
	}
}

/**
 * @param {string} path
 * @param {string} root
 * @returns {boolean}
 */
export function isInsideRepo(path, root = REPO_ROOT) {
	const step = relative(resolveLinks(root), resolveLinks(path));
	return step === '' || (!step.startsWith('..') && !isAbsolute(step));
}

/**
 * @param {string} label how the directory was named on the command line
 * @param {string} path
 * @param {string} root
 * @returns {string | null} the refusal to print, or null when the path is fine
 */
export function refuseInsideRepo(label, path, root = REPO_ROOT) {
	if (!isInsideRepo(path, root)) return null;
	return (
		`${label} ${JSON.stringify(path)} is inside the repository. Raw and audition ` +
		'material stays out of the working tree — only curated, normalised finals ' +
		'belong in content/packs/. Point it at a directory elsewhere.'
	);
}

/**
 * Reads a gitignored .env at the root of the working tree, if there is one,
 * so a key can live in a file the operator already keeps rather than in every
 * shell they open. Variables already set in the environment win, which is
 * Node's own rule for --env-file and the one that lets a one-off run override
 * the file without editing it.
 *
 * @param {string} root
 * @returns {boolean} whether a file was read
 */
export function loadEnvFile(root = REPO_ROOT) {
	try {
		process.loadEnvFile(join(root, '.env'));
		return true;
	} catch {
		// No file, or one this Node cannot parse: the environment is then the
		// only source, and the scripts already say so when a key is missing.
		return false;
	}
}
