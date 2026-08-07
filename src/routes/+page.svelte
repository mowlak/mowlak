<script lang="ts">
	// The root chooses the reader's language before first paint and sends
	// them to it; the links below are the no-JS fallback and the crawl
	// entry for the prerenderer. Their names come from the same table every
	// other surface reads, so a new language appears here by itself.
	import { langNames, langs } from '$lib/i18n';
</script>

<svelte:head>
	<title>Mowlak</title>
	<script>
		{
			const pick = (navigator.language || 'pl').toLowerCase().startsWith('pl') ? 'pl' : 'en';
			location.replace('/' + pick + location.search + location.hash);
		}
	</script>
</svelte:head>

<nav>
	{#each langs as lang (lang)}
		<a href="/{lang}" hreflang={lang}>{langNames[lang]}</a>
	{/each}
</nav>
