<script lang="ts">
	import { page } from '$app/state';

	const lang = $derived(page.params.lang as 'pl' | 'en');

	const copy = {
		pl: {
			lede: 'Spokojna aplikacja do nauki mówienia dla najmłodszych.',
			open: 'Otwórz aplikację'
		},
		en: {
			lede: 'A calm speech-learning app for toddlers.',
			open: 'Open the app'
		}
	} as const;
</script>

<svelte:head>
	<title>Mowlak</title>
</svelte:head>

<main>
	<h1>Mowlak</h1>
	<p>{copy[lang].lede}</p>
	<a href="/app/{lang}">{copy[lang].open}</a>
</main>
