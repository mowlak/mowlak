<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<!-- One mark for every page, so no request for an icon comes back empty. -->
	<link rel="icon" href="/icon.svg" type="image/svg+xml" />
</svelte:head>

{@render children()}
