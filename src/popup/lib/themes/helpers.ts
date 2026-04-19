import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import type { ThemeColors } from './types.ts';

type TagStyle = Parameters<typeof HighlightStyle.define>[0][number];

/** Build a CM6 theme `Extension[]` from a color token dictionary. */
export function buildTheme(colors: ThemeColors, isDark: boolean): Extension[] {
	const gutterBorder = colors.gutterBorder;
	const matchingBracket = colors.matchingBracket;
	const matchingBracketOutline = colors.matchingBracketOutline ?? colors.matchingBracket;
	const lineHighlight = colors.lineHighlight ?? 'transparent';

	const editorSpec: Parameters<typeof EditorView.theme>[0] = {
		'&': {
			color: colors.foreground,
			backgroundColor: colors.background,
		},
		'.cm-content': {
			caretColor: colors.caret,
		},
		'.cm-cursor, .cm-dropCursor': {
			borderLeftColor: colors.caret,
		},
		'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
			backgroundColor: colors.selection,
		},
		'.cm-selectionBackground, .cm-content ::selection': {
			backgroundColor: colors.selection,
		},
		'.cm-activeLine': {
			backgroundColor: lineHighlight,
		},
		'.cm-activeLineGutter': {
			backgroundColor: lineHighlight,
		},
		'.cm-gutters': {
			backgroundColor: colors.gutterBackground ?? colors.background,
			color: colors.gutterForeground ?? colors.foreground,
			...(gutterBorder ? { borderRight: `1px solid ${gutterBorder}` } : { border: 'none' }),
		},
		...(matchingBracket
			? {
				'.cm-matchingBracket, .cm-nonmatchingBracket': {
					backgroundColor: matchingBracket,
					outline: `1px solid ${matchingBracketOutline}`,
				},
			}
			: {}),
		...(colors.selectionMatch
			? {
				'.cm-selectionMatch': { backgroundColor: colors.selectionMatch },
			}
			: {}),
	};

	const editorTheme = EditorView.theme(editorSpec, { dark: isDark });
	const highlight = HighlightStyle.define(buildHighlightSpecs(colors));
	return [editorTheme, syntaxHighlighting(highlight)];
}

function buildHighlightSpecs(colors: ThemeColors): TagStyle[] {
	const specs: TagStyle[] = [];
	const add = (tag: TagStyle['tag'], color: string | undefined, extra?: Omit<TagStyle, 'tag'>) => {
		if (!color) return;
		specs.push({ tag, color, ...extra });
	};

	// Markdown headings (specific levels first so they win over `heading`)
	add(t.heading1, colors.heading1, { fontWeight: 'bold' });
	add(t.heading2, colors.heading2, { fontWeight: 'bold' });
	add(t.heading3, colors.heading3, { fontWeight: 'bold' });
	add(t.heading4, colors.heading4, { fontWeight: 'bold' });
	add(t.heading5, colors.heading5, { fontWeight: 'bold' });
	add(t.heading6, colors.heading6, { fontWeight: 'bold' });
	add(t.heading, colors.heading, { fontWeight: 'bold' });

	// Markdown inline
	add(t.emphasis, colors.emphasis, { fontStyle: 'italic' });
	add(t.strong, colors.strong, { fontWeight: 'bold' });
	add(t.link, colors.link, { textDecoration: 'underline' });
	add(t.url, colors.url);
	add(t.monospace, colors.monospace, { fontFamily: 'monospace' });
	add(t.quote, colors.quote, { fontStyle: 'italic' });

	// Markdown structural
	add(t.meta, colors.meta);
	add(t.processingInstruction, colors.meta);
	add(t.contentSeparator, colors.contentSeparator);
	add(t.escape, colors.escape);
	add(t.list, colors.list);

	// Programming-language tags (fall back for code blocks inside markdown)
	add(t.comment, colors.comment, { fontStyle: 'italic' });
	add(t.keyword, colors.keyword);
	add(t.atom, colors.atom);
	add(t.string, colors.string);
	add(t.number, colors.number);
	add(t.variableName, colors.variable);
	add(t.definition(t.variableName), colors.definition);
	add(t.typeName, colors.typeName);
	add(t.className, colors.className);
	add(t.function(t.variableName), colors.function);
	add(t.propertyName, colors.propertyName);
	add(t.operator, colors.operator);
	add(t.punctuation, colors.punctuation);
	add(t.bracket, colors.bracket);
	add(t.attributeName, colors.attribute);
	add(t.tagName, colors.tag);
	add(t.invalid, colors.invalid);

	return specs;
}
