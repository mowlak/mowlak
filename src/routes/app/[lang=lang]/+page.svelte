<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { loadPack, type Pack } from '$lib/content';
	import { langFromParam, t } from '$lib/i18n';
	import CardPlayer from '$lib/player/CardPlayer.svelte';

	/**
	 * The cards are Polish whatever the interface language is: the
	 * onomatopoeia they teach belong to Polish speech-therapy practice and do
	 * not translate.
	 */
	const PACK_LANGUAGE = 'pl';
	const PACK_CATEGORY = 'animals';

	const lang = $derived(langFromParam(page.params.lang));
	const strings = $derived(t(lang));

	let pack = $state<Pack | null>(null);
	let unreachable = $state(false);

	// Fetched from the component rather than from a load function, so this
	// page stays prerenderable: the shell is a static file and the pack
	// arrives after it, from the same origin.
	async function fetchPack() {
		unreachable = false;
		try {
			pack = await loadPack(fetch, PACK_LANGUAGE, PACK_CATEGORY);
		} catch {
			unreachable = true;
		}
	}

	onMount(() => {
		void fetchPack();
	});
</script>

<svelte:head>
	<title>Mowlak</title>
</svelte:head>

{#if pack}
	<CardPlayer {pack} {lang} {strings} />
{:else if unreachable}
	<!--
		A parent-facing dead end with exactly one way out. Before the cards
		arrive the screen is simply the empty warm ground: a child waiting
		with a parent should find nothing to tap at, not a spinner to watch.
	-->
	<main class="trouble">
		<p>{strings.app.trouble}</p>
		<button type="button" onclick={() => void fetchPack()}>{strings.app.retry}</button>
	</main>
{/if}

<style>
	.trouble {
		display: grid;
		height: 100dvh;
		padding: 1.5rem;
		color: var(--ink);
		font-family: system-ui, sans-serif;
		text-align: center;
		gap: 1rem;
		place-content: center;
		place-items: center;
	}

	button {
		padding: 0.5rem 1.1rem;
		border: 1px solid var(--faint-ink);
		border-radius: 999px;
		background: none;
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}
</style>
