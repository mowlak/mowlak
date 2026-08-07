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
		// The card screen is wordless: a child of one and a half cannot read,
		// and anything written there is decoration that competes with the
		// picture. These name its controls for assistive technology and are
		// never drawn.
		player: {
			// The picture, which speaks when it is touched.
			picture: string;
			// The chevron that leads to the next card.
			advance: string;
			// The gate, whose long hold opens the parent panel.
			gate: string;
		};
		// The parent panel. Everything here is read by an adult, so it is the
		// one surface in the app that is allowed words.
		panel: {
			// Names the panel, and heads it.
			title: string;
			// Introduces the choice between a card's two levels.
			levelLegend: string;
			// Level 1, the onomatopoeia, with an example in the content
			// language so the choice is obvious without explaining itself.
			levelOnomatopoeia: string;
			// Level 2, the word, with the matching example.
			levelWord: string;
			// Leaves the app for the site it lives on.
			leave: string;
			// Returns to the card that stayed on screen behind the panel.
			close: string;
		};
		// Shown to the parent when the cards cannot be fetched, with the one
		// action that can help. Never an error wall in front of a child.
		trouble: string;
		retry: string;
	};
}
