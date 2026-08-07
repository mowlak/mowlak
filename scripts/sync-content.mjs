#!/usr/bin/env node
// Mirrors content/packs/ into static/content/, from where the build serves
// the packs as plain files at /content/. The packs stay outside static/ so
// the source of truth reads as content rather than as build input, and
// static/content/ stays out of version control.
//
// Runs before `dev` and `build`. It is idempotent and it removes files the
// packs no longer contain, so a renamed card cannot linger in a preview.

import { copyFileSync, mkdirSync, readdirSync, rmSync, rmdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = fileURLToPath(new URL('../content/packs', import.meta.url));
const DESTINATION = fileURLToPath(new URL('../static/content', import.meta.url));

/**
 * @typedef {object} Tree
 * @property {string[]} files paths relative to the root, forward slashes
 * @property {string[]} directories paths relative to the root, deepest last
 */

/**
 * @param {string} root
 * @param {string} prefix
 * @returns {Tree}
 */
function walk(root, prefix = '') {
	/** @type {Tree} */
	const tree = { files: [], directories: [] };
	/** @type {import('node:fs').Dirent[]} */
	let entries;
	try {
		entries = readdirSync(prefix === '' ? root : `${root}/${prefix}`, { withFileTypes: true });
	} catch {
		return tree;
	}
	for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
		// Dot files are editor and platform droppings, never content.
		if (entry.name.startsWith('.')) continue;
		const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
		if (entry.isDirectory()) {
			tree.directories.push(path);
			const nested = walk(root, path);
			tree.files.push(...nested.files);
			tree.directories.push(...nested.directories);
		} else {
			tree.files.push(path);
		}
	}
	return tree;
}

/**
 * Copying is skipped when the destination already matches, so a dev server
 * watching static/ is not woken on every restart.
 *
 * @param {string} from
 * @param {string} to
 * @returns {boolean} whether the file had to be written
 */
function copyIfStale(from, to) {
	const source = statSync(from);
	try {
		const destination = statSync(to);
		if (destination.size === source.size && destination.mtimeMs >= source.mtimeMs) return false;
	} catch {
		// Not there yet.
	}
	mkdirSync(dirname(to), { recursive: true });
	copyFileSync(from, to);
	return true;
}

function main() {
	const source = walk(SOURCE);
	const destination = walk(DESTINATION);
	const wanted = new Set(source.files);

	let written = 0;
	for (const file of source.files) {
		if (copyIfStale(`${SOURCE}/${file}`, `${DESTINATION}/${file}`)) written += 1;
	}

	let removed = 0;
	for (const file of destination.files) {
		if (wanted.has(file)) continue;
		rmSync(`${DESTINATION}/${file}`);
		removed += 1;
	}
	// Deepest first, so a directory emptied by the loop above goes too.
	for (const directory of [...destination.directories].reverse()) {
		try {
			rmdirSync(`${DESTINATION}/${directory}`);
		} catch {
			// Still holds something that belongs there.
		}
	}

	console.log(
		`content: ${source.files.length} files in static/content ` +
			`(${written} written, ${removed} removed)`
	);
}

main();
