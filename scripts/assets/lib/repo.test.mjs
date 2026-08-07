// The one rule both asset scripts share: raw material stays outside the
// working tree. Each case names a directory and asks whether the script would
// take it.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { REPO_ROOT, isInsideRepo, refuseInsideRepo, resolveLinks } from './repo.mjs';

/** @type {string[]} */
const made = [];

afterEach(() => {
	while (made.length > 0) rmSync(String(made.pop()), { recursive: true, force: true });
});

/** @returns {string} */
function elsewhere() {
	const directory = mkdtempSync(join(tmpdir(), 'mowlak-raw-'));
	made.push(directory);
	return directory;
}

describe('isInsideRepo', () => {
	it('recognises the working tree itself', () => {
		expect(isInsideRepo(REPO_ROOT)).toBe(true);
	});

	it('recognises a directory the operator might reach for inside it', () => {
		expect(isInsideRepo(join(REPO_ROOT, 'content/packs/images/animals'))).toBe(true);
		expect(isInsideRepo(join(REPO_ROOT, 'raw'))).toBe(true);
	});

	it('accepts a directory outside it', () => {
		expect(isInsideRepo(elsewhere())).toBe(false);
	});

	it('is not fooled by a path that has not been created yet', () => {
		expect(isInsideRepo(join(REPO_ROOT, 'not-there-yet/raw'))).toBe(true);
		expect(isInsideRepo(join(elsewhere(), 'not-there-yet/raw'))).toBe(false);
	});

	it('is not fooled by a link, which is how the temporary directory spells itself', () => {
		const outside = elsewhere();
		expect(resolveLinks(outside)).toBe(resolveLinks(resolveLinks(outside)));
		expect(isInsideRepo(outside)).toBe(false);
	});

	it('does not mistake a sibling whose name starts with the repository name', () => {
		expect(isInsideRepo(`${REPO_ROOT}-raw`)).toBe(false);
	});
});

describe('refuseInsideRepo', () => {
	it('refuses a raw directory in the tree and says why', () => {
		const refusal = refuseInsideRepo('--raw-dir', join(REPO_ROOT, 'raw'));

		expect(refusal).toContain('is inside the repository');
		expect(refusal).toContain('content/packs/');
	});

	it('refuses an audition directory in the tree', () => {
		expect(refuseInsideRepo('--audition', join(REPO_ROOT, 'content/packs'))).toContain(
			'--audition'
		);
	});

	it('has nothing to say about a directory outside it', () => {
		expect(refuseInsideRepo('--raw-dir', elsewhere())).toBeNull();
	});
});
