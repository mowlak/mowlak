<script lang="ts">
	import { page } from '$app/state';
	import { CONTENT_ROOT } from '$lib/content';
	import { langFromParam, t, type Section } from '$lib/i18n';

	const lang = $derived(langFromParam(page.params.lang));
	const landing = $derived(t(lang).landing);

	// The card the app opens on, borrowed for the picture in the hero. The
	// mockup is the real thing at rest rather than a drawing of it, so it
	// cannot come to show something the app does not.
	const FIRST_PICTURE = `${CONTENT_ROOT}/images/animals/dog.png`;
</script>

{#snippet section(item: Section)}
	<section>
		<h2>{item.heading}</h2>
		<p>{item.body}</p>
	</section>
{/snippet}

<!--
	One mark per pledge, in the order the pledges are written: a single shape
	on a screen, a voice carrying to its end, a struck-out star, a closed
	shield. Drawn rather than written, and hidden from a screen reader, which
	is already being read the sentence each one restates.
-->
{#snippet mark(index: number)}
	<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
		{#if index === 0}
			<rect x="4.5" y="4.5" width="15" height="15" rx="4.5" />
		{:else if index === 1}
			<path d="M8 9A4.2 4.2 0 0 1 8 15" />
			<path d="M11.8 6.6A7.6 7.6 0 0 1 11.8 17.4" />
			<path d="M15.6 4.2A11 11 0 0 1 15.6 19.8" />
		{:else if index === 2}
			<path
				d="M12 2.8 14.2 8.97 20.75 9.16 15.57 13.16 17.41 19.44 12 15.75 6.59 19.44 8.43 13.16 3.25 9.16 9.8 8.97Z"
			/>
			<!-- The stroke that says no, drawn twice: once wide in the face of
			     the chip to cut a clear channel through the star, once over it
			     in ink. Two lines crossing at 24px are otherwise one blot. -->
			<path class="cut" d="M4.6 19.4 19.4 4.6" />
			<path d="M4.6 19.4 19.4 4.6" />
		{:else}
			<path d="M12 3.3 19 6v5.2c0 4.1-2.8 7.1-7 8.3-4.2-1.2-7-4.2-7-8.3V6Z" />
			<path d="M8.8 11.9 11.1 14.2 15.4 9.9" />
		{/if}
	</svg>
{/snippet}

<svelte:head>
	<title>{landing.title}</title>
	<meta name="description" content={landing.description} />
</svelte:head>

<section class="hero">
	<div class="pitch">
		<!--
			The logo is the headline: mowlak spoken inside its bubble, the
			pale nie already drifting off — the name and its story in one
			mark. The h1 keeps the name for screen readers and search
			results without repeating it above its own logo. Glyphs are
			baked into the file as paths, so the mark cannot fall back to
			another face.
		-->
		<h1 class="spoken-name">Mowlak</h1>
		<img
			class="wordmark"
			src="/logo.svg"
			alt={landing.wordmarkAlt}
			width="4991"
			height="2825"
			draggable="false"
		/>

		<p class="lede">{landing.lede}</p>

		{#if landing.note}
			<p class="note">{landing.note}</p>
		{/if}

		<p class="cta"><a href="/app/{lang}">{landing.open}</a></p>
	</div>

	<!--
		The app at rest, built from the app's own parts: the ground it stands
		on, the first card's picture, the chevron that leads to the next one.
		Nothing here is a screenshot, so nothing here can promise a screen the
		app does not have. Decoration to a screen reader, which has the
		paragraph beside it.
	-->
	<div class="device" aria-hidden="true">
		<div class="screen">
			<img class="art" src={FIRST_PICTURE} alt="" draggable="false" />
			<svg class="chevron" viewBox="0 0 64 32" focusable="false">
				<path d="M10 9 L32 25 L54 9" />
			</svg>
		</div>
	</div>
</section>

<section>
	<h2>{landing.calm.heading}</h2>
	<p>{landing.calm.intro}</p>

	<ul class="pledges">
		{#each landing.calm.pledges as pledge, index (pledge.claim)}
			<li>
				<span class="chip">{@render mark(index)}</span>
				<strong>{pledge.claim}</strong>
				<!-- The dash joined the two halves when a pledge was one line of
				     a list. The card gives each half a line of its own, and the
				     sentence a screen reader hears stays the one that was
				     written. -->
				<span class="join">—</span>
				<span class="detail">{pledge.detail}</span>
			</li>
		{/each}
	</ul>
</section>

<section>
	<h2>{landing.how.heading}</h2>
	<p>{landing.how.body}</p>

	<!-- Picture, voice, word: the three steps of the paragraph above, drawn
	     in the order it puts them. It says them in full, so this says
	     nothing and is not there for anyone listening. -->
	<div class="flow" aria-hidden="true">
		<span class="step">
			<svg class="icon" viewBox="0 0 24 24" focusable="false">
				<rect x="3" y="5" width="18" height="14" rx="3" />
				<circle cx="8.6" cy="10.2" r="1.5" />
				<path d="M4 17.6 9.2 12.4 12.6 15.8 15.8 12.6 20 16.8" />
			</svg>
		</span>
		<svg class="lead" viewBox="0 0 24 24" focusable="false">
			<path d="M9 5.5 15.5 12 9 18.5" />
		</svg>
		<span class="step">
			<svg class="icon" viewBox="0 0 24 24" focusable="false">
				<path d="M8 9A4.2 4.2 0 0 1 8 15" />
				<path d="M11.8 6.6A7.6 7.6 0 0 1 11.8 17.4" />
				<path d="M15.6 4.2A11 11 0 0 1 15.6 19.8" />
			</svg>
		</span>
		<svg class="lead" viewBox="0 0 24 24" focusable="false">
			<path d="M9 5.5 15.5 12 9 18.5" />
		</svg>
		<span class="step">
			<svg class="icon" viewBox="0 0 24 24" focusable="false">
				<path
					d="M4.5 5h15A2.5 2.5 0 0 1 22 7.5v6A2.5 2.5 0 0 1 19.5 16H11l-4.2 3.4V16H4.5A2.5 2.5 0 0 1 2 13.5v-6A2.5 2.5 0 0 1 4.5 5Z"
				/>
			</svg>
		</span>
	</div>
</section>

{#if landing.name}
	{@render section(landing.name)}
{/if}

{@render section(landing.parents)}
{@render section(landing.free)}

<style>
	/*
		Two columns on a screen wide enough to hold both, one everywhere else,
		and the picture below the button rather than above the name when they
		stack.
	*/
	.hero {
		display: grid;
		align-items: center;
		padding: 1.5rem 0 1rem;
		gap: 3.5rem;
	}

	@media (min-width: 760px) {
		.hero {
			padding: 2.5rem 0 2rem;
			gap: 4rem;
			grid-template-columns: minmax(0, 1fr) auto;
		}
	}

	/* Present to a screen reader and a search engine, invisible beside its
	   own logo: the mark says the name, the heading merely spells it. */
	.spoken-name {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		clip-path: inset(50%);
		overflow: hidden;
		white-space: nowrap;
	}

	.wordmark {
		display: block;
		width: min(23rem, 100%);
		height: auto;
		margin: 0 0 1.4rem;
	}

	.note {
		color: var(--quiet-ink);
	}

	/*
		The one thing to do on this page, and the only place where the design
		raises its voice. A parent's surface may answer a pointer, so it
		answers by exactly one pixel and in under a fifth of a second.
	*/
	.cta {
		margin: 2.25rem 0 0;
	}

	.cta a {
		display: inline-block;
		padding: 0.95rem 2.3rem;
		border-radius: 999px;
		background: var(--accent);
		box-shadow: 0 10px 22px rgb(233 138 95 / 35%);
		/* 1.2rem at 700 is large text, which is what carries ink on the
		   accent past AA. */
		font-size: 1.2rem;
		font-weight: 700;
		text-decoration: none;
		transition:
			background-color 140ms ease,
			color 140ms ease,
			transform 140ms ease,
			box-shadow 140ms ease;
	}

	.cta a:hover {
		background: var(--ink);
		color: var(--paper);
		box-shadow: 0 12px 26px rgb(38 63 54 / 25%);
		transform: translateY(-1px);
	}

	@media (prefers-reduced-motion: reduce) {
		.cta a {
			transition: none;
		}

		.cta a:hover {
			transform: none;
		}
	}

	/* A phone-shaped slab of the darkest green, holding the app's own
	   ground. Nothing in it moves. */
	.device {
		justify-self: center;
		width: min(17rem, 62vw);
		padding: 0.7rem;
		border-radius: 2.75rem;
		background: var(--spruce);
		box-shadow:
			0 1.75rem 3.5rem -1rem rgb(38 63 54 / 35%),
			0 0.25rem 0.75rem rgb(38 63 54 / 12%);
	}

	.screen {
		display: grid;
		overflow: hidden;
		aspect-ratio: 41 / 84;
		padding: 1rem;
		border-radius: 2.1rem;
		background: var(--paper);
		box-shadow: inset 0 0 0 1px var(--faint-ink);
		/* The app's own proportions: the picture fills what is left above a
		   footer that is always there, whether or not the chevron is. */
		grid-template-rows: 1fr 20%;
		place-items: center;
	}

	.art {
		width: 100%;
		aspect-ratio: 1;
		object-fit: contain;
	}

	.chevron {
		width: 3rem;
		height: 1.5rem;
		fill: none;
		stroke: var(--quiet-ink);
		stroke-width: 4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* Four promises, four cards; two columns where there is room for two. */
	.pledges {
		display: grid;
		max-width: none;
		margin: 2.25rem 0 0;
		padding: 0;
		list-style: none;
		gap: 1.25rem;
	}

	@media (min-width: 760px) {
		.pledges {
			grid-template-columns: 1fr 1fr;
		}
	}

	.pledges li {
		position: relative;
		margin: 0;
		padding: 1.5rem;
		border-radius: 1.25rem;
		background: var(--card);
		box-shadow: var(--lift);
	}

	.chip {
		/* The accent at 14% over the white of the card, worked out once as a
		   flat colour so a shape can be cut out of it. */
		--chip-face: #fcefe9;

		display: grid;
		width: 3rem;
		height: 3rem;
		margin: 0 0 1.1rem;
		border-radius: 999px;
		background: var(--chip-face);
		place-items: center;
	}

	.pledges strong {
		display: block;
		font-size: 1.08rem;
		font-weight: 700;
	}

	/* Kept for whoever is listening, taken off the page for whoever is
	   looking. */
	.join {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.detail {
		display: block;
		margin-top: 0.3rem;
		color: var(--quiet-ink);
	}

	.flow {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		margin: 2rem 0 0;
		gap: 0.6rem;
	}

	.step {
		display: grid;
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 999px;
		background: var(--card);
		box-shadow: var(--lift);
		place-items: center;
	}

	.icon {
		width: 1.5rem;
		height: 1.5rem;
		fill: none;
		stroke: var(--spruce);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.icon .cut {
		stroke: var(--chip-face);
		stroke-width: 5;
	}

	.lead {
		width: 1.1rem;
		height: 1.1rem;
		fill: none;
		stroke: var(--quiet-ink);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
