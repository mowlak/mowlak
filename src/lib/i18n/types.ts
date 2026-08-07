// Every interface string the site can render, grouped by the surface that
// shows it. This is one interface rather than a bag of keys on purpose:
// each language file declares `Strings`, so a key that one language has
// and the other lacks — or a typo in either — is a compile error from
// `npm run check`. Nothing falls back to another language at runtime,
// because a half-translated screen in front of a child is worse than a
// build that refuses to finish.
//
// A few sentences are worth saying in one language and not in another. The
// key is required all the same and the language that does not need it says
// `null`, so staying silent is a decision on the record rather than a
// missing entry nobody noticed.
//
// The tables hold prose and never markup: nothing here is parsed, and a
// page that wants emphasis puts the tag in its own template.
//
// Only the teaching-content-free interface lives here. Cards, words and
// onomatopoeia are Polish and belong to the content packs.

/** One promise the landing makes, and the plain sentence that backs it. */
export interface Pledge {
	claim: string;
	detail: string;
}

/** A heading with one paragraph under it. */
export interface Section {
	heading: string;
	body: string;
}

export interface Strings {
	// The chrome under every public page.
	footer: {
		privacy: string;
		source: string;
	};
	landing: {
		// The browser tab and the search result, in that order.
		title: string;
		description: string;
		// The line under the name.
		tagline: string;
		// One paragraph under the name: what the app is for.
		lede: string;
		// Which language the cards teach. Only a reader who arrived in
		// English has reason to wonder, so only English answers.
		note: string | null;
		// The single call to action; also the accessible name of the link.
		open: string;
		// Why the app does so little, and the four promises that follow from
		// it. Exactly four, in reading order: a tuple, so a language that
		// drops one does not compile.
		calm: {
			heading: string;
			intro: string;
			pledges: readonly [Pledge, Pledge, Pledge, Pledge];
		};
		// The method, in a paragraph a parent can read while a child waits.
		how: Section;
		// What the name means. Polish readers know, so Polish says nothing.
		name: Section | null;
		// How to sit down with it, and where the settings hide.
		parents: Section;
		// What the project costs and why.
		free: Section;
	};
	// The privacy page, which exists to say that there is nothing to say.
	privacy: {
		title: string;
		description: string;
		heading: string;
		lede: string;
		// The four things the app does not do, and the one it does.
		points: readonly [string, string, string, string];
		outro: string;
		// When the page was last true.
		stamp: string;
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
