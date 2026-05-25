<script lang="ts">
	import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
	import { markdown } from '@codemirror/lang-markdown';
	import {
		bracketMatching,
		HighlightStyle,
		syntaxHighlighting,
	} from '@codemirror/language';
	import { Compartment, EditorState } from '@codemirror/state';
	import { EditorView, keymap, lineNumbers } from '@codemirror/view';
	import { tags } from '@lezer/highlight';
	import { onDestroy } from 'svelte';

	const editorTheme = EditorView.theme(
		{
			'&': { backgroundColor: 'var(--surface)', color: 'var(--fg)' },
			'.cm-content': { caretColor: 'var(--accent)' },
			'.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
			'&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
				backgroundColor: 'color-mix(in srgb, var(--accent) 25%, transparent)',
			},
			'.cm-gutters': {
				backgroundColor: 'var(--surface)',
				color: 'var(--muted)',
				borderRight: '1px solid var(--border)',
			},
			'.cm-activeLineGutter': { backgroundColor: 'var(--bg)' },
			'.cm-activeLine': {
				backgroundColor: 'color-mix(in srgb, var(--accent) 6%, transparent)',
			},
		},
	);

	const highlightStyle = HighlightStyle.define([
		{ tag: tags.heading, fontWeight: 'bold', color: 'var(--fg)' },
		{ tag: tags.emphasis, fontStyle: 'italic' },
		{ tag: tags.strong, fontWeight: 'bold' },
		{ tag: tags.link, color: 'var(--accent)', textDecoration: 'underline' },
		{ tag: tags.url, color: 'var(--accent)' },
		{ tag: tags.monospace, color: 'var(--success)' },
		{ tag: tags.meta, color: 'var(--muted)' },
		{ tag: tags.comment, color: 'var(--muted)' },
		{ tag: tags.processingInstruction, color: 'var(--muted)' },
	]);

	interface Props {
		value: string;
		onChange?: (value: string) => void;
		readonly?: boolean;
		wrap?: boolean;
	}

	let { value = $bindable(''), onChange, readonly = false, wrap = true }:
		Props = $props();

	let host: HTMLDivElement | undefined = $state();
	let view: EditorView | undefined = $state();
	const wrapCompartment = new Compartment();

	function wrapExtension(enabled: boolean) {
		return enabled ? EditorView.lineWrapping : [];
	}

	function makeState(initial: string): EditorState {
		return EditorState.create({
			doc: initial,
			extensions: [
				lineNumbers(),
				history(),
				bracketMatching(),
				editorTheme,
				syntaxHighlighting(highlightStyle),
				markdown(),
				keymap.of([...defaultKeymap, ...historyKeymap]),
				wrapCompartment.of(wrapExtension(wrap)),
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

	$effect(() => {
		if (!view) return;
		view.dispatch({
			effects: wrapCompartment.reconfigure(wrapExtension(wrap)),
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
		flex: 1;
		min-height: 0;
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
		overflow: auto;
	}
</style>
