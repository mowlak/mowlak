<script lang="ts">
	// The site's typeface, bundled from a dependency rather than fetched
	// from anywhere: the product calls nobody, and tests/same-origin.spec.ts
	// is what keeps that true. Imported by this layout alone, so it reaches
	// the pages a parent reads and never the app, which has no words on it.
	import '@fontsource-variable/nunito';
	import { page } from '$app/state';
	import { langFromParam, langNames, langs, t } from '$lib/i18n';

	let { children } = $props();

	/** The one link on the site that leaves it. */
	const SOURCE = 'https://github.com/mowlak/mowlak';

	const lang = $derived(langFromParam(page.params.lang));
	const strings = $derived(t(lang));

	// The path with the language taken off the front. /pl/privacy and
	// /en/privacy are one page in two languages, so putting a different
	// language back in front of what is left names the same page there.
	const path = $derived(page.url.pathname.slice(lang.length + 1).replace(/\/$/, ''));
	const onLanding = $derived(path === '');

	// Every language but the one being read, which is one link while there
	// are two languages and stays correct if there are ever more.
	const others = $derived(langs.filter((one) => one !== lang));
</script>

<svelte:head>
	<!--
		Relative on purpose. The build is a pile of static files that has to
		be as correct on a preview as on the domain it ships to, and an
		origin written into the pages would be a lie on one of them.
	-->
	<link rel="canonical" href="/{lang}{path}" />
	{#each langs as alternate (alternate)}
		<link rel="alternate" hreflang={alternate} href="/{alternate}{path}" />
	{/each}
	<!-- The root belongs to no language: it reads the browser's and forwards. -->
	<link rel="alternate" hreflang="x-default" href="/" />
</svelte:head>

<!--
	The document declares Polish, so a page in the other language names its
	own around the text it holds. A screen reader takes the innermost
	declaration, and English read with Polish vowels is not English.
-->
<div class="site" {lang}>
	<header class="masthead">
		<!--
			The landing's own heading is the word "Mowlak" at full height, and
			printing it a second time a finger's width above itself would read
			as a mistake rather than as a mark. Everywhere else the name is
			the way back.
		-->
		{#if !onLanding}
			<a class="wordmark" href="/{lang}">Mowlak</a>
		{/if}

		{#each others as alternate (alternate)}
			<!-- The same page in the other language, which is the partner the
			     hreflang links in the head already name. -->
			<a class="switch" href="/{alternate}{path}" lang={alternate} hreflang={alternate}>
				{langNames[alternate]}
			</a>
		{/each}
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<div class="band">
			<!-- The name reads the same in every language, so it is not a
			     translated string. Not a link either: the masthead above is
			     already the way home, and one page should offer one. -->
			<span class="wordmark">Mowlak</span>
			<nav class="links">
				<a href="/{lang}/privacy" aria-current={path === '/privacy' ? 'page' : undefined}>
					{strings.footer.privacy}
				</a>
				<a href={SOURCE}>{strings.footer.source}</a>
			</nav>
		</div>
	</footer>
</div>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		/* Written out rather than read from the property below: this rule
		   reaches outside the page, where the property is not defined. */
		background: #f2f7f1;
	}

	/*
		The app pins the document to one screen, and its stylesheet stays in
		the document after a client-side navigation back here — where the
		site is prose and has to scroll. Tied to this page being on screen,
		and specific enough to outrank what it undoes whichever order the two
		stylesheets end up in.
	*/
	:global(html:has(.site)),
	:global(body:has(.site)) {
		height: auto;
		overflow: visible;
		overscroll-behavior: auto;
	}

	/*
		The same warm ground the app stands on, so opening the app changes
		nothing under the reader — over a darker ink than the app's own
		marks, because this page is prose and prose is read.

		The two washes in the background are the page's only gesture: very
		large, very soft, and far below the contrast of anything written on
		top of them. They are painted rather than built, so there is no
		element to hide from a screen reader and nothing that can widen the
		page.
	*/
	.site {
		--paper: #f2f7f1;
		/* Elevated surfaces — the pledge cards and the privacy list — stand
		   on the ground rather than in it. */
		--card: #fff;
		--ink: #263f36;
		--quiet-ink: #5d7a6e;
		--faint-ink: rgb(38 63 54 / 15%);
		/* The one warm note in a cool palette; spent only where the page
		   asks for the single action it offers. */
		--accent: #e98a5f;
		/* The dark end of the same green, for the device frame and the band
		   that closes the page. */
		--spruce: #1e332c;

		/* The page is drawn on two rails: prose stays inside a column that
		   can be read in one movement of the eye, and only the hero and the
		   pledge cards use the full width. */
		--rail: 64rem;
		--column: 40rem;
		--lift: 0 6px 24px rgb(38 63 54 / 8%);

		display: flex;
		flex-direction: column;
		min-height: 100dvh;
		background-color: var(--paper);
		background-image:
			radial-gradient(60rem 45rem at 78% 6rem, rgb(233 138 95 / 10%), transparent 70%),
			radial-gradient(50rem 40rem at 8% 92%, rgb(38 63 54 / 6%), transparent 70%);
		background-repeat: no-repeat;
		color: var(--ink);
		font-family: 'Nunito Variable', system-ui, sans-serif;
		font-size: 1.0625rem;
		font-weight: 400;
		line-height: 1.7;
	}

	/*
		The project ships no global reset, and this is the first surface with
		boxes that carry a width and a padding at once — a rail that fills a
		narrow screen and still holds its text off the edge. Counting the
		padding inside the width is the only arithmetic that survives 360px.
		It stops at the site: the app is laid out by its own stylesheet.
	*/
	.site,
	:global(.site *),
	:global(.site *::before),
	:global(.site *::after) {
		box-sizing: border-box;
	}

	/* Name on the left, the other language on the right, nothing else. */
	.masthead {
		display: flex;
		align-items: center;
		width: 100%;
		max-width: var(--rail);
		margin: 0 auto;
		padding: 0.75rem 1.25rem;
		gap: 1rem;
	}

	.wordmark {
		font-weight: 800;
		font-size: 1.25rem;
		letter-spacing: -0.01em;
		text-decoration: none;
	}

	.masthead .wordmark,
	.switch {
		display: inline-flex;
		align-items: center;
		/* A row this slim still has to be hittable with a thumb. */
		min-height: 44px;
	}

	/*
		Quiet by size rather than by colour: the accent and the quiet ink both
		fall short of AA against this ground at text sizes, and a link is
		text.
	*/
	.switch {
		margin-left: auto;
		font-size: 0.95rem;
		font-weight: 600;
	}

	main {
		flex: 1 0 auto;
		width: 100%;
		max-width: var(--rail);
		margin: 0 auto;
		padding: 1.25rem 1.25rem 5rem;
	}

	/* A full-width band of the darkest green in the palette: the page ends
	   deliberately rather than trailing off. */
	footer {
		background: var(--spruce);
		color: var(--paper);
	}

	.band {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		max-width: var(--rail);
		margin: 0 auto;
		padding: 1.25rem;
		gap: 0 2rem;
		font-size: 0.98rem;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1.75rem;
	}

	.links a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		text-decoration-color: rgb(242 247 241 / 45%);
	}

	.links a:hover {
		text-decoration-color: currentcolor;
	}

	/*
		The pages under this layout render inside it rather than as part of
		it, which puts their elements outside its scope. The site's prose is
		styled once, here, reaching past that scope but no further than the
		column it draws.

		Whole selectors rather than `.site :global(p)`: scoping the ancestor
		would add its class to every rule below and quietly outrank the pages
		themselves, which then could not set a margin on a paragraph of their
		own. These are defaults, and a default has to be the weakest thing on
		the page.
	*/
	:global(.site h1) {
		margin: 0;
		font-size: clamp(2.25rem, 5vw, 2.75rem);
		font-weight: 800;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}

	:global(.site h2) {
		margin: 5rem 0 1rem;
		font-size: 1.9rem;
		font-weight: 800;
		line-height: 1.25;
		letter-spacing: -0.01em;
	}

	/* Prose keeps to the narrow rail wherever it appears; the two full-width
	   arrangements say so for themselves. */
	:global(.site h2),
	:global(.site p),
	:global(.site ul) {
		max-width: var(--column);
	}

	:global(.site p) {
		margin: 0 0 1.15rem;
	}

	/* Both pages open on one sentence that carries the whole page. */
	:global(.site .lede) {
		font-size: 1.25rem;
		line-height: 1.6;
	}

	:global(.site ul) {
		margin: 0 0 1rem;
		padding-left: 1.15rem;
	}

	:global(.site li) {
		margin: 0 0 0.5rem;
	}

	:global(.site a) {
		color: inherit;
		text-underline-offset: 0.2em;
	}

	/*
		Ink rather than the accent: the accent reaches 2.3:1 against this
		ground, and a focus ring nobody can see is not one.
	*/
	:global(.site a:focus-visible) {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
		border-radius: 0.3rem;
	}

	.links a:focus-visible {
		outline-color: var(--paper);
	}
</style>
