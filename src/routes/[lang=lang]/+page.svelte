<script lang="ts">
	import { page } from '$app/state';
	import { langFromParam, t, type Section } from '$lib/i18n';

	const lang = $derived(langFromParam(page.params.lang));
	const landing = $derived(t(lang).landing);
</script>

{#snippet section(item: Section)}
	<section>
		<h2>{item.heading}</h2>
		<p>{item.body}</p>
	</section>
{/snippet}

<svelte:head>
	<title>{landing.title}</title>
	<meta name="description" content={landing.description} />
</svelte:head>

<h1>Mowlak</h1>
<p class="tagline">{landing.tagline}</p>

<p class="lede">{landing.lede}</p>

{#if landing.note}
	<p class="note">{landing.note}</p>
{/if}

<p class="cta"><a href="/app/{lang}">{landing.open}</a></p>

<section>
	<h2>{landing.calm.heading}</h2>
	<p>{landing.calm.intro}</p>

	<ul class="pledges">
		{#each landing.calm.pledges as pledge (pledge.claim)}
			<li><strong>{pledge.claim}</strong> — {pledge.detail}</li>
		{/each}
	</ul>
</section>

{@render section(landing.how)}

{#if landing.name}
	{@render section(landing.name)}
{/if}

{@render section(landing.parents)}
{@render section(landing.free)}

<style>
	.tagline {
		margin: 0.5rem 0 1.75rem;
		color: var(--quiet-ink);
		font-size: 1.1rem;
	}

	.note {
		color: var(--quiet-ink);
	}

	/*
		The one thing to do on this page, and the only place where the design
		raises its voice. Nothing here moves: the border simply fills in when
		a pointer or the keyboard reaches it.
	*/
	.cta {
		margin: 2rem 0 0;
	}

	.cta a {
		display: inline-block;
		padding: 0.75rem 1.6rem;
		border: 1px solid transparent;
		border-radius: 999px;
		background: var(--accent);
		font-size: 1.1rem;
		font-weight: 600;
		text-decoration: none;
	}

	.cta a:hover {
		background: var(--ink);
		color: var(--paper);
	}

	.pledges strong {
		font-weight: 600;
	}
</style>
