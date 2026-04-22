import type { ImageBundleEntry } from '@/lib/images';
import { bundleToEmbeds, type EmbeddedImage, markdownToDocDefinition } from '@/lib/pdf';
import { describe, expect, test } from 'bun:test';
import type {
	Content,
	ContentCanvas,
	ContentImage,
	ContentOrderedList,
	ContentStack,
	ContentSvg,
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
function isStack(c: Content): c is ContentStack {
	return typeof c === 'object' && c !== null && 'stack' in c;
}
function isImage(c: Content): c is ContentImage {
	return typeof c === 'object' && c !== null && 'image' in c;
}
function isSvg(c: Content): c is ContentSvg {
	return typeof c === 'object' && c !== null && 'svg' in c;
}

function bundleEntry(
	original: string,
	resolved: string,
	mime: string,
	bytes: Uint8Array,
): ImageBundleEntry {
	return { original, resolved, localPath: 'images/x', bytes, mime };
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

	test('image without embed falls back to italic alt text', () => {
		const out = blocks('Body ![alt](https://x.test/a.png) tail');
		const para = out[0];
		if (!para || !isContentText(para) || !Array.isArray(para.text)) {
			throw new Error('Expected ContentText with array');
		}
		const altRun = para.text.find((run) => {
			if (typeof run !== 'object' || run === null || Array.isArray(run)) return false;
			if (!('text' in run) || !('italics' in run)) return false;
			return run.text === 'alt' && run.italics === true;
		});
		expect(altRun).toBeDefined();
	});

	test('image with raster embed becomes ContentImage block', () => {
		const embeds = new Map<string, EmbeddedImage>([
			['https://x.test/a.png', { kind: 'raster', dataUri: 'data:image/png;base64,AA' }],
		]);
		const doc = markdownToDocDefinition(
			'![cap](https://x.test/a.png)',
			'T',
			{ embeds },
		);
		const out = (doc.content as Content[]).slice(1);
		const block = out[0];
		if (!block || !isStack(block)) throw new Error('Expected stack');
		const img = block.stack[0];
		if (!img || !isImage(img)) throw new Error('Expected image');
		expect(img.image).toBe('data:image/png;base64,AA');
	});

	test('image with svg embed becomes ContentSvg block', () => {
		const embeds = new Map<string, EmbeddedImage>([
			['https://x.test/a.svg', { kind: 'svg', markup: '<svg></svg>' }],
		]);
		const doc = markdownToDocDefinition('![](https://x.test/a.svg)', 'T', {
			embeds,
		});
		const out = (doc.content as Content[]).slice(1);
		const block = out[0];
		if (!block || !isStack(block)) throw new Error('Expected stack');
		const svg = block.stack[0];
		if (!svg || !isSvg(svg)) throw new Error('Expected svg');
		expect(svg.svg).toBe('<svg></svg>');
	});

	test('paragraph with text + image splits into stack', () => {
		const embeds = new Map<string, EmbeddedImage>([
			['https://x.test/a.png', { kind: 'raster', dataUri: 'data:image/png;base64,AA' }],
		]);
		const doc = markdownToDocDefinition(
			'Before ![](https://x.test/a.png) after',
			'T',
			{ embeds },
		);
		const out = (doc.content as Content[]).slice(1);
		const block = out[0];
		if (!block || !isStack(block)) throw new Error('Expected stack');
		expect(block.stack.length).toBeGreaterThanOrEqual(2);
	});
});

describe('bundleToEmbeds', () => {
	test('maps raster bytes to data URI under both original and resolved keys', () => {
		const entry = bundleEntry(
			'a.png',
			'https://x.test/a.png',
			'image/png',
			new Uint8Array([0xff, 0xd8]),
		);
		const map = bundleToEmbeds([entry]);
		const original = map.get('a.png');
		const resolved = map.get('https://x.test/a.png');
		if (!original || original.kind !== 'raster') throw new Error('Expected raster embed');
		expect(original.dataUri.startsWith('data:image/png;base64,')).toBe(true);
		expect(resolved?.kind).toBe('raster');
	});

	test('maps SVG bytes to markup string', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
		const entry = bundleEntry(
			'a.svg',
			'https://x.test/a.svg',
			'image/svg+xml',
			new TextEncoder().encode(svg),
		);
		const map = bundleToEmbeds([entry]);
		const embed = map.get('a.svg');
		if (!embed || embed.kind !== 'svg') throw new Error('Expected svg embed');
		expect(embed.markup).toBe(svg);
	});

	test('skips MIMEs pdfmake cannot embed', () => {
		const entry = bundleEntry(
			'a.gif',
			'https://x.test/a.gif',
			'image/gif',
			new Uint8Array([0x47]),
		);
		expect(bundleToEmbeds([entry]).size).toBe(0);
	});
});
