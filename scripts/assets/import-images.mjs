#!/usr/bin/env node
// Brings chosen pictures into a pack: one size, one background, no metadata,
// and the card pointed at the result.
//
// The pictures themselves are made outside this repository — the runbook in
// scripts/assets/README.md holds the style anchor that keeps a set of them
// looking like a set. What arrives here is a directory of downloads and a
// picks file saying which one won for which card. Everything that was not
// picked stays outside; only the twelve finals enter the tree.
//
//     node scripts/assets/import-images.mjs --raw-dir ~/mowlak-raw \
//         --picks ~/mowlak-raw/picks.json --dry-run
//     node scripts/assets/import-images.mjs --raw-dir ~/mowlak-raw \
//         --picks ~/mowlak-raw/picks.json
//
// It needs ffmpeg and ffprobe on the PATH (or in $FFMPEG and $FFPROBE).

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { UsageError, parseArgs, text } from './lib/args.mjs';
import { describe } from './lib/audio.mjs';
import {
	buildImportPlan,
	convertArgs,
	isSquareEnough,
	parseSize,
	probeArgs,
	readPicks,
	replaceImagePath
} from './lib/images.mjs';
import { REPO_ROOT, loadEnvFile, refuseInsideRepo } from './lib/repo.mjs';
import { validateContent } from '../../content/validate-content.mjs';

const PACK_ROOT = join(REPO_ROOT, 'content/packs');
const DEFAULT_PACK = join(PACK_ROOT, 'pl/animals.json');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const FFPROBE = process.env.FFPROBE ?? 'ffprobe';

const USAGE = `usage: node scripts/assets/import-images.mjs --raw-dir <dir> --picks <file> [options]

  --raw-dir <dir>   the downloads to pick from; must be outside the repository
  --picks <file>    JSON, card id to a file name inside the raw directory
  --dry-run         print the plan and stop; nothing is written
  --pack <file>     a pack other than content/packs/pl/animals.json`;

const SPEC = {
	flags: ['dry-run', 'help'],
	options: ['raw-dir', 'picks', 'pack']
};

/**
 * ffprobe answers on stdout and complains on stderr, so both are captured;
 * spawnSync hands back both whether or not the run succeeded.
 *
 * @param {string} program
 * @param {string[]} args
 * @returns {string} what it printed on stdout
 */
function run(program, args) {
	const result = spawnSync(program, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	if (result.error !== undefined) {
		throw new Error(
			`cannot run ${program}; install ffmpeg or set FFMPEG and FFPROBE to their paths`
		);
	}
	if (result.status !== 0) {
		const tail = String(result.stderr ?? '')
			.trimEnd()
			.split('\n')
			.slice(-3)
			.join('; ');
		throw new Error(`${basename(program)} failed${tail === '' ? '' : `: ${tail}`}`);
	}
	return String(result.stdout ?? '');
}

/**
 * Written under a dotted temporary name and renamed once ffmpeg is done, so a
 * run that dies halfway never leaves a half-written picture where a card
 * points — and never leaves a stray file the content validator would report as
 * an orphan, because it skips dot files.
 *
 * @param {import('./lib/images.mjs').Entry} entry
 * @returns {void}
 */
function convert(entry) {
	const { width, height } = parseSize(run(FFPROBE, probeArgs(entry.source)));
	if (!isSquareEnough(width, height)) {
		throw new Error(
			`${width}x${height} is not square; a card is drawn square and would stretch it`
		);
	}

	const target = join(PACK_ROOT, entry.target);
	const temporary = join(dirname(target), `.${basename(target)}.${process.pid}.tmp.png`);
	mkdirSync(dirname(target), { recursive: true });
	try {
		run(FFMPEG, convertArgs(entry.source, temporary));
		renameSync(temporary, target);
	} finally {
		rmSync(temporary, { force: true });
	}
}

/**
 * @param {Record<string, string | true>} given
 * @returns {number} the exit code
 */
function importRun(given) {
	const rawDirGiven = text(given, 'raw-dir');
	const picksGiven = text(given, 'picks');
	if (rawDirGiven === undefined) throw new UsageError('--raw-dir is required');
	if (picksGiven === undefined) throw new UsageError('--picks is required');

	const rawDir = resolve(rawDirGiven);
	const refusal = refuseInsideRepo('--raw-dir', rawDir);
	if (refusal !== null) {
		console.error(`refusing: ${refusal}`);
		return 1;
	}
	if (!existsSync(rawDir)) {
		console.error(`--raw-dir ${JSON.stringify(rawDir)} does not exist`);
		return 1;
	}

	const picksPath = resolve(picksGiven);
	const picks = readPicks(readFileSync(picksPath, 'utf8'), basename(picksPath));
	const packPath = resolve(text(given, 'pack') ?? DEFAULT_PACK);
	const packText = readFileSync(packPath, 'utf8');
	const pack = JSON.parse(packText);

	const { entries, problems } = buildImportPlan(pack, packText, picks, {
		rawDir,
		exists: existsSync
	});
	if (problems.length > 0) {
		for (const problem of problems) console.error(`refusing: ${problem}`);
		return 1;
	}

	console.log(`${pack.language}/${pack.category}: ${entries.length} pictures from ${rawDir}`);
	for (const entry of entries) {
		console.log(
			`  ${entry.card.padEnd(9)} ${entry.file.padEnd(28)} -> ${entry.target}` +
				(entry.replaces ? `, drops ${entry.previous}` : '')
		);
	}
	if (given['dry-run'] === true) {
		console.log('dry run: nothing was written');
		return 0;
	}

	let updated = packText;
	let failed = 0;
	for (const entry of entries) {
		try {
			convert(entry);
			if (entry.replaces) {
				updated = replaceImagePath(updated, entry.previous, entry.target);
				rmSync(join(PACK_ROOT, entry.previous), { force: true });
			}
			console.log(`  wrote ${entry.target}`);
		} catch (error) {
			// One picture that will not convert should not cost the rest their
			// import, and the pack is only told about the ones that worked.
			console.error(`  ${entry.card}: ${describe(error)}`);
			failed += 1;
		}
	}
	if (updated !== packText) writeFileSync(packPath, updated);

	// The pack now says something new about what it ships, so it is checked
	// before the operator is told the run went well.
	const report = validateContent(PACK_ROOT);
	for (const violation of report.violations) console.error(violation);
	console.log(
		`images: ${entries.length - failed} of ${entries.length} written to content/packs; ` +
			`content ${report.violations.length === 0 ? 'valid' : `has ${report.violations.length} violation(s)`}`
	);
	return failed === 0 && report.violations.length === 0 ? 0 : 1;
}

function main() {
	loadEnvFile();

	/** @type {Record<string, string | true>} */
	let given;
	try {
		given = parseArgs(process.argv.slice(2), SPEC);
	} catch (error) {
		console.error(`${describe(error)}\n\n${USAGE}`);
		process.exitCode = 1;
		return;
	}
	if (given.help === true) {
		console.log(USAGE);
		return;
	}

	try {
		process.exitCode = importRun(given);
	} catch (error) {
		console.error(describe(error));
		if (error instanceof UsageError) console.error(`\n${USAGE}`);
		process.exitCode = 1;
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
