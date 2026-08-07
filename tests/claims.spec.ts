import { expect, test } from '@playwright/test';

// The strongest thing this site could say about its content is that a
// speech therapist has reviewed it. None has yet, so nothing may say or
// imply it — not the copy, not a heading, not a page title. It is a
// milestone to earn, and the day it is earned this test is the place that
// records the change.
//
// The two stems below are how the claim would have to be written in either
// language: konsultowany, konsultowana, konsultowane, konsultowano, and
// consulted with. Naming the product's own field is not the claim, so
// "logopedzi" and "speech therapists" are free to appear.
const CLAIMS = ['konsultowan', 'consulted with'];

// Every page a reader can reach. The app itself has no words on it.
const PAGES = ['/pl', '/en', '/pl/privacy', '/en/privacy'];

for (const path of PAGES) {
	// Read as shipped rather than as rendered, so the sweep covers the title
	// and the meta description as well as the text on the page.
	test(`${path} claims no professional endorsement`, async ({ request }) => {
		const response = await request.get(path);
		expect(response.status()).toBe(200);

		const html = (await response.text()).toLowerCase();
		// Guards the guard: an empty document would pass everything below.
		expect(html).toContain('mowlak');

		for (const claim of CLAIMS) {
			expect(html, `${path} must not claim "${claim}"`).not.toContain(claim);
		}
	});
}
