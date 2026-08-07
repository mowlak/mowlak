#!/usr/bin/env node
// Brings recordings made at home into a pack, through the same chain every
// other clip went through: trimmed, measured, normalised to the one loudness,
// encoded the one way.
//
// The recordings themselves are made outside this repository — the runbook in
// scripts/assets/README.md holds the session guide. What arrives here is a
// directory of exports named after the clips they are: <card-id>.<kind>.wav.
//
//     node scripts/assets/import-recordings.mjs --raw-dir ~/mowlak-takes --dry-run
//     node scripts/assets/import-recordings.mjs --raw-dir ~/mowlak-takes
//
// It needs ffmpeg on the PATH (or in $FFMPEG). Nothing is called and nothing is
// spent: everything this script reads is already on the disk.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { UsageError, parseArgs, text } from './lib/args.mjs';
import { describe, parseLoudnorm } from './lib/audio.mjs';
import {
	buildRecordingPlan,
	encodeRecordingArgs,
	measureRecordingArgs,
	takeName
} from './lib/recordings.mjs';
import { REPO_ROOT, refuseInsideRepo } from './lib/repo.mjs';
import { validateContent } from '../validate-content.mjs';

const PACK_ROOT = join(REPO_ROOT, 'content/packs');
const DEFAULT_PACK = join(PACK_ROOT, 'pl/animals.json');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

const USAGE = `usage: node scripts/assets/import-recordings.mjs --raw-dir <dir> [options]

  --raw-dir <dir>   the recordings to import; must be outside the repository
  --dry-run         print the plan and stop; nothing is written
  --only <card-id>  import one card
  --pack <file>     a pack other than content/packs/pl/animals.json`;

const SPEC = {
	flags: ['dry-run', 'help'],
	options: ['raw-dir', 'only', 'pack']
};

// A pack the child hears has to sound like one person, and this script is the
// one that can leave it sounding like two.
const ONE_VOICE =
	'one voice: the clips this run did not touch are still whatever was there ' +
	'before. A child who hears two speakers hears two different things being ' +
	'asked, so record the rest in the same session, in the same room, and ' +
	'import them before this pack ships.';

/**
 * ffmpeg says everything on stderr — the measurement pass one prints as much as
 * the reason a run failed — so stderr is what is returned, and spawnSync is used
 * because it hands back both streams whether or not the run succeeded.
 *
 * @param {string[]} args
 * @returns {string} everything ffmpeg printed
 */
function ffmpeg(args) {
	const result = spawnSync(FFMPEG, args, { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] });
	if (result.error !== undefined) {
		throw new Error(`cannot run ${FFMPEG}; install ffmpeg or set FFMPEG to its path`);
	}
	const printed = String(result.stderr ?? '');
	if (result.status !== 0) {
		const tail = printed.trimEnd().split('\n').slice(-3).join('; ');
		throw new Error(`ffmpeg failed${tail === '' ? '' : `: ${tail}`}`);
	}
	return printed;
}

/**
 * The clip is written under a dotted temporary name in the directory it is
 * headed for and renamed only once ffmpeg has finished with it. A rename is
 * atomic within a directory, so a run that dies halfway leaves every card it
 * did not finish playing exactly what it played before — and the temporary name
 * starts with a dot, which the content validator skips, so even a crashed run
 * cannot make a pack look like it ships something it does not.
 *
 * @param {string} source the recording, absolute
 * @param {string} path the target, relative to the pack root
 * @returns {void}
 */
function convert(source, path) {
	const target = join(PACK_ROOT, path);
	const temporary = join(dirname(target), `.${basename(target)}.${process.pid}.tmp.m4a`);

	const measured = parseLoudnorm(ffmpeg(measureRecordingArgs(source)));
	mkdirSync(dirname(target), { recursive: true });
	try {
		ffmpeg(encodeRecordingArgs(source, temporary, measured));
		renameSync(temporary, target);
	} finally {
		rmSync(temporary, { force: true });
	}
}

/**
 * The count that decides whether a pack can ship. A partial import is a
 * perfectly good run — one flubbed take should be re-recordable on its own —
 * but a pack is only finished when every clip in it came out of the same
 * session, so the arithmetic is printed rather than left to be assumed.
 *
 * @param {number} imported
 * @param {number} total every clip the pack asks for, whatever --only narrowed
 * @param {string} tense
 * @returns {void}
 */
function sayHowMany(imported, total, tense) {
	console.log(
		imported === total
			? `all ${total} clips of the pack ${tense} from these recordings`
			: `${imported} of the pack's ${total} clips ${tense} from these recordings, ` +
					`${total - imported} left as they are`
	);
	if (imported < total) console.log(ONE_VOICE);
}

/**
 * @param {Record<string, string | true>} given
 * @returns {number} the exit code
 */
function importRun(given) {
	const rawDirGiven = text(given, 'raw-dir');
	if (rawDirGiven === undefined) throw new UsageError('--raw-dir is required');

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

	const packPath = resolve(text(given, 'pack') ?? DEFAULT_PACK);
	const pack = JSON.parse(readFileSync(packPath, 'utf8'));
	// Only files sitting directly in the directory are takes, so unchosen ones
	// can be kept in a subdirectory beside them.
	const files = readdirSync(rawDir, { withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
		.sort();

	const { takes, problems, total } = buildRecordingPlan(pack, files, {
		only: text(given, 'only'),
		present: (path) => existsSync(join(PACK_ROOT, path))
	});
	if (problems.length > 0) {
		for (const problem of problems) console.error(`refusing: ${problem}`);
		return 1;
	}

	const wanted = takes.filter((take) => take.action !== 'missing');
	console.log(
		`${pack.language}/${pack.category}: ${wanted.length} of ${takes.length} clips found in ${rawDir}`
	);
	for (const take of takes) {
		const from =
			take.action === 'missing' ? `no ${takeName(take.card, take.kind)}.* here` : `<- ${take.file}`;
		console.log(`  ${take.action.padEnd(7)} ${take.path.padEnd(38)} ${from}`);
	}

	if (given['dry-run'] === true) {
		console.log('dry run: nothing was written');
		sayHowMany(wanted.length, total, 'would come');
		return 0;
	}
	if (wanted.length === 0) {
		console.error(
			'nothing to import: no file in that directory is named after a clip of this pack'
		);
		return 1;
	}

	let failed = 0;
	for (const take of wanted) {
		try {
			convert(join(rawDir, take.file), take.path);
			console.log(`  wrote ${take.path}`);
		} catch (error) {
			// Loud, named, and never fatal to the rest: one take that will not
			// convert should not cost the other twenty-three their import.
			console.error(`  ${take.card}.${take.kind}: ${describe(error)}`);
			failed += 1;
		}
	}

	// The pack now ships different bytes than it did a moment ago, so it is
	// checked before the operator is told the run went well.
	const report = validateContent(PACK_ROOT);
	for (const violation of report.violations) console.error(violation);
	console.log(
		`recordings: ${wanted.length - failed} of ${wanted.length} written to content/packs; ` +
			`content ${report.violations.length === 0 ? 'valid' : `has ${report.violations.length} violation(s)`}`
	);
	sayHowMany(wanted.length - failed, total, 'now come');

	return failed === 0 && report.violations.length === 0 ? 0 : 1;
}

function main() {
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
