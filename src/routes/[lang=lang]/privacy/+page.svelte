<script lang="ts">
	import { page } from '$app/state';
	import { langFromParam, t } from '$lib/i18n';

	const lang = $derived(langFromParam(page.params.lang));
	const privacy = $derived(t(lang).privacy);
</script>

<svelte:head>
	<title>{privacy.title}</title>
	<meta name="description" content={privacy.description} />
</svelte:head>

<!--
	The page exists because a store listing and a parent both ask for one,
	not because there is anything to disclose. Everything it says has to
	stay true of the code beside it: no accounts, no analytics, no requests
	that leave the origin. tests/same-origin.spec.ts holds that end of it.
	The route keeps an English identifier like every other path in the
	project; only what it says is translated.
-->
<h1>{privacy.heading}</h1>
<p class="lede">{privacy.lede}</p>

<!-- The four things the app does not do, lifted onto one card: the whole
     policy is a single short list and reads as one object. -->
<ul class="points">
	{#each privacy.points as point (point)}
		<li>{point}</li>
	{/each}
</ul>

<p>{privacy.outro}</p>
<p class="stamp">{privacy.stamp}</p>

<style>
	/* The landing hangs its tagline right under the name; here the sentence
	   below the heading is the policy itself and stands apart from it. */
	.lede {
		margin-top: 1.25rem;
	}

	.points {
		margin: 2rem 0;
		padding: 1.75rem 1.75rem 1.75rem 3rem;
		border-radius: 1.25rem;
		background: var(--card);
		box-shadow: var(--lift);
	}

	.points li {
		margin: 0 0 0.75rem;
	}

	.points li:last-child {
		margin-bottom: 0;
	}

	/* The one warm mark on a page whose whole subject is absence. */
	.points li::marker {
		color: var(--accent);
	}

	.stamp {
		margin-top: 2.5rem;
		color: var(--quiet-ink);
		font-size: 0.95rem;
	}
</style>
