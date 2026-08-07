<script lang="ts">
	import { page } from '$app/state';
	import { langFromParam, langs, t } from '$lib/i18n';

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
	<main>
		{@render children()}
	</main>

	<footer>
		{#if onLanding}
			<a href="/{lang}/privacy">{strings.footer.privacy}</a>
		{:else}
			<!-- The name reads the same in every language, so it is not a
			     translated string. -->
			<a href="/{lang}">Mowlak</a>
		{/if}
		<span aria-hidden="true">·</span>
		<a href={SOURCE}>{strings.footer.source}</a>
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
	*/
	.site {
		--paper: #f2f7f1;
		--ink: #263f36;
		--quiet-ink: #5d7a6e;
		--faint-ink: rgb(38 63 54 / 15%);
		/* The one warm note in a cool palette; spent only where the page
		   asks for the single action it offers. */
		--accent: #e98a5f;

		min-height: 100dvh;
		padding: 0 1.25rem;
		background: var(--paper);
		color: var(--ink);
		font-family: system-ui, sans-serif;
		font-size: 1.0625rem;
		line-height: 1.65;
	}

	/* One column, narrow enough to read in one movement of the eye. */
	main {
		max-width: 38rem;
		margin: 0 auto;
		padding: 3.5rem 0 3rem;
	}

	footer {
		display: flex;
		max-width: 38rem;
		margin: 0 auto;
		padding: 1.5rem 0 3rem;
		border-top: 1px solid var(--faint-ink);
		color: var(--quiet-ink);
		font-size: 0.95rem;
		gap: 0.6rem;
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
		font-size: 2.4rem;
		line-height: 1.15;
		letter-spacing: -0.01em;
	}

	:global(.site h2) {
		margin: 3rem 0 0.6rem;
		font-size: 1.35rem;
		line-height: 1.3;
	}

	:global(.site p) {
		margin: 0 0 1rem;
	}

	/* Both pages open on one sentence that carries the whole page. */
	:global(.site .lede) {
		font-size: 1.25rem;
		line-height: 1.5;
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

	:global(.site a:focus-visible) {
		outline: 2px solid var(--ink);
		outline-offset: 3px;
	}
</style>
