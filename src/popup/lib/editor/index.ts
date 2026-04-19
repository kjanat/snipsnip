import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, keymap } from '@codemirror/view';

export interface EditorWrapper {
	readonly view: EditorView;
	getValue(): string;
	setValue(value: string): void;
	somethingSelected(): boolean;
	getSelection(): string;
	focus(): void;
	refresh(): void;
	on(event: 'change' | 'cursorActivity', callback: (wrapper: EditorWrapper) => void): void;
	reconfigureTheme(themeExtension: Extension): void;
	destroy(): void;
}

export interface CreateEditorOptions {
	parent: HTMLElement;
	initialValue: string;
	theme: Extension;
	syncTextarea?: HTMLTextAreaElement | null;
}

type EditorEventName = 'change' | 'cursorActivity';

export function createEditor(options: CreateEditorOptions): EditorWrapper {
	const themeCompartment = new Compartment();
	const listeners: Record<EditorEventName, Array<(wrapper: EditorWrapper) => void>> = {
		change: [],
		cursorActivity: [],
	};

	const updateListener = EditorView.updateListener.of((update) => {
		if (update.docChanged) {
			if (options.syncTextarea) {
				options.syncTextarea.value = update.state.doc.toString();
			}
			for (const cb of listeners.change) {
				cb(wrapper);
			}
		}
		if (update.selectionSet) {
			for (const cb of listeners.cursorActivity) {
				cb(wrapper);
			}
		}
	});

	const state = EditorState.create({
		doc: options.initialValue,
		extensions: [
			history(),
			drawSelection(),
			indentOnInput(),
			bracketMatching(),
			highlightActiveLine(),
			EditorView.lineWrapping,
			keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
			markdown(),
			themeCompartment.of(options.theme),
			updateListener,
		],
	});

	const view = new EditorView({ state, parent: options.parent });

	if (options.syncTextarea) {
		options.syncTextarea.value = options.initialValue;
	}

	const wrapper: EditorWrapper = {
		view,
		getValue: () => view.state.doc.toString(),
		setValue: (value) => {
			const current = view.state.doc.toString();
			if (current === value) return;
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
		},
		somethingSelected: () => view.state.selection.ranges.some((r) => !r.empty),
		getSelection: () => {
			const primary = view.state.selection.main;
			return primary.empty ? '' : view.state.sliceDoc(primary.from, primary.to);
		},
		focus: () => view.focus(),
		refresh: () => view.requestMeasure(),
		on: (event, callback) => {
			listeners[event].push(callback);
		},
		reconfigureTheme: (themeExtension) => {
			view.dispatch({ effects: themeCompartment.reconfigure(themeExtension) });
		},
		destroy: () => view.destroy(),
	};

	return wrapper;
}
