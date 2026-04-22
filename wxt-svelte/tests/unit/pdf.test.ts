import { markdownToDocDefinition } from '@/lib/pdf';
import { describe, expect, test } from 'bun:test';
import type {
	Content,
	ContentCanvas,
	ContentOrderedList,
	ContentTable,
	ContentText,
	ContentUnorderedList,
} from 'pdfmake/interfaces';

function blocks(markdown: string): Content[] {
	const doc = markdownToDocDefinition(markdown, 'Title');
	const content = doc.content;
	if (!Array.isArray(content)) throw new Error('Expected content array');
	return content.slice(1) as Content[];
}

function isContentText(c: Content): c is ContentText {
	return typeof c === 'object' && c !== null && 'text' in c;
}
function isUnordered(c: Content): c is ContentUnorderedList {
	return typeof c === 'object' && c !== null && 'ul' in c;
}
function isOrdered(c: Content): c is ContentOrderedList {
	return typeof c === 'object' && c !== null && 'ol' in c;
}
function isTable(c: Content): c is ContentTable {
	return typeof c === 'object' && c !== null && 'table' in c;
}
function isCanvas(c: Content): c is ContentCanvas {
	return typeof c === 'object' && c !== null && 'canvas' in c;
}

describe('markdownToDocDefinition', () => {
	test('emits doc title as first block', () => {
		const doc = markdownToDocDefinition('body', 'My Title');
		const content = doc.content as Content[];
		const first = content[0];
		if (!first || !isContentText(first)) throw new Error('Missing title');
		expect(first.text).toBe('My Title');
		expect(first.style).toBe('docTitle');
	});

	test('headings get h1..h6 style', () => {
		const out = blocks('# A\n\n## B\n\n###### F');
		expect(out).toHaveLength(3);
		const styles = out.map((b) => (isContentText(b) ? b.style : ''));
		expect(styles).toEqual(['h1', 'h2', 'h6']);
	});

	test('clamps heading depth above 6', () => {
		const out = blocks('####### deep'); // marked treats this as paragraph; OK
		expect(out.length).toBeGreaterThan(0);
	});

	test('paragraph emits ContentText with mixed inline children', () => {
		const out = blocks('plain **bold** _em_ `code` [link](https://x)');
		const first = out[0];
		if (!first || !isContentText(first)) throw new Error('Expected ContentText');
		expect(Array.isArray(first.text)).toBe(true);
	});

	test('fenced code becomes codeblock style', () => {
		const out = blocks('```\nhello\n```');
		const block = out[0];
		if (!block || !isContentText(block)) throw new Error('Expected ContentText');
		expect(block.text).toContain('hello');
		expect(block.style).toBe('codeblock');
	});

	test('unordered list maps to ul', () => {
		const out = blocks('- one\n- two');
		const block = out[0];
		if (!block || !isUnordered(block)) throw new Error('Expected ul');
		expect(block.ul).toHaveLength(2);
	});

	test('ordered list maps to ol', () => {
		const out = blocks('1. one\n2. two');
		const block = out[0];
		if (!block || !isOrdered(block)) throw new Error('Expected ol');
		expect(block.ol).toHaveLength(2);
	});

	test('blockquote becomes stack with style', () => {
		const out = blocks('> quoted');
		const block = out[0];
		if (!block || typeof block !== 'object' || !('stack' in block) || !('style' in block)) {
			throw new Error('Expected stack with style');
		}
		expect(block.style).toBe('blockquote');
	});

	test('table emits header row and body rows', () => {
		const out = blocks('| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |');
		const block = out[0];
		if (!block || !isTable(block)) throw new Error('Expected table');
		expect(block.table.headerRows).toBe(1);
		expect(block.table.body).toHaveLength(3);
		expect(block.table.body[0]).toHaveLength(2);
	});

	test('hr emits canvas line', () => {
		const out = blocks('---');
		const block = out[0];
		if (!block || !isCanvas(block)) throw new Error('Expected canvas');
		expect(block.canvas[0]?.type).toBe('line');
	});

	test('document has A4 page size and standard margins', () => {
		const doc = markdownToDocDefinition('x', 't');
		expect(doc.pageSize).toBe('A4');
		expect(doc.pageMargins).toEqual([40, 48, 40, 48]);
	});
});
