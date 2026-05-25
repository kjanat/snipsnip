import { buildTheme } from './helpers.ts';

/** Minimal built-in light theme used when no user theme is selected. */
const defaultTheme = buildTheme({
	background: '#ffffff',
	foreground: '#24292e',
	caret: '#24292e',
	selection: '#b4d5fe',
	lineHighlight: '#f6f8fa',
	gutterBackground: '#ffffff',
	gutterForeground: '#6e7781',
	gutterBorder: '#eaecef',
	matchingBracket: 'rgba(0, 123, 255, 0.2)',
	heading: '#24292e',
	emphasis: '#24292e',
	strong: '#24292e',
	link: '#0366d6',
	url: '#0366d6',
	monospace: '#6a737d',
	quote: '#6a737d',
	meta: '#6a737d',
	contentSeparator: '#eaecef',
	comment: '#6a737d',
	keyword: '#d73a49',
	string: '#032f62',
	number: '#005cc5',
	variable: '#24292e',
	typeName: '#6f42c1',
	function: '#6f42c1',
	tag: '#22863a',
	attribute: '#6f42c1',
}, false);

export default defaultTheme;
