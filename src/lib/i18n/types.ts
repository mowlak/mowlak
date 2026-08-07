// Every interface string the site can render, grouped by the surface that
// shows it. This is one interface rather than a bag of keys on purpose:
// each language file declares `Strings`, so a key that one language has
// and the other lacks — or a typo in either — is a compile error from
// `npm run check`. Nothing falls back to another language at runtime,
// because a half-translated screen in front of a child is worse than a
// build that refuses to finish.
//
// Only the teaching-content-free interface lives here. Cards, words and
// onomatopoeia are Polish and belong to the content packs.
export interface Strings {
	landing: {
		// One sentence under the product name: what the app is for.
		lede: string;
		// The single call to action; also the accessible name of the link.
		open: string;
	};
	app: {
		// Stands in until the card player lands, and leaves with it.
		comingSoon: string;
	};
}
