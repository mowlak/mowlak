#!/usr/bin/env node
// Draws stand-in images and records stand-in audio for every card the packs
// declare, so the app can be built and used end to end before the real
// artwork and the real voice exist.
//
// These are scaffolding, not content. The images are coloured shapes
// labelled with the Polish word, which finished cards must never be: a card
// teaches a toddler who cannot read, so the picture has to carry the meaning
// on its own. The audio is a beep, and level 1 of a finished card is always
// a human voice speaking the onomatopoeia.
//
// The generated files are committed, so building the app needs no ffmpeg.
// Run this only to add cards or to reset the placeholders:
//
//     node scripts/gen-placeholder-assets.mjs
//
// It needs ffmpeg on the PATH (or in $FFMPEG) and overwrites what it finds.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PACKS = fileURLToPath(new URL('../content/packs', import.meta.url));
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

const SIZE = 512;
const BACKGROUND = '#f6efe3';
const INK = '#59503f';

const SECONDS = 1.5;
const SAMPLE_RATE = 44100;
// Sine tones of equal amplitude are already matched in loudness; the shared
// attenuation just keeps them well below full scale, because a beep that
// startles is as much a failure as a picture that distracts.
const GAIN = '-12dB';
const FADE = 0.04;
const LOWEST_HZ = 300;
const HIGHEST_HZ = 800;

/**
 * @param {string} root
 * @param {string} prefix
 * @returns {string[]} pack files relative to the root
 */
function findPacks(root, prefix = '') {
	/** @type {string[]} */
	const found = [];
	for (const entry of readdirSync(prefix === '' ? root : `${root}/${prefix}`, {
		withFileTypes: true
	})) {
		if (entry.name.startsWith('.')) continue;
		const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
		if (entry.isDirectory()) found.push(...findPacks(root, path));
		else if (entry.name.endsWith('.json')) found.push(path);
	}
	return found.sort();
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeXml(value) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * @param {string} path relative to the pack root
 * @param {string} contents
 * @returns {void}
 */
function write(path, contents) {
	const absolute = `${PACKS}/${path}`;
	mkdirSync(dirname(absolute), { recursive: true });
	writeFileSync(absolute, contents);
}

/**
 * One flat shape on a warm ground, a different hue per card, the word in
 * small type underneath.
 *
 * @param {string} path relative to the pack root
 * @param {string} word
 * @param {number} hue
 * @returns {void}
 */
function drawImage(path, word, hue) {
	const label = escapeXml(word);
	write(
		path,
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" aria-label="${label}">
	<!-- Placeholder for the real illustration; see scripts/gen-placeholder-assets.mjs. -->
	<title>${label}</title>
	<rect width="${SIZE}" height="${SIZE}" fill="${BACKGROUND}" />
	<rect x="106" y="76" width="300" height="300" rx="88" fill="hsl(${hue}, 52%, 58%)" />
	<text x="256" y="452" text-anchor="middle" font-family="system-ui, sans-serif" font-size="44" fill="${INK}">${label}</text>
</svg>
`
	);
}

/**
 * @param {number} hz
 * @param {number} seconds
 * @returns {string[]} the ffmpeg arguments for one faded tone
 */
function tone(hz, seconds) {
	return [
		'-f',
		'lavfi',
		'-i',
		`sine=frequency=${hz}:duration=${seconds}:sample_rate=${SAMPLE_RATE}`
	];
}

/**
 * @param {number} index
 * @param {number} seconds
 * @returns {string} the fade filter for one tone, applied before any splice
 */
function faded(index, seconds) {
	const out = (seconds - FADE).toFixed(3);
	return `[${index}:a]afade=t=in:st=0:d=${FADE},afade=t=out:st=${out}:d=${FADE}[a${index}]`;
}

/**
 * Writes one beep: a single tone for the onomatopoeia level, a rising pair
 * for the word level, so the two levels of a card are told apart by ear.
 * Every tone is faded at both ends, including across the splice, because a
 * click is a jump scare in miniature.
 *
 * @param {string} path relative to the pack root
 * @param {number[]} tones one or two frequencies in hertz
 * @returns {void}
 */
function recordBeep(path, tones) {
	const each = SECONDS / tones.length;
	const filters = tones.map((hz, index) => faded(index, each));
	const inputs = tones.map((hz) => tone(hz, each)).flat();
	const chain = tones.map((hz, index) => `[a${index}]`).join('');
	const splice = tones.length > 1 ? `${chain}concat=n=${tones.length}:v=0:a=1,` : `${chain}`;

	const absolute = `${PACKS}/${path}`;
	mkdirSync(dirname(absolute), { recursive: true });
	execFileSync(
		FFMPEG,
		[
			'-hide_banner',
			'-loglevel',
			'error',
			'-y',
			...inputs,
			'-filter_complex',
			`${filters.join(';')};${splice}volume=${GAIN}[out]`,
			'-map',
			'[out]',
			'-ac',
			'1',
			'-c:a',
			'aac',
			'-b:a',
			'48k',
			'-movflags',
			'+faststart',
			// Keep the bytes reproducible so regenerating a pack does not
			// churn the repository for nothing.
			'-fflags',
			'+bitexact',
			'-map_metadata',
			'-1',
			absolute
		],
		{ stdio: ['ignore', 'ignore', 'inherit'] }
	);
}

function main() {
	try {
		execFileSync(FFMPEG, ['-version'], { stdio: 'ignore' });
	} catch {
		console.error(`cannot run ${FFMPEG}; install ffmpeg or set FFMPEG to its path`);
		process.exitCode = 1;
		return;
	}

	let images = 0;
	let clips = 0;
	for (const packPath of findPacks(PACKS)) {
		const pack = JSON.parse(readFileSync(`${PACKS}/${packPath}`, 'utf8'));
		/** @type {{ id: string, word: string, image: string, levels: { audio: string }[] }[]} */
		const cards = pack.cards;
		const span = Math.max(1, cards.length - 1);

		cards.forEach((card, index) => {
			drawImage(card.image, card.word, Math.round(20 + (index * 360) / cards.length) % 360);
			images += 1;

			const hz = LOWEST_HZ + Math.round((index * (HIGHEST_HZ - LOWEST_HZ)) / span);
			card.levels.forEach((level, position) => {
				recordBeep(level.audio, position === 0 ? [hz] : [hz, Math.round(hz * 1.5)]);
				clips += 1;
			});
		});
	}

	console.log(`placeholders: ${images} images, ${clips} audio clips written to content/packs`);
}

main();
