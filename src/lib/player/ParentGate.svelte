<script lang="ts">
	import { GATE_HOLD_MS, createHold } from './gate';

	interface Props {
		/** Names the gate for assistive technology; it is never drawn. */
		label: string;
		onopen: () => void;
	}

	let { label, onopen }: Props = $props();

	// Drawn only while a hold is running, so the gate is inert-looking until
	// someone who already knows about it starts a hold.
	let holding = $state(false);

	const hold = createHold(() => {
		holding = false;
		onopen();
	});

	function begin(event: PointerEvent) {
		// Keeps the platform from turning a long press into a text selection
		// or a callout menu halfway through the hold.
		event.preventDefault();
		holding = true;
		hold.press();
	}

	function abandon() {
		hold.release();
		holding = false;
	}
</script>

<!--
	A tap does nothing at all: no handler, no hint, no flicker. The hold below
	is the only way through, and it keeps working while a clip is playing —
	the audio lock protects the child's stimulus, never the parent's way in.
-->
<button
	class="gate"
	type="button"
	data-gate
	aria-label={label}
	style="--gate-hold: {GATE_HOLD_MS}ms"
	onpointerdown={begin}
	onpointerup={abandon}
	onpointerleave={abandon}
	onpointercancel={abandon}
	oncontextmenu={(event) => event.preventDefault()}
>
	<svg class="mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
		<circle class="rim" cx="16" cy="16" r="13" />
		{#if holding}
			<circle class="progress" cx="16" cy="16" r="13" />
		{/if}
	</svg>
</button>

<style>
	.gate {
		position: absolute;
		top: 0;
		right: 0;
		display: grid;
		width: 3.25rem;
		height: 3.25rem;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		place-items: center;
		appearance: none;
	}

	.mark {
		width: 1.15rem;
		height: 1.15rem;
	}

	/* Faint on purpose: legible to a parent who looks for it, and nothing a
	   child's eye is drawn to. */
	.rim {
		fill: none;
		stroke: var(--faint-ink);
		stroke-width: 2.5;
	}

	/* The ring runs for exactly one hold and is removed with it, so it can
	   never linger as decoration. */
	.progress {
		fill: none;
		stroke: var(--quiet-ink);
		stroke-width: 2.5;
		stroke-linecap: round;
		/* The circumference of r=13, so a full sweep empties the dash. */
		stroke-dasharray: 81.68;
		stroke-dashoffset: 81.68;
		transform: rotate(-90deg);
		transform-origin: 50% 50%;
		animation: gate-hold var(--gate-hold) linear forwards;
	}

	@keyframes gate-hold {
		to {
			stroke-dashoffset: 0;
		}
	}
</style>
