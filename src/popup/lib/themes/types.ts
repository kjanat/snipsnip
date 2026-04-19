import type { Extension } from '@codemirror/state';

export interface ThemeColors {
	// Chrome
	background: string;
	foreground: string;
	caret: string;
	selection: string;
	selectionMatch?: string;
	lineHighlight?: string;
	gutterBackground?: string;
	gutterForeground?: string;
	gutterBorder?: string;
	matchingBracket?: string;
	matchingBracketOutline?: string;

	// Common syntax
	comment?: string;
	keyword?: string;
	atom?: string;
	string?: string;
	number?: string;
	variable?: string;
	definition?: string;
	typeName?: string;
	className?: string;
	function?: string;
	propertyName?: string;
	operator?: string;
	punctuation?: string;
	bracket?: string;
	attribute?: string;
	tag?: string;
	invalid?: string;

	// Markdown-specific
	heading?: string;
	heading1?: string;
	heading2?: string;
	heading3?: string;
	heading4?: string;
	heading5?: string;
	heading6?: string;
	emphasis?: string;
	strong?: string;
	link?: string;
	url?: string;
	monospace?: string;
	quote?: string;
	meta?: string;
	contentSeparator?: string;
	escape?: string;
	list?: string;
}

export interface EditorTheme {
	readonly name: string;
	readonly isDark: boolean;
	load(): Promise<Extension[]>;
}
