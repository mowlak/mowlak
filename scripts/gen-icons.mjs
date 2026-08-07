#!/usr/bin/env node
// Rasterizes static/icon.svg into the PNG sizes a web app manifest and an
// iOS home screen ask for.
//
// Chrome does the drawing, through the browser automation the test suite
// already depends on, so five icons cost the project no image library and no
// native module. Run it only after editing the SVG:
//
//     npm run icons
//
// The PNGs it writes are committed, and neither the build nor CI runs this.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const STATIC = fileURLToPath(new URL('../static', import.meta.url));

/** The mark's own ground, painted behind it wherever it must be opaque. */
const GROUND = '#e98a5f';

/**
 * A maskable icon is cropped to whatever shape the platform prefers, and
 * only the middle 80% of it is guaranteed to survive. Insetting the mark by
 * that much and painting the ground behind it also hides the rounded corners
 * the mark draws for itself, which is what a full-bleed icon needs.
 */
const SAFE_AREA = 0.8;

/**
 * @typedef {object} Icon
 * @property {string} file name under static/
 * @property {number} size square side in pixels
 * @property {number} fill how much of that side the mark spans
 * @property {boolean} opaque whether the ground is painted behind it
 */

/** @type {Icon[]} */
const ICONS = [
	{ file: 'icon-192.png', size: 192, fill: 1, opaque: false },
	{ file: 'icon-512.png', size: 512, fill: 1, opaque: false },
	{ file: 'icon-192-maskable.png', size: 192, fill: SAFE_AREA, opaque: true },
	{ file: 'icon-512-maskable.png', size: 512, fill: SAFE_AREA, opaque: true },
	// iOS applies its own mask and composites whatever it is given onto
	// black, so the home screen icon is opaque and fills its square.
	{ file: 'apple-touch-icon.png', size: 180, fill: 1, opaque: true }
];

/**
 * @param {string} mark the SVG, base64
 * @param {Icon} icon
 * @returns {string} a document that is exactly the icon and nothing else
 */
function sheet(mark, icon) {
	const side = icon.size * icon.fill;

	return `<!doctype html>
<meta charset="utf-8" />
<style>
	html, body { margin: 0; padding: 0 }
	body {
		width: ${icon.size}px;
		height: ${icon.size}px;
		background: ${icon.opaque ? GROUND : 'transparent'};
		display: grid;
		place-items: center;
	}
	img { display: block; width: ${side}px; height: ${side}px }
</style>
<img alt="" src="data:image/svg+xml;base64,${mark}" />`;
}

const mark = readFileSync(`${STATIC}/icon.svg`).toString('base64');

const browser = await chromium.launch();
// Pinned, so the file a rerun writes is the same size as the one it replaces.
const tab = await browser.newPage({ deviceScaleFactor: 1 });

for (const icon of ICONS) {
	await tab.setViewportSize({ width: icon.size, height: icon.size });
	await tab.setContent(sheet(mark, icon));
	writeFileSync(`${STATIC}/${icon.file}`, await tab.screenshot({ omitBackground: !icon.opaque }));
	console.log(`icons: ${icon.file} (${icon.size}x${icon.size})`);
}

await browser.close();
