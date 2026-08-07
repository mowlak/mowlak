<script lang="ts">
	// The root chooses the reader's language before first paint and sends
	// them to it; the links below are the no-JS fallback and the crawl
	// entry for the prerenderer.
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
	<a href="/pl">polski</a>
	<a href="/en">English</a>
</nav>
