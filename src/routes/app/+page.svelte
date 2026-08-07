<script lang="ts">
	// Where an installed app is launched: the manifest's start_url carries no
	// language, so this picks one before first paint and goes there. The
	// links below are the no-JS fallback and the crawl entry for the
	// prerenderer, and they are the only thing a reader ever sees here.
</script>

<svelte:head>
	<title>Mowlak</title>
	<script>
		{
			const pick = (navigator.language || 'pl').toLowerCase().startsWith('pl') ? 'pl' : 'en';
			location.replace('/app/' + pick + location.search + location.hash);
		}
	</script>
</svelte:head>

<nav>
	<a href="/app/pl">polski</a>
	<a href="/app/en">English</a>
</nav>
