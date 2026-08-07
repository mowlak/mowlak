<script lang="ts">
	import { page } from '$app/state';
	import { langFromParam, t } from '$lib/i18n';

	const strings = $derived(t(langFromParam(page.params.lang)));
</script>

<svelte:head>
	<title>Mowlak</title>
</svelte:head>

<main>
	<h1>Mowlak</h1>
	<p>{strings.app.comingSoon}</p>
</main>
