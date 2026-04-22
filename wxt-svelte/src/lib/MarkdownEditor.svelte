<script lang="ts">
	import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
	import { markdown } from '@codemirror/lang-markdown';
	import {
		bracketMatching,
		defaultHighlightStyle,
		syntaxHighlighting,
	} from '@codemirror/language';
	import { EditorState } from '@codemirror/state';
	import { EditorView, keymap, lineNumbers } from '@codemirror/view';
	import { onDestroy } from 'svelte';

	interface Props {
		value: string;
		onChange?: (value: string) => void;
		readonly?: boolean;
	}

	let { value = $bindable(''), onChange, readonly = false }: Props = $props();

	let host: HTMLDivElement | undefined = $state();
	let view: EditorView | undefined = $state();

	function makeState(initial: string): EditorState {
		return EditorState.create({
			doc: initial,
			extensions: [
				lineNumbers(),
				history(),
				bracketMatching(),
				syntaxHighlighting(defaultHighlightStyle),
				markdown(),
				keymap.of([...defaultKeymap, ...historyKeymap]),
				EditorView.lineWrapping,
				EditorState.readOnly.of(readonly),
				EditorView.updateListener.of((update) => {
					if (!update.docChanged) return;
					const next = update.state.doc.toString();
					value = next;
					onChange?.(next);
				}),
			],
		});
	}

	$effect(() => {
		if (!host) return;
		view = new EditorView({ state: makeState(value), parent: host });
		return () => {
			view?.destroy();
			view = undefined;
		};
	});

	$effect(() => {
		if (!view) return;
		if (view.state.doc.toString() === value) return;
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: value },
		});
	});

	onDestroy(() => {
		view?.destroy();
	});
</script>

<div bind:this={host} class="cm-host"></div>

<style>
	.cm-host {
		display: flex;
		min-height: 240px;
		border: 1px solid var(--border);
		border-radius: 6px;
		overflow: hidden;
		background: var(--surface);
	}
	.cm-host :global(.cm-editor) {
		flex: 1;
		font-family:
			"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 12px;
	}
	.cm-host :global(.cm-scroller) {
		font-family: inherit;
	}
	.cm-host :global(.cm-content) {
		min-height: 240px;
	}
</style>
