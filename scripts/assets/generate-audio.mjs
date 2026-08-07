#!/usr/bin/env node
// Records a pack: one clip per card per level, in one voice, at one loudness.
//
// Level 1 of a card is a human voice speaking the onomatopoeia, never an
// animal sound effect — the child is being invited to imitate speech, so
// speech is what has to be played. Level 2 is the word. This script asks a
// speech service for both, trims and normalises what comes back, and writes
// the m4a the card already names.
//
//     node scripts/assets/generate-audio.mjs --dry-run
//     node scripts/assets/generate-audio.mjs --audition ~/mowlak-audition \
//         --paid-tier-confirmed
//     node scripts/assets/generate-audio.mjs --paid-tier-confirmed
//
// It needs ffmpeg on the PATH (or in $FFMPEG) and ELEVENLABS_API_KEY in the
// environment or in a gitignored .env at the root of the working tree. See
// scripts/assets/README.md for the whole runbook.

import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { UsageError, parseArgs, text } from './lib/args.mjs';
import {
	blockingReasons,
	buildAuditionPlan,
	buildPlan,
	createSpeaker,
	describe,
	encodeArgs,
	measureArgs,
	parseLoudnorm,
	rawFormat,
	readConfig
} from './lib/audio.mjs';
import { REPO_ROOT, loadEnvFile, refuseInsideRepo } from './lib/repo.mjs';

const PACK_ROOT = join(REPO_ROOT, 'content/packs');
const DEFAULT_PACK = join(PACK_ROOT, 'pl/animals.json');
const DEFAULT_CONFIG = join(REPO_ROOT, 'scripts/assets/audio.config.json');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

const USAGE = `usage: node scripts/assets/generate-audio.mjs [options]

  --dry-run                 print the plan and stop; nothing is called
  --audition <dir>          record every candidate voice into <dir> instead of
                            recording the pack; <dir> must be outside the
                            repository
  --only <card-id>          record one card
  --force                   re-record clips that already exist
  --paid-tier-confirmed     required before any request is sent
  --keep-raw <dir>          keep what the service returned in <dir>, which must
                            be outside the repository
  --pack <file>             a pack other than content/packs/pl/animals.json
  --config <file>           a config other than scripts/assets/audio.config.json`;

const SPEC = {
	flags: ['dry-run', 'force', 'paid-tier-confirmed', 'help'],
	options: ['audition', 'only', 'keep-raw', 'pack', 'config']
};

/**
 * ffmpeg says everything on stderr — the measurement pass one prints as much
 * as the reason a run failed — so stderr is what is returned, and spawnSync is
 * used because it hands back both streams whether or not the run succeeded.
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
 * The take is written under a dotted temporary name in the directory it is
 * headed for, and renamed only once ffmpeg has finished with it. A rename is
 * atomic within a directory, so a batch that dies halfway leaves every file it
 * did not finish exactly as it found it — and the temporary name starts with a
 * dot, which the content validator skips, so even a crashed run cannot make a
 * pack look like it ships something it does not.
 *
 * @param {(voiceId: string, spoken: string) => Promise<Uint8Array>} speak
 * @param {{ voiceId: string, spoken: string, target: string, format: string, rawDir: string, rawName: string }} take
 * @returns {Promise<void>}
 */
async function record(speak, take) {
	const raw = join(take.rawDir, `${take.rawName}.${rawFormat(take.format).extension}`);
	const temporary = join(dirname(take.target), `.${basename(take.target)}.${process.pid}.tmp.m4a`);

	writeFileSync(raw, await speak(take.voiceId, take.spoken));
	try {
		const measured = parseLoudnorm(ffmpeg(measureArgs(raw, take.format)));
		mkdirSync(dirname(take.target), { recursive: true });
		ffmpeg(encodeArgs(raw, temporary, take.format, measured));
		renameSync(temporary, take.target);
	} finally {
		rmSync(temporary, { force: true });
	}
}

/**
 * @param {string[]} reasons
 * @returns {number} the exit code
 */
function refuse(reasons) {
	for (const reason of reasons) console.error(`refusing: ${reason}`);
	return 1;
}

/**
 * @param {import('./lib/audio.mjs').Config} config
 * @param {Record<string, string | true>} given
 * @returns {Promise<number>} the exit code
 */
async function auditionRun(config, given) {
	const outDir = resolve(String(text(given, 'audition')));
	const refusal = refuseInsideRepo('--audition', outDir);
	if (refusal !== null) {
		console.error(`refusing: ${refusal}`);
		return 1;
	}

	const takes = buildAuditionPlan(config);
	const voices = Object.keys(config.audition_voices).length;
	console.log(`audition: ${takes.length} clips for ${voices} voices into ${outDir}`);
	for (const take of takes) {
		console.log(`  ${take.voice.padEnd(12)} ${JSON.stringify(take.text).padEnd(10)} ${take.file}`);
	}
	if (given['dry-run'] === true) {
		console.log('dry run: nothing was called');
		return 0;
	}

	const apiKey = process.env.ELEVENLABS_API_KEY;
	const reasons = blockingReasons({
		confirmed: given['paid-tier-confirmed'] === true,
		apiKey,
		voiceId: config.voice_id,
		audition: true
	});
	if (reasons.length > 0) return refuse(reasons);

	const speak = createSpeaker({ apiKey: String(apiKey), config });
	const rawDir = mkdtempSync(join(tmpdir(), 'mowlak-audition-'));
	mkdirSync(outDir, { recursive: true });

	let failed = 0;
	try {
		for (const take of takes) {
			try {
				await record(speak, {
					voiceId: take.voiceId,
					spoken: take.text,
					target: join(outDir, take.file),
					format: config.output_format,
					rawDir,
					rawName: take.file.replace(/\.m4a$/, '')
				});
				console.log(`  wrote ${take.file}`);
			} catch (error) {
				console.error(`  ${take.file}: ${describe(error)}`);
				failed += 1;
			}
		}
	} finally {
		rmSync(rawDir, { recursive: true, force: true });
	}

	console.log(
		failed === 0
			? `audition: ${takes.length} clips in ${outDir}; listen, then pin the chosen id as "voice_id"`
			: `audition: ${takes.length - failed} of ${takes.length} clips written, ${failed} failed`
	);
	return failed === 0 ? 0 : 1;
}

/**
 * @param {import('./lib/audio.mjs').Config} config
 * @param {Record<string, string | true>} given
 * @param {string} packPath
 * @returns {Promise<number>} the exit code
 */
async function batchRun(config, given, packPath) {
	const pack = JSON.parse(readFileSync(packPath, 'utf8'));
	const clips = buildPlan(pack, config, {
		only: text(given, 'only'),
		force: given.force === true,
		present: (path) => existsSync(join(PACK_ROOT, path))
	});
	const wanted = clips.filter((clip) => clip.action !== 'keep');

	console.log(`${pack.language}/${pack.category}: ${clips.length} clips planned`);
	for (const clip of clips) {
		const spoken = clip.overridden
			? `${JSON.stringify(clip.text)} (override, card reads ${JSON.stringify(clip.display)})`
			: JSON.stringify(clip.display);
		console.log(`  ${clip.action.padEnd(7)} ${clip.path.padEnd(42)} ${spoken}`);
	}
	console.log(
		`  ${wanted.length} to record, ${clips.length - wanted.length} already there` +
			`${clips.length === wanted.length ? '' : ' (--force re-records them)'}`
	);

	if (given['dry-run'] === true) {
		if (config.voice_id === '')
			console.log('note: "voice_id" is still empty; a real run needs one');
		console.log('dry run: nothing was called');
		return 0;
	}

	const apiKey = process.env.ELEVENLABS_API_KEY;
	const reasons = blockingReasons({
		confirmed: given['paid-tier-confirmed'] === true,
		apiKey,
		voiceId: config.voice_id,
		audition: false
	});
	if (reasons.length > 0) return refuse(reasons);
	if (wanted.length === 0) {
		console.log('nothing to record');
		return 0;
	}

	const keep = text(given, 'keep-raw');
	let rawDir;
	if (keep === undefined) {
		rawDir = mkdtempSync(join(tmpdir(), 'mowlak-audio-'));
	} else {
		rawDir = resolve(keep);
		const refusal = refuseInsideRepo('--keep-raw', rawDir);
		if (refusal !== null) {
			console.error(`refusing: ${refusal}`);
			return 1;
		}
		mkdirSync(rawDir, { recursive: true });
	}

	const speak = createSpeaker({ apiKey: String(apiKey), config });
	let failed = 0;
	try {
		for (const clip of wanted) {
			try {
				await record(speak, {
					voiceId: config.voice_id,
					spoken: clip.text,
					target: join(PACK_ROOT, clip.path),
					format: config.output_format,
					rawDir,
					rawName: `${clip.card}.${clip.kind}`
				});
				console.log(`  wrote ${clip.path}`);
			} catch (error) {
				// Loud, named, and never fatal to the rest: one card that fails
				// should not cost the other eleven their recordings.
				console.error(`  ${clip.card}.${clip.kind}: ${describe(error)}`);
				failed += 1;
			}
		}
	} finally {
		if (keep === undefined) rmSync(rawDir, { recursive: true, force: true });
	}

	console.log(
		`audio: ${wanted.length - failed} of ${wanted.length} clips written to content/packs` +
			(failed === 0 ? '; run npm run validate' : `, ${failed} failed`)
	);
	return failed === 0 ? 0 : 1;
}

async function main() {
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
		const configPath = resolve(text(given, 'config') ?? DEFAULT_CONFIG);
		const config = readConfig(readFileSync(configPath, 'utf8'), basename(configPath));
		const packPath = resolve(text(given, 'pack') ?? DEFAULT_PACK);

		process.exitCode =
			given.audition === undefined
				? await batchRun(config, given, packPath)
				: await auditionRun(config, given);
	} catch (error) {
		console.error(describe(error));
		if (error instanceof UsageError) console.error(`\n${USAGE}`);
		process.exitCode = 1;
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
