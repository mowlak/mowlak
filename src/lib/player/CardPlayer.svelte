<script lang="ts">
	import { fade } from 'svelte/transition';
	import { CONTENT_ROOT, type LevelKind, type Pack } from '../content';
	import type { Lang, Strings } from '../i18n';
	import ParentGate from './ParentGate.svelte';
	import ParentPanel from './ParentPanel.svelte';
	import { FIRST_CARD, advance, complete, fail, play, type Player } from './machine';
	import { readSettings, writeSettings, type Settings } from './settings';

	interface Props {
		pack: Pack;
		lang: Lang;
		strings: Strings;
	}

	let { pack, lang, strings }: Props = $props();

	/** One card dissolving into the next, slowly enough to be followed. */
	const CARD_FADE_MS = 200;

	let player = $state<Player>(FIRST_CARD);
	// Read once at setup rather than in an effect: this component is only
	// ever created in the browser, after its pack has arrived.
	let settings = $state<Settings>(readSettings());
	let panelOpen = $state(false);

	/**
	 * One element for the whole session, never replaced. On iOS the
	 * permission to make sound is granted to the element the first gesture
	 * touched, and a fresh element would have to earn it again in silence.
	 */
	let audio: HTMLAudioElement;

	const card = $derived(pack.cards[player.index]);
	const locked = $derived(player.state === 'playing');
	const canAdvance = $derived(player.state === 'played');

	function speak() {
		// The audio lock. Every touch the child makes during playback stops
		// here: no restart, no queue, no pause, and no visible answer either.
		if (locked) return;

		const level = card.levels.find((one) => one.kind === settings.level) ?? card.levels[0];
		player = play(player);
		audio.src = `${CONTENT_ROOT}/${level.audio}`;
		audio.play().catch(refused);
	}

	function finish() {
		player = complete(player);
	}

	/**
	 * A clip that will not play must not brick the card it belongs to: the
	 * lock opens and the card goes back to where it stood.
	 */
	function giveUp() {
		// An abort is not a failure. Pointing the shared element at the next
		// card cancels whatever the last one was still doing, and the browser
		// reports that cancellation through the same event a broken file
		// uses — but only one of the two is a clip that cannot be played, and
		// mistaking the first for the second silences the card now playing.
		if (audio.error?.code === MediaError.MEDIA_ERR_ABORTED) return;

		player = fail(player);
	}

	/** The same distinction, as the play() promise draws it. */
	function refused(reason: unknown) {
		if (reason instanceof DOMException && reason.name === 'AbortError') return;

		giveUp();
	}

	function next() {
		if (!canAdvance) return;

		player = advance(player, pack.cards.length);
	}

	function chooseLevel(level: LevelKind) {
		settings = { level };
		writeSettings(settings);
	}

	/**
	 * Swallows the callout menu a long press raises on a picture. Attached
	 * rather than written as a handler because the surface is a plain box
	 * with no role of its own: nothing here is interactive except the
	 * controls inside it.
	 */
	function withoutCallout(node: HTMLElement) {
		const swallow = (event: Event) => event.preventDefault();
		node.addEventListener('contextmenu', swallow);

		return () => node.removeEventListener('contextmenu', swallow);
	}
</script>

<div class="player" data-state={player.state} data-card={card.id} {@attach withoutCallout}>
	<!--
		Every control the child can reach carries data-child-action, and
		nothing else on this screen does. The count of those that are visible
		and enabled is the one-action-per-screen rule, stated where a test can
		read it: one in idle, one during playback, two once a card has been
		heard through. The gate is not among them — its tap does nothing.
	-->
	<button
		class="picture"
		type="button"
		data-child-action="picture"
		aria-label={strings.app.player.picture}
		onclick={speak}
	>
		<span class="stage">
			{#key card.id}
				<img
					class="art"
					src="{CONTENT_ROOT}/{card.image}"
					alt=""
					draggable="false"
					in:fade={{ duration: CARD_FADE_MS }}
					out:fade={{ duration: CARD_FADE_MS }}
				/>
			{/key}
		</span>
	</button>

	<!-- Held open whether or not the chevron is there, so its arrival moves
	     nothing else on the screen. -->
	<div class="footer">
		{#if player.revealed}
			<button
				class="advance"
				type="button"
				data-child-action="advance"
				aria-label={strings.app.player.advance}
				disabled={!canAdvance}
				onclick={next}
			>
				<svg class="chevron" viewBox="0 0 64 32" aria-hidden="true" focusable="false">
					<path d="M10 9 L32 25 L54 9" />
				</svg>
			</button>
		{/if}
	</div>

	<ParentGate label={strings.app.player.gate} onopen={() => (panelOpen = true)} />
</div>

{#if panelOpen}
	<ParentPanel
		{strings}
		{lang}
		level={settings.level}
		onlevel={chooseLevel}
		onclose={() => (panelOpen = false)}
	/>
{/if}

<audio bind:this={audio} data-player-audio preload="auto" onended={finish} onerror={giveUp}></audio>

<style>
	:global(:root) {
		/* One warm ground for the whole app. Nothing here blinks. */
		--paper: #f6efe3;
		--ink: #59503f;
		--quiet-ink: rgb(89 80 63 / 42%);
		--faint-ink: rgb(89 80 63 / 18%);
	}

	/* The app is one screen and stays one screen: there is nothing below the
	   fold, so there is nothing to discover by scrolling. */
	:global(html),
	:global(body) {
		height: 100%;
		margin: 0;
		overflow: hidden;
		background: var(--paper);
		overscroll-behavior: none;
	}

	.player {
		position: fixed;
		inset: 0;
		display: grid;
		height: 100dvh;
		overflow: hidden;
		background: var(--paper);
		overscroll-behavior: none;
		grid-template-rows: 1fr auto;
		touch-action: manipulation;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
		/* A tap flash is a visual reaction, and the screen must have none. */
		-webkit-tap-highlight-color: transparent;
	}

	.picture {
		display: grid;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		place-items: center;
		appearance: none;
	}

	.stage {
		position: relative;
		display: block;
		width: min(74vw, 62dvh);
		aspect-ratio: 1 / 1;
	}

	/* Stacked rather than sequential, so one card fades into the next in
	   place instead of the screen emptying between them. */
	.art {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.footer {
		display: grid;
		height: 20dvh;
		place-items: center;
	}

	.advance {
		display: grid;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		place-items: center;
		appearance: none;
		animation: reveal 350ms ease-out both;
	}

	/* Locked while the card replays, and deliberately identical to its
	   unlocked self: the voice is the only thing happening. */
	.advance:disabled {
		cursor: default;
	}

	.chevron {
		width: 4.5rem;
		height: 2.25rem;
		fill: none;
		stroke: var(--quiet-ink);
		stroke-width: 4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	@keyframes reveal {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}
</style>
