<script lang="ts">
	import { page } from '$app/state';

	const lang = $derived(page.params.lang as 'pl' | 'en');
</script>

<svelte:head>
	<title>Mowlak</title>
</svelte:head>

<main>
	<h1>Mowlak</h1>
	<p>{lang === 'pl' ? 'Wkrótce.' : 'Coming soon.'}</p>
</main>
