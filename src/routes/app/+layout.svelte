<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';

	let { children } = $props();

	onMount(() => {
		// Nothing to install from a dev server, whose files are not the ones
		// the app would be shipping anyway.
		if (dev || !('serviceWorker' in navigator)) return;

		// Registered here rather than by the framework, which knows no scope,
		// and here rather than in the root layout, which the landing pages
		// share: a reader who only ever sees the landing installs nothing, and
		// editing those pages cannot disturb the copy of the app a child
		// already has offline. The scope matches the manifest's exactly.
		void navigator.serviceWorker.register('/service-worker.js', { scope: '/app/' });
	});
</script>

<svelte:head>
	<!-- The manifest describes the app and only the app; the site around it
	     is a web page and is not installable. -->
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta name="theme-color" content="#f6efe3" />
	<!-- iOS reads none of the manifest, so the same few facts are repeated
	     for it: standalone, and named. -->
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Mowlak" />
</svelte:head>

{@render children()}
