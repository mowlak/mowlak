// The offline copy of the app.
//
// The app is a pile of static files and the whole of it fits in a cache, so
// there is no partial offline mode to design: one online visit takes
// everything, and after that a plane, a basement or a dead SIM changes
// nothing about what a child sees.
//
// This worker is registered by src/routes/app/+layout.svelte alone, with the
// scope /app/, and never by the framework — see vite.config.ts, where the
// automatic registration is turned off because it knows no scope.

import { build, files, prerendered, version } from '$service-worker';

// The worker's own globals. Declared here rather than borrowed from the
// webworker library, whose definitions collide with the DOM ones the rest of
// the app is compiled against; three names are the cheaper price.
interface ExtendableEvent extends Event {
	waitUntil(work: Promise<unknown>): void;
}

interface FetchEvent extends ExtendableEvent {
	readonly request: Request;
	respondWith(response: Response | Promise<Response>): void;
}

interface Worker {
	readonly location: Location;
	addEventListener(type: 'install' | 'activate', run: (event: ExtendableEvent) => void): void;
	addEventListener(type: 'fetch', run: (event: FetchEvent) => void): void;
}

const worker = self as unknown as Worker;

/** Everything the app is. Nothing outside it is this worker's business. */
const APP = '/app/';

// Keyed by build: a new deployment fills a cache of its own and leaves the
// running one alone, so a device is never left holding half of each.
const CACHE = `mowlak-${version}`;

/**
 * The app's code, everything under static/ — the card packs, the pictures,
 * the voice — and the app's own prerendered pages. The landing pages are
 * deliberately absent: they are outside the scope and would only be dead
 * weight on a device.
 *
 * So are the typefaces the build carries. They belong to the pages a parent
 * reads; this screen is wordless and has not one glyph to draw with them,
 * and the whole point of taking the app whole is that what it takes is the
 * app.
 */
const PRECACHE = [
	...build.filter((path) => !path.endsWith('.woff2')),
	...files,
	...prerendered.filter((path) => path.startsWith(APP))
];

const PRECACHED = new Set(PRECACHE);

worker.addEventListener('install', (event) => {
	// No skipWaiting. A worker that took over mid-session would swap the app
	// out from under a child who is using it; a new version waits for the
	// next time the app is opened, which is the calm moment for it.
	event.waitUntil(fill());
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(forget());
});

worker.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	// The product calls nobody. A worker that answered for another origin
	// would be the first byte this app ever sent off it.
	if (url.origin !== worker.location.origin) return;

	// A page is the one request worth spending the network on: it is small,
	// and it is where a device that has been away for a month learns that the
	// app has moved on. Offline, the copy taken at install answers instead.
	if (event.request.mode === 'navigate' && url.pathname.startsWith(APP)) {
		event.respondWith(freshest(event.request, url.pathname));
		return;
	}

	// Everything else was taken whole at install and belongs to this exact
	// build, so there is nothing newer to ask for.
	if (PRECACHED.has(url.pathname)) event.respondWith(stored(event.request, url.pathname));
});

/** Takes the whole app, or fails and leaves the previous copy in charge. */
async function fill(): Promise<void> {
	const cache = await caches.open(CACHE);
	await cache.addAll(PRECACHE);
}

async function forget(): Promise<void> {
	for (const key of await caches.keys()) {
		if (key.startsWith('mowlak-') && key !== CACHE) await caches.delete(key);
	}
}

async function stored(request: Request, path: string): Promise<Response> {
	const cache = await caches.open(CACHE);

	// A cache can be evicted whole between visits. The network is then the
	// only honest answer left, rather than a broken card.
	return (await cache.match(path)) ?? fetch(request);
}

async function freshest(request: Request, path: string): Promise<Response> {
	try {
		return await fetch(request);
	} catch (offline) {
		const cache = await caches.open(CACHE);
		// A query string belongs to the visit rather than to the page, and the
		// language detector at /app/ passes one along.
		const held = (await cache.match(path, { ignoreSearch: true })) ?? (await cache.match(APP));
		if (held) return held;

		throw offline;
	}
}
