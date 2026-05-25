import { exportPayload, toHtmlDocument, toPlainText } from '@/lib/export';
import { describe, expect, test } from 'bun:test';

describe('toHtmlDocument', () => {
	test('wraps body with title and styles', () => {
		const html = toHtmlDocument('# Hi\n\nBody.', 'My Doc');
		expect(html).toContain('<title>My Doc</title>');
		expect(html).toContain('<h1>Hi</h1>');
		expect(html).toContain('<p>Body.</p>');
		expect(html).toContain('font-family');
	});

	test('escapes title HTML', () => {
		const html = toHtmlDocument('body', '<script>x</script>');
		expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
		expect(html).not.toContain('<script>x</script>');
	});
});

describe('toPlainText', () => {
	test('strips heading hashes', () => {
		expect(toPlainText('# Title\n\nBody')).toContain('Title');
		expect(toPlainText('# Title')).not.toContain('#');
	});

	test('keeps link label, drops URL', () => {
		expect(toPlainText('A [link](https://x.test) here')).toBe('A link here');
	});

	test('keeps image alt text only', () => {
		expect(toPlainText('![alt](img.png)')).toBe('alt');
	});

	test('keeps fenced code body', () => {
		const out = toPlainText('```ts\nconst x = 1;\n```');
		expect(out).toContain('const x = 1;');
		expect(out).not.toContain('```');
	});

	test('handles tables as tab-separated rows', () => {
		const md = '| A | B |\n|---|---|\n| 1 | 2 |\n';
		const out = toPlainText(md);
		expect(out).toContain('A\tB');
		expect(out).toContain('1\t2');
	});

	test('drops emphasis markers', () => {
		expect(toPlainText('**bold** and _em_ text')).toBe('bold and em text');
	});
});

describe('exportPayload', () => {
	test('returns markdown verbatim', () => {
		const out = exportPayload('# Hi', 'Title', 'md');
		expect(out.content).toBe('# Hi');
		expect(out.ext).toBe('md');
	});

	test('returns html for html format', () => {
		const out = exportPayload('# Hi', 'T', 'html');
		expect(typeof out.content).toBe('string');
		expect(out.mime).toBe('text/html');
		expect(out.ext).toBe('html');
	});

	test('returns plain text for txt format', () => {
		const out = exportPayload('# Hi\n\n[ok](https://x)', 'T', 'txt');
		expect(out.content).toContain('Hi');
		expect(out.content).toContain('ok');
		expect(out.content).not.toContain('https://x');
		expect(out.ext).toBe('txt');
	});
});
