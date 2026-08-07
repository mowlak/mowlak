<script lang="ts">
	import { page } from '$app/state';
	import { langFromParam, t } from '$lib/i18n';

	const lang = $derived(langFromParam(page.params.lang));
	const strings = $derived(t(lang));
</script>

<svelte:head>
	<title>Mowlak</title>
</svelte:head>

<main>
	<h1>Mowlak</h1>
	<p>{strings.landing.lede}</p>
	<a href="/app/{lang}">{strings.landing.open}</a>
</main>
