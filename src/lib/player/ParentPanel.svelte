<script lang="ts">
	import { onMount } from 'svelte';
	import type { LevelKind } from '../content';
	import type { Lang, Strings } from '../i18n';

	interface Props {
		strings: Strings;
		lang: Lang;
		level: LevelKind;
		onlevel: (level: LevelKind) => void;
		onclose: () => void;
	}

	let { strings, lang, level, onlevel, onclose }: Props = $props();

	let panel: HTMLDivElement;

	// The panel belongs to the parent, so it takes the focus rather than
	// leaving it on the gate that is now behind it.
	onMount(() => panel.focus());
</script>

<!--
	The card underneath keeps its state: the panel is a layer over the same
	screen, not another place, and closing it returns to the card mid-session
	rather than to the start of the pack.
-->
<div class="scrim">
	<div
		class="panel"
		bind:this={panel}
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		aria-label={strings.app.panel.title}
	>
		<h2>{strings.app.panel.title}</h2>

		<fieldset>
			<legend>{strings.app.panel.levelLegend}</legend>

			<label>
				<input
					type="radio"
					name="level"
					value="onomatopoeia"
					checked={level === 'onomatopoeia'}
					onchange={() => onlevel('onomatopoeia')}
				/>
				<span>{strings.app.panel.levelOnomatopoeia}</span>
			</label>

			<label>
				<input
					type="radio"
					name="level"
					value="word"
					checked={level === 'word'}
					onchange={() => onlevel('word')}
				/>
				<span>{strings.app.panel.levelWord}</span>
			</label>
		</fieldset>

		<div class="actions">
			<a href="/{lang}">{strings.app.panel.leave}</a>
			<button type="button" onclick={onclose}>{strings.app.panel.close}</button>
		</div>
	</div>
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		display: grid;
		padding: 1.5rem;
		background: rgb(35 31 24 / 45%);
		place-items: center;
	}

	.panel {
		display: grid;
		width: min(22rem, 100%);
		padding: 1.5rem;
		border-radius: 1rem;
		background: #fffaf2;
		color: var(--ink);
		font-family: system-ui, sans-serif;
		gap: 1.25rem;
	}

	h2 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 600;
	}

	fieldset {
		display: grid;
		margin: 0;
		padding: 0;
		border: 0;
		gap: 0.6rem;
	}

	legend {
		padding: 0 0 0.6rem;
		color: var(--quiet-ink);
		font-size: 0.85rem;
		text-transform: lowercase;
	}

	label {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		cursor: pointer;
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.25rem;
		gap: 1rem;
	}

	a {
		color: var(--ink);
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
